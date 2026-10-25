/**
 * The recharge of a monster's skill (a breath, a spit of light): `flags.eternia.monster = { rule: "recharge", min }`.
 * Once used it is spent (`flags.eternia.recharging` on the monster, a list of skill ids) until a 1d6 of a Setup Process
 * gives `min` or more (5 by default), rolled by bestiary/rules.mjs. Read by automation/use.mjs, which warns (or blocks)
 * a spent skill like any other limit.
 */
import { SYSTEM_ID } from "../settings.mjs";

/** The flag of the monster with its spent skills. */
export const RECHARGING = "recharging";

/** Whether a skill recharges at all. */
export const recharges = item => item?.getFlag?.(SYSTEM_ID, "monster")?.rule === "recharge";

/** Whether a skill that recharges is spent now. */
export function isRecharging(item) {
  if (!recharges(item)) return false;
  return (item.actor?.getFlag(SYSTEM_ID, RECHARGING) ?? []).includes(item.id);
}
