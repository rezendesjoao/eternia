/**
 * The monster rules (docs/bestiario.md): what a monster's skills do besides their rolls, effects and the flags the
 * system already reads. A skill carries one rule in `flags.eternia.monster = { rule, ... }`:
 *   pack       { per, tag }     Passive. +per damage for each other creature of its side engaged with the target
 *                               (bestiary/pack.mjs, counted by the damage card).
 *   grow       { empowered, heal, at, size }  Its use: the monster grows one step (`flags.eternia.growth`): its
 *                               [Empowered] becomes `empowered` × the steps, it recovers `heal` HP and, from the step
 *                               `at`, its token takes `size` squares. The drop rows with `growth` drop once per step.
 *   threshold  { below, statuses: [{ statusId, value }], summon: { actors, radius } }  Passive. The first time its HP
 *                               fall to `below` of the max (0.5: half), still standing, it gets those statuses until
 *                               the end of the scene and calls `summon` (the howl; a monster that was called doesn't).
 *   fall       { radius }       Passive. When it falls, the skill's damage hits every creature within `radius` squares
 *                               of it (a damage card, no Dodge Check), with the skill's hitStatuses.
 *   cleanse    { count }        Passive. In each Cleanup Process it ends `count` of its Bad Statuses.
 *   summon     { actors: [{ uuid, count }], radius }  Its use: those monsters come out next to it, in its combat, and
 *                               leave no drops (bestiary/spawn.mjs).
 *   recharge   { min }          Its use spends it until a 1d6 of a Setup Process gives `min` (5) or more
 *                               (bestiary/recharge.mjs; automation/use.mjs warns while it is spent).
 *   struck     { tags, self: [{ statusId, value }], strip: [statusId] }  Passive. A damage card with one of the tags
 *                               that hurts it gives it those statuses and ends those (the fire that cracks the crystal
 *                               hide, the fire that stops the regeneration until the next Setup).
 *   pickpocket { gold }         Its use readies a light hand (an effect with `flags.eternia.pickpocket`): its next
 *                               damage on a character takes that gold (a formula, "2d6*5") from the purse, kept in the
 *                               monster's `stolenGold` (it comes back with its drops).
 *   offer      { gold }         Its use offers that gold (a formula) to be let go: a card with Accept and Refuse; on
 *                               Accept the gold goes to whoever accepted and the monster leaves (no drops).
 *   troop      { size }         Passive. A band in one token (bestiary/troop.mjs): area attacks hit it double; at 2/3
 *                               and 1/3 of its HP it loses one of the band (`troopLeft`), and its area attacks reach
 *                               one target less.
 *   retreat    { below, held }  Passive. When its HP fall to `below` of the max (0.25), it flees with what it stole
 *                               (the token hides, out of the combat, no drops), unless a status of `held` (grappled,
 *                               rooted, paralyzed, petrified, asleep) holds it; held, it tries again in each Setup.
 *   forget     {}               Passive. When it spends an Extra Breath (`flags.eternia.revive`), one of its skills
 *                               that aren't passive (by chance) becomes [Sealed] until the end of the scene.
 * The rules run on the window that changed the monster (the GM's): the use of a skill (`eternia.skillUsed`), its HP,
 * its fall (Incapacitated), the damage cards (`eternia.damaged`) and the Setup and Cleanup Processes of its combat.
 * What a player's window sees (the hand on its character, the answer to an offer) goes to the GM by the socket
 * (`bestiaryPickpocket`, `bestiaryOffer`).
 */
import { L, SYSTEM_ID } from "../settings.mjs";
import { isLocalChange, isPrimaryGM } from "../helpers/clients.mjs";
import { actorName, postSummary, toInt, wrap } from "../helpers/utils.mjs";
import { diceFormula } from "../helpers/dice.mjs";
import { statusDefinition } from "../helpers/statuses.mjs";
import { createDamageCard } from "../helpers/combat-cards.mjs";
import { takeHealing } from "../conditions/damage.mjs";
import { removeStatuses, rulesOn, sameActor, sourcesOf } from "../conditions/rules.mjs";
import { registerHandler, request } from "../piles/pile-socket.mjs";
import { getGold, goldPath } from "../piles/pile-utils.mjs";
import { tagLabel } from "../i18n/terms.mjs";
import { parseSkillField } from "../helpers/skill-fields.mjs";
import { spawnNear } from "./spawn.mjs";
import { RECHARGING, recharges } from "./recharge.mjs";
import { troopByHp, troopLeft, troopOf } from "./troop.mjs";

