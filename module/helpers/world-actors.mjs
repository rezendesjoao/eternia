/**
 * Every actor of the world and of the scenes, for the scans that look for something on all of them (what a fallen
 * source held, the curses of a monster, the lives a sealer took, the uses of a sustained skill).
 *
 * Reading `token.actor` of an unlinked token builds its whole synthetic actor (Foundry v14 keeps the ActorDelta lazy
 * until then: `TokenDocument#isLazyDelta`), and the built actor stays: one scan over every scene would build hundreds.
 * With a test, a token whose actor isn't built yet is tried on its source data first, and its actor is only built when
 * that data shows a candidate (a token whose actor is built is read as before). A synthetic actor is the base actor with
 * the delta on top: its effects are the delta's that aren't deletions (`_tombstone`) plus the base actor's the delta
 * doesn't replace, and each flag is the delta's or else the base actor's. The test is tried on the delta's and on the
 * base's: it may say yes too often, never too rarely, and the scan still checks the actor it gets.
 */
import { SYSTEM_ID } from "../settings.mjs";

/**
 * The world's actors, then the synthetic actors of the unlinked tokens of every scene, in that order (without a test,
 * all of them, as reading every `token.actor`; with one, the token actors that can't match are left out, unbuilt).
 * @param {object} [match]   What the scan looks for, tried on the source data of a token whose actor isn't built yet
 * @param {(effect: object) => boolean} [match.effect]   One of the actor's own effects (source data: `statuses` is an
 *                                                       array)
 * @param {(flags: object) => boolean} [match.flags]     The actor's flags of the system (`flags.eternia`)
 * @returns {Actor[]}
 */
export function worldActors({ effect = null, flags = null } = {}) {
  const actors = [...game.actors];
  const test = (effect || flags) ? token => mayMatch(token, effect, flags) : null;
  for (const scene of game.scenes) {
    for (const token of scene.tokens) {
      if (token.actorLink || (test && token.isLazyDelta && !test(token))) continue;
      const actor = token.actor;
      if (actor) actors.push(actor);
    }
  }
  return actors;
}

/** Whether the actor a lazy token would build could match: its delta's data or its base actor's. */
function mayMatch(token, effect, flags) {
  const base = token.baseActor;
  // Without its base actor the token has no actor at all (ActorDelta.applyDelta)
  if (!base) return false;
  const delta = token._source.delta ?? {};
  if (effect) {
    if ((delta.effects ?? []).some(e => !e?._tombstone && effect(e))) return true;
    if ((base._source.effects ?? []).some(e => effect(e))) return true;
  }
  return !!flags && (flags(delta.flags?.[SYSTEM_ID] ?? {}) || flags(base._source.flags?.[SYSTEM_ID] ?? {}));
}
