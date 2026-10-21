/**
 * Action HUD — what the bar and its panels show for an actor (the app is in hud.mjs).
 *
 * The bar: portrait, HP and Barrier, Fate, Hate, Fatigue, the combat state (join, the actions left in the
 * Main Process, end it, Standby), the panel buttons and the pinned shortcuts. The panels: the checks, the
 * skills by Timing, the Kuden pieces, the items (hands, trigger powers, usable items) and the statuses.
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
import { kudenOf, pieceOf, piecesOf, resourceOf } from "../kuden/pieces.mjs";
import { isEmpty, tagLabel, term } from "../i18n/terms.mjs";
import { ATTRIBUTES, COMBAT_CHECKS, TIMING_GROUPS } from "../sheets/character-sheet.mjs";
import { actorName, combatantOf, combatOf, escape, toInt } from "../helpers/utils.mjs";

/** The panels, in the order of their buttons. */
export const PANELS = [
  { id: "checks", icon: "fa-solid fa-dice-d6" },
  { id: "skills", icon: "fa-solid fa-wand-sparkles" },
  { id: "kuden", icon: "fa-solid fa-scroll" },
  { id: "items", icon: "fa-solid fa-sack" },
  { id: "effects", icon: "fa-solid fa-person-rays" }
];

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
const ACTION_ICONS = [["major", "fa-burst"], ["minor", "fa-hand"], ["move", "fa-shoe-prints"]];
const EQUIPMENT = ["weapon", "shield", "armor", "accessory", "bag"];
const checkName = key => key.charAt(0).toUpperCase() + key.slice(1);
const signed = n => (n >= 0 ? `+${n}` : `${n}`);
const diceText = (dice, mod) => (dice ? `${dice}D${mod ? signed(mod) : ""}` : String(mod));
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
/*  Skills, Kuden, items, statuses              */
/* -------------------------------------------- */

/** Skills used from elsewhere: the trigger powers of carried items and, with the Kuden panel, the pieces. */
function skillsUsedElsewhere(actor, kuden) {
  const ids = new Set();
  for (const [itemId, list] of itemSkillsOf(actor)) if (actor.items.has(itemId)) for (const skill of list) ids.add(skill.id);
  if (kuden) for (const piece of piecesOf(actor)) ids.add(piece.id);
  return ids;
}

/** The skills panel: the skills that are used (not Constant), by Timing. */
function skillsPanel(actor, pins, kuden) {
  const elsewhere = skillsUsedElsewhere(actor, kuden);
  const skills = actor.items.filter(i => (i.type === "skill") && !elsewhere.has(i.id) && (timingOf(i) !== "Constant"))
    .sort((a, b) => (a.sort - b.sort) || a.name.localeCompare(b.name, game.i18n.lang));
  const groups = TIMING_GROUPS.filter(g => g.id !== "constant").map(g => ({ id: g.id, label: L(`Sheet.Timing.${g.id}`), rows: [] }));
  for (const skill of skills) {
    const timing = timingOf(skill);
    const index = groups.findIndex(g => TIMING_GROUPS.find(t => t.id === g.id).timings.includes(timing));
    groups[(index >= 0) ? index : groups.length - 1].rows.push(skillRow(skill, pins));
  }
  return { groups: groups.filter(g => g.rows.length) };
}

/** The Kuden panel: the Resource, the Core and the pieces (Constant ones are shown to read and to post). */
function kudenPanel(actor, pins) {
  const resource = resourceOf(actor);
  const row = item => {
    const constant = timingOf(item) === "Constant";
    const r = constant ? { ...skillRow(item, pins), unusable: false, issues: "", uses: null, constant: true } : skillRow(item, pins);
    if (constant) r.tip = tipHTML(item, r);
    r.restriction = kudenOf(item)?.restriction ?? "";
    r.tier = r.restriction ? L(`Kuden.Tier.${r.restriction}`) : "";
    return r;
  };
  const pieces = piecesOf(actor);
  const groups = ["core", "technique", "apex", "greaterGift", "gift"].map(piece => ({
    id: piece,
    label: L(piece === "core" ? "Kuden.Piece.core" : `Kuden.Pieces.${piece}`),
    rows: pieces.filter(p => pieceOf(p) === piece).map(row)
  })).filter(g => g.rows.length);
  return {
    resource: resource && {
      name: resource.name, value: resource.value, max: resource.max,
      manual: resource.source === "manual",
      pips: Array.from({ length: resource.max }, (_, i) => ({ value: i + 1, on: i < resource.value })),
      hint: (resource.source === "hour") ? L("Kuden.Sheet.ResourceHour", { hour: L(`Kuden.Hour.${resource.hour}`) }) : L("Kuden.Source.manual")
    },
    groups
  };
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
    return { id: s.id, img: s.img, label: s.label, detail, group: group.id, bad: group.id === "bad", desc: s.desc, recover: recoveryOf(s.id) };
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
 * Everything the HUD template needs.
 * @param {Actor} actor
 * @param {Token|null} token
 * @param {object} state      { panel, collapsed }
 */
export function hudContext(actor, token, { panel, collapsed }) {
  const system = actor.system;
  const source = actor._source.system ?? {};
  const character = actor.type === "character";
  const kuden = character && !!setting("kuden") && piecesOf(actor).length > 0;
  const pins = pinsOf(actor);

  const hp = toInt(system.health?.value), hpMax = Math.max(0, toInt(system.health?.max));
  const fate = toInt(source.fate?.value), fateMax = Math.max(0, toInt(system.fate?.max));
  const hate = toInt(source.infos?.hate);
  const rank = actor.statuses.has("hateTop") ? "top" : (actor.statuses.has("hateUnder") ? "under" : null);
  const badCount = getStatusPanel(actor).find(g => g.id === "bad")?.statuses.filter(s => s.active).length ?? 0;

  const panels = PANELS.filter(p => (p.id !== "kuden") || kuden).map(p => ({
    ...p, label: L(`Hud.Panel.${p.id}`), active: p.id === panel,
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
    fate: character ? {
      value: fate, max: fateMax,
      pips: Array.from({ length: Math.clamp(Math.max(fateMax, fate), 0, 10) }, (_, i) => i < fate),
      tooltip: L("Hud.FateTip", { value: fate, max: fateMax })
    } : null,
    hate: character ? { value: hate, rank, tooltip: [L("Hud.HateTip", { value: hate }), rank ? game.i18n.localize(`ETERNIA.StatusEffect.${rank === "top" ? "hateTop" : "hateUnder"}`) : ""].filter(Boolean).join(" · ") } : null,
    fatigue: character ? toInt(source.infos?.fatigue) : 0,
    combat: combatBlock(actor, token),
    dodge: dodgeOf(actor),
    panels,
    pins: pinButtons(actor, pins),
    panel: null
  };

  if (panel && !collapsed) {
    const build = { checks: checksPanel, skills: skillsPanel, kuden: kudenPanel, items: itemsPanel, effects: effectsPanel }[panel];
    context.panel = { id: panel, label: L(`Hud.Panel.${panel}`), hint: L(`Hud.Hint.${panel}`), [panel]: build(actor, pins, kuden) };
  }
  return context;
}
