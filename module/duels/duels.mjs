/**
 * Duels, the way of the floating castle's players: one character challenges another on the scene and picks the mode,
 * the other one's player (or the GM, for a character with no player) accepts or declines within a minute, everyone sees
 * the countdown, the duel's combat starts by itself, and the system says who won. Everything goes through the primary GM
 * (piles/pile-socket.mjs request), who keeps the challenges waiting, makes the duel's combat (state.mjs: a Combat with
 * `flags.eternia.duel`) and watches the two duelists:
 *
 * - "strike": whoever loses HP first loses; "half": whoever is left with half its Max HP or less; "death": whoever falls
 *   ([Dying], automation/death.mjs). In the first two nobody falls: the HP stops at 1 and [Incapacitated] and [Dead] don't
 *   take (the hooks below, on every window, since the window that applies the damage changes the actor).
 * - Giving up ("Desistir") loses at once; the GM may call a duel off (no result) or give it to either side.
 * - The end: the result in the duel's flag, the history and the ranking (ranking.mjs), the winner's banner on every
 *   screen (ui.mjs) and a card in the chat. A duel where nobody falls ends its combat a moment later; a duel to the death
 *   that ended in a fall goes on as a combat (the Death Checks, a blow on the ground) until the GM ends it.
 *
 * The primary GM talks to the windows on the socket (scope "duels"): "ask" (the request, to whoever answers for the
 * challenged), "closed" (a request that ended: declined, expired, called off, accepted or no longer possible),
 * "countdown" (a duel accepted) and "end" (its result). The UI registers what each one does (onDuelMessage).
 */
import { L, SYSTEM_ID, setting } from "../settings.mjs";
import { CLIENT_ID, isPrimaryGM } from "../helpers/clients.mjs";
import { toInt } from "../helpers/utils.mjs";
import { registerHandler, request } from "../piles/pile-socket.mjs";
import { isDying } from "../automation/death.mjs";
import { DUEL_MODES, duelOf, duelOfActor, isLive, liveDuels, otherSide, spares } from "./state.mjs";
import { recordDuel, tierOf } from "./ranking.mjs";

const SOCKET = "system.eternia";
const SCOPE = "duels";
/** How long a challenge waits for its answer. */
export const ASK_MS = 60000;
/** How long the winner's banner stays before a duel where nobody fell ends its combat. */
const END_DELAY = 4500;
const CARD = "systems/eternia/templates/duels/card.hbs";

/** Half the Max HP: at or below it, a duel of "half" is lost. */
export const halfOf = actor => Math.floor(toInt(actor?.system?.health?.max) / 2);

/** Whether an actor is down: fallen, [Dying] or dead. */
const isDown = actor => !!actor && (actor.statuses.has("dead") || actor.statuses.has("incapacitated") || isDying(actor)
  || (toInt(actor.system.health?.value) <= 0));

/* -------------------------------------------- */
/*  The socket                                  */
/* -------------------------------------------- */

const listeners = new Map();

/** What a window does with a message of the duels (the UI registers them). */
export function onDuelMessage(type, fn) {
  listeners.set(type, fn);
}

function deliver(message) {
  if (Array.isArray(message.to) && !message.to.includes(game.user.id)) return;
  try {
    listeners.get(message.type)?.(message);
  }
  catch (err) {
    console.error(`${SYSTEM_ID} | Duel message "${message.type}" failed`, err);
  }
}

/**
 * Send a message to every window (this one too); `to` limits it to some users, and the server sends it only to their
 * windows (this one's user among them gets it back too: the window that sent it, known by its id, already has it).
 */
function broadcast(type, data = {}) {
  const message = { scope: SCOPE, type, ...data, clientId: CLIENT_ID };
  game.socket.emit(SOCKET, message, Array.isArray(message.to) ? { recipients: message.to } : {});
  deliver(message);
}

/* -------------------------------------------- */
/*  Who duels                                   */
/* -------------------------------------------- */

/** The challenges waiting for an answer (on the primary GM). */
const pending = new Map();

