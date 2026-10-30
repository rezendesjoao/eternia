/**
 * Damage and healing under the conditions.
 *
 * Applying a damage card (helpers/combat-cards.mjs) asks here:
 * - before: a class Motor may take the whole card (the Dragon Slayer eats an ally's attack of its element); [The One]
 *   takes nothing from an attack, nor its statuses; [Exposed] ignores the Defense and [Cancel]; [Intangible] takes no
 *   physical damage, [Untouchable] no magic damage; [Soaked] takes its Rating more from [Shock] and [Cold] damage;
 *   [Counter] sends a direct attack of its type back to the attacker, doubled (the card works the damage out, then
 *   gives it back); [Clones] may send the blow to a copy (cloneDecoy: 1d6 up to the Rating); [Petrified] takes half
 *   of it; [Inversion] is healed by magic damage; the attack of a [Pacified] attacker deals no damage at all (its
 *   statuses still take);
 * - on a failed Dodge Check: [Marked] adds its Rating as direct damage, then the mark ends;
 * - after: [Last Stand] keeps the character at 1 HP once, then the Extra Breaths of its effects (`revive`); [Bond]
 *   sends half the HP loss to its source; [Mirror] deals its Rating to the attacker; [Grudge] keeps the HP loss;
 *   [Combo] breaks; [Asleep] wakes up; [Charmed] ends when its source deals the damage; [Flame] damage melts
 *   [Freezing] and dries [Soaked]; the damage ends [Hidden] on both sides (not the attacker's, when its spell keeps
 *   it: a Magia's Trait).
 * Healing does nothing to a [Cursed] character or one with [Black Flame], and effects can't give them [Regen] (nor
 * [Barrier], when [Cursed]); the GM still can by hand, in the sheet. Under [Inversion] healing hurts instead, and the
 * effects that would give [Empowered] or [Regen] give [Weakened] or [Decay]. [Agony] hurts whenever its bearer
 * recovers HP or gets rid of a Bad Status (agonyPain). A Tabu with `healTaken` (the Fountain of Youth's,
 * conditions/immortal.mjs) halves the healing of spells and items, not the body's own (`natural`).
 *
 * The damage of the conditions themselves ([Burning], [Poisoned], [Shocked], [Doom], [Mirror], [Bond], [Nightmare],
 * [Agony]) goes through takeDamage: [Barrier], [Last Stand], the Extra Breaths and Incapacitated, with a line in the
 * chat. Damage to one [Dying] (a card's or a condition's) is a blow on the ground: the Rating goes up, and a critical
 * hit kills (automation/death.mjs), whatever the conditions setting.
 */
import { L, SYSTEM_ID } from "../settings.mjs";
import { registerHandler, request } from "../piles/pile-socket.mjs";
import { actorName, postSummary, toInt } from "../helpers/utils.mjs";
import { listStatusEntries, statusDefinition } from "../helpers/statuses.mjs";
import { parseSkillField } from "../helpers/skill-fields.mjs";
import { evaluateFormula, formulaData, isFormula } from "../helpers/effect-formulas.mjs";
import { crOf, has, isSourceOf, rating, removeStatuses, rulesOn, sameActor, sourcesOf, statusEffects } from "./rules.mjs";
import { passiveCancels } from "./effects.mjs";
import { healTaken } from "./immortal.mjs";
import { motorAbsorbs } from "../classes/motor.mjs";
import { decoyTakes } from "./copies.mjs";
import { tagLabel } from "../i18n/terms.mjs";
import { phasedNote } from "../bestiary/phase.mjs";
import { groundBlow } from "../automation/death.mjs";
import { passageOf } from "./passage.mjs";
import { sealLife, sealStrikerOf } from "./reaper.mjs";

const label = id => game.i18n.localize(`ETERNIA.StatusEffect.${id}`);

/** Statuses without a field that an application can end (saved for its Undo). */
const ENDED_BY_DAMAGE = ["asleep", "lastStand", "charmed", "hidden", "counter"];

/**
 * Rating fields an application can change (the mark spent, the ice melted, the water dried, a status a spell consumed
 * or stripped, the damage kept as a grudge, the combo broken, a copy lost), saved for its Undo.
 */
const RESTORED_FIELDS = ["marked", "freezing", "soaked", "burning", "poisoned", "shocked", "decay", "fuse", "fissured",
  "regen", "barrier", "empowered", "awakened", "mirror", "weakened", "doom", "berserk", "grudge", "combo", "clones",
  "dying"];

/** Statuses that stop all healing: the first one an actor has, or null. */
const NO_HEALING = ["cursed", "blackFlame"];

/** What [Inversion] turns the statuses an effect would give into. */
const INVERTED_GIFTS = { empowered: "weakened", regen: "decay" };

/** How much damage a [Grudge] keeps: its bearer's CR times this. */
const GRUDGE_CAP = 4;

/** The tags a damage card's type adds to its own (as the halving reads them: bestiary/halve.mjs). */
const TYPE_TAGS = { physical: ["Physical"], magical: ["Magic", "Magical"] };

/**
 * The tag of a damage card that a creature eats (an active effect with `flags.eternia.absorb`, a list of tags: the
 * Glowing Lizard eats the light, the Inside-Out Imp the physical blows), as the table writes it, or null. The card's
 * type counts as a tag ([Physical], [Magic]).
 * @param {Actor} actor
 * @param {object} card
 * @returns {string|null}
 */
function absorbedTag(actor, card) {
  const cardTags = [...(card.tags ?? []), ...(TYPE_TAGS[card.type] ?? [])].map(c => String(c).toLowerCase());
  for (const effect of actor?.allApplicableEffects?.() ?? []) {
    const tags = effect.active ? effect.getFlag(SYSTEM_ID, "absorb") : null;
    if (!Array.isArray(tags)) continue;
    const tag = tags.find(t => cardTags.includes(String(t).toLowerCase()));
    if (tag) return tagLabel(tag);
  }
  return null;
}

