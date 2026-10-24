/**
 * The conditions over the turns of a combat and as they come and go.
 *
 * - Setup Process: the Sun clock. For whoever has a Trait with `sunClock` (the Magia Sol), the [Sun] rises by 1 (up to
 *   SUN_NOON; SUN_NIGHT in a scene at least half dark); at noon it gives [The One] for the round, once per combat, and
 *   from then on it sets by 1 every round (automation/round.mjs calls setupConditions). A spell of that Magia raises
 *   it by 1 too, until noon.
 * - Start of a Main Process: [Poisoned] deals its Rating as direct damage; [Confused] raises the Hate by 1.
 * - [Paralyzed] and [Asleep] combatants lose their Main Process (they are skipped, see automation/round.mjs).
 * - End of the bearer's own Main Process: the statuses of END_OF_OWN_PROCESS end (automation/round.mjs).
 * - Cleanup Process: [Burning] and [Black Flame] deal their Rating as [Flame] damage, [Doom] counts down (at 0:
 *   Incapacitated), [Fuse] explodes (its Rating as [Flame] damage, then it ends), a [Servant] strikes the nearest enemy
 *   within 4 squares (its Rating as direct damage, with the tag of its effect), [The One] counts down (its Rating is
 *   the rounds it has left), then the statuses of END_OF_ROUND end (automation/round.mjs calls cleanupConditions).
 * - A Major Action: [Shocked] deals its Rating as direct damage; it ends [Intangible] and [Hidden] (not the
 *   [Hidden] of a skill that keeps it: the Fumaça's Trait, see helpers/magic-traits.mjs).
 * - Stacks: the third [Freezing] freezes ([Paralyzed]); the third [Fissured] breaks the guard ([Exposed], no
 *   [Barrier]); the stacks are cleared.
 * - [Awakened] ends with [Fatigue] equal to its Rating; [Swimming] and [Soaked] put out [Burning] (and don't catch it);
 *   [Sealed] without a skill seals the last skill used; [Grappled], [Bond] and [Black Flame] end when their source is
 *   Incapacitated.
 */
import { L, SYSTEM_ID } from "../settings.mjs";
import { isPrimaryGM, isLocalChange } from "../helpers/clients.mjs";
import { parseSkillField } from "../helpers/skill-fields.mjs";
import { statusDefinition } from "../helpers/statuses.mjs";
import { actorName, postSummary, toInt } from "../helpers/utils.mjs";
import { AFFLICTED_PROTECTS, END_OF_ROUND, STACK_THRESHOLDS, SUN_NIGHT, SUN_NOON } from "./catalog.mjs";
import { takeDamage } from "./damage.mjs";
import { addStatus, has, rating, removeStatuses, rulesOn, sameActor, sourcesOf, statusEffects } from "./rules.mjs";
import { keepsHidden, traitsFor } from "../helpers/magic-traits.mjs";
import { naturalEnd } from "./lasting.mjs";

const label = id => game.i18n.localize(`ETERNIA.StatusEffect.${id}`);

/** How far a [Servant] reaches (squares, counted like the attack cards). */
const SERVANT_REACH = 4;

/** Statuses that put out [Burning] when they come, and keep it from taking. */
const PUTS_OUT_FIRE = ["swimming", "soaked"];

/* -------------------------------------------- */
/*  Actions                                     */
/* -------------------------------------------- */

/**
 * After a skill is used: a Major Action sets off [Shocked] and ends [Intangible] and [Hidden]; the skill is the last
 * one used (for [Sealed]).
 * @param {Actor} actor
 * @param {Item} item
 * @param {string|null} action   The action it spent in the Main Process ("major"…), null outside a combat
 */
export async function afterAction(actor, item, action) {
  if (!actor?.isOwner || !rulesOn()) return;
  await actor.setFlag(SYSTEM_ID, "lastSkill", item.name).catch(() => null);
  // A spell of the Magia that keeps the Sun clock raises the Sun (in a combat, until noon).
  const combat = combatOf(actor);
  if (combat && traitsFor(actor, item).some(e => e.getFlag(SYSTEM_ID, "trait")?.sunClock)) await moveSun(actor, combat, { spell: true });
  const major = (action === "major") || (parseSkillField("timing", item.system.timing).type === "Major");
  if (!major) return;
  const shock = rating(actor, "shocked");
  if (shock > 0) await takeDamage(actor, shock, { reason: "shocked" });
  const ended = ["intangible", "hidden"].filter(id => has(actor, id) && !((id === "hidden") && keepsHidden(item, actor)));
  if (ended.length) await removeStatuses(actor, ended);
}

