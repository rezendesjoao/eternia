/**
 * Acting out of turn (the Lampejo's Divine Flash): a window of actions outside the Main Process.
 *
 * A skill with `flags.eternia.window = { move, minor, major, offTurn }` opens a window for its user when it is used in a
 * started combat: that many Move / Minor / Major Actions, spent apart from those of the Main Process
 * (automation/use.mjs: a skill with that action needs no Main Process of its own while the window has it). With
 * `offTurn`, the skill itself is used only at the end of another creature's Main Process (the last one to have acted
 * this round is someone else), and the window lasts until the next Main Process ends; when that one is the user's own,
 * it spends its own actions first. A window opened in the user's own Main Process (the supreme Brilho Dourado) lasts
 * until that one ends, the same way.
 *
 * State: flags.eternia.window = { key, move, minor, major, from }, the key "<combat>.<round>.<how many acted>".
 */
import { L, SYSTEM_ID } from "../settings.mjs";
import { actorName, postSummary, toInt } from "../helpers/utils.mjs";

const ACTIONS = ["major", "minor", "move"];

/** The moment of a combat a window belongs to: its round and how many Main Processes ended in it. */
const keyOf = combat => `${combat.id}.${combat.round}.${combat.progress?.acted?.length ?? 0}`;

/**
 * The window an actor has open now in a combat, or null.
 * @param {Actor} actor
 * @param {Combat|null} combat
 * @returns {{key: string, major: number, minor: number, move: number, from: string}|null}
 */
export function openWindowOf(actor, combat) {
  const window = actor?.getFlag?.(SYSTEM_ID, "window");
  return (combat?.started && window && (window.key === keyOf(combat))) ? window : null;
}

/** Whether an actor's open window still has this action. */
export function windowCovers(actor, combat, action) {
  return ACTIONS.includes(action) && (toInt(openWindowOf(actor, combat)?.[action]) > 0);
}

/**
 * The issues of a skill used only out of turn (`window.offTurn`): at the end of another creature's Main Process (the
 * last one to have acted this round is someone else). Null for any other skill (its Timing decides).
 * @param {Item} item
 * @param {Actor} actor
 * @param {Combat} combat
 * @param {Combatant} combatant
 * @returns {string[]|null}
 */
export function offTurnIssues(item, actor, combat, combatant) {
  if (!item?.getFlag?.(SYSTEM_ID, "window")?.offTurn) return null;
  const acted = combat.progress?.acted ?? [];
  const after = ["main", "cleanup"].includes(combat.phase) && (acted.length > 0) && (acted.at(-1) !== combatant.id);
  return after ? [] : [L("Window.OffTurnOnly")];
}

/**
 * A skill that opens a window was used: its user gets the actions now. Returns the window's key (for the Undo), or null.
 * @param {Actor} actor
 * @param {Combat} combat
 * @param {Item} item
 * @returns {Promise<string|null>}
 */
export async function openWindow(actor, combat, item) {
  const spec = item?.getFlag?.(SYSTEM_ID, "window");
  if (!spec || !combat?.started) return null;
  const window = { key: keyOf(combat), from: item.name };
  for (const action of ACTIONS) window[action] = Math.max(0, toInt(spec[action]));
  await actor.setFlag(SYSTEM_ID, "window", window);
  const actions = ACTIONS.filter(a => window[a]).map(a => L(`Window.Action.${a}`, { n: window[a] })).join(", ");
  await postSummary(item.name, [L("Window.Opened", { name: actorName(actor), actions })]);
  return window.key;
}

/** An action of the open window is spent. Returns the window's key. */
export async function spendWindow(actor, combat, action) {
  const window = openWindowOf(actor, combat);
  if (!window) return null;
  await actor.setFlag(SYSTEM_ID, "window", { ...window, [action]: Math.max(0, toInt(window[action]) - 1) });
  return window.key;
}

/** Undo: the action goes back to the window it came from, if that one is still open. */
export async function refundWindow(actor, action, key) {
  const window = actor?.getFlag?.(SYSTEM_ID, "window");
  if (!window || (window.key !== key) || !ACTIONS.includes(action)) return;
  await actor.setFlag(SYSTEM_ID, "window", { ...window, [action]: toInt(window[action]) + 1 });
}

/** Undo of the skill that opened it: the window closes. */
export async function closeWindow(actor, key) {
  if (actor?.getFlag?.(SYSTEM_ID, "window")?.key === key) await actor.unsetFlag(SYSTEM_ID, "window");
}
