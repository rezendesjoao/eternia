/**
 * Using a skill (Rules II.c READING SKILL BLOCKS, III.b ROUND STRUCTURE).
 *
 * The system posts a skill's card from EterniaItem#ItemThrow, which is also where it applies the
 * skill's "when used" effects: that is the moment the skill is used. This wraps it:
 * - before: an Incapacitated or Dead user, the Timing against the combat phase (Major / Minor /
 *   Move / Instant only in the user's own Main Process, Setup in the Setup Process…), the action
 *   already spent in this Main Process (one Major, one Minor and one Move), the usage limit
 *   (1/Scene, (SR)/Scenario, 1/Round…) and the Fate cost (the user must have it). An issue asks to
 *   go on, or refuses it (see the settings). The action HUD reads the same checks (inspectUse).
 * - after: pay the Hate and Fate costs, count the use and the action, and note it all on the card,
 *   with an Undo button for mistakes.
 *
 * Constant skills are never "used". Hate is only paid in a started combat (it is reset at the start
 * and end of every combat); Fate is always paid. Monsters pay no costs (they have no Hate).
 *
 * Skills of an item (its trigger powers, see content.mjs, or any skill an item links to) are also checked
 * like the usage limit: the item must be equipped, the user's Character Rank below the item's lock
 * ("〔CR21〕This item's effect cannot be used"), its Hate high enough, and so on (flags of the skill).
 * Usable items with a Character Rank lock are checked the same way before they are used (checkUsable).
 */
import { L, SYSTEM_ID, setting } from "../settings.mjs";
import { parseSkillField } from "../helpers/skill-fields.mjs";
import { skillModifiers } from "../helpers/roll-bonuses.mjs";
import { actorName, combatantOf, combatOf, confirm, escape, toInt, wrap } from "../helpers/utils.mjs";
import { counter } from "./scenes.mjs";
import { ITEM_SKILL, linkedSkill } from "../content/content.mjs";
import { actionAllowance, conditionUseIssues } from "../conditions/actions.mjs";
import { afterAction } from "../conditions/turns.mjs";
import {
  commitMotorUse, motorActionOf, motorCostValues, motorUseIssues, planMotorUse, skillMotor, undoMotorUse
} from "../classes/motor.mjs";

/** The action a Timing spends in the Main Process. */
const ACTIONS = { Major: "major", Minor: "minor", Move: "move" };
/** Timings used during the user's own Main Process. */
const OWN_PROCESS = new Set(["Major", "Minor", "Move", "Main Process", "Instant"]);
/** Timings used outside combat. */
const OUT_OF_COMBAT = new Set(["Rest Time", "Pre-Play", "Interlude"]);
/** Usage limit types that are counted. */
const LIMIT_TYPES = ["Scene", "Scenario", "Round"];
/** Items whose skills only work while they are equipped. */
const EQUIPMENT = ["weapon", "armor", "shield", "accessory", "bag"];

/** Call during the `init` hook. */
export function registerUse() {
  wrap(CONFIG.Item.documentClass.prototype, "ItemThrow", async function (original, ...args) {
    if (!tracked(this)) return original.apply(this, args);
    const plan = await planUse(this);
    if (!plan) return null;
    const message = await original.apply(this, args);
    if (message) {
      await commitUse(this, plan, message)
        .catch(err => console.error(`${SYSTEM_ID} | Could not record the use of ${this.uuid}`, err));
    }
    return message;
  });
  Hooks.on("renderChatMessageHTML", renderUse);
}

const timingOf = item => parseSkillField("timing", item.system.timing).type;

/** Skills whose use is checked and recorded: owned skills that aren't Constant. */
function tracked(item) {
  return (item.type === "skill") && !!item.actor && (timingOf(item) !== "Constant");
}

/* -------------------------------------------- */
/*  Amounts, limits and costs                   */
/* -------------------------------------------- */

/**
 * The Skill Rank a skill's amounts use: its own, or the rank of the user's skill its `srOf` flag names
 * ("This effect can be used [your "Shikigami Master" SR] times per scene"), 0 without that skill.
 * @param {Item} item
 * @returns {number}
 */
