/**
 * Foresight (the Magia Impecável): five seconds of the future.
 * - A Trait with `foresight`: an attack on its bearer that aims at it alone (no area, no line, no several targets)
 *   misses, with or without a Hit Check (helpers/combat-cards.mjs createAttackCard: the target's result is a dodge
 *   seen coming), unless the attacker also sees the future.
 * - A Taboo's `eternia.passive.areaDodge` (dice): the future of a whole area doesn't fit in five seconds, so that many
 *   dice in the Dodge Checks against an area, a line or several targets (conditions/rolls.mjs).
 */
import { L, SYSTEM_ID } from "../settings.mjs";
import { toInt } from "../helpers/utils.mjs";
import { evaluateFormula, formulaData, isFormula } from "../helpers/effect-formulas.mjs";
import { rulesOn } from "./rules.mjs";
import { isAreaAttack } from "./damage.mjs";

/** Whether an actor sees the future: an active Trait with `foresight`. */
export const foresees = actor => [...(actor?.allApplicableEffects?.() ?? [])].some(e => e.active && e.getFlag(SYSTEM_ID, "trait")?.foresight);

/**
 * Whether an attack against this target is seen coming: then it misses.
 * @param {Actor} target
 * @param {Item} item
 * @param {Actor|null} attacker
 */
export function foreseen(target, item, attacker) {
  if (!rulesOn() || !target || !foresees(target) || isAreaAttack(item)) return false;
  return !foresees(attacker);
}

/** The dodge a foreseen attack meets, as the attack card shows it. */
export const foreseenDodge = () => ({ total: 0, critical: true, fumble: false, formula: "—", results: "", conditions: L("Foresight.Dodged") });

/**
 * The dice of a Taboo against areas (`eternia.passive.areaDodge`) in a Dodge Check: { dice, name } or null.
 * @param {Actor} actor
 */
export function areaDodge(actor) {
  const bonuses = (actor?.passiveBonuses ?? []).filter(b => b.key === "eternia.passive.areaDodge");
  if (!bonuses.length || !rulesOn()) return null;
  const dice = bonuses.reduce((total, b) => total
    + ((isFormula(b.value) ? evaluateFormula(b.value, formulaData(actor, b.effect.sourceItem)) : toInt(b.value)) || 0), 0);
  return dice ? { dice, name: bonuses[0].effect.name } : null;
}