/** The challenge an actor is in, waiting. */
const pendingOf = actor => [...pending.values()].find(p => [p.a.actorUuid, p.b.actorUuid].includes(actor?.uuid)) ?? null;

/** A side of a duel: who it is, from its token. */
function sideOf(token, user = null) {
  const actor = token.actor;
  return {
    actorUuid: actor.uuid,
    tokenUuid: token.uuid,
    name: token.name || actor.name,
    img: (!actor.img || /mystery-man/.test(actor.img)) ? (token.texture?.src || actor.img || "") : actor.img,
    userId: user?.id ?? null
  };
}

/**
 * Why two tokens can't duel now in this mode (null: they can).
 * @returns {{key: string, data?: object}|null}   key: under ETERNIA.Duel.Error
 */
export function duelProblem(tokenA, tokenB, mode, { except = null } = {}) {
  if (!setting("duels")) return { key: "Off" };
  if (!tokenA?.actor || !tokenB?.actor) return { key: "Missing" };
  if (!DUEL_MODES.includes(mode)) return { key: "Mode" };
  if ((mode === "death") && !setting("duelDeath")) return { key: "NoDeath" };
  if (tokenA.parent !== tokenB.parent) return { key: "Scene" };
  if (tokenA.actor.uuid === tokenB.actor.uuid) return { key: "Self" };
  for (const token of [tokenA, tokenB]) {
    const actor = token.actor;
    const name = token.name || actor.name;
    if (actor.type !== "character") return { key: "NotCharacter", data: { name } };
    const waiting = pendingOf(actor);
    if (duelOfActor(actor, { live: true }) || (waiting && (waiting.id !== except))) return { key: "Busy", data: { name } };
    if (isDown(actor)) return { key: "Down", data: { name } };
    if ((mode === "half") && (toInt(actor.system.health?.value) <= halfOf(actor))) return { key: "Half", data: { name } };
  }
  const sceneId = tokenA.parent?.id;
  if (liveDuels().some(c => duelOf(c).sceneId === sceneId)) return { key: "SceneDuel" };
  if (game.combats.some(c => c.started && (c.scene?.id === sceneId) && !duelOf(c))) return { key: "SceneCombat" };
  return null;
}

/** The users who answer for the challenged: its active players; with no player, the active GMs; null when its players are away. */
function respondersOf(actor) {
  const players = game.users.filter(u => !u.isGM && actor.testUserPermission(u, "OWNER"));
  if (players.length) {
    const here = players.filter(u => u.active);
    return here.length ? here : null;
  }
  return game.users.filter(u => u.isGM && u.active);
}

const fail = (key, data = undefined) => ({ ok: false, error: `ETERNIA.Duel.Error.${key}`, errorData: data });

/** What the windows show of a challenge. */
const challengeView = entry => ({ id: entry.id, mode: entry.mode, a: entry.a, b: entry.b, expires: entry.expires, from: entry.from });

/* -------------------------------------------- */
/*  The challenge (on the primary GM)           */
/* -------------------------------------------- */

/** A challenge: checked, then sent to whoever answers for the challenged (or straight to the duel). */
async function onChallenge({ a, b, mode } = {}, user) {
  const tokenA = a ? await fromUuid(a) : null;
  const tokenB = b ? await fromUuid(b) : null;
  if (!tokenA?.actor || !(user.isGM || tokenA.actor.testUserPermission(user, "OWNER"))) return fail("NotYours");
  const problem = duelProblem(tokenA, tokenB, mode);
  if (problem) return fail(problem.key, problem.data);
  const responders = respondersOf(tokenB.actor);
  if (!responders?.length) return fail("Away", { name: tokenB.name || tokenB.actor.name });
  const entry = {
    id: foundry.utils.randomID(),
    mode,
    sceneId: tokenA.parent.id,
    a: sideOf(tokenA, user),
    b: sideOf(tokenB),
    from: user.id,
    to: responders.map(u => u.id),
    expires: Date.now() + ASK_MS
  };
  // Who challenges answers for both (the GM with two of its characters, a player with two): straight to the duel
  if (entry.to.includes(user.id)) return startDuel(entry);
  pending.set(entry.id, entry);
  entry.timer = setTimeout(() => expire(entry.id), ASK_MS);
  broadcast("ask", { to: entry.to, challenge: challengeView(entry) });
  return { ok: true, waiting: true, challenge: challengeView(entry), names: responders.map(u => u.name) };
}

