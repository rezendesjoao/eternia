/**
 * The troop (a monster rule, bestiary/rules.mjs): a monster whose skill carries `flags.eternia.monster = { rule:
 * "troop", size }` is a band in one token (the Raiding Troop: four goblins). An attack that reaches more than one
 * target hits all of it: the damage doubles (helpers/combat-cards.mjs). At 2/3 and at 1/3 of its HP it loses one of
 * the band (`flags.eternia.troopLeft`, kept by bestiary/rules.mjs; healing doesn't bring them back), and its own attacks
 * on an area reach one target less (automation/use.mjs warns, like a limit).
 */
import { SYSTEM_ID } from "../settings.mjs";
import { toInt } from "../helpers/utils.mjs";
import { isAreaAttack } from "../conditions/damage.mjs";

/** An actor's troop rule: its skill and how many the band starts with, or null. */
export function troopOf(actor) {
  const item = (actor?.items ?? []).find(i => (i.type === "skill") && (i.getFlag(SYSTEM_ID, "monster")?.rule === "troop"));
  return item ? { item, size: Math.max(2, toInt(item.getFlag(SYSTEM_ID, "monster").size) || 4) } : null;
}

/** How many of the band its HP leave standing now: all above 2/3, one less above 1/3, two less below. */
export function troopByHp(actor) {
  const troop = troopOf(actor);
  if (!troop) return 0;
  const hp = Math.max(0, toInt(actor.system.health?.value));
  const max = Math.max(1, toInt(actor.system.health?.max));
  const lost = ((hp * 3) <= max) ? 2 : (((hp * 3) <= (max * 2)) ? 1 : 0);
  return troop.size - lost;
}

/** How many of the band are left (the lost ones stay lost). */
export function troopLeft(actor) {
  const troop = troopOf(actor);
  if (!troop) return 0;
  const kept = toInt(actor.getFlag(SYSTEM_ID, "troopLeft"));
  return kept ? Math.min(kept, troop.size) : troop.size;
}

/** Whether a damage card hits a troop in full: an attack that reaches more than one target. */
export function troopDoubles(actor, card) {
  if (!troopOf(actor) || card?.recovery) return false;
  return isAreaAttack(card?.itemUuid ? fromUuidSync(card.itemUuid) : null);
}

/** How many targets a troop's attack on an area may reach now (one for each of the band left), or null. */
export function troopTargets(item) {
  const actor = item?.actor;
  if (!troopOf(actor) || !isAreaAttack(item)) return null;
  return troopLeft(actor);
}
