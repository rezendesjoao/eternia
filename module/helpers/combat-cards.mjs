/**
 * Combat chat cards (Rules v0.3, IV.c. ATTACKS).
 *
 * Attack card: a skill Check rolled with targets becomes an opposed [Hit Check] against each
 * target's [Dodge Check] (Evasion / Resistance). Monsters and characters dodge automatically, when the attack is
 * declared; with the setting "autoDodge" off, characters dodge from the card (their owner clicks "Dodge"). Ties, and
 * Critical vs Critical, go to the Defender. What a Dodge Check uses up ([Focused]…) ends on the GM's side when whoever
 * rolled it doesn't own the target.
 *
 * Damage card: the skill's Damage Roll, with one row per target hit. Whoever owns a target applies
 * the damage to it: Physical/Magic Defense by type, [Cancel], then [Barrier], then HP. If the target
 * failed its Dodge Check, Hate Damage, [Pursuit] and [Weakness] follow, each through [Barrier] on
 * its own, and a character loses 1 Hate. Every application posts a summary with an Undo button.
 * The attacker's effects may give the damage tags (`flags.eternia.damageTags`) and statuses to whoever it hits
 * (`flags.eternia.onHit: {statusId, value}`), like an Engineer's Spark Stone (professions/); so may the skill itself
 * (`flags.eternia.hitStatuses: [{statusId, value}]`, the value a formula: the spells of the Magias). The spells and
 * the Traits of the Magias add more (helpers/magic-traits.mjs): damage against a status (consuming it or not), a
 * status that escalates, statuses stripped, [Cancel] / [Barrier] / half the Defense ignored, a flat bonus.
 *
 * Players can't update messages they didn't write, so dodges and "applied" marks made on someone
 * else's card go through the active GM (see pile-socket.mjs).
 */
import { diceFormula } from "./dice.mjs";
import { registerHandler, request } from "../piles/pile-socket.mjs";
import { listStatusEntries } from "./statuses.mjs";
import { mainWeapon, parseRange } from "./hands.mjs";
import { skillModifiers } from "./roll-bonuses.mjs";
import { hateRank } from "./effect-conditions.mjs";
import { applyModifier, consumeAfterRoll, dodgeModifier } from "../conditions/rolls.mjs";
import { afterDamage, agonyPain, beforeDamage, cloneDecoy, counterBack, healBlocker, healingHurts, markDamage, recovered,
  restoreForUndo, snapshotForUndo, takeDamage, takeHealing } from "../conditions/damage.mjs";
import { consumedBy, passiveCancels, passiveWeaknesses, stealStatuses } from "../conditions/effects.mjs";
import { allySpellHurts, blowOutcome, hitApplies } from "../conditions/blows.mjs";
import { coverFor, healTaken } from "../conditions/immortal.mjs";
import { statusEffectData } from "../chat/status-links.mjs";
import { motorDamageTags, motorOnHit } from "../classes/motor.mjs";
import { evaluateFormula, formulaData, isFormula } from "./effect-formulas.mjs";
import { actorHasTag, drawRandomHit, magicExtras } from "./magic-traits.mjs";
import { crOf, has, rating, removeStatuses, rulesOn } from "../conditions/rules.mjs";
import { cursedByDecree } from "../conditions/decree.mjs";
import { packBonus, packBonuses } from "../bestiary/pack.mjs";
import { lastingCard, lastingHitData } from "../conditions/lasting.mjs";
import { statusDefinition } from "./statuses.mjs";
import { tagLabel as termTag } from "../i18n/terms.mjs";
import { setting } from "../settings.mjs";

const TEMPLATES = {
  attack: "systems/eternia/templates/chat/attack-card.hbs",
  damage: "systems/eternia/templates/chat/damage-card.hbs",
  applied: "systems/eternia/templates/chat/damage-applied.hbs"
};

/** Damage modes of the damage card buttons. */
const MODES = ["damage", "half", "double", "direct", "heal"];
/** Card fields the owner of a target may change on someone else's card. */
const PATCHABLE = { attack: ["dodge", "hit"], damage: ["applied"] };

const toInt = value => Math.trunc(Number(value) || 0);
const L = key => game.i18n.localize(`ETERNIA.Combat.${key}`);

/* -------------------------------------------- */
/*  Registration                                */
/* -------------------------------------------- */

/** Call during the `init` hook. */
export function registerCombatCards() {
  registerHandler("combatCardUpdate", _onCardUpdateRequest);
  registerHandler("combatCardAdjust", _onCardAdjustRequest);
  registerHandler("combatDodgeConsume", _onDodgeConsumeRequest);
  Hooks.on("renderChatMessageHTML", _onRenderChatMessage);
}

/* -------------------------------------------- */
/*  Dice helpers                                */
/* -------------------------------------------- */

/**
 * Critical (two or more 6s) and Fumble (all 1s; any 1 when [Overconfident]) of a 2D6-style roll.
 * A Fumble counts as a result of 0.
 * @param {Roll} roll
 * @param {Actor} [actor]   The roller, for [Overconfident]
 */
function rollOutcome(roll, actor) {
  const results = roll.dice.flatMap(d => d.results.filter(r => r.active).map(r => r.result));
  const overconfident = !!actor?.system["bad-status"]?.overconfident;
  const fumble = results.length > 0 && (results.every(r => r === 1) || (overconfident && results.includes(1)));
  const critical = !fumble && results.filter(r => r === 6).length >= 2;
  const mod = roll.total - results.reduce((t, r) => t + r, 0);
  return { total: fumble ? 0 : roll.total, critical, fumble, mod, formula: roll.formula, results: results.join(", ") };
}

/**
 * Whether the Hit Check beats the Dodge Check.
 * Fumbles always fail, Criticals always succeed, the Defender wins ties and Critical vs Critical.
 */
function resolveHit(attack, dodge) {
  if (attack.fumble) return false;
  if (dodge.fumble) return true;
  if (dodge.critical) return false;
  if (attack.critical) return true;
  return attack.total > dodge.total;
}

/* -------------------------------------------- */
/*  Hate                                        */
/* -------------------------------------------- */

/** A monster's Hate Multiplier ("x2", "2", "×1.5"), 0 for anything else. */
function hateMultiplier(actor) {
  if (actor?.type !== "monster") return 0;
  return Number(String(actor.system.hateMultiplier ?? "").replace(/[^\d.]/g, "")) || 0;
}

/* -------------------------------------------- */
/*  Targets                                     */
/* -------------------------------------------- */

/** The actor of a card target (synthetic token actors included). */
function targetActor(target) {
  return fromUuidSync(target.tokenUuid)?.actor ?? fromUuidSync(target.actorUuid) ?? null;
}

/** Card entries for the user's targeted tokens. */
function userTargets() {
  return targetEntries(game.user.targets);
}

/**
 * Card entries for these tokens (placeables).
 * @param {Iterable<Token>} tokens
 * @returns {object[]}
 */
export function targetEntries(tokens) {
  return [...tokens].filter(t => t?.actor).map(t => ({
    tokenUuid: t.document.uuid,
    actorUuid: t.actor.uuid,
    name: t.document.name,
    // Animated tokens (.webm) can't be shown in an <img>: use the actor's picture instead.
    img: foundry.helpers.media.VideoHelper.hasVideoExtension(t.document.texture.src ?? "") ? t.actor.img : (t.document.texture.src ?? t.actor.img)
  }));
}