/* -------------------------------------------- */
/*  The Sun clock                               */
/* -------------------------------------------- */

/** The started combat an actor fights in (the viewed one first), or null. */
function combatOf(actor) {
  const fights = combat => combat?.started && combat.combatants.some(c => c.actor && sameActor(c.actor, actor));
  if (fights(game.combat)) return game.combat;
  return game.combats?.find(fights) ?? null;
}

/** Whether a combat's scene is night: at least half dark (the scene's own darkness). */
function isNight(combat) {
  const scene = combat?.scene ?? canvas?.scene ?? null;
  return Number(scene?.environment?.darknessLevel ?? 0) >= 0.5;
}

/** Whether an actor keeps the Sun clock: an active Trait with `sunClock` (the Magia Sol). */
function keepsSunClock(actor) {
  return [...(actor?.allApplicableEffects?.() ?? [])].some(e => e.active && e.getFlag(SYSTEM_ID, "trait")?.sunClock);
}

/**
 * The Sun moves for an actor in a combat: before noon it rises by 1 (up to SUN_NOON, SUN_NIGHT at night); reaching
 * noon gives [The One] for the round, once per combat; after noon, every Setup Process sets it by 1 and spells no
 * longer raise it.
 * @param {Actor} actor
 * @param {Combat} combat
 * @param {object} [options]
 * @param {boolean} [options.spell]   Raised by a spell (nothing after noon) rather than by the round
 * @returns {Promise<string|null>}    A line for the chat
 */
async function moveSun(actor, combat, { spell = false } = {}) {
  const current = rating(actor, "sun");
  const afterNoon = actor.getFlag(SYSTEM_ID, "sunNoon") === combat.id;
  if (afterNoon) {
    if (spell || (current <= 0)) return null;
    await actor.update({ "system.bad-status.sun": current - 1 });
    return L("Conditions.SunSets", { name: actorName(actor), n: current - 1 });
  }
  const cap = isNight(combat) ? SUN_NIGHT : SUN_NOON;
  const next = Math.min(current + 1, cap);
  if (next <= current) return null;
  await actor.update({ "system.bad-status.sun": next });
  if (next < SUN_NOON) return L("Conditions.SunRises", { name: actorName(actor), n: next });
  // Noon: [The One] for the rest of the round.
  await actor.setFlag(SYSTEM_ID, "sunNoon", combat.id);
  await addStatus(actor, "theOne", 1);
  const line = L("Conditions.Noon", { name: actorName(actor) });
  if (spell) await postSummary(label("theOne"), [line]);
  return line;
}

/**
 * The conditions of one actor in the Setup Process of a combat: the Sun clock. Called by automation/round.mjs for
 * everyone in the combat, on the GM that started the phase.
 * @param {Actor} actor
 * @param {Combat} combat
 * @returns {Promise<string[]>}   Lines for the chat
 */
export async function setupConditions(actor, combat) {
  if (!rulesOn() || !keepsSunClock(actor)) return [];
  const line = await moveSun(actor, combat);
  return line ? [line] : [];
}

/* -------------------------------------------- */
/*  Main Process and Cleanup                    */
/* -------------------------------------------- */

/** A combatant's Main Process starts: [Poisoned] and [Confused]. Runs on the primary GM. */
async function onMainProcessStart(combat, combatant) {
  const actor = combatant?.actor;
  if (!actor || actor.statuses.has("dead") || actor.statuses.has("incapacitated")) return;
  const poison = rating(actor, "poisoned");
  if (poison > 0) await takeDamage(actor, poison, { reason: "poisoned" });
  if (has(actor, "confused") && (actor.type === "character")) {
    const hate = toInt(actor._source.system.infos?.hate);
    await actor.update({ "system.infos.hate": hate + 1 });
    await postSummary(label("confused"), [L("Conditions.ConfusedHate", { name: actorName(actor), hate: hate + 1 })]);
  }
}

/**
 * The conditions of one actor in the Cleanup Process: [Burning] and [Doom], then the statuses that end with the
 * round. Called by automation/round.mjs for everyone in the combat.
 * @param {Actor} actor
 * @returns {Promise<string[]>}   Lines for the Cleanup summary
 */