const OFFER_TEMPLATE = "systems/eternia/templates/chat/offer-card.hbs";

const label = id => game.i18n.localize(`ETERNIA.StatusEffect.${id}`);

/** The monster rule of a skill, or null. */
export const ruleOf = item => item?.getFlag?.(SYSTEM_ID, "monster") ?? null;

/** An actor's skills with a rule of this kind. */
const withRule = (actor, kind) => (actor?.items ?? []).filter(i => (i.type === "skill") && (ruleOf(i)?.rule === kind));

/** The token of an actor (a token actor's own, else its first active one on the viewed scene). */
function tokenOf(actor) {
  if (actor?.token) return actor.token;
  return actor?.getActiveTokens?.(false, true).find(t => t.parent === canvas?.scene) ?? actor?.getActiveTokens?.(false, true)[0] ?? null;
}

/** Give statuses to an actor, until the end of the scene, from a source. Returns their names ("Fúria 5"). */
async function giveStatuses(actor, list, from) {
  const names = [];
  for (const { statusId, value = null } of list ?? []) {
    if (!statusId) continue;
    const rated = !!statusDefinition(statusId)?.rated;
    await game.eternia.applyStatus(actor, statusId, { value: rated ? (toInt(value) || 1) : null, from });
    names.push(rated ? `${label(statusId)} ${toInt(value) || 1}` : label(statusId));
  }
  return names;
}

/* -------------------------------------------- */
/*  Growing                                     */
/* -------------------------------------------- */

/** The monster grows a step: [Empowered] by the steps, HP, the bigger token, and one more set of its growth drops. */
async function grow(actor, item) {
  const rule = ruleOf(item);
  const steps = toInt(actor.getFlag(SYSTEM_ID, "growth")) + 1;
  await actor.setFlag(SYSTEM_ID, "growth", steps);
  const lines = [];
  const per = toInt(rule.empowered);
  if (per > 0) {
    // One [Empowered] of the growth at a time, the new one with all the steps
    const old = actor.effects.filter(e => e.getFlag(SYSTEM_ID, "growthEffect")).map(e => e.id);
    if (old.length) await actor.deleteEmbeddedDocuments("ActiveEffect", old);
    const { statusEffectData } = await import("../chat/status-links.mjs");
    const effect = statusEffectData("empowered", per * steps, "", { caster: actor, expires: "endOfScene" });
    foundry.utils.setProperty(effect, `flags.${SYSTEM_ID}.growthEffect`, true);
    await actor.createEmbeddedDocuments("ActiveEffect", [effect]);
  }
  const healed = (toInt(rule.heal) > 0) ? await takeHealing(actor, toInt(rule.heal), { what: item.name, natural: true, silent: true }) : null;
  const size = toInt(rule.size);
  const token = tokenOf(actor);
  let bigger = false;
  if (token && size && (steps >= toInt(rule.at)) && (toInt(token.width) < size)) {
    await token.update({ width: size, height: size });
    bigger = true;
  }
  lines.push(L("Bestiary.Grow", { name: actorName(actor), n: steps, value: per * steps }));
  if (healed?.line) lines.push(healed.line);
  if (bigger) lines.push(L("Bestiary.Bigger", { name: actorName(actor) }));
  await postSummary(item.name, lines);
}

/* -------------------------------------------- */
/*  The threshold                               */
/* -------------------------------------------- */

