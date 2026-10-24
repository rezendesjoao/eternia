/**
 * What lasts longer than its rule: the infinite effects of the Magia Infinito and the statuses a promotion renewed.
 *
 * - Infinite: the effects of a spell are infinite when a Trait of its Magia has `infinite` (the Infinito's Tempo
 *   Parado), or when the skill has `flags.eternia.infinite: true`; a skill with `infinite: false` never gives them (the
 *   Caixão do Tempo). An infinite effect carries `flags.eternia.infinite`: an Eternia duration of a process or of the round
 *   becomes the end of the scene, and its statuses don't end by their own rule (at the end of the bearer's Main Process,
 *   END_OF_OWN_PROCESS; in the Cleanup, END_OF_ROUND). A hostile one (it gives a Bad Status) ends when its bearer spends a
 *   Major Action: the Livrar-se of the action HUD (conditions/recovery.mjs).
 * - Renewed: `flags.eternia.renew: n` on the effects of a status: its next n natural ends pass by (the promotion of the
 *   Desastre, conditions/status-actions.mjs); its effects with a duration of a process or of the round get a round more.
 * The statuses that take the whole turn (NO_ACTIONS: [Paralyzed], [Asleep], [Petrified], [Nightmare]) are never held nor
 * renewed: their bearer couldn't spend the Major Action, and would lose every turn. The statuses a spell's hit gives (a
 * damage card) carry the same marks: `infinite`, and `fromSpell` for the Cancelamento Absoluto. Read by
 * conditions/turns.mjs (naturalEnd, at the end of a Main Process and in the Cleanup), helpers/item-use.mjs
 * (lastingEffectData) and helpers/combat-cards.mjs (lastingCard, lastingHitData).
 */
import { SYSTEM_ID } from "../settings.mjs";
import { statusDefinition } from "../helpers/statuses.mjs";
import { traitsFor } from "../helpers/magic-traits.mjs";
import { toInt } from "../helpers/utils.mjs";
import { END_OF_OWN_PROCESS, END_OF_ROUND, NO_ACTIONS } from "./catalog.mjs";
import { isSpell } from "./rolls.mjs";
import { statusEffects } from "./rules.mjs";

const flag = (effect, key) => effect.getFlag?.(SYSTEM_ID, key) ?? effect.flags?.[SYSTEM_ID]?.[key];

/** Eternia durations that end before the scene does (helpers/effect-durations.mjs). */
const SHORT = ["endOfProcess", "endOfRound"];

/** Whether a status may last longer than its rule: not one that takes the whole turn. */
export const mayLast = id => !NO_ACTIONS.includes(id);

/** Whether the effects of a skill are infinite for its user: the skill's own flag, else a Trait of its Magia. */
export function isInfinite(item, actor = item?.actor) {
  const own = item?.flags?.[SYSTEM_ID]?.infinite;
  if (typeof own === "boolean") return own;
  return traitsFor(actor, item).some(e => e.getFlag(SYSTEM_ID, "trait")?.infinite);
}

/** The data of an effect a skill's use copies to an actor (helpers/item-use.mjs), infinite when the skill's are. */
export function lastingEffectData(item, data) {
  if (!isInfinite(item)) return data;
  foundry.utils.setProperty(data, `flags.${SYSTEM_ID}.infinite`, true);
  if (SHORT.includes(data.flags[SYSTEM_ID].expires)) data.flags[SYSTEM_ID].expires = "endOfScene";
  return data;
}

/** What a damage card keeps for the statuses its hits give: whether they are infinite, and whether a spell gave them. */
export function lastingCard(item, attacker) {
  return { infinite: isInfinite(item, attacker ?? item?.actor), fromSpell: isSpell(item) };
}

/** The effect data of a status a damage card's hit gives, with the card's marks. */
export function lastingHitData(card, data) {
  if (card?.infinite) foundry.utils.setProperty(data, `flags.${SYSTEM_ID}.infinite`, true);
  if (card?.fromSpell) foundry.utils.setProperty(data, `flags.${SYSTEM_ID}.fromSpell`, true);
  return data;
}

/** Whether a status ends by itself soon: by its own rule, or by the short duration of one of its effects. */
export function endsSoon(actor, id) {
  if (END_OF_OWN_PROCESS.includes(id) || END_OF_ROUND.includes(id)) return true;
  return statusEffects(actor, id).some(e => SHORT.includes(flag(e, "expires")));
}

/**
 * The statuses that end now by their own rule (the end of the bearer's Main Process, the Cleanup), less those that last:
 * held by an infinite effect (until the end of the scene) or renewed (this end passes by, and a renewal is spent).
 * @param {Actor} actor
 * @param {string[]} ids
 * @returns {Promise<string[]>}   The ones that end
 */
export async function naturalEnd(actor, ids) {
  const ending = [];
  const renewed = new Map();
  for (const id of ids) {
    const effects = statusEffects(actor, id);
    if (!mayLast(id)) {
      ending.push(id);
      continue;
    }
    if (effects.some(e => flag(e, "infinite"))) continue;
    const kept = effects.filter(e => toInt(flag(e, "renew")) > 0);
    if (!kept.length) {
      ending.push(id);
      continue;
    }
    for (const e of kept) renewed.set(e.id, toInt(flag(e, "renew")) - 1);
  }
  const updates = [...renewed].filter(([id]) => actor.effects.has(id)).map(([_id, n]) => ({ _id, [`flags.${SYSTEM_ID}.renew`]: n }));
  if (updates.length && actor.isOwner) await actor.updateEmbeddedDocuments("ActiveEffect", updates);
  return ending;
}

/**
 * Renew statuses of an actor: the next natural end of each passes by, and their effects with a duration of a process or
 * of the round get a round more.
 * @param {Actor} actor
 * @param {string[]} ids
 * @returns {Promise<string[]>}   The ones renewed
 */
export async function renewStatuses(actor, ids) {
  const updates = new Map();
  const done = [];
  for (const id of ids) {
    const effects = mayLast(id) ? statusEffects(actor, id) : [];
    if (!effects.length) continue;
    done.push(id);
    for (const e of effects) {
      if (updates.has(e.id)) continue;
      const update = { _id: e.id, [`flags.${SYSTEM_ID}.renew`]: toInt(flag(e, "renew")) + 1 };
      const at = flag(e, "appliedAt");
      if (at && SHORT.includes(flag(e, "expires"))) update[`flags.${SYSTEM_ID}.appliedAt`] = { ...at, round: toInt(at.round) + 1 };
      updates.set(e.id, update);
    }
  }
  if (updates.size) await actor.updateEmbeddedDocuments("ActiveEffect", [...updates.values()]);
  return done;
}

/**
 * The actions that free an actor from a status a hostile infinite effect holds (a Major Action), or null: the action HUD
 * shows its Livrar-se, and conditions/recovery.mjs spends it.
 * @param {Actor|null} actor
 * @param {string} id
 * @returns {string[]|null}
 */
export function breakFreeActions(actor, id) {
  if (!actor || (statusDefinition(id)?.group !== "bad") || !mayLast(id)) return null;
  return statusEffects(actor, id).some(e => flag(e, "infinite")) ? ["major"] : null;
}
