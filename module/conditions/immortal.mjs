/**
 * The Immortal (the Magia Fonte da Juventude) and what goes with it.
 *
 * - A Trait with `immortal: { regen }` (a formula): in a combat, its bearer has [Regen] of that Rating, given again in
 *   every Setup Process when it has less (stripped, it comes back the next round; [Black Flame] still stops it). The
 *   Extra Breath of the Trait is the common `revive` flag (conditions/damage.mjs).
 * - `healTaken` on an effect (a fraction: the Tabu's 0.5): the healing of spells and items is multiplied by it, the
 *   lowest one counting: the healing cards (helpers/combat-cards.mjs) and `takeHealing` (a Drain, a Gift:
 *   conditions/damage.mjs), not the body's own (`natural`: the [Regen] of the Cleanup Process, or acting now).
 * - `cover` on an effect given to an ally (Escudo de Carne): the next attack that hits that ally hits its giver
 *   instead. The giver takes the damage the ally would take (after the ally's Defense and [Cancel]) as direct damage,
 *   and nothing of the attack reaches the ally (helpers/combat-cards.mjs); the effect ends with that damage
 *   (`consumeOn: "damage"`).
 * - `hpCost` on a skill (a formula): HP its user pays when using it, never the last one; Undo gives it back
 *   (automation/use.mjs).
 * - The use actions `regenNow` (the user's [Regen] heals now, as in the Cleanup Process) and `giveHp` (the user gives
 *   `value` HP to an ally, never its last one: Dádiva).
 */
import { L, SYSTEM_ID } from "../settings.mjs";
import { actorName, combatActors, postSummary, toInt, wrap } from "../helpers/utils.mjs";
import { evaluateFormula, formulaData, isFormula } from "../helpers/effect-formulas.mjs";
import { takeDamage, takeHealing } from "./damage.mjs";
import { addStatus, rating, rulesOn, sameActor } from "./rules.mjs";
import { registerUseAction } from "./effects.mjs";

const label = id => game.i18n.localize(`ETERNIA.StatusEffect.${id}`);

/** The active effects of an actor with this flag (its own and its items' passive ones). */
const effectsWith = (actor, key) => [...(actor?.allApplicableEffects?.() ?? [])].filter(e => e.active && (e.getFlag(SYSTEM_ID, key) !== undefined));

/** A formula of an effect or a skill, worked out for an actor. */
const valueOf = (value, actor, item) => Math.max(0, (isFormula(value) ? evaluateFormula(value, formulaData(actor, item)) : toInt(value)) || 0);

/** The actor of a uuid (a token's gives its actor), or null. */
function actorOf(uuid) {
  const doc = uuid ? fromUuidSync(uuid) : null;
  const actor = (doc instanceof TokenDocument) ? doc.actor : doc;
  return (actor instanceof Actor) ? actor : null;
}

/* -------------------------------------------- */
/*  Regen in the Setup Process                  */
/* -------------------------------------------- */

/** The [Regen] an actor's Immortal Traits give (the highest), 0 without one. */
function immortalRegen(actor) {
  return Math.max(0, ...[...(actor?.allApplicableEffects?.() ?? [])]
    .filter(e => e.active && e.getFlag(SYSTEM_ID, "trait")?.immortal)
    .map(e => valueOf(e.getFlag(SYSTEM_ID, "trait").immortal.regen, actor, e.parent)));
}

/** The Setup Process of a round: the Immortal get their [Regen] back. */
async function setupImmortals(combat) {
  const lines = [];
  const gmLines = [];
  for (const actor of combatActors(combat)) {
    if (actor.statuses.has("dead") || actor.statuses.has("incapacitated")) continue;
    const regen = immortalRegen(actor);
    if (!regen || (rating(actor, "regen") >= regen)) continue;
    await addStatus(actor, "regen", regen);
    if (rating(actor, "regen") < regen) continue;
    (actor.hasPlayerOwner ? lines : gmLines).push(L("Immortal.Regen", { name: actorName(actor), n: regen }));
  }
  if (lines.length || gmLines.length) await postSummary(L("Immortal.Title"), lines, gmLines);
}

/* -------------------------------------------- */
/*  Healing halved, the covering blow           */
/* -------------------------------------------- */

/**
 * The healing a damage card gives an actor under its `healTaken` effects (the Tabu of the Fountain of Youth: half).
 * @param {Actor} actor
 * @param {number} amount
 * @returns {{amount: number, note: string}}
 */
export function healTaken(actor, amount) {
  const effects = rulesOn() ? effectsWith(actor, "healTaken") : [];
  if (!effects.length) return { amount, note: "" };
  const factor = Math.min(...effects.map(e => Number(e.getFlag(SYSTEM_ID, "healTaken"))).filter(n => Number.isFinite(n) && (n >= 0)), 1);
  const effect = effects.find(e => Number(e.getFlag(SYSTEM_ID, "healTaken")) === factor) ?? effects[0];
  const reduced = Math.floor(Math.max(0, amount) * factor);
  return { amount: reduced, note: (reduced < amount) ? ` (${L("Immortal.HealCut", { name: effect.name, n: amount - reduced })})` : "" };
}

