/**
 * The Quake (the Magia Fruta do Tremor), and the blows that find their own targets.
 * - A skill with `quakeGain` (n): its user's [Quake] (`quake`, a count up to 5) rises n when it is used
 *   (eternia.skillUsed). The spells add it to their damage by their `selfBonus`.
 * - A skill with `around: { radius, enemiesOnly }`: its targets are found when its check is rolled
 *   (helpers/skill-rolls.mjs rollSkill): every creature standing within `radius` squares of the user (not the user;
 *   not one [Flying]: the quake runs on the ground), the allies too, unless `enemiesOnly` (the light that judges only
 *   enemies). The user's own targets are replaced.
 * - A Trait with `seaCurse`: while its bearer is [Soaked] or [Swimming], the spells of its Magia can't be used
 *   (conditions/actions.mjs).
 * - An effect with `vulnerable` (tags): the damage of a card with one of the tags (or of its type) is doubled, after the
 *   Defense and [Cancel] (helpers/combat-cards.mjs applyDamage).
 */
import { L, SYSTEM_ID } from "../settings.mjs";
import { toInt } from "../helpers/utils.mjs";
import { tagKey } from "../helpers/tag-catalog.mjs";
import { addStatus, has, rulesOn } from "./rules.mjs";
import { sideOn } from "./blows.mjs";
import { squaresBetween } from "./passage.mjs";

/**
 * Find the targets of a skill that aims around its user: the user's targets become them. Returns how many, or null
 * when the skill doesn't aim by itself.
 * @param {Item} item
 * @returns {number|null}
 */
export function aimAround(item) {
  const around = item?.flags?.[SYSTEM_ID]?.around;
  if (!around || !canvas?.ready) return null;
  const actor = item.actor;
  const own = actor?.token?.object ?? actor?.getActiveTokens?.(true)?.[0];
  if (!own) return null;
  const radius = Math.max(0, toInt(around.radius));
  const side = sideOn(actor);
  const found = canvas.tokens.placeables.filter(t => {
    if (!t.actor || (t === own) || t.document.hidden || t.actor.statuses.has("dead")) return false;
    if (has(t.actor, "flying")) return false;
    if (around.enemiesOnly && !(side && (Math.sign(sideOn(t.actor)) === -Math.sign(side)))) return false;
    return squaresBetween(own, t) <= radius;
  });
  for (const token of [...game.user.targets]) token.setTarget(false, { releaseOthers: false, groupSelection: true });
  for (const token of found) token.setTarget(true, { releaseOthers: false, groupSelection: true });
  if (!found.length) ui.notifications.info(L("Quake.NoTargets", { skill: item.name, n: radius }));
  return found.length;
}

/** A skill that shakes the ground was used (the user's window): the [Quake] rises. */
async function onSkillUsed(item, { actor }) {
  const gain = toInt(item?.getFlag?.(SYSTEM_ID, "quakeGain"));
  if (!rulesOn() || !gain || !actor?.isOwner) return;
  await addStatus(actor, "quake", gain);
}

/**
 * Whether the sea's curse keeps an actor from a spell: the effect that curses it, or null.
 * @param {Actor} actor
 * @param {Item} item
 */
export function seaCursed(actor, item) {
  if (!rulesOn() || !(has(actor, "soaked") || has(actor, "swimming"))) return null;
  const magia = item?.flags?.[SYSTEM_ID]?.magicSpell?.id;
  if (!magia) return null;
  return [...(actor.allApplicableEffects?.() ?? [])].find(e => e.active && e.getFlag(SYSTEM_ID, "trait")?.seaCurse
    && (e.getFlag(SYSTEM_ID, "trait")?.magia === magia)) ?? null;
}

/**
 * Whether a damage card's tags make it double on an actor: the name of the effect that makes it, or null.
 * @param {Actor} actor
 * @param {string[]} tags   The card's tags with its type's
 */
export function vulnerableTo(actor, tags) {
  if (!rulesOn()) return null;
  const keys = (tags ?? []).map(t => tagKey(t));
  for (const effect of actor?.allApplicableEffects?.() ?? []) {
    const list = effect.active ? effect.getFlag(SYSTEM_ID, "vulnerable") : null;
    if (Array.isArray(list) && list.some(t => keys.includes(tagKey(t)))) return effect.name;
  }
  return null;
}

/** Call during the `init` hook. */
export function registerQuake() {
  Hooks.on("eternia.skillUsed", (item, context) => onSkillUsed(item, context)
    .catch(err => console.error(`${SYSTEM_ID} | The quake failed`, err)));
}