/** HP changed: the thresholds it crossed, once each. */
async function checkThresholds(actor) {
  const hp = toInt(actor.system.health?.value);
  const max = toInt(actor.system.health?.max);
  if ((hp <= 0) || (max <= 0)) return;
  const crossed = actor.getFlag(SYSTEM_ID, "thresholds") ?? [];
  for (const item of withRule(actor, "threshold")) {
    const rule = ruleOf(item);
    if (crossed.includes(item.id) || (hp > Math.floor(max * (Number(rule.below) || 0.5)))) continue;
    crossed.push(item.id);
    await actor.setFlag(SYSTEM_ID, "thresholds", crossed);
    const names = await giveStatuses(actor, rule.statuses, actor);
    const lines = names.length ? [L("Bestiary.Threshold", { name: actorName(actor), statuses: names.join(", ") })] : [];
    // The howl: more of them come, unless it came by a call itself (no endless chain)
    const token = tokenOf(actor);
    if (rule.summon?.actors?.length && token && !token.getFlag(SYSTEM_ID, "calledBy")) {
      const tokens = await spawnNear(token, rule.summon.actors, { radius: toInt(rule.summon.radius) || 2, by: actor.uuid });
      if (tokens.length) lines.push(L("Bestiary.Summon", { name: actorName(actor), list: tokens.map(t => t.name).join(", ") }));
    }
    if (lines.length) await postSummary(item.name, lines);
  }
}

/* -------------------------------------------- */
/*  The troop                                   */
/* -------------------------------------------- */

/** HP changed: a troop loses one of the band at 2/3 and at 1/3 of its HP (and doesn't get them back). */
async function checkTroop(actor) {
  const troop = troopOf(actor);
  if (!troop || (toInt(actor.system.health?.value) <= 0)) return;
  const before = troopLeft(actor);
  const now = Math.min(before, troopByHp(actor));
  if (now >= before) return;
  await actor.setFlag(SYSTEM_ID, "troopLeft", now);
  await postSummary(troop.item.name, [L("Bestiary.TroopLost", { name: actorName(actor), lost: before - now, n: now })]);
}

/* -------------------------------------------- */
/*  The retreat                                 */
/* -------------------------------------------- */

/** What holds a monster that would flee. */
const HOLDS = ["grappled", "rooted", "paralyzed", "petrified", "asleep"];

/**
 * HP changed, or a Setup Process came: a monster with the retreat rule under its share of HP flees with what it stole,
 * unless something holds it (told once when it tries, and again at each Setup it stays held).
 */
async function checkRetreat(actor, { setup = false } = {}) {
  const hp = toInt(actor.system.health?.value);
  const max = toInt(actor.system.health?.max);
  if ((hp <= 0) || (max <= 0) || actor.getFlag(SYSTEM_ID, "fled")) return;
  for (const item of withRule(actor, "retreat")) {
    const rule = ruleOf(item);
    if (hp > Math.floor(max * (Number(rule.below) || 0.25))) continue;
    const holding = (rule.held ?? HOLDS).filter(id => actor.statuses.has(id));
    if (holding.length) {
      if (!setup && actor.getFlag(SYSTEM_ID, "retreatHeld")) continue;
      await actor.setFlag(SYSTEM_ID, "retreatHeld", true);
      await postSummary(item.name, [L("Bestiary.RetreatHeld", { name: actorName(actor), status: holding.map(label).join(", ") })]);
      continue;
    }
    await actor.setFlag(SYSTEM_ID, "fled", true);
    await postSummary(item.name, [L("Bestiary.Retreat", { name: actorName(actor) })]);
    await leave(actor);
    return;
  }
}

/** The Setup Process of a combat: the monsters that couldn't flee try again. */
async function setupRetreat(combat) {
  const seen = new Set();
  for (const combatant of combat.combatants) {
    const actor = combatant.actor;
    if (!actor || seen.has(actor.uuid) || combatant.defeated || !withRule(actor, "retreat").length) continue;
    seen.add(actor.uuid);
    await checkRetreat(actor, { setup: true });
  }
}

/* -------------------------------------------- */
/*  The forgetting                              */
/* -------------------------------------------- */

/** A monster spent an Extra Breath (on the window that applied the blow): with the forget rule, it forgets a skill. */
async function forgetSkill(actor) {
  if ((actor?.type !== "monster") || !actor.isOwner) return;
  const rule = withRule(actor, "forget")[0];
  if (!rule) return;
  const pool = actor.items.filter(i => (i.type === "skill") && (parseSkillField("timing", i.system.timing).type !== "Constant") && !ruleOf(i));
  if (!pool.length) return;
  const skill = pool[Math.floor(Math.random() * pool.length)];
  await game.eternia.applyStatus(actor, "sealed", { tag: skill.name, from: actor });
  await postSummary(rule.name, [L("Bestiary.Forgot", { name: actorName(actor), skill: skill.name })]);
}

