/**
 * Death (À Beira da Morte): the dead stay dead, and 0 HP is where it starts.
 *
 * - The fall: a character on a token that isn't hostile (helpers/utils.mjs isAdventurer: the players' characters and
 *   their allies) that falls ([Incapacitated]) is [Dying: 2]. Not one that collapses with its Max HP at 0 (Fatigue),
 *   nor a transformation's bearer falling at the end of the scene: those only fall, as before.
 * - The Death Check, in the Cleanup of every round (the primary GM posts it): a card for each one [Dying] asks its
 *   owner, or the GM, to roll 2d6 with no bonus. Two 6s always hold; else a total equal to or below the Rating kills,
 *   and above it the Rating goes up 1. A Fate Point rolls a die more (3d6). Instead of rolling, the character may rise
 *   for its Last Act: 1 HP, the next round whole and unable to fall (an Extra Breath that doesn't run out,
 *   conditions/damage.mjs), and dead in the Cleanup of that round. The card says the chance of dying.
 * - A blow on the ground: damage to one [Dying] raises the Rating by 2, and a critical hit kills (groundBlow, asked by
 *   conditions/damage.mjs afterDamage and takeDamage).
 * - Saved: what ends [Incapacitated] (any healing above 0 HP) ends [Dying].
 * - The end of the scene (automation/scenes.mjs): who is still [Dying] makes one last Death Check, with no Last Act, and
 *   gets up if it holds; who is in its Last Act dies.
 * - The dead stay dead: no end of scene, skill nor item brings anyone back.
 * Enemies (monsters, a character on a hostile token) fall as before: [Incapacitated], and dead at the end of the scene.
 *
 * The clicks of a card go to the primary GM (piles/pile-socket.mjs request), who rolls (with Dice So Nice, when it is
 * on) and changes the character and the card. The character keeps the card it waits on in `flags.eternia.deathCheck`
 * ({ message, kind, round }): one Death Check at a time.
 */
import { L, SYSTEM_ID } from "../settings.mjs";
import { isLocalChange, isPrimaryGM } from "../helpers/clients.mjs";
import { actorName, combatActors, isAdventurer, postSummary, toInt } from "../helpers/utils.mjs";
import { registerHandler, request } from "../piles/pile-socket.mjs";
import { fallingNow } from "../conditions/transformations.mjs";

export const DYING = "dying";
export const LAST_ACT = "lastAct";
/** The Rating a fall starts at. */
export const DYING_START = 2;
/** How much a blow on the ground raises it. */
export const GROUND_BLOW = 2;

const CARD = "systems/eternia/templates/chat/death-check.hbs";
const CHECK_FLAG = "deathCheck";

/** The [Dying] Rating of an actor. */
export const dyingOf = actor => toInt(actor?.system?.["bad-status"]?.[DYING]);

/** Whether an actor is [Dying] (and not dead yet). */
export const isDying = actor => !!actor && !actor.statuses.has("dead") && (dyingOf(actor) > 0);

const fateOf = actor => toInt(actor?._source?.system?.fate?.value);
const percent = n => `${Math.round(n * 100)}%`;

/**
 * The chance that a Death Check kills: `dice` d6, death at or below the Rating, unless two of them are 6.
 * @param {number} rating
 * @param {number} [dice]
 * @returns {number}  0 to 1
 */
export function deathChance(rating, dice = 2) {
  let deaths = 0;
  let total = 0;
  const roll = (left, sum, sixes) => {
    if (!left) {
      total += 1;
      if ((sixes < 2) && (sum <= rating)) deaths += 1;
      return;
    }
    for (let face = 1; face <= 6; face++) roll(left - 1, sum + face, sixes + ((face === 6) ? 1 : 0));
  };
  roll(dice, 0, 0);
  return deaths / total;
}

/* -------------------------------------------- */
/*  Falling, getting up, dying                  */
/* -------------------------------------------- */

/** A character fell (on the window that made it fall): it is [Dying]. */
async function onFall(effect, options, userId) {
  if (!effect.statuses?.has("incapacitated") || !isLocalChange(options, userId)) return;
  const actor = effect.parent;
  if (!(actor instanceof Actor) || !isAdventurer(actor) || actor.statuses.has("dead") || (dyingOf(actor) > 0)) return;
  // Collapsing with the Max HP at 0 (Fatigue), or a transformation's fall at the end of the scene: no Death Check
  if ((toInt(actor.system.health?.max) <= 0) || fallingNow(actor) || actor.statuses.has(LAST_ACT)) return;
  await actor.update({ [`system.bad-status.${DYING}`]: DYING_START });
  await postSummary(L("Death.Title"), [L("Death.Fall", { name: actorName(actor), n: DYING_START, chance: percent(deathChance(DYING_START)) })]);
}

