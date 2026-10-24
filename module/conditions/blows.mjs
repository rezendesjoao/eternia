/**
 * What a hit does besides its damage and its statuses, read when a damage card is applied (helpers/combat-cards.mjs
 * applyDamage calls blowOutcome before the defender's conditions, and hitApplies to filter the on-hit statuses). The
 * keys go on a skill's flags or on a Magia's Trait (`flags.eternia.trait`, helpers/magic-traits.mjs), worked out for the
 * attacker when the card is applied:
 *   execute   { targetTags, below }: a target with one of the tags (any target, without tags) that ends the hit with
 *             `below` HP or less (a formula of the attacker: "@cr*5") falls at once, 0 HP: the Arca's Purge.
 *   lower     [{ statusId, by }]: a target that already has the status loses `by` (1 by default) of its Rating; a
 *             [Doom] that reaches 0 fells it (the Praga's Trait: the hour comes).
 *   convert   { from: to }: the target's status `from` turns into `to` with the same Rating (O Soberano's Trait:
 *             [Empowered] → [Weakened], [Regen] → [Decay]).
 * On an effect of the attacker (a Taboo, `conditions: inCombat`):
 *   noKill    true: its damage cards stop at 1 HP. Only the conditions fell (the Praga's Taboo).
 * On a defender's effect:
 *   healingHurts "allySpell": the healing an ally's spell would give turns into direct damage (O Soberano's Taboo;
 *             the card's healing branch treats it like [Inversion]: allySpellHurts).
 * And the conditional on-hit statuses (hitStatuses): `targetTags` (only on a target with one of the tags) and
 * `belowHp` (only on a target that ends the hit with that many HP or less, worked out when the card is made).
 */
import { L, SYSTEM_ID } from "../settings.mjs";
import { actorName, toInt } from "../helpers/utils.mjs";
import { evaluateFormula, formulaData, isFormula } from "../helpers/effect-formulas.mjs";
import { actorHasTag, traitsFor } from "../helpers/magic-traits.mjs";
import { statusDefinition } from "../helpers/statuses.mjs";
import { areAllies } from "../classes/motor.mjs";
import { rating, rulesOn, sameActor } from "./rules.mjs";

const label = id => game.i18n.localize(`ETERNIA.StatusEffect.${id}`);

/** A formula of the attacker, or a number. */
const amountOf = (value, data) => (isFormula(value) ? evaluateFormula(value, data) : toInt(value)) || 0;

/** The skill of a damage card, and who attacked with it. */
function cardSource(card) {
  const item = card.itemUuid ? fromUuidSync(card.itemUuid) : null;
  const attacker = (card.attackerUuid ? fromUuidSync(card.attackerUuid) : null) ?? item?.actor ?? null;
  return { item, attacker: (attacker instanceof Actor) ? attacker : null };
}

/** Whether an actor's damage doesn't kill: an active effect with `noKill` (the Praga's Taboo, in a combat). */
export function spares(actor) {
  return [...(actor?.allApplicableEffects?.() ?? [])].some(e => e.active && e.getFlag(SYSTEM_ID, "noKill"));
}

/**
 * What the skill and the attacker's Traits do to a defender once the HP of a hit is known: the mercy of an attacker
 * that doesn't kill, an execution, the Ratings it lowers and the bonuses it turns inside out. The changes go in the
 * same update as the HP (the Undo's snapshot keeps the fields).
 * @param {Actor} actor
 * @param {object} card                 The damage card data
 * @param {object} state
 * @param {number} state.hp             The HP the hit leaves
 * @param {number} state.before         The HP before it
 * @param {number} state.hpLoss         The damage that passed [Barrier]
 * @param {boolean} state.reached       Whether the attack reached the defender ([Counter], [The One] and immunities
 *                                      stop it)
 * @returns {{hp: number, hpLoss: number, lines: string[], updates: object}}
 */
