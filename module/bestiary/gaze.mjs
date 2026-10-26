/**
 * The gaze (Olhar, a monster rule, docs/bestiario.md): a skill with `flags.eternia.monster = { rule: "gaze", radius, dice,
 * mod, steps }` (the Basilisk's stone gaze). When an enemy of the monster (the other side, by the disposition of the
 * tokens) that isn't [Blinded] starts its Main Process within `radius` squares of it (counted like the attack cards), the
 * gaze card (`templates/chat/gaze-card.hbs`) asks it to meet the gaze or to look away:
 * - Meet (Encarar): its Resistance (a Dodge Check, with what its conditions change) against the gaze (`dice`d6 + `mod`),
 *   by the rule of the Hit Check (the gaze has to beat it; the criticals and the fumbles count). Failing, it takes the
 *   first status of `steps` it doesn't have yet: ["slowed", "petrified"] gives [Slowed] until the end of the scene (an
 *   infinite effect: a Major Action ends it), and to one already [Slowed], [Petrified] (it ends as its rule says, or when
 *   the monster falls).
 * - Look away (Desviar): the effect "Olhos Desviados" (`flags.eternia.gazeAverted`) until the end of that Main Process:
 *   the gaze passes it by, and its attacks roll −1d6 (`eternia.roll.check.dice` on the skills with an attack tag).
 * Whoever owns the creature answers (or the GM); a card still open when that Main Process ends is met. One card per Main
 * Process, for the nearest monster that gazes. The answer goes to the GM by the socket (`bestiaryGaze`), which rolls and
 * gives the statuses.
 */
import { L, SYSTEM_ID } from "../settings.mjs";
import { isPrimaryGM } from "../helpers/clients.mjs";
import { toInt } from "../helpers/utils.mjs";
import { diceFormula } from "../helpers/dice.mjs";
import { registerHandler, request } from "../piles/pile-socket.mjs";
import { statusEffectData } from "../chat/status-links.mjs";
import { applyModifier, consumeAfterRoll, dodgeModifier } from "../conditions/rolls.mjs";
import { realmReach } from "../conditions/realm.mjs";
import { has, rulesOn } from "../conditions/rules.mjs";

const TEMPLATE = "systems/eternia/templates/chat/gaze-card.hbs";

/** The skills whose Check the averted eyes hinder: the attacks. */
const ATTACK_TAGS = ["Weapon Attack", "Melee Attack", "Ranged Attack", "Magic Attack", "Physical Attack", "Special Attack", "Sword Attack"];

/** The picture of the averted eyes, on the token. */
const AVERTED_ICON = "icons/creatures/eyes/humanoid-single-blind.webp";

/** How far back the open cards are looked for, at the end of a Main Process. */
const LOOKBACK = 40;

const label = id => game.i18n.localize(`ETERNIA.StatusEffect.${id}`);
const down = actor => !actor || actor.statuses.has("incapacitated") || actor.statuses.has("dead");

/** The gaze rule of an actor (its skill's), or null. */
export function gazeRule(actor) {
  const item = (actor?.items ?? []).find(i => (i.type === "skill") && (i.getFlag(SYSTEM_ID, "monster")?.rule === "gaze"));
  if (!item) return null;
  const rule = item.getFlag(SYSTEM_ID, "monster");
  const steps = Array.isArray(rule.steps) && rule.steps.length ? rule.steps : ["slowed", "petrified"];
  return { item, radius: toInt(rule.radius) || 3, dice: Math.max(1, toInt(rule.dice) || 2), mod: toInt(rule.mod), steps };
}

/** The square a token stands on (its center), as the attack cards count. */
function squareOf(token) {
  const size = token.parent?.grid?.size || 100;
  return { i: Math.floor((token.y + ((token.height * size) / 2)) / size), j: Math.floor((token.x + ((token.width * size) / 2)) / size) };
}

/** The nearest monster that gazes at a token now (an enemy, up, within its radius), or null. */
function nearestGazer(token) {
  const actor = token.actor;
  const at = squareOf(token);
  let best = null;
  for (const other of token.parent.tokens) {
    const rule = (other !== token) && !other.hidden ? gazeRule(other.actor) : null;
    if (!rule || down(other.actor)) continue;
    if (!realmReach(other.actor, rule.radius, token.parent).enemies.some(a => a === actor)) continue;
    const p = squareOf(other);
    const squares = Math.abs(p.i - at.i) + Math.abs(p.j - at.j);
    if (!best || (squares < best.squares)) best = { token: other, rule, squares };
  }
  return best;
}