/* -------------------------------------------- */
/*  Damage cards                                */
/* -------------------------------------------- */

/**
 * What the defender's conditions change before the damage of a card is worked out.
 * @param {Actor} actor
 * @param {object} card    The damage card data (type, tags)
 * @param {boolean} direct
 * @returns {{noDefense: boolean, noCancel: boolean, immune: boolean, untouched: boolean, harmless: boolean,
 *   halve: boolean, invert: boolean, bonus: number, counter: {bonus: number, effects: string[]}|null, notes: string[]}}
 *   `untouched`: nothing of the attack reaches the actor (no statuses, no extra damage of a failed Dodge either);
 *   `harmless`: no damage at all, not even that of a failed Dodge (a [Pacified] attacker), but the statuses take;
 *   `halve`: half the damage, after the Defense and [Cancel] ([Petrified]);
 *   `invert`: the damage, after the Defense and [Cancel], heals instead ([Inversion] against magic damage);
 *   `counter`: the damage, worked out as usual, goes back to the attacker doubled (+ the bonus) instead.
 */
export function beforeDamage(actor, card, direct) {
  const result = { noDefense: false, noCancel: false, immune: false, untouched: false, harmless: false, halve: false,
    invert: false, bonus: 0, counter: null, notes: [] };
  if (card.recovery) return result;
  const eaten = motorAbsorbs(actor, card);
  if (eaten) {
    result.immune = true;
    result.notes.push(eaten);
    return result;
  }
  if (!rulesOn()) return result;
  // A blow that cuts what can't be cut (`pierce.all`, the Santo da Espada) passes through all that lets a blow by
  const all = !!card.pierce?.all;
  // A copy takes the blow (Troca com a Cópia: copies.mjs)
  const decoy = all ? null : decoyTakes(actor, card);
  if (decoy) return { ...result, immune: true, untouched: true, notes: [decoy] };
  // Out of phase, nothing reaches it (bestiary/phase.mjs)
  const phased = all ? null : phasedNote(actor);
  if (phased) return { ...result, immune: true, untouched: true, notes: [phased] };
  // Going through the blow, a spell cut, the space eaten, an arrow warded (conditions/passage.mjs)
  const passage = passageOf(actor, card, direct);
  if (passage) return { ...result, immune: true, untouched: true, phasing: !!passage.phasing, notes: [passage.note] };
  // [The One]: noon; no attack reaches it.
  if (has(actor, "theOne") && !all) {
    result.immune = true;
    result.untouched = true;
    result.notes.push(L("Conditions.Applied.TheOne"));
    return result;
  }
  // A [Pacified] attacker hurts no one: no damage, nothing to send back.
  if (card.pacified) {
    result.immune = true;
    result.harmless = true;
    result.notes.push(L("Conditions.Applied.Pacified"));
  }
  result.counter = (direct || result.harmless || all) ? null : counterFor(actor, card);
  if (has(actor, "exposed") && !direct) {
    result.noDefense = true;
    result.noCancel = true;
    result.notes.push(L("Conditions.Applied.Exposed"));
  }
  if (has(actor, "intangible") && !direct && !all && (card.type === "physical")) {
    result.immune = true;
    result.notes.push(L("Conditions.Applied.Intangible"));
  }
  if (has(actor, "untouchable") && !direct && !all && (card.type === "magical")) {
    result.immune = true;
    result.notes.push(L("Conditions.Applied.Untouchable"));
  }
  result.halve = has(actor, "petrified");
  result.invert = !direct && (card.type === "magical") && has(actor, "inversion");
  // A creature that eats a kind of damage (a passive effect with `flags.eternia.absorb: ["Radiance"]`, a monster of the
  // bestiary): that damage heals it, by the Inversion's rule
  const eats = direct ? null : absorbedTag(actor, card);
  if (eats) {
    result.invert = true;
    result.absorbs = eats;
  }
  // [Soaked]: the water carries the lightning and the cold.
  const soaked = rating(actor, "soaked");
  if ((soaked > 0) && (hasTag(card, "shock") || hasTag(card, "cold"))) {
    result.bonus += soaked;
    result.notes.push(L("Conditions.Applied.Soaked", { n: soaked }));
  }
  return result;
}

/** The [Marked] damage of a failed Dodge Check (the mark then ends). */
export function markDamage(actor) {
  return rulesOn() ? rating(actor, "marked") : 0;
}

/**
 * [Clones]: when an attack would hit the actor, 1d6 is rolled; up to the Rating, the blow hits a copy instead (nothing
 * of it reaches the actor) and one copy is lost.
 * @param {Actor} actor
 * @param {object} card
 * @returns {Promise<{hit: boolean, left: number, note: string}|null>}   null without [Clones]
 */
export async function cloneDecoy(actor, card) {
  if (card.recovery || !rulesOn()) return null;
  const clones = rating(actor, "clones");
  if (clones <= 0) return null;
  const roll = await new Roll("1d6").evaluate();
  const hit = roll.total <= clones;
  const left = hit ? clones - 1 : clones;
  return { hit, left, note: L(hit ? "Conditions.Applied.Clone" : "Conditions.Applied.CloneMissed", { n: roll.total, left }) };
}

/** Whether a skill reaches more than one target (an area, a line, two targets or more): not a direct attack. */
export function isAreaAttack(item) {
  if (!item) return false;
  const target = parseSkillField("target", item.system?.target ?? "");
  return ["Area", "Wide", "Line"].includes(target.type) || ((target.type === "Targets") && (Number(target.n) > 1));
}

