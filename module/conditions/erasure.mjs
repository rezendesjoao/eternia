/**
 * [Erased] (`erased`, the Magia Olhar que Apaga): the bearer's magic is gone while the eyes are on it.
 * - No spell at all: a spell of a Magia (`flags.eternia.magicSpell`), a [Spell], [Magic Attack] or [Song], and the
 *   [Curse] too, which [Silenced] lets by (conditions/actions.mjs). A monster's spells and Curses the same.
 * - The Traits of its Magias don't work: the effects with `flags.eternia.trait` are suppressed while it has the status
 *   (documents/eterniaActiveEffect.mjs determineSuppression).
 * - It ends in the Cleanup Process (END_OF_ROUND); the gaze gives it again in every Setup Process.
 * The gaze is a Realm (conditions/realm.mjs) on the effect of [Gaze] (`gaze`): every creature within its radius,
 * enemies and allies, is [Erased], but not the eyes' owner (`realm.notSelf`). The blindfold is the Magia's own passive
 * [Blinded], suppressed while [Gaze] is on (the condition `notStatus: gaze`). An effect with `cleanupFatigue` (the
 * eyes drying) gives that much [Fatigue] in every Cleanup Process (conditions/turns.mjs).
 */
import { findTag } from "../helpers/tag-catalog.mjs";
import { has, rulesOn } from "./rules.mjs";

/** The tags of the skills an [Erased] can't use (the Curse included: the eyes erase the demons' power too). */
const ERASED_TAGS = ["magic attack", "spell", "song", "curse"];

const tagKeys = item => (item?.system?.tags ?? []).map(t => (findTag(t)?.label ?? String(t)).trim().toLowerCase());

/**
 * Whether a skill is magic the eyes erase: a spell of a Magia, or one with the tags of a spell or a Curse. A skill
 * with `flags.eternia.notMagic` is not magic, even in a Magia (the Página em Branco's techniques, the Quintessência of
 * A Escrita): nothing erases it.
 */
export function erasable(item) {
  if (!item) return false;
  if (item.flags?.eternia?.notMagic) return false;
  if (item.flags?.eternia?.magicSpell) return true;
  return tagKeys(item).some(t => ERASED_TAGS.includes(t));
}

/** Whether an actor's magic is erased now. */
export const isErased = actor => rulesOn() && has(actor, "erased");

/**
 * Whether an effect is a Magia's Trait that an [Erased] loses: called while the actor is prepared, with the statuses
 * gathered so far (documents/actor.mjs _prepareEffects).
 * @param {ActiveEffect} effect
 * @param {Set<string>} statuses
 */
export function traitErased(effect, statuses) {
  return !!effect?.flags?.eternia?.trait && !!statuses?.has("erased") && rulesOn();
}
