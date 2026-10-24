/**
 * Round flow (Rules III.b ROUND STRUCTURE, VI.a STATUSES).
 *
 * - Setup Process: the Sun clock of conditions/turns.mjs (setupConditions); a summary is posted when it moves.
 * - Cleanup Process: [Regen] heals (not a [Cursed] character, nor one with [Black Flame]), then [Decay] deals its
 *   Rating as damage through [Barrier] ("perform the effects that would heal first"); a summary is posted.
 * - [Staggered], [Dazed] and the other statuses of END_OF_OWN_PROCESS (conditions/catalog.mjs) end at the end of
 *   the affected character's Main Process; [Afflicted] keeps the ones it protects.
 * - The conditions of the Cleanup ([Burning], [Doom], the statuses that end with the round) and the combatants
 *   that lose their Main Process ([Paralyzed], [Asleep]): see conditions/turns.mjs.
 * - Incapacitated: at 0 HP, or 0 Max HP from Fatigue; a character made Incapacitated above 0 HP drops
 *   to 0. Incapacitated, Dead and Absent combatants are always Post-Action: their turn is skipped.
 * - The end of a started combat is the end of the scene of those who fought in it (scenes.mjs).
 *
 * The phase work runs once, on the GM window that changed the phase (the system's own hook point,
 * EterniaCombat#_onPhaseStart); the rest on the window that made the change.
 */
import { L, SYSTEM_ID, setting } from "../settings.mjs";
import { isLocalChange } from "../helpers/clients.mjs";
import { actorName, combatActors, outOfAction, postSummary, toInt, wrap } from "../helpers/utils.mjs";
import { bumpCounter, endOfSceneFor } from "./scenes.mjs";
import { AFFLICTED_PROTECTS, END_OF_OWN_PROCESS } from "../conditions/catalog.mjs";
import { cleanupConditions, setupConditions } from "../conditions/turns.mjs";
import { losesTurn } from "../conditions/actions.mjs";
import { has, removeStatuses } from "../conditions/rules.mjs";
import { naturalEnd } from "../conditions/lasting.mjs";

/** Call during the `init` hook. */
export function registerRound() {
  const proto = CONFIG.Combat.documentClass.prototype;

  wrap(proto, "_onPhaseStart", async function (original, phase, round, previous) {
    await original.call(this, phase, round, previous);
    // Stepping back into the previous round's Cleanup doesn't run it again.
    const backwards = !!previous && (round < previous.round);
    if ((phase === "cleanup") && !backwards && setting("cleanup")) {
      await cleanup(this, round).catch(err => console.error(`${SYSTEM_ID} | Cleanup Process failed`, err));
    }
    if ((phase === "setup") && !backwards) {
      await setup(this, round).catch(err => console.error(`${SYSTEM_ID} | Setup Process failed`, err));
    }
  });

  wrap(proto, "_advance", function (original, state) {
    return original.call(this, skipLostTurns(this, setting("incapacitated") ? skipOutOfAction(this, state) : state));
  });

  // Who was Post-Action before a combat update, to find whose Main Process just ended.
  Hooks.on("preUpdateCombat", (combat, changes, options) => {
    options.eterniaActed = [...(combat.progress?.acted ?? [])];
  });
  Hooks.on("updateCombat", onUpdateCombat);
  Hooks.on("updateActor", onUpdateActor);
  Hooks.on("createActiveEffect", onCreateEffect);
  Hooks.on("deleteCombat", onDeleteCombat);
}

/* -------------------------------------------- */
/*  Setup Process                               */
/* -------------------------------------------- */

/**
 * The Sun clock for everyone in the combat (conditions/turns.mjs).
 * @param {Combat} combat
 * @param {number} round
 */
