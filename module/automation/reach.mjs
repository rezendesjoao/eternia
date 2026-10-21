/**
 * House rule: a Close (melee) attack also reaches the tokens right next to the attacker, sideways or
 * diagonally, so the two tokens don't have to share a square to fight. Every other range is the system's.
 *
 * The system checks the range when it declares an attack (createAttackCard in combat-cards.mjs, private
 * helpers): Manhattan distance between the squares of the two token centers, Close = 0, and an attack on
 * a farther target is refused. It does that synchronously, before its first await. So, only when the
 * attack is Close and a target touches the attacker's token, and only for the length of that synchronous
 * call, the grid reports that target's center as being in the attacker's square. Nothing else can run in
 * between; the attack card then shows the target as "Close".
 *
 * Entry points: the Check of the attack cards (cards.mjs rollCheck: skill cards and Fate rerolls), and, when they
 * need it, the system's own Check buttons (skill cards with the attack cards setting off, the Check label of
 * item sheets).
 */
import { SYSTEM_ID, setting } from "../settings.mjs";
import { isMonsterSkill, rollSkill } from "../helpers/skill-rolls.mjs";
import { parseRange } from "../helpers/hands.mjs";
import { skillModifiers } from "../helpers/roll-bonuses.mjs";

/** The actor a skill's Check is rolled for (as the system's skill-rolls.mjs). */
function attackerOf(item) {
  if (item.actor) return item.actor;
  if (isMonsterSkill(item)) return null;
  const actor = canvas?.tokens?.controlled[0]?.actor ?? game.user.character ?? null;
  return (actor?.type === "character") ? actor : null;
}

/** The token an actor attacks from (as the system's combat-cards.mjs): a controlled one, else its first. */
function attackerToken(actor) {
  return canvas.tokens.controlled.find(t => t.actor === actor) ?? actor.getActiveTokens(true)[0] ?? null;
}

/** First and last grid row / column a token covers. */
function cells(token) {
  const { left, top, right, bottom } = token.bounds;
  const a = canvas.grid.getOffset({ x: left + 1, y: top + 1 });
  const b = canvas.grid.getOffset({ x: right - 1, y: bottom - 1 });
  return { i0: a.i, i1: b.i, j0: a.j, j1: b.j };
}

/** The two tokens touch, side or corner (or overlap). */
function touching(a, b) {
  const p = cells(a);
  const q = cells(b);
  const gap = (lo1, hi1, lo2, hi2) => Math.max(0, lo1 - hi2, lo2 - hi1);
  return Math.max(gap(p.i0, p.i1, q.i0, q.i1), gap(p.j0, p.j1, q.j0, q.j1)) <= 1;
}

/**
 * When this skill's Check is a Close attack, the attacker's token and the centers of the user's targets
 * that touch it but are not in its square; else null.
 * @param {Item} item
 */
function closeReach(item) {
  if (!setting("closeReach") || !canvas?.ready || (canvas.grid.type !== CONST.GRID_TYPES.SQUARE)) return null;
  if (!item?.system?.check || !["evasion", "resistance", "auto"].includes(item.system.check.vs)) return null;
  if (!game.user.targets.size) return null;
  const actor = attackerOf(item);
  if (!actor) return null;
  const mod = skillModifiers(actor, item).range;
  const range = mod ? mod.value : parseRange(item.system.range, actor);
  if (range !== 0) return null;
  const origin = attackerToken(actor);
  if (!origin) return null;
  const home = canvas.grid.getOffset(origin.center);
  const near = new Set();
  for (const target of game.user.targets) {
    const at = canvas.grid.getOffset(target.center);
    if ((at.i === home.i) && (at.j === home.j)) continue;
    if (touching(origin, target)) near.add(`${target.center.x},${target.center.y}`);
  }
  return near.size ? { home, near } : null;
}

/**
 * Run a Check roll (a call into the system's rollSkill) with the Close reach rule.
 * @param {Item} item
 * @param {() => Promise<any>} roll   Must call the system's rollSkill right away (no await before it)
 * @returns {Promise<any>}
 */
export function withCloseReach(item, roll) {
  const reach = closeReach(item);
  if (!reach) return roll();
  const grid = canvas.grid;
  const own = Object.getOwnPropertyDescriptor(grid, "getOffset");
  const getOffset = grid.getOffset;
  grid.getOffset = function(coords) {
    if (coords && reach.near.has(`${coords.x},${coords.y}`)) return { ...reach.home };
    return getOffset.call(this, coords);
  };
  try {
    // The range check happens inside this call, before the system's first await.
    return roll();
  }
  finally {
    if (own) Object.defineProperty(grid, "getOffset", own);
    else delete grid.getOffset;
  }
}

/* -------------------------------------------- */
/*  The system's own Check buttons              */
/* -------------------------------------------- */

const stop = event => {
  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();
};

const failed = err => console.error(`${SYSTEM_ID} | Check roll failed`, err);

/** The Check button of a skill card, when the attack card fixes are off (else cards.mjs rolls it). */
function onChatClick(event) {
  const button = event.target.closest?.('.skill-card-roll[data-roll="check"]');
  if (!button || setting("cards")) return;
  const uuid = button.closest("[data-item-uuid]")?.dataset.itemUuid;
  const item = uuid ? fromUuidSync(uuid) : null;
  if (!(item instanceof Item) || !closeReach(item)) return; // the system's own button
  stop(event);
  withCloseReach(item, () => rollSkill(item, "check")).catch(failed);
}

/** The Check label of an item sheet. */
function onSheetClick(event, app) {
  const label = event.target.closest?.('[data-action="rollSkill"][data-roll="check"]');
  const item = app.document;
  if (!label || !(item instanceof Item) || !closeReach(item)) return;
  stop(event);
  withCloseReach(item, () => rollSkill(item, "check")).catch(failed);
}

/** Call during the `init` hook. */
export function registerReach() {
  Hooks.on("renderChatMessageHTML", (message, html) => {
    html.addEventListener("click", onChatClick, { capture: true });
  });
  Hooks.on("renderItemSheetV2", (app, element) => {
    if (element.dataset.eterniaReach) return;
    element.dataset.eterniaReach = "1";
    element.addEventListener("click", event => onSheetClick(event, app), { capture: true });
  });
}
