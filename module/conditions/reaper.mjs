/**
 * The Reaper (the Magia Selo do Ceifador): life sealed by a death god, for good.
 *
 * [Reaped] (`reaped`, an Other status: it doesn't end with the scene) takes its Rating off the Max HP: a character's in
 * its derived data (documents/actor.mjs), a monster's in conditions/derived.mjs. Who sealed how much is kept in
 * `flags.eternia.reaped = [{ by, name, n }]` (`by` the sealer's uuid; the sealer's own price under its own uuid); the
 * Rating is their sum, a running count only these rules change.
 * - A spell's `seal` (a formula of the caster): its damage card seals that much on each target the blow reached
 *   (helpers/combat-cards.mjs applyDamage, in the same update as the HP, which falls with the Max HP; the Undo gives it
 *   back).
 * - A skill's `selfSeal` (a number): the death god's price, sealed on the user when it uses the skill
 *   (automation/use.mjs; the Undo gives it back).
 * - A creature with life sealed by someone falls: the death god is paid with its soul, and each of its sealers gets 1
 *   of its own price back (the GM's window).
 * - A sealer dies for good: every life it sealed comes back (the GM's window), on the actors of the world and on the
 *   tokens of the scenes.
 * - An effect with `sealStriker` (a formula of its bearer): whoever deals damage to the bearer with a damage card has
 *   that much life sealed by the bearer (the Guarda do Ceifador).
 * - An effect with `diesAtSceneEnd`: its bearer dies when its scene ends (automation/scenes.mjs: the death god takes
 *   the soul it was promised).
 */
import { L, SYSTEM_ID } from "../settings.mjs";
import { registerHandler, request } from "../piles/pile-socket.mjs";
import { isPrimaryGM } from "../helpers/clients.mjs";
import { worldActors } from "../helpers/world-actors.mjs";
import { actorName, postSummary, toInt } from "../helpers/utils.mjs";
import { evaluateFormula, formulaData, isFormula } from "../helpers/effect-formulas.mjs";
import { rulesOn, sameActor } from "./rules.mjs";

const FLAG = "reaped";
const label = () => game.i18n.localize("ETERNIA.StatusEffect.reaped");

/** The record of who sealed an actor's life: [{ by, name, n }]. */
export function reapedOf(actor) {
  const list = actor?.getFlag?.(SYSTEM_ID, FLAG);
  return Array.isArray(list) ? list.filter(e => e?.by && (toInt(e.n) > 0)) : [];
}

/** The life sealed on an actor, all of it (the Rating). */
export const reapedTotal = actor => reapedOf(actor).reduce((total, e) => total + toInt(e.n), 0);

/**
 * The update that seals `n` more of an actor's life by `by` (or gives back, with n below 0): the record, the Rating and
 * the HP, which can't stay above the Max HP that is left.
 * @param {Actor} actor
 * @param {number} n
 * @param {{uuid: string, name: string}} by
 * @param {number} [hp]   The HP the update leaves otherwise (the damage of the same blow)
 * @returns {{updates: object, total: number, added: number}}
 */
export function sealUpdates(actor, n, by, hp = toInt(actor.system.health?.value)) {
  const list = reapedOf(actor).map(e => ({ ...e }));
  const entry = list.find(e => e.by === by.uuid);
  const before = entry ? toInt(entry.n) : 0;
  const next = Math.max(0, before + toInt(n));
  if (entry) entry.n = next;
  else if (next > 0) list.push({ by: by.uuid, name: by.name, n: next });
  const kept = list.filter(e => toInt(e.n) > 0);
  const total = kept.reduce((t, e) => t + toInt(e.n), 0);
  const added = next - before;
  // The Max HP the seal leaves (the derived one already counts the seals before this one)
  const max = Math.max(0, toInt(actor.system.health?.max) - added);
  return {
    updates: { [`flags.${SYSTEM_ID}.${FLAG}`]: kept, "system.bad-status.reaped": total, "system.health.value": Math.min(hp, max) },
    total, added
  };
}

/**
 * Seal (or give back) life on an actor, by its owner or through the GM.
 * @param {Actor} actor
 * @param {number} n
 * @param {Actor|{uuid: string, name: string}} by
 * @param {object} [options]
 * @param {boolean} [options.silent]   No chat line
 * @returns {Promise<string|null>}     The chat line
 */
export async function sealLife(actor, n, by, { silent = false } = {}) {
  if (!actor || !toInt(n)) return null;
  const who = { uuid: by?.uuid ?? "", name: (by instanceof Actor) ? actorName(by) : (by?.name ?? "") };
  if (!actor.isOwner) return (await request("reaperSeal", { actorUuid: actor.uuid, n: toInt(n), by: who, silent }))?.line ?? null;
  const { updates, total, added } = sealUpdates(actor, n, who);
  if (!added) return null;
  await actor.update(updates);
  const line = L(added > 0 ? "Reaper.Sealed" : "Reaper.Freed", { name: actorName(actor), n: Math.abs(added), total });
  if (!silent) await postSummary(label(), [line]);
  return line;
}

/** GM side of sealLife. */
async function onSealRequest({ actorUuid, n, by, silent }) {
  const actor = await fromUuid(actorUuid).catch(() => null);
  if (!(actor instanceof Actor)) return { ok: false };
  return { ok: true, line: await sealLife(actor, n, by, { silent }) };
}

/* -------------------------------------------- */
/*  The price                                   */
/* -------------------------------------------- */