export async function cleanupConditions(actor) {
  if (!rulesOn()) return [];
  const lines = [];
  const burn = rating(actor, "burning");
  if (burn > 0) {
    const result = await takeDamage(actor, burn, { reason: "burning", tag: "Flame", silent: true });
    if (result) lines.push(result.line);
  }
  const blackFlame = rating(actor, "blackFlame");
  if (blackFlame > 0) {
    const result = await takeDamage(actor, blackFlame, { reason: "blackFlame", tag: "Flame", silent: true });
    if (result) lines.push(result.line);
  }
  const doom = rating(actor, "doom");
  if (doom > 0) {
    const next = doom - 1;
    await actor.update({ "system.bad-status.doom": next });
    if (next <= 0) {
      if (!actor.statuses.has("incapacitated")) await actor.toggleStatusEffect("incapacitated", { active: true });
      lines.push(L("Conditions.DoomFalls", { name: actorName(actor) }));
    }
    else lines.push(L("Conditions.DoomCount", { name: actorName(actor), n: next }));
  }
  const fuse = rating(actor, "fuse");
  if (fuse > 0) {
    await removeStatuses(actor, ["fuse"]);
    const result = await takeDamage(actor, fuse, { reason: "fuse", tag: "Flame", silent: true });
    if (result) lines.push(result.line);
  }
  const strike = await servantStrike(actor);
  if (strike) lines.push(strike.line);
  // [The One] counts down: its Rating is the rounds it has left (the end of an extended one leaves [Fatigue]).
  const one = rating(actor, "theOne");
  if (one > 0) {
    await actor.update({ "system.bad-status.theOne": one - 1 });
    lines.push(L((one > 1) ? "Conditions.TheOneLasts" : "Conditions.TheOneEnds", { name: actorName(actor) }));
  }
  // [Afflicted] keeps the statuses it protects ([Frightened]); an infinite effect or a renewal, the ones it holds
  // (conditions/lasting.mjs).
  const afflicted = has(actor, "afflicted");
  const ending = await naturalEnd(actor, END_OF_ROUND.filter(id => has(actor, id) && !(afflicted && AFFLICTED_PROTECTS.includes(id))));
  if (ending.length) {
    await removeStatuses(actor, ending);
    lines.push(L("Conditions.RoundEnds", { name: actorName(actor), statuses: ending.map(label).join(", ") }));
  }
  return lines;
}

/**
 * [Servant]: the servant strikes the nearest enemy within SERVANT_REACH squares of its master's token (the other side
 * by disposition, not down): the Rating as direct damage, with the tag of the servant's effect (a shadow soldier's
 * [Blight]), through takeDamage.
 * @param {Actor} actor
 * @returns {Promise<{loss: number, line: string}|null>}
 */
async function servantStrike(actor) {
  const value = rating(actor, "servant");
  if ((value <= 0) || !canvas.ready) return null;
  const token = actor.token?.object ?? actor.getActiveTokens(true)[0];
  const side = token?.document.disposition ?? 0;
  if (!token || !side) return null;
  const at = canvas.grid.getOffset(token.center);
  const [nearest] = canvas.tokens.placeables
    .filter(t => (t !== token) && t.actor && (t.document.disposition === -side)
      && !t.actor.statuses.has("incapacitated") && !t.actor.statuses.has("dead"))
    .map(t => {
      const p = canvas.grid.getOffset(t.center);
      return { actor: t.actor, squares: Math.abs(p.i - at.i) + Math.abs(p.j - at.j) };
    })
    .filter(e => e.squares <= SERVANT_REACH)
    .sort((a, b) => a.squares - b.squares);
  if (!nearest) return null;
  const effect = statusEffects(actor, "servant")
    .sort((a, b) => toInt(b.getFlag(SYSTEM_ID, "statusData")?.value) - toInt(a.getFlag(SYSTEM_ID, "statusData")?.value))[0];
  const tag = effect?.getFlag(SYSTEM_ID, "statusData")?.tag ?? "";
  return takeDamage(nearest.actor, value, {
    what: L("Conditions.ServantStrike", { name: actorName(actor) }), from: actor, tag, silent: true
  });
}

/** Whose Main Process starts: the combatant set active by this update. */
function onUpdateCombat(combat, changes, options, userId) {
  if (!rulesOn() || !isPrimaryGM()) return;
  const active = foundry.utils.getProperty(changes, "flags.eternia.active");
  if (!active || (combat.phase !== "main")) return;
  const combatant = combat.combatants.get(active);
  onMainProcessStart(combat, combatant).catch(err => console.error(`${SYSTEM_ID} | Main Process conditions failed`, err));
}

/* -------------------------------------------- */
/*  Coming and going                            */
/* -------------------------------------------- */

/** Rating fields before an update, to see what reached a threshold or ended. */
function onPreUpdateActor(actor, changes, options) {
  if (!foundry.utils.hasProperty(changes, "system.bad-status")) return;
  const bad = actor._source.system?.["bad-status"] ?? {};
  options.eterniaConditions = { awakened: toInt(bad.awakened), freezing: toInt(bad.freezing), fissured: toInt(bad.fissured) };
}

