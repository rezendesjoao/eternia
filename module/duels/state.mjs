/**
 * What a duel is, read anywhere (no hooks here: the combat cards, the Hate and the round automation import it). A duel
 * is a Combat with `flags.eternia.duel`, made by the primary GM when a challenge is accepted (duels.mjs):
 *
 *   { id, mode, state, sceneId, createdAt, startsAt, startedAt, endedAt,
 *     a: { actorUuid, tokenUuid, name, img, userId },     the challenger
 *     b: { actorUuid, tokenUuid, name, img },             the challenged
 *     result: { winner: "a"|"b"|null, reason, rounds, ms, deltas: { a, b }, ratings: { a, b } } }
 *
 * The modes: "strike" (whoever loses HP first loses), "half" (whoever is left with half the Max HP or less loses) and
 * "death" (whoever falls loses: [Dying], and the dead stay dead). In the first two nobody falls: the HP stops at 1.
 * The states: "countdown" (accepted, the combat not started yet), "fighting", "over" (the result is in; the combat of a
 * duel to the death goes on until the GM ends it, the others end by themselves).
 */
export const DUEL_MODES = ["strike", "half", "death"];

/** The duel of a combat (or null). */
export const duelOf = combat => combat?.flags?.eternia?.duel ?? null;

/** Whether a duel has not ended yet. */
export const isLive = duel => !!duel && ["countdown", "fighting"].includes(duel.state);

/** Whether a duel's mode lets nobody fall (the HP stops at 1). */
export const spares = duel => !!duel && (duel.mode !== "death");

/** The other side. */
export const otherSide = side => ((side === "a") ? "b" : "a");

/** The duels of the world whose combat still exists (any state), newest first. */
export const duelCombats = () => (game.combats?.contents ?? []).filter(c => duelOf(c)).sort((x, y) => (duelOf(y).createdAt ?? 0) - (duelOf(x).createdAt ?? 0));

/** The duels not over yet. */
export const liveDuels = () => duelCombats().filter(c => isLive(duelOf(c)));

/** Whether an actor is a duel's side (its actor, or the actor of its token). */
function isSide(entry, actor) {
  if (!entry || !actor) return false;
  if (entry.actorUuid && (actor.uuid === entry.actorUuid)) return true;
  return !!entry.tokenUuid && (actor.token?.uuid === entry.tokenUuid);
}

/**
 * The duel an actor is in (its combat still exists), or null.
 * @param {Actor} actor
 * @param {object} [options]
 * @param {boolean} [options.live]  Only a duel not over yet
 * @returns {{combat: Combat, duel: object, side: "a"|"b", foe: "a"|"b"}|null}
 */
export function duelOfActor(actor, { live = false } = {}) {
  if (!actor) return null;
  for (const combat of (live ? liveDuels() : duelCombats())) {
    const duel = duelOf(combat);
    for (const side of ["a", "b"]) if (isSide(duel[side], actor)) return { combat, duel, side, foe: otherSide(side) };
  }
  return null;
}

/** Whether two actors fight each other in a duel not over yet. */
export function areDuelFoes(one, two) {
  const found = duelOfActor(one, { live: true });
  return !!found && !!two && isSide(found.duel[found.foe], two);
}

/** Whether a combat is a duel (the party's Hate, the round's "both sides" read it). */
export const isDuelCombat = combat => !!duelOf(combat);

/** Whether the HP of an actor stops at 1 now (it is in a duel where nobody falls, and its combat still exists). */
export function sparedNow(actor) {
  const found = duelOfActor(actor);
  return !!found && spares(found.duel);
}
