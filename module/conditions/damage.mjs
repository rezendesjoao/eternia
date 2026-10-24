/**
 * Damage and healing under the conditions.
 *
 * Applying a damage card (helpers/combat-cards.mjs) asks here:
 * - before: a class Motor may take the whole card (the Dragon Slayer eats an ally's attack of its element); [Exposed]
 *   ignores the Defense and [Cancel]; [Intangible] takes no physical damage; [Soaked] takes its Rating more from
 *   [Shock] and [Cold] damage;
 * - on a failed Dodge Check: [Marked] adds its Rating as direct damage, then the mark ends;
 * - after: [Last Stand] keeps the character at 1 HP once; [Bond] sends half the HP loss to its source; [Mirror]
 *   deals its Rating to the attacker; [Asleep] wakes up; [Charmed] ends when its source deals the damage; [Flame]
 *   damage melts [Freezing] and dries [Soaked]; the damage ends [Hidden] on both sides (not the attacker's, when its
 *   spell keeps it: a Magia's Trait).
 * Healing does nothing to a [Cursed] character, and effects can't give it [Regen] nor [Barrier] (the GM still can
 * by hand, in the sheet).
 *
 * The damage of the conditions themselves ([Burning], [Poisoned], [Shocked], [Doom], [Mirror], [Bond]) goes through
 * takeDamage: [Barrier], [Last Stand] and Incapacitated, with a line in the chat.
 */
import { L, SYSTEM_ID } from "../settings.mjs";
import { registerHandler, request } from "../piles/pile-socket.mjs";
import { actorName, postSummary, toInt } from "../helpers/utils.mjs";
import { listStatusEntries } from "../helpers/statuses.mjs";
import { has, isSourceOf, rating, removeStatuses, rulesOn, sameActor, sourcesOf } from "./rules.mjs";
import { passiveCancels } from "./effects.mjs";
import { motorAbsorbs } from "../classes/motor.mjs";

const label = id => game.i18n.localize(`ETERNIA.StatusEffect.${id}`);

/** Statuses without a field that an application can end (saved for its Undo). */
const ENDED_BY_DAMAGE = ["asleep", "lastStand", "charmed", "hidden"];

/**
 * Rating fields an application can change (the mark spent, the ice melted, the water dried, a status a spell consumed
 * or stripped), saved for its Undo.
 */
const RESTORED_FIELDS = ["marked", "freezing", "soaked", "burning", "poisoned", "shocked", "decay", "fuse", "fissured",
  "regen", "barrier", "empowered", "awakened", "mirror", "weakened", "doom", "berserk"];

/* -------------------------------------------- */
/*  Damage cards                                */
/* -------------------------------------------- */

/**
 * What the defender's conditions change before the damage of a card is worked out.
 * @param {Actor} actor
 * @param {object} card    The damage card data (type, tags)
 * @param {boolean} direct
 * @returns {{noDefense: boolean, noCancel: boolean, immune: boolean, bonus: number, notes: string[]}}
 */
export function beforeDamage(actor, card, direct) {
  const result = { noDefense: false, noCancel: false, immune: false, bonus: 0, notes: [] };
  if (card.recovery) return result;
  const eaten = motorAbsorbs(actor, card);
  if (eaten) {
    result.immune = true;
    result.notes.push(eaten);
    return result;
  }
  if (!rulesOn()) return result;
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

/** Whether healing can reach this actor (not [Cursed]). */
export const canHeal = actor => !(rulesOn() && has(actor, "cursed"));

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
  // A [Cursed] character gets no [Regen] nor [Barrier] (effects that would give them are not created).
  Hooks.on("preCreateActiveEffect", (effect, data, options, userId) => {
    if ((userId !== game.user.id) || !rulesOn()) return;
    const actor = effect.parent;
    if (!(actor instanceof Actor) || !has(actor, "cursed")) return;
    const id = effect.getFlag?.(SYSTEM_ID, "statusData")?.statusId ?? [...(effect.statuses ?? [])][0];
    if (["regen", "barrier"].includes(id)) {
      ui.notifications.info(L("Conditions.CursedBlocks", { name: actorName(actor), status: label(id) }));
      return false;
    }
  });
}
