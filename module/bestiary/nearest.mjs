/**
 * The nearest (a monster rule, docs/bestiario.md): a monster whose passive carries `flags.eternia.monster = { rule:
 * "nearest", status }` doesn't choose whom it attacks: while it has `status` (always, without one), its hostile skills go
 * at the nearest creature, ally or enemy (the Flesh Golem in [Berserk]). The distance is the squares between the two
 * tokens, from the nearest square of each (a diagonal counts 2, as the attack cards count), and all at the least
 * distance are the nearest; the hidden, the fallen, the absent, the piles and the Rifts don't count. When its Main
 * Process starts, the primary GM's window targets one of them (drawn) and the chat says who; a hostile skill aimed
 * elsewhere warns, or is blocked, by the conditions' limits (bestiary/use-checks.mjs).
 */
import { L, SYSTEM_ID } from "../settings.mjs";
import { isPrimaryGM } from "../helpers/clients.mjs";
import { actorName, postSummary, toInt } from "../helpers/utils.mjs";
import { has, isHostile, rulesOn } from "../conditions/rules.mjs";

/** The statuses that take a creature out of the reckoning. */
const GONE = ["dead", "incapacitated", "absent"];

/** An actor's nearest rule: its skill and the status it holds with, or null. */
export function nearestRule(actor) {
  const item = (actor?.items ?? []).find(i => (i.type === "skill") && (i.getFlag(SYSTEM_ID, "monster")?.rule === "nearest"));
  return item ? { item, status: item.getFlag(SYSTEM_ID, "monster").status ?? "" } : null;
}

/** Whether a monster goes at the nearest now: the rule, with its status (or always, without one), standing. */
export function aimsNearest(actor) {
  const rule = (actor?.type === "monster") ? nearestRule(actor) : null;
  if (!rule || !rulesOn() || GONE.some(id => actor.statuses.has(id))) return false;
  return !rule.status || has(actor, rule.status);
}

/** The token of an actor: a token actor's own, else its first active one (the viewed scene first). */
function tokenOf(actor) {
  if (actor?.token) return actor.token;
  const tokens = actor?.getActiveTokens?.(false, true) ?? [];
  return tokens.find(t => t.parent === canvas?.scene) ?? tokens[0] ?? null;
}

/** The squares a token covers: its first and last column and row, from its source place. */
function cellsOf(token) {
  const size = token.parent?.grid?.size || 100;
  const i0 = Math.round((token._source?.x ?? token.x) / size);
  const j0 = Math.round((token._source?.y ?? token.y) / size);
  return { i0, j0, i1: i0 + Math.max(1, toInt(token.width)) - 1, j1: j0 + Math.max(1, toInt(token.height)) - 1 };
}

/** The squares between two tokens (0 when they share one; a diagonal counts 2). */
export function squaresBetween(a, b) {
  const p = cellsOf(a);
  const q = cellsOf(b);
  const gap = (lo1, hi1, lo2, hi2) => Math.max(0, lo1 - hi2, lo2 - hi1);
  return gap(p.i0, p.i1, q.i0, q.i1) + gap(p.j0, p.j1, q.j0, q.j1);
}

/**
 * The creatures nearest to a token, of any side.
 * @param {TokenDocument} token
 * @returns {TokenDocument[]}
 */
export function nearestTo(token) {
  const others = (token?.parent?.tokens ?? []).filter(t => (t !== token) && t.actor && !t.hidden && (t.actor.type !== "pile")
    && !t.actor.getFlag(SYSTEM_ID, "rift") && !GONE.some(id => t.actor.statuses.has(id)));
  if (!others.length) return [];
  const far = new Map(others.map(t => [t, squaresBetween(token, t)]));
  const least = Math.min(...far.values());
  return others.filter(t => far.get(t) === least);
}

/**
 * What the rule says against a hostile skill aimed away from the nearest.
 * @param {Item} item
 * @param {Actor} actor
 * @param {Token[]} targets   The user's targets
 * @returns {string[]}
 */
export function nearestIssues(item, actor, targets) {
  if (!targets?.length || !aimsNearest(actor) || !isHostile(item)) return [];
  const token = tokenOf(actor);
  const nearest = token ? nearestTo(token) : [];
  if (!nearest.length || targets.some(t => nearest.includes(t.document ?? t))) return [];
  return [L("Bestiary.NearestOnly", { name: actorName(actor), targets: nearest.map(t => t.name).join(", ") })];
}

/** Its Main Process starts (on the primary GM): the nearest is targeted, and the chat says who. */
async function onMainProcess(combatant) {
  const actor = combatant?.actor;
  if (!aimsNearest(actor)) return;
  const token = combatant.token ?? tokenOf(actor);
  const nearest = token ? nearestTo(token) : [];
  if (!nearest.length) return;
  const pick = nearest[Math.floor(Math.random() * nearest.length)];
  if (canvas?.ready && (canvas.scene === token.parent)) pick.object?.setTarget(true, { releaseOthers: true });
  await postSummary(nearestRule(actor).item.name, [L((nearest.length > 1) ? "Bestiary.NearestTie" : "Bestiary.Nearest", {
    name: actorName(actor), target: pick.name, all: nearest.map(t => t.name).join(", ")
  })]);
}

/** Call during the `init` hook. */
export function registerNearest() {
  Hooks.on("updateCombat", (combat, changes) => {
    if (!rulesOn() || !isPrimaryGM()) return;
    const active = foundry.utils.getProperty(changes, "flags.eternia.active");
    if (!active || (combat.phase !== "main")) return;
    onMainProcess(combat.combatants.get(active)).catch(err => console.error(`${SYSTEM_ID} | Nearest failed`, err));
  });
}