async function onUpdateActor(actor, changes, options, userId) {
  if (!rulesOn() || !isLocalChange(options, userId) || !options.eterniaConditions) return;
  const bad = actor._source.system?.["bad-status"] ?? {};
  const before = options.eterniaConditions;

  // [Awakened] ends: [Fatigue] equal to its Rating (characters).
  if ((before.awakened > 0) && !toInt(bad.awakened) && (actor.type === "character")) {
    const fatigue = toInt(actor._source.system.infos?.fatigue) + before.awakened;
    await actor.update({ "system.infos.fatigue": fatigue });
    await postSummary(label("awakened"), [L("Conditions.AwakenedEnds", { name: actorName(actor), n: before.awakened })]);
  }

  // Thresholds of the stacks
  for (const [id, rule] of Object.entries(STACK_THRESHOLDS)) {
    const max = statusDefinition(id)?.stack ?? 0;
    const value = toInt(bad[id]);
    if (!max || (value < max) || (before[id] >= max)) continue;
    const updates = { [`system.bad-status.${id}`]: 0 };
    if (rule.breakBarrier) updates["system.bad-status.barrier"] = 0;
    await actor.update(updates);
    for (const to of rule.to) await addStatus(actor, to);
    await postSummary(label(id), [L(`Conditions.Threshold.${id}`, { name: actorName(actor) })]);
  }
}

/** A status comes: a swimmer doesn't catch [Burning]; [Sealed] without a skill seals the last one used. */
function onPreCreateEffect(effect, data, options, userId) {
  if ((userId !== game.user.id) || !rulesOn()) return;
  const actor = effect.parent;
  if (!(actor instanceof Actor)) return;
  const statusData = effect.getFlag(SYSTEM_ID, "statusData") ?? {};
  // Effects that give [Burning] (skills, chat links) don't take on a swimmer or a [Soaked] actor; the GM can still set
  // it in the sheet.
  const burns = (statusData.statusId === "burning") || effect.statuses?.has("burning");
  if (burns && PUTS_OUT_FIRE.some(id => has(actor, id))) return false;
  if (!effect.statuses?.has("sealed") || statusData.tag) return;
  const skill = actor.getFlag(SYSTEM_ID, "lastSkill");
  if (!skill) return;
  effect.updateSource({
    name: `${label("sealed")} (${skill})`,
    [`flags.${SYSTEM_ID}.statusData`]: { ...statusData, statusId: "sealed", tag: skill }
  });
}

async function onCreateEffect(effect, options, userId) {
  const actor = effect.parent;
  if (!rulesOn() || !(actor instanceof Actor)) return;
  if (PUTS_OUT_FIRE.some(id => effect.statuses?.has(id)) && isLocalChange(options, userId) && has(actor, "burning")) {
    await removeStatuses(actor, ["burning"]);
  }
  // A source Incapacitated (by whoever applied the damage): what it holds ([Grappled]) or is bound to ([Bond]) is
  // freed, by the GM.
  if (effect.statuses?.has("incapacitated") && isPrimaryGM()) await freeFrom(actor);
}

/** End the [Grappled], [Bond] and [Black Flame] that this actor gave, on every actor of the world and of the scenes. */
async function freeFrom(source) {
  const actors = [...game.actors];
  for (const scene of game.scenes) for (const token of scene.tokens) if (!token.actorLink && token.actor) actors.push(token.actor);
  for (const actor of actors) {
    for (const id of ["grappled", "bond", "blackFlame"]) {
      if (!has(actor, id) || !sourcesOf(actor, id).some(s => sameActor(s, source))) continue;
      await removeStatuses(actor, [id]);
      await postSummary(label(id), [L("Conditions.Freed", { name: actorName(actor), status: label(id), source: actorName(source) })]);
    }
  }
}

/** Call during the `init` hook. */
export function registerConditionTurns() {
  Hooks.on("updateCombat", onUpdateCombat);
  Hooks.on("preUpdateActor", onPreUpdateActor);
  Hooks.on("updateActor", (...args) => onUpdateActor(...args).catch(err => console.error(`${SYSTEM_ID} | Condition update failed`, err)));
  Hooks.on("preCreateActiveEffect", onPreCreateEffect);
  Hooks.on("createActiveEffect", (...args) => onCreateEffect(...args).catch(err => console.error(`${SYSTEM_ID} | Condition effect failed`, err)));
}