/** Whether an actor has its eyes averted now. */
export const eyesAverted = actor => [...(actor?.effects ?? [])].some(e => e.active && e.getFlag(SYSTEM_ID, "gazeAverted"));

/** A roll of a check: its total and whether it is a critical or a fumble (as the attack cards read it). */
function outcome(roll) {
  const results = roll.dice.flatMap(d => d.results.filter(r => r.active).map(r => r.result));
  const fumble = results.length > 0 && results.every(r => r === 1);
  const critical = !fumble && (results.filter(r => r === 6).length >= 2);
  return { total: fumble ? 0 : roll.total, critical, fumble };
}

/** The rule of the Hit Check: the fumbles fail, the criticals win, the defender wins the ties. */
function beats(attack, dodge) {
  if (attack.fumble) return false;
  if (dodge.fumble) return true;
  if (dodge.critical) return false;
  if (attack.critical) return true;
  return attack.total > dodge.total;
}

/* -------------------------------------------- */
/*  The card                                    */
/* -------------------------------------------- */

/** The card's HTML: who must choose, the gaze in the seal, what happened, and the two buttons while it is open. */
function renderCard(data) {
  return foundry.applications.handlebars.renderTemplate(TEMPLATE, {
    img: data.img, name: data.name, eyebrow: data.eyebrow, event: data.event, open: data.state === "open",
    gazeLabel: L("Gaze.GazeLabel"), gaze: data.gaze,
    meetLabel: L("Gaze.Meet"), meetHint: L("Gaze.MeetHint"), avertLabel: L("Gaze.Avert"), avertHint: L("Gaze.AvertHint")
  });
}

/** A Main Process starts (the primary GM): the card for the creature a gaze reaches. */
async function onProcessStart(combat, combatant) {
  const token = combatant?.token;
  const actor = token?.actor;
  if (!actor || down(actor) || has(actor, "blinded")) return;
  const gazer = nearestGazer(token);
  if (!gazer) return;
  const data = {
    gazerUuid: gazer.token.uuid, targetUuid: token.uuid, combatId: combat.id, round: combat.round, state: "open",
    img: token.texture?.src || actor.img, name: token.name, eyebrow: gazer.rule.item.name,
    gaze: diceFormula({ dice: gazer.rule.dice, mod: gazer.rule.mod }),
    event: L("Gaze.Asked", { name: token.name, monster: gazer.token.name, n: gazer.squares })
  };
  await ChatMessage.create({ speaker: { alias: gazer.token.name }, content: await renderCard(data), flags: { [SYSTEM_ID]: { gazeCard: data } } });
}

/* -------------------------------------------- */
/*  The answer                                  */
/* -------------------------------------------- */

/** Answer a gaze card: "meet" or "avert" (the owner of the creature, or the GM). */
export async function answerGaze(message, choice) {
  const result = await request("bestiaryGaze", { messageId: message?.id, choice });
  if (!result?.ok && result?.error) ui.notifications.warn(game.i18n.localize(result.error));
  return result;
}

/** The GM answers: the averted eyes, or the Resistance against the gaze and its status. */
async function onAnswer({ messageId, choice }, user) {
  const message = game.messages.get(messageId ?? "");
  const data = message?.getFlag(SYSTEM_ID, "gazeCard");
  if (!data || (data.state !== "open")) return { ok: true };
  const target = fromUuidSync(data.targetUuid ?? "");
  const gazer = fromUuidSync(data.gazerUuid ?? "");
  const actor = target?.actor;
  if (!actor || !gazer?.actor) return { ok: false };
  if (user && !user.isGM && !actor.testUserPermission(user, "OWNER")) return { ok: false, error: "ETERNIA.Gaze.NotYours" };
  const next = { ...data, state: (choice === "avert") ? "averted" : "met" };
  if (choice === "avert") {
    await actor.createEmbeddedDocuments("ActiveEffect", [{
      name: L("Gaze.Averted"), img: AVERTED_ICON, type: "base", transfer: false, disabled: false, statuses: [],
      showIcon: CONST.ACTIVE_EFFECT_SHOW_ICON.ALWAYS,
      system: { changes: [{ key: "eternia.roll.check.dice", type: "add", value: "-1", phase: "initial", priority: null }] },
      flags: { [SYSTEM_ID]: { gazeAverted: true, rollFilter: { skillTags: ATTACK_TAGS }, expires: "endOfProcess" } }
    }]);
    next.event = L("Gaze.LookedAway", { name: target.name, monster: gazer.name });
  }
  else next.event = await meet(target, gazer);
  await message.update({ content: await renderCard(next), [`flags.${SYSTEM_ID}.gazeCard`]: next });
  return { ok: true };
}

