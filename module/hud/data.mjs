/**
 * Action HUD — what the bar and its panels show for an actor (the app is in hud.mjs).
 *
 * The bar: portrait, HP and Barrier, Fate, Hate, Fatigue, the class Motor, the combat state (join, the actions left
 * in the Main Process, end it, Standby), the panel buttons and the pinned shortcuts. The panels: the checks, a
 * character's skills in three (the general ones and the class's by Timing, the spells by Magia), the items (hands,
 * trigger powers, usable items) and the statuses. A monster's skills all show in one panel.
 *
 * Skill rows read use.mjs (inspectUse) without asking anything: uses left of a counted limit, the cost to
 * pay, and why the skill can't be used now (dimmed). Panels are only built when open.
 */
import { recoveryOf } from "../conditions/recovery.mjs";
import { L, SYSTEM_ID, setting } from "../settings.mjs";
import { getStatusPanel } from "../helpers/statuses.mjs";
import { parseSkillField } from "../helpers/skill-fields.mjs";
import { skillRollable } from "../helpers/skill-rolls.mjs";
import { actionsLeft, inspectUse } from "../automation/use.mjs";
import { itemSkillsOf, linkedSkill } from "../content/content.mjs";
import { motorData, motorMax, motorName, motorsOf, motorStateLabel, motorUnit } from "../classes/motor.mjs";
import { categoryOf, categoryView } from "../apps/magic-catalog.mjs";
import { itemMagia } from "../helpers/magic-traits.mjs";
import { isEmpty, tagLabel, term } from "../i18n/terms.mjs";
import { ATTRIBUTES, COMBAT_CHECKS, TIMING_GROUPS } from "../sheets/character-sheet.mjs";
import { actorName, combatantOf, combatOf, escape, toInt } from "../helpers/utils.mjs";
import { spendsFate } from "../automation/fate.mjs";

/**
 * The panels, in the order of their buttons. A character's skills come apart in three (skillPanelOf): "skills" has
 * the general ones (basic, racial…), "magic" the spells of its Magias and "class" the class's own; the last two are
 * only a character's (a monster's skills all show in "skills").
 */
export const PANELS = [
  { id: "checks", icon: "fa-solid fa-dice-d6" },
  { id: "skills", icon: "fa-solid fa-hand-fist" },
  { id: "magic", icon: "fa-solid fa-hat-wizard", character: true },
  { id: "class", icon: "fa-solid fa-chess-knight", character: true },
  { id: "items", icon: "fa-solid fa-sack" },
  { id: "effects", icon: "fa-solid fa-person-rays" }
];

/** The three panels of the skills, which share the template's block (panel.skills) and hint. */
const SKILL_PANELS = ["skills", "magic", "class"];

/**
 * Pinned shortcuts: "item.<id>" or "check.<key>", in the flag `hud.pins` of the actor, or of the base actor of
 * an unlinked token (every token of a monster shares them; their items keep the base actor's ids).
 */
export const MAX_PINS = 8;
export const pinHolder = actor => ((actor?.isToken && actor.token?.baseActor?.isOwner) ? actor.token.baseActor : actor);
export const pinsOf = actor => {
  const list = pinHolder(actor)?.getFlag(SYSTEM_ID, "hud")?.pins;
  return Array.isArray(list) ? list.filter(p => typeof p === "string") : [];
};

const MONSTER_CHECKS = ["evasion", "resistance"];
/** The actions of the Main Process and their icons. */
const ACTION_ICONS = [["major", "fa-burst"], ["minor", "fa-hand"], ["move", "fa-shoe-prints"], ["instant", "fa-bolt"]];
const EQUIPMENT = ["weapon", "shield", "armor", "accessory", "bag"];
const checkName = key => key.charAt(0).toUpperCase() + key.slice(1);
const signed = n => (n >= 0 ? `+${n}` : `${n}`);
const diceText = (dice, mod) => (dice ? `${dice}d6${mod ? signed(mod) : ""}` : String(mod));
const timingOf = item => parseSkillField("timing", item.system.timing).type;
const localizeCheck = key => game.i18n.localize(`ETERNIA.Check.${checkName(key)}`);

