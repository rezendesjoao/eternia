/**
 * Getting out by a test (docs/condicoes.md): an effect with `flags.eternia.escape = { check, dc }` holds its Bad Status
 * until its bearer wins a test. The Livrar-se of the action HUD (conditions/recovery.mjs) spends the action of the rule
 * and rolls `check` (a character's check, "athletics" by default: the Strength test; a monster rolls its Resistance)
 * against `dc`, as the checks against a difficulty go (more than it; a fumble fails, a critical wins). Failing, the
 * action is spent and the status stays. Whoever a monster engulfed gets out like this (bestiary/engulf.mjs).
 */
import { L, SYSTEM_ID } from "../settings.mjs";
import { actorName, toInt } from "../helpers/utils.mjs";
import { diceFormula } from "../helpers/dice.mjs";
import { applyModifier, checkModifier, consumeAfterRoll } from "./rolls.mjs";
import { statusEffects } from "./rules.mjs";

const label = id => game.i18n.localize(`ETERNIA.StatusEffect.${id}`);

/** The check an actor rolls to get out: its own for a character, the Resistance for a monster. */
const statOf = (actor, check) => ((actor?.type === "character") ? (check || "athletics") : "resistance");

/** The name of a check ("Atletismo"). */
const checkLabel = stat => game.i18n.localize(`ETERNIA.Check.${stat.charAt(0).toUpperCase()}${stat.slice(1)}`);

/**
 * The test that ends a status of an actor (the first of its effects with `escape`), or null.
 * @param {Actor} actor
 * @param {string} id
 * @returns {{effect: ActiveEffect, stat: string, dc: number}|null}
 */
export function escapeOf(actor, id) {
  const effect = statusEffects(actor, id).find(e => e.getFlag(SYSTEM_ID, "escape"));
  if (!effect) return null;
  const { check = "athletics", dc = 10 } = effect.getFlag(SYSTEM_ID, "escape");
  return { effect, stat: statOf(actor, check), dc: toInt(dc) };
}

/** The test of a status for the HUD's hint ("e Atletismo contra 10"), or "". */
export function escapeText(actor, id) {
  const test = escapeOf(actor, id);
  return test ? L("Conditions.Escape.Hint", { check: checkLabel(test.stat), dc: test.dc }) : "";
}

/**
 * Roll the test that ends a status, when it has one.
 * @param {Actor} actor
 * @param {string} id
 * @returns {Promise<{success: boolean, line: string}|null>}   null: the status asks no test
 */
export async function escapeTest(actor, id) {
  const test = escapeOf(actor, id);
  if (!test) return null;
  const own = actor.system.checks?.[test.stat] ?? {};
  const condition = checkModifier(actor, { stat: test.stat });
  const base = { dice: Math.max(1, toInt(own.dice) || 2), mod: toInt((actor.type === "monster") ? own.mod : own.total) };
  const roll = await new Roll(diceFormula(applyModifier(base, condition))).evaluate();
  const dice = roll.dice[0]?.results.map(r => r.result) ?? [];
  const fumble = (dice.length > 0) && dice.every(r => r === 1);
  const critical = !fumble && (dice.filter(r => r === 6).length >= 2);
  const success = !fumble && (critical || (roll.total > test.dc));
  const names = { name: actorName(actor), check: checkLabel(test.stat), n: roll.total, dc: test.dc, status: label(id) };
  await roll.toMessage({
    speaker: ChatMessage.getSpeaker({ actor }),
    flavor: `${L("Conditions.Escape.Flavor", names)}${condition.text ? ` (${condition.text})` : ""}`
  });
  await consumeAfterRoll(actor, condition.consume);
  return { success, line: L(success ? "Conditions.Escape.Done" : "Conditions.Escape.Failed", names) };
}
