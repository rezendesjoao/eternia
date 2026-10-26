/**
 * The blink (a monster rule, docs/bestiario.md): a skill with `flags.eternia.monster = { rule: "blink", range }` takes
 * its user, when used, to the back of a creature within `range` squares (6): the token jumps onto that creature's
 * square (engaged with it; on a bigger one, its square farthest from where the user was), with Foundry's "blink"
 * movement, so nothing on the way stops it. The creature is the user's target; with none, the prey: the creature of
 * the other side with the most Hate there (then the nearest). The squares are counted as the attack cards count them
 * (Manhattan, between the squares of the two token centers). What keeps a token in place ([Rigor], [Rooted],
 * [Grappled]) stops it as it stops any [Movement] skill. The phase (bestiary/phase.mjs) comes back the same way.
 */
import { L, SYSTEM_ID } from "../settings.mjs";
import { actorName, postSummary, toInt } from "../helpers/utils.mjs";

/** The monster rule of a skill, or null. */
const ruleOf = item => item?.getFlag?.(SYSTEM_ID, "monster") ?? null;

/** The token of an actor: a token actor's own, else its first active one on the viewed scene. */
export function tokenOf(actor) {
  if (actor?.token) return actor.token;
  return actor?.getActiveTokens?.(false, true).find(t => t.parent === canvas?.scene) ?? actor?.getActiveTokens?.(false, true)[0] ?? null;
}

/** The squares ("i,j") a token covers, from its source position (the document's x lags while a move animates). */
function squaresOf(token, at = token._source) {
  const size = token.parent.grid.size;
  const out = [];
  for (let i = 0; i < Math.max(1, toInt(token._source.width)); i++) {
    for (let j = 0; j < Math.max(1, toInt(token._source.height)); j++) out.push({ i: Math.round(at.x / size) + i, j: Math.round(at.y / size) + j });
  }
  return out;
}

/** The square of a token's center. */
function centerOf(token, at = token._source) {
  const size = token.parent.grid.size;
  return {
    i: Math.floor((at.x + (Math.max(1, toInt(token._source.width)) * size / 2)) / size),
    j: Math.floor((at.y + (Math.max(1, toInt(token._source.height)) * size / 2)) / size)
  };
}

/**
 * The distance in squares between two tokens, as the attack cards count it: Manhattan, between the squares of their
 * centers (a diagonal counts as 2).
 * @param {TokenDocument} a
 * @param {TokenDocument} b
 * @param {{x: number, y: number}} [from]   Where `a` stands instead (the place a phased monster went)
 */
export function squaresBetween(a, b, from = a._source) {
  const p = centerOf(a, from);
  const q = centerOf(b);
  return Math.abs(p.i - q.i) + Math.abs(p.j - q.j);
}

/**
 * The prey within some squares of a token: the creatures of the other side (by the disposition of the tokens, the
 * neutral ones out), standing and seen, the one with the most Hate first, then the nearest.
 * @param {TokenDocument} token
 * @param {number} range
 * @param {{x: number, y: number}} [from]   Where to count from (the token's place, else)
 * @returns {TokenDocument[]}
 */
export function preyNear(token, range, from = token._source) {
  const side = Math.sign(toInt(token.disposition));
  const hate = t => toInt(t.actor?.system?.infos?.hate);
  return token.parent.tokens.filter(t => {
    const actor = t.actor;
    if ((t === token) || t.hidden || !actor || (actor.type === "pile")) return false;
    if (actor.statuses.has("dead") || actor.statuses.has("incapacitated")) return false;
    if (!side || (Math.sign(toInt(t.disposition)) !== -side)) return false;
    return squaresBetween(token, t, from) <= range;
  }).sort((a, b) => (hate(b) - hate(a)) || (squaresBetween(token, a, from) - squaresBetween(token, b, from)));
}

/**
 * Where a token lands at the back of another: the square of that one farthest from where it was (its only square,
 * for a creature of one square), kept inside the scene.
 * @param {TokenDocument} token
 * @param {TokenDocument} target
 * @param {{x: number, y: number}} [from]
 * @returns {{x: number, y: number}}   The top-left point, in canvas pixels
 */
export function backOf(token, target, from = token._source) {
  const scene = token.parent;
  const size = scene.grid.size;
  const origin = centerOf(token, from);
  const far = squaresOf(target).sort((a, b) => (Math.abs(b.i - origin.i) + Math.abs(b.j - origin.j)) - (Math.abs(a.i - origin.i) + Math.abs(a.j - origin.j)))[0];
  const rect = scene.dimensions?.sceneRect ?? { x: 0, y: 0, width: scene.width, height: scene.height };
  return {
    x: Math.clamp(far.i * size, rect.x, rect.x + rect.width - (Math.max(1, toInt(token._source.width)) * size)),
    y: Math.clamp(far.j * size, rect.y, rect.y + rect.height - (Math.max(1, toInt(token._source.height)) * size))
  };
}

/**
 * Jump a token to a point at once, with Foundry's "blink" movement (a teleport: no path, nothing in between), and any
 * other data in the same update (`hidden: false`, for a monster coming back from the phase).
 * @param {TokenDocument} token
 * @param {{x: number, y: number}} to
 * @param {object} [data]
 */
export async function jump(token, { x, y }, data = {}) {
  if ((token._source.x === x) && (token._source.y === y)) {
    if (!foundry.utils.isEmpty(data)) await token.update(data);
    return;
  }
  if ("blink" in (CONFIG.Token.movement?.actions ?? {})) {
    await token.move({ x, y, action: "blink", ...data }, { autoRotate: false, showRuler: false });
  }
  else await token.update({ x, y, ...data }, { animate: false });
}

/**
 * A skill with the blink was used (on the window of its user): the user's token jumps to the back of its target, or
 * of the prey, within the range.
 * @param {Item} item
 * @param {Actor} actor
 * @param {TokenDocument[]} targets   The user's targets when it was used
 */
async function blink(item, actor, targets) {
  const rule = ruleOf(item);
  const token = tokenOf(actor);
  if (!token) return;
  const range = Math.max(0, toInt(rule.range) || 6);
  const marked = targets.find(t => (t !== token) && (t.parent === token.parent));
  const target = marked ?? preyNear(token, range)[0] ?? null;
  if (!target) return ui.notifications.warn(L("Bestiary.Blink.NoTarget", { skill: item.name, name: actorName(actor), range }));
  const distance = squaresBetween(token, target);
  if (distance > range) return ui.notifications.warn(L("Bestiary.Blink.Far", { skill: item.name, target: target.name, n: distance, range }));
  await jump(token, backOf(token, target));
  await postSummary(item.name, [L("Bestiary.Blink.Done", { name: actorName(actor), target: target.name })]);
}

/** Call during the `init` hook. */
export function registerBlink() {
  Hooks.on("eternia.skillUsed", (item, context) => {
    if ((ruleOf(item)?.rule !== "blink") || !context?.actor?.isOwner) return;
    // The targets now, before anything else can change them
    const targets = [...(game.user.targets ?? [])].map(t => t.document).filter(Boolean);
    blink(item, context.actor, targets).catch(err => console.error(`${SYSTEM_ID} | Blink failed`, err));
  });
}