/**
 * Roll a target's Dodge Check: its Evasion / Resistance, with the dice its conditions take or give (min 1D, see
 * conditions/rolls.mjs: [Dazed], [Paralyzed], [Marked]…), +2 for a [Hate Under] character. An [Asleep], [Petrified]
 * or [Nightmare] target fails it outright.
 * @param {Actor} actor
 * @param {"evasion"|"resistance"} vs
 * @param {object} [context]
 * @param {Actor} [context.attacker]
 * @param {Item} [context.item]   The attack
 */
async function rollDodge(actor, vs, { attacker = null, item = null } = {}) {
  const check = actor.system.checks?.[vs] ?? {};
  const condition = dodgeModifier(actor, { vs, attacker, item });
  if (condition.autoFail) {
    const roll = await new Roll("0").evaluate();
    const reason = game.i18n.localize(`ETERNIA.StatusEffect.${condition.autoFail}`);
    return { roll, dodge: { total: 0, critical: false, fumble: true, formula: "—", results: "", conditions: reason } };
  }
  let { dice, mod } = applyModifier({ dice: toInt(check.dice), mod: toInt(actor.type === "monster" ? check.mod : check.total) }, condition);
  const hateUnder = hateRank(actor) === "under";
  if (hateUnder) mod += 2;
  const roll = await new Roll(diceFormula({ dice, mod })).evaluate();
  // Rolled for someone else's actor (a player attacking a monster, or an ally): the GM ends what it used up
  if (actor.isOwner) await consumeAfterRoll(actor, condition.consume);
  else if (condition.consume?.length) await request("combatDodgeConsume", { actorUuid: actor.uuid, vs, consume: condition.consume });
  return { roll, dodge: { ...rollOutcome(roll, actor), hateUnder, conditions: condition.text } };
}

/**
 * GM side of a Dodge Check rolled by someone who doesn't own the target: what it used up ends (only what a Dodge
 * Check of that kind uses up on that actor).
 */
async function _onDodgeConsumeRequest({ actorUuid, vs, consume }) {
  const actor = await fromUuid(actorUuid).catch(() => null);
  if (!(actor instanceof Actor)) return { ok: false };
  const usable = new Set(dodgeModifier(actor, { vs: (vs === "resistance") ? "resistance" : "evasion" }).consume);
  await consumeAfterRoll(actor, (Array.isArray(consume) ? consume : []).filter(c => usable.has(c)));
  return { ok: true };
}

/* -------------------------------------------- */
/*  Range                                       */
/* -------------------------------------------- */

/** The token an actor acts from: a controlled one, else its first token on the scene. */
function actorToken(actor) {
  if (!actor || !canvas.ready) return null;
  return canvas.tokens.controlled.find(t => t.actor === actor) ?? actor.getActiveTokens(true)[0] ?? null;
}

/**
 * Distance in Sq between two tokens, counted from the square each token's center is in, with
 * Manhattan distance (a diagonal counts as 2). null outside square grids.
 */
function sqDistance(a, b) {
  if (!a || !b || (canvas.grid.type !== CONST.GRID_TYPES.SQUARE)) return null;
  const p = canvas.grid.getOffset(a.center);
  const q = canvas.grid.getOffset(b.center);
  return Math.abs(p.i - q.i) + Math.abs(p.j - q.j);
}

/* -------------------------------------------- */
/*  Damage tags                                 */
/* -------------------------------------------- */

/** "[Flame]", " flame " -> "flame" */
const normalizeTag = tag => String(tag ?? "").replace(/[\[\]]/g, "").trim().toLowerCase();

/** Implicit tags of a damage type, so [Weakness (Physical)] / [Cancel (Magic)] also match. */
const TYPE_TAGS = { physical: ["Physical"], magical: ["Magic", "Magical"], penetrating: ["Penetrating"], direct: ["Direct"] };

/** Whether a skill attacks with the weapon (Range "Weapon", or a [Weapon / Melee / Ranged Attack] tag). */
function isWeaponAttack(item) {
  return /weapon|武器|무기/i.test(item.system.range ?? "")
    || (item.system.tags ?? []).some(t => /^(weapon|melee|ranged) attack$/i.test(normalizeTag(t)));
}

/** The main-hand weapon a skill attacks with, or null (not a weapon attack / no weapon). */
function attackWeapon(item, attacker) {
  const actor = attacker ?? item.actor;
  return (actor && isWeaponAttack(item)) ? mainWeapon(actor) : null;
}

/**
 * Tags of an attack's damage: the skill's tags, plus the main weapon's tags when the skill attacks
 * with the weapon (Range "Weapon", or a [Weapon / Melee / Ranged Attack] tag), the attacker's effects' and its
 * class Motors' (the Dragon Slayer's element).
 * @param {Item} item
 * @param {Actor} [attacker]
 * @returns {string[]}
 */
