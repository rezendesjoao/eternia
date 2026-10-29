/**
 * [Iron Blood] (`ironBlood`, the Magia Sangue de Ferro): the iron of the bearer's blood turned into blades.
 * - Every square its token moves on its own (not a pull, a push nor a switch: `eterniaForced`) costs it the Rating as
 *   direct damage (takeDamage), on the window that moved it.
 * - At 5 (its stack), the iron leaves the blood all at once: [Dazed] and [Slowed] (STACK_THRESHOLDS, catalog.mjs).
 * - It ends with a Major Action (RECOVERY) or with the scene.
 * The Magia's Trait makes its spells ignore the Physical Defense of a target with it (the card's `pierce.inside`:
 * helpers/combat-cards.mjs applyDamage).
 */
import { SYSTEM_ID } from "../settings.mjs";
import { isLocalChange } from "../helpers/clients.mjs";
import { rating, rulesOn } from "./rules.mjs";
import { takeDamage } from "./damage.mjs";

/** The square of a token's center, from a position of its own (its source, or the one it moves to). */
function squareAt(token, x, y) {
  const size = token.parent?.grid?.size || 100;
  return { i: Math.floor((y + ((token.height * size) / 2)) / size), j: Math.floor((x + ((token.width * size) / 2)) / size) };
}

/** Where the token was before the move (its source: the document's own x and y move with the animation). */
function onPreUpdateToken(token, changes, options) {
  if (!("x" in changes) && !("y" in changes)) return;
  options.eterniaIronFrom = { x: token._source.x, y: token._source.y };
}

/** The squares the token moved on its own, each one a cut. */
async function onUpdateToken(token, changes, options, userId) {
  const from = options.eterniaIronFrom;
  if (!from || options.eterniaForced || !rulesOn() || !isLocalChange(options, userId)) return;
  const actor = token.actor;
  const blades = rating(actor, "ironBlood");
  if (!actor || (blades <= 0) || actor.statuses.has("dead")) return;
  const a = squareAt(token, from.x, from.y);
  const b = squareAt(token, token._source.x, token._source.y);
  const moved = Math.abs(a.i - b.i) + Math.abs(a.j - b.j);
  if (moved <= 0) return;
  await takeDamage(actor, blades * moved, { reason: "ironBlood" });
}

/** Call during the `init` hook. */
export function registerIron() {
  Hooks.on("preUpdateToken", onPreUpdateToken);
  Hooks.on("updateToken", (...args) => onUpdateToken(...args).catch(err => console.error(`${SYSTEM_ID} | Iron Blood failed`, err)));
}