async function setup(combat, round) {
  const lines = [];
  const gmLines = [];
  for (const actor of combatActors(combat)) {
    if (actor.statuses.has("dead") || actor.statuses.has("incapacitated")) continue;
    (actor.hasPlayerOwner ? lines : gmLines).push(...await setupConditions(actor, combat));
  }
  if (lines.length || gmLines.length) {
    const scene = combat.scene?.name ? ` · ${combat.scene.name}` : "";
    await postSummary(L("Round.SetupTitle", { round }) + scene, lines, gmLines);
  }
}

/* -------------------------------------------- */
/*  Cleanup Process                             */
/* -------------------------------------------- */

/**
 * [Regen] then [Decay] for everyone in the combat.
 * @param {Combat} combat
 * @param {number} round
 */
async function cleanup(combat, round) {
  const lines = [];
  const gmLines = [];
  for (const actor of combatActors(combat)) {
    if (actor.statuses.has("dead") || actor.statuses.has("incapacitated")) continue;
    const bad = actor.system["bad-status"] ?? {};
    // A [Cursed] character, or one with [Black Flame], recovers no HP (conditions/damage.mjs).
    const regen = (has(actor, "cursed") || has(actor, "blackFlame")) ? 0 : toInt(bad.regen);
    const decay = toInt(bad.decay);
    const own = actor.hasPlayerOwner ? lines : gmLines;
    // [Burning], [Doom] and the statuses that end with the round (conditions/turns.mjs)
    const conditionLines = async () => own.push(...await cleanupConditions(actor));
    if ((regen <= 0) && (decay <= 0)) {
      await conditionLines();
      continue;
    }

    const max = toInt(actor.system.health?.max);
    let hp = toInt(actor.system.health?.value);
    const parts = [];
    const updates = {};
    if (regen > 0) {
      const healed = Math.max(0, Math.min(regen, max - hp));
      hp += healed;
      parts.push(L("Round.Regen", { n: healed }));
    }
    if (decay > 0) {
      const barrier = toInt(bad.barrier);
      const absorbed = Math.min(barrier, decay);
      if (absorbed) updates["system.bad-status.barrier"] = barrier - absorbed;
      hp = Math.max(0, hp - (decay - absorbed));
      parts.push(L("Round.Decay", { n: decay - absorbed }) + (absorbed ? ` ${L("Round.Barrier", { n: absorbed })}` : ""));
    }
    updates["system.health.value"] = hp;
    await actor.update(updates);
    const line = L("Round.Line", { name: actorName(actor), parts: parts.join(", "), hp, max });
    own.push(line);
    await conditionLines();
  }
  if (lines.length || gmLines.length) {
    const scene = combat.scene?.name ? ` · ${combat.scene.name}` : "";
    await postSummary(L("Round.CleanupTitle", { round }) + scene, lines, gmLines);
  }
}

/* -------------------------------------------- */
/*  Main Process, Incapacitated                 */
/* -------------------------------------------- */

/** Make Incapacitated / Dead / Absent combatants Post-Action before the next one is chosen. */
function skipOutOfAction(combat, state) {
  const skipped = combat.combatants
    .filter(c => !state.acted.includes(c.id) && (c.id !== state.active) && outOfAction(c))
    .map(c => c.id);
  return skipped.length ? { ...state, acted: [...state.acted, ...skipped] } : state;
}

/**
 * [Paralyzed] and [Asleep] combatants lose their Main Process: they become Post-Action without acting (their
 * Main Process ends, so [Paralyzed] ends with it). A line in the chat says so.
 */
function skipLostTurns(combat, state) {
  const skipped = combat.combatants.filter(c => !state.acted.includes(c.id) && (c.id !== state.active) && c.actor
    && !c.actor.statuses.has("incapacitated") && !c.actor.statuses.has("dead") && losesTurn(c.actor));
  if (!skipped.length) return state;
  // Only the next one in the Initiative Process is skipped now: the others keep their place until their turn.
  const next = combat._nextActor(state);
  if (!next || !skipped.includes(next)) return state;
  const statuses = ["paralyzed", "asleep"].filter(id => has(next.actor, id));
  postSummary(L("Conditions.LostTurnTitle"), [L("Conditions.LostTurn", {
    name: next.name, statuses: statuses.map(id => game.i18n.localize(`ETERNIA.StatusEffect.${id}`)).join(", ")
  })]).catch(() => null);
  return skipLostTurns(combat, { ...state, acted: [...state.acted, next.id] });
}

