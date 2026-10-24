/**
 * The conditions of Eternia (docs/condicoes.md): 52 statuses added to the 23 of the base rules, every one of them
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
 *                   status or after a roll) and the use actions of skills;
 * - lasting.mjs     what lasts longer than its rule: the infinite effects (Infinito) and the renewed statuses;
 * - status-actions.mjs  the use actions that change many statuses at once (promote, demote, double, raise, cancel);
 * - distance.mjs    the Taboo that keeps a Magia's spells off engaged targets, the Dodge against Close attacks;
 * - decree.mjs      the Decrees (the Magia Mandamentos): a law around its bearer, whoever breaks it is cursed;
 * - blows.mjs       what a hit does besides its damage (execution, the blows that don't kill, Ratings lowered);
 * - souls.mjs       effects that reach the creatures around their bearer (eating souls, the harvest, cleansing);
 * - forms.mjs       the Forms of a weapon (one per group) and the status given to whoever strikes their bearer;
 * - copies.mjs      the copies that act for their bearer: a reaction that doesn't count, a blow taken, a status needed;
 * - transformations.mjs  the spells counted per scene that transform, the Seven Hearts, falling when it ends;
 * - omen.mjs        the Omen: dice kept at the start of a combat to replace dice of the attack cards (Visão);
 * - window.mjs      acting out of turn: a window of actions outside the Main Process (Lampejo);
 * - immortal.mjs    the Immortal's Regen, healing halved, the blow taken for an ally, HP as a cost (Fonte da Juventude);
 * - realm.mjs       an area around a caster that follows a rule (Reino do Caos).
 * The statuses themselves are registered with the others (helpers/statuses.mjs).
 */
import { registerConditionDamage } from "./damage.mjs";
import { registerConditionTurns } from "./turns.mjs";
import { registerConditionMovement } from "./actions.mjs";
import { registerConditionEffects } from "./effects.mjs";
import { registerDecree } from "./decree.mjs";
import { registerSouls } from "./souls.mjs";
import { registerConditionForms } from "./forms.mjs";
import { registerConditionTransformations } from "./transformations.mjs";
import { registerOmen } from "./omen.mjs";
import { registerImmortal } from "./immortal.mjs";
import { registerRealm } from "./realm.mjs";

/** Call during the `init` hook. */
export function registerConditions() {
  registerConditionDamage();
  registerConditionTurns();
  registerConditionMovement();
  registerConditionEffects();
  registerDecree();
  registerSouls();
  registerConditionForms();
  registerConditionTransformations();
  registerOmen();
  registerImmortal();
  registerRealm();
}
