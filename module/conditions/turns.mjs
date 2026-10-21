/**
 * The conditions over the turns of a combat and as they come and go.
 *
 * - Start of a Main Process: [Poisoned] deals its Rating as direct damage; [Confused] raises the Hate by 1.
 * - [Paralyzed] and [Asleep] combatants lose their Main Process (they are skipped, see automation/round.mjs).
 * - End of the bearer's own Main Process: the statuses of END_OF_OWN_PROCESS end (automation/round.mjs).
 * - Cleanup Process: [Burning] deals its Rating as [Flame] damage, [Doom] counts down (at 0: Incapacitated), then
 *   the statuses of END_OF_ROUND end (automation/round.mjs calls cleanupConditions).
 * - A Major Action: [Shocked] deals its Rating as direct damage; it ends [Intangible] and [Hidden].
 * - Stacks: the third [Freezing] freezes ([Paralyzed]); the third [Fissured] breaks the guard ([Exposed], no
 *   [Barrier]); the stacks are cleared.
 * - [Awakened] ends with [Fatigue] equal to its Rating; [Swimming] puts out [Burning]; [Sealed] without a skill
 *   seals the last skill used; [Grappled] and [Bond] end when their source is Incapacitated.
 */
import { L, SYSTEM_ID } from "../settings.mjs";
import { isPrimaryGM, isLocalChange } from "../helpers/clients.mjs";
import { parseSkillField } from "../helpers/skill-fields.mjs";
import { statusDefinition } from "../helpers/statuses.mjs";
import { actorName, postSummary, toInt } from "../helpers/utils.mjs";
import { AFFLICTED_PROTECTS, END_OF_ROUND, STACK_THRESHOLDS } from "./catalog.mjs";
import { takeDamage } from "./damage.mjs";
import { addStatus, has, rating, removeStatuses, rulesOn, sameActor, sourcesOf } from "./rules.mjs";

const label = id => game.i18n.localize(`ETERNIA.StatusEffect.${id}`);

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
  const major = (action === "major") || (parseSkillField("timing", item.system.timing).type === "Major");
  if (!major) return;
  const shock = rating(actor, "shocked");
  if (shock > 0) await takeDamage(actor, shock, { reason: "shocked" });
  const ended = ["intangible", "hidden"].filter(id => has(actor, id));
  if (ended.length) await removeStatuses(actor, ended);
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
  // [Afflicted] keeps the statuses it protects ([Frightened]).
  const afflicted = has(actor, "afflicted");
  const ending = END_OF_ROUND.filter(id => has(actor, id) && !(afflicted && AFFLICTED_PROTECTS.includes(id)));
  if (ending.length) {
    await removeStatuses(actor, ending);
    lines.push(L("Conditions.RoundEnds", { name: actorName(actor), statuses: ending.map(label).join(", ") }));
  }
  return lines;
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
  // Effects that give [Burning] (skills, chat links) don't take on a swimmer; the GM can still set it in the sheet.
  if ((statusData.statusId === "burning") && has(actor, "swimming")) return false;
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
  if (effect.statuses?.has("swimming") && isLocalChange(options, userId) && has(actor, "burning")) {
    await removeStatuses(actor, ["burning"]);
  }
  // A source Incapacitated (by whoever applied the damage): what it holds ([Grappled]) or is bound to ([Bond]) is
  // freed, by the GM.
  if (effect.statuses?.has("incapacitated") && isPrimaryGM()) await freeFrom(actor);
}

/** End the [Grappled] and [Bond] that this actor gave, on every actor of the world and of the scenes. */
async function freeFrom(source) {
  const actors = [...game.actors];
  for (const scene of game.scenes) for (const token of scene.tokens) if (!token.actorLink && token.actor) actors.push(token.actor);
  for (const actor of actors) {
    for (const id of ["grappled", "bond"]) {
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