export function blowOutcome(actor, card, { hp, before, hpLoss, reached }) {
  const out = { hp, hpLoss, lines: [], updates: {} };
  if (!rulesOn() || card.recovery || (before <= 0)) return out;
  const { item, attacker } = cardSource(card);
  if (!attacker) return out;
  const fell = () => {
    out.hp = 0;
    out.hpLoss = Math.max(out.hpLoss, before);
  };

  // An attacker that doesn't kill: the hit stops at 1 HP.
  const mercy = spares(attacker);
  if (mercy && (out.hp <= 0)) {
    out.hp = 1;
    out.hpLoss = Math.min(out.hpLoss, before - 1);
    out.lines.push(L("Conditions.Blows.Spared", { name: actorName(actor) }));
  }
  if (!reached) return out;
  const sources = [item?.flags?.[SYSTEM_ID] ?? {}, ...traitsFor(attacker, item).map(e => e.getFlag(SYSTEM_ID, "trait") ?? {})];
  const data = formulaData(attacker, item);

  // Execution: a target of those tags left low enough falls (not by an attacker that spares).
  const execute = mercy ? null : sources.map(s => s.execute).find(e => e && ((e.targetTags ?? []).length === 0
    || [].concat(e.targetTags).some(t => actorHasTag(actor, t))));
  if (execute && (out.hp > 0)) {
    const below = amountOf(execute.below, data);
    if (out.hp <= below) {
      fell();
      out.lines.push(L("Conditions.Blows.Executed", { name: actorName(actor), n: below }));
    }
  }

  // Ratings lowered: only of a status the target already had ([Doom] at 0 fells, whatever the attacker).
  const lowered = {};
  for (const lower of sources.flatMap(s => s.lower ?? [])) {
    const def = statusDefinition(lower?.statusId);
    const current = lowered[lower?.statusId] ?? rating(actor, lower?.statusId);
    if (!def?.path || !def.rated || !(current > 0)) continue;
    const next = Math.max(0, current - Math.max(1, amountOf(lower.by ?? 1, data)));
    lowered[lower.statusId] = next;
    out.updates[`system.${def.path}`] = next;
    if ((lower.statusId === "doom") && (next <= 0)) {
      fell();
      out.lines.push(L("Conditions.DoomFalls", { name: actorName(actor) }));
    }
    else out.lines.push(L("Conditions.Blows.Lowered", { name: actorName(actor), status: label(lower.statusId), n: next }));
  }

  // Bonuses turned inside out: the same Rating, as the other status.
  for (const [from, to] of sources.flatMap(s => Object.entries(s.convert ?? {}))) {
    const fromDef = statusDefinition(from);
    const toDef = statusDefinition(to);
    const n = rating(actor, from);
    if (!fromDef?.path || !toDef?.path || !(n > 0) || (out.updates[`system.${fromDef.path}`] === 0)) continue;
    out.updates[`system.${fromDef.path}`] = 0;
    out.updates[`system.${toDef.path}`] = Math.max(toInt(out.updates[`system.${toDef.path}`]), rating(actor, to), n);
    out.lines.push(L("Conditions.Blows.Converted", { name: actorName(actor), from: label(from), to: label(to), n }));
  }
  return out;
}

/**
 * Whether an on-hit status of a card reaches this defender: `targetTags` (one of the tags) and `belowHp` (the HP the
 * hit left, at most).
 * @param {Actor} actor
 * @param {{targetTags?: string[], belowHp?: number|null}} status
 * @param {number} hp
 * @returns {boolean}
 */
export function hitApplies(actor, status, hp) {
  const tags = [].concat(status?.targetTags ?? []);
  if (tags.length && !tags.some(t => actorHasTag(actor, t))) return false;
  return !Number.isFinite(status?.belowHp) || (hp <= status.belowHp);
}

/**
 * Whether the healing of a card turns into damage on this actor: an active effect with `healingHurts` ("allySpell":
 * a [Spell] of an ally, not the actor's own; O Soberano's Taboo, in a combat).
 * @param {Actor} actor
 * @param {object} card     The damage card data (healing)
 * @returns {string|null}   The name of the effect that turns it, or null
 */
export function allySpellHurts(actor, card) {
  if (!rulesOn() || !card?.recovery) return null;
  const taboo = [...(actor?.allApplicableEffects?.() ?? [])].find(e => e.active && (e.getFlag(SYSTEM_ID, "healingHurts") === "allySpell"));
  if (!taboo) return null;
  const { item, attacker } = cardSource(card);
  if (!attacker || sameActor(attacker, actor) || !areAllies(attacker, actor)) return null;
  return (item?.system?.tags ?? []).some(t => String(t).toLowerCase() === "spell") ? taboo.name : null;
}
