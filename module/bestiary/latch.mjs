/**
 * The latch (Grudar, a monster rule, docs/bestiario.md): a skill with `flags.eternia.monster = { rule: "latch", drain }`
 * sticks its user to whoever its damage card hurts (the Stirge's proboscis). The latch is an effect on the host,
 * `flags.eternia.latch = { tokenUuid, actorUuid, drain, item, messageId }` (the latched monster's token), shown on the
 * host's token with the monster's picture, until the end of the scene:
 * - in each Setup Process of its combat, the host loses `drain` HP (direct damage, through [Barrier]; a number or a
 *   formula of the monster, worked out when it latches) and the monster recovers what the host lost;
 * - when the host's token moves (by itself or forced), the monster's token goes with it, to the host's square, the same
 *   way (animated with it, or at once);
 * - it ends when someone rips it off (the card's Rip off button: the host, or whoever touches it, spends a Minor Action
 *   in its own Main Process; the monster lands next to the host), when the monster's token moves away (by itself or
 *   forced: `eterniaLatch` marks the moves that keep it), when either of them falls, and with the scene.
 * With `steps` (a list of status ids), the latch weighs: in each Setup Process the host also gets the first of them it
 * doesn't have yet, infinite while the latch lasts (the Burden Child: [Slowed], then [Rooted], then [Prone]); they end
 * when the monster lets go (`flags.eternia.latchStep` = the monster's token).
 * A monster holds on to one host at a time, and only to a creature of the other side. The card
 * (`templates/chat/latch-card.hbs`) says what it drains and closes when it lets go. The latch, the drain and the moves run
 * on the primary GM; the Rip off of a player goes to it by the socket (`bestiaryLatch`).
 */
import { L, SYSTEM_ID } from "../settings.mjs";
import { isPrimaryGM } from "../helpers/clients.mjs";
import { actorName, combatActors, combatOf, combatantOf, postSummary, toInt, wrap } from "../helpers/utils.mjs";
import { evaluateFormula, formulaData, isFormula } from "../helpers/effect-formulas.mjs";
import { registerHandler, request } from "../piles/pile-socket.mjs";
import { actionsLeft, spendAction } from "../automation/use.mjs";
import { takeDamage, takeHealing } from "../conditions/damage.mjs";
import { rulesOn } from "../conditions/rules.mjs";
import { giveEffects } from "../chat/status-links.mjs";
import { statusList } from "./rust.mjs";

const TEMPLATE = "systems/eternia/templates/chat/latch-card.hbs";

/** Down: Incapacitated or dead (or gone). */
const down = actor => !actor || actor.statuses.has("incapacitated") || actor.statuses.has("dead");

/** The latch rule of a skill, or null. */
function latchRule(item) {
  const rule = item?.getFlag?.(SYSTEM_ID, "monster");
  return (rule?.rule === "latch") ? rule : null;
}

/** The latch effects on an actor: one for each monster stuck to it. */
export const latchesOn = actor => [...(actor?.effects ?? [])].filter(e => e.getFlag(SYSTEM_ID, "latch"));

/** The token of an actor on a scene (a token actor's own, else its first one there), or null. */
function tokenOn(actor, scene) {
  if (actor?.token) return (!scene || (actor.token.parent === scene)) ? actor.token : null;
  return actor?.getActiveTokens?.(false, true).find(t => !scene || (t.parent === scene)) ?? null;
}

/** The latch that holds a monster's token: the host's effect and the host's token, or null. */
export function latchOf(token) {
  for (const host of token?.parent?.tokens ?? []) {
    const effect = latchesOn(host.actor).find(e => e.getFlag(SYSTEM_ID, "latch").tokenUuid === token.uuid);
    if (effect) return { effect, host };
  }
  return null;
}