function rankOf(item) {
  const of = item?.getFlag?.(SYSTEM_ID, "srOf");
  if (!of) return Math.max(1, toInt(item?.system?.skillRank?.value));
  const source = i => i._stats?.compendiumSource ?? i.flags?.core?.sourceId;
  const skill = item.actor?.items.find(i => (i.type === "skill") && ((of.uuid && (source(i) === of.uuid)) || (i.name === of.name)));
  return toInt(skill?.system?.skillRank?.value);
}

/**
 * An amount written in a skill block: "1", "(SR)", "SR+1", "(SRx3)", "2xSR", "[SR]", "CR"…
 * @param {string} text
 * @param {Item} item     The skill (its SR, its owner's CR)
 * @returns {number|null}
 */
export function amount(text, item) {
  const sr = rankOf(item);
  const actor = item?.actor;
  const cr = Math.max(1, toInt(actor?.system?.infos?.crank ?? actor?.system?.rank));
  let expr = String(text ?? "").toUpperCase();
  // A class Motor's points ("Hate 1+Cortes": the Samurai's Cuts, see classes/motor.mjs)
  for (const [word, value] of Object.entries(motorCostValues(item))) expr = expr.replaceAll(word, `(${value})`);
  expr = expr
    .replace(/[\s()[\]]/g, "")
    .replace(/[X×]/g, "*")
    .replace(/SR/g, `(${sr})`)
    .replace(/CR/g, `(${cr})`)
    .replace(/(\d)\(/g, "$1*(")
    .replace(/\)(\d|\()/g, ")*$1");
  if (!expr || !/^[\d+\-*/().]+$/.test(expr)) return null;
  try {
    return Math.floor(Roll.safeEval(expr));
  }
  catch {
    return null;
  }
}

/**
 * The counted usage limit of a skill.
 * @param {Item} item
 * @returns {{type: "Scene"|"Scenario"|"Round", max: number}|null}
 */
export function limitOf(item) {
  const { type, n } = parseSkillField("limit", item.system.limit);
  if (!LIMIT_TYPES.includes(type)) return null;
  const max = amount(n, item);
  return (max > 0) ? { type, max } : null;
}

/** The scene / scenario / round a use counts in (none for a round outside combat). */
function limitKey(type, actor, combat) {
  if (type === "Round") return combat ? `round.${combat.id}.${combat.round}` : null;
  if (type === "Scene") return `scene.${counter(actor, "scene")}`;
  return `scenario.${counter(actor, "scenario")}`;
}

/** Uses of a skill in the current scene / scenario / round. */
function usesOf(item, key) {
  const uses = item.getFlag(SYSTEM_ID, "uses");
  return (uses?.key === key) ? toInt(uses.n) : 0;
}

/**
 * The cost of a skill: "Hate 2", "Fate 1", "Hate [SR+1]", "H(3) + F(1)", "Hate 1 (Party)"…
 * The Hate cost includes the changes of the user's effects (see the system's skillModifiers).
 * @param {Item} item
 * @param {Actor} actor
 * @returns {{hate: number, fate: number, group: string}|null}
 */
export function costOf(item, actor) {
  const raw = String(item.system.cost ?? "").trim();
  let hate = 0;
  let fate = 0;
  let group = "";
  const both = raw.match(/^H\s*\((.+?)\)\s*\+\s*F\s*\((.+?)\)$/i);
  if (both) {
    hate = amount(both[1], item) ?? 0;
    fate = amount(both[2], item) ?? 0;
  }
  else {
    const { type, n, qual } = parseSkillField("cost", raw);
    if (type === "Hate") hate = amount(n, item) ?? 0;
    else if (type === "Fate") fate = amount(n, item) ?? 0;
    else return null;
    group = qual ?? "";
  }
  const modified = skillModifiers(actor, item).cost;
  if (modified) hate = modified.value;
  hate = Math.max(0, hate);
  fate = Math.max(0, fate);
  return (hate || fate) ? { hate, fate, group } : null;
}

/** Actions the actor spent in its Main Process of this round. */
function spentActions(actor, combat) {
  const key = `${combat.id}.${combat.round}`;
  const saved = actor.getFlag(SYSTEM_ID, "actions");
  const same = saved?.key === key;
  return {
    key,
    major: same ? toInt(saved.major) : 0,
    minor: same ? toInt(saved.minor) : 0,
    move: same ? toInt(saved.move) : 0
  };
}

/** Whether a skill with this Timing can be used now. */
function timingIssues(timing, combat, combatant) {
  const phase = combat.phase;
  if (OWN_PROCESS.has(timing)) {
    return ((phase === "main") && (combat.progress.active === combatant.id)) ? [] : [L("Use.OutsideProcess")];
  }
  if (timing === "Setup") return (phase === "setup") ? [] : [L("Use.OnlySetup")];
  // The Initiative Process comes before each Main Process of the round.
  if (timing === "Initiative") return (phase === "main") ? [] : [L("Use.OnlyInitiative")];
  if (timing === "Cleanup") return (phase === "cleanup") ? [] : [L("Use.OnlyCleanup")];
  if (timing === "Briefing") return [L("Use.OnlyBriefing")];
  if (OUT_OF_COMBAT.has(timing)) return [L("Use.OnlyOutOfCombat")];
  return [];
}

/** The item a skill comes from: the one whose power it is (content.mjs), else one that links to it. */
function sourceItem(skill) {
  const actor = skill.actor;
  const id = skill.getFlag(SYSTEM_ID, ITEM_SKILL)?.item;
  return (id && actor.items.get(id)) || actor.items.find(i => (i.id !== skill.id) && (linkedSkill(i) === skill)) || null;
}

/** The Character Rank from which an item (or the skill of its power) no longer works, 0 if none. */
const crLockOf = item => toInt(item.getFlag(SYSTEM_ID, "crLock"));
const crOf = actor => toInt(actor?.system?.infos?.crank ?? actor?.system?.rank);

/**
 * Whether the conditions of an item's skill are met: the item is equipped (and the item it is used with, as
 * a pair of swords), the Character Rank is below the item's lock, the Hate is high enough, the skill whose rank
 * sets the limit is there, the user hasn't acted.
 * @param {Item} item
 * @param {Actor} actor
 * @param {Combat|null} combat
 * @param {Combatant|null} combatant
 * @returns {string[]}
 */
function itemIssues(item, actor, combat, combatant) {
  const issues = [];
  const owner = sourceItem(item);
  if (owner && EQUIPMENT.includes(owner.type) && (owner.system.equipped === false)) {
    issues.push(L("Use.NotEquipped", { item: owner.name }));
  }
  const partner = item.getFlag(SYSTEM_ID, "withItem");
  if (partner && !actor.items.some(i => (i.name === partner) && EQUIPMENT.includes(i.type) && (i.system.equipped !== false))) {
    issues.push(L("Use.NotEquipped", { item: partner }));
  }
  const lock = crLockOf(item);
  if (lock && (crOf(actor) >= lock)) issues.push(L("Use.CrLocked", { lock }));
  const minHate = toInt(item.getFlag(SYSTEM_ID, "minHate"));
  const hate = toInt(actor._source.system.infos?.hate);
  if (minHate && (hate < minHate)) issues.push(L("Use.MinHate", { need: minHate, have: hate }));
  const of = item.getFlag(SYSTEM_ID, "srOf");
  if (of && !rankOf(item)) issues.push(L("Use.NoRankSkill", { skill: of.name }));
  if (item.getFlag(SYSTEM_ID, "notActed") && combatant && combat.isPostAction?.(combatant)) issues.push(L("Use.AlreadyActed"));
  return issues;
}

/**
 * Ask whether a use goes on despite its issues, or refuse it (issues of a "block" setting, for players).
 * @param {Item} item
 * @param {{text: string, mode: string}[]} issues
 * @returns {Promise<string[]|null>}   The issues it goes on despite, or null when it stops.
 */
async function decide(item, issues) {
  if (!issues.length) return [];
  const blocked = issues.filter(i => i.mode === "block");
  if (blocked.length && !game.user.isGM) {
    ui.notifications.warn(L("Use.Blocked", { name: item.name, reasons: blocked.map(i => i.text).join(" ") }));
    return null;
  }
  const list = issues.map(i => `<li>${escape(i.text)}</li>`).join("");
  const ok = await confirm({
    title: L("Use.ConfirmTitle", { name: item.name }),
    content: `<p>${escape(L("Use.ConfirmIntro"))}</p><ul>${list}</ul><p>${escape(L("Use.ConfirmQuestion"))}</p>`,
    yes: L("Use.UseAnyway"),
    no: L("Use.Cancel")
  });
  return ok ? issues.map(i => i.text) : null;
}

/**
 * Before a usable item is used: its Character Rank lock ("(CR21): This item has no effect"), by the setting
 * of the usage limits.
 * @param {Item} item
 * @returns {Promise<boolean>}   Whether the use goes on.
 */
export async function checkUsable(item) {
  const mode = setting("limits");
  const lock = crLockOf(item);
  if (!mode || (mode === "off") || !lock || (crOf(item.actor) < lock)) return true;
  return !!(await decide(item, [{ text: L("Use.CrLocked", { lock }), mode }]));
}

/* -------------------------------------------- */
/*  Before and after the card                   */
/* -------------------------------------------- */

/**
 * What using a skill now would meet, without asking anything: the issues (each with the mode of its
 * setting), the action it spends, its counted limit and uses, and its cost. The action HUD reads it to
 * show the uses left and to dim what can't be used now.
 * @param {Item} item
 * @returns {{combat: Combat|null, combatant: Combatant|null, timing: string, action: string|null,
 *   limit: object|null, key: string|null, uses: number, cost: object|null, issues: {text: string, mode: string}[]}}
 */
export function inspectUse(item, { targets = null } = {}) {
  const actor = item.actor;
  const combat = combatOf(actor);
  const combatant = combat ? combatantOf(combat, actor) : null;
  const timing = timingOf(item);
  const issues = [];

  // An Incapacitated (or Dead) character takes no actions.
  let action = null;
  const actionsMode = setting("actions");
  if (actionsMode && (actionsMode !== "off") && (actor.statuses.has("incapacitated") || actor.statuses.has("dead"))) {
    issues.push({ text: L("Use.Incapacitated", { name: actorName(actor) }), mode: actionsMode });
  }

  // Timing and action economy (in a started combat): [Hasted] has two Minor Actions, [Slowed] no Move Action.
  if (combatant && actionsMode && (actionsMode !== "off")) {
    for (const text of timingIssues(timing, combat, combatant)) issues.push({ text, mode: actionsMode });
    // A class Motor may change the action (the Samurai's Iai, at Initiative, spends the Major Action).
    const motorAction = motorActionOf(item, actor);
    action = (motorAction !== undefined) ? motorAction : (ACTIONS[timing] ?? null);
    if (action && (spentActions(actor, combat)[action] >= actionAllowance(actor)[action])) {
      issues.push({ text: L(`Use.ActionSpent.${action}`), mode: actionsMode });
    }
  }

  // What the user's conditions forbid (conditions/actions.mjs)
  issues.push(...conditionUseIssues(item, actor, { targets }));

  // Usage limit, and the conditions of an item's skill
  const limitsMode = setting("limits");
  const limit = (limitsMode && (limitsMode !== "off")) ? limitOf(item) : null;
  const key = limit ? limitKey(limit.type, actor, combat) : null;
  const uses = key ? usesOf(item, key) : 0;
  if (key && (uses >= limit.max)) {
    issues.push({ text: L("Use.LimitReached", { uses, max: limit.max, per: L(`Use.Per.${limit.type}`) }), mode: limitsMode });
  }
  if (limitsMode && (limitsMode !== "off")) {
    for (const text of itemIssues(item, actor, combat, combatant)) issues.push({ text, mode: limitsMode });
    // What a class Motor needs (the blade sheathed, enough Cuts…), see classes/motor.mjs
    for (const text of motorUseIssues(item, actor)) issues.push({ text, mode: limitsMode });
  }

  // Costs: the Fate must be there to pay
  const cost = (setting("costs") && (actor.type === "character")) ? costOf(item, actor) : null;
  if (cost?.fate && (cost.group !== "Allies")) {
    const fate = toInt(actor._source.system.fate?.value);
    if (fate < cost.fate) issues.push({ text: L("Use.NoFate", { need: cost.fate, have: fate }), mode: "block" });
  }

  return { combat, combatant, timing, action, limit, key, uses, cost, issues };
}

/**
 * The actions an actor still has in its Main Process of this round (Major, Minor, Move), or null outside a
 * started combat or with the action economy off.
 * @param {Actor} actor
 * @returns {{major: boolean, minor: boolean, move: boolean}|null}
 */
export function actionsLeft(actor) {
  const mode = setting("actions");
  const combat = combatOf(actor);
  if (!mode || (mode === "off") || !combat || !combatantOf(combat, actor)) return null;
  const spent = spentActions(actor, combat);
  const allowed = actionAllowance(actor);
  return { major: spent.major < allowed.major, minor: spent.minor < allowed.minor, move: spent.move < allowed.move };
}

/**
 * Spend one action of the actor's Main Process outside a skill (ending a status, see conditions/recovery.mjs).
 * @param {Actor} actor
 * @param {"major"|"minor"|"move"} action
 */
export async function spendAction(actor, action) {
  const combat = combatOf(actor);
  if (!combat || !Object.values(ACTIONS).includes(action)) return;
  const spent = spentActions(actor, combat);
  spent[action] += 1;
  await actor.update({ [`flags.${SYSTEM_ID}.actions`]: spent });
}

/**
 * Check the use and decide whether it goes on.
 * @param {Item} item
 * @returns {Promise<object|null>}   The plan to record after the card, or null when the use stops.
 */
async function planUse(item) {
  const state = inspectUse(item, { targets: [...game.user.targets] });
  const forced = await decide(item, state.issues);
  if (!forced) return null;
  // What a class Motor will spend: kept on the skill before its card, for its formulas (null: cancelled).
  const motor = await planMotorUse(item, item.actor);
  if (motor === null) return null;
  return { ...state, forced, motor };
}

/**
 * Pay the costs, count the use and the action, and note it on the card.
 * @param {Item} item
 * @param {object} plan          See planUse
 * @param {ChatMessage} message  The skill's card
 */
async function commitUse(item, plan, message) {
  const actor = item.actor;
  const record = {
    itemUuid: item.uuid, actorUuid: actor.uuid,
    combatId: plan.combat?.id ?? null, round: plan.combat?.round ?? null,
    hate: 0, fate: 0, action: null, limit: null, group: "", forced: plan.forced, undone: false
  };
  const updates = {};

  // The actions it spends: the Timing's (or the one its Motor says), and any other its Motor takes too
  // (Silence Before the Strike: no Move Action this Main Process).
  const also = plan.combat ? (skillMotor(item)?.alsoSpends ?? []).filter(a => Object.values(ACTIONS).includes(a)) : [];
  if ((plan.action || also.length) && plan.combat) {
    const spent = spentActions(actor, plan.combat);
    if (plan.action) spent[plan.action] += 1;
    for (const a of also) spent[a] += 1;
    updates[`flags.${SYSTEM_ID}.actions`] = spent;
    record.action = plan.action;
    if (also.length) record.alsoSpent = also;
  }

  const cost = plan.cost;
  if (cost) {
    record.group = cost.group;
    // "(Allies)": only the user's allies pay (by hand: see the card).
    const self = cost.group !== "Allies";
    if (cost.hate && self && plan.combat) {
      const hate = toInt(actor._source.system.infos?.hate);
      updates["system.infos.hate"] = hate + cost.hate;
      record.hate = cost.hate;
      record.hateTotal = hate + cost.hate;
    }
    if (cost.fate && self) {
      const fate = toInt(actor._source.system.fate?.value);
      const paid = Math.min(fate, cost.fate);
      updates["system.fate.value"] = fate - paid;
      record.fate = paid;
      record.fateTotal = fate - paid;
    }
  }
  if (!foundry.utils.isEmpty(updates)) await actor.update(updates);

  if (plan.key) {
    const n = plan.uses + 1;
    await item.setFlag(SYSTEM_ID, "uses", { key: plan.key, n });
    record.limit = { type: plan.limit.type, max: plan.limit.max, n, key: plan.key };
  }

  // The class Motor: what the use spent and set, or the blade a weapon attack draws (classes/motor.mjs)
  record.motor = await commitMotorUse(item, actor, plan.motor ?? {})
    .catch(err => (console.error(`${SYSTEM_ID} | Motor of ${item.uuid}`, err), null));

  if (record.hate || record.fate || record.action || record.limit || record.group || record.forced.length || record.motor) {
    await message.setFlag(SYSTEM_ID, "usage", record);
  }
  // The conditions an action sets off: [Shocked] hurts on a Major Action, which also ends [Intangible] and
  // [Hidden]; the last skill used is the one a [Sealed] without a name seals.
  await afterAction(actor, item, plan.action);
}

/**
 * Give back what a use took: Hate, Fate, the counted use and action. The effects the skill applied
 * are not removed.
 * @param {ChatMessage} message
 */
export async function undoUse(message) {
  const record = message.getFlag(SYSTEM_ID, "usage");
  if (!record || record.undone || !message.isOwner) return;
  const actor = fromUuidSync(record.actorUuid);
  const item = fromUuidSync(record.itemUuid);

  if (actor?.isOwner) {
    const updates = {};
    if (record.hate) updates["system.infos.hate"] = Math.max(0, toInt(actor._source.system.infos?.hate) - record.hate);
    if (record.fate) updates["system.fate.value"] = toInt(actor._source.system.fate?.value) + record.fate;
    const spent = actor.getFlag(SYSTEM_ID, "actions");
    if (spent?.key === `${record.combatId}.${record.round}`) {
      for (const action of [record.action, ...(record.alsoSpent ?? [])].filter(Boolean)) {
        updates[`flags.${SYSTEM_ID}.actions.${action}`] = Math.max(0, toInt(spent[action]) - 1);
      }
    }
    if (!foundry.utils.isEmpty(updates)) await actor.update(updates);
  }

  if (record.motor) await undoMotorUse(record.motor);

  const uses = item?.getFlag(SYSTEM_ID, "uses");
  if (record.limit && item?.isOwner && (uses?.key === record.limit.key)) {
    await item.setFlag(SYSTEM_ID, "uses", { key: uses.key, n: Math.max(0, toInt(uses.n) - 1) });
  }
  await message.setFlag(SYSTEM_ID, "usage", { ...record, undone: true });
}

/** The line under a skill's card: what the use cost and counted, and the Undo button. */
function renderUse(message, html) {
  const record = message.getFlag(SYSTEM_ID, "usage");
  if (!record) return;
  const card = html.querySelector(".skill-chat-card") ?? html.querySelector(".message-content");
  if (!card) return;

  const parts = [];
  if (record.action) parts.push(L(`Use.Action.${record.action}`));
  if (record.hate) parts.push(L("Use.Paid.Hate", { n: record.hate, total: record.hateTotal }));
  if (record.fate) parts.push(L("Use.Paid.Fate", { n: record.fate, total: record.fateTotal }));
  if (record.limit) parts.push(L("Use.Uses", { n: record.limit.n, max: record.limit.max, per: L(`Use.Per.${record.limit.type}`) }));
  if (record.group) parts.push(L("Use.Group", { group: record.group }));

  const footer = document.createElement("div");
  footer.className = `lhauto-use${record.undone ? " undone" : ""}`;
  footer.innerHTML = `<span class="lhauto-use-parts"><i class="fa-solid fa-receipt"></i> ${parts.map(escape).join(" · ")}</span>`;
  if (record.forced?.length) {
    const warning = document.createElement("div");
    warning.className = "lhauto-forced";
    warning.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> ${escape(L("Use.Forced"))}: ${record.forced.map(escape).join(" ")}`;
    footer.append(warning);
  }
  if (record.undone) {
    footer.insertAdjacentHTML("beforeend", `<div class="lhauto-undone">${escape(L("Use.Undone"))}</div>`);
  }
  else if (message.isOwner) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "lhauto-undo";
    button.dataset.tooltip = L("Use.UndoHint");
    button.innerHTML = `<i class="fa-solid fa-rotate-left"></i> ${escape(L("Use.Undo"))}`;
    button.addEventListener("click", event => {
      event.preventDefault();
      button.disabled = true;
      undoUse(message).catch(err => console.error(`${SYSTEM_ID} | Could not undo the use`, err));
    });
    footer.append(button);
  }
  card.append(footer);
}