/**
 * The [Counter] that takes this card: one of the card's damage type against a direct attack (one target), or one of
 * any type ("any": against anything, areas too). Its Rating, and the Traits' `counterBonus` (the Contra-ataque's),
 * add to the damage sent back.
 * @param {Actor} actor
 * @param {object} card
 * @returns {{bonus: number, effects: string[]}|null}
 */
function counterFor(actor, card) {
  const effects = statusEffects(actor, "counter");
  if (!effects.length || !["physical", "magical", "penetrating"].includes(card.type)) return null;
  const item = card.itemUuid ? fromUuidSync(card.itemUuid) : null;
  const direct = !isAreaAttack(item);
  const fits = effects.filter(e => {
    const tag = String(e.getFlag(SYSTEM_ID, "statusData")?.tag || "any").toLowerCase();
    return (tag === "any") || (direct && (tag === card.type));
  });
  if (!fits.length) return null;
  const own = Math.max(0, ...fits.map(e => toInt(e.getFlag(SYSTEM_ID, "statusData")?.value)));
  return { bonus: own + traitCounterBonus(actor), effects: fits.map(e => e.id), mult: traitCounterMult(actor) };
}

/** How many times the damage a [Counter] sends back: 2, or more by a Trait's `counterMult` (the Contra-ataque: 3). */
function traitCounterMult(actor) {
  let mult = 2;
  for (const effect of actor.allApplicableEffects?.() ?? []) {
    const value = effect.active ? Number(effect.getFlag(SYSTEM_ID, "trait")?.counterMult) : 0;
    if (value > mult) mult = value;
  }
  return mult;
}

/** What the Traits of an actor add to the damage its [Counter] sends back (`flags.eternia.trait.counterBonus`). */
function traitCounterBonus(actor) {
  let total = 0;
  for (const effect of actor.allApplicableEffects?.() ?? []) {
    const value = effect.active ? effect.getFlag(SYSTEM_ID, "trait")?.counterBonus : null;
    if (!value) continue;
    total += (isFormula(value) ? evaluateFormula(value, formulaData(actor, effect.parent)) : toInt(value)) || 0;
  }
  return Math.max(0, total);
}

/**
 * [Counter]: the damage a card would deal (after the Defense and [Cancel], before [Barrier]) goes back to its
 * attacker, doubled, plus the counter's bonus, as direct damage. Called by the damage card once it knows the damage;
 * the [Counter] ends (its Undo brings it back).
 * @param {Actor} actor
 * @param {object} card
 * @param {{bonus: number, effects: string[]}} counter
 * @param {number} amount
 * @returns {{damage: number, line: string, after: Function|null}}
 */
export function counterBack(actor, card, counter, amount) {
  const attacker = cardAttacker(card);
  const damage = (Math.max(0, amount) * (counter.mult ?? 2)) + counter.bonus;
  const name = attacker ? actorName(attacker) : "—";
  const line = L("Conditions.Applied.Counter", { n: damage, name });
  const after = async () => {
    const ids = counter.effects.filter(id => actor.effects.has(id));
    if (ids.length) await actor.deleteEmbeddedDocuments("ActiveEffect", ids).catch(() => null);
    if (attacker && !sameActor(attacker, actor) && (damage > 0)) await takeDamage(attacker, damage, { reason: "counter", from: actor });
  };
  return { damage, line, after };
}

/**
 * What the defender's conditions do once the HP loss of a card is known.
 * @param {Actor} actor
 * @param {object} card
 * @param {{hp: number, hpLoss: number, absorbed: number, marked: boolean, start: number}} state
 *   `start`: the HP before the application
 * @returns {{hp: number, updates: object, lines: string[], end: string[], after: Function[]}}
 */