/* -------------------------------------------- */
/*  The fall                                    */
/* -------------------------------------------- */

/** The tokens within some squares of a token (from its edges), itself out, the dead out. */
function tokensAround(token, radius) {
  const size = token.parent.grid.size;
  const box = t => ({ x0: Math.round(t.x / size), y0: Math.round(t.y / size), x1: Math.round(t.x / size) + Math.max(1, toInt(t.width)) - 1, y1: Math.round(t.y / size) + Math.max(1, toInt(t.height)) - 1 });
  const a = box(token);
  return token.parent.tokens.filter(t => {
    if ((t === token) || !t.actor || t.actor.statuses.has("dead") || (t.actor.type === "pile")) return false;
    const b = box(t);
    const dx = Math.max(0, b.x0 - a.x1, a.x0 - b.x1), dy = Math.max(0, b.y0 - a.y1, a.y0 - b.y1);
    return Math.max(dx, dy) <= radius;
  });
}

/** A monster fell: its fall skills hit everyone around it (a damage card with them as the targets). */
async function onFall(actor) {
  const token = tokenOf(actor);
  if (!token) return;
  for (const item of withRule(actor, "fall")) {
    const rule = ruleOf(item);
    const around = tokensAround(token, Math.max(0, toInt(rule.radius)));
    if (!around.length) continue;
    const targets = around.map(t => ({ tokenUuid: t.uuid, actorUuid: t.actor.uuid, name: t.name, img: t.texture?.src ?? t.actor.img }));
    const damage = item.system.damage ?? {};
    const flavor = `${item.name} - ${game.i18n.localize("ETERNIA.Skill.Label.Damage")}`;
    await createDamageCard(item, actor, diceFormula({ dice: damage.dice, mod: damage.mod }), flavor, null, targets);
  }
}

/* -------------------------------------------- */
/*  The Cleanup                                 */
/* -------------------------------------------- */

/** The Cleanup Process of a combat: each monster that clears itself ends some of its Bad Statuses. */
async function cleanupCleanse(combat) {
  const seen = new Set();
  for (const combatant of combat.combatants) {
    const actor = combatant.actor;
    if (!actor || seen.has(actor.uuid) || actor.statuses.has("incapacitated") || actor.statuses.has("dead")) continue;
    seen.add(actor.uuid);
    for (const item of withRule(actor, "cleanse")) {
      // Not the ones it gave itself (the [Berserk] of its own threshold)
      const bad = [...actor.statuses].filter(id => (statusDefinition(id)?.group === "bad") && !(sourcesOf(actor, id).length
        && sourcesOf(actor, id).every(s => sameActor(s, actor))));
      const ids = bad.slice(0, Math.max(1, toInt(ruleOf(item).count) || 1));
      if (!ids.length) continue;
      await removeStatuses(actor, ids);
      await postSummary(item.name, [L("Bestiary.Cleanse", { name: actorName(actor), statuses: ids.map(label).join(", ") })]);
    }
  }
}

/* -------------------------------------------- */
/*  The recharge                                */
/* -------------------------------------------- */

/** A skill that recharges was used: spent. */
async function spend(actor, item) {
  const list = new Set(actor.getFlag(SYSTEM_ID, RECHARGING) ?? []);
  list.add(item.id);
  await actor.setFlag(SYSTEM_ID, RECHARGING, [...list]);
}

/** The Setup Process of a combat: a 1d6 for each spent skill of its monsters; `min` or more, it is back. */
async function setupRecharge(combat) {
  const seen = new Set();
  for (const combatant of combat.combatants) {
    const actor = combatant.actor;
    const spent = actor?.getFlag(SYSTEM_ID, RECHARGING) ?? [];
    if (!actor || seen.has(actor.uuid) || !spent.length || actor.statuses.has("dead")) continue;
    seen.add(actor.uuid);
    const left = [];
    for (const id of spent) {
      const item = actor.items.get(id);
      if (!item || !recharges(item)) continue;
      const roll = await new Roll("1d6").evaluate();
      const back = roll.total >= (toInt(ruleOf(item).min) || 5);
      if (!back) left.push(id);
      await postSummary(item.name, [L(back ? "Bestiary.Recharged" : "Bestiary.Recharging", { name: actorName(actor), skill: item.name, n: roll.total })]);
    }
    await actor.setFlag(SYSTEM_ID, RECHARGING, left);
  }
}