/* -------------------------------------------- */
/*  Checks                                      */
/* -------------------------------------------- */

/**
 * A check of the actor as its sheet rolls it: a character's dice and total, a monster's { dice, mod }.
 * @param {Actor} actor
 * @param {string} key   "athletics", "evasion"…
 * @returns {{key: string, name: string, label: string, dice: number, mod: number, text: string}|null}
 */
export function checkOf(actor, key) {
  const c = actor?.system?.checks?.[key];
  if (!c) return null;
  const monster = actor.type === "monster";
  const dice = monster ? toInt(c.dice) : (toInt(c.dice) || 2);
  const mod = monster ? toInt(c.mod) : toInt(c.total);
  return { key, name: checkName(key), label: localizeCheck(key), dice, mod, text: diceText(dice, mod) };
}

/** The checks panel: the ability checks by attribute and the combat checks (a monster: Evasion, Resistance). */
function checksPanel(actor, pins) {
  const row = (key, attr) => {
    const check = checkOf(actor, key);
    return check && { ...check, attr, pinned: pins.includes(`check.${key}`), tier: Math.clamp(check.dice - 1, 1, 5) };
  };
  if (actor.type === "monster") {
    return { groups: [{ label: L("Sheet.CombatChecks"), checks: MONSTER_CHECKS.map(k => row(k)).filter(Boolean) }] };
  }
  return {
    groups: [
      { label: L("Sheet.AbilityChecks"), grid: true, checks: ATTRIBUTES.flatMap(({ key, checks }) => checks.map(c => row(c, L(`Sheet.Attr.${key}.abbr`)))).filter(Boolean) },
      { label: L("Sheet.CombatChecks"), checks: COMBAT_CHECKS.map(k => row(k)).filter(Boolean) }
    ]
  };
}

/* -------------------------------------------- */
/*  Skill rows                                  */
/* -------------------------------------------- */

/** "Ódio 2", "Destino 1", "Ódio 2 · Destino 1" (what the use will pay, effects included). */
function costText(cost) {
  if (!cost) return "";
  return [cost.hate ? L("Hud.Cost.hate", { n: cost.hate }) : "", cost.fate ? L("Hud.Cost.fate", { n: cost.fate }) : ""]
    .filter(Boolean).join(" · ");
}

/**
 * A usable skill as a row: name, Skill Rank, cost, the uses left of its counted limit (pips up to 5), and why it
 * can't be used now.
 * @param {Item} item
 * @param {string[]} pins
 */
export function skillRow(item, pins = []) {
  const s = item.system;
  const state = inspectUse(item);
  const max = Math.clamp(toInt(s.skillRank?.max), 0, 10);
  const sr = toInt(s.skillRank?.value);
  let uses = null;
  if (state.limit) {
    const left = Math.max(0, state.limit.max - state.uses);
    uses = {
      left, max: state.limit.max,
      pips: (state.limit.max <= 5) ? Array.from({ length: state.limit.max }, (_, i) => i < left) : null,
      tooltip: L("Hud.UsesLeft", { left, max: state.limit.max, per: L(`Use.Per.${state.limit.type}`) })
    };
  }
  const issues = state.issues.map(i => i.text);
  const row = {
    id: item.id,
    kind: "item",
    name: item.name,
    img: item.img,
    timing: state.timing,
    sr: max ? `${sr}/${max}` : "",
    cost: costText(state.cost) || (isEmpty(s.cost) ? "" : term("cost", s.cost)),
    limit: (!uses && !isEmpty(s.limit)) ? term("limit", s.limit) : "",
    uses,
    issues: issues.join(" "),
    blocked: state.issues.some(i => i.mode === "block"),
    unusable: issues.length > 0,
    rollable: skillRollable(item).check,
    pinned: pins.includes(`item.${item.id}`)
  };
  row.tip = tipHTML(item, row);
  return row;
}