/** A character got up (any healing above 0 HP ends [Incapacitated]): it is no longer [Dying]. */
async function onRise(effect, options, userId) {
  if (!effect.statuses?.has("incapacitated") || !isLocalChange(options, userId)) return;
  const actor = effect.parent;
  if (!(actor instanceof Actor) || actor.statuses.has("dead") || (dyingOf(actor) <= 0)) return;
  await actor.update({ [`system.bad-status.${DYING}`]: 0 });
  await settle(actor, L("Death.Result.Saved"));
  await postSummary(L("Death.Title"), [L("Death.Saved", { name: actorName(actor) })]);
}

/** A character that dies some other way ([Dead] put by hand, an enemy's end of the scene) is no longer [Dying]. */
async function onDead(effect, options, userId) {
  if (!effect.statuses?.has("dead") || !isLocalChange(options, userId)) return;
  const actor = effect.parent;
  if (!(actor instanceof Actor) || (dyingOf(actor) <= 0)) return;
  await actor.update({ [`system.bad-status.${DYING}`]: 0 });
  await settle(actor, L("Death.Result.Dead"));
}

/**
 * The character dies, for good: 0 HP, [Dead] (and [Incapacitated]), no [Dying] nor Last Act any more.
 * @param {Actor} actor
 * @param {object} [options]
 * @param {string} [options.why]  The line for the chat (else none)
 */
export async function die(actor, { why = "" } = {}) {
  if (!actor || actor.statuses.has("dead")) return;
  await actor.update({ "system.health.value": 0, [`system.bad-status.${DYING}`]: 0 });
  const last = actor.effects.filter(e => e.statuses.has(LAST_ACT)).map(e => e.id);
  if (last.length) await actor.deleteEmbeddedDocuments("ActiveEffect", last);
  // Dead first: falling dead isn't a fall to [Dying]
  await actor.toggleStatusEffect("dead", { active: true });
  if (!actor.statuses.has("incapacitated")) await actor.toggleStatusEffect("incapacitated", { active: true });
  await settle(actor, L("Death.Result.Dead"));
  if (why) await postSummary(L("Death.Title"), [why]);
}

/**
 * A blow on the ground: what damage does to one [Dying] (the Rating up by 2; a critical hit kills).
 * @param {Actor} actor
 * @param {object} [options]
 * @param {boolean} [options.critical]
 * @returns {{updates: object, line: string, after: (Function|null)}|null}  null when the actor isn't [Dying]
 */
export function groundBlow(actor, { critical = false } = {}) {
  if (!isDying(actor)) return null;
  if (critical) {
    return { updates: {}, line: L("Death.GroundCritical"), after: () => die(actor, { why: L("Death.DiesBlow", { name: actorName(actor) }) }) };
  }
  const n = dyingOf(actor) + GROUND_BLOW;
  return { updates: { [`system.bad-status.${DYING}`]: n }, line: L("Death.GroundBlow", { n }), after: null };
}

/* -------------------------------------------- */
/*  The Last Act                                */
/* -------------------------------------------- */

/** The Last Act's effect: the status, an Extra Breath that doesn't run out, and the round it was chosen in. */
async function lastActData(combat) {
  const effect = await ActiveEffect.implementation.fromStatusEffect(LAST_ACT);
  const data = effect.toObject();
  foundry.utils.setProperty(data, `flags.${SYSTEM_ID}.revive`, { uses: 999, per: "round", hp: 1 });
  foundry.utils.setProperty(data, `flags.${SYSTEM_ID}.${LAST_ACT}`, { combat: combat?.id ?? null, round: combat?.round ?? 0 });
  return data;
}

/** Whether a Last Act ends in this Cleanup (it was chosen in an earlier round of this combat). */
function lastActEnds(actor, combat) {
  const effect = actor.effects.find(e => e.statuses.has(LAST_ACT));
  if (!effect) return false;
  const mark = effect.getFlag(SYSTEM_ID, LAST_ACT) ?? {};
  return (mark.combat !== combat.id) || (toInt(mark.round) < combat.round);
}

/** Whether an actor is in its Last Act. */
export const inLastAct = actor => !!actor?.effects?.some(e => e.statuses.has(LAST_ACT));

/* -------------------------------------------- */
/*  The Death Check                             */
/* -------------------------------------------- */

/** What the card shows, waiting or done. */
async function cardContent(actor, data) {
  const rating = toInt(data.rating);
  const fate = fateOf(actor);
  const eyebrow = (data.kind === "scene") ? L("Death.Card.Scene") : L("Death.Card.Round", { round: data.round ?? "" });
  return foundry.applications.handlebars.renderTemplate(CARD, {
    img: actor.token?.texture?.src ?? actor.prototypeToken?.texture?.src ?? actor.img,
    name: actorName(actor),
    eyebrow,
    rating,
    rule: L("Death.Card.Rule", { n: rating }),
    chance: percent(deathChance(rating)),
    fate: !data.result && (fate > 0),
    fateChance: (fate > 0) ? percent(deathChance(rating, 3)) : "",
    lastAct: data.kind === "round",
    result: data.result ?? null
  });
}

