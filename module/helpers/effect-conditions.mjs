/**
 * Conditions under which effects apply ("This skill only produces an effect when…", "(SR2): …").
 *
 * A condition is `{ type, value }` (value: a number or a tag, depending on the type). They live in:
 *   - `system.conditions` of a skill: every effect of the skill (the Styles' equipment requirements);
 *   - `flags.eternia.conditions` of an effect: that effect only (Skill Rank / Character Rank tiers).
 * All of them must be met. EterniaActiveEffect#determineSuppression checks them on the actor; when one
 * fails the effect is suppressed and lists under "Condition not met" with the reason.
 * Effects copied to a target when a skill is used are checked against the caster at that moment
 * (item-use.mjs) and lose their conditions.
 *
 * State conditions (statuses, Hate Top / Under, combat) change without the actor's own data changing:
 * registerEffectConditions re-prepares the actors that use them when a combat or a party member changes.
 */
import { EQUIP_TYPES } from "../piles/pile-config.mjs";
import { getHands, isTwoHanded } from "./hands.mjs";
import { tagKey, TAG_CATALOG } from "./tag-catalog.mjs";

/**
 * Condition types. `param`: what `value` holds ("number" | "tag" | "status"); `optional`: the tag may be
 * empty; `state`: depends on statuses / combat (see refreshStateConditions).
 */
export const CONDITION_TYPES = [
  { id: "srAtLeast", param: "number" },
  { id: "srAtMost", param: "number" },
  { id: "crAtLeast", param: "number" },
  { id: "crAtMost", param: "number" },
  { id: "equipped", param: "tag" },
  { id: "notEquipped", param: "tag" },
  { id: "handsEmpty" },
  { id: "handFree" },
  { id: "oneWeapon", param: "tag", optional: true },
  { id: "twoWeapons", param: "tag", optional: true },
  { id: "armorEmpty" },
  { id: "status", param: "status", state: true },
  { id: "notStatus", param: "status", state: true },
  { id: "hateTop", state: true },
  { id: "hateUnder", state: true },
  { id: "inCombat", state: true },
  { id: "firstRound", state: true },
  { id: "preAction", state: true },
  { id: "standby", state: true },
  { id: "hasSkill", param: "tag" },
  { id: "notSkill", param: "tag" },
  { id: "motorState", param: "tag" },
  { id: "motorAtLeast", param: "number" }
];

const STATE_TYPES = new Set(CONDITION_TYPES.filter(t => t.state).map(t => t.id));

/** State types that read only the actor's own statuses: the actor re-prepares itself when they change. */
const OWN_TYPES = new Set(["status", "notStatus"]);

/**
 * What the combat state types read of the actor's combat, as paths of an updateCombat change (combatOf: started is
 * round > 0; EterniaCombat#phase, #progress and #isPostAction). Combatants joining or leaving are the create /
 * deleteCombatant refreshes. A state type missing here and from OWN_TYPES is refreshed on every update: Hate Top /
 * Under read the combat in view (game.combat, which the tracker picks), and so will a new type until it is listed.
 */
const COMBAT_INPUTS = new Map(Object.entries({
  inCombat: ["round", "combatants"],
  firstRound: ["round", "combatants"],
  preAction: ["round", "turn", "combatants", "flags.eternia.phase", "flags.eternia.acted", "flags.eternia.active"],
  standby: ["round", "combatants", "flags.eternia.standby"]
}).map(([type, paths]) => [type, paths.map(p => p.split("."))]));

/**
 * "top" / "under" for a character: its [Hate Top] / [Hate Under] status, or else the Hate of the characters
 * fighting in the current combat (out of it: those Incapacitated / Dead). null for monsters or outside combat.
 * @param {Actor} actor
 * @param {Set<string>} [statuses]   The actor's statuses (while it is being prepared, see actor.mjs)
 * @returns {"top"|"under"|null}
 */
export function hateRank(actor, statuses = actor?.statuses) {
  if (actor?.type !== "character") return null;
  if (statuses?.has("hateTop")) return "top";
  if (statuses?.has("hateUnder")) return "under";
  const out = a => {
    const set = (a.uuid === actor.uuid) ? (statuses ?? new Set()) : a.statuses;
    return set.has("incapacitated") || set.has("dead");
  };
  const party = (game.combat?.combatants ?? [])
    .map(c => c.actor)
    .filter(a => (a?.type === "character") && !out(a));
  if (!party.some(a => a.uuid === actor.uuid)) return null;
  const hate = a => Math.trunc(Number(a.system.infos?.hate) || 0);
  const top = Math.max(...party.map(hate));
  return hate(actor) >= top ? "top" : "under";
}

