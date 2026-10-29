/**
 * Who holds each Magia (0.51). A Magia's `flags.eternia.magic.holders` says how many characters of the world may have
 * it at once (1, 2 or 3; without it there is no limit: every Conjuration). The holders are the actors of the world that
 * have it (a skill with the same `flags.eternia.magic.id`), the unlinked tokens of the scenes too, and the characters
 * whose Awakening drew it and is still open (a roll not chosen yet keeps its place, so two players never draw the last
 * one at the same time).
 * - The Awakening (apps/awakening.mjs) never draws a Magia that is full: the die has a face for each one left.
 * - The Magia picker and the creation wizard (apps/magic-picker.mjs) show "holders: 1/1" and don't let a player take
 *   one that is full; the GM chooses freely.
 * A Magia with `flags.eternia.magic.exclusive` (every Absoluta) takes all the Magia slots of its holder: who has it is
 * offered no other Magia (apps/option-grants.mjs), and a player with another Magia can't take it.
 */
import { L, SYSTEM_ID } from "../settings.mjs";
import { toInt } from "../helpers/utils.mjs";

/** The flag of a Magia skill (or of a catalog entry). */
const magicOf = item => item?.flags?.[SYSTEM_ID]?.magic ?? item?.getFlag?.(SYSTEM_ID, "magic") ?? null;

/** How many may hold a Magia (a catalog entry, or its flag): 0 is no limit. */
export const holderLimit = magia => Math.max(0, toInt(magia?.holders ?? magicOf(magia)?.holders));

/** Whether a Magia takes every slot of its holder. */
export const isExclusive = magia => !!(magia?.exclusive ?? magicOf(magia)?.exclusive);

/** Whether two actors are the same character (a token actor and its base actor too). */
function same(a, b) {
  if (!a || !b) return false;
  if (a.uuid === b.uuid) return true;
  const base = actor => (actor.isToken ? (game.actors.get(actor.id) ?? actor) : actor);
  return base(a).uuid === base(b).uuid;
}

/** Every actor that may hold a Magia: the world's and the unlinked tokens' of the scenes. */
function everyActor() {
  const out = [...game.actors];
  for (const scene of game.scenes ?? []) {
    for (const token of scene.tokens) if (!token.actorLink && token.actor) out.push(token.actor);
  }
  return out;
}

/** The Magias an actor has (their ids). */
export const magiaIdsOf = actor => new Set((actor?.items ?? []).filter(i => i.type === "skill")
  .map(i => i.getFlag(SYSTEM_ID, "magic")?.id).filter(Boolean));

/**
 * Who holds a Magia now: the characters with it and those whose open Awakening drew it.
 * @param {{id: string, uuid: string}} magia   A catalog entry
 * @param {object} [options]
 * @param {Actor} [options.except]   Not counted (the one choosing)
 * @returns {{count: number, names: string[]}}
 */
export function holdersOf(magia, { except = null } = {}) {
  const names = [];
  const seen = new Set();
  for (const actor of everyActor()) {
    if (except && same(actor, except)) continue;
    const key = actor.isToken ? actor.uuid : actor.id;
    if (seen.has(key)) continue;
    const has = magiaIdsOf(actor).has(magia.id);
    const awakening = actor.getFlag?.(SYSTEM_ID, "awakening");
    const drawn = !!awakening && !awakening.chosen && Array.isArray(awakening.rolls)
      && awakening.rolls.some(r => r?.uuid === magia.uuid);
    if (!has && !drawn) continue;
    seen.add(key);
    names.push(actor.token?.name ?? actor.name);
  }
  return { count: names.length, names };
}

/**
 * Where a Magia stands for a character: its limit, how many hold it (not counting the character), whether it is full,
 * and whether the character may take it (a player: not when full, not an exclusive one with another Magia).
 * @param {object} magia     A catalog entry
 * @param {Actor|null} actor
 * @returns {{limit: number, count: number, full: boolean, exclusive: boolean, blocked: string|null, label: string, names: string[]}}
 */
export function holderState(magia, actor = null) {
  const limit = holderLimit(magia);
  const exclusive = isExclusive(magia);
  const { count, names } = limit ? holdersOf(magia, { except: actor }) : { count: 0, names: [] };
  const full = !!limit && (count >= limit);
  const others = actor ? [...magiaIdsOf(actor)].filter(id => id !== magia.id) : [];
  let blocked = null;
  if (full) blocked = L("Holders.Full", { n: limit });
  else if (exclusive && others.length) blocked = L("Holders.ExclusiveTaken");
  return {
    limit, count, full, exclusive, blocked, names,
    label: limit ? L("Holders.Count", { n: Math.min(count, limit), max: limit }) : ""
  };
}

/** The exclusive Magia an actor has (an Absoluta), or null: then it gets no other. */
export function exclusiveMagia(actor) {
  return (actor?.items ?? []).find(i => (i.type === "skill") && isExclusive(i)) ?? null;
}
