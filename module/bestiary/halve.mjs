/**
 * Damage taken by half (the Gargoyle's stone hide, docs/bestiario.md): an active effect with `flags.eternia.halve =
 * { tags: ["Physical"], pure: true }` halves the damage of a card with one of those tags (the card's own and the one of
 * its damage type: [Physical], [Magic]), after the Defense and [Cancel], as [Petrified] does. With `pure`, only a card
 * without magic in it: none of the element tags ([Flame], [Shock], [Radiance]…) nor [Magic Attack] or [Spell]. The
 * damage card asks `halvedBy` (helpers/combat-cards.mjs) and writes "÷ 2" with the effect's name.
 */
import { SYSTEM_ID } from "../settings.mjs";
import { findTag, tagKey } from "../helpers/tag-catalog.mjs";

const ELEMENT = "ETERNIA.TagGroup.Element";
const MAGIC = ["magic attack", "spell"];

/**
 * The effect that halves a card's damage on this actor, by its name, or null.
 * @param {Actor} actor
 * @param {string[]} tags   The card's tags, with those of its damage type
 * @returns {string|null}
 */
export function halvedBy(actor, tags) {
  const keys = (tags ?? []).map(tagKey);
  const magic = keys.some(k => MAGIC.includes(k) || (findTag(k)?.group === ELEMENT));
  for (const effect of actor?.allApplicableEffects?.() ?? []) {
    const halve = effect.active ? effect.getFlag(SYSTEM_ID, "halve") : null;
    if (!halve || (halve.pure && magic)) continue;
    if ((halve.tags ?? []).some(t => keys.includes(tagKey(t)))) return effect.name;
  }
  return null;
}