function attackTags(item, attacker) {
  const tags = [...(item.system.tags ?? [])];
  const weapon = attackWeapon(item, attacker);
  if (weapon) tags.push(...(weapon.system.tags ?? []));
  const actor = attacker ?? item.actor;
  for (const effect of actor?.effects ?? []) {
    if (effect.active) tags.push(...(effect.getFlag("eternia", "damageTags") ?? []));
  }
  if (actor?.type === "character") tags.push(...motorDamageTags(actor, item));
  const seen = new Set();
  return tags.filter(t => {
    const key = normalizeTag(t);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * The highest [Weakness] / [Cancel] entry that applies to damage with these tags: entries without
 * a tag apply to any damage.
 * @param {object} bad        The actor's `bad-status`
 * @param {string} list       "weaknesses" | "cancels"
 * @param {string} legacy     Pre-v5 single Rating field ("weakness" | "cancel")
 * @param {string[]} tags     Tags of the damage (with its type tags)
 * @returns {{value: number, tag: string}|null}
 */
function bestTagged(bad, list, legacy, tags, extra = []) {
  const entries = [...listStatusEntries(bad[list], true), ...extra];
  if (!entries.length && (Number(bad[legacy]) > 0)) entries.push({ value: Number(bad[legacy]), tag: "" });
  const keys = new Set(tags.map(normalizeTag));
  return entries
    .filter(e => !e.tag || keys.has(normalizeTag(e.tag)))
    .reduce((best, e) => (!best || (e.value > best.value)) ? e : best, null);
}

/**
 * The statuses a skill gives to whoever its damage hits (flags.eternia.hitStatuses; formulas read the use), and one
 * of its `randomHit` statuses, drawn now (the Cartas).
 */
function skillHitStatuses(item, attacker) {
  const random = drawRandomHit(item, attacker);
  return [...fixedHitStatuses(item, attacker), ...(random ? [random] : [])];
}

/** A skill's own hitStatuses, with their values worked out. */
function fixedHitStatuses(item, attacker) {
  const list = item?.flags?.eternia?.hitStatuses ?? [];
  if (!list.length) return [];
  const data = formulaData(attacker ?? item.actor, item);
  return list.filter(h => h?.statusId).map(h => ({
    statusId: h.statusId,
    value: (isFormula(h.value) ? evaluateFormula(h.value, data) : toInt(h.value)) || null,
    name: item.name,
    // Only on some targets: of a lower Rank than the caster (`rankBelow`: the Apagão's sleep), with one of the tags,
    // or left by the hit with that many HP or less (conditions/blows.mjs)
    ...(h.rankBelow ? { rankBelow: crOf(attacker ?? item.actor) } : {}),
    ...(h.targetTags ? { targetTags: [].concat(h.targetTags) } : {}),
    ...((h.belowHp !== undefined) ? { belowHp: (isFormula(h.belowHp) ? evaluateFormula(h.belowHp, data) : toInt(h.belowHp)) ?? 0 } : {})
  }));
}

/** A status name. */
const statusLabel = id => game.i18n.localize(`ETERNIA.StatusEffect.${id}`);

/** The statuses the attacker's effects give to whoever its damage hits. */
function onHitOf(attacker) {
  return (attacker?.effects ?? []).filter(e => e.active && e.getFlag("eternia", "onHit")?.statusId).map(e => {
    const hit = e.getFlag("eternia", "onHit");
    return { statusId: hit.statusId, value: toInt(hit.value) || null, name: e.name };
  });
}

/* -------------------------------------------- */
/*  Card rendering                              */
/* -------------------------------------------- */

async function renderCard(kind, data, roll) {
  const labels = {
    vs: data.vs ? game.i18n.localize(`ETERNIA.Check.${data.vs.capitalize()}`) : "",
    type: data.recovery ? L("Type.recovery") : L(`Type.${data.type}`)
  };
  return foundry.applications.handlebars.renderTemplate(TEMPLATES[kind], {
    ...data,
    labels,
    rollHTML: roll ? await roll.render() : "",
    recoveryOnly: !!data.recovery
  });
}

/**
 * Change one target of an attack / damage card and re-render it.
 * Done directly by the card's author or a GM, else by the active GM on request.
 */
async function updateCardTarget(message, kind, index, patch) {
  if (message.isOwner) return _applyTargetPatch(message, kind, index, patch);
  const result = await request("combatCardUpdate", { messageId: message.id, kind, index, patch });
  if (!result.ok) ui.notifications.warn(game.i18n.localize(result.error ?? "ETERNIA.Piles.Error.Generic"));
}

async function _applyTargetPatch(message, kind, index, patch) {
  const data = foundry.utils.deepClone(message.getFlag("eternia", kind));
  if (!data?.targets?.[index]) return;
  Object.assign(data.targets[index], patch);
  const content = await renderCard(kind, data, message.rolls[0]);
  return message.update({ content, [`flags.eternia.${kind}`]: data });
}

/** GM side of updateCardTarget: only the owner of that target may change it. */
async function _onCardUpdateRequest({ messageId, kind, index, patch }, user) {
  const message = game.messages.get(messageId);
  const target = message?.getFlag("eternia", kind)?.targets?.[index];
  if (!target || !PATCHABLE[kind]) return { ok: false };
  if (!targetActor(target)?.testUserPermission(user, "OWNER")) return { ok: false };
  const allowed = Object.fromEntries(Object.entries(patch ?? {}).filter(([k]) => PATCHABLE[kind].includes(k)));
  await _applyTargetPatch(message, kind, index, allowed);
  return { ok: true };
}

/* -------------------------------------------- */
/*  Attack card                                 */
/* -------------------------------------------- */

/**
 * Whether a skill Check should become an attack card: it is made against Evasion / Resistance
 * (or is Automatic) and the user targets at least one token.
 */
export function isAttack(item) {
  return ["evasion", "resistance", "auto"].includes(item.system.check.vs) && game.user.targets.size > 0;
}

/**
 * Roll the Hit Check (none when Automatic) and post the attack card. Monster targets dodge now, and character targets
 * too (setting "autoDodge").
 * @param {Item} item
 * @param {Actor|null} attacker
 * @param {string|null} formula    Hit Check formula, null for an Automatic check
 * @param {string} flavor
 * @param {object} [options]
 * @param {string} [options.bonuses]   Roll bonuses added to the check (see roll-bonuses.mjs)
 * @param {boolean} [options.auto]     Hits without a Dodge Check even against Evasion (a Samurai's Perfect Cut)
 */
export async function createAttackCard(item, attacker, formula, flavor, { bonuses = "", auto: autoHit = false } = {}) {
  const vs = item.system.check.vs;
  const auto = autoHit || (vs === "auto");

  // Range: every target must be within the skill's range, else the attack can't be declared.
  // Range bonuses of the attacker's effects (see roll-bonuses.mjs skillModifiers)
  const rangeMod = skillModifiers(attacker ?? item.actor, item).range;
  const range = rangeMod ? rangeMod.value : parseRange(item.system.range, attacker ?? item.actor);
  // "Weapon" also shows the weapon's actual range: "Weapon (Close)".
  let rangeLabel = rangeMod ? rangeMod.text : item.system.range;
  if (!rangeMod && (range !== null) && !/^\s*(close|\d+\s*sq)\s*$/i.test(rangeLabel ?? "")) {
    rangeLabel += ` (${range ? `${range}Sq` : L("Close")})`;
  }
  const origin = actorToken(attacker ?? item.actor);
  const targets = userTargets().map(target => ({
    ...target, dodge: null, hit: auto ? true : null, auto,
    distance: sqDistance(origin, fromUuidSync(target.tokenUuid)?.object)
  }));
  const far = targets.filter(t => (range !== null) && (t.distance !== null) && (t.distance > range));
  if (far.length) {
    ui.notifications.warn(game.i18n.format("ETERNIA.Combat.Notif.OutOfRange", {
      names: far.map(t => `${t.name} (${t.distance} Sq)`).join(", "), range: rangeLabel
    }));
    return null;
  }

  const rolls = [];
  let attack = null;
  if (!auto) {
    const roll = await new Roll(formula).evaluate();
    rolls.push(roll);
    attack = rollOutcome(roll, attacker);
  }
  // Monsters dodge right away; characters too, unless their owners roll from the card (setting "autoDodge").
  const dodgers = setting("autoDodge") === false ? ["monster"] : ["monster", "character"];
  const dodgeRolls = new Map();
  for (const entry of targets) {
    const actor = targetActor(entry);
    if (auto || !dodgers.includes(actor?.type)) continue;
    const { roll, dodge } = await rollDodge(actor, vs, { attacker: attacker ?? item.actor, item });
    rolls.push(roll);
    dodgeRolls.set(entry, roll);
    entry.dodge = dodge;
    entry.hit = resolveHit(attack, dodge);
  }

  const data = {
    itemUuid: item.uuid,
    skillName: item.name,
    img: item.img,
    flavor,
    bonuses,
    range: rangeLabel,
    weapon: attackWeapon(item, attacker)?.name ?? null,
    vs: auto ? "" : vs,
    auto,
    attack,
    attackerType: attacker?.type ?? item.actor?.type ?? null,
    hateMultiplier: hateMultiplier(attacker ?? item.actor),
    targets
  };
  const messageData = {
    speaker: ChatMessage.getSpeaker({ actor: attacker ?? item.actor }),
    content: await renderCard("attack", data, rolls[0]),
    rolls,
    flags: { eternia: { attack: data } }
  };
  ChatMessage.applyMode(messageData);
  const message = await ChatMessage.create(messageData);
  /**
   * An attack was declared against its targets (the Samurai's Flowing Water gains Cuts). Only on this client.
   * @param {ChatMessage} message
   * @param {{item: Item, attacker: Actor|null, targets: Actor[]}} context
   */
  if (message) Hooks.callAll("eternia.attack", message, { item, attacker: attacker ?? item.actor, targets: targets.map(targetActor).filter(Boolean) });
  if (message) {
    const by = attacker ?? item.actor;
    /**
     * A check was rolled: an attack's Hit Check, a target's Dodge Check (the Weaver's Pattern). Only on this client.
     * @param {Actor} actor
     * @param {Roll} roll
     * @param {{item: Item|null, kind: "check"|"attack"|"dodge", message: ChatMessage, attacker?: Actor}} context
     */
    // The message's own Roll: creating the message serializes the `rolls` given to it
    const hitRoll = auto ? null : message.rolls?.[0];
    if (hitRoll) Hooks.callAll("eternia.check", by, hitRoll, { item, kind: "attack", message });
    for (const entry of targets) {
      const actor = targetActor(entry);
      if (!actor) continue;
      if (dodgeRolls.has(entry)) {
        // A character's dodge rolled here, as when its owner rolls it from the card (onRollDodge)
        if (actor.type === "character") Hooks.callAll("eternia.dodge", message, { actor, attacker: by, item, hit: entry.hit });
        Hooks.callAll("eternia.check", actor, dodgeRolls.get(entry), { item, kind: "dodge", message, attacker: by });
      }
      /**
       * An attack's result against one target is known: an automatic hit or a dodge rolled here, a character's dodge
       * from the card. Only on this client.
       * @param {ChatMessage} message
       * @param {{attacker: Actor, target: Actor, item: Item, hit: boolean}} context
       */
      if (typeof entry.hit === "boolean") Hooks.callAll("eternia.attackResult", message, { attacker: by, target: actor, item, hit: entry.hit });
    }
  }
  return message;
}

/** A character's owner rolls its Dodge Check from the attack card. */
async function onRollDodge(message, index) {
  const data = message.getFlag("eternia", "attack");
  const target = data?.targets?.[index];
  const actor = target && targetActor(target);
  if (!actor?.isOwner || target.dodge) return;
  const item = data.itemUuid ? fromUuidSync(data.itemUuid) : null;
  const { roll, dodge } = await rollDodge(actor, data.vs, { attacker: item?.actor ?? null, item });
  await game.dice3d?.showForRoll(roll, game.user, true);
  const hit = resolveHit(data.attack, dodge);
  await updateCardTarget(message, "attack", index, { dodge, hit });
  /**
   * A character rolled its Dodge Check against an attack (the Samurai's Waiting Blade). Only on this client.
   * @param {ChatMessage} message
   * @param {{actor: Actor, attacker: Actor|null, item: Item|null, hit: boolean}} context
   */
  Hooks.callAll("eternia.dodge", message, { actor, attacker: item?.actor ?? null, item, hit });
  Hooks.callAll("eternia.check", actor, roll, { item, kind: "dodge", message, attacker: item?.actor ?? null });
  Hooks.callAll("eternia.attackResult", message, { attacker: item?.actor ?? null, target: actor, item, hit });
}

/* -------------------------------------------- */
/*  Changing a check after the roll             */
/* -------------------------------------------- */

/** The dice and the modifier of a check outcome (cards without `mod` read it from the total or the formula). */
function outcomeParts(outcome) {
  const dice = String(outcome?.results ?? "").split(",").map(toInt).filter(n => n > 0);
  let mod = outcome?.mod;
  if (!Number.isFinite(mod)) {
    mod = outcome?.fumble
      ? toInt(String(outcome?.formula ?? "").match(/([+-]\s*\d+)\s*$/)?.[1]?.replace(/\s/g, ""))
      : toInt(outcome?.total) - dice.reduce((t, n) => t + n, 0);
  }
  return { dice, mod };
}

/**
 * A check outcome with other dice: the total, Critical and Fumble follow them; the modifier stays.
 * @param {object} outcome   An attack's `attack` or a target's `dodge`
 * @param {number[]} dice
 * @returns {object}
 */
export function outcomeWithDice(outcome, dice) {
  const { mod } = outcomeParts(outcome);
  const fumble = (dice.length > 0) && dice.every(r => r === 1);
  const critical = !fumble && (dice.filter(r => r === 6).length >= 2);
  return { ...outcome, total: fumble ? 0 : dice.reduce((t, n) => t + n, 0) + mod, critical, fumble, mod, results: dice.join(", ") };
}

/** The dice results of a check outcome. */
export const outcomeDice = outcome => outcomeParts(outcome).dice;

/**
 * Change a check of an attack card after it was rolled and judge the hits again: `dice` replaces its dice (the
 * modifier stays; Critical and Fumble follow the new dice), `delta` adds to its total. For the class Motors' card
 * actions (the Weaver's Threads, the Strategist's Reading). Done by the card's author or a GM, else by the active GM
 * on request.
 * @param {ChatMessage} message
 * @param {object} change
 * @param {"attack"|"dodge"} change.kind   The Hit Check, or one target's Dodge Check
 * @param {number} [change.index]          That target
 * @param {number[]} [change.dice]
 * @param {number} [change.delta]
 * @param {string} [change.note]           Shown on the card
 * @param {string} [change.actorUuid]      Whose Motor changes it (the GM checks the user owns it)
 * @returns {Promise<boolean>}
 */
export async function adjustCardRoll(message, change) {
  if (message.isOwner) return _applyAdjust(message, change);
  const result = await request("combatCardAdjust", { messageId: message.id, change });
  if (!result?.ok) ui.notifications.warn(game.i18n.localize(result?.error ?? "ETERNIA.Piles.Error.Generic"));
  return !!result?.ok;
}

async function _applyAdjust(message, { kind, index = null, dice = null, delta = 0, note = "" }) {
  const data = foundry.utils.deepClone(message.getFlag("eternia", "attack"));
  if (!data || data.auto) return false;
  const target = (kind === "dodge") ? data.targets?.[index] : null;
  const outcome = (kind === "attack") ? data.attack : target?.dodge;
  if (!outcome) return false;
  const next = (Array.isArray(dice) && dice.length) ? outcomeWithDice(outcome, dice.map(toInt)) : { ...outcome };
  if (delta) next.total = next.fumble ? 0 : toInt(next.total) + toInt(delta);
  next.notes = [...(outcome.notes ?? []), note].filter(Boolean);
  const before = data.targets.map(t => t.hit);
  if (kind === "attack") {
    data.attack = next;
    for (const t of data.targets) if (t.dodge) t.hit = resolveHit(data.attack, t.dodge);
  }
  else {
    target.dodge = next;
    if (data.attack) target.hit = resolveHit(data.attack, next);
  }
  await message.update({ content: await renderCard("attack", data, message.rolls[0]), "flags.eternia.attack": data });
  // The results that changed are told again (a Thread that turns a miss into a hit opens the Assassin's Breach).
  const item = data.itemUuid ? fromUuidSync(data.itemUuid) : null;
  data.targets.forEach((t, i) => {
    if ((typeof t.hit !== "boolean") || (t.hit === before[i])) return;
    const actor = targetActor(t);
    if (actor) Hooks.callAll("eternia.attackResult", message, { attacker: item?.actor ?? null, target: actor, item, hit: t.hit, adjusted: true });
  });
  return true;
}

/** GM side of adjustCardRoll: the user must own the character whose Motor changes the check. */
async function _onCardAdjustRequest({ messageId, change }, user) {
  const message = game.messages.get(messageId);
  const actor = change?.actorUuid ? fromUuidSync(change.actorUuid) : null;
  if (!message || !(actor instanceof Actor) || !actor.testUserPermission(user, "OWNER")) return { ok: false };
  return { ok: await _applyAdjust(message, change) };
}

/* -------------------------------------------- */
/*  Damage card                                 */
/* -------------------------------------------- */

/** How many recent chat messages are searched for the attack a Damage Roll belongs to. */
const ATTACK_LOOKBACK = 30;

/**
 * The latest attack card of this skill among the recent chat messages, if any.
 * @param {Item} item
 * @returns {ChatMessage|null}
 */
export function findAttackMessage(item) {
  const recent = game.messages.contents.slice(-ATTACK_LOOKBACK).reverse();
  return recent.find(m => m.getFlag("eternia", "attack")?.itemUuid === item.uuid) ?? null;
}

/**
 * Roll the Damage Roll and post the damage card. With the skill's attack card, its targets are the
 * ones that were not dodged; otherwise, the user's targets (no Dodge Check failed).
 * @param {Item} item
 * @param {Actor|null} attacker
 * @param {string} formula
 * @param {string} flavor
 * @param {ChatMessage} [attackMessage]
 * @param {object[]} [defaultTargets]   Targets when there is no attack card, instead of the user's
 */
export async function createDamageCard(item, attacker, formula, flavor, attackMessage, defaultTargets, { bonuses = "" } = {}) {
  const roll = await new Roll(formula).evaluate();
  const attack = attackMessage?.getFlag("eternia", "attack");
  const targets = attack
    ? attack.targets.filter(t => t.hit !== false).map(t => ({
      tokenUuid: t.tokenUuid, actorUuid: t.actorUuid, name: t.name, img: t.img,
      // Pending dodges are treated as failed: the attack was not dodged (yet).
      dodgeFailed: !attack.auto, applied: null
    }))
    : (defaultTargets ?? userTargets()).map(t => ({ ...t, dodgeFailed: false, applied: null }));

  const { type, recovery } = item.system.damage;
  // No damage type set on the skill: weapon attacks go against Evasion, magic against Resistance.
  const fallbackType = { evasion: "physical", resistance: "magical" }[item.system.check.vs] ?? "penetrating";
  // What the spell and the Traits of its Magia add (helpers/magic-traits.mjs)
  const extras = magicExtras(item, attacker);
  // A [Pacified] attacker hurts no one: the card says so, and its damage is 0 when applied (conditions/damage.mjs)
  const pacified = !recovery && rulesOn() && has(attacker ?? item.actor, "pacified");
  if (pacified) bonuses = [bonuses, L("Pacified")].filter(Boolean).join(", ");
  const data = {
    itemUuid: item.uuid,
    skillName: item.name,
    img: item.img,
    flavor,
    bonuses,
    total: roll.total,
    type: type || fallbackType,
    recovery,
    tags: attackTags(item, attacker),
    bonus: recovery ? extras.healBonus : extras.bonus,
    // A monster's pack: more damage for each of its allies engaged with the target (bestiary/pack.mjs)
    bonusVs: recovery ? [] : [...extras.vs, ...packBonuses(attacker ?? item.actor)],
    escalate: recovery ? [] : extras.escalate,
    strip: recovery ? [] : extras.strip,
    pierce: recovery ? {} : extras.pierce,
    keepHidden: extras.keepHidden,
    pacified,
    drain: recovery ? 0 : extras.drain,
    steal: recovery ? [] : extras.steal,
    onHit: recovery ? [] : [...onHitOf(attacker ?? item.actor), ...motorOnHit(attacker ?? item.actor, item),
      ...skillHitStatuses(item, attacker), ...extras.onHit],
    // The statuses of the hits: infinite (the Magia Infinito), given by a spell (conditions/lasting.mjs)
    ...lastingCard(item, attacker),
    attackerUuid: (attacker ?? item.actor)?.uuid ?? "",
    attackerType: attack?.attackerType ?? attacker?.type ?? item.actor?.type ?? null,
    hateMultiplier: attack?.hateMultiplier ?? hateMultiplier(attacker ?? item.actor),
    targets
  };
  const messageData = {
    speaker: ChatMessage.getSpeaker({ actor: attacker ?? item.actor }),
    content: await renderCard("damage", data, roll),
    rolls: [roll],
    flags: { eternia: { damage: data } }
  };
  ChatMessage.applyMode(messageData);
  const message = await ChatMessage.create(messageData);
  // The attacker's statuses the spell spends (the [Grudge] a blow lets out): helpers/magic-traits.mjs
  const spender = attacker ?? item.actor;
  if (extras.spend.length && spender?.isOwner) {
    await removeStatuses(spender, extras.spend.filter(id => has(spender, id)), { eterniaNoFatigue: extras.spendFree });
  }
  return message;
}

/* -------------------------------------------- */
/*  Applying damage                             */
/* -------------------------------------------- */

/** Physical / Magic Defense of an actor. */
function defenseOf(actor, type) {
  const key = { physical: "phys", magical: "magic" }[type];
  if (!key) return 0;
  const value = actor.system["battle-status"]?.defense?.[key];
  return toInt(typeof value === "object" ? value.total : value);
}

/**
 * Apply a damage card's damage (or healing) to one actor.
 * @param {Actor} actor
 * @param {object} card          The damage card data
 * @param {string} mode          damage | half | double | direct | heal
 * @param {boolean} dodgeFailed  Whether Hate Damage / Pursuit / Weakness apply
 * @returns {Promise<string>}    Short result shown on the damage card
 */
async function applyDamage(actor, card, mode, dodgeFailed) {
  const system = actor.system;
  const bad = system["bad-status"] ?? {};
  // The statuses before the hit (a status that escalates, the fire that only dries the water)
  const had = new Set(actor.statuses);
  const before = {
    hp: toInt(system.health.value),
    barrier: toInt(bad.barrier),
    pursuits: [...(bad.pursuits ?? [])].map(toInt),
    hate: toInt(system.infos?.hate),
    overconfident: !!bad.overconfident,
    incapacitated: actor.statuses.has("incapacitated"),
    ...snapshotForUndo(actor)
  };
  const lines = [];

  if (mode === "heal") {
    // [Inversion], or O Soberano's Taboo against an ally's healing spell (conditions/blows.mjs): the healing hurts, as
    // direct damage (conditions/damage.mjs).
    const taboo = allySpellHurts(actor, card);
    if (healingHurts(actor) || taboo) {
      const amount = card.total + (card.recovery ? Math.max(0, toInt(card.bonus)) : 0);
      const why = healingHurts(actor) ? statusLabel("inversion") : taboo;
      const hurt = await takeDamage(actor, amount, { what: `${card.skillName} (${why})`, silent: true });
      lines.push(hurt?.line ?? `${L("Applied.Heal")}: +0 HP`);
      return postApplied(actor, card, before, lines, `−${hurt?.loss ?? 0} HP`);
    }
    // A [Cursed] character, or one with [Black Flame], recovers no HP (conditions/damage.mjs).
    const blocker = healBlocker(actor);
    if (blocker) {
      lines.push(game.i18n.format("ETERNIA.Conditions.NoHeal", { name: actor.token?.name ?? actor.name, status: statusLabel(blocker) }));
      return postApplied(actor, card, before, lines, "+0 HP");
    }
    // A Trait's healing bonus (helpers/magic-traits.mjs); a Tabu that halves it (conditions/immortal.mjs)
    const healing = healTaken(actor, card.total + (card.recovery ? Math.max(0, toInt(card.bonus)) : 0));
    const hp = Math.min(before.hp + healing.amount, toInt(system.health.max));
    await actor.update({ "system.health.value": hp });
    lines.push(`${L("Applied.Heal")}: +${hp - before.hp} HP${healing.note}`);
    if ((hp > 0) && before.incapacitated) await actor.toggleStatusEffect("incapacitated", { active: false });
    /**
     * A damage card's healing gave HP back (the class Motors). Only on this client.
     * @param {Actor} actor
     * @param {object} card
     * @param {{amount: number, healer: Actor|null, item: Item|null}} context
     */
    Hooks.callAll("eternia.healed", actor, card, {
      amount: hp - before.hp, healer: card.attackerUuid ? fromUuidSync(card.attackerUuid) : null,
      item: card.itemUuid ? fromUuidSync(card.itemUuid) : null
    });
    recovered(actor, hp - before.hp, { what: card.skillName, from: card.attackerUuid ? fromUuidSync(card.attackerUuid) : null });
    // [Agony]: getting HP back hurts.
    const pain = (hp > before.hp) ? await agonyPain(actor, { silent: true }) : null;
    if (pain) lines.push(pain.line);
    return postApplied(actor, card, before, lines, `+${hp - before.hp} HP`);
  }

  let barrier = before.barrier;
  let hpLoss = 0;
  // A spell that ignores [Barrier] (and breaks it): helpers/magic-traits.mjs
  const pierceBarrier = !!card.pierce?.barrier;
  /** Damage through [Barrier], then to HP. */
  const hit = amount => {
    const absorbed = pierceBarrier ? 0 : Math.min(barrier, amount);
    barrier -= absorbed;
    hpLoss += amount - absorbed;
    return absorbed;
  };

  // Damage Roll
  const direct = (mode === "direct") || (card.type === "direct");
  let amount = card.total;
  if (mode === "half") amount = Math.floor(amount / 2);
  if (mode === "double") amount *= 2;
  const steps = [`${amount}`];
  const tags = [...(card.tags ?? []), ...(TYPE_TAGS[direct ? "direct" : card.type] ?? [])];
  const tagLabel = (status, entry) => game.i18n.localize(`ETERNIA.StatusEffect.${status}`) + (entry.tag ? ` (${entry.tag})` : "");
  // The defender's conditions: [Exposed] (no Defense, no Cancel), [Intangible] (no physical damage)…
  const condition = beforeDamage(actor, card, direct);
  // [Clones]: a copy may take the blow (1d6 up to the Rating), and nothing of it reaches the defender.
  const decoy = (condition.immune || condition.untouched) ? null : await cloneDecoy(actor, card);
  if (decoy) condition.notes.push(decoy.note);
  if (decoy?.hit) Object.assign(condition, { immune: true, untouched: true, counter: null, invert: false });
  steps.push(...condition.notes.map(note => `(${note})`));
  if (condition.immune) amount = 0;
  // The statuses the hit consumes (a Trait's bonus against them), ended after it
  const consumed = [];
  if (!condition.immune) {
    amount += condition.bonus;
    if (toInt(card.bonus) > 0) {
      amount += toInt(card.bonus);
      steps.push(`+ ${toInt(card.bonus)} ${L("Applied.Trait")}`);
    }
    for (const vs of card.bonusVs ?? []) {
      if (vs.pack) {
        const n = packBonus(actor, vs, card.attackerUuid);
        if (n > 0) {
          amount += n;
          steps.push(`+ ${n} (${vs.name})`);
        }
        continue;
      }
      const status = (vs.statuses ?? []).find(id => has(actor, id));
      const tagged = !status && (vs.targetTags ?? []).find(t => actorHasTag(actor, t));
      // Under a curse of the caster's Decree (conditions/decree.mjs)
      const decreed = !status && !tagged && !!vs.decreeOf && cursedByDecree(actor, vs.decreeOf);
      if (!status && !tagged && !decreed) continue;
      const n = (vs.perValue && status) ? vs.value * Math.max(1, rating(actor, status)) : vs.value;
      if (n > 0) {
        amount += n;
        steps.push(`+ ${n} (${status ? statusLabel(status) : (tagged ? termTag(tagged) : L("Applied.Decree"))})`);
      }
      if (vs.consume && status) consumed.push(status);
    }
  }
  if (!direct && !condition.immune) {
    let defense = condition.noDefense ? 0 : defenseOf(actor, card.type);
    const halved = (defense > 0) && (card.pierce?.defense === "half");
    if (halved) defense = Math.floor(defense / 2);
    if (defense) steps.push(`− ${defense} ${L(card.type === "magical" ? "Applied.MDef" : "Applied.PDef")}${halved ? " (÷2)" : ""}`);
    const cancel = (condition.noCancel || card.pierce?.cancel) ? null : bestTagged(bad, "cancels", "cancel", tags, passiveCancels(actor));
    if (cancel) steps.push(`− ${cancel.value} ${tagLabel("cancel", cancel)}`);
    amount -= defense + (cancel?.value ?? 0);
  }
  amount = Math.max(amount, 0);
  // [Petrified]: the stone takes half of it.
  if (condition.halve && (amount > 0) && !condition.immune) {
    amount = Math.floor(amount / 2);
    steps.push(`÷ 2 ${statusLabel("petrified")}`);
  }
  // [Flesh Shield]: an ally takes the blow instead (conditions/immortal.mjs), nothing of it reaches the defender.
  const covered = condition.untouched ? null : coverFor(actor, card, amount);
  if (covered) amount = 0;
  // [Counter]: the damage goes back to the attacker, doubled, and nothing of the attack reaches the defender.
  const countered = (condition.counter && !covered) ? counterBack(actor, card, condition.counter, amount) : null;
  if (countered) amount = 0;
  const untouched = !!countered || !!covered || condition.untouched;
  // [Inversion]: the magic damage heals instead (after the Defense and [Cancel], before [Barrier]).
  const inverted = (condition.invert && !condition.immune) ? amount : 0;
  if (inverted) amount = 0;
  const absorbed = hit(amount);
  if (absorbed) steps.push(`− ${absorbed} ${game.i18n.localize("ETERNIA.StatusEffect.barrier")}`);
  lines.push(`${L(direct ? "Mode.direct" : "Applied.Damage")}: ${steps.join(" ")} → ${amount - absorbed} HP`);
  if (covered) lines.push(covered.line);
  if (countered) lines.push(countered.line);
  if (inverted) lines.push(game.i18n.format("ETERNIA.Conditions.Applied.Inverted", { n: inverted }));
  if (pierceBarrier && (barrier > 0) && !condition.immune) {
    barrier = 0;
    lines.push(L("Applied.BarrierBroken"));
  }

  // Failed Dodge Check: Hate Damage, Pursuit, Weakness (direct damage, each through Barrier); none from a [Pacified]
  // attacker
  const updates = {};
  if (decoy?.hit) updates["system.bad-status.clones"] = decoy.left;
  if (dodgeFailed && !untouched) {
    const extra = (label, value) => {
      if ((value <= 0) || condition.harmless) return;
      const absorbed = hit(value);
      lines.push(`${label}: ${value}${absorbed ? ` − ${absorbed} ${game.i18n.localize("ETERNIA.StatusEffect.barrier")}` : ""} → ${value - absorbed} HP`);
    };
    if ((card.hateMultiplier > 0) && (hateRank(actor) === "top")) {
      extra(L("Applied.Hate"), Math.floor(before.hate * card.hateMultiplier));
    }
    if (before.pursuits.length && !condition.harmless) {
      const top = Math.max(...before.pursuits);
      const pursuits = [...before.pursuits];
      pursuits.splice(pursuits.indexOf(top), 1);
      updates["system.bad-status.pursuits"] = pursuits;
      extra(game.i18n.localize("ETERNIA.StatusEffect.pursuit"), top);
    }
    const weakness = bestTagged(bad, "weaknesses", "weakness", tags, passiveWeaknesses(actor));
    if (weakness) extra(tagLabel("weakness", weakness), weakness.value);
    // [Marked]: its Rating as direct damage, then the mark ends.
    const mark = condition.harmless ? 0 : markDamage(actor);
    if (mark > 0) {
      extra(game.i18n.localize("ETERNIA.StatusEffect.marked"), mark);
      before.marked = true;
    }
    // A character who fails a Dodge Check against an enemy loses 1 Hate.
    if ((actor.type === "character") && (card.attackerType === "monster") && (before.hate > 0)) {
      updates["system.infos.hate"] = before.hate - 1;
      lines.push(L("Applied.HateDown"));
    }
  }

  // What the blow does besides the damage: an execution, an attacker that doesn't kill, Ratings lowered, bonuses turned
  // inside out (conditions/blows.mjs)
  const blow = blowOutcome(actor, card, {
    hp: Math.max(before.hp - hpLoss, 0), before: before.hp, hpLoss, reached: !untouched && !condition.immune,
    harms: !condition.harmless && !inverted
  });
  lines.push(...blow.lines);
  Object.assign(updates, blow.updates);
  // The defender's conditions after the HP loss: [Bond], [Last Stand], waking up, [Mirror]… (conditions/damage.mjs)
  const after = afterDamage(actor, card, {
    hp: blow.hp, hpLoss: blow.hpLoss, absorbed: before.barrier - barrier, marked: !!before.marked, start: before.hp
  });
  lines.push(...after.lines);
  let hp = after.hp;
  // [Inversion]: the healing the magic damage became (none for a [Cursed] actor, nor one with [Black Flame])
  const blocked = inverted ? healBlocker(actor) : null;
  if (blocked) {
    lines.push(game.i18n.format("ETERNIA.Conditions.NoHeal", { name: actor.token?.name ?? actor.name, status: statusLabel(blocked) }));
  }
  const healed = (inverted && !blocked) ? Math.max(0, Math.min(hp + inverted, toInt(system.health.max)) - hp) : 0;
  hp += healed;
  Object.assign(updates, after.updates);
  updates["system.health.value"] = hp;
  updates["system.bad-status.barrier"] = barrier;
  // [Overconfident] ends when the character loses HP.
  if (hpLoss > 0 && before.overconfident) updates["system.bad-status.overconfident"] = false;
  await actor.update(updates);
  if (after.end.length) await removeConditionStatuses(actor, after.end);
  // Effects that only stood in the way of this damage (an illusion taking the blow).
  const spent = consumedBy(actor, ["damage"]);
  if (spent.length) await actor.deleteEmbeddedDocuments("ActiveEffect", spent).catch(() => null);
  if ((hp <= 0) && !before.incapacitated) await actor.toggleStatusEffect("incapacitated", { active: true });
  if ((hp > 0) && before.incapacitated && (healed > 0)) await actor.toggleStatusEffect("incapacitated", { active: false });
  /**
   * A damage card took an actor from above 0 HP to 0 (the Samurai's Chiburi). Only on this client.
   * @param {Actor} actor
   * @param {object} card     The damage card data (itemUuid, attackerUuid…)
   */
  /**
   * A damage card took HP from an actor (after Barrier): how much, and from whom (the class Motors). Only on this
   * client.
   * @param {Actor} actor
   * @param {object} card
   * @param {{amount: number, absorbed: number, attacker: Actor|null, item: Item|null}} context
   */
  Hooks.callAll("eternia.damaged", actor, card, {
    amount: Math.max(0, before.hp - hp), absorbed: before.barrier - barrier,
    attacker: card.attackerUuid ? fromUuidSync(card.attackerUuid) : null, item: card.itemUuid ? fromUuidSync(card.itemUuid) : null
  });
  if ((before.hp > 0) && (hp <= 0)) Hooks.callAll("eternia.defeated", actor, card);
  for (const fn of after.after) await fn();
  if (covered) await covered.after();
  if (countered) await countered.after();
  // [Agony]: the healing of an [Inversion] hurts too.
  if (healed > 0) recovered(actor, healed, { what: card.skillName, from: card.attackerUuid ? fromUuidSync(card.attackerUuid) : null });
  const pain = (healed > 0) ? await agonyPain(actor, { silent: true }) : null;
  if (pain) lines.push(pain.line);
  const attacker = card.attackerUuid ? fromUuidSync(card.attackerUuid) : null;
  // Drain: the attacker gets back part of the HP the hit took (helpers/magic-traits.mjs).
  const drained = Math.floor(Math.max(0, before.hp - hp) * (Number(card.drain) || 0));
  if ((drained > 0) && attacker && (attacker.uuid !== actor.uuid)) {
    const healed = await takeHealing(attacker, drained, { what: card.skillName, from: actor, silent: true });
    if (healed) lines.push(healed.line);
  }
  // Statuses the attacker's effects give on a hit (an Engineer's Spark Stone), and those that escalate from a status
  // the target already had (a Magia's Trait): Undo takes them back. Fire on a [Soaked] target only dries it. Nothing
  // of an attack that didn't reach the target ([Counter], [The One]).
  const dried = had.has("soaked") && (card.tags ?? []).some(t => /flame/i.test(String(t)));
  const escalated = (card.escalate ?? []).filter(e => had.has(e.if)).flatMap(e => e.add.map(a => ({ ...a, name: e.name })));
  const onHit = untouched ? [] : [...(card.onHit ?? []), ...escalated]
    .filter(h => h.statusId && !(dried && (h.statusId === "burning")) && !(h.rankBelow && (crOf(actor) >= h.rankBelow))
      && hitApplies(actor, h, hp));
  // A Trait that steals: the first of these bonuses the target has passes to the attacker (the Roubo).
  const stolen = (untouched || !attacker) ? null : (card.steal ?? []).find(id => has(actor, id));
  if (stolen) {
    const line = await stealStatuses(actor, [stolen], attacker);
    if (line) lines.push(line);
  }
  if (onHit.length) {
    const caster = card.attackerUuid ? fromUuidSync(card.attackerUuid) : null;
    // An entry may carry more of the effect's data (`data`: the mark of a Decree's curse); a spell of the Infinito
    // makes it last (conditions/lasting.mjs)
    const created = await actor.createEmbeddedDocuments("ActiveEffect", onHit.map(h => lastingHitData(card, foundry.utils.mergeObject(
      statusEffectData(h.statusId, h.value, "", { caster, expires: "endOfScene" }), h.data ?? {}, { inplace: false }))));
    before.onHitEffects = created.map(e => e.id);
    lines.push(onHit.map(h => `${h.name}: ${statusLabel(h.statusId)}${h.value ? ` ${h.value}` : ""}`).join(", "));
  }
  // Statuses the hit consumes or strips (a Trait's bonus that eats the status; Gravity taking [Flying]): those without
  // a field are kept for the Undo (the fields are in the snapshot).
  const ending = untouched ? [] : [...new Set([...consumed, ...(card.strip ?? [])])]
    .filter(id => has(actor, id) && !onHit.some(h => h.statusId === id));
  if (ending.length) {
    before.conditionEffects = [...(before.conditionEffects ?? []), ...actor.effects
      .filter(e => ending.some(id => e.statuses?.has(id) && !statusDefinition(id)?.path)).map(e => e.toObject())];
    await removeStatuses(actor, ending);
    lines.push(`${L("Applied.Consumed")}: ${ending.map(statusLabel).join(", ")}`);
  }

  return postApplied(actor, card, before, lines, (hp > before.hp) ? `+${hp - before.hp} HP` : `−${before.hp - hp} HP`);
}

/** Post the summary of an application, with the values needed to undo it. */
async function postApplied(actor, card, before, lines, result) {
  const data = { actorUuid: actor.uuid, name: actor.token?.name ?? actor.name, skillName: card.skillName, lines, result, before, undone: false };
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content: await foundry.applications.handlebars.renderTemplate(TEMPLATES.applied, data),
    // A monster's breakdown gives away its Defense and statuses: GM only, until revealed.
    whisper: actor.hasPlayerOwner ? [] : ChatMessage.getWhisperRecipients("GM").map(u => u.id),
    flags: { eternia: { applied: data } }
  });
  return result;
}

/** Restore what an application changed. */
async function undoApplied(message) {
  const data = message.getFlag("eternia", "applied");
  const actor = data && fromUuidSync(data.actorUuid);
  if (!actor?.isOwner || data.undone) return;
  const { before } = data;
  const updates = {
    "system.health.value": before.hp,
    "system.bad-status.barrier": before.barrier,
    "system.bad-status.pursuits": before.pursuits,
    "system.bad-status.overconfident": before.overconfident
  };
  if (actor.type === "character") updates["system.infos.hate"] = before.hate;
  await actor.update(updates);
  // The statuses the application had ended ([Marked], [Asleep], [Last Stand]…) come back; those it gave go.
  await restoreForUndo(actor, before);
  const given = (before.onHitEffects ?? []).filter(id => actor.effects.has(id));
  if (given.length) await actor.deleteEmbeddedDocuments("ActiveEffect", given);
  if (actor.statuses.has("incapacitated") !== before.incapacitated) {
    await actor.toggleStatusEffect("incapacitated", { active: before.incapacitated });
  }
  if (!message.isOwner) return;
  const undone = { ...data, undone: true };
  await message.update({
    content: await foundry.applications.handlebars.renderTemplate(TEMPLATES.applied, undone),
    "flags.eternia.applied": undone
  });
}

/** A damage card button: apply to that target, or to the controlled tokens when the card has none. */
async function onApplyDamage(message, index, mode) {
  const card = message.getFlag("eternia", "damage");
  if (!card || !MODES.includes(mode)) return;
  if (index === null) {
    const actors = canvas.tokens.controlled.map(t => t.actor).filter(a => a?.isOwner);
    if (!actors.length) return ui.notifications.warn(L("Notif.NoTokens"));
    for (const actor of actors) await applyDamage(actor, card, mode, false);
    return;
  }
  const target = card.targets[index];
  const actor = target && targetActor(target);
  if (!actor?.isOwner) return;
  const result = await applyDamage(actor, card, mode, target.dodgeFailed);
  await updateCardTarget(message, "damage", index, { applied: result });
}

/* -------------------------------------------- */
/*  Chat listeners                              */
/* -------------------------------------------- */

function _onRenderChatMessage(message, html) {
  const flags = message.flags?.eternia ?? {};
  const kind = flags.attack ? "attack" : flags.damage ? "damage" : null;

  if (kind) {
    const data = flags[kind];
    // Only the owners of a target see its buttons and the damage it took.
    html.querySelectorAll(".lh-target[data-index]").forEach(row => {
      const target = data.targets[Number(row.dataset.index)];
      if (!target || !targetActor(target)?.isOwner) row.querySelectorAll(".owner-only, .lh-applied").forEach(el => el.remove());
    });
  }

  // GM-only damage summaries (monsters): the GM may show them to everyone.
  html.querySelectorAll(".lh-reveal").forEach(button => {
    if (!game.user.isGM || !message.whisper.length) return button.remove();
    button.addEventListener("click", event => {
      event.preventDefault();
      button.disabled = true;
      message.update({ whisper: [] });
    });
  });

  html.querySelectorAll(".lh-roll-dodge").forEach(button => button.addEventListener("click", event => {
    event.preventDefault();
    button.disabled = true;
    onRollDodge(message, Number(button.closest(".lh-target").dataset.index));
  }));
  html.querySelectorAll(".lh-apply").forEach(button => button.addEventListener("click", event => {
    event.preventDefault();
    const row = button.closest(".lh-target");
    const index = row?.dataset.index !== undefined ? Number(row.dataset.index) : null;
    onApplyDamage(message, index, button.dataset.mode);
  }));
  html.querySelectorAll(".lh-undo").forEach(button => {
    const actor = fromUuidSync(flags.applied?.actorUuid);
    if (!actor?.isOwner) return button.remove();
    button.addEventListener("click", event => {
      event.preventDefault();
      button.disabled = true;
      undoApplied(message);
    });
  });
}

/** End statuses that have no field (their effects are deleted). */
async function removeConditionStatuses(actor, ids) {
  const effects = actor.effects.filter(e => [...e.statuses].some(id => ids.includes(id)));
  if (effects.length) await actor.deleteEmbeddedDocuments("ActiveEffect", effects.map(e => e.id));
}
