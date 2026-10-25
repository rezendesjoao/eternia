/**
 * The surprise blow (a monster rule, docs/bestiario.md): a skill with `flags.eternia.monster = { rule: "surprise", dice }`
 * adds +dice d6 to its owner's Damage Rolls against whoever hasn't acted yet this round: in a started combat, a
 * combatant whose Main Process hasn't come (not Post-Action, not acting now). Every target the roll is made against must
 * be one (the ambusher hits one at a time); none, no bonus. Read by helpers/skill-rolls.mjs (rollSkill), and listed with
 * the card's bonuses.
 */
import { SYSTEM_ID } from "../settings.mjs";
import { combatOf, combatantOf, toInt } from "../helpers/utils.mjs";

/** Whether an actor hasn't acted yet in this round of its combat (false out of a started combat). */
export function notActed(actor) {
  const combat = combatOf(actor);
  const combatant = combat ? combatantOf(combat, actor) : null;
  if (!combatant) return false;
  return !combat.isPostAction(combatant) && (combat.progress?.active !== combatant.id);
}

/**
 * The roll bonuses of an actor's surprise against these targets, as rollSkill counts them.
 * @param {Actor|null} actor     The roller
 * @param {Item} item            The skill rolled
 * @param {"check"|"damage"} which
 * @param {Actor[]} targets      Those the roll is made against
 * @returns {{label: string, dice: number, mod: number}[]}
 */
export function surpriseBonuses(actor, item, which, targets) {
  if ((which !== "damage") || item?.system?.damage?.recovery || !targets?.length) return [];
  const rules = [...(actor?.items ?? [])].filter(i => (i.type === "skill") && (i.getFlag(SYSTEM_ID, "monster")?.rule === "surprise"));
  if (!rules.length || !targets.every(notActed)) return [];
  return rules.map(i => ({ label: i.name, dice: Math.max(1, toInt(i.getFlag(SYSTEM_ID, "monster").dice) || 2), mod: 0 }));
}
