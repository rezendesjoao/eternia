/**
 * Classes (docs/classes.md): the class Motors (motor.mjs, one file per class), how they follow the round (the
 * start and end of a combat, the Setup and Cleanup Processes) and the combat cards (attacks declared, Dodge
 * Checks, enemies brought to 0 HP), the class tab of the character sheet, the Path and Apex given by Character
 * Rank, and the macro API (game.eternia.motor).
 *
 * The round work runs once, on the GM window that changed the phase (EterniaCombat#_onPhaseStart, as in
 * automation/round.mjs); the card events on the window that rolled or applied them. A Motor written by
 * someone who doesn't own the actor goes through the GM (motor.mjs setMotor).
 */
import { SYSTEM_ID } from "../settings.mjs";
import { isLocalChange } from "../helpers/clients.mjs";
import { combatActors, wrap } from "../helpers/utils.mjs";
import {
  addToMotor, changeMotor, motorData, motorEvent, motorMax, motorsOf, registerMotor, registerMotorSocket, setMotor
} from "./motor.mjs";
import { SAMURAI } from "./samurai.mjs";

/** Order of the Round Progression phases, to tell a step forward from a step back. */
const ORDER = { briefing: 0, setup: 1, main: 2, cleanup: 3 };

/** Call during the `init` hook. */
export function registerClasses() {
  registerMotor(SAMURAI);
  registerMotorSocket();

  wrap(CONFIG.Combat.documentClass.prototype, "_onPhaseStart", async function (original, phase, round, previous) {
    await original.call(this, phase, round, previous);
    await onPhase(this, phase, round, previous)
      .catch(err => console.error(`${SYSTEM_ID} | Class Motors: ${phase} of round ${round} failed`, err));
  });
  Hooks.on("deleteCombat", onDeleteCombat);
  Hooks.on("eternia.attack", onAttack);
  Hooks.on("eternia.dodge", onDodge);
  Hooks.on("eternia.defeated", onDefeated);
}

/** The macro API: game.eternia.motor. */
export const MOTOR_API = {
  get: motorData, set: setMotor, change: changeMotor, add: addToMotor, max: motorMax, of: motorsOf
};

/* -------------------------------------------- */
/*  The round                                   */
/* -------------------------------------------- */

/**
 * A Setup or Cleanup Process began: the start of the combat (round 1's Setup, from the Briefing), then the
 * Setup or Cleanup of every actor with a Motor. Steps back (the GM undoing a phase) do nothing.
 */
async function onPhase(combat, phase, round, previous) {
  if (!["setup", "cleanup"].includes(phase)) return;
  const before = previous ?? { round: 0, phase: "briefing" };
  const forward = (round > before.round) || ((round === before.round) && (ORDER[phase] > (ORDER[before.phase] ?? 0)));
  if (!forward) return;
  const starting = (phase === "setup") && (before.round === 0);
  for (const actor of combatActors(combat)) {
    if (!motorsOf(actor).length) continue;
    if (starting) await motorEvent(actor, "onCombatStart", combat);
    if (phase === "setup") await motorEvent(actor, "onSetup", combat, round);
    else await motorEvent(actor, "onCleanup", combat, round);
  }
}

/** A started combat was deleted: the Motors go back to how a combat starts. */
async function onDeleteCombat(combat, options, userId) {
  if (!isLocalChange(options, userId) || !combat.started) return;
  for (const actor of combatActors(combat)) {
    if (motorsOf(actor).length) await motorEvent(actor, "onCombatEnd", combat);
  }
}

/* -------------------------------------------- */
/*  Combat cards                                */
/* -------------------------------------------- */

/** An attack was declared: its targets' Motors hear of it (the Samurai's Flowing Water). */
async function onAttack(message, { item, attacker, targets }) {
  for (const actor of targets ?? []) {
    if (motorsOf(actor).length) await motorEvent(actor, "onAttacked", attacker, item, message);
  }
}

/** A character dodged an attack (the Samurai's Waiting Blade and Water Mirror). */
async function onDodge(message, { actor, attacker, item, hit }) {
  if ((hit === false) && motorsOf(actor).length) await motorEvent(actor, "onDodged", attacker, item, message);
}

/** A damage card brought an actor to 0 HP: the attacker's Motors hear of it (Chiburi, Eclipse). */
async function onDefeated(actor, card) {
  const attacker = card?.attackerUuid ? fromUuidSync(card.attackerUuid) : null;
  if (!(attacker instanceof Actor) || !motorsOf(attacker).length) return;
  const item = card.itemUuid ? fromUuidSync(card.itemUuid) : null;
  await motorEvent(attacker, "onKill", actor, item, card);
}