/** The squares a token covers (where it is going, not where its move is drawn). */
function box(token) {
  const size = token.parent.grid.size;
  const x0 = Math.round(token._source.x / size), y0 = Math.round(token._source.y / size);
  return { x0, y0, x1: x0 + Math.max(1, toInt(token.width)) - 1, y1: y0 + Math.max(1, toInt(token.height)) - 1 };
}

/** Whether two tokens touch: the same square, or side by side or corner to corner (as a Close attack reaches). */
function touching(a, b) {
  const p = box(a), q = box(b);
  return (Math.max(0, p.x0 - q.x1, q.x0 - p.x1) <= 1) && (Math.max(0, p.y0 - q.y1, q.y0 - p.y1) <= 1);
}

/** A free square next to a token, inside the scene, for a monster that was ripped off (null when there is none). */
function freeNextTo(token, except) {
  const scene = token.parent;
  const size = scene.grid.size;
  const taken = new Set();
  for (const t of scene.tokens) {
    if ((t === except) || t.hidden) continue;
    const b = box(t);
    for (let i = b.x0; i <= b.x1; i++) for (let j = b.y0; j <= b.y1; j++) taken.add(`${i},${j}`);
  }
  const rect = scene.dimensions?.sceneRect ?? { x: 0, y: 0, width: scene.width, height: scene.height };
  const b = box(token);
  for (let i = b.x0 - 1; i <= b.x1 + 1; i++) {
    for (let j = b.y0 - 1; j <= b.y1 + 1; j++) {
      const x = i * size, y = j * size;
      if (taken.has(`${i},${j}`) || (x < rect.x) || (y < rect.y) || (x + size > rect.x + rect.width) || (y + size > rect.y + rect.height)) continue;
      return { x, y };
    }
  }
  return null;
}

/* -------------------------------------------- */
/*  The card                                    */
/* -------------------------------------------- */

/** The card's HTML: the monster, what it drains, what happened, and the Rip off button while it holds on. */
function renderCard(data) {
  return foundry.applications.handlebars.renderTemplate(TEMPLATE, {
    img: data.img, name: data.name, eyebrow: L("Latch.Eyebrow"), event: data.event,
    drainLabel: L("Latch.DrainLabel"), drain: data.drain, open: data.state === "open",
    offLabel: L("Latch.Off"), offHint: L("Latch.OffHint")
  });
}

/** Close the card of a latch: the line of how it ended, no button. */
async function closeCard(messageId, event) {
  const message = game.messages.get(messageId ?? "");
  const data = message?.getFlag(SYSTEM_ID, "latchCard");
  if (!data || (data.state !== "open")) return;
  const next = { ...data, state: "off", event };
  await message.update({ content: await renderCard(next), [`flags.${SYSTEM_ID}.latchCard`]: next });
}

/* -------------------------------------------- */
/*  Latching                                    */
/* -------------------------------------------- */

/** A damage card hurt someone (on the window that applied it): a blow that latches asks the GM to stick its monster. */
function onDamaged(actor, card, { amount = 0, absorbed = 0, attacker = null, item = null } = {}) {
  if (!rulesOn() || !latchRule(item) || !attacker || ((toInt(amount) <= 0) && (toInt(absorbed) <= 0))) return;
  request("bestiaryLatch", { action: "latch", monsterUuid: attacker.uuid, hostUuid: actor.uuid, itemUuid: item.uuid })
    .catch(err => console.error(`${SYSTEM_ID} | Latch failed`, err));
}

/**
 * The GM sticks a monster to the one its blow hurt: the effect on the host, the monster's token on the host's square,
 * and the card. Nothing when the monster already holds someone, or the host is of its own side.
 */