export function afterDamage(actor, card, { hp, hpLoss, absorbed, marked, start = 1 }) {
  const out = { hp, updates: {}, lines: [], end: [], after: [] };
  if (card.recovery) return out;
  // A blow on the ground: one [Dying] comes closer to death (automation/death.mjs)
  const blow = (hpLoss > 0) ? groundBlow(actor, { critical: !!card.critical }) : null;
  if (blow) {
    Object.assign(out.updates, blow.updates);
    out.lines.push(blow.line);
    if (blow.after) out.after.push(blow.after);
  }
  if (!rulesOn()) return out;
  const attacker = cardAttacker(card);
  const hurt = (hpLoss > 0) || (absorbed > 0);

  // [Bond]: half the HP loss goes to the source (rounded down).
  const bondSource = has(actor, "bond") ? sourcesOf(actor, "bond")[0] : null;
  if (bondSource && (hpLoss > 1) && !sameActor(bondSource, actor)) {
    const shared = Math.floor(hpLoss / 2);
    out.hp += shared;
    out.lines.push(L("Conditions.Applied.Bond", { n: shared, name: actorName(bondSource) }));
    out.after.push(() => takeDamage(bondSource, shared, { reason: "bond", from: actor }));
  }
  // [Grudge]: the HP loss is kept for one blow (up to CR × GRUDGE_CAP).
  const grudge = rating(actor, "grudge");
  if ((grudge > 0) && (hpLoss > 0)) {
    const kept = Math.min(grudge + hpLoss, Math.max(grudge, crOf(actor) * GRUDGE_CAP));
    if (kept > grudge) {
      out.updates["system.bad-status.grudge"] = kept;
      out.lines.push(L("Conditions.Applied.Grudge", { n: kept }));
    }
  }
  // [Last Stand]: 1 HP instead of 0, once.
  if ((out.hp <= 0) && has(actor, "lastStand")) {
    out.hp = 1;
    out.end.push("lastStand");
    out.lines.push(L("Conditions.Applied.LastStand"));
  }
  // An Extra Breath (`revive`): the HP of the effect instead of 0, while it has uses (one with a chance, by a 1d6; none
  // against what it doesn't hold: a tag of the damage, a Critical).
  if ((out.hp <= 0) && (start > 0)) {
    const breath = spendExtraBreath(actor, { tags: card.tags, critical: card.critical, notes: out.lines });
    if (breath) {
      out.hp = breath.hp;
      Object.assign(out.updates, breath.updates);
      out.lines.push(breath.line);
      out.after.push(() => announceBreath(actor, breath));
    }
  }
  // [Combo]: a blow taken breaks the sequence (unless an effect keeps it: `keepCombo`).
  if (hurt && (rating(actor, "combo") > 0) && !keepsCombo(actor)) {
    out.updates["system.bad-status.combo"] = 0;
    out.lines.push(L("Conditions.Applied.ComboBroken"));
  }
  if (marked) out.updates["system.bad-status.marked"] = 0;
  if (hurt && has(actor, "asleep")) {
    out.end.push("asleep");
    out.lines.push(L("Conditions.Applied.WokeUp"));
  }
  if (hurt && attacker && has(actor, "charmed") && isSourceOf(actor, "charmed", attacker)) {
    out.end.push("charmed");
    out.lines.push(L("Conditions.Applied.CharmBroken"));
  }
  if (hurt && has(actor, "freezing") && hasTag(card, "flame")) {
    out.updates["system.bad-status.freezing"] = 0;
    out.lines.push(L("Conditions.Applied.Melted"));
  }
  if (hurt && has(actor, "soaked") && hasTag(card, "flame")) {
    out.updates["system.bad-status.soaked"] = 0;
    out.lines.push(L("Conditions.Applied.Dried"));
  }
  if (hurt && has(actor, "hidden")) out.end.push("hidden");
  // [Mirror]: the attacker takes the Rating as direct damage.
  const mirror = rating(actor, "mirror");
  if (hurt && (mirror > 0) && attacker && !sameActor(attacker, actor)) {
    out.lines.push(L("Conditions.Applied.Mirror", { n: mirror, name: actorName(attacker) }));
    out.after.push(() => takeDamage(attacker, mirror, { reason: "mirror", from: actor }));
  }
  // A death god's guard: whoever hurts its bearer has life sealed by it (conditions/reaper.mjs)
  const sealed = (hurt && attacker && !sameActor(attacker, actor)) ? sealStrikerOf(actor) : 0;
  if (sealed > 0) out.after.push(() => sealLife(attacker, sealed, actor));
  // Dealing damage ends the attacker's [Hidden] (unless its spell keeps it).
  if (hurt && attacker && has(attacker, "hidden") && !card.keepHidden) {
    out.after.push(() => (attacker.isOwner ? removeStatuses(attacker, ["hidden"]) : null));
  }
  return out;
}

/**
 * The statuses an application may end, saved before it for its Undo (and the Extra Breaths spent). Of the fields, only
 * those that aren't 0 (every result card keeps a snapshot, and every window loads every card): the Undo puts the others
 * back to 0.
 */
export function snapshotForUndo(actor) {
  const bad = actor._source.system?.["bad-status"] ?? {};
  return {
    conditionFields: Object.fromEntries(RESTORED_FIELDS.map(id => [id, toInt(bad[id])]).filter(([, value]) => value)),
    conditionEffects: [...actor.effects].filter(e => ENDED_BY_DAMAGE.some(id => e.statuses?.has(id))).map(e => e.toObject()),
    reviveSpent: foundry.utils.deepClone(actor.getFlag(SYSTEM_ID, "reviveSpent") ?? {}),
    // A critical hit on the ground killed: the Undo takes the death back
    dead: actor.statuses.has("dead")
  };
}

/** Undo: the fields and the statuses the application had ended come back, and the Extra Breaths it spent. */
export async function restoreForUndo(actor, before) {
  if (!before?.conditionFields) return;
  const breaths = {};
  const spent = before.reviveSpent ?? {};
  for (const key of new Set([...Object.keys(actor.getFlag(SYSTEM_ID, "reviveSpent") ?? {}), ...Object.keys(spent)])) {
    breaths[`flags.${SYSTEM_ID}.reviveSpent.${key}`] = toInt(spent[key]);
  }
  // A snapshot keeps only the fields that weren't 0; one saved before that keeps them all, 0 included (its zeros give it
  // away), and comes back field by field as it was saved (a field added to RESTORED_FIELDS later stays as it is).
  const fields = before.conditionFields;
  const ids = Object.values(fields).some(value => !toInt(value)) ? Object.keys(fields) : RESTORED_FIELDS;
  await actor.update(Object.fromEntries([...ids.map(id => [`system.bad-status.${id}`, toInt(fields[id] ?? 0)]),
    ...Object.entries(breaths)]));
  const missing = (before.conditionEffects ?? []).filter(e => !actor.effects.has(e._id));
  if (missing.length) await actor.createEmbeddedDocuments("ActiveEffect", missing, { keepId: true });
  if ((before.dead === false) && actor.statuses.has("dead")) await actor.toggleStatusEffect("dead", { active: false });
}

/** The status that keeps healing from an actor ([Cursed], [Black Flame]), or null. */
export const healBlocker = actor => (rulesOn() ? (NO_HEALING.find(id => has(actor, id)) ?? null) : null);

/** Whether healing can reach this actor (no [Cursed] nor [Black Flame]). */
export const canHeal = actor => !healBlocker(actor);

/** Whether healing hurts this actor ([Inversion]). */
export const healingHurts = actor => rulesOn() && has(actor, "inversion");

/**
 * [Agony]: recovering HP, or getting rid of a Bad Status, hurts: the Rating as direct damage (takeDamage).
 * @param {Actor} actor
 * @param {object} [options]
 * @param {boolean} [options.silent]   No chat line of its own (the caller writes the line it returns)
 * @returns {Promise<{loss: number, line: string}|null>}
 */
