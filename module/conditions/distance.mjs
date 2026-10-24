/**
 * Keeping the distance: a Magia's Taboo that needs code (the Invasão's Distance).
 * - `flags.eternia.noEngaged: "<magia>"` on an active effect (a Taboo, in combat): the spells of that Magia don't target a
 *   creature engaged with the user (in the same square). Read by conditions/actions.mjs when a skill is used, as the
 *   other limits of the conditions ("conditionLimits").
 * - The passive key `eternia.passive.closeDodge` (dice, −1): added to the bearer's Dodge Checks against Close attacks.
 *   Read by conditions/rolls.mjs.
 */
import { L, SYSTEM_ID } from "../settings.mjs";
import { evaluateFormula, formulaData, isFormula } from "../helpers/effect-formulas.mjs";
import { itemMagia } from "../helpers/magic-traits.mjs";
import { actorName, toInt } from "../helpers/utils.mjs";

/** Distance in squares between two tokens (Manhattan, as the attack cards count it), null off a square grid. */
function squares(a, b) {
  if (!a || !b || !canvas.ready || (canvas.grid.type !== CONST.GRID_TYPES.SQUARE)) return null;
  const p = canvas.grid.getOffset(a.center);
  const q = canvas.grid.getOffset(b.center);
  return Math.abs(p.i - q.i) + Math.abs(p.j - q.j);
}

const tokenOf = actor => (canvas.ready ? (canvas.tokens.controlled.find(t => t.actor === actor) ?? actor?.getActiveTokens(true)[0] ?? null) : null);

/**
 * What keeps a skill from targeting the creatures engaged with its user: an active effect of the user with `noEngaged`
 * for the skill's Magia.
 * @param {Item} item
 * @param {Actor} actor
 * @param {Token[]} targets
 * @returns {string[]}   The issues
 */
export function engagedIssues(item, actor, targets) {
  const magia = itemMagia(item);
  if (!magia || !targets?.length) return [];
  const rule = [...(actor?.allApplicableEffects?.() ?? [])].find(e => e.active && (e.getFlag(SYSTEM_ID, "noEngaged") === magia));
  if (!rule) return [];
  const origin = tokenOf(actor);
  const engaged = targets.filter(t => (t.actor !== actor) && (squares(origin, t) === 0));
  if (!engaged.length) return [];
  return [L("Conditions.Use.Engaged", { name: actorName(actor), rule: rule.name, targets: engaged.map(t => t.name).join(", ") })];
}

/**
 * The dice the passive effects of an actor add to its Dodge Checks against Close attacks (the Distance: −1), with the
 * name of the first of them, or null.
 * @param {Actor} actor
 * @returns {{dice: number, name: string}|null}
 */
export function closeDodge(actor) {
  const list = (actor?.passiveBonuses ?? []).filter(b => b.key === "eternia.passive.closeDodge");
  const dice = list.reduce((sum, b) => sum + (isFormula(b.value) ? (evaluateFormula(b.value, formulaData(actor, b.effect.sourceItem)) ?? 0) : toInt(b.value)), 0);
  return dice ? { dice, name: list[0].effect.name } : null;
}