async function latch({ monsterUuid, hostUuid, itemUuid }) {
  const monster = fromUuidSync(monsterUuid ?? "");
  const host = fromUuidSync(hostUuid ?? "");
  const item = itemUuid ? fromUuidSync(itemUuid) : null;
  const rule = latchRule(item);
  if (!(monster instanceof Actor) || !(host instanceof Actor) || !rule || down(monster) || down(host)) return { ok: true };
  const own = tokenOn(monster, canvas?.scene) ?? tokenOn(monster, null);
  const at = own ? tokenOn(host, own.parent) : null;
  if (!own || !at || (own === at) || (own.disposition === at.disposition) || latchOf(own)) return { ok: true };
  const drain = Math.max(1, toInt(isFormula(rule.drain) ? evaluateFormula(rule.drain, formulaData(monster, item)) : rule.drain) || 1);
  const [effect] = await host.createEmbeddedDocuments("ActiveEffect", [{
    name: L("Latch.Effect", { name: own.name }), img: own.texture?.src || monster.img, type: "base", origin: item.uuid,
    transfer: false, disabled: false, statuses: [], showIcon: CONST.ACTIVE_EFFECT_SHOW_ICON.ALWAYS,
    flags: { [SYSTEM_ID]: { latch: { tokenUuid: own.uuid, actorUuid: monster.uuid, drain, item: item.name, steps: rule.steps ?? [] }, expires: "endOfScene" } }
  }]);
  // On the host's square, at once (the rules that count who is engaged read where the token is drawn); the moves of a
  // latched monster keep it (`eterniaLatch`)
  await own.update({ x: at._source.x, y: at._source.y, elevation: at._source.elevation }, { eterniaForced: true, eterniaLatch: true, animate: false });
  const data = { tokenUuid: own.uuid, hostUuid: at.uuid, img: own.texture?.src || monster.img, name: own.name, drain, state: "open",
    event: L("Latch.Latched", { name: own.name, host: at.name, n: drain }) };
  const message = await ChatMessage.create({ speaker: { alias: own.name }, content: await renderCard(data), flags: { [SYSTEM_ID]: { latchCard: data } } });
  await effect.update({ [`flags.${SYSTEM_ID}.latch.messageId`]: message.id });
  return { ok: true };
}

/** The latches letting go on this window. */
const letting = new Set();

/**
 * A monster lets go: the host's effect ends and the card says why; ripped off, it lands next to the host.
 * @param {ActiveEffect} effect   The latch on the host
 * @param {string} event          The line of the card
 * @param {{toss?: boolean}} [options]
 */
async function letGo(effect, event, { toss = false } = {}) {
  const data = effect.getFlag(SYSTEM_ID, "latch") ?? {};
  const host = effect.parent;
  // A fall is seen twice (the monster's and the drain's): only the first lets go
  if (!host?.effects.has(effect.id) || letting.has(effect.id)) return;
  letting.add(effect.id);
  await effect.delete().catch(() => null);
  letting.delete(effect.id);
  // The weight it laid on the host goes with it
  const weights = host.effects.filter(e => e.getFlag(SYSTEM_ID, "latchStep") === data.tokenUuid).map(e => e.id);
  if (weights.length) await host.deleteEmbeddedDocuments("ActiveEffect", weights).catch(() => null);
  const token = fromUuidSync(data.tokenUuid ?? "");
  const at = token ? tokenOn(host, token.parent) : null;
  const spot = (toss && token && at) ? freeNextTo(at, token) : null;
  if (spot) await token.update(spot, { eterniaForced: true });
  await closeCard(data.messageId, event);
}

/* -------------------------------------------- */
/*  Ripping it off                              */
/* -------------------------------------------- */

/** The character this user acts with: a controlled token of theirs, else their assigned character's token. */
function userToken() {
  const controlled = (canvas?.tokens?.controlled ?? []).find(t => t.actor?.isOwner && (t.actor.type === "character"));
  if (controlled) return controlled.document;
  return game.user.character?.getActiveTokens?.(false, true).find(t => t.parent === canvas?.scene) ?? null;
}