export async function agonyPain(actor, { silent = false } = {}) {
  const n = rulesOn() ? rating(actor, "agony") : 0;
  if ((n <= 0) || !actor || actor.statuses.has("dead")) return null;
  return takeDamage(actor, n, { reason: "agony", silent });
}

/**
 * An actor got HP back: the hook of every healing that gives HP (healing cards, [Regen], `takeHealing`, the healing
 * of an [Inversion]). Only on this client (the one that healed it).
 * @param {Actor} actor
 * @param {number} amount
 * @param {{what: string, from: Actor|null}} [context]
 */
export function recovered(actor, amount, { what = "", from = null } = {}) {
  if (!(amount > 0)) return;
  /**
   * An actor recovered HP (a Decree that punishes healing listens). Only on this client.
   * @param {Actor} actor
   * @param {{amount: number, what: string, from: Actor|null}} context
   */
  Hooks.callAll("eternia.recovered", actor, { amount, what, from });
}

/**
 * An actor got rid of Bad Statuses (the Get rid of the HUD, an effect that removes statuses): the hook. Only on this
 * client (the one that removed them).
 * @param {Actor} actor
 * @param {string[]} statuses   The statuses that ended (only the Bad ones count)
 * @param {{by: "action"|"effect"}} [context]
 */
export function freed(actor, statuses, { by = "effect" } = {}) {
  const bad = (statuses ?? []).filter(id => statusDefinition(id)?.group === "bad");
  if (!bad.length) return;
  /**
   * An actor got rid of Bad Statuses, by an action of its own or by an effect (a Decree that punishes it listens).
   * Only on this client.
   * @param {Actor} actor
   * @param {{statuses: string[], by: "action"|"effect"}} context
   */
  Hooks.callAll("eternia.freed", actor, { statuses: bad, by });
}

/* -------------------------------------------- */
/*  The Extra Breaths                           */
/* -------------------------------------------- */

/** The key of an effect in its actor's record of spent Extra Breaths (no dots: flag keys nest on them). */
const breathKey = effect => [(effect.parent instanceof Item) ? effect.parent.id : null, effect.id].filter(Boolean).join("-");

/**
 * The Extra Breaths of an actor: its active effects with `flags.eternia.revive = { uses, per, hp, chance, not }` (the
 * passive ones of its items too, a Trait or a Tabu), with the uses each has left this round or scene. A breath with a
 * `chance` (1 to 6) holds only with that much or more on a 1d6, and without `uses` it never runs out (the stubbornness
 * of the dead); `not` lists what it doesn't hold against: tags of the damage ("Radiance") and "critical" (an attack
 * whose Hit Check was a Critical).
 * @param {Actor} actor
 * @returns {{effect: ActiveEffect, key: string, uses: number, left: number, per: "round"|"scene", hp: string,
 *   values: object, chance: number, not: string[]}[]}
 */
export function extraBreaths(actor) {
  const spent = actor?.getFlag?.(SYSTEM_ID, "reviveSpent") ?? {};
  // The breaths once per scenario (the Phoenix) count apart: the record of the scenario the actor is in
  const scenario = scenarioSpent(actor);
  const out = [];
  for (const effect of actor?.allApplicableEffects?.() ?? []) {
    const data = effect.active ? effect.getFlag(SYSTEM_ID, "revive") : null;
    if (!data) continue;
    const values = formulaData(actor, effect.sourceItem ?? null);
    const chance = Math.min(6, Math.max(0, toInt(data.chance)));
    const uses = ((data.uses === undefined) && chance) ? Infinity
      : Math.max(0, isFormula(data.uses) ? (evaluateFormula(data.uses, values) ?? 0) : toInt(data.uses ?? 1));
    const key = breathKey(effect);
    const per = ["round", "scenario"].includes(data.per) ? data.per : "scene";
    const used = toInt(((per === "scenario") ? scenario.spent : spent)[key]);
    out.push({ effect, key, uses, left: Math.max(0, uses - used), per,
      hp: String(data.hp ?? "1"), values, chance, not: [].concat(data.not ?? []).map(t => String(t).toLowerCase()) });
  }
  return out;
}

/**
 * The Extra Breaths once per scenario an actor spent in the scenario it is in (its count of finished scenarios,
 * automation/scenes.mjs): { key, spent }.
 */
function scenarioSpent(actor) {
  const key = toInt(actor?.getFlag?.(SYSTEM_ID, "scenario"));
  const record = actor?.getFlag?.(SYSTEM_ID, "reviveScenario");
  return { key, spent: ((record?.key === key) && record.spent) ? record.spent : {} };
}

/** The 1d6 of an Extra Breath with a chance, by the dice's own generator (the damage is worked out at once). */
const breathDie = () => new foundry.dice.terms.Die({ number: 1, faces: 6 }).randomFace();

/**
 * The Extra Breath an actor about to fall to 0 HP spends (one with uses left, those that come back every round first,
 * those with a chance last, a 1d6 each), or null: the HP it keeps (its `hp` formula, 1 by default, at most the Max HP),
 * the update that spends it and the chat line. A breath doesn't hold against what its `not` lists, and a chance that
 * misses spends nothing.
 * @param {Actor} actor
 * @param {object} [blow]              What brings it down
 * @param {string[]} [blow.tags]       The tags of the damage
 * @param {boolean} [blow.critical]    Whether the attack's Hit Check was a Critical
 * @param {string[]} [blow.notes]      Gets the lines of the breaths that didn't hold, when it falls
 * @returns {{hp: number, updates: object, line: string, effect: ActiveEffect, left: number}|null}
 */