/* -------------------------------------------- */
/*  Struck by a tag                             */
/* -------------------------------------------- */

/** A damage card hurt a monster (on the window that applied it): the tags it is weak or vulnerable to. */
async function onStruck(actor, card, { amount = 0, absorbed = 0, attacker = null } = {}) {
  if ((actor?.type !== "monster") || !actor.isOwner || ((toInt(amount) <= 0) && (toInt(absorbed) <= 0))) return;
  const tags = (card?.tags ?? []).map(t => String(t).toLowerCase());
  for (const item of withRule(actor, "struck")) {
    const rule = ruleOf(item);
    const tag = (rule.tags ?? []).find(t => tags.includes(String(t).toLowerCase()));
    if (!tag) continue;
    const parts = [];
    const strip = (rule.strip ?? []).filter(id => actor.statuses.has(id));
    if (strip.length) {
      await removeStatuses(actor, strip);
      parts.push(L("Bestiary.StruckStrip", { statuses: strip.map(label).join(", ") }));
    }
    const given = await giveStatuses(actor, rule.self, attacker ?? actor);
    if (given.length) parts.push(given.join(", "));
    if (parts.length) await postSummary(item.name, [L("Bestiary.Struck", { name: actorName(actor), tag: tagLabel(tag), what: parts.join("; ") })]);
  }
}

/* -------------------------------------------- */
/*  The light hand                              */
/* -------------------------------------------- */

/** The ready hand of an attacker (its effect), or null. */
const handOf = attacker => [...(attacker?.effects ?? [])].find(e => e.active && e.getFlag(SYSTEM_ID, "pickpocket")) ?? null;

/** A damage card hurt someone: an attacker with a ready hand takes gold from that character (by the GM). */
async function onHit(actor, card, { amount = 0, attacker = null } = {}) {
  if ((toInt(amount) <= 0) || (actor?.type !== "character") || !handOf(attacker)) return;
  await request("bestiaryPickpocket", { attackerUuid: attacker.uuid, targetUuid: actor.uuid });
}

/** The GM takes the gold: from the character's purse (what it has) to the monster's stolen gold, and the hand ends. */
async function pickpocket({ attackerUuid, targetUuid }) {
  const attacker = fromUuidSync(attackerUuid);
  const target = fromUuidSync(targetUuid);
  const hand = handOf(attacker);
  if (!hand || !(target instanceof Actor)) return { ok: true };
  const formula = String(hand.getFlag(SYSTEM_ID, "pickpocket")?.gold ?? "2d6*5").replace(/×/g, "*");
  const rolled = toInt((await new Roll(formula).evaluate()).total);
  const taken = Math.min(rolled, getGold(target));
  await attacker.deleteEmbeddedDocuments("ActiveEffect", [hand.id]);
  if (taken > 0) {
    await target.update({ [goldPath(target)]: getGold(target) - taken });
    await attacker.setFlag(SYSTEM_ID, "stolenGold", toInt(attacker.getFlag(SYSTEM_ID, "stolenGold")) + taken);
  }
  await postSummary(hand.name, [L(taken > 0 ? "Bestiary.Stole" : "Bestiary.StoleNothing", { name: actorName(attacker), target: actorName(target), n: taken })]);
  return { ok: true };
}

/* -------------------------------------------- */
/*  The offer                                   */
/* -------------------------------------------- */

/** A monster offers gold to be let go: the card with Accept and Refuse. */
async function offer(actor, item) {
  const rule = ruleOf(item);
  const gold = toInt((await new Roll(String(rule.gold ?? "2d6*10").replace(/×/g, "*")).evaluate()).total);
  const data = { actorUuid: actor.uuid, itemName: item.name, gold, state: "open", receiver: null };
  await ChatMessage.create({
    speaker: { alias: actorName(actor) },
    content: await renderOffer(actor, data),
    flags: { [SYSTEM_ID]: { offerCard: data } }
  });
}

