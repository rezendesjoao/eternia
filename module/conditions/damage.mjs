/**
 * Damage and healing under the conditions.
 *
 * Applying a damage card (helpers/combat-cards.mjs) asks here:
 * - before: a class Motor may take the whole card (the Dragon Slayer eats an ally's attack of its element); [The One]
 *   takes nothing from an attack, nor its statuses; [Exposed] ignores the Defense and [Cancel]; [Intangible] takes no
 *   physical damage; [Soaked] takes its Rating more from [Shock] and [Cold] damage; [Counter] sends a direct attack
 *   of its type back to the attacker, doubled (the card works the damage out, then gives it back);
 * - on a failed Dodge Check: [Marked] adds its Rating as direct damage, then the mark ends;
 * - after: [Last Stand] keeps the character at 1 HP once; [Bond] sends half the HP loss to its source; [Mirror]
 *   deals its Rating to the attacker; [Grudge] keeps the HP loss; [Asleep] wakes up; [Charmed] ends when its source
 *   deals the damage; [Flame] damage melts [Freezing] and dries [Soaked]; the damage ends [Hidden] on both sides (not
 *   the attacker's, when its spell keeps it: a Magia's Trait).
 * Healing does nothing to a [Cursed] character or one with [Black Flame], and effects can't give them [Regen] (nor
 * [Barrier], when [Cursed]); the GM still can by hand, in the sheet.
 *
 * The damage of the conditions themselves ([Burning], [Poisoned], [Shocked], [Doom], [Mirror], [Bond]) goes through
 * takeDamage: [Barrier], [Last Stand] and Incapacitated, with a line in the chat.
 */
import { L, SYSTEM_ID } from "../settings.mjs";
import { registerHandler, request } from "../piles/pile-socket.mjs";
import { actorName, postSummary, toInt } from "../helpers/utils.mjs";
import { listStatusEntries } from "../helpers/statuses.mjs";
import { parseSkillField } from "../helpers/skill-fields.mjs";
import { evaluateFormula, formulaData, isFormula } from "../helpers/effect-formulas.mjs";
import { crOf, has, isSourceOf, rating, removeStatuses, rulesOn, sameActor, sourcesOf, statusEffects } from "./rules.mjs";
import { passiveCancels } from "./effects.mjs";
import { motorAbsorbs } from "../classes/motor.mjs";

const label = id => game.i18n.localize(`ETERNIA.StatusEffect.${id}`);

/** Statuses without a field that an application can end (saved for its Undo). */
const ENDED_BY_DAMAGE = ["asleep", "lastStand", "charmed", "hidden", "counter"];

/**
 * Rating fields an application can change (the mark spent, the ice melted, the water dried, a status a spell consumed
 * or stripped, the damage kept as a grudge), saved for its Undo.
 */
const RESTORED_FIELDS = ["marked", "freezing", "soaked", "burning", "poisoned", "shocked", "decay", "fuse", "fissured",
  "regen", "barrier", "empowered", "awakened", "mirror", "weakened", "doom", "berserk", "grudge"];

/** Statuses that stop all healing: the first one an actor has, or null. */
const NO_HEALING = ["cursed", "blackFlame"];

/** How much damage a [Grudge] keeps: its bearer's CR times this. */
const GRUDGE_CAP = 4;

/* -------------------------------------------- */
/*  Damage cards                                */
/* -------------------------------------------- */

/**
 * What the defender's conditions change before the damage of a card is worked out.
 * @param {Actor} actor
 * @param {object} card    The damage card data (type, tags)
 * @param {boolean} direct
 * @returns {{noDefense: boolean, noCancel: boolean, immune: boolean, untouched: boolean, bonus: number,
 *   counter: {bonus: number, effects: string[]}|null, notes: string[]}}
 *   `untouched`: nothing of the attack reaches the actor (no statuses, no extra damage of a failed Dodge either);
 *   `counter`: the damage, worked out as usual, goes back to the attacker doubled (+ the bonus) instead.
 */