export function spendExtraBreath(actor, { tags = [], critical = false, notes = null } = {}) {
  if (!rulesOn()) return null;
  const blow = (tags ?? []).map(t => String(t).toLowerCase());
  const breaths = extraBreaths(actor).filter(b => b.left > 0);
  const missed = [];
  const holding = breaths.filter(b => {
    const by = b.not.find(n => ((n === "critical") ? critical : blow.includes(n)));
    if (by) missed.push(L("Conditions.Applied.BreathBlocked", { effect: b.effect.name,
      what: (by === "critical") ? L("Conditions.Applied.BreathCritical") : `[${tagLabel(by)}]` }));
    return !by;
  });
  const sure = holding.filter(b => !b.chance);
  let breath = sure.find(b => b.per === "round") ?? sure[0];
  let rolled = null;
  for (const b of breath ? [] : holding.filter(b => b.chance)) {
    const n = breathDie();
    if (n >= b.chance) {
      breath = b;
      rolled = n;
      break;
    }
    missed.push(L("Conditions.Applied.BreathMissed", { effect: b.effect.name, n }));
  }
  if (!breath) {
    notes?.push(...missed);
    return null;
  }
  const raw = isFormula(breath.hp) ? (evaluateFormula(breath.hp, breath.values) ?? 1) : toInt(breath.hp);
  const hp = Math.max(1, Math.min(raw, toInt(actor.system.health?.max) || 1));
  const scenario = scenarioSpent(actor);
  const spent = toInt(((breath.per === "scenario") ? scenario.spent : (actor.getFlag(SYSTEM_ID, "reviveSpent") ?? {}))[breath.key]) + 1;
  // A breath that never runs out doesn't count in what is left
  const finite = n => (Number.isFinite(n) ? n : 0);
  const left = breaths.reduce((total, b) => total + finite(b.left), 0) - (Number.isFinite(breath.left) ? 1 : 0);
  return {
    hp, effect: breath.effect, left,
    updates: (breath.per === "scenario")
      ? { [`flags.${SYSTEM_ID}.reviveScenario`]: { key: scenario.key, spent: { ...scenario.spent, [breath.key]: spent } } }
      : { [`flags.${SYSTEM_ID}.reviveSpent.${breath.key}`]: spent },
    line: (rolled === null) ? L("Conditions.Applied.Breath", { effect: breath.effect.name, hp, left })
      : L("Conditions.Applied.BreathChance", { effect: breath.effect.name, n: rolled, hp })
  };
}

/**
 * An Extra Breath was spent: the hook the Magias listen to. Only on this client.
 * @param {Actor} actor
 * @param {{effect: ActiveEffect, hp: number, left: number}} breath
 */
function announceBreath(actor, breath) {
  /**
   * An actor that would have fallen to 0 HP spent an Extra Breath (`flags.eternia.revive`) and kept `hp` HP (the
   * Seven Hearts of a Magia give [Berserk] for each heart lost). Only on this client.
   * @param {Actor} actor
   * @param {{effect: ActiveEffect, hp: number, left: number}} context   `left`: the uses it still has
   */
  Hooks.callAll("eternia.revived", actor, { effect: breath.effect, hp: breath.hp, left: breath.left });
}

/**
 * How many Extra Breaths an actor still has: of all its effects, or of one.
 * @param {Actor} actor
 * @param {ActiveEffect} [effect]
 * @returns {number}
 */
export function breathsLeft(actor, effect = null) {
  return extraBreaths(actor).filter(b => !effect || (b.effect.id === effect.id)).reduce((total, b) => total + b.left, 0);
}

/**
 * Give up Extra Breaths without falling (a transformation that burns the hearts that are left): up to `n` uses (all of
 * them by default), of one effect when given. By the actor's owner.
 * @param {Actor} actor
 * @param {number} [n]
 * @param {object} [options]
 * @param {ActiveEffect} [options.effect]
 * @returns {Promise<number>}   How many were given up
 */
export async function giveUpBreaths(actor, n = Infinity, { effect = null } = {}) {
  const spent = actor.getFlag(SYSTEM_ID, "reviveSpent") ?? {};
  const updates = {};
  let given = 0;
  for (const b of extraBreaths(actor)) {
    // One that never runs out (a chance of the dead) isn't given up, nor one of the scenario
    if ((effect && (b.effect.id !== effect.id)) || !Number.isFinite(b.left) || (b.per === "scenario")) continue;
    const take = Math.min(b.left, n - given);
    if (take <= 0) continue;
    updates[`flags.${SYSTEM_ID}.reviveSpent.${b.key}`] = toInt(spent[b.key]) + take;
    given += take;
  }
  if (given) await actor.update(updates);
  return given;
}

/** Whether an effect of the actor keeps its [Combo] from a blow (`flags.eternia.keepCombo`). */
const keepsCombo = actor => (actor?.effects ?? []).some(e => e.active && e.getFlag(SYSTEM_ID, "keepCombo"));

/* -------------------------------------------- */
/*  Damage of the conditions                    */
/* -------------------------------------------- */

/** The attacker of a damage card: the owner of the skill, else the speaker's actor. */
function cardAttacker(card) {
  const item = card.itemUuid ? fromUuidSync(card.itemUuid) : null;
  return item?.actor ?? null;
}

const hasTag = (card, key) => (card.tags ?? []).some(t => String(t).toLowerCase().includes(key));

/**
 * Direct damage from a condition: through [Barrier] (and [Cancel] for a tagged damage such as [Burning]'s Flame, none
 * on an [Exposed] actor), [Bond] (half to its source), [Last Stand] and Incapacitated. Asked to the GM when the user
 * doesn't own the actor.
 * @param {Actor} actor
 * @param {number} amount
 * @param {object} [options]
 * @param {string} [options.reason]   The status that deals it (its name goes in the chat line)
 * @param {string} [options.what]     The name for the chat line instead (a skill: the Samurai's Water Mirror)
 * @param {Actor} [options.from]      Who caused it ([Mirror], [Bond])
 * @param {string} [options.tag]      Tag of the damage, for [Cancel] ("Flame")
 * @param {boolean} [options.silent]  No chat line (the caller writes its own)
 * @returns {Promise<{loss: number, line: string}|null>}
 */
