/**
 * Dice and damage the conditions add to rolls.
 *
 * Checks (skill Checks, the checks of the sheets and of the HUD):
 * - −1D: [Staggered] on Major / Main Process skills, [Confused] and [Swimming] on every check, [Blinded] on every
 *   check but Resistance, [Frightened] against its source, [Prone] on its own Close attacks.
 * - +1D: [Focused] (then it ends), [Awakened] on Accuracy.
 * Dodge Checks: −1D for [Dazed], [Paralyzed], [Rooted], [Berserk], [Marked], [Confused], [Swimming], [Blinded]
 * (against Evasion), [Poisoned] (against Resistance), [Prone] (against Close attacks), [Charmed] (against its
 * source) and a Taboo's `eternia.passive.closeDodge` (against Close attacks: conditions/distance.mjs); +1D for
 * [Focused]. [Asleep], [Petrified] and [Nightmare] fail it outright. The dice never go below 1D.
 * Damage Rolls: +Rating for [Empowered], [Berserk], [Awakened], [Sun], [Impetus] and [Combo]; +CR for [The One];
 * +Rating for [Clones] on Close attacks; +Rating d6 for [Rhythm] on a spell (then it ends); −Rating for [Weakened].
 * Race skills: the Pack (a skill with `flags.eternia.special: "pack"`) adds +[SR×2] damage with an ally within
 * 2 Sq and −1D on Accuracy with no ally within 5 Sq; effects with `consumeOn` end after the roll they help
 * (conditions/effects.mjs).
 */
import { parseSkillField } from "../helpers/skill-fields.mjs";
import { parseRange } from "../helpers/hands.mjs";
import { findTag } from "../helpers/tag-catalog.mjs";
import { crOf, has, isSourceOf, rating, removeStatuses, rulesOn } from "./rules.mjs";
import { consumedBy } from "./effects.mjs";
import { NO_DODGE } from "./catalog.mjs";
import { closeDodge } from "./distance.mjs";

const label = id => game.i18n.localize(`ETERNIA.StatusEffect.${id}`);

/** Whether a skill attacks in Close range (Range "Close", or the weapon's when it is Close, or [Melee Attack]). */
export function isCloseAttack(item, actor) {
  if (!item) return false;
  if ((item.system.tags ?? []).some(t => /^melee attack$/i.test(String(t).trim()))) return true;
  return parseRange(item.system.range, actor ?? item.actor) === 0;
}

/** Tags of the skills that are spells for [Rhythm], besides the spells of the Magias. */
const SPELL_TAGS = ["magic attack", "spell"];

/** Whether a skill is a spell: one of a Magia (`flags.eternia.magicSpell`), or a [Magic Attack] / [Spell]. */
export function isSpell(item) {
  if (!item) return false;
  if (item.flags?.eternia?.magicSpell) return true;
  return (item.system?.tags ?? []).some(t => SPELL_TAGS.includes((findTag(t)?.label ?? String(t)).trim().toLowerCase()));
}