/** The answer of the challenged's player (or the GM). */
async function onAnswer({ id, accept } = {}, user) {
  const entry = pending.get(id);
  if (!entry) return fail("Gone");
  if (!entry.to.includes(user.id) && !user.isGM) return fail("NotYours");
  clearTimeout(entry.timer);
  pending.delete(id);
  if (!accept) {
    broadcast("closed", { to: [entry.from, ...entry.to], id, why: "declined", by: entry.b.name });
    return { ok: true };
  }
  return startDuel(entry);
}

/** The challenger takes the challenge back. */
async function onCancel({ id } = {}, user) {
  const entry = pending.get(id);
  if (!entry) return fail("Gone");
  if ((entry.from !== user.id) && !user.isGM) return fail("NotYours");
  clearTimeout(entry.timer);
  pending.delete(id);
  broadcast("closed", { to: [entry.from, ...entry.to], id, why: "cancelled", by: entry.a.name });
  return { ok: true };
}

/** Nobody answered in time. */
function expire(id) {
  const entry = pending.get(id);
  if (!entry) return;
  pending.delete(id);
  broadcast("closed", { to: [entry.from, ...entry.to], id, why: "expired", by: entry.b.name });
}

/* -------------------------------------------- */
/*  The duel (on the primary GM)                */
/* -------------------------------------------- */

/** The countdowns running, by combat. */
const starting = new Map();
/** The last HP each duelist was seen with (a duel of "strike" is lost by losing HP). */
const seen = new Map();
/** The duels being ended (a burst of updates ends one only once). */
const ending = new Set();

/** An accepted challenge: the duel's combat with the two, and the countdown for everyone. */
async function startDuel(entry) {
  const tokenA = await fromUuid(entry.a.tokenUuid);
  const tokenB = await fromUuid(entry.b.tokenUuid);
  const to = [entry.from, ...entry.to];
  const problem = duelProblem(tokenA, tokenB, entry.mode, { except: entry.id });
  if (problem) {
    broadcast("closed", { to, id: entry.id, why: "invalid", error: `ETERNIA.Duel.Error.${problem.key}`, errorData: problem.data });
    return fail(problem.key, problem.data);
  }
  const countdown = Math.clamp(toInt(setting("duelCountdown")), 0, 60) * 1000;
  const now = Date.now();
  const duel = { id: entry.id, mode: entry.mode, state: "countdown", sceneId: entry.sceneId, createdAt: now, startsAt: now + countdown, a: entry.a, b: entry.b };
  const combat = await CONFIG.Combat.documentClass.create({ scene: entry.sceneId, active: true, flags: { [SYSTEM_ID]: { duel } } });
  await combat.createEmbeddedDocuments("Combatant", [tokenA, tokenB].map(t => ({ tokenId: t.id, sceneId: t.parent.id, actorId: t.actorId, hidden: t.hidden })));
  broadcast("closed", { to, id: entry.id, why: "accepted", by: entry.b.name });
  broadcast("countdown", { combatId: combat.id, duel });
  schedule(combat.id, countdown);
  return { ok: true, started: true, combatId: combat.id };
}

/** The duel starts when its countdown ends. */
function schedule(combatId, ms) {
  clearTimeout(starting.get(combatId));
  starting.set(combatId, setTimeout(() => begin(combatId).catch(err => console.error(`${SYSTEM_ID} | Could not start the duel`, err)), Math.max(0, ms)));
}

/** The countdown is over: the combat starts, and the two are watched. */
async function begin(combatId) {
  starting.delete(combatId);
  const combat = game.combats.get(combatId);
  const duel = duelOf(combat);
  if (!duel || (duel.state !== "countdown")) return;
  for (const side of ["a", "b"]) {
    const actor = fromUuidSync(duel[side].actorUuid);
    if (actor) seen.set(actor.uuid, toInt(actor.system.health?.value));
  }
  await combat.update({ [`flags.${SYSTEM_ID}.duel.state`]: "fighting", [`flags.${SYSTEM_ID}.duel.startedAt`]: Date.now() });
  await combat.startCombat();
  await postCard(combat, "start");
}