/**
 * Rip a latched monster off its host: the host, or whoever touches it, spends a Minor Action (in a combat, in its own
 * Main Process), then the GM ends the latch.
 * @param {TokenDocument} token   The monster's token
 * @param {TokenDocument} [by]    Who rips it off (the user's character)
 */
export async function ripOff(token, by = userToken()) {
  const held = token ? latchOf(token) : null;
  if (!held) return ui.notifications.warn(L("Latch.NotLatched"));
  const actor = by?.actor;
  if (!actor) return ui.notifications.warn(L("Latch.NoOne"));
  if ((by.parent !== held.host.parent) || ((by !== held.host) && !touching(by, held.host))) {
    return ui.notifications.warn(L("Latch.TooFar", { name: actorName(actor), host: held.host.name }));
  }
  // In a combat: in its own Main Process, with the Minor Action left
  const combat = combatOf(actor);
  const combatant = combat ? combatantOf(combat, actor) : null;
  const left = actionsLeft(actor);
  if (combatant && left) {
    if ((combat.phase !== "main") || (combat.progress?.active !== combatant.id)) return ui.notifications.warn(L("Latch.NotYourProcess", { name: actorName(actor) }));
    if (!left.minor) return ui.notifications.warn(L("Latch.NoMinor", { name: actorName(actor) }));
    await spendAction(actor, "minor");
  }
  const result = await request("bestiaryLatch", { action: "off", tokenUuid: token.uuid, byUuid: by.uuid });
  if (!result?.ok && result?.error) ui.notifications.warn(game.i18n.localize(result.error));
  return result;
}

/** The GM rips the monster off: the latch ends, and the monster lands next to the host. */
async function onRipOff({ tokenUuid, byUuid }) {
  const token = fromUuidSync(tokenUuid ?? "");
  const by = fromUuidSync(byUuid ?? "");
  const held = token ? latchOf(token) : null;
  if (!held) return { ok: true };
  await letGo(held.effect, L("Latch.RippedOff", { name: by?.name ?? "?", monster: token.name, host: held.host.name }), { toss: true });
  return { ok: true };
}

/* -------------------------------------------- */
/*  The drain, the moves, the falls             */
/* -------------------------------------------- */

/** The Setup Process of a combat: each latched monster drains its host, and recovers what the host lost. */
async function setupDrain(combat) {
  const lines = [];
  const gmLines = [];
  for (const actor of combatActors(combat)) {
    for (const effect of latchesOn(actor)) {
      const data = effect.getFlag(SYSTEM_ID, "latch");
      const token = fromUuidSync(data.tokenUuid ?? "");
      const monster = token?.actor;
      if (down(monster) || down(actor)) {
        await letGo(effect, L(down(actor) ? "Latch.HostFell" : "Latch.Fell", { name: token?.name ?? effect.name, host: actorName(actor) }));
        continue;
      }
      const hurt = await takeDamage(actor, toInt(data.drain), { what: L("Latch.Drains", { name: token.name }), from: monster, silent: true });
      const loss = toInt(hurt?.loss);
      const healed = (loss > 0) ? await takeHealing(monster, loss, { what: L("Latch.Blood"), natural: true, silent: true }) : null;
      const own = actor.hasPlayerOwner ? lines : gmLines;
      if (hurt) own.push(hurt.line);
      if (healed?.line) gmLines.push(healed.line);
      // The weight: the next of its steps the host doesn't have yet
      const next = (data.steps ?? []).find(id => !actor.statuses.has(id));
      if (next) {
        const { effects, names } = statusList([{ statusId: next }], monster, { infinite: true });
        for (const e of effects) e.flags[SYSTEM_ID].latchStep = data.tokenUuid;
        if (await giveEffects(actor, effects)) own.push(L("Latch.Weighs", { name: token.name, host: actorName(actor), status: names.join(", ") }));
      }
    }
  }
  if (lines.length || gmLines.length) await postSummary(L("Latch.DrainTitle"), lines, gmLines);
}