/** A running total of dice and modifiers with the statuses that gave them. */
function tally() {
  const parts = [];
  return {
    dice: 0, mod: 0, parts, consume: [],
    add(id, dice = 0, mod = 0, name = label(id)) {
      this.dice += dice;
      this.mod += mod;
      if (dice || mod) parts.push(`${name} ${dice ? `${dice > 0 ? "+" : ""}${dice}d6` : `${mod > 0 ? "+" : ""}${mod}`}`);
    },
    /** "Confuso −1d6, Concentrado +1d6" for the roll's flavor. */
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
  if (!actor) return t;
  // Effects that help one roll of this check only.
  t.consume.push(...consumedBy(actor, ["check", stat].filter(Boolean)).map(id => `effect:${id}`));
  const pack = packSkill(actor);
  if (pack && (stat === "accuracy") && (alliesWithin(actor, 5) === 0)) t.add("pack", -1, 0, game.i18n.localize("ETERNIA.Conditions.Alone"));
  if (!rulesOn()) return t;
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
 * @returns {{dice: number, mod: number, text: string, consume: string[], autoFail: string|null}}
 *   `autoFail`: the status that fails it outright ([Incapacitated], [Asleep], [Petrified], [Nightmare]), or null
 */
export function dodgeModifier(actor, { vs = "evasion", attacker = null, item = null } = {}) {
  const t = tally();
  t.autoFail = null;
  if (!actor) return t;
  // [Incapacitated] makes no check at all: a rule of the base system, on with the conditions' automation off
  if (has(actor, "incapacitated")) {
    t.autoFail = "incapacitated";
    return t;
  }
  t.consume.push(...consumedBy(actor, ["dodge", vs]).map(id => `effect:${id}`));
  // [Dazed] is a rule of the base system: it stays on with the conditions' automation off.
  if (has(actor, "dazed")) t.add("dazed", -1);
  if (!rulesOn()) return t;
  t.autoFail = NO_DODGE.find(id => has(actor, id)) ?? null;
  for (const id of ["paralyzed", "rooted", "berserk", "marked", "confused", "swimming"]) if (has(actor, id)) t.add(id, -1);
  if (has(actor, "blinded") && (vs === "evasion")) t.add("blinded", -1);
  if (has(actor, "poisoned") && (vs === "resistance")) t.add("poisoned", -1);
  if (has(actor, "prone") && item && isCloseAttack(item, attacker)) t.add("prone", -1);
  if (has(actor, "charmed") && attacker && isSourceOf(actor, "charmed", attacker)) t.add("charmed", -1);
  const close = closeDodge(actor);
  if (close && item && isCloseAttack(item, attacker)) t.add("closeDodge", close.dice, 0, close.name);
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
  if (!actor || item?.system?.damage?.recovery) return t;
  // Effects spent by the next damage the actor rolls (`consumeOn: "attack"`: a Spark Stone).
  t.consume.push(...consumedBy(actor, ["attack"]).map(id => `effect:${id}`));
  const pack = packSkill(actor);
  if (pack && (alliesWithin(actor, 2) > 0)) t.add("pack", 0, 2 * (Number(pack.system.skillRank?.value) || 1), pack.name);
  if (!rulesOn()) return t;
  for (const id of ["empowered", "berserk", "awakened", "sun", "impetus", "combo"]) {
    const n = rating(actor, id);
    if (n > 0) t.add(id, 0, n);
  }
  if (has(actor, "theOne")) t.add("theOne", 0, crOf(actor));
  // [Clones]: the copies strike with the blow
  const clones = rating(actor, "clones");
  if ((clones > 0) && item && isCloseAttack(item, actor)) t.add("clones", 0, clones);
  // [Rhythm]: the dance goes into the next spell, and ends with it
  const rhythm = rating(actor, "rhythm");
  if ((rhythm > 0) && isSpell(item)) {
    t.add("rhythm", rhythm, 0);
    t.consume.push("rhythm");
  }
  const weakened = rating(actor, "weakened");
  if (weakened > 0) t.add("weakened", 0, -weakened);
  return t;
}

/** End the statuses a roll used up ([Focused]). */
export async function consumeAfterRoll(actor, consume) {
  if (!actor?.isOwner || !consume?.length) return;
  const effects = consume.filter(c => c.startsWith("effect:")).map(c => c.slice(7)).filter(id => actor.effects.has(id));
  const statuses = consume.filter(c => !c.startsWith("effect:"));
  if (statuses.length) await removeStatuses(actor, statuses);
  if (effects.length) await actor.deleteEmbeddedDocuments("ActiveEffect", effects).catch(() => null);
}

/* -------------------------------------------- */
/*  The Pack                                    */
/* -------------------------------------------- */

/** The actor's Pack skill, if it has one. */
function packSkill(actor) {
  return actor.items?.find(i => (i.type === "skill") && (i.getFlag("eternia", "special") === "pack")) ?? null;
}

/**
 * How many allies stand within this many squares of the actor's token (same disposition, not down), counted on
 * the grid as the attack cards count (Manhattan). Null when the actor has no token on a square grid.
 * @param {Actor} actor
 * @param {number} squares
 * @returns {number|null}
 */
function alliesWithin(actor, squares) {
  if (!canvas.ready || (canvas.grid.type !== CONST.GRID_TYPES.SQUARE)) return null;
  const token = canvas.tokens.controlled.find(t => t.actor === actor) ?? actor.getActiveTokens(true)[0];
  if (!token) return null;
  const at = canvas.grid.getOffset(token.center);
  return canvas.tokens.placeables.filter(t => (t !== token) && t.actor && (t.actor !== actor)
    && (t.document.disposition === token.document.disposition)
    && !t.actor.statuses.has("incapacitated") && !t.actor.statuses.has("dead")
    && (() => {
      const p = canvas.grid.getOffset(t.center);
      return Math.abs(p.i - at.i) + Math.abs(p.j - at.j) <= squares;
    })()).length;
}

/** Apply a modifier to dice and modifier, keeping at least 1D. */
export function applyModifier({ dice, mod }, modifier) {
  return { dice: Math.max(1, dice + modifier.dice), mod: mod + modifier.mod };
}