/** The started combat the actor fights in, and its combatant. */
function combatOf(actor) {
  if (!actor || !globalThis.game?.combats) return {};
  for (const combat of game.combats) {
    if (!combat.started) continue;
    const combatant = combat.getCombatantsByActor(actor)[0];
    if (combatant) return { combat, combatant };
  }
  return {};
}

const ONE_HANDED = tagKey("One-Handed");

/** Whether an item has a tag. Weapons without a hand tag count as [One-Handed] (see hands.mjs). */
function hasTag(item, tag) {
  const key = tagKey(tag);
  if (!key) return true;
  if ((key === ONE_HANDED) && (item.type === "weapon")) return !isTwoHanded(item);
  return (item.system.tags ?? []).some(t => tagKey(t) === key);
}

const number = value => Number(value) || 0;
const weaponsInHands = ({ main, off }) => [main, off].filter(i => i?.type === "weapon");

const TESTS = {
  srAtLeast: (c, ctx) => ctx.sr >= number(c.value),
  srAtMost: (c, ctx) => ctx.sr <= number(c.value),
  crAtLeast: (c, ctx) => ctx.cr >= number(c.value),
  crAtMost: (c, ctx) => ctx.cr <= number(c.value),
  equipped: (c, ctx) => ctx.equipped().some(i => hasTag(i, c.value)),
  notEquipped: (c, ctx) => !ctx.equipped().some(i => hasTag(i, c.value)),
  handsEmpty: (c, ctx) => !ctx.hands().main && !ctx.hands().off,
  handFree: (c, ctx) => {
    const { main, off, locked } = ctx.hands();
    return !locked && !(main && off);
  },
  oneWeapon: (c, ctx) => {
    const weapons = weaponsInHands(ctx.hands());
    return (weapons.length === 1) && hasTag(weapons[0], c.value);
  },
  twoWeapons: (c, ctx) => {
    const weapons = weaponsInHands(ctx.hands());
    return (weapons.length === 2) && weapons.every(w => hasTag(w, c.value));
  },
  armorEmpty: (c, ctx) => !ctx.equipped().some(i => i.type === "armor"),
  status: (c, ctx) => ctx.statuses().has(c.value),
  notStatus: (c, ctx) => !ctx.statuses().has(c.value),
  hateTop: (c, ctx) => ctx.hate() === "top",
  hateUnder: (c, ctx) => ctx.hate() === "under",
  inCombat: (c, ctx) => !!ctx.combat().combatant,
  firstRound: (c, ctx) => ctx.combat().combat?.round === 1,
  // Hasn't taken its Main Process yet this round
  preAction: (c, ctx) => {
    const { combat, combatant } = ctx.combat();
    return !!combatant && !combat.isPostAction?.(combatant) && (combat.progress?.active !== combatant.id);
  },
  // Declared Standby this round
  standby: (c, ctx) => {
    const { combat, combatant } = ctx.combat();
    return ctx.statuses().has("standby") || (!!combatant && !!combat.progress?.standby.includes(combatant.id));
  },
  // Has a skill of this name ("the element of your Spirit Pact")
  hasSkill: (c, ctx) => ctx.skills().has(String(c.value ?? "").trim().toLowerCase()),
  // Doesn't have it (the Sculpted Shield's own effect, left out on the Landscape Path that turns it into a wall)
  notSkill: (c, ctx) => !ctx.skills().has(String(c.value ?? "").trim().toLowerCase()),
  // A class Motor of the actor is in this state (a Druid's form, a Minstrel's song: classes/motor.mjs)
  motorState: (c, ctx) => ctx.motors().some(m => m.state === String(c.value ?? "").trim()),
  // The Motor of the skill giving the effect (else the actor's first one) has at least this many points
  motorAtLeast: (c, ctx) => (Number(ctx.motor()?.value) || 0) >= number(c.value)
};

/**
 * The stored states of an actor's class Motors, through the system API (classes/motor.mjs is not imported here:
 * this module also loads in Node). The Motor of a class skill is its flags.eternia.motor.id, else the class in its
 * identifier ("druida-forma-do-urso" → "druida").
 */