/** A usable item (potion, food…) as a row: quantity, Timing, its Character Rank lock. */
function usableRow(item, pins = []) {
  const s = item.system;
  const qty = toInt(s.quantity);
  const row = {
    id: item.id,
    kind: "item",
    usable: true,
    name: item.name,
    img: item.img,
    timing: parseSkillField("timing", s.timing).type,
    qty: (qty > 1) ? qty : null,
    cost: "",
    limit: "",
    uses: null,
    issues: "",
    unusable: false,
    pinned: pins.includes(`item.${item.id}`)
  };
  row.tip = tipHTML(item, row);
  return row;
}

/* -------------------------------------------- */
/*  Tooltips                                    */
/* -------------------------------------------- */

const TIP_FIELDS = [
  ["ETERNIA.Item.Label.Timing", "timing"], ["ETERNIA.Item.Label.Check", "checkLabel"],
  ["ETERNIA.Item.Label.Target", "target"], ["ETERNIA.Item.Label.Range", "range"],
  ["ETERNIA.Skill.Label.Damage", "damageLabel"], ["ETERNIA.Sheet.Cost", "cost"], ["ETERNIA.Sheet.Limit", "limit"]
];
const FIELD_TERMS = { checkLabel: "check" };

/** The short tooltip of a row (fields, tags, why it can't be used); hud.mjs adds the description on hover. */
function tipHTML(item, row) {
  const s = item.system;
  const fields = TIP_FIELDS.filter(([, key]) => !isEmpty(s[key])).map(([label, key]) =>
    `<span><b>${escape(game.i18n.localize(label))}</b> ${escape(term(FIELD_TERMS[key] ?? key, s[key]))}</span>`).join("");
  const tags = (s.tags ?? []).map(t => `<li>${escape(tagLabel(t))}</li>`).join("");
  const meta = [game.i18n.localize(`TYPES.Item.${item.type}`), row.sr ? `${L("Sheet.SRShort")} ${row.sr}` : ""].filter(Boolean).join(" · ");
  return `<header><strong>${escape(item.name)}</strong><span>${escape(meta)}</span></header>
    ${tags ? `<ul class="lhh-tip-tags">${tags}</ul>` : ""}
    ${fields ? `<div class="lhh-tip-fields">${fields}</div>` : ""}
    ${row.uses ? `<p class="lhh-tip-uses">${escape(row.uses.tooltip)}</p>` : ""}
    ${row.issues ? `<p class="lhh-tip-issues"><i class="fa-solid fa-triangle-exclamation"></i> ${escape(row.issues)}</p>` : ""}`;
}

/**
 * The enriched description of an item, for the end of its tooltip (hud.mjs caches it per item version).
 * @param {Item} item
 */
export async function descriptionHTML(item) {
  const html = await foundry.applications.ux.TextEditor.implementation.enrichHTML(item.system.description ?? "", {
    relativeTo: item, rollData: item.getRollData?.() ?? {}, secrets: item.isOwner
  });
  return html ? `<div class="lhh-tip-desc">${html}</div>` : "";
}

/* -------------------------------------------- */
/*  Skills, items, statuses                     */
/* -------------------------------------------- */

/** Skills used from elsewhere: the trigger powers of carried items. */
function skillsUsedElsewhere(actor) {
  const ids = new Set();
  for (const [itemId, list] of itemSkillsOf(actor)) if (actor.items.has(itemId)) for (const skill of list) ids.add(skill.id);
  return ids;
}

/**
 * The panel of a character's skill: "magic" for a Magia and its spells, "class" for the class's own and a
 * Dedication's (they carry the class flags, or come from the class compendium), "skills" for the rest.
 * @param {Item} item
 * @returns {"skills"|"magic"|"class"}
 */
export function skillPanelOf(item) {
  if (itemMagia(item)) return "magic";
  const flags = item.flags?.[SYSTEM_ID] ?? {};
  if (flags.kind || flags.identifier) return "class";
  return String(item._stats?.compendiumSource ?? "").startsWith(`Compendium.${SYSTEM_ID}.skills-class.`) ? "class" : "skills";
}