/** A skill's price in life (`flags.eternia.selfSeal`), 0 without one. */
export function selfSealOf(item, actor) {
  const value = item?.getFlag?.(SYSTEM_ID, "selfSeal");
  if (!value) return 0;
  return Math.max(0, (isFormula(value) ? evaluateFormula(value, formulaData(actor, item)) : toInt(value)) || 0);
}

/**
 * The death god's price when a skill is used: that much of the user's own life, sealed by itself. Returns what was
 * sealed (for the Undo).
 * @param {Item} item
 * @param {Actor} actor
 * @returns {Promise<number>}
 */
export async function paySelfSeal(item, actor) {
  const n = rulesOn() ? selfSealOf(item, actor) : 0;
  if (!n) return 0;
  await sealLife(actor, n, actor, { silent: true });
  await postSummary(item.name, [L("Reaper.Price", { name: actorName(actor), n, total: reapedTotal(actor) })]);
  return n;
}

/** Undo: the price a use paid comes back. */
export async function refundSelfSeal(actor, n) {
  if (actor?.isOwner && (n > 0)) await sealLife(actor, -n, actor, { silent: true });
}

/* -------------------------------------------- */
/*  A damage card's seal                        */
/* -------------------------------------------- */

/** A skill's seal (`flags.eternia.seal`), worked out for its user when its damage card is made. */
export function cardSeal(item, attacker) {
  const value = item?.flags?.[SYSTEM_ID]?.seal;
  if (!value || !rulesOn()) return 0;
  return Math.max(0, (isFormula(value) ? evaluateFormula(value, formulaData(attacker ?? item.actor, item)) : toInt(value)) || 0);
}

/* -------------------------------------------- */
/*  Falls and deaths                            */
/* -------------------------------------------- */

/** A creature with sealed life fell: each of its sealers gets 1 of its own price back. */
async function onFall(effect, options, userId) {
  if (!effect.statuses?.has("incapacitated") || !isPrimaryGM() || !rulesOn()) return;
  const fallen = effect.parent;
  if (!(fallen instanceof Actor)) return;
  const lines = [];
  for (const entry of reapedOf(fallen)) {
    const sealer = fromUuidSync(entry.by);
    if (!(sealer instanceof Actor) || sameActor(sealer, fallen)) continue;
    const own = reapedOf(sealer).find(e => e.by === sealer.uuid);
    if (!own) continue;
    await sealLife(sealer, -1, sealer, { silent: true });
    lines.push(L("Reaper.Paid", { name: actorName(sealer), fallen: actorName(fallen), total: reapedTotal(sealer) }));
  }
  if (lines.length) await postSummary(label(), lines);
}

/** A sealer died for good: the lives it sealed come back, everywhere. */
async function onDeath(effect, options, userId) {
  if (!effect.statuses?.has("dead") || !isPrimaryGM()) return;
  const dead = effect.parent;
  if (!(dead instanceof Actor)) return;
  const lines = [];
  // Every actor that may carry a seal: the world's and the unlinked tokens' of the scenes (only the tokens with a seal of
  // the dead have their actors built: helpers/world-actors.mjs)
  const sealedByDead = flags => Array.isArray(flags[FLAG]) && flags[FLAG].some(e => e?.by === dead.uuid);
  for (const actor of worldActors({ flags: sealedByDead })) {
    if (sameActor(actor, dead)) continue;
    const entry = reapedOf(actor).find(e => e.by === dead.uuid);
    if (!entry) continue;
    await sealLife(actor, -toInt(entry.n), { uuid: dead.uuid, name: entry.name }, { silent: true });
    lines.push(L("Reaper.Released", { name: actorName(actor), n: toInt(entry.n), sealer: actorName(dead) }));
  }
  if (lines.length) await postSummary(label(), lines);
}

/**
 * The life a bearer of `sealStriker` seals on whoever hurts it with a damage card (conditions/damage.mjs afterDamage:
 * before the effect, spent by that same blow, goes).
 * @param {Actor} actor
 * @returns {number}
 */
export function sealStrikerOf(actor) {
  if (!rulesOn()) return 0;
  let total = 0;
  for (const effect of actor?.allApplicableEffects?.() ?? []) {
    const value = effect.active ? effect.getFlag(SYSTEM_ID, "sealStriker") : null;
    if (!value) continue;
    total += Math.max(0, (isFormula(value) ? evaluateFormula(value, formulaData(actor, effect.sourceItem ?? null)) : toInt(value)) || 0);
  }
  return total;
}

/**
 * The end of a scene for an actor whose soul was promised (`diesAtSceneEnd`): it dies. Called by automation/scenes.mjs.
 * @param {Actor} actor
 * @returns {Promise<string|null>}   The line of the summary
 */
export async function reaperAtSceneEnd(actor) {
  if (!actor || actor.statuses.has("dead") || !rulesOn()) return null;
  const promise = [...(actor.allApplicableEffects?.() ?? [])].find(e => e.active && e.getFlag(SYSTEM_ID, "diesAtSceneEnd"));
  if (!promise) return null;
  const { die } = await import("../automation/death.mjs");
  await die(actor);
  return L("Reaper.Taken", { name: actorName(actor) });
}

/** Call during the `init` hook. */
export function registerReaper() {
  registerHandler("reaperSeal", onSealRequest);
  const fail = what => err => console.error(`${SYSTEM_ID} | ${what} failed`, err);
  Hooks.on("createActiveEffect", (effect, options, userId) => onFall(effect, options, userId).catch(fail("The Reaper's due")));
  Hooks.on("createActiveEffect", (effect, options, userId) => onDeath(effect, options, userId).catch(fail("The Reaper's release")));
}
