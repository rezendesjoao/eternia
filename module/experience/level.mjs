/**
 * The XP of a character and the NP that follows it (docs/matematica.md, section 10). The total is `system.infos.xp`,
 * never read below the first XP of the NP the character has (a character of before 0.53, or one the GM put at an NP,
 * starts that NP at the table's number: xpOf). Whatever raises it (a monster, a Ticket, the GM) goes through addXp,
 * and reaching the XP of an NP takes the character there by itself (rank-up.mjs levelTo with `auto`: no box, the card
 * in the chat), one change at a time per character.
 *
 * On every window, the update of the XP (`{ eterniaXpGain }`) shows "+N XP" over the character's tokens, and the new NP
 * (`{ eterniaXpLevel: { from, to } }`) a gold ring and "NP N!"; on the windows of its players, the banner with what the
 * NP gives and "Choose now", which opens the class's choices and the skill picks (a player away finds them waiting in
 * the sheet's badges).
 */
import { L, SYSTEM_ID } from "../settings.mjs";
import { escape, toInt } from "../helpers/utils.mjs";
import { MAX_RANK, rankForXp, xpForRank, xpProgress } from "./data.mjs";

const X = (key, data) => L(`Xp.${key}`, data);

/** Whether an actor is a character of a player (only those take XP). */
export const isPlayerCharacter = actor => (actor?.type === "character") && !!actor.hasPlayerOwner;

/** The world actor behind a token's actor (a linked token's actor already is). */
export const baseActor = actor => (actor?.isToken ? (game.actors.get(actor.id) ?? actor) : actor);

/** A character's NP. */
export const rankOf = actor => Math.max(1, toInt(actor?.system?.infos?.crank) || 1);

/** A character's XP total (never below the XP its NP starts at). */
export const xpOf = actor => Math.max(toInt(actor?.system?.infos?.xp), xpForRank(rankOf(actor)));

/**
 * What a character's XP bar shows: the NP, the XP gained in it and the XP it takes, the total and the boosts.
 * @param {Actor} actor
 */
export function xpView(actor) {
  const total = xpOf(actor);
  const rank = rankOf(actor);
  const progress = xpProgress(total);
  // An NP above the XP's (the GM put it there): the bar starts at that NP
  const ahead = progress.rank < rank;
  const into = ahead ? 0 : progress.into;
  const need = ahead ? xpProgress(xpForRank(rank)).need : progress.need;
  const max = rank >= MAX_RANK;
  return {
    total, rank, into, need, max,
    pct: max ? 100 : Math.round(Math.min(1, into / Math.max(1, need)) * 1000) / 10,
    left: max ? 0 : Math.max(0, need - into),
    label: max ? X("Bar.Max", { total }) : X("Bar.Value", { into, need }),
    next: max ? "" : X("Bar.Next", { n: Math.max(0, need - into), rank: rank + 1 })
  };
}

/* -------------------------------------------- */
/*  Adding XP                                   */
/* -------------------------------------------- */

/** What is done to the XP and the NP of each character, one after another (on this window). */
const chains = new Map();

/** Run something in a character's line: its XP is read and written by one at a time, and its NP follows in order. */
function inLine(actor, fn) {
  const key = actor.uuid;
  const run = (chains.get(key) ?? Promise.resolve()).then(fn);
  chains.set(key, run.catch(() => null));
  return run;
}

/**
 * Add (or take, with a negative amount) XP to a character, then let its NP follow. The read and the write happen in the
 * character's line, so two monsters that fall at once never write over each other's XP.
 * @param {Actor} actor
 * @param {number} amount
 * @param {object} [options]
 * @param {string} [options.source]   "monster", "ticket", "gm" or "undo" (the card's Undo may take an NP back, after the box)
 * @returns {Promise<{before: number, after: number}>}
 */
export function addXp(actor, amount, { source = "gm" } = {}) {
  const target = baseActor(actor);
  return inLine(target, async () => {
    const before = xpOf(target);
    const after = Math.max(0, before + Math.trunc(Number(amount) || 0));
    if (after !== before) {
      await target.update({ "system.infos.xp": after }, { eterniaXpGain: after - before, eterniaXpSource: source });
    }
    await followRank(target, { down: source === "undo" });
    return { before, after };
  });
}