/** The skills that are used (not Constant, nor the trigger powers of the items), in the sheet's order. */
function usedSkills(actor) {
  const elsewhere = skillsUsedElsewhere(actor);
  return actor.items.filter(i => (i.type === "skill") && !elsewhere.has(i.id) && (timingOf(i) !== "Constant"))
    .sort((a, b) => (a.sort - b.sort) || a.name.localeCompare(b.name, game.i18n.lang));
}

const TIMINGS = TIMING_GROUPS.filter(g => g.id !== "constant");
/** The Timing group of a skill, as its index in TIMINGS (the last one, "other", when none fits). */
function timingGroup(item) {
  const timing = timingOf(item);
  const index = TIMINGS.findIndex(g => g.timings.includes(timing));
  return (index >= 0) ? index : TIMINGS.length - 1;
}

/** Skill rows by Timing. */
function byTiming(skills, pins) {
  const groups = TIMINGS.map(g => ({ id: g.id, label: L(`Sheet.Timing.${g.id}`), rows: [] }));
  for (const skill of skills) groups[timingGroup(skill)].rows.push(skillRow(skill, pins));
  return groups.filter(g => g.rows.length);
}

/** The general skills of a character (a monster: all its skills), by Timing. */
function skillsPanel(actor, pins) {
  const all = actor.type !== "character";
  return { groups: byTiming(usedSkills(actor).filter(i => all || (skillPanelOf(i) === "skills")), pins), empty: L("Hud.NoSkills") };
}

/** The class's skills (a Dedication's too), by Timing. */
function classPanel(actor, pins) {
  return { groups: byTiming(usedSkills(actor).filter(i => skillPanelOf(i) === "class"), pins), empty: L("Hud.NoClassSkills") };
}

/**
 * The spells, by Magia in the order of the slots: each Magia in the color of its category, with what it says under
 * the pointer (right click opens it), and its spells by Timing, each with its own. The spells of a Magia the
 * character doesn't have come last.
 */
function magicPanel(actor, pins) {
  const spells = usedSkills(actor).filter(i => skillPanelOf(i) === "magic")
    .sort((a, b) => (timingGroup(a) - timingGroup(b)) || (toInt(a.flags[SYSTEM_ID]?.minRank) - toInt(b.flags[SYSTEM_ID]?.minRank)));
  const row = spell => ({ ...skillRow(spell, pins), when: isEmpty(spell.system.timing) ? "" : term("timing", spell.system.timing) });
  const magias = actor.items.filter(i => (i.type === "skill") && i.flags?.[SYSTEM_ID]?.magic?.id)
    .sort((a, b) => (toInt(a._stats?.createdTime) - toInt(b._stats?.createdTime)) || (a.sort - b.sort));
  const groups = magias.map(magia => {
    const id = magia.flags[SYSTEM_ID].magic.id;
    const category = categoryView(categoryOf(magia.flags[SYSTEM_ID].magic));
    return {
      id: magia.id, label: magia.name, img: magia.img, color: category.color, note: category.label, noteIcon: category.icon,
      tip: `<header><strong>${escape(magia.name)}</strong><span>${escape(`${L("Hud.Magia")} · ${category.label}`)}</span></header>`,
      none: L("Hud.NoSpells"),
      rows: spells.filter(s => itemMagia(s) === id).map(row)
    };
  });
  const known = new Set(magias.map(m => m.flags[SYSTEM_ID].magic.id));
  const others = spells.filter(s => !known.has(itemMagia(s)));
  if (others.length) groups.push({ label: L("Hud.OtherSpells"), rows: others.map(row) });
  return { groups, empty: L("Hud.NoMagic") };
}