/**
 * [Flesh Shield]: whoever covers an actor takes the blow instead. Called by the damage card once it knows the damage
 * (after the Defense and [Cancel]); null when nobody covers the actor.
 * @param {Actor} actor
 * @param {object} card
 * @param {number} amount
 * @returns {{line: string, after: Function}|null}
 */
export function coverFor(actor, card, amount) {
  if (!rulesOn() || card.recovery) return null;
  const attacker = card.itemUuid ? (fromUuidSync(card.itemUuid)?.actor ?? null) : null;
  for (const effect of effectsWith(actor, "cover")) {
    const protector = actorOf(effect.getFlag(SYSTEM_ID, "source")?.casterUuid);
    if (!protector || sameActor(protector, actor) || (attacker && sameActor(protector, attacker))) continue;
    if (protector.statuses.has("dead") || protector.statuses.has("incapacitated")) continue;
    const n = Math.max(0, toInt(amount));
    return {
      line: L("Immortal.Cover", { name: actorName(protector), n, what: effect.name }),
      after: async () => {
        if (n > 0) await takeDamage(protector, n, { what: effect.name, from: actor });
      }
    };
  }
  return null;
}

/* -------------------------------------------- */
/*  HP as a cost                                */
/* -------------------------------------------- */

/** The HP a skill costs its user (`flags.eternia.hpCost`), 0 when none. */
export function hpCostOf(item, actor) {
  const cost = item?.getFlag?.(SYSTEM_ID, "hpCost");
  return cost ? valueOf(cost, actor, item) : 0;
}

/**
 * Pay a skill's HP cost: never the last HP. Returns what was paid (for the Undo), or 0.
 * @param {Item} item
 * @param {Actor} actor
 * @returns {Promise<number>}
 */
export async function payHpCost(item, actor) {
  const cost = hpCostOf(item, actor);
  const hp = toInt(actor.system.health?.value);
  const paid = Math.max(0, Math.min(cost, hp - 1));
  if (paid > 0) await actor.update({ "system.health.value": hp - paid });
  return paid;
}

/** Undo: the HP a use paid comes back. */
export async function refundHpCost(actor, paid) {
  if (!actor?.isOwner || !(paid > 0)) return;
  const hp = Math.min(toInt(actor.system.health?.value) + paid, toInt(actor.system.health?.max));
  await actor.update({ "system.health.value": hp });
}

/* -------------------------------------------- */
/*  Use actions                                 */
/* -------------------------------------------- */

/**
 * regenNow: the actor's [Regen] heals it now, as in the Cleanup Process (healing that stops it stops this too; a Tabu
 * that halves the healing of spells doesn't: it is the body's own).
 */
async function regenNow(actor) {
  const regen = rating(actor, "regen");
  if (regen <= 0) return L("Immortal.NoRegen", { name: actorName(actor), status: label("regen") });
  const result = await takeHealing(actor, regen, { what: label("regen"), silent: true, natural: true });
  return result?.line ?? L("Immortal.FullHp", { name: actorName(actor) });
}

/** giveHp: the caster gives HP to an ally (never its last one), as healing the ally takes. */
async function giveHp(ally, { value, casterUuid }) {
  const caster = actorOf(casterUuid);
  if (!caster || sameActor(caster, ally)) return null;
  const side = actor => (actor.token ?? actor.getActiveTokens(true)[0]?.document ?? actor.prototypeToken)?.disposition;
  if (side(caster) !== side(ally)) return L("Immortal.NotAlly", { name: actorName(caster), ally: actorName(ally) });
  const hp = toInt(caster.system.health?.value);
  const amount = Math.max(0, Math.min(toInt(value), hp - 1));
  if (!amount) return L("Immortal.NoHpToGive", { name: actorName(caster) });
  const healed = await takeHealing(ally, amount, { what: L("Immortal.Gift"), from: caster, silent: true });
  const given = Math.max(0, toInt(healed?.gain));
  if (given > 0) await caster.update({ "system.health.value": hp - given });
  return L("Immortal.Gave", { name: actorName(caster), ally: actorName(ally), n: given, line: healed?.line ?? "" });
}

/** Call during the `init` hook. */
export function registerImmortal() {
  wrap(CONFIG.Combat.documentClass.prototype, "_onPhaseStart", async function (original, phase, round, previous) {
    await original.call(this, phase, round, previous);
    const backwards = !!previous && (round < previous.round);
    if ((phase !== "setup") || backwards || !rulesOn()) return;
    await setupImmortals(this).catch(err => console.error(`${SYSTEM_ID} | Immortal failed`, err));
  });
  registerUseAction("regenNow", actor => regenNow(actor));
  registerUseAction("giveHp", (actor, payload) => giveHp(actor, payload));
}
