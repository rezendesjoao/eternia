/**
 * Greed (the Magia Cobiça): the Yuld in the bag turns into strength, and every blow eats some of it.
 *
 * - The Fortune: 1 for every five commons of the character's CR it carries (module/economy/data.mjs: the common is
 *   what a common enemy of that CR leaves), up to the CR. Formulas read it as `@fortune`, the Yuld as `@yuld`, and the
 *   Yuld the use just paid as `@yuldPaid` (kept on the skill when it is paid, before the card: the supreme that spends
 *   everything rolls with what it spent).
 * - A skill's `yuldCost` (a formula of its user, "@yuld" for all of it): paid when it is used (automation/use.mjs, the
 *   Undo gives it back); without enough Yuld it can't be used.
 * - A Trait's `goldBonus` (a fraction): the Yuld the creatures it fells leave comes that much bigger (bestiary/drops.mjs).
 * - An effect with `goldOnFall` (a fraction, the Tabu): when its bearer falls, it loses that part of its Yuld (the
 *   demon takes it; the primary GM).
 */
import { L, SYSTEM_ID } from "../settings.mjs";
import { isPrimaryGM } from "../helpers/clients.mjs";
import { actorName, postSummary, toInt } from "../helpers/utils.mjs";
import { evaluateFormula, formulaData, isFormula } from "../helpers/effect-formulas.mjs";
import { commonValue } from "../economy/data.mjs";
import { rulesOn } from "./rules.mjs";

const GOLD = "system.inventory.gold";
const FORTUNE_COMMONS = 5;

/** The Yuld an actor carries. */
export const yuldOf = actor => Math.max(0, toInt(actor?.system?.inventory?.gold));

/** The Fortune of an actor: one per five commons of its CR in the bag, up to its CR. */
export function fortuneOf(actor) {
  const cr = Math.max(1, toInt(actor?.system?.infos?.crank ?? actor?.system?.rank));
  return Math.min(cr, Math.floor(yuldOf(actor) / (FORTUNE_COMMONS * commonValue(cr))));
}

/** A skill's Yuld cost for its user (0 without one). */
export function yuldCostOf(item, actor) {
  const value = item?.getFlag?.(SYSTEM_ID, "yuldCost");
  if (!value) return 0;
  return Math.max(0, (isFormula(value) ? evaluateFormula(value, formulaData(actor, item)) : toInt(value)) || 0);
}

/**
 * Whether the user can pay a skill's Yuld cost: the issue text, or null.
 * @param {Item} item
 * @param {Actor} actor
 * @returns {string|null}
 */
export function yuldIssue(item, actor) {
  if (!rulesOn() || !item?.getFlag?.(SYSTEM_ID, "yuldCost") || (actor?.type !== "character")) return null;
  const cost = yuldCostOf(item, actor);
  const have = yuldOf(actor);
  if ((cost > have) || (have <= 0)) return L("Fortune.NoYuld", { need: Math.max(cost, 1), have });
  return null;
}

/**
 * Pay a skill's Yuld cost when it is used. Returns what was paid (for the Undo).
 * @param {Item} item
 * @param {Actor} actor
 * @returns {Promise<number>}
 */
export async function payYuldCost(item, actor) {
  if (!rulesOn() || (actor?.type !== "character") || !item?.getFlag?.(SYSTEM_ID, "yuldCost")) return 0;
  const paid = Math.min(yuldCostOf(item, actor), yuldOf(actor));
  await item.setFlag(SYSTEM_ID, "yuldPaid", paid);
  if (paid > 0) await actor.update({ [GOLD]: yuldOf(actor) - paid });
  return paid;
}

/** Undo: the Yuld a use paid comes back. */
export async function refundYuld(actor, paid) {
  if (actor?.isOwner && (paid > 0)) await actor.update({ [GOLD]: yuldOf(actor) + paid });
}

/**
 * The Yuld more a feller's Traits bring from a fall (`goldBonus`), 0 without one.
 * @param {Actor|null} feller
 * @param {number} gold   What the table gave
 */
export function greedBonus(feller, gold) {
  if (!feller || !(gold > 0) || !rulesOn()) return 0;
  const share = [...(feller.allApplicableEffects?.() ?? [])]
    .filter(e => e.active).reduce((best, e) => Math.max(best, Number(e.getFlag(SYSTEM_ID, "trait")?.goldBonus) || 0), 0);
  return Math.floor(gold * share);
}

/** A bearer of `goldOnFall` fell: the demon takes its part of the Yuld. */
async function onFall(effect) {
  if (!effect.statuses?.has("incapacitated") || !isPrimaryGM() || !rulesOn()) return;
  const actor = effect.parent;
  if (!(actor instanceof Actor) || (actor.type !== "character")) return;
  const share = [...(actor.allApplicableEffects?.() ?? [])]
    .filter(e => e.active).reduce((best, e) => Math.max(best, Number(e.getFlag(SYSTEM_ID, "goldOnFall")) || 0), 0);
  const lost = Math.floor(yuldOf(actor) * Math.min(1, share));
  if (lost <= 0) return;
  await actor.update({ [GOLD]: yuldOf(actor) - lost });
  await postSummary(L("Fortune.Title"), [L("Fortune.Lost", { name: actorName(actor), n: lost, left: yuldOf(actor) })]);
}

/** Call during the `init` hook. */
export function registerFortune() {
  Hooks.on("createActiveEffect", effect => onFall(effect).catch(err => console.error(`${SYSTEM_ID} | Greed failed`, err)));
}