function motorStates(actor, item) {
  const api = globalThis.game?.eternia?.motor;
  if (!api || !actor) return { all: [], own: null };
  const all = (api.of(actor) ?? []).map(m => ({ id: m.def.id, ...api.get(actor, m.def.id) }));
  const flags = item?.flags?.eternia ?? {};
  const id = flags.motor?.id ?? String(flags.identifier ?? "").split("-")[0];
  return { all, own: all.find(m => m.id === id) ?? all[0] ?? null };
}

/**
 * The first condition that is not met, or null when all are (or there are none).
 * @param {object[]} conditions
 * @param {Actor|null} actor
 * @param {Item|null} item       The item giving the effect (its Skill Rank)
 * @returns {object|null}
 */
export function unmetCondition(conditions, actor, item) {
  if (!conditions?.length) return null;
  // @sr and @cr as formulaData (effect-formulas.mjs) reads them: the conditions need nothing else of it
  const sr = Number(item?.system?.skillRank?.value) || 0;
  const system = actor?.system;
  const cr = system ? (Number(actor.type === "monster" ? system.rank : system.infos?.crank) || 0) : 0;
  let equipped, hands, fight, motors, skills;
  // While the actor is prepared, its statuses are those gathered before (see actor.mjs applyActiveEffects).
  const statuses = () => actor?._lhStatuses ?? actor?.statuses ?? new Set();
  const ctx = {
    sr, cr, statuses,
    equipped: () => equipped ??= (actor?.items.filter(i => EQUIP_TYPES.includes(i.type) && (i.system.equipped === true)) ?? []),
    hands: () => hands ??= getHands(actor),
    hate: () => hateRank(actor, statuses()),
    combat: () => fight ??= combatOf(actor),
    skills: () => skills ??= new Set((actor?.items ?? []).filter(i => i.type === "skill").map(i => i.name.trim().toLowerCase())),
    motors: () => (motors ??= motorStates(actor, item)).all,
    motor: () => (motors ??= motorStates(actor, item)).own
  };
  return conditions.find(c => TESTS[c?.type] && !TESTS[c.type](c, ctx)) ?? null;
}

/** No conditions (most effects): one shared, frozen list. */
const NO_CONDITIONS = Object.freeze([]);

/** Conditions of an effect, plus those of the skill giving it. */
export function effectConditions(effect, item) {
  const own = effect.flags?.eternia?.conditions ?? NO_CONDITIONS;
  const fromItem = item?.system?.conditions ?? NO_CONDITIONS;
  if (Array.isArray(own) && Array.isArray(fromItem) && !own.length && !fromItem.length) return NO_CONDITIONS;
  return [...(Array.isArray(fromItem) ? fromItem : Object.values(fromItem)), ...(Array.isArray(own) ? own : Object.values(own))];
}

/** Whether any of the conditions depends on statuses or combat. */
export function hasStateCondition(conditions) {
  return conditions.some(c => STATE_TYPES.has(c?.type));
}

/**
 * Keep on the actor the state condition types its effects use (EterniaActiveEffect#determineSuppression, while the
 * actor is prepared): refreshStateConditions re-prepares only the actors whose types may have changed.
 * @param {Actor|null} actor
 * @param {object[]} conditions
 */
export function noteStateTypes(actor, conditions) {
  if (actor?._lhStateTypes) addStateTypes(actor._lhStateTypes, conditions);
}

/** Add the state condition types among the conditions to a set. */
function addStateTypes(types, conditions) {
  for (const c of conditions) if (STATE_TYPES.has(c?.type)) types.add(c.type);
}

/** Readable condition: "SR ≥ 2", "Not equipped with [Shield]", "While [Hidden]". */
export function conditionLabel(condition) {
  const type = CONDITION_TYPES.find(t => t.id === condition?.type);
  if (!type) return "";
  let value;
  if (type.param === "tag") value = String(condition.value ?? "").replace(/[\[\]]/g, "").trim();
  else if (type.param === "status") value = condition.value ? game.i18n.localize(`ETERNIA.StatusEffect.${condition.value}`) : "?";
  else value = number(condition.value);
  const key = (type.optional && !value) ? `ETERNIA.Condition.Summary.${type.id}Any` : `ETERNIA.Condition.Summary.${type.id}`;
  return game.i18n.format(key, { value });
}

