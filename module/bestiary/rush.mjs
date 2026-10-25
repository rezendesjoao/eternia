/**
 * Rushing at a foe (a use action, conditions/effects.mjs registerUseAction): `{ type: "rush", value }` on a skill moves
 * its user's token toward the target, up to `value` squares (0 or none: the user's Speed), into the target's square,
 * engaged with it, when it gets there; else as far as it goes, the longer way first. The orc's Aggressive (an Instant
 * skill: no action) and the gnoll's bloodlust (`onUse`: it runs before the bite's check) use it.
 * It is the user's own move, not a forced one: what keeps it in place stops it ([Rooted], [Grappled]…), and it doesn't
 * rush at what frightens it. The grid helpers (cells, squares counted as the attack cards count them) serve the throw
 * too (bestiary/throw.mjs).
 */
import { L } from "../settings.mjs";
import { actorName, toInt } from "../helpers/utils.mjs";
import { NO_MOVEMENT } from "../conditions/catalog.mjs";
import { isSourceOf, rulesOn } from "../conditions/rules.mjs";
import { registerUseAction } from "../conditions/effects.mjs";

const label = id => game.i18n.localize(`ETERNIA.StatusEffect.${id}`);

/** The cell of a token's top left square, by its source position (the document's x/y lag behind while it animates). */
export function cellOf(token) {
  const size = token.parent.grid.size;
  return { i: Math.round(token._source.y / size), j: Math.round(token._source.x / size) };
}

/** The cells a token covers, from its top left cell (or from another one, where it would stand). */
export function cellsOf(token, at = cellOf(token)) {
  const out = [];
  for (let di = 0; di < Math.max(1, toInt(token.height)); di++) {
    for (let dj = 0; dj < Math.max(1, toInt(token.width)); dj++) out.push({ i: at.i + di, j: at.j + dj });
  }
  return out;
}

/** Squares between two cells (Manhattan, as the attack cards count them). */
export const cellDistance = (a, b) => Math.abs(a.i - b.i) + Math.abs(a.j - b.j);

/** The cell of a token nearest to another cell, and how far it is. */
export function nearestCell(token, from) {
  let best = null;
  for (const cell of cellsOf(token)) {
    const distance = cellDistance(cell, from);
    if (!best || (distance < best.distance)) best = { cell, distance };
  }
  return best;
}

/** Whether two tokens share a square (engaged), one of them standing at `at`. */
export function overlaps(token, other, at = cellOf(token)) {
  const theirs = cellsOf(other).map(c => `${c.i},${c.j}`);
  return cellsOf(token, at).some(c => theirs.includes(`${c.i},${c.j}`));
}

/** A top left cell kept inside the scene, for a token of that size. */
export function clampCell(scene, token, cell) {
  const size = scene.grid.size;
  const rect = scene.dimensions?.sceneRect ?? { x: 0, y: 0, width: scene.width, height: scene.height };
  const i0 = Math.ceil(rect.y / size);
  const j0 = Math.ceil(rect.x / size);
  const i1 = Math.floor((rect.y + rect.height) / size) - Math.max(1, toInt(token.height));
  const j1 = Math.floor((rect.x + rect.width) / size) - Math.max(1, toInt(token.width));
  return { i: Math.clamp(cell.i, i0, Math.max(i0, i1)), j: Math.clamp(cell.j, j0, Math.max(j0, j1)) };
}

/** The token of an actor on a scene: a token actor's own, else a linked token of it. */
export function sceneToken(scene, actor) {
  if (!scene || !actor) return null;
  if (actor.isToken) return (actor.token?.parent === scene) ? actor.token : null;
  return scene.tokens.find(t => t.actorLink && (t.actorId === actor.id)) ?? null;
}

/** The actor of a uuid (a token's uuid gives its actor), or null. */
export async function actorOf(uuid) {
  const doc = uuid ? await fromUuid(uuid).catch(() => null) : null;
  const actor = (doc instanceof TokenDocument) ? doc.actor : doc;
  return (actor instanceof Actor) ? actor : null;
}

/**
 * The use action: the user's token goes toward the target (the recipient), on the scene the user was looking at.
 * Returns the chat line, or null (already engaged, or a token missing).
 * @param {Actor} target
 * @param {{casterUuid: string, sceneId: string, value: number}} payload
 */
async function rush(target, { casterUuid = "", sceneId = "", value = 0 } = {}) {
  const user = await actorOf(casterUuid);
  if (!user || (user.uuid === target.uuid)) return null;
  const scene = game.scenes.get(sceneId) ?? canvas?.scene ?? null;
  const mine = sceneToken(scene, user);
  const theirs = sceneToken(scene, target);
  if (!mine || !theirs || overlaps(mine, theirs)) return null;
  if (rulesOn()) {
    const stuck = NO_MOVEMENT.filter(id => user.statuses.has(id));
    if (stuck.length) return L("Bestiary.RushStuck", { name: actorName(user), status: stuck.map(label).join(", ") });
    if (isSourceOf(user, "frightened", target)) return L("Bestiary.RushAfraid", { name: actorName(user), target: actorName(target) });
  }
  const steps = (toInt(value) > 0) ? toInt(value) : Math.max(1, toInt(user.system["battle-status"]?.speed) || 2);
  const from = cellOf(mine);
  const goal = nearestCell(theirs, from);
  let to = goal.cell;
  if (goal.distance > steps) {
    to = { ...from };
    for (let left = steps; left > 0; left--) {
      const di = goal.cell.i - to.i;
      const dj = goal.cell.j - to.j;
      if (Math.abs(di) >= Math.abs(dj)) to.i += Math.sign(di);
      else to.j += Math.sign(dj);
    }
  }
  to = clampCell(scene, mine, to);
  const moved = cellDistance(from, to);
  if (!moved) return null;
  const size = scene.grid.size;
  await mine.update({ x: to.j * size, y: to.i * size });
  const data = { name: actorName(user), target: actorName(target), n: moved };
  return L(overlaps(mine, theirs, to) ? "Bestiary.Rush" : "Bestiary.RushShort", data);
}

/** Call during the `init` hook. */
export function registerRush() {
  registerUseAction("rush", rush);
}
