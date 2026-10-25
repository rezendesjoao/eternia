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

/**
 * Bring monsters next to a token: their tokens, in the token's combat. GM only.
 * @param {TokenDocument} origin
 * @param {{uuid?: string, uuids?: string[], count: string|number}[]} list   The monsters and how many (a number or a
 *   formula: "1d3"); with `uuids`, each one is drawn from that list (the Great Rift's wave)
 * @param {object} [options]
 * @param {number} [options.radius]   How far from the origin they may come (squares)
 * @param {string} [options.by]       Who called them (kept in the tokens' flags)
 * @returns {Promise<TokenDocument[]>}
 */
export async function spawnNear(origin, list, { radius = 2, by = "" } = {}) {
  if (!game.user.isGM || !origin?.parent) return [];
  const scene = origin.parent;
  const wanted = [];
  for (const { uuid, uuids, count } of list ?? []) {
    const pool = (Array.isArray(uuids) && uuids.length) ? uuids : [uuid];
    const n = Number.isFinite(Number(count)) ? toInt(count) : toInt((await new Roll(String(count)).evaluate()).total);
    for (let k = 0; k < n; k++) {
      const actor = await worldActor(pool[Math.floor(Math.random() * pool.length)]);
      if (actor) wanted.push(actor);
    }
  }
  if (!wanted.length) return [];
  const spots = freeSquares(origin, Math.max(1, radius), wanted.length);
  const data = [];
  for (const [index, actor] of wanted.entries()) {
    const token = (await actor.getTokenDocument({
      x: spots[index].x, y: spots[index].y, level: origin.level, elevation: origin.elevation
    })).toObject();
    token.delta ??= {};
    foundry.utils.setProperty(token, `delta.flags.${SYSTEM_ID}.noLoot`, true);
    foundry.utils.setProperty(token, `flags.${SYSTEM_ID}.calledBy`, by);
    data.push(token);
  }
  // One at a time: each one gets its own number in the name (a batch would give them all the same)
  const tokens = [];
  for (const one of data) tokens.push(...await scene.createEmbeddedDocuments("Token", [one]));
  // In the origin's combat, they fight at once
  const combat = game.combats.find(c => c.started && (c.scene?.id === scene.id) && c.combatants.some(cb => cb.tokenId === origin.id))
    ?? game.combats.find(c => c.started && (c.scene?.id === scene.id));
  if (combat && tokens.length) {
    await combat.createEmbeddedDocuments("Combatant", tokens.map(t => ({ tokenId: t.id, sceneId: scene.id, actorId: t.actorId, hidden: t.hidden })));
  }
  return tokens;
}