export async function takeDamage(actor, amount, { reason = "", what: named = "", from = null, tag = "", silent = false } = {}) {
  amount = toInt(amount);
  if (!actor || (amount <= 0) || actor.statuses.has("dead")) return null;
  if (!actor.isOwner) {
    const result = await request("conditionDamage", { actorUuid: actor.uuid, amount, reason, what: named, fromUuid: from?.uuid ?? null, tag });
    return result?.ok ? result.result : null;
  }
  const bad = actor._source.system?.["bad-status"] ?? {};
  let damage = amount;
  const parts = [];
  // [Exposed]: no [Cancel], as on the cards
  if (tag && !(rulesOn() && has(actor, "exposed"))) {
    const cancel = [...listStatusEntries(bad.cancels, true), ...passiveCancels(actor)]
      .filter(e => !e.tag || (e.tag.toLowerCase() === tag.toLowerCase()))
      .reduce((best, e) => Math.max(best, e.value), 0);
    if (cancel) {
      damage = Math.max(0, damage - cancel);
      parts.push(`− ${cancel} ${label("cancel")}`);
    }
  }
  const barrier = toInt(bad.barrier);
  const absorbed = Math.min(barrier, damage);
  damage -= absorbed;
  if (absorbed) parts.push(`− ${absorbed} ${label("barrier")}`);
  // [Bond]: half the HP loss goes to the source, as on the cards (afterDamage); not the share it already took
  const bondSource = (rulesOn() && (reason !== "bond") && has(actor, "bond")) ? sourcesOf(actor, "bond")[0] : null;
  const shared = (bondSource && (damage > 1) && !sameActor(bondSource, actor)) ? Math.floor(damage / 2) : 0;
  if (shared) {
    damage -= shared;
    parts.push(L("Conditions.Applied.Bond", { n: shared, name: actorName(bondSource) }));
  }
  const before = toInt(actor.system.health?.value);
  let hp = Math.max(0, before - damage);
  const updates = { "system.health.value": hp };
  if (absorbed) updates["system.bad-status.barrier"] = barrier - absorbed;
  // A blow on the ground (automation/death.mjs)
  const blow = (damage > 0) ? groundBlow(actor) : null;
  if (blow) Object.assign(updates, blow.updates);
  const end = [];
  let lastStand = false;
  if ((hp <= 0) && rulesOn() && has(actor, "lastStand")) {
    hp = 1;
    updates["system.health.value"] = 1;
    end.push("lastStand");
    lastStand = true;
  }
  // An Extra Breath (`revive`): the HP of the effect instead of 0.
  const missed = [];
  const breath = ((hp <= 0) && (before > 0)) ? spendExtraBreath(actor, { tags: tag ? [tag] : [], notes: missed }) : null;
  if (breath) {
    hp = breath.hp;
    updates["system.health.value"] = hp;
    Object.assign(updates, breath.updates);
  }
  if (((damage > 0) || (absorbed > 0)) && has(actor, "asleep")) end.push("asleep");
  // [Flame] damage ([Burning]'s too) melts [Freezing].
  const melted = ((damage > 0) || (absorbed > 0)) && /flame/i.test(tag) && has(actor, "freezing");
  if (melted) updates["system.bad-status.freezing"] = 0;
  if ((damage > 0) && has(actor, "hidden")) end.push("hidden");
  await actor.update(updates);
  if (end.length) await removeStatuses(actor, end);
  if ((hp <= 0) && !actor.statuses.has("incapacitated")) await actor.toggleStatusEffect("incapacitated", { active: true });
  if (shared) await takeDamage(bondSource, shared, { reason: "bond", from: actor });

  if (breath) announceBreath(actor, breath);

  const what = named || (reason ? label(reason) : L("Conditions.Damage"));
  const line = L("Conditions.DamageLine", {
    name: actorName(actor), what, n: amount, parts: parts.length ? ` (${parts.join(" ")})` : "", before, hp
  }) + (lastStand ? ` · ${label("lastStand")}` : "") + (breath ? ` · ${breath.line}` : "") + missed.map(m => ` · ${m}`).join("")
    + (melted ? ` · ${L("Conditions.Applied.Melted")}` : "") + (blow ? ` · ${blow.line}` : "");
  if (!silent) {
    const title = from ? L("Conditions.DamageFrom", { what, name: actorName(from) }) : what;
    await postSummary(title, actor.hasPlayerOwner ? [line] : [], actor.hasPlayerOwner ? [] : [line]);
  }
  return { loss: before - hp, line };
}

/**
 * Healing from a condition or a hit (a Drain: the attacker gets back part of the damage), with a line in the chat. A
 * [Cursed] actor, or one with [Black Flame], gets nothing. Asked to the GM when the user doesn't own the actor.
 * @param {Actor} actor
 * @param {number} amount
 * @param {object} [options]
 * @param {string} [options.what]     The name for the chat line (the skill)
 * @param {Actor} [options.from]      Whose HP it came from
 * @param {boolean} [options.silent]  No chat line of its own (the caller writes the line it returns)
 * @param {boolean} [options.natural] The body's own healing ([Regen] acting now, on an actor the user owns): a Tabu
 *                                    that halves the healing of spells and items (`healTaken`, immortal.mjs) doesn't
 *                                    cut it
 * @returns {Promise<{gain: number, line: string}|null>}
 */