/** The items panel: what is in the hands, the trigger powers of the equipment, and the usable items. */
function itemsPanel(actor, pins) {
  const powers = itemSkillsOf(actor);
  const withPowers = item => {
    const list = (powers.get(item.id) ?? []).slice();
    const linked = linkedSkill(item);
    if (linked?.actor === actor && (linked.type === "skill") && !list.includes(linked)) list.unshift(linked);
    return list;
  };
  const equipped = actor.items.filter(i => EQUIPMENT.includes(i.type) && (i.system.equipped !== false));
  const hands = equipped.filter(i => ["weapon", "shield"].includes(i.type));
  const gear = equipped.filter(i => !["weapon", "shield"].includes(i.type)).concat(actor.items.filter(i => i.type === "gear"));
  // A power is named after its item ("Whip (1)"): under the item it reads "Power 1 · Setup".
  const entry = item => ({
    id: item.id, name: item.name, img: item.img,
    typeLabel: game.i18n.localize(`TYPES.Item.${item.type}`),
    powers: withPowers(item).map((skill, i, list) => {
      const row = skillRow(skill, pins);
      const timing = isEmpty(skill.system.timing) ? "" : term("timing", skill.system.timing);
      if (skill.name.startsWith(item.name)) {
        row.name = [L((list.length > 1) ? "Hud.PowerN" : "Hud.Power", { n: i + 1 }), timing].filter(Boolean).join(" · ");
      }
      return row;
    })
  });
  const groups = [
    { id: "hands", label: L("Hud.Hands"), entries: hands.map(entry) },
    { id: "equipment", label: L("Hud.Powers"), entries: gear.map(entry).filter(e => e.powers.length) },
    { id: "usable", label: L("Hud.Usables"), rows: actor.items.filter(i => i.type === "usable").map(i => usableRow(i, pins)) }
  ].filter(g => g.entries?.length || g.rows?.length);
  return { groups };
}

/** The statuses panel: the active statuses (with their values) and the temporary effects. */
function effectsPanel(actor) {
  const entry = v => ((v && typeof v === "object") ? [v.tag, v.value].filter(x => (x !== undefined) && (x !== "")).join(" ") : String(v));
  const statuses = getStatusPanel(actor).flatMap(group => group.statuses.filter(s => s.active).map(s => {
    let detail = "";
    if (s.list && Array.isArray(s.value) && s.value.length) detail = s.value.map(entry).join(", ");
    else if (s.rated && toInt(s.value)) detail = String(toInt(s.value));
    // The rules as tooltip, and the action that ends it when there is one (conditions/recovery.mjs)
    return { id: s.id, img: s.img, label: s.label, detail, group: group.id, bad: group.id === "bad", desc: s.desc, recover: recoveryOf(s.id, actor) };
  }));
  const fatigue = toInt(actor._source.system?.infos?.fatigue);
  const fatigueImg = CONFIG.statusEffects.find(s => s.id === "fatigue")?.img;
  if (fatigue) statuses.unshift({ id: "fatigue", img: fatigueImg, label: L("Sheet.Fatigue"), detail: String(fatigue), group: "life", fixed: true });
  const effects = actor.temporaryEffects.filter(e => !e.statuses.size || ![...e.statuses].some(id => statuses.some(s => s.id === id)))
    .map(e => ({ id: e.id, uuid: e.uuid, name: e.name, img: e.img, duration: e.duration?.label ?? "" }));
  const bad = statuses.filter(s => s.bad).length;
  return {
    statuses, effects,
    canRemoveBad: (actor.type === "character") && !!setting("fate") && (bad > 0) && (toInt(actor._source.system?.fate?.value) > 0)
  };
}

/* -------------------------------------------- */
/*  Bar                                         */
/* -------------------------------------------- */

/** The combat block of the bar, or null when there is no combat to show. */
function combatBlock(actor, token) {
  const combat = combatOf(actor);
  if (!combat) {
    // A combat on this scene the token isn't in yet: join it.
    const viewed = game.combats.viewed;
    const inIt = viewed && combatantOf(viewed, actor);
    if (viewed && !inIt && token && (!viewed.scene || (viewed.scene === token.document?.parent))) {
      return { join: true, initiative: initiativeOf(actor) };
    }
    if (viewed && inIt) return { briefing: true, initiative: initiativeOf(actor) };
    return null;
  }
  const combatant = combatantOf(combat, actor);
  const phase = combat.phase;
  const active = (phase === "main") && (combat.combatant?.id === combatant?.id);
  const left = active ? actionsLeft(actor) : null;
  return {
    started: true,
    round: combat.round,
    phase: game.i18n.localize(`ETERNIA.Combat.Phase.${phase}`),
    active,
    post: !active && !!combat.isPostAction?.(combatant),
    standby: !active && !!combat.isOnStandby?.(combatant),
    canStandby: active && !!combat.canStandby?.(combatant),
    actions: left && ACTION_ICONS.map(([id, icon]) => ({ id, icon, left: left[id], label: L(`Hud.Action.${id}`) })),
    initiative: initiativeOf(actor)
  };
}