/** Whether a duelist lost, by the duel's mode (its HP now, and the HP it had before this change). */
function lostNow(mode, actor, hp, before) {
  if (isDown(actor)) return true;
  if (mode === "strike") return hp < before;
  if (mode === "half") return hp <= halfOf(actor);
  return false;
}

/** A duelist changed (its HP, its statuses): did the duel end? */
function watch(actor) {
  if (!isPrimaryGM() || !(actor instanceof Actor)) return;
  const found = duelOfActor(actor, { live: true });
  if (!found || (found.duel.state !== "fighting")) return;
  const hp = toInt(actor.system.health?.value);
  const before = seen.get(actor.uuid) ?? hp;
  seen.set(actor.uuid, hp);
  if (!lostNow(found.duel.mode, actor, hp, before)) return;
  const reason = { strike: "strike", half: "half", death: "fall" }[found.duel.mode];
  finish(found.combat, { winner: found.foe, reason }).catch(err => console.error(`${SYSTEM_ID} | Could not end the duel`, err));
}

/**
 * End a duel: its result, the ranking, the banner and the card.
 * @param {Combat} combat
 * @param {object} options
 * @param {"a"|"b"|null} options.winner   null: a draw (or nothing, when called off)
 * @param {string} options.reason         strike | half | fall | resign | gm | draw | cancel
 */
export async function finish(combat, { winner = null, reason = "gm" } = {}) {
  if (!combat || ending.has(combat.id)) return;
  ending.add(combat.id);
  try {
    const duel = duelOf(combat);
    if (!isLive(duel)) return;
    clearTimeout(starting.get(combat.id));
    starting.delete(combat.id);
    const now = Date.now();
    const result = { winner: ["a", "b"].includes(winner) ? winner : null, reason, rounds: Math.max(0, toInt(combat.round)), ms: duel.startedAt ? now - duel.startedAt : 0 };
    if (reason !== "cancel") {
      const change = await recordDuel({
        id: duel.id, at: now, mode: duel.mode, reason, rounds: result.rounds, ms: result.ms, sceneId: duel.sceneId, winner: result.winner,
        a: { key: duel.a.actorUuid, name: duel.a.name, img: duel.a.img },
        b: { key: duel.b.actorUuid, name: duel.b.name, img: duel.b.img }
      });
      result.deltas = { a: change.a, b: change.b };
      result.ratings = { a: change.ra, b: change.rb };
    }
    await combat.update({ [`flags.${SYSTEM_ID}.duel.state`]: "over", [`flags.${SYSTEM_ID}.duel.endedAt`]: now, [`flags.${SYSTEM_ID}.duel.result`]: result });
    for (const side of ["a", "b"]) seen.delete(duel[side].actorUuid);
    broadcast("end", { combatId: combat.id, duel: { ...duel, state: "over", result } });
    if (reason !== "cancel") await postCard(combat, "result");
    // A duel to the death that ended in a fall goes on (the Death Checks, a blow on the ground); the others end
    if ((duel.mode !== "death") || (reason !== "fall")) setTimeout(() => closeCombat(combat.id), (reason === "cancel") ? 300 : END_DELAY);
  }
  finally {
    ending.delete(combat.id);
  }
}

/** The duel's combat ends (as the tracker's "End" does, with no question). */
async function closeCombat(combatId) {
  const combat = game.combats.get(combatId);
  if (!combat) return;
  await combat._syncStandbyStatus?.({ clear: true });
  await combat._resetHate?.();
  await combat.delete();
}