/** The offer card's HTML. */
function renderOffer(actor, data) {
  const state = (data.state === "accepted") ? L("Bestiary.OfferAccepted", { name: data.receiver, gold: data.gold, monster: actorName(actor) })
    : (data.state === "refused") ? L("Bestiary.OfferRefused", { monster: actorName(actor) }) : null;
  return foundry.applications.handlebars.renderTemplate(OFFER_TEMPLATE, {
    img: actor.img, name: actorName(actor), eyebrow: data.itemName, gold: `${data.gold} G`,
    lead: L("Bestiary.OfferLead", { monster: actorName(actor), gold: data.gold }), open: data.state === "open", state,
    accept: L("Bestiary.OfferAccept"), refuse: L("Bestiary.OfferRefuse"), goldLabel: L("Bestiary.OfferGold")
  });
}

/** Who answers an offer from this window: the character of the player (its token first), or one the GM picks. */
async function answerer() {
  const controlled = (canvas?.tokens?.controlled ?? []).map(t => t.actor).find(a => a?.type === "character" && a.isOwner);
  if (controlled) return controlled;
  if (!game.user.isGM) return game.user.character ?? null;
  const party = game.actors.filter(a => (a.type === "character") && a.hasPlayerOwner).sort((a, b) => a.name.localeCompare(b.name));
  if (!party.length) return null;
  const data = await foundry.applications.api.DialogV2.input({
    window: { title: L("Bestiary.OfferAccept"), icon: "fa-solid fa-coins" },
    classes: ["eternia", "lhd-box"],
    content: `<div class="form-group"><label>${L("Drops.ForWhom")}</label><select name="who">${party.map(a => `<option value="${a.uuid}">${foundry.utils.escapeHTML(a.name)}</option>`).join("")}</select></div>`,
    ok: { label: L("Bestiary.OfferAccept"), icon: "fa-solid fa-check" }
  });
  return data?.who ? fromUuidSync(data.who) : null;
}

/** The GM answers an offer: the gold to whoever accepted, the monster leaves; or it is refused. */
async function answerOffer({ messageId, accept, receiverUuid }) {
  const message = game.messages.get(messageId);
  const data = message?.getFlag(SYSTEM_ID, "offerCard");
  if (!data || (data.state !== "open")) return { ok: true };
  const actor = fromUuidSync(data.actorUuid);
  const receiver = receiverUuid ? fromUuidSync(receiverUuid) : null;
  if (accept && (receiver instanceof Actor)) {
    await receiver.update({ [goldPath(receiver)]: getGold(receiver) + data.gold });
    data.state = "accepted";
    data.receiver = actorName(receiver);
    if (actor) await leave(actor);
  }
  else data.state = "refused";
  await message.update({ content: await renderOffer(actor ?? { img: "", name: "?" }, data), [`flags.${SYSTEM_ID}.offerCard`]: data });
  return { ok: true };
}

/** A monster leaves the scene: its token hides, out of the combat, and it leaves no drops. */
async function leave(actor) {
  await actor.setFlag(SYSTEM_ID, "noLoot", true);
  const token = tokenOf(actor);
  for (const combat of game.combats) {
    const combatant = combat.combatants.find(c => (c.tokenId === token?.id) || (c.actor?.uuid === actor.uuid));
    if (combatant) await combatant.update({ defeated: true });
  }
  if (token) await token.update({ hidden: true });
}

/** The offer card's buttons. */
function onRenderOffer(message, html) {
  const data = message.getFlag(SYSTEM_ID, "offerCard");
  if (!data) return;
  const actions = html.querySelector(".rk-actions");
  if (!actions) return;
  if (data.state !== "open") return actions.remove();
  actions.querySelector('[data-action="offer-accept"]')?.addEventListener("click", async event => {
    event.preventDefault();
    const receiver = await answerer();
    if (!receiver) return ui.notifications.warn(L("Bestiary.OfferNoCharacter"));
    await request("bestiaryOffer", { messageId: message.id, accept: true, receiverUuid: receiver.uuid });
  });
  actions.querySelector('[data-action="offer-refuse"]')?.addEventListener("click", event => {
    event.preventDefault();
    request("bestiaryOffer", { messageId: message.id, accept: false });
  });
}

