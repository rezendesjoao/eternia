/**
 * What the mechanisms of the conditions ask about an actor: whether it has a status, its Rating, who gave it, and
 * the settings that turn the automation on.
 */
import { setting } from "../settings.mjs";
import { statusDefinition } from "../helpers/statuses.mjs";
import { toInt } from "../helpers/utils.mjs";

/** The automatic effects of the conditions (dice, damage, turns, stacks). */
export const rulesOn = () => setting("conditionRules") !== false;

/** What the conditions forbid (actions, targets, movement): "off", "warn" or "block". */
export function limitsMode() {
  const mode = setting("conditionLimits");
  return (mode === "off" || mode === "block") ? mode : "warn";
}

/** Whether an actor has a status. */
export const has = (actor, id) => !!actor?.statuses?.has(id);

/** The Character Rank of an actor (a monster's Rank), as the formulas read it (@cr). */
export const crOf = actor => Number((actor?.type === "monster") ? actor.system?.rank : actor?.system?.infos?.crank) || 0;

/** The status effects of an actor for one status (plain toggles and effects that carry it). */
export function statusEffects(actor, id) {
  return [...(actor?.effects ?? [])].filter(e => e.active && e.statuses?.has(id));
}

/**
 * The Rating of a status: its field when it has one, else the highest Rating of the effects that give it
 * (1 when they give none).
 * @param {Actor} actor
 * @param {string} id
 * @returns {number}
 */
export function rating(actor, id) {
  if (!has(actor, id)) return 0;
  const def = statusDefinition(id);
  if (def?.path) return toInt(foundry.utils.getProperty(actor.system, def.path));
  const values = statusEffects(actor, id).map(e => toInt(e.getFlag("eternia", "statusData")?.value));
  return Math.max(1, ...values);
}

/**
 * The characters who gave an actor a status (the casters of its effects). Statuses toggled by hand have none.
 * @param {Actor} actor
 * @param {string} id
 * @returns {Actor[]}
 */
export function sourcesOf(actor, id) {
  const sources = new Map();
  for (const effect of statusEffects(actor, id)) {
    const uuid = effect.getFlag("eternia", "source")?.casterUuid;
    const caster = uuid ? fromUuidSync(uuid) : null;
    const source = (caster instanceof TokenDocument) ? caster.actor : caster;
    if (source instanceof Actor) sources.set(source.uuid, source);
  }
  return [...sources.values()];
}

/** Whether `other` is one of the sources of a status of `actor` (the same character, token actors included). */
export const isSourceOf = (actor, id, other) => !!other && sourcesOf(actor, id).some(s => sameActor(s, other));

/** The same character: the same actor, or a token actor and its base actor. */
export function sameActor(a, b) {
  if (!a || !b) return false;
  if (a.uuid === b.uuid) return true;
  const base = actor => (actor.isToken ? (game.actors.get(actor.id) ?? actor) : actor);
  return base(a).uuid === base(b).uuid;
}

/** The skills that attack or harm: a check against Evasion / Resistance, or damage that isn't healing. */
export function isHostile(item) {
  const check = item?.system?.check ?? {};
  const damage = item?.system?.damage ?? {};
  if (["evasion", "resistance"].includes(check.vs)) return true;
  const hasDamage = !!(damage.dice || damage.mod || damage.formula || damage.diceFormula || damage.type);
  return hasDamage && !damage.recovery;
}

/**
 * Remove statuses from an actor: their fields cleared (the sync removes the effects), the rest toggled off.
 * @param {Actor} actor
 * @param {string[]} ids
 * @param {object} [options]   Options of the actor update (`eterniaNoFatigue`: no [Fatigue] when [Awakened] or
 *                             [Impetus] end)
 */
export async function removeStatuses(actor, ids, options = {}) {
  const updates = {};
  const toggles = [];
  for (const id of ids) {
    if (!has(actor, id)) continue;
    const def = statusDefinition(id);
    if (def?.path) updates[`system.${def.path}`] = def.list ? [] : (def.rated ? 0 : false);
    else toggles.push(id);
  }
  if (!foundry.utils.isEmpty(updates)) await actor.update(updates, options);
  for (const id of toggles) {
    const ids = statusEffects(actor, id).map(e => e.id);
    if (ids.length) await deleteEffects(actor, ids);
  }
}

/** Delete effects that another client or hook (the end of the scene…) may be deleting at the same time. */
async function deleteEffects(actor, ids) {
  try {
    await actor.deleteEmbeddedDocuments("ActiveEffect", ids);
  }
  catch (err) {
    const left = ids.filter(id => actor.effects.has(id));
    if (left.length && (left.length < ids.length)) await actor.deleteEmbeddedDocuments("ActiveEffect", left);
    else if (!/does not exist/i.test(err?.message ?? "")) throw err;
  }
}

/**
 * Give an actor a status (a Rating raises its field, or adds to it with `stack`; plain statuses are toggled on). A
 * count (`tally`) that isn't on starts from 0.
 */
export async function addStatus(actor, id, value = null) {
  const def = statusDefinition(id);
  if (def?.path && def.rated && value) {
    const current = (def.tally && !has(actor, id)) ? 0 : toInt(foundry.utils.getProperty(actor._source.system, def.path));
    const next = def.stack ? Math.min(current + value, def.stack) : Math.max(current, value);
    if (next !== current) await actor.update({ [`system.${def.path}`]: next });
    return;
  }
  if (!has(actor, id)) await actor.toggleStatusEffect(id, { active: true });
}