/** A duelist gives up: the other side wins. */
async function onResign({ combatId, side = null } = {}, user) {
  const combat = game.combats.get(combatId);
  const duel = duelOf(combat);
  if (!isLive(duel)) return fail("Gone");
  // A player gives up its own side; one who owns both (the GM) says which
  const sides = ["a", "b"].filter(s => !!fromUuidSync(duel[s].actorUuid)?.testUserPermission(user, "OWNER"));
  const giver = side ? (sides.includes(side) ? side : null) : ((sides.length === 1) ? sides[0] : null);
  if (!giver) return fail("NotYours");
  await finish(combat, { winner: otherSide(giver), reason: "resign" });
  return { ok: true };
}

/** The GM ends a duel: called off (no result), a draw, or given to a side. */
async function onStop({ combatId, winner = "cancel" } = {}, user) {
  if (!user.isGM) return fail("GMOnly");
  const combat = game.combats.get(combatId);
  if (!isLive(duelOf(combat))) return fail("Gone");
  if (winner === "cancel") await finish(combat, { reason: "cancel" });
  else if (winner === "draw") await finish(combat, { winner: null, reason: "draw" });
  else await finish(combat, { winner, reason: "gm" });
  return { ok: true };
}

/* -------------------------------------------- */
/*  The chat                                    */
/* -------------------------------------------- */

/** The duel's time, as a person says it. */
export function duelTime(ms) {
  const s = Math.max(0, Math.round(toInt(ms) / 1000));
  if (s < 60) return L("Duel.Time.Seconds", { s });
  return L("Duel.Time.Minutes", { m: Math.floor(s / 60), s: String(s % 60).padStart(2, "0") });
}

/** What a side shows on a card or a banner. */
export function sideView(duel, side) {
  const entry = duel[side];
  const actor = fromUuidSync(entry.actorUuid);
  const delta = duel.result?.deltas?.[side];
  const rating = duel.result?.ratings?.[side];
  return {
    side,
    name: entry.name,
    img: (actor?.img && !/mystery-man/.test(actor.img)) ? actor.img : entry.img,
    won: duel.result?.winner === side,
    lost: !!duel.result?.winner && (duel.result.winner !== side),
    delta: Number.isFinite(delta) ? `${(delta >= 0) ? "+" : "−"}${Math.abs(delta)}` : "",
    up: delta > 0,
    rating: Number.isFinite(rating) ? rating : null,
    tier: Number.isFinite(rating) ? L(`Duel.Tier.${tierOf(rating)}`) : ""
  };
}

/** The line of a duel's ending. */
export function resultLine(duel) {
  const r = duel.result ?? {};
  const winner = r.winner ? duel[r.winner].name : "";
  const loser = r.winner ? duel[otherSide(r.winner)].name : "";
  return L(`Duel.Result.${r.reason ?? "gm"}`, { winner, loser });
}

/** The cards: the duel begins, and its result. */
async function postCard(combat, kind) {
  const duel = duelOf(combat);
  if (!duel) return;
  const result = duel.result ?? null;
  const content = await foundry.applications.handlebars.renderTemplate(CARD, {
    kind,
    start: kind === "start",
    mode: L(`Duel.Mode.${duel.mode}`),
    modeRule: L(`Duel.ModeRule.${duel.mode}`),
    death: duel.mode === "death",
    a: sideView(duel, "a"),
    b: sideView(duel, "b"),
    draw: !!result && !result.winner,
    winner: result?.winner ? sideView(duel, result.winner) : null,
    line: result ? resultLine(duel) : "",
    time: result ? duelTime(result.ms) : "",
    rounds: result?.rounds ?? 0,
    fell: (duel.mode === "death") && (result?.reason === "fall"),
    fallen: (result?.winner && (result.reason === "fall")) ? duel[otherSide(result.winner)].name : ""
  });
  await ChatMessage.create({
    speaker: { alias: L("Duel.Title") },
    content,
    flags: { [SYSTEM_ID]: { duelCard: { combatId: combat.id, kind } } }
  });
}

/* -------------------------------------------- */
/*  Asking (on any window)                      */
/* -------------------------------------------- */

/** Send a challenge (to the primary GM). */
export function sendChallenge(tokenA, tokenB, mode) {
  return request("duelChallenge", { a: tokenA?.uuid ?? tokenA, b: tokenB?.uuid ?? tokenB, mode });
}