/* -------------------------------------------- */
/*  Hooks                                       */
/* -------------------------------------------- */

/** A skill was used (on the window of its user): grow, summon, spend a recharge, offer. */
async function onSkillUsed(item, { actor }) {
  const rule = ruleOf(item);
  if (!rule || !actor?.isOwner || (actor.type !== "monster")) return;
  if (rule.rule === "grow") await grow(actor, item);
  if (rule.rule === "recharge") await spend(actor, item);
  if (rule.rule === "offer") await offer(actor, item);
  if (rule.rule === "summon") {
    const token = tokenOf(actor);
    const tokens = token ? await spawnNear(token, rule.actors ?? [], { radius: toInt(rule.radius) || 2, by: actor.uuid }) : [];
    if (tokens.length) await postSummary(item.name, [L("Bestiary.Summon", { name: actorName(actor), list: tokens.map(t => t.name).join(", ") })]);
  }
}

/** Call during the `init` hook. */
export function registerMonsterRules() {
  registerHandler("bestiaryPickpocket", payload => pickpocket(payload));
  registerHandler("bestiaryOffer", payload => answerOffer(payload));
  Hooks.on("renderChatMessageHTML", onRenderOffer);
  Hooks.on("eternia.damaged", (actor, card, context) => {
    onStruck(actor, card, context ?? {}).catch(err => console.error(`${SYSTEM_ID} | Struck rule failed`, err));
    onHit(actor, card, context ?? {}).catch(err => console.error(`${SYSTEM_ID} | Light hand failed`, err));
  });
  // A combat that ends: the spent skills of its monsters are back
  Hooks.on("deleteCombat", combat => {
    if (!isPrimaryGM()) return;
    for (const combatant of combat.combatants) {
      const actor = combatant.actor;
      if (actor?.getFlag(SYSTEM_ID, RECHARGING)?.length) actor.unsetFlag(SYSTEM_ID, RECHARGING).catch(() => null);
    }
  });
  foundry.applications.handlebars.loadTemplates([OFFER_TEMPLATE]);
  Hooks.on("eternia.skillUsed", (item, context) => onSkillUsed(item, context ?? {}).catch(err => console.error(`${SYSTEM_ID} | Monster rule failed`, err)));
  Hooks.on("updateActor", (actor, changes, options, userId) => {
    if ((actor.type !== "monster") || !isLocalChange(options, userId) || !foundry.utils.hasProperty(changes, "system.health")) return;
    checkThresholds(actor).catch(err => console.error(`${SYSTEM_ID} | Threshold failed`, err));
    checkTroop(actor).catch(err => console.error(`${SYSTEM_ID} | Troop failed`, err));
    checkRetreat(actor).catch(err => console.error(`${SYSTEM_ID} | Retreat failed`, err));
  });
  Hooks.on("eternia.revived", actor => forgetSkill(actor).catch(err => console.error(`${SYSTEM_ID} | Forgetting failed`, err)));
  Hooks.on("createActiveEffect", (effect, options, userId) => {
    const actor = effect.parent;
    if (!(actor instanceof Actor) || (actor.type !== "monster") || !effect.statuses?.has("incapacitated") || !isPrimaryGM()) return;
    onFall(actor).catch(err => console.error(`${SYSTEM_ID} | Fall rule failed`, err));
  });
  // The Setup Process recharges the spent skills; the Cleanup, the monsters that clear themselves
  wrap(CONFIG.Combat.documentClass.prototype, "_onPhaseStart", async function (original, phase, round, previous) {
    await original.call(this, phase, round, previous);
    const backwards = !!previous && (round < previous.round);
    if (backwards || !rulesOn()) return;
    if (phase === "setup") await setupRecharge(this).catch(err => console.error(`${SYSTEM_ID} | Recharge failed`, err));
    if (phase === "setup") await setupRetreat(this).catch(err => console.error(`${SYSTEM_ID} | Retreat failed`, err));
    if (phase === "cleanup") await cleanupCleanse(this).catch(err => console.error(`${SYSTEM_ID} | Cleanse failed`, err));
  });
}