/**
 * Post the Death Check of a [Dying] character and mark it as the one it waits on.
 * @param {Actor} actor
 * @param {object} options
 * @param {string} options.kind      "round" (a Cleanup) or "scene" (the last one, at the end of the scene)
 * @param {number} [options.round]
 * @returns {Promise<ChatMessage|null>}
 */
export async function askDeathCheck(actor, { kind = "round", round = null } = {}) {
  if (!isDying(actor)) return null;
  await clearCheck(actor);
  const data = { actorUuid: actor.uuid, kind, round, rating: dyingOf(actor) };
  const message = await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content: await cardContent(actor, data),
    flags: { [SYSTEM_ID]: { [CHECK_FLAG]: data } }
  });
  await actor.setFlag(SYSTEM_ID, CHECK_FLAG, { message: message.id, kind, round });
  return message;
}

/** A card that waits no more (the character got up, died, or a new check replaced it) says so. */
async function settle(actor, text) {
  const pending = actor.getFlag(SYSTEM_ID, CHECK_FLAG);
  if (!pending) return;
  await actor.unsetFlag(SYSTEM_ID, CHECK_FLAG);
  const message = game.messages.get(pending.message);
  const data = message?.getFlag(SYSTEM_ID, CHECK_FLAG);
  if (!data || data.result || !(message.isOwner)) return;
  const done = { ...data, result: { outcome: "settled", text } };
  await message.update({ content: await cardContent(actor, done), [`flags.${SYSTEM_ID}.${CHECK_FLAG}`]: done });
}

/** Forget the check a character waited on (its card is settled). */
async function clearCheck(actor) {
  if (actor.getFlag(SYSTEM_ID, CHECK_FLAG)) await settle(actor, L("Death.Result.Replaced"));
}

/**
 * The owner's (or the GM's) answer to a Death Check, on the primary GM: roll it, with a Fate Point, or the Last Act.
 * @param {{messageId: string, choice: string}} payload
 * @param {User} user
 */
async function onCheckRequest({ messageId, choice }, user) {
  const message = game.messages.get(messageId);
  const data = message?.getFlag(SYSTEM_ID, CHECK_FLAG);
  if (!data || data.result) return { ok: false, error: "ETERNIA.Death.Error.Done" };
  const actor = fromUuidSync(data.actorUuid);
  if (!(actor instanceof Actor) || !(user.isGM || actor.testUserPermission(user, "OWNER"))) return { ok: false, error: "ETERNIA.Death.Error.NotYours" };
  if (!isDying(actor) || (actor.getFlag(SYSTEM_ID, CHECK_FLAG)?.message !== messageId)) {
    const done = { ...data, result: { outcome: "settled", text: L("Death.Result.Settled") } };
    await message.update({ content: await cardContent(actor, done), [`flags.${SYSTEM_ID}.${CHECK_FLAG}`]: done });
    return { ok: false, error: "ETERNIA.Death.Error.Done" };
  }
  const rating = dyingOf(actor);
  let result;
  if ((choice === "lastAct") && (data.kind === "round")) {
    const inCombat = c => c.started && c.combatants.some(cb => cb.actor?.uuid === actor.uuid);
    const combat = game.combats.find(inCombat) ?? null;
    await actor.unsetFlag(SYSTEM_ID, CHECK_FLAG);
    await actor.update({ "system.health.value": 1, [`system.bad-status.${DYING}`]: 0 });
    await actor.createEmbeddedDocuments("ActiveEffect", [await lastActData(combat)], { keepId: true });
    if (actor.statuses.has("incapacitated")) await actor.toggleStatusEffect("incapacitated", { active: false });
    result = { outcome: "lastAct", text: L("Death.Result.LastAct", { name: actorName(actor) }) };
  }
  else {
    const fate = choice === "fate";
    if (fate) {
      if (fateOf(actor) < 1) return { ok: false, error: "ETERNIA.Death.Error.NoFate" };
      await actor.update({ "system.fate.value": fateOf(actor) - 1 });
    }
    const roll = await new Roll(fate ? "3d6" : "2d6").evaluate();
    await game.dice3d?.showForRoll(roll, user, true).catch(() => null);
    const dice = roll.dice[0]?.results.map(r => r.result) ?? [];
    const sixes = dice.filter(d => d === 6).length;
    const holds = (sixes >= 2) || (roll.total > rating);
    const shown = dice.map(value => ({ value, six: value === 6 }));
    await actor.unsetFlag(SYSTEM_ID, CHECK_FLAG);
    if (!holds) {
      await die(actor);
      result = { outcome: "dead", dice: shown, total: roll.total, fate, text: L("Death.Result.Dies", { name: actorName(actor), total: roll.total, n: rating }) };
    }
    else if (data.kind === "scene") {
      // The last check at the end of the scene: it gets up with full HP, as the fallen do
      await actor.update({ [`system.bad-status.${DYING}`]: 0, "system.health.value": toInt(actor.system.health?.max) });
      if (actor.statuses.has("incapacitated")) await actor.toggleStatusEffect("incapacitated", { active: false });
      result = { outcome: "holds", dice: shown, total: roll.total, fate, text: L("Death.Result.GetsUp", { name: actorName(actor) }) };
    }
    else {
      await actor.update({ [`system.bad-status.${DYING}`]: rating + 1 });
      const key = (sixes >= 2) ? "Death.Result.HoldsCritical" : "Death.Result.Holds";
      result = { outcome: "holds", dice: shown, total: roll.total, fate, text: L(key, { name: actorName(actor), total: roll.total, n: rating + 1 }) };
    }
  }
  const done = { ...data, rating, result };
  await message.update({ content: await cardContent(actor, done), [`flags.${SYSTEM_ID}.${CHECK_FLAG}`]: done });
  return { ok: true };
}