/** Answer a challenge. */
export const answerChallenge = (id, accept) => request("duelAnswer", { id, accept: !!accept });
/** Take a challenge back. */
export const cancelChallenge = id => request("duelCancel", { id });
/** Give up a duel. */
export const resignDuel = (combatId, side = null) => request("duelResign", { combatId, side });
/** The GM ends a duel (winner: "a", "b", "draw" or "cancel"). */
export const stopDuel = (combatId, winner = "cancel") => request("duelStop", { combatId, winner });

/** The text of a request's error, as the pile socket sends it. */
export function errorText(result) {
  if (!result?.error) return "";
  return result.errorData ? game.i18n.format(result.error, result.errorData) : game.i18n.localize(result.error);
}

/* -------------------------------------------- */
/*  Registration                                */
/* -------------------------------------------- */

/** Call during the `init` hook. */
export function registerDuelRules() {
  registerHandler("duelChallenge", onChallenge);
  registerHandler("duelAnswer", onAnswer);
  registerHandler("duelCancel", onCancel);
  registerHandler("duelResign", onResign);
  registerHandler("duelStop", onStop);

  // Nobody falls in a duel of "strike" or "half": the HP stops at 1, and the fall and death don't take (on the window
  // that changes the actor)
  Hooks.on("preUpdateActor", (actor, changes) => {
    const hp = foundry.utils.getProperty(changes, "system.health.value");
    if ((hp === undefined) || (Number(hp) >= 1)) return;
    const found = duelOfActor(actor);
    if (found && spares(found.duel)) foundry.utils.setProperty(changes, "system.health.value", 1);
  });
  Hooks.on("preCreateActiveEffect", (effect, data) => {
    const actor = effect.parent;
    if (!(actor instanceof Actor)) return;
    const statuses = new Set([...(data.statuses ?? []), ...(effect.statuses ?? [])]);
    if (!statuses.has("incapacitated") && !statuses.has("dead")) return;
    const found = duelOfActor(actor);
    if (found && spares(found.duel)) return false;
  });

  // The primary GM watches the duelists
  Hooks.on("updateActor", actor => watch(actor));
  for (const hook of ["createActiveEffect", "deleteActiveEffect"]) {
    Hooks.on(hook, effect => {
      if (effect.parent instanceof Actor) watch(effect.parent);
    });
  }
  // A duelist's token gone, or one taken out of the duel's combat: the duel is called off
  Hooks.on("deleteToken", token => {
    if (!isPrimaryGM()) return;
    for (const combat of liveDuels()) {
      const duel = duelOf(combat);
      if ([duel.a.tokenUuid, duel.b.tokenUuid].includes(token.uuid)) finish(combat, { reason: "cancel" });
    }
  });
  Hooks.on("deleteCombatant", combatant => {
    const combat = combatant.parent;
    if (isPrimaryGM() && isLive(duelOf(combat)) && game.combats.has(combat.id)) finish(combat, { reason: "cancel" });
  });

  Hooks.once("ready", () => {
    game.socket.on(SOCKET, message => {
      if ((message?.scope === SCOPE) && (message.clientId !== CLIENT_ID)) deliver(message);
    });
    // A GM window that came back: the countdowns it was running, the HP of the duels going on, and the combats of
    // duels that ended where nobody falls (their closing was on the timer of a window that is gone)
    if (!isPrimaryGM()) return;
    for (const combat of game.combats.filter(c => (duelOf(c)?.state === "over") && ((duelOf(c).mode !== "death") || (duelOf(c).result?.reason !== "fall")))) {
      setTimeout(() => closeCombat(combat.id).catch(err => console.error(`${SYSTEM_ID} | Could not end the duel's combat`, err)), END_DELAY);
    }
    for (const combat of liveDuels()) {
      const duel = duelOf(combat);
      if (duel.state === "countdown") schedule(combat.id, (duel.startsAt ?? 0) - Date.now());
      for (const side of ["a", "b"]) {
        const actor = fromUuidSync(duel[side].actorUuid);
        if (actor) seen.set(actor.uuid, toInt(actor.system.health?.value));
      }
    }
  });
}