/**
 * Set a character's XP total (the GM's box on the sheet), then let its NP follow, up or down.
 * @param {Actor} actor
 * @param {number} total
 */
export function setXp(actor, total) {
  const target = baseActor(actor);
  return inLine(target, async () => {
    const before = xpOf(target);
    const after = Math.max(0, Math.trunc(Number(total) || 0));
    await target.update({ "system.infos.xp": after }, { eterniaXpGain: after - before, eterniaXpSource: "gm" });
    await followRank(target, { down: true });
    return { before, after };
  });
}

/**
 * The NP follows the XP: up by itself; down (an Undo, the GM's box) through the box of the NP change.
 * @param {Actor} actor
 * @param {object} [options]
 * @param {boolean} [options.down]
 */
export function followXp(actor, { down = false } = {}) {
  return inLine(actor, () => followRank(actor, { down }));
}

/** The NP to the XP's (inside the character's line). */
async function followRank(actor, { down = false } = {}) {
  const { levelTo } = await import("../apps/rank-up.mjs");
  const reached = rankForXp(toInt(actor.system.infos?.xp));
  const now = rankOf(actor);
  if (reached > now) return levelTo(actor, reached, { auto: true });
  if (down && (reached < now)) return levelTo(actor, reached, { fromXp: true });
  return false;
}

/* -------------------------------------------- */
/*  What every window shows                     */
/* -------------------------------------------- */

/** The tokens of an actor on this window's scene that the user sees. */
function visibleTokens(actor) {
  if (!canvas?.ready) return [];
  return actor.getActiveTokens(true).filter(t => t.visible && (t.document.parent === canvas.scene));
}

/** "+N XP" over a character's tokens. */
function floatGain(actor, gain) {
  for (const token of visibleTokens(actor)) {
    canvas.interface?.createScrollingText(token.center, X(gain > 0 ? "Float.Gain" : "Float.Loss", { n: Math.abs(gain) }), {
      anchor: CONST.TEXT_ANCHOR_POINTS.TOP,
      direction: CONST.TEXT_ANCHOR_POINTS.TOP,
      distance: token.h * 0.9,
      fontSize: 26,
      fill: (gain > 0) ? "#f0cf68" : "#c9a7a0",
      stroke: 0x14251b,
      strokeThickness: 5,
      jitter: 0.2,
      duration: 2600
    });
  }
}

/** A gold ring that opens around a token, and "NP N!" over it. */
function flashRank(actor, to) {
  for (const token of visibleTokens(actor)) {
    canvas.interface?.createScrollingText(token.center, X("Float.Rank", { rank: to }), {
      anchor: CONST.TEXT_ANCHOR_POINTS.CENTER,
      direction: CONST.TEXT_ANCHOR_POINTS.TOP,
      distance: token.h * 1.2,
      fontSize: 40,
      fill: "#ffe08a",
      stroke: 0x14251b,
      strokeThickness: 6,
      duration: 3200
    });
    ring(token);
  }
}

function ring(token) {
  const g = new PIXI.Graphics();
  const { x, y } = token.center;
  const size = Math.max(token.w, token.h);
  canvas.interface?.addChild(g);
  const start = performance.now();
  const DURATION = 1400;
  const step = () => {
    const t = Math.min(1, (performance.now() - start) / DURATION);
    const ease = 1 - ((1 - t) ** 3);
    g.clear();
    // The gold ring first, the green one a little behind it
    for (const [delay, color] of [[0, 0xf3d27a], [0.18, 0x6fbf73]]) {
      const r = (size * 0.45) + (size * 0.75 * Math.max(0, ease - delay));
      const line = { width: (6 * (1 - t)) + 1, color, alpha: 0.9 * (1 - t) };
      // PIXI 7 draws with lineStyle; PIXI 8 strokes the shape
      if (typeof g.lineStyle === "function") g.lineStyle(line).drawCircle(x, y, r);
      else g.circle(x, y, r).stroke(line);
    }
    if (t < 1) requestAnimationFrame(step);
    else g.destroy();
  };
  requestAnimationFrame(step);
}

