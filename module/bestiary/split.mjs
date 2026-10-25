/**
 * Splitting (a monster rule, docs/bestiario.md): a monster whose skill carries `flags.eternia.monster = { rule: "split",
 * types, not, max, min }` splits in two when a damage card hurts it with one of `types` (["physical"]) and none of the
 * tags of `not` (["Flame"]: fire and the Artes don't split the Ochre Jelly). It keeps half the HP it has left (rounded
 * up), and a new piece of it comes out next to it with the other half (as its HP and its max), in its combat and with
 * no drops (bestiary/spawn.mjs). The pieces of one monster are a family (`flags.eternia.split` on their tokens: the
 * first token's uuid): up to `max` (4) of them on the scene; one with less than `min` (2) HP left doesn't split. Runs
 * on the GM's window, one split of a family at a time.
 */
import { L, SYSTEM_ID } from "../settings.mjs";
import { actorName, postSummary, toInt } from "../helpers/utils.mjs";
import { rulesOn } from "../conditions/rules.mjs";
import { spawnNear } from "./spawn.mjs";

/** The splits of each family, one after the other (an area blow hurts several pieces at once). */
const queues = new Map();

/** An actor's split rule: its skill and its numbers, or null. */
export function splitRule(actor) {
  const item = (actor?.items ?? []).find(i => (i.type === "skill") && (i.getFlag(SYSTEM_ID, "monster")?.rule === "split"));
  if (!item) return null;
  const rule = item.getFlag(SYSTEM_ID, "monster");
  return {
    item, types: rule.types ?? ["physical"], not: (rule.not ?? ["Flame"]).map(t => String(t).toLowerCase()),
    max: toInt(rule.max) || 4, min: Math.max(2, toInt(rule.min) || 2)
  };
}

/** The token of an actor: a token actor's own, else its first active one (the viewed scene first). */
function tokenOf(actor) {
  if (actor?.token) return actor.token;
  const tokens = actor?.getActiveTokens?.(false, true) ?? [];
  return tokens.find(t => t.parent === canvas?.scene) ?? tokens[0] ?? null;
}

/** The family of a token (the uuid of the first piece), and its pieces on the scene. */
export function piecesOf(token) {
  const family = token.getFlag(SYSTEM_ID, "split") ?? token.uuid;
  return { family, pieces: token.parent.tokens.filter(t => (t.uuid === family) || (t.getFlag(SYSTEM_ID, "split") === family)) };
}

/** Whether a damage card splits the monster: its type, and none of the tags that don't. */
function splits(rule, card) {
  if (!rule.types.includes(card?.type)) return false;
  return !(card.tags ?? []).some(t => rule.not.includes(String(t).toLowerCase()));
}

/** Split a monster: half its HP left stays, the other half comes out as a new piece of the family. */
async function split(actor, rule) {
  const token = tokenOf(actor);
  const hp = toInt(actor.system.health?.value);
  if (!token?.parent || (hp < rule.min) || actor.statuses.has("incapacitated") || actor.statuses.has("dead")) return;
  const { family, pieces } = piecesOf(token);
  if (pieces.length >= rule.max) return;
  const kept = Math.ceil(hp / 2);
  const given = hp - kept;
  const base = game.actors.get(token.actorId) ?? actor;
  const [piece] = await spawnNear(token, [{ uuid: base.uuid, count: 1 }], { radius: 1, by: actor.uuid });
  if (!piece) return;
  await actor.update({ "system.health.value": kept });
  await piece.actor.update({ "system.health.value": given, "system.health.max": given });
  await piece.update({ [`flags.${SYSTEM_ID}.split`]: family });
  if (!token.getFlag(SYSTEM_ID, "split")) await token.update({ [`flags.${SYSTEM_ID}.split`]: family });
  await postSummary(rule.item.name, [L("Bestiary.Split.Done", { name: actorName(actor), piece: piece.name, n: given, kept })]);
}

/** A damage card hurt a monster (on the window that applied it, the GM's): it may split. */
function onDamaged(actor, card, { amount = 0 } = {}) {
  if (!rulesOn() || !game.user.isGM || !actor?.isOwner || card?.recovery || (toInt(amount) <= 0)) return;
  const rule = splitRule(actor);
  const token = rule ? tokenOf(actor) : null;
  if (!token?.parent || !splits(rule, card)) return;
  const { family } = piecesOf(token);
  const next = (queues.get(family) ?? Promise.resolve()).then(() => split(actor, rule))
    .catch(err => console.error(`${SYSTEM_ID} | Split failed`, err));
  queues.set(family, next);
}

/** Call during the `init` hook. */
export function registerSplit() {
  Hooks.on("eternia.damaged", (actor, card, context) => onDamaged(actor, card, context ?? {}));
}