const initiativeOf = actor => (actor.type === "character")
  ? toInt(actor.system["battle-status"]?.initiative?.total)
  : toInt(actor.system["battle-status"]?.initiative);

/** How many recent chat messages are searched for the attacks the actor still has to dodge, and for how long. */
const DODGE_LOOKBACK = 40;
const DODGE_MINUTES = 20;

/**
 * The Dodge Checks the actor still has to roll: character targets of recent attack cards with no dodge yet
 * (monsters dodge by themselves). An attack whose damage was already rolled, or older than 20 minutes, is over.
 * Rolled from the HUD through the card's own button (hud.mjs).
 * @param {Actor} actor
 */
export function pendingDodges(actor) {
  if (actor?.type !== "character") return [];
  const list = [];
  const damaged = new Set();
  const since = Date.now() - (DODGE_MINUTES * 60000);
  const messages = game.messages.contents;
  for (let i = messages.length - 1, seen = 0; (i >= 0) && (seen < DODGE_LOOKBACK); i--, seen++) {
    const message = messages[i];
    if ((message.timestamp ?? 0) < since) break;
    const attackId = message.flags?.[SYSTEM_ID]?.attackId;
    if (attackId) damaged.add(attackId);
    const attack = message.flags?.eternia?.attack;
    if (!attack || attack.auto || !attack.vs || !message.visible || damaged.has(message.id)) continue;
    (attack.targets ?? []).forEach((target, index) => {
      if (target.dodge || (target.actorUuid !== actor.uuid) || ((target.hit !== null) && (target.hit !== undefined))) return;
      const by = message.speaker?.alias ?? ChatMessage.getSpeakerActor(message.speaker)?.name ?? "?";
      list.push({
        messageId: message.id, index, by,
        tooltip: L("Hud.DodgeHint", {
          by, skill: attack.skillName ?? "", total: attack.attack?.total ?? "?",
          check: localizeCheck(attack.vs), dice: checkOf(actor, attack.vs)?.text ?? ""
        })
      });
    });
  }
  return list;
}

/** The latest pending Dodge Check, and how many more wait after it. */
function dodgeOf(actor) {
  const list = pendingDodges(actor);
  return list.length ? { ...list[0], more: list.length - 1 } : null;
}

/** The pinned shortcuts that still exist, as bar buttons. */
function pinButtons(actor, pins) {
  return pins.slice(0, MAX_PINS).map(pin => {
    const [kind, id] = pin.split(".");
    if (kind === "check") {
      const check = checkOf(actor, id);
      return check && { pin, kind: "check", key: id, label: check.label, short: check.label.slice(0, 3), text: check.text };
    }
    const item = actor.items.get(id);
    if (!item) return null;
    const row = (item.type === "usable") ? usableRow(item, pins) : skillRow(item, pins);
    return { ...row, pin };
  }).filter(Boolean);
}

/**
 * The class Motors of a character for the bar: name, state, points (a pip sets them, as on the class tab) and
 * whether the next strike is a Perfect Cut.
 * @param {Actor} actor
 * @returns {object[]}
 */