/** Options of the condition type dropdown. */
export function conditionTypeOptions() {
  return Object.fromEntries(CONDITION_TYPES.map(t => [t.id, game.i18n.localize(`ETERNIA.Condition.Type.${t.id}`)]));
}

/**
 * Conditions for the editor partial (templates/effects/lh-conditions.hbs).
 * @param {object[]} conditions
 * @returns {object[]}
 */
export function prepareConditionRows(conditions) {
  const list = Array.isArray(conditions) ? conditions : Object.values(conditions ?? {});
  return list.map((c, index) => {
    const type = CONDITION_TYPES.find(t => t.id === c?.type) ?? CONDITION_TYPES[0];
    return {
      index, type: type.id, value: c?.value ?? "", param: type.param ?? "",
      number: type.param === "number", tag: type.param === "tag", status: type.param === "status"
    };
  });
}

/**
 * Context of the conditions editor (templates/effects/effect-conditions.hbs).
 * @param {object[]} conditions
 * @param {object} options
 * @param {string} options.prefix     Form name of the list ("system.conditions", "flags.eternia.conditions")
 * @param {string} options.hint       Localization key of the hint
 * @param {boolean} options.editable
 * @returns {object}
 */
export function conditionsContext(conditions, { prefix, hint, editable }) {
  const catalog = globalThis.CONFIG?.ETERNIA?.tags ?? TAG_CATALOG;
  return {
    rows: prepareConditionRows(conditions),
    prefix,
    hint: game.i18n.localize(hint),
    editable,
    types: conditionTypeOptions(),
    // The system's statuses (statuses.mjs registers them as CONFIG.statusEffects; not imported here so
    // that this module, used by effect-targets.mjs, still loads in Node)
    statuses: Object.fromEntries(CONFIG.statusEffects.map(s => [s.id, game.i18n.localize(`ETERNIA.StatusEffect.${s.id}`)])),
    tags: catalog.filter(t => t.group === "ETERNIA.TagGroup.Equipment").map(t => t.label)
  };
}

/**
 * Turn form data `{0: {...}, 1: {...}}` back into an array of conditions.
 * @param {object|object[]} data
 * @returns {object[]}
 */
export function conditionsFromForm(data) {
  const list = Array.isArray(data) ? data : Object.keys(data ?? {}).sort((a, b) => a - b).map(k => data[k]);
  return list.filter(c => c?.type).map(c => {
    const type = CONDITION_TYPES.find(t => t.id === c.type);
    if (!type?.param) return { type: c.type };
    return { type: c.type, value: type.param === "number" ? number(c.value) : String(c.value ?? "").trim() };
  });
}

/** The state condition types an actor's effects use (noted while it was prepared, else looked up). */
function stateTypesOf(actor) {
  if (actor._lhStateTypes) return actor._lhStateTypes;
  const types = new Set();
  for (const effect of actor.allApplicableEffects()) addStateTypes(types, effectConditions(effect, effect.sourceItem));
  return types;
}

/** Whether a change of a document changed this path (split in keys), or deleted or replaced one of its parents. */
function touches(changed, keys) {
  let value = changed;
  for (const key of keys) {
    if (!foundry.utils.isPlainObject(value)) return true;
    if (!(key in value)) return false;
    value = value[key];
  }
  return true;
}

// Which state types a refresh must re-prepare (see OWN_TYPES and COMBAT_INPUTS)
const anyType = () => true;
const notOwn = type => !OWN_TYPES.has(type);
const readsOthers = type => !OWN_TYPES.has(type) && !COMBAT_INPUTS.has(type);
const combatChanged = changed => type => !OWN_TYPES.has(type)
  && (!COMBAT_INPUTS.has(type) || COMBAT_INPUTS.get(type).some(keys => touches(changed, keys)));

/** Whether an effect of the actor or of its items has a core duration (its remaining time follows the combat). */
function hasTimedEffects(actor) {
  const timed = effect => Number.isFinite(effect.duration?.value);
  return actor.effects.some(timed) || actor.items.some(item => item.effects.some(timed));
}

/** What the sheets show of the actor's effects that a re-preparation may change: whether each applies, and why not. */
function conditionalState(actor) {
  let state = "";
  for (const effect of actor.allApplicableEffects()) {
    const unmet = effect.unmetCondition;
    state += `${effect.id}:${effect.active ? 1 : 0}${effect._lhSuppressed ? 1 : 0}:${unmet ? `${unmet.type}=${unmet.value}` : ""};`;
  }
  return state;
}