export function beforeDamage(actor, card, direct) {
  const result = { noDefense: false, noCancel: false, immune: false, untouched: false, bonus: 0, counter: null, notes: [] };
  if (card.recovery) return result;
  const eaten = motorAbsorbs(actor, card);
  if (eaten) {
    result.immune = true;
    result.notes.push(eaten);
    return result;
  }
  if (!rulesOn()) return result;
  // [The One]: noon; no attack reaches it.
  if (has(actor, "theOne")) {
    result.immune = true;
    result.untouched = true;
    result.notes.push(L("Conditions.Applied.TheOne"));
    return result;
  }
  result.counter = direct ? null : counterFor(actor, card);
  if (has(actor, "exposed") && !direct) {
    result.noDefense = true;
    result.noCancel = true;
    result.notes.push(L("Conditions.Applied.Exposed"));
  }
  if (has(actor, "intangible") && !direct && (card.type === "physical")) {
    result.immune = true;
    result.notes.push(L("Conditions.Applied.Intangible"));
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

/** Whether a skill reaches more than one target (an area, a line, two targets or more): not a direct attack. */
function isAreaAttack(item) {
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
  return { bonus: own + traitCounterBonus(actor), effects: fits.map(e => e.id) };
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
  const damage = (Math.max(0, amount) * 2) + counter.bonus;
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
 * @param {{hp: number, hpLoss: number, absorbed: number, marked: boolean}} state
 * @returns {{hp: number, updates: object, lines: string[], end: string[], after: Function[]}}
 */
export function afterDamage(actor, card, { hp, hpLoss, absorbed, marked }) {
  const out = { hp, updates: {}, lines: [], end: [], after: [] };
  if (!rulesOn() || card.recovery) return out;
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
  // Dealing damage ends the attacker's [Hidden] (unless its spell keeps it).
  if (hurt && attacker && has(attacker, "hidden") && !card.keepHidden) {
    out.after.push(() => (attacker.isOwner ? removeStatuses(attacker, ["hidden"]) : null));
  }
  return out;
}

/** The statuses an application may end, saved before it for its Undo. */
export function snapshotForUndo(actor) {
  const bad = actor._source.system?.["bad-status"] ?? {};
  return {
    conditionFields: Object.fromEntries(RESTORED_FIELDS.map(id => [id, toInt(bad[id])])),
    conditionEffects: [...actor.effects].filter(e => ENDED_BY_DAMAGE.some(id => e.statuses?.has(id))).map(e => e.toObject())
  };
}

/** Undo: the fields and the statuses the application had ended come back. */
export async function restoreForUndo(actor, before) {
  if (!before?.conditionFields) return;
  await actor.update(Object.fromEntries(Object.entries(before.conditionFields)
    .map(([id, value]) => [`system.bad-status.${id}`, toInt(value)])));
  const missing = (before.conditionEffects ?? []).filter(e => !actor.effects.has(e._id));
  if (missing.length) await actor.createEmbeddedDocuments("ActiveEffect", missing, { keepId: true });
}

/** The status that keeps healing from an actor ([Cursed], [Black Flame]), or null. */
export const healBlocker = actor => (rulesOn() ? (NO_HEALING.find(id => has(actor, id)) ?? null) : null);

/** Whether healing can reach this actor (no [Cursed] nor [Black Flame]). */
export const canHeal = actor => !healBlocker(actor);

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
 * Direct damage from a condition: through [Barrier] (and [Cancel] for a tagged damage such as [Burning]'s Flame),
 * [Last Stand] and Incapacitated. Asked to the GM when the user doesn't own the actor.
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
  if (tag) {
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
  const before = toInt(actor.system.health?.value);
  let hp = Math.max(0, before - damage);
  const updates = { "system.health.value": hp };
  if (absorbed) updates["system.bad-status.barrier"] = barrier - absorbed;
  const end = [];
  let lastStand = false;
  if ((hp <= 0) && rulesOn() && has(actor, "lastStand")) {
    hp = 1;
    updates["system.health.value"] = 1;
    end.push("lastStand");
    lastStand = true;
  }
  if (((damage > 0) || (absorbed > 0)) && has(actor, "asleep")) end.push("asleep");
  // [Flame] damage ([Burning]'s too) melts [Freezing].
  const melted = ((damage > 0) || (absorbed > 0)) && /flame/i.test(tag) && has(actor, "freezing");
  if (melted) updates["system.bad-status.freezing"] = 0;
  if ((damage > 0) && has(actor, "hidden")) end.push("hidden");
  await actor.update(updates);
  if (end.length) await removeStatuses(actor, end);
  if ((hp <= 0) && !actor.statuses.has("incapacitated")) await actor.toggleStatusEffect("incapacitated", { active: true });

  const what = named || (reason ? label(reason) : L("Conditions.Damage"));
  const line = L("Conditions.DamageLine", {
    name: actorName(actor), what, n: amount, parts: parts.length ? ` (${parts.join(" ")})` : "", before, hp
  }) + (lastStand ? ` · ${label("lastStand")}` : "") + (melted ? ` · ${L("Conditions.Applied.Melted")}` : "");
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
 * @returns {Promise<{gain: number, line: string}|null>}
 */
export async function takeHealing(actor, amount, { what = "", from = null, silent = false } = {}) {
  amount = toInt(amount);
  if (!actor || (amount <= 0) || actor.statuses.has("dead")) return null;
  if (!actor.isOwner) {
    const result = await request("conditionHeal", { actorUuid: actor.uuid, amount, what, fromUuid: from?.uuid ?? null });
    return result?.ok ? result.result : null;
  }
  const blocker = healBlocker(actor);
  if (blocker) return { gain: 0, line: L("Conditions.NoHeal", { name: actorName(actor), status: label(blocker) }) };
  const before = toInt(actor.system.health?.value);
  const hp = Math.min(before + amount, toInt(actor.system.health?.max));
  if (hp <= before) return null;
  await actor.update({ "system.health.value": hp });
  if (actor.statuses.has("incapacitated") && (hp > 0)) await actor.toggleStatusEffect("incapacitated", { active: false });
  const line = L("Conditions.HealLine", { name: actorName(actor), what: what || L("Conditions.Heal"), n: hp - before, before, hp });
  if (!silent) await postSummary(what || L("Conditions.Heal"), actor.hasPlayerOwner ? [line] : [], actor.hasPlayerOwner ? [] : [line]);
  return { gain: hp - before, line };
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

/** Call during the `init` hook. */
export function registerConditionDamage() {
  registerHandler("conditionDamage", onDamageRequest);
  registerHandler("conditionHeal", onHealRequest);
  // A [Cursed] character gets no [Regen] nor [Barrier], one with [Black Flame] no [Regen] (effects that would give
  // them are not created).
  Hooks.on("preCreateActiveEffect", (effect, data, options, userId) => {
    if ((userId !== game.user.id) || !rulesOn()) return;
    const actor = effect.parent;
    if (!(actor instanceof Actor)) return;
    const id = effect.getFlag?.(SYSTEM_ID, "statusData")?.statusId ?? [...(effect.statuses ?? [])][0];
    const blocked = (has(actor, "cursed") && ["regen", "barrier"].includes(id)) || (has(actor, "blackFlame") && (id === "regen"));
    if (blocked) {
      const by = has(actor, "cursed") ? "cursed" : "blackFlame";
      ui.notifications.info(L("Conditions.HealBlocks", { name: actorName(actor), by: label(by), status: label(id) }));
      return false;
    }
  });
}