/** The buttons of a card waiting: only its owners (and the GM) see them; a click goes to the GM. */
function onRenderMessage(message, html) {
  const data = message.getFlag(SYSTEM_ID, CHECK_FLAG);
  if (!data) return;
  const buttons = html.querySelectorAll("[data-death]");
  if (!buttons.length) return;
  const actor = fromUuidSync(data.actorUuid);
  const mine = !data.result && !!actor && (game.user.isGM || actor.isOwner);
  html.querySelector(".dc-buttons")?.toggleAttribute("hidden", !mine);
  if (!mine) return;
  for (const button of buttons) {
    button.addEventListener("click", async event => {
      event.preventDefault();
      buttons.forEach(b => b.disabled = true);
      const result = await request("deathCheck", { messageId: message.id, choice: button.dataset.death });
      if (!result?.ok) {
        if (result?.error) ui.notifications.warn(game.i18n.localize(result.error));
        buttons.forEach(b => b.disabled = false);
      }
    });
  }
}

/* -------------------------------------------- */
/*  The Cleanup                                 */
/* -------------------------------------------- */

/** The Cleanup of a round (on the primary GM): the Last Acts end, then a Death Check for each one [Dying]. */
async function onPhase(combat, current, previous, { repeat = false } = {}) {
  if (repeat || (current?.phase !== "cleanup") || !isPrimaryGM()) return;
  if (previous && (current.round < previous.round)) return;
  for (const actor of combatActors(combat)) {
    if (!actor.statuses.has("dead") && lastActEnds(actor, combat)) {
      await die(actor, { why: L("Death.DiesLastAct", { name: actorName(actor) }) });
    }
  }
  for (const actor of combatActors(combat)) {
    if (!isDying(actor) || actor.getFlag(SYSTEM_ID, CHECK_FLAG)) continue;
    await askDeathCheck(actor, { kind: "round", round: current.round });
  }
}

/**
 * The end of the scene for one character (automation/scenes.mjs endOfSceneFor): the Last Act ends in death; one still
 * [Dying] makes its last Death Check. Returns the summary line, or null when neither applies.
 * @param {Actor} actor
 * @returns {Promise<string|null>}
 */
export async function deathAtSceneEnd(actor) {
  if (!actor || actor.statuses.has("dead")) return null;
  if (inLastAct(actor)) {
    await die(actor);
    return L("Death.DiesLastAct", { name: actorName(actor) });
  }
  if (!isDying(actor)) return null;
  await askDeathCheck(actor, { kind: "scene" });
  return L("Death.SceneCheck", { name: actorName(actor) });
}

/** Call during the `init` hook. */
export function registerDeath() {
  const fail = what => err => console.error(`${SYSTEM_ID} | ${what} failed`, err);
  registerHandler("deathCheck", onCheckRequest);
  Hooks.on("createActiveEffect", (effect, options, userId) => onFall(effect, options, userId).catch(fail("The fall")));
  Hooks.on("createActiveEffect", (effect, options, userId) => onDead(effect, options, userId).catch(fail("Dying, dead")));
  Hooks.on("deleteActiveEffect", (effect, options, userId) => onRise(effect, options, userId).catch(fail("Getting up")));
  Hooks.on("eternia.combatPhase", (combat, current, previous, context) => onPhase(combat, current, previous, context)
    .catch(fail("The Death Checks")));
  Hooks.on("renderChatMessageHTML", onRenderMessage);
}