/** Actors whose open sheets re-render on the next frame: one render for every reset of that frame. */
const pendingRenders = new Set();

function renderNextFrame(actor) {
  if (!pendingRenders.size) requestAnimationFrame(renderPending);
  pendingRenders.add(actor);
}

function renderPending() {
  const actors = new Set(pendingRenders);
  pendingRenders.clear();
  for (const app of foundry.applications.instances.values()) {
    // As for a change of the actor: the character sheet draws its frame and the open tab (sheets/character-sheet.mjs)
    if (app.rendered && (actors.has(app.document) || actors.has(app.document?.parent))) app.render({ renderContext: "eternia.conditions" });
  }
}

/**
 * Re-prepare the actors whose effects have state conditions that may have changed: the combat moved on, or a party
 * member's Hate / statuses changed. Their sheets re-render (on the next frame) when that changed whether an effect
 * applies, or always when an effect has a core duration and the combat moved (its remaining time, on the sheets).
 * @param {Actor[]} actors
 * @param {(type: string) => boolean} needs   Whether a state condition type may have changed
 * @param {boolean} [combatMoved]            A combat changed (the remaining time of the core durations too)
 */
function refreshStateConditions(actors, needs, combatMoved = false) {
  for (const actor of new Set(actors)) {
    const types = actor ? stateTypesOf(actor) : null;
    if (!types?.size) continue;
    const timed = combatMoved && hasTimedEffects(actor);
    if (!timed && ![...types].some(needs)) continue;
    const before = timed ? null : conditionalState(actor);
    actor.reset();
    if (timed || (conditionalState(actor) !== before)) renderNextFrame(actor);
  }
}

const combatActors = combat => (combat?.combatants ?? []).map(c => c.actor);

/** Handlebars helpers and state-condition refreshes. Call during the `init` hook. */
export function registerEffectConditions() {
  Handlebars.registerHelper("lhConditionLabel", conditionLabel);

  // Combat moved on (round, phase, turn, Standby…), started or ended
  Hooks.on("updateCombat", (combat, changed) => refreshStateConditions(combatActors(combat), combatChanged(changed), true));
  Hooks.on("deleteCombat", combat => refreshStateConditions(combatActors(combat), anyType, true));
  // Who joins or leaves is in combat or not; the others only rank their Hate against them
  const onCombatant = (combatant, actors) => {
    const actor = combatant.actor;
    refreshStateConditions([actor], notOwn, true);
    refreshStateConditions(actors.filter(a => a !== actor), readsOthers, true);
  };
  Hooks.on("createCombatant", combatant => onCombatant(combatant, combatActors(combatant.parent)));
  Hooks.on("deleteCombatant", combatant => onCombatant(combatant, combatActors(combatant.parent)));

  // Hate Top / Under compare the Hate of the characters in combat (and leave out the Incapacitated)
  const partyOf = actor => game.combats.filter(c => c.started && c.getCombatantsByActor(actor).length).flatMap(combatActors)
    .filter(a => a !== actor);
  Hooks.on("updateActor", (actor, changed) => {
    if (foundry.utils.hasProperty(changed, "system.infos.hate")) refreshStateConditions(partyOf(actor), readsOthers);
  });
  // The actor itself re-prepares with its own effects: the others only read its statuses for the Hate ranking
  const onStatus = effect => {
    if ((effect.parent instanceof Actor) && effect.statuses?.size) refreshStateConditions(partyOf(effect.parent), readsOthers);
  };
  Hooks.on("createActiveEffect", onStatus);
  Hooks.on("deleteActiveEffect", onStatus);
}

/**
 * Another condition type may take another kind of value: changing the type clears the row's value
 * (before the form submits it).
 * @param {HTMLElement} root
 * @param {Function} [onChange]   Called after (the effect editor submits; the item sheet already does)
 */
export function activateConditionInputs(root, onChange) {
  for (const select of root.querySelectorAll(".lh-condition-type")) {
    select.addEventListener("change", () => {
      const value = select.closest(".lh-condition-row")?.querySelector("[name$='.value']");
      if (value) value.value = "";
      onChange?.();
    });
  }
}
