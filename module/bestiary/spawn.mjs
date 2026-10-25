/**
 * Calling monsters onto the scene (the bestiary rules' `summon` and the Rifts' waves): tokens of the monsters asked,
 * on the free squares nearest to a point, in its combat when there is one, marked as come late (`noLoot`: they leave
 * no drops, bestiary/drops.mjs). A monster of a compendium is brought to the world once (the world actor made from it,
 * found by `_stats.compendiumSource`, is used the next times).
 */
import { SYSTEM_ID } from "../settings.mjs";
import { toInt } from "../helpers/utils.mjs";

/** The world actor of a uuid: itself, or the one already made from that compendium monster, or a new one. */
export async function worldActor(uuid) {
  const doc = await fromUuid(uuid).catch(() => null);
  if (!(doc instanceof Actor)) return null;
  if (!doc.inCompendium) return doc;
  const made = game.actors.find(a => a._stats?.compendiumSource === uuid);
  if (made) return made;
  return game.actors.importFromCompendium(doc.compendium, doc.id, {}, { keepId: false });
}

/** The squares (top-left points) a token covers. */
function squaresOf(token) {
  const size = token.parent.grid.size;
  const out = [];
  for (let i = 0; i < Math.max(1, toInt(token.width)); i++) {
    for (let j = 0; j < Math.max(1, toInt(token.height)); j++) out.push(`${Math.round(token.x / size) + i},${Math.round(token.y / size) + j}`);
  }
  return out;
}

/**
 * The free squares nearest to a token, ring by ring, up to `radius` squares away (the token's own square last, when
 * nothing else is free).
 * @returns {{x: number, y: number}[]}   Top-left points, in canvas pixels
 */
function freeSquares(origin, radius, count) {
  const scene = origin.parent;
  const size = scene.grid.size;
  const taken = new Set(scene.tokens.filter(t => !t.hidden).flatMap(squaresOf));
  const ox = Math.round(origin.x / size), oy = Math.round(origin.y / size);
  const cols = Math.floor(scene.dimensions.width / size), rows = Math.floor(scene.dimensions.height / size);
  const out = [];
  for (let r = 1; (r <= radius) && (out.length < count); r++) {
    for (let dx = -r; dx <= r; dx++) {
      for (let dy = -r; dy <= r; dy++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
        const i = ox + dx, j = oy + dy;
        if ((i < 0) || (j < 0) || (i >= cols) || (j >= rows) || taken.has(`${i},${j}`)) continue;
        taken.add(`${i},${j}`);
        out.push({ x: i * size, y: j * size });
        if (out.length >= count) return out;
      }
    }
  }
  while (out.length < count) out.push({ x: origin.x, y: origin.y });
  return out;
}

/** The highest number a name already has on a scene ("Worg (3)" gives 3; 0 when none). */
function lastNumber(scene, base) {
  const prefix = `${base} (`;
  let max = 0;
  for (const token of scene.tokens) {
    if (!token.name.startsWith(prefix) || !token.name.endsWith(")")) continue;
    const n = Number(token.name.slice(prefix.length, -1));
    if (Number.isInteger(n)) max = Math.max(max, n);
  }
  return max;
}

/**
 * Bring monsters next to a token: their tokens, in the token's combat. GM only.
 * @param {TokenDocument} origin
 * @param {{uuid?: string, uuids?: string[], count: string|number, loot?: boolean}[]} list   The monsters and how many
 *   (a number or a formula: "1d3"); with `uuids`, each one is drawn from that list (the Great Rift's wave); with
 *   `loot`, they leave their drops (the Mother Rift's named beast)
 * @param {object} [options]
 * @param {number} [options.radius]   How far from the origin they may come (squares)
 * @param {string} [options.by]       Who called them (kept in the tokens' flags)
 * @returns {Promise<TokenDocument[]>}
 */
export async function spawnNear(origin, list, { radius = 2, by = "" } = {}) {
  if (!game.user.isGM || !origin?.parent) return [];
  const scene = origin.parent;
  const wanted = [];
  for (const { uuid, uuids, count, loot } of list ?? []) {
    const pool = (Array.isArray(uuids) && uuids.length) ? uuids : [uuid];
    const n = Number.isFinite(Number(count)) ? toInt(count) : toInt((await new Roll(String(count)).evaluate()).total);
    for (let k = 0; k < n; k++) {
      const actor = await worldActor(pool[Math.floor(Math.random() * pool.length)]);
      if (actor) wanted.push({ actor, loot: loot === true });
    }
  }
  if (!wanted.length) return [];
  const spots = freeSquares(origin, Math.max(1, radius), wanted.length);
  // The numbers in the names, counted here: Foundry's own count doesn't see tokens made in the same moment
  const next = new Map();
  const data = [];
  for (const [index, { actor, loot }] of wanted.entries()) {
    const token = (await actor.getTokenDocument({
      x: spots[index].x, y: spots[index].y, level: origin.level, elevation: origin.elevation
    })).toObject();
    // getTokenDocument already numbers the name, but only counting the tokens that exist now
    if (actor.prototypeToken.appendNumber) {
      const base = actor.prototypeToken.name || actor.name;
      const number = (next.get(base) ?? lastNumber(scene, base)) + 1;
      next.set(base, number);
      Object.assign(token, { name: `${base} (${number})`, appendNumber: false });
    }
    token.delta ??= {};
    foundry.utils.setProperty(token, `delta.flags.${SYSTEM_ID}.noLoot`, !loot);
    foundry.utils.setProperty(token, `flags.${SYSTEM_ID}.calledBy`, by);
    data.push(token);
  }
  const tokens = await scene.createEmbeddedDocuments("Token", data);
  // In the origin's combat, they fight at once
  const combat = game.combats.find(c => c.started && (c.scene?.id === scene.id) && c.combatants.some(cb => cb.tokenId === origin.id))
    ?? game.combats.find(c => c.started && (c.scene?.id === scene.id));
  if (combat && tokens.length) {
    await combat.createEmbeddedDocuments("Combatant", tokens.map(t => ({ tokenId: t.id, sceneId: scene.id, actorId: t.actorId, hidden: t.hidden })));
  }
  return tokens;
}