/** Main Processes that just ended: [Staggered], [Dazed] and the other statuses of END_OF_OWN_PROCESS end with them. */
async function onUpdateCombat(combat, changes, options, userId) {
  if (!setting("endOfProcess") || !isLocalChange(options, userId)) return;
  const acted = foundry.utils.getProperty(changes, "flags.eternia.acted");
  if (!Array.isArray(acted)) return;
  const before = options.eterniaActed ?? [];
  for (const id of acted.filter(id => !before.includes(id))) {
    const actor = combat.combatants.get(id)?.actor;
    if (!actor) continue;
    const afflicted = actor.statuses.has("afflicted");
    // Not those an infinite effect holds, nor a renewed one (conditions/lasting.mjs)
    const ending = await naturalEnd(actor, END_OF_OWN_PROCESS.filter(status => has(actor, status) && !(afflicted && AFFLICTED_PROTECTS.includes(status))));
    if (ending.length) {
      await removeStatuses(actor, ending).catch(err => console.error(`${SYSTEM_ID} | Could not end the statuses of ${actor.uuid}`, err));
    }
  }
}

/** HP or Fatigue changed: Incapacitated at 0 HP (characters also at 0 Max HP). */
function onUpdateActor(actor, changes, options, userId) {
  if (!setting("incapacitated") || !isLocalChange(options, userId)) return;
  if (!foundry.utils.hasProperty(changes, "system.health") && !foundry.utils.hasProperty(changes, "system.infos.fatigue")) return;
  // After the system's own reaction (its damage card marks Incapacitated right after the update).
  setTimeout(() => checkIncapacitated(actor).catch(err => console.error(`${SYSTEM_ID} | Incapacitated check failed`, err)), 250);
}

async function checkIncapacitated(actor) {
  if (actor.statuses.has("incapacitated") || actor.statuses.has("dead")) return;
  const hp = toInt(actor.system.health?.value);
  const max = toInt(actor.system.health?.max);
  // No Max HP yet (a character without a class, an empty monster sheet) isn't a defeat;
  // 0 Max HP from Fatigue is.
  const fatigued = (actor.type === "character") && (toInt(actor.system.infos?.fatigue) > 0);
  const down = ((max > 0) && (hp <= 0)) || ((max <= 0) && fatigued);
  if (down) await actor.toggleStatusEffect("incapacitated", { active: true });
}

/** A character made Incapacitated above 0 HP drops to 0 HP. */
async function onCreateEffect(effect, options, userId) {
  if (!setting("incapacitated") || !isLocalChange(options, userId)) return;
  if (!effect.statuses?.has("incapacitated")) return;
  const actor = effect.parent;
  if ((actor instanceof Actor) && (toInt(actor.system.health?.value) > 0)) {
    await actor.update({ "system.health.value": 0 });
  }
}

/* -------------------------------------------- */
/*  End of the scene                            */
/* -------------------------------------------- */

/** A started combat was deleted: the scene ends for everyone who fought in it. */
async function onDeleteCombat(combat, options, userId) {
  if (!isLocalChange(options, userId) || !combat.started) return;
  const lines = [];
  for (const actor of combatActors(combat)) {
    try {
      await bumpCounter(actor, "scene");
      if (setting("endOfScene")) {
        const line = await endOfSceneFor(actor);
        if (line) lines.push(line);
      }
    }
    catch (err) {
      console.error(`${SYSTEM_ID} | Could not end the scene of ${actor.uuid}`, err);
    }
  }
  if (lines.length) await postSummary(L("Scene.Title"), lines);
}