export async function takeHealing(actor, amount, { what = "", from = null, silent = false, natural = false } = {}) {
  amount = toInt(amount);
  if (!actor || (amount <= 0) || actor.statuses.has("dead")) return null;
  if (!actor.isOwner) {
    const result = await request("conditionHeal", { actorUuid: actor.uuid, amount, what, fromUuid: from?.uuid ?? null });
    return result?.ok ? result.result : null;
  }
  // [Inversion]: the healing hurts instead.
  if (healingHurts(actor)) {
    const hurt = await takeDamage(actor, amount, { what: `${what || L("Conditions.Heal")} (${label("inversion")})`, from, silent });
    return hurt ? { gain: 0, line: hurt.line } : null;
  }
  const blocker = healBlocker(actor);
  if (blocker) return { gain: 0, line: L("Conditions.NoHeal", { name: actorName(actor), status: label(blocker) }) };
  // A Tabu that halves the healing of spells and items (conditions/immortal.mjs); not the body's own ([Regen] now)
  const healing = natural ? { amount, note: "" } : healTaken(actor, amount);
  const before = toInt(actor.system.health?.value);
  const hp = Math.min(before + healing.amount, toInt(actor.system.health?.max));
  if (hp <= before) return null;
  await actor.update({ "system.health.value": hp });
  if (actor.statuses.has("incapacitated") && (hp > 0)) await actor.toggleStatusEffect("incapacitated", { active: false });
  const lines = [L("Conditions.HealLine", { name: actorName(actor), what: what || L("Conditions.Heal"), n: hp - before, before, hp }) + healing.note];
  recovered(actor, hp - before, { what: what || L("Conditions.Heal"), from });
  // [Agony]: getting HP back hurts.
  const pain = await agonyPain(actor, { silent: true });
  if (pain) lines.push(pain.line);
  if (!silent) await postSummary(what || L("Conditions.Heal"), actor.hasPlayerOwner ? lines : [], actor.hasPlayerOwner ? [] : lines);
  return { gain: hp - before, line: lines.join(" · ") };
}

/** GM side of takeHealing: only when the user owns the actor the HP came from (the target of the drain). */
async function onHealRequest({ actorUuid, amount, what, fromUuid: sourceUuid }, user) {
  const actor = await fromUuid(actorUuid);
  const from = sourceUuid ? await fromUuid(sourceUuid) : null;
  const target = (actor instanceof TokenDocument) ? actor.actor : actor;
  const origin = (from instanceof TokenDocument) ? from.actor : from;
  if (!(target instanceof Actor) || !origin?.testUserPermission(user, "OWNER")) return { ok: false };
  const result = await takeHealing(target, Math.min(toInt(amount), 9999), { what: String(what ?? "").slice(0, 80), from: origin, silent: true });
  return { ok: true, result };
}

/** GM side of takeDamage: only for actors with the status that deals it, or the source of one. */
async function onDamageRequest({ actorUuid, amount, reason, what, fromUuid: sourceUuid, tag }, user) {
  const actor = await fromUuid(actorUuid);
  const from = sourceUuid ? await fromUuid(sourceUuid) : null;
  const target = (actor instanceof TokenDocument) ? actor.actor : actor;
  if (!(target instanceof Actor)) return { ok: false };
  // The user must own the actor whose status reflects or shares the damage.
  const origin = (from instanceof TokenDocument) ? from.actor : from;
  if (!origin?.testUserPermission(user, "OWNER")) return { ok: false };
  const result = await takeDamage(target, Math.min(toInt(amount), 9999), { reason, what: String(what ?? "").slice(0, 80), from: origin, tag });
  return { ok: true, result };
}

/**
 * [Inversion]: an effect about to give [Empowered] or [Regen] (a skill's, with its status data) gives [Weakened] or
 * [Decay] with the same Rating. The statuses toggled by hand stay as they are.
 * @param {Actor} actor
 * @param {ActiveEffect} effect   Not created yet
 */
function invertGift(actor, effect) {
  const statusData = effect.getFlag?.(SYSTEM_ID, "statusData");
  const from = statusData?.statusId;
  const to = (from && has(actor, "inversion")) ? INVERTED_GIFTS[from] : null;
  if (!to) return;
  effect.updateSource({
    name: effect.name.includes(label(from)) ? effect.name.replace(label(from), label(to)) : effect.name,
    img: CONFIG.statusEffects.find(s => s.id === to)?.img ?? effect.img,
    statuses: [...(effect.statuses ?? [])].filter(id => id !== from).concat(to),
    [`flags.${SYSTEM_ID}.statusData.statusId`]: to
  });
  ui.notifications.info(L("Conditions.Inverted", { name: actorName(actor), from: label(from), to: label(to) }));
}

/** Call during the `init` hook. */
export function registerConditionDamage() {
  registerHandler("conditionDamage", onDamageRequest);
  registerHandler("conditionHeal", onHealRequest);
  // Under [Inversion], effects that would give [Empowered] or [Regen] give [Weakened] or [Decay] instead. A [Cursed]
  // character gets no [Regen] nor [Barrier], one with [Black Flame] no [Regen] (effects that would give them are not
  // created).
  Hooks.on("preCreateActiveEffect", (effect, data, options, userId) => {
    if ((userId !== game.user.id) || !rulesOn()) return;
    const actor = effect.parent;
    if (!(actor instanceof Actor)) return;
    invertGift(actor, effect);
    const id = effect.getFlag?.(SYSTEM_ID, "statusData")?.statusId ?? [...(effect.statuses ?? [])][0];
    const blocked = (has(actor, "cursed") && ["regen", "barrier"].includes(id)) || (has(actor, "blackFlame") && (id === "regen"));
    if (blocked) {
      const by = has(actor, "cursed") ? "cursed" : "blackFlame";
      ui.notifications.info(L("Conditions.HealBlocks", { name: actorName(actor), by: label(by), status: label(id) }));
      return false;
    }
  });
}
