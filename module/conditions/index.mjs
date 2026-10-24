/**
 * The conditions of Eternia (docs/condicoes.md): 31 statuses added to the 23 of the base rules, every one of them
 * automated.
 * - catalog.mjs     the new statuses and what each status does (tables read by the other parts);
 * - rules.mjs       whether an actor has a status, its Rating, who gave it, the settings;
 * - rolls.mjs       dice and damage the conditions add to checks, Dodge Checks and Damage Rolls;
 * - actions.mjs     what they forbid (actions, targets, moving the token) and the actions of [Hasted] / [Slowed];
 * - damage.mjs      damage and healing under them, and the damage they deal themselves;
 * - turns.mjs       the start and end of a Main Process, the Cleanup, the stacks, what comes and goes with them;
 * - derived.mjs     Defense, Speed and Initiative under them;
 * - recovery.mjs    ending one by spending an action of the Main Process;
 * - effects.mjs     what some effects do besides their changes (immunity, Fatigue when they end, ending with a
 *                   status or after a roll) and the use actions of skills.
 * - decree.mjs      the Decrees (the Magia Mandamentos): a law around its bearer, whoever breaks it is cursed.
 * The statuses themselves are registered with the others (helpers/statuses.mjs).
 */
import { registerConditionDamage } from "./damage.mjs";
import { registerConditionTurns } from "./turns.mjs";
import { registerConditionMovement } from "./actions.mjs";
import { registerConditionEffects } from "./effects.mjs";
import { registerDecree } from "./decree.mjs";

/** Call during the `init` hook. */
export function registerConditions() {
  registerConditionDamage();
  registerConditionTurns();
  registerConditionMovement();
  registerConditionEffects();
  registerDecree();
}