/**
 * A token moved (the primary GM): the monsters latched to it go along; a latched monster that moved by itself, or was
 * moved, lets go.
 */
async function onMoveToken(token, changes, options) {
  if (!("x" in changes) && !("y" in changes)) return;
  const held = options.eterniaLatch ? null : latchOf(token);
  if (held) {
    await letGo(held.effect, L("Latch.Flew", { name: token.name, host: held.host.name }));
    return;
  }
  for (const effect of latchesOn(token.actor)) {
    const monster = fromUuidSync(effect.getFlag(SYSTEM_ID, "latch").tokenUuid ?? "");
    if (!monster || (monster.parent !== token.parent) || (monster === token)) continue;
    if ((monster._source.x === token._source.x) && (monster._source.y === token._source.y)) continue;
    // The way the host moved: animated with it, or at once
    await monster.update({ x: token._source.x, y: token._source.y, elevation: token._source.elevation },
      { eterniaForced: true, eterniaLatch: true, animate: options.animate !== false });
  }
}

/** Someone fell (the primary GM): a latched monster that fell lets go, and so do the monsters stuck to one that fell. */
async function onFall(actor) {
  for (const effect of latchesOn(actor)) {
    const name = fromUuidSync(effect.getFlag(SYSTEM_ID, "latch").tokenUuid ?? "")?.name ?? effect.name;
    await letGo(effect, L("Latch.HostFell", { name, host: actorName(actor) }));
  }
  for (const token of actor.token ? [actor.token] : actor.getActiveTokens(false, true)) {
    const held = latchOf(token);
    if (held) await letGo(held.effect, L("Latch.Fell", { name: token.name, host: held.host.name }));
  }
}

/* -------------------------------------------- */
/*  Registration                                */
/* -------------------------------------------- */

/** The card's button: Rip off (anyone, with their character). */
function onRenderMessage(message, html) {
  const data = message.getFlag(SYSTEM_ID, "latchCard");
  const button = data ? html.querySelector('[data-action="latch-off"]') : null;
  if (!button) return;
  const token = fromUuidSync(data.tokenUuid ?? "");
  if ((data.state !== "open") || !token || !latchOf(token)) return button.remove();
  button.addEventListener("click", event => {
    event.preventDefault();
    ripOff(fromUuidSync(data.tokenUuid)).catch(err => console.error(`${SYSTEM_ID} | Rip off failed`, err));
  });
}

/** Call during the `init` hook. */
export function registerLatch() {
  registerHandler("bestiaryLatch", payload => ((payload?.action === "off") ? onRipOff(payload) : latch(payload)));
  Hooks.on("renderChatMessageHTML", onRenderMessage);
  Hooks.on("eternia.damaged", onDamaged);
  Hooks.on("updateToken", (token, changes, options) => {
    if (!isPrimaryGM() || !rulesOn()) return;
    onMoveToken(token, changes, options).catch(err => console.error(`${SYSTEM_ID} | Latch move failed`, err));
  });
  Hooks.on("createActiveEffect", effect => {
    const actor = effect.parent;
    if (!(actor instanceof Actor) || !(effect.statuses?.has("incapacitated") || effect.statuses?.has("dead")) || !isPrimaryGM()) return;
    onFall(actor).catch(err => console.error(`${SYSTEM_ID} | Latch fall failed`, err));
  });
  // The Setup Process: the drain (on the GM window that changed the phase)
  wrap(CONFIG.Combat.documentClass.prototype, "_onPhaseStart", async function (original, phase, round, previous) {
    await original.call(this, phase, round, previous);
    const backwards = !!previous && (round < previous.round);
    if ((phase !== "setup") || backwards || !rulesOn()) return;
    await setupDrain(this).catch(err => console.error(`${SYSTEM_ID} | Latch drain failed`, err));
  });
  foundry.applications.handlebars.loadTemplates([TEMPLATE]);
}