function motorBlocks(actor) {
  return motorsOf(actor).map(({ def, lesser }) => {
    const data = motorData(actor, def.id);
    const max = motorMax(actor, def.id);
    const value = Math.clamp(toInt(data.value), 0, max);
    const extra = def.display?.(actor, { lesser, data, max }) ?? {};
    const ready = !!extra.ready;
    const stateLabel = motorStateLabel(def, data.state);
    return {
      id: def.id,
      name: motorName(def),
      state: data.state,
      stateLabel,
      ready,
      pips: Array.from({ length: max }, (_, i) => ({ value: i + 1, on: i < value })),
      tooltip: [stateLabel ? `${motorName(def)}: ${stateLabel}` : motorName(def), `${value}/${max} ${motorUnit(def)}`,
        extra.note ?? "", ready ? (extra.readyLabel ?? "") : ""].filter(Boolean).join(" · ")
    };
  });
}

/** A panel's button: a character's "skills" are its general ones. */
const panelLabel = (id, character) => L(`Hud.Panel.${(character && (id === "skills")) ? "general" : id}`);

/** The title over an open panel: as its button, but the general skills in full and the class panel with its name. */
function panelTitle(actor, id) {
  const character = actor.type === "character";
  if (character && (id === "skills")) return L("Hud.Title.general");
  const job = (id === "class") ? actor.items.find(i => i.type === "class") : null;
  return job ? L("Hud.Title.class", { name: job.name }) : panelLabel(id, character);
}

/**
 * Everything the HUD template needs.
 * @param {Actor} actor
 * @param {Token|null} token
 * @param {object} state      { panel, collapsed }
 */
export function hudContext(actor, token, { panel, collapsed }) {
  const system = actor.system;
  const source = actor._source.system ?? {};
  const character = actor.type === "character";
  const pins = pinsOf(actor);

  const hp = toInt(system.health?.value), hpMax = Math.max(0, toInt(system.health?.max));
  const fate = toInt(source.fate?.value), fateMax = Math.max(0, toInt(system.fate?.max));
  const hate = toInt(source.infos?.hate);
  const rank = actor.statuses.has("hateTop") ? "top" : (actor.statuses.has("hateUnder") ? "under" : null);
  const badCount = getStatusPanel(actor).find(g => g.id === "bad")?.statuses.filter(s => s.active).length ?? 0;

  const panels = PANELS.filter(p => character || !p.character).map(p => ({
    ...p, label: panelLabel(p.id, character), active: p.id === panel,
    badge: (p.id === "effects" && badCount) ? badCount : null
  }));
  if (!panels.some(p => p.id === panel)) panel = null;

  const context = {
    name: actorName(actor),
    img: actor.img,
    character,
    collapsed,
    hp: { value: hp, max: hpMax, pct: hpMax ? Math.clamp(Math.round((hp / hpMax) * 100), 0, 100) : 0, low: hpMax && (hp <= hpMax / 4) },
    barrier: toInt(source["bad-status"]?.barrier),
    // A boss's Fate too (spendsFate: not a Rift's, which is its clock)
    fate: (character || ((actor.type === "monster") && spendsFate(actor))) ? {
      value: fate, max: fateMax,
      pips: Array.from({ length: Math.clamp(Math.max(fateMax, fate), 0, 10) }, (_, i) => i < fate),
      tooltip: L("Hud.FateTip", { value: fate, max: fateMax })
    } : null,
    hate: character ? { value: hate, rank, tooltip: [L("Hud.HateTip", { value: hate }), rank ? game.i18n.localize(`ETERNIA.StatusEffect.${rank === "top" ? "hateTop" : "hateUnder"}`) : ""].filter(Boolean).join(" · ") } : null,
    fatigue: character ? toInt(source.infos?.fatigue) : 0,
    motors: character ? motorBlocks(actor) : [],
    combat: combatBlock(actor, token),
    dodge: dodgeOf(actor),
    panels,
    pins: pinButtons(actor, pins),
    panel: null
  };

  if (panel && !collapsed) {
    const build = {
      checks: checksPanel, skills: skillsPanel, magic: magicPanel, class: classPanel, items: itemsPanel, effects: effectsPanel
    }[panel];
    const key = SKILL_PANELS.includes(panel) ? "skills" : panel;
    context.panel = { id: panel, label: panelTitle(actor, panel), hint: L(`Hud.Hint.${key}`), [key]: build(actor, pins) };
  }
  return context;
}