/** The windows of an actor's players show the banner of an NP reached: whoever is on. */
const showsBanner = actor => !game.user.isGM && actor.testUserPermission(game.user, "OWNER");

/** On every window: the XP and the NP of a character changed. */
function onUpdateActor(actor, changes, options) {
  if (actor.type !== "character") return;
  const gain = toInt(options?.eterniaXpGain);
  if (gain) floatGain(actor, gain);
  const level = options?.eterniaXpLevel;
  if (level?.to > level?.from) {
    flashRank(actor, level.to);
    if (showsBanner(actor)) showBanner(actor, level).catch(err => console.error(`${SYSTEM_ID} | Level banner failed`, err));
  }
}

/* -------------------------------------------- */
/*  The banner                                  */
/* -------------------------------------------- */

const BANNER_MS = 25000;

/** The banner of an NP reached, on the window of the character's player: what came, and the choices. */
export async function showBanner(actor, { from, to }) {
  document.getElementById("eternia-xp-banner")?.remove();
  const { rankUpSkills } = await import("../apps/skill-browser.mjs");
  const picks = { combat: 0, general: 0 };
  for (let r = from + 1; r <= to; r++) {
    const g = rankUpSkills(r);
    picks.combat += g.combat;
    picks.general += g.general;
  }
  const el = document.createElement("section");
  el.id = "eternia-xp-banner";
  el.className = "xp-banner";
  el.setAttribute("role", "dialog");
  el.innerHTML = `<span class="xp-banner-medal"><img src="${escape(actor.img)}" alt=""></span>`
    + `<span class="xp-banner-eyebrow">${escape(X("Banner.Eyebrow"))}</span>`
    + `<strong class="xp-banner-rank">${escape(X("Banner.Rank", { rank: to }))}</strong>`
    + `<span class="xp-banner-name">${escape(actor.name)}</span>`
    + `<ul class="xp-banner-lines">`
    + `<li><i class="fa-solid fa-chart-simple"></i>${escape(X("Banner.Stats", { n: to - from }))}</li>`
    + `<li><i class="fa-solid fa-book-open"></i>${escape(X("Banner.Picks", picks))}</li></ul>`
    + `<footer><button type="button" class="xp-btn primary" data-banner="choose"><i class="fa-solid fa-angles-up"></i>${escape(X("Banner.Choose"))}</button>`
    + `<button type="button" class="xp-btn ghost" data-banner="later"><i class="fa-solid fa-clock"></i>${escape(X("Banner.Later"))}</button></footer>`;
  el.addEventListener("click", async event => {
    const button = event.target.closest("[data-banner]");
    if (!button) return;
    el.remove();
    if (button.dataset.banner === "choose") await openChoices(actor);
  });
  document.body.append(el);
  foundry.audio.AudioHelper.play({ src: CONFIG.sounds.notification, volume: 0.8, autoplay: true, loop: false }, false);
  el.animate([{ opacity: 0, transform: "translate(-50%, -30%) scale(0.9)" }, { opacity: 1, transform: "translate(-50%, -50%) scale(1)" }],
    { duration: 420, easing: "cubic-bezier(.2, 1.3, .4, 1)" });
  setTimeout(() => {
    if (!el.isConnected) return;
    el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 500, fill: "forwards" });
    setTimeout(() => el.remove(), 520);
  }, BANNER_MS);
}

/** What the class gives at the new NP (its Path, a Magia: also those still open), then the skill picks. */
export async function openChoices(actor) {
  const { getOption } = await import("../helpers/character-options.mjs");
  const { offerGrants } = await import("../apps/option-grants.mjs");
  const { SkillBrowser } = await import("../apps/skill-browser.mjs");
  const job = getOption(actor, "class");
  if (job) await offerGrants(actor, job, { above: 1, withStale: false });
  SkillBrowser.open(actor);
}

/** Call during the `init` hook. */
export function registerLevel() {
  Hooks.on("updateActor", onUpdateActor);
}