/** The gaze met: the creature's Resistance against it; failing, the next step of the stone. Returns the card's line. */
async function meet(target, gazer) {
  const actor = target.actor;
  const rule = gazeRule(gazer.actor);
  const gaze = await new Roll(diceFormula({ dice: rule.dice, mod: rule.mod })).evaluate();
  const check = actor.system.checks?.resistance ?? {};
  const condition = dodgeModifier(actor, { vs: "resistance", attacker: gazer.actor, item: rule.item });
  let dodge;
  if (condition.autoFail) dodge = { total: 0, critical: false, fumble: true };
  else {
    // As the attack cards roll a Dodge Check (helpers/combat-cards.mjs)
    const { dice, mod } = applyModifier({ dice: toInt(check.dice), mod: toInt((actor.type === "monster") ? check.mod : check.total) }, condition);
    const roll = await new Roll(diceFormula({ dice, mod })).evaluate();
    dodge = outcome(roll);
    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor }),
      flavor: `${L("Gaze.Flavor", { monster: gazer.name, vs: gaze.total })}${condition.text ? ` (${condition.text})` : ""}`
    });
    await consumeAfterRoll(actor, condition.consume);
  }
  const names = { name: target.name, monster: gazer.name, total: dodge.total, vs: gaze.total };
  if (!beats(outcome(gaze), dodge)) return L("Gaze.Resisted", names);
  const step = rule.steps.find(id => !has(actor, id));
  if (!step) return L("Gaze.Failed", { ...names, status: rule.steps.map(label).at(-1) });
  const effect = statusEffectData(step, null, "", { item: rule.item, caster: gazer.actor, expires: "endOfScene" });
  // The first step lasts until the end of the scene (a Major Action ends it); the ones that take the turn end by their rule
  if (step !== rule.steps.at(-1)) foundry.utils.setProperty(effect, `flags.${SYSTEM_ID}.infinite`, true);
  await actor.createEmbeddedDocuments("ActiveEffect", [effect]);
  return L(has(actor, step) ? "Gaze.Failed" : "Gaze.Immune", { ...names, status: label(step) });
}

/** A Main Process ended (on the window that ended it): the creature's card still open is met. */
async function onProcessEnd(actor, combat) {
  if (!game.user.isGM || !actor) return;
  const open = game.messages.contents.slice(-LOOKBACK).filter(m => {
    const data = m.getFlag(SYSTEM_ID, "gazeCard");
    return (data?.state === "open") && (data.combatId === combat?.id) && (fromUuidSync(data.targetUuid ?? "")?.actor === actor);
  });
  for (const message of open) await answerGaze(message, "meet");
}

/* -------------------------------------------- */
/*  Registration                                */
/* -------------------------------------------- */

/** The card's buttons: only for the owner of the creature (and the GM), while it is open. */
function onRenderMessage(message, html) {
  const data = message.getFlag(SYSTEM_ID, "gazeCard");
  const actions = data ? html.querySelector(".rk-actions") : null;
  if (!actions) return;
  const actor = fromUuidSync(data.targetUuid ?? "")?.actor;
  if ((data.state !== "open") || !actor?.isOwner) return actions.remove();
  for (const [action, choice] of [["gaze-meet", "meet"], ["gaze-avert", "avert"]]) {
    actions.querySelector(`[data-action="${action}"]`)?.addEventListener("click", event => {
      event.preventDefault();
      event.currentTarget.disabled = true;
      answerGaze(message, choice).catch(err => console.error(`${SYSTEM_ID} | Gaze failed`, err));
    });
  }
}

/** Call during the `init` hook. */
export function registerGaze() {
  registerHandler("bestiaryGaze", (payload, user) => onAnswer(payload ?? {}, user));
  Hooks.on("renderChatMessageHTML", onRenderMessage);
  // Whose Main Process starts: the combatant set active by this update (as conditions/turns.mjs reads it)
  Hooks.on("updateCombat", (combat, changes) => {
    if (!rulesOn() || !isPrimaryGM()) return;
    const active = foundry.utils.getProperty(changes, "flags.eternia.active");
    if (!active || (combat.phase !== "main")) return;
    onProcessStart(combat, combat.combatants.get(active)).catch(err => console.error(`${SYSTEM_ID} | Gaze failed`, err));
  });
  Hooks.on("eternia.processEnd", (actor, combat) => onProcessEnd(actor, combat).catch(err => console.error(`${SYSTEM_ID} | Gaze failed`, err)));
  foundry.applications.handlebars.loadTemplates([TEMPLATE]);
}
