/**
 * Magic Power from the equipment (AS REGRAS, VI. REFERÊNCIA): one source only, the main weapon's (a Staff) or the best
 * Magic Stone's, whichever is higher. The other accessories that give Magic Power (gloves like the Sigil Guard) add to
 * it. Used by the character sheet (EterniaActor#_computeBattleStatuses) and the creation wizard's shop
 * (apps/starting-gear.mjs gearNumbers), so the two always show the same number.
 */
import { tagKey } from "./tag-catalog.mjs";

/** Accessory tags that are a Magic Power source of their own: they don't add to a weapon's nor to each other. */
const SOURCE_TAGS = new Set(["Magic Stone", "Magic Ring"].map(tagKey));

/** Whether an accessory with these tags is a Magic Stone. */
export const isMagicStone = tags => (tags ?? []).some(t => SOURCE_TAGS.has(tagKey(t)));

/**
 * @param {number} weaponMagic   the main weapon's Magic
 * @param {{magic: number, tags: string[]}[]} accessories  the accessories that count (the equippable limit already applied)
 * @returns {number}
 */
export function equipmentMagic(weaponMagic, accessories) {
  let stone = 0;
  let other = 0;
  for (const accessory of accessories) {
    const magic = Number(accessory.magic) || 0;
    if (isMagicStone(accessory.tags)) stone = Math.max(stone, magic);
    else other += magic;
  }
  return Math.max(Number(weaponMagic) || 0, stone) + other;
}
