/**
 * Browser windows ("clients") of the same user.
 *
 * A user can be logged in from several windows at once (e.g. a GM with a second screen). Foundry's
 * `userId` and `game.users.activeGM.isSelf` can't tell those windows apart, so work meant to run once
 * would run in each of them. This module gives every window an id and:
 * - `isLocalChange(options, userId)`: whether a document change was made from THIS window (every
 *   create / update / delete made here carries `options.lhOrigin`).
 * - `isPrimaryGM()`: whether this window is the one that does the active GM's work (socket requests,
 *   expiries, migrations): among the active GM's open windows, the one with the lowest id.
 */

// The Node tools import this file through other modules (tools/migrate-effects.mjs): there is no `foundry` there
export const CLIENT_ID = globalThis.foundry?.utils?.randomID() ?? Math.random().toString(36).slice(2, 18).padEnd(16, "0");

const SOCKET = "system.eternia";
const SCOPE = "clients";
const HEARTBEAT = 5000;
const TIMEOUT = 12000;
/** Time to hear from the other windows of the user after this one connects. */
const DISCOVERY = 600;

/** Other windows of this user: clientId -> last time heard from. */
const peers = new Map();
let discovered = null;

/** Documents whose changes carry the id of the window that made them. */
const ORIGIN_DOCUMENTS = ["Actor", "Item", "ActiveEffect", "Combat", "Combatant", "Token", "ChatMessage", "Scene"];

/** Call during the `init` hook. */
export function registerClients() {
  const stamp = options => { if (options && !options.lhOrigin) options.lhOrigin = CLIENT_ID; };
  for (const name of ORIGIN_DOCUMENTS) {
    Hooks.on(`preCreate${name}`, (doc, data, options) => stamp(options));
    Hooks.on(`preUpdate${name}`, (doc, changes, options) => stamp(options));
    Hooks.on(`preDelete${name}`, (doc, options) => stamp(options));
  }

  Hooks.once("ready", startDiscovery);
}

/**
 * Start talking to the other windows of the user (once). The `ready` hook of eternia.mjs, which runs the migrations,
 * comes before the one above: clientsDiscovered() starts it there.
 */
function startDiscovery() {
  if (discovered) return discovered;
  game.socket.on(SOCKET, _onMessage);
  _emit("hello");
  setInterval(() => {
    _emit("here");
    const now = Date.now();
    for (const [id, seen] of peers) if (now - seen > TIMEOUT) peers.delete(id);
  }, HEARTBEAT);
  // A window that closes without saying so is dropped after TIMEOUT.
  window.addEventListener("pagehide", () => _emit("bye"));
  discovered = new Promise(resolve => setTimeout(resolve, DISCOVERY));
  return discovered;
}

/**
 * Only the windows of this user listen (_onMessage), so the server sends it only to them (this one too, which knows
 * itself by the id); the heartbeat stays on without a peer, so that two windows that lost each other meet again.
 */
function _emit(type) {
  const message = { scope: SCOPE, type, clientId: CLIENT_ID, userId: game.user.id };
  game.socket.emit(SOCKET, message, { recipients: [game.user.id] });
}

function _onMessage(message) {
  if ((message?.scope !== SCOPE) || (message.userId !== game.user.id) || (message.clientId === CLIENT_ID)) return;
  if (message.type === "bye") return peers.delete(message.clientId);
  const known = peers.has(message.clientId);
  peers.set(message.clientId, Date.now());
  // A new window: tell it this one exists.
  if ((message.type === "hello") && !known) _emit("here");
}

/**
 * Whether a document change was made from this window. Changes that don't carry the window id
 * (made before this module stamps them) fall back to the user.
 * @param {object} options   Options of the create / update / delete
 * @param {string} userId
 * @returns {boolean}
 */
export function isLocalChange(options, userId) {
  if (options?.lhOrigin) return options.lhOrigin === CLIENT_ID;
  return userId === game.user.id;
}

/** Whether this is the lowest-id open window of this user. */
export function isPrimaryClient() {
  const now = Date.now();
  for (const [id, seen] of peers) {
    if ((now - seen <= TIMEOUT) && (id < CLIENT_ID)) return false;
  }
  return true;
}

/** Whether this window does the active GM's work. */
export function isPrimaryGM() {
  return !!game.users?.activeGM?.isSelf && isPrimaryClient();
}

/** Resolves once this window had time to hear from the other windows of the user (from `ready` on). */
export function clientsDiscovered() {
  return game.socket ? startDiscovery() : Promise.resolve();
}
