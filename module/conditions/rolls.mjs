/**
 * Dice and damage the conditions add to rolls.
 *
 * Checks (skill Checks, the checks of the sheets and of the HUD):
 * - −1D: [Staggered] on Major / Main Process skills, [Confused] and [Swimming] on every check, [Blinded] on every
 *   check but Resistance, [Frightened] against its source, [Prone] on its own Close attacks.
 * - +1D: [Focused] (then it ends), [Awakened] on Accuracy.
 * Dodge Checks: −1D for [Dazed], [Paralyzed], [Rooted], [Berserk], [Marked], [Confused], [Swimming], [Blinded]
 * (against Evasion), [Poisoned] (against Resistance), [Prone] (against Close attacks) and [Charmed] (against its
 * source); +1D for [Focused]. [Asleep] fails it outright. The dice never go below 1D.
 * Damage Rolls: +Rating for [Empowered], [Berserk] and [Awakened].
 */
import { parseSkillField } from "../helpers/skill-fields.mjs";
import { parseRange } from "../helpers/hands.mjs";
import { has, isSourceOf, rating, removeStatuses, rulesOn } from "./rules.mjs";

const label = id => game.i18n.localize(`ETERNIA.StatusEffect.${id}`);

/** Whether a skill attacks in Close range (Range "Close", or the weapon's when it is Close, or [Melee Attack]). */
export function isCloseAttack(item, actor) {
  if (!item) return false;
  if ((item.system.tags ?? []).some(t => /^melee attack$/i.test(String(t).trim()))) return true;
  return parseRange(item.system.range, actor ?? item.actor) === 0;
}

/** A running total of dice and modifiers with the statuses that gave them. */
function tally() {
  const parts = [];
  return {
    dice: 0, mod: 0, parts, consume: [],
    add(id, dice = 0, mod = 0) {
      this.dice += dice;
      this.mod += mod;
      if (dice || mod) parts.push(`${label(id)} ${dice ? `${dice > 0 ? "+" : ""}${dice}D` : `${mod > 0 ? "+" : ""}${mod}`}`);
    },
    /** "Confuso −1D, Concentrado +1D" for the roll's flavor. */
    get text() { return parts.join(", ").replace(/-/g, "−"); }
  };
}

/**
 * What the conditions of an actor change in one of its checks.
 * @param {Actor} actor
 * @param {object} [context]
 * @param {Item} [context.item]        The skill rolled (its Timing, range and stat)
 * @param {string} [context.stat]      The check ("accuracy", "athletics"…)
 * @param {Actor[]} [context.targets]  Who the check is made against
 * @returns {{dice: number, mod: number, text: string, consume: string[]}}
 */
export function checkModifier(actor, { item = null, stat = "", targets = [] } = {}) {
  const t = tally();
  if (!actor || !rulesOn()) return t;
  const timing = item ? parseSkillField("timing", item.system.timing).type : "";
  if (has(actor, "staggered") && ["Major", "Main Process"].includes(timing)) t.add("staggered", -1);
  if (has(actor, "confused")) t.add("confused", -1);
  if (has(actor, "swimming")) t.add("swimming", -1);
  if (has(actor, "blinded") && (stat !== "resistance")) t.add("blinded", -1);
  if (has(actor, "frightened") && targets.some(target => isSourceOf(actor, "frightened", target))) t.add("frightened", -1);
  if (has(actor, "prone") && item && isCloseAttack(item, actor)) t.add("prone", -1);
  if (has(actor, "awakened") && (stat === "accuracy")) t.add("awakened", 1);
  if (has(actor, "focused")) {
    t.add("focused", 1);
    t.consume.push("focused");
  }
  return t;
}

/**
 * What the conditions of a defender change in its Dodge Check.
 * @param {Actor} actor
 * @param {object} [context]
 * @param {"evasion"|"resistance"} [context.vs]
 * @param {Actor} [context.attacker]
 * @param {Item} [context.item]   The attack
 * @returns {{dice: number, mod: number, text: string, consume: string[], autoFail: boolean}}
 */
export function dodgeModifier(actor, { vs = "evasion", attacker = null, item = null } = {}) {
  const t = tally();
  t.autoFail = false;
  if (!actor) return t;
  // [Dazed] is a rule of the base system: it stays on with the conditions' automation off.
  if (has(actor, "dazed")) t.add("dazed", -1);
  if (!rulesOn()) return t;
  if (has(actor, "asleep")) t.autoFail = true;
  for (const id of ["paralyzed", "rooted", "berserk", "marked", "confused", "swimming"]) if (has(actor, id)) t.add(id, -1);
  if (has(actor, "blinded") && (vs === "evasion")) t.add("blinded", -1);
  if (has(actor, "poisoned") && (vs === "resistance")) t.add("poisoned", -1);
  if (has(actor, "prone") && item && isCloseAttack(item, attacker)) t.add("prone", -1);
  if (has(actor, "charmed") && attacker && isSourceOf(actor, "charmed", attacker)) t.add("charmed", -1);
  if (has(actor, "focused")) {
    t.add("focused", 1);
    t.consume.push("focused");
  }
  return t;
}

/**
 * What the conditions of an attacker add to its Damage Roll.
 * @param {Actor} actor
 * @param {Item} [item]
 * @returns {{dice: number, mod: number, text: string}}
 */
export function damageModifier(actor, item = null) {
  const t = tally();
  if (!actor || !rulesOn() || item?.system?.damage?.recovery) return t;
  for (const id of ["empowered", "berserk", "awakened"]) {
    const n = rating(actor, id);
    if (n > 0) t.add(id, 0, n);
  }
  return t;
}

/** End the statuses a roll used up ([Focused]). */
export async function consumeAfterRoll(actor, consume) {
  if (actor?.isOwner && consume?.length) await removeStatuses(actor, consume);
}

/** Apply a modifier to dice and modifier, keeping at least 1D. */
export function applyModifier({ dice, mod }, modifier) {
  return { dice: Math.max(1, dice + modifier.dice), mod: mod + modifier.mod };
}
