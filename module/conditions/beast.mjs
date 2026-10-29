/**
 * The Beast of the coat (the Magia Manto Devorador).
 * - An effect with `retaliate: { reach, value }` (the Trait; a formula of its bearer): when an enemy within `reach`
 *   squares declares an attack on the bearer, the beast bites first, hit or miss: `value` direct damage on the attacker
 *   (on the attacker's window, the hook eternia.attack; the GM applies it when the attacker doesn't own the bearer).
 * - An effect with `cough: { chance, damage }` (the Taboo): at the start of each of its bearer's Main Processes in a
 *   combat, a 1d6; at `chance` or less, the lungs give out: the Major Action of that Main Process is spent and the
 *   bearer takes `damage` (a formula) as direct damage (conditions/turns.mjs).
 * The beast's Corte do Espaço is a blow from afar that doesn't cross (`spaceCut`, conditions/passage.mjs).
 */
import { L, SYSTEM_ID } from "../settings.mjs";
import { actorName, postSummary, toInt } from "../helpers/utils.mjs";
import { evaluateFormula, formulaData, isFormula } from "../helpers/effect-formulas.mjs";
import { rulesOn, sameActor } from "./rules.mjs";
import { opposed } from "./blows.mjs";
import { takeDamage } from "./damage.mjs";
import { squaresBetween } from "./passage.mjs";

const valueOf = (value, actor, effect) => Math.max(0, (isFormula(value)
  ? evaluateFormula(value, formulaData(actor, effect?.sourceItem ?? null)) : toInt(value)) || 0);

const tokenOf = actor => (canvas?.ready ? (actor?.token?.object ?? actor?.getActiveTokens?.(true)?.[0] ?? null) : null);

/** An attack was declared (the attacker's window): the beasts of its targets bite. */
async function onAttack(message, { attacker, targets }) {
  if (!rulesOn() || !attacker) return;
  for (const target of targets ?? []) {
    if (!target || sameActor(target, attacker) || !opposed(target, attacker)) continue;
    for (const effect of target.allApplicableEffects?.() ?? []) {
      const bite = effect.active ? effect.getFlag(SYSTEM_ID, "retaliate") : null;
      if (!bite) continue;
      const reach = Math.max(0, toInt(bite.reach ?? 1));
      if (squaresBetween(tokenOf(target), tokenOf(attacker)) > reach) continue;
      const n = valueOf(bite.value, target, effect);
      if (n > 0) await takeDamage(attacker, n, { what: effect.name, from: target });
    }
  }
}

/**
 * The cough at the start of a Main Process (called by conditions/turns.mjs): the line, or null.
 * @param {Actor} actor
 * @param {Combat} combat
 * @returns {Promise<string|null>}
 */
export async function coughAtTurnStart(actor, combat) {
  if (!rulesOn() || !combat) return null;
  const effect = [...(actor.allApplicableEffects?.() ?? [])].find(e => e.active && e.getFlag(SYSTEM_ID, "cough"));
  if (!effect) return null;
  const cough = effect.getFlag(SYSTEM_ID, "cough");
  const roll = await new Roll("1d6").evaluate();
  if (roll.total > Math.max(1, toInt(cough.chance ?? 1))) return null;
  const { spendAction } = await import("../automation/use.mjs");
  await spendAction(actor, "major");
  const damage = valueOf(cough.damage, actor, effect);
  const hurt = damage ? await takeDamage(actor, damage, { what: effect.name, silent: true }) : null;
  const line = L("Beast.Cough", { name: actorName(actor), n: roll.total }) + (hurt ? ` · ${hurt.line}` : "");
  await postSummary(effect.name, [line]);
  return line;
}

/** Call during the `init` hook. */
export function registerBeast() {
  Hooks.on("eternia.attack", (message, context) => onAttack(message, context)
    .catch(err => console.error(`${SYSTEM_ID} | The beast's bite failed`, err)));
}
