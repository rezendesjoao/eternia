/**
 * The pack (a monster rule, bestiary/rules.mjs): a monster whose skill carries `flags.eternia.monster = { rule: "pack",
 * per, tag }` deals +per damage for each other creature of its side (by the disposition of the tokens; with the tag,
 * if any) engaged with the target, that is, standing on one of the target's squares. The damage card carries it as a
 * `bonusVs` entry with `pack` (helpers/combat-cards.mjs), counted when the damage is applied.
 */
import { SYSTEM_ID } from "../settings.mjs";
import { toInt } from "../helpers/utils.mjs";
import { actorHasTag } from "../helpers/magic-traits.mjs";

/** The pack skills of an actor. */
const packsOf = actor => (actor?.items ?? []).filter(i => i.getFlag(SYSTEM_ID, "monster")?.rule === "pack");

/**
 * The `bonusVs` entries the attacker's pack gives a damage card.
 * @param {Actor|null} attacker
 * @returns {object[]}
 */
export function packBonuses(attacker) {
  return packsOf(attacker).map(item => {
    const rule = item.getFlag(SYSTEM_ID, "monster");
    return { pack: { per: Math.max(1, toInt(rule.per) || 1), tag: rule.tag ?? "" }, name: item.name, value: 0, statuses: [], targetTags: [] };
  });
}

/** The token of an actor on a scene: a token actor's own, else its first active one there. */
function tokenOn(actor, scene) {
  if (actor?.token) return actor.token;
  return actor?.getActiveTokens?.(false, true).find(t => !scene || (t.parent === scene)) ?? null;
}

/** The squares a token covers ("i,j"). */
function squaresOf(token) {
  const size = token.parent.grid.size;
  const out = new Set();
  for (let i = 0; i < Math.max(1, toInt(token.width)); i++) {
    for (let j = 0; j < Math.max(1, toInt(token.height)); j++) out.add(`${Math.round(token.x / size) + i},${Math.round(token.y / size) + j}`);
  }
  return out;
}

/**
 * The bonus of a pack entry against a target: per × the attacker's allies engaged with it.
 * @param {Actor} target
 * @param {object} entry          The card's `bonusVs` entry
 * @param {string} attackerUuid
 * @returns {number}
 */
export function packBonus(target, entry, attackerUuid) {
  const attacker = attackerUuid ? fromUuidSync(attackerUuid) : null;
  const own = tokenOn(attacker, canvas?.scene ?? null);
  const at = tokenOn(target, own?.parent ?? canvas?.scene ?? null);
  if (!own || !at || (own.parent !== at.parent)) return 0;
  const squares = squaresOf(at);
  let count = 0;
  for (const token of at.parent.tokens) {
    const actor = token.actor;
    if (!actor || (token === own) || (token === at) || (token.disposition !== own.disposition)) continue;
    if (actor.statuses.has("incapacitated") || actor.statuses.has("dead")) continue;
    if (entry.pack.tag && !actorHasTag(actor, entry.pack.tag)) continue;
    if ([...squaresOf(token)].some(s => squares.has(s))) count++;
  }
  return count * entry.pack.per;
}
