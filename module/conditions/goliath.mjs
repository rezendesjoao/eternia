/**
 * The Giant (the Magia Golias).
 * - [Goliath] (`goliath`, its Rating the threshold): a blow whose damage, after the Defense and [Cancel], is below the
 *   Rating does nothing, not even its statuses (helpers/combat-cards.mjs applyDamage); one at the Rating or above
 *   passes whole. Its bearer isn't moved by force (a pull, a push, a switch: conditions/effects.mjs) and its physical
 *   attacks deal +CR (conditions/rolls.mjs).
 * - An effect with `unmovable` does the same for the forced moves without the status.
 * - An effect with `barrierEachRound` (a formula): in every Setup Process its bearer's [Barrier] comes back up to that
 *   much (conditions/turns.mjs).
 */
import { L, SYSTEM_ID } from "../settings.mjs";
import { actorName, toInt } from "../helpers/utils.mjs";
import { evaluateFormula, formulaData, isFormula } from "../helpers/effect-formulas.mjs";
import { has, rating, rulesOn } from "./rules.mjs";

/** The threshold of a blow on this actor (0 without [Goliath]). */
export const thresholdOf = actor => (rulesOn() ? rating(actor, "goliath") : 0);

/** Whether an actor can't be moved by force. */
export function unmovable(actor) {
  if (!rulesOn() || !actor) return false;
  if (has(actor, "goliath")) return true;
  return [...(actor.allApplicableEffects?.() ?? [])].some(e => e.active && e.getFlag(SYSTEM_ID, "unmovable"));
}

/** The line of a forced move that didn't happen. */
export const unmovedLine = actor => L("Goliath.Unmoved", { name: actorName(actor) });

/**
 * The [Barrier] that comes back in the Setup Process (called by conditions/turns.mjs): the line, or null.
 * @param {Actor} actor
 * @returns {Promise<string|null>}
 */
export async function refreshBarrier(actor) {
  if (!rulesOn()) return null;
  let best = 0;
  let name = "";
  for (const effect of actor.allApplicableEffects?.() ?? []) {
    const value = effect.active ? effect.getFlag(SYSTEM_ID, "barrierEachRound") : null;
    if (!value) continue;
    const n = (isFormula(value) ? evaluateFormula(value, formulaData(actor, effect.sourceItem ?? null)) : toInt(value)) || 0;
    if (n > best) [best, name] = [n, effect.name];
  }
  const current = toInt(actor.system["bad-status"]?.barrier);
  if (best <= current) return null;
  await actor.update({ "system.bad-status.barrier": best });
  return L("Goliath.Barrier", { name: actorName(actor), effect: name, n: best });
}
