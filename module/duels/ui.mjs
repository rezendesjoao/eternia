/**
 * The duels' screens (css/duels.css, prefix dl), in the look of the system's message boxes: the green bar with a gold
 * edge, parchment, the gold medallion with the crossed swords between the two faces, the green action and the parchment
 * Cancel; the countdown in a gold medallion and the winner's name on a parchment card over the scene.
 *
 * - challengeDialog(tokenA, tokenB): the challenger picks the mode and sends the challenge (duels.mjs), then waits.
 * - The request (socket "ask"): the challenged's player accepts or declines while the time bar runs.
 * - How a request ended (socket "closed"), the countdown (socket "countdown") and the winner (socket "end").
 * - The duel bar: the two duelists' HP, the mode and the round, at the top of the screen of everyone on the duel's
 *   scene, with "Give up" for their owners and the GM's "Decide" (a side, a draw, or call it off).
 * - The bubble of someone else's character (a right-click on its token, canvas/eterniaToken.mjs): the duel and the Arena.
 * The panels take Enter (the action) and Escape (Cancel) before Foundry does, while one is open.
 */
import { L, setting } from "../settings.mjs";
import { escape, toInt } from "../helpers/utils.mjs";
import {
  ASK_MS, answerChallenge, cancelChallenge, duelProblem, duelTime, errorText, onDuelMessage, resignDuel, resultLine,
  sendChallenge, sideView, stopDuel
} from "./duels.mjs";
import { DUEL_MODES, duelOf, liveDuels } from "./state.mjs";

export const MODE_ICON = { strike: "fa-solid fa-bolt", half: "fa-solid fa-heart-half-stroke", death: "fa-solid fa-skull" };
/** How long the winner's banner stays. */
const WINNER_MS = 6500;
/** How long a note about a request stays. */
const NOTE_MS = 3800;

/** The layer the duels' screens go in (over the interface, under the tooltips). */
function layer() {
  let el = document.getElementById("eternia-duels");
  if (!el) {
    el = document.createElement("div");
    el.id = "eternia-duels";
    document.body.append(el);
  }
  return el;
}

const sound = () => foundry.audio.AudioHelper.play({ src: CONFIG.sounds.notification, volume: 0.8, autoplay: true, loop: false }, false);

/* -------------------------------------------- */
/*  Panels                                      */
/* -------------------------------------------- */

/** The panels open, by key (challenge, wait:<id>, ask:<id>, note). */
const panels = new Map();

/** The two faces of a duel. */
function versus(a, b, { mode = null } = {}) {
  const face = side => `<figure class="dl-face"><span><img src="${escape(side.img)}" alt=""></span><figcaption>${escape(side.name)}</figcaption></figure>`;
  return `<div class="dl-versus">${face(a)}<span class="dl-vs"><i class="fa-solid fa-swords"></i></span>${face(b)}</div>`
    + (mode ? `<p class="dl-mode-chip ${mode}"><i class="${MODE_ICON[mode]}"></i>${escape(L(`Duel.Mode.${mode}`))}</p>` : "");
}

/**
 * Open a panel (one per key: the old one goes).
 * @param {string} key
 * @param {object} options
 * @param {string} options.title
 * @param {string} options.html            The body (already escaped)
 * @param {object[]} [options.buttons]     { id, kind: "primary"|"ghost", icon, label }
 * @param {number} [options.left]          The time left (ms): the bar under the body runs out
 * @param {number} [options.total]         The whole time (the bar's full width)
 * @param {boolean} [options.danger]       A duel to the death
 * @param {boolean} [options.focus]        Its action takes the focus (a box the user opened; never a request that
 *                                         arrives while the user may be typing)
 * @param {(id: string, panel: HTMLElement) => any} [options.onButton]
 * @returns {HTMLElement}
 */
function openPanel(key, { title, html, buttons = [], left = 0, total = 0, danger = false, onButton = null, icon = "fa-solid fa-swords", focus = false }) {
  closePanel(key, { now: true });
  const el = document.createElement("section");
  el.className = `dl-box${danger ? " danger" : ""}`;
  el.dataset.key = key;
  el.setAttribute("role", "dialog");
  el.innerHTML = `<header class="dl-box-head"><i class="${icon}"></i><span>${escape(title)}</span></header>
    <div class="dl-box-body">${html}${left > 0 ? "<div class=\"dl-box-timer\"><span></span></div>" : ""}
    <footer class="dl-box-foot">${buttons.map(b => `<button type="button" class="dl-btn ${b.kind}" data-button="${b.id}">`
      + `<i class="${b.icon}"></i>${escape(b.label)}</button>`).join("")}</footer></div>`;
  layer().append(el);
  if (left > 0) {
    const bar = el.querySelector(".dl-box-timer span");
    const start = Math.min(100, (left / (total || left)) * 100);
    bar.animate([{ width: `${start}%` }, { width: "0%" }], { duration: left, fill: "forwards", easing: "linear" });
  }
  el.addEventListener("click", event => {
    const button = event.target.closest("[data-button]");
    if (button && !button.disabled) onButton?.(button.dataset.button, el);
  });
  panels.set(key, el);
  if (focus) el.querySelector(".dl-btn.primary, .dl-btn")?.focus({ preventScroll: true });
  return el;
}

/** Close a panel. */
function closePanel(key, { now = false } = {}) {
  const el = panels.get(key);
  if (!el) return;
  panels.delete(key);
  if (now) return el.remove();
  el.classList.add("closing");
  setTimeout(() => el.remove(), 200);
}

/** A short note in a panel (how a request ended, an error), that closes by itself. */
function note(text, { icon = "fa-solid fa-circle-info", danger = false } = {}) {
  const el = openPanel("note", {
    title: L("Duel.Title"), icon, danger,
    html: `<p class="dl-box-lead">${escape(text)}</p>`,
    buttons: [{ id: "ok", kind: "primary", icon: "fa-solid fa-check", label: L("Duel.UI.Ok") }],
    onButton: () => closePanel("note")
  });
  setTimeout(() => {
    if (panels.get("note") === el) closePanel("note");
  }, NOTE_MS);
}

/**
 * Enter and Escape on the panel on top, before Foundry's keys (Escape closes every window): only with the focus in a
 * panel or nowhere, never in a field (the chat, a sheet).
 */
function onKey(event) {
  if (!panels.size || !["Enter", "Escape"].includes(event.key)) return;
  if (!event.target.closest?.(".dl-box") && (event.target !== document.body)) return;
  const top = [...panels.values()].at(-1);
  if (event.key === "Enter" && event.target.closest?.(".dl-box") && (event.target.tagName === "BUTTON")) return;
  const button = top.querySelector((event.key === "Enter") ? ".dl-btn.primary" : ".dl-btn.ghost") ?? ((event.key === "Escape") ? top.querySelector(".dl-btn") : null);
  if (!button) return;
  event.preventDefault();
  event.stopPropagation();
  button.click();
}

/* -------------------------------------------- */
/*  The challenge                               */
/* -------------------------------------------- */

/** A picture that isn't the default one (a sheet with no portrait shows its token). */
export const pictureOf = (actor, token = null) => {
  const blank = src => !src || (src === CONST.DEFAULT_TOKEN) || /mystery-man/.test(src);
  const art = actor?.img;
  return blank(art) ? (token?.texture?.src ?? actor?.prototypeToken?.texture?.src ?? art ?? "") : art;
};

/** What a token shows in the panels. */
const faceOf = token => ({ name: token.name || token.actor?.name || "?", img: pictureOf(token.actor, token) });

/**
 * The challenger's panel: the two of them, the modes, and "Challenge".
 * @param {TokenDocument} tokenA   The challenger's token
 * @param {TokenDocument} tokenB   The challenged's
 */
export function challengeDialog(tokenA, tokenB) {
  const first = DUEL_MODES.find(m => !duelProblem(tokenA, tokenB, m)) ?? "strike";
  // One that can't happen at all says why, before any mode is picked
  const blocking = DUEL_MODES.every(m => duelProblem(tokenA, tokenB, m)) ? duelProblem(tokenA, tokenB, first) : null;
  if (blocking) return note(L(`Duel.Error.${blocking.key}`, blocking.data ?? {}), { icon: "fa-solid fa-ban" });
  const modes = DUEL_MODES.filter(m => (m !== "death") || setting("duelDeath")).map(m => {
    const problem = duelProblem(tokenA, tokenB, m);
    return `<label class="dl-mode ${m}${problem ? " off" : ""}"${problem ? ` data-tooltip-text="${escape(L(`Duel.Error.${problem.key}`, problem.data ?? {}))}"` : ""}>`
      + `<input type="radio" name="dl-mode" value="${m}"${(m === first) ? " checked" : ""}${problem ? " disabled" : ""}>`
      + `<i class="${MODE_ICON[m]}"></i><span><b>${escape(L(`Duel.Mode.${m}`))}</b><em>${escape(L(`Duel.ModeRule.${m}`))}</em></span></label>`;
  }).join("");
  const panel = openPanel("challenge", {
    title: L("Duel.UI.ChallengeTitle"),
    html: `${versus(faceOf(tokenA), faceOf(tokenB))}<p class="dl-box-lead">${escape(L("Duel.UI.ChooseMode", { name: faceOf(tokenB).name }))}</p>`
      + `<div class="dl-modes">${modes}</div><p class="dl-box-error" hidden></p>`,
    buttons: [
      { id: "send", kind: "primary", icon: "fa-solid fa-swords", label: L("Duel.UI.Send") },
      { id: "cancel", kind: "ghost", icon: "fa-solid fa-xmark", label: L("Duel.UI.Cancel") }
    ],
    focus: true,
    onButton: async (id, el) => {
      if (id === "cancel") return closePanel("challenge");
      const mode = el.querySelector("input[name='dl-mode']:checked")?.value;
      if (!mode) return;
      for (const b of el.querySelectorAll(".dl-btn")) b.disabled = true;
      const result = await sendChallenge(tokenA, tokenB, mode);
      if (!result?.ok) {
        const error = el.querySelector(".dl-box-error");
        error.textContent = errorText(result) || L("Duel.Error.Generic");
        error.hidden = false;
        for (const b of el.querySelectorAll(".dl-btn")) b.disabled = false;
        return;
      }
      closePanel("challenge");
      if (result.waiting) waitingPanel(result.challenge, result.names);
    }
  });
  // A duel to the death turns the panel red
  const paint = () => panel.classList.toggle("danger", panel.querySelector("input[name='dl-mode']:checked")?.value === "death");
  panel.addEventListener("change", paint);
  paint();
  return panel;
}

/** The challenger waits for the answer (and may take the challenge back). */
function waitingPanel(challenge, names = []) {
  openPanel(`wait:${challenge.id}`, {
    title: L("Duel.UI.WaitTitle"),
    danger: challenge.mode === "death",
    html: `${versus(challenge.a, challenge.b, { mode: challenge.mode })}<p class="dl-box-lead">${escape(L("Duel.UI.Waiting", { name: challenge.b.name }))}</p>`
      + (names.length ? `<p class="dl-box-small">${escape(L("Duel.UI.WaitingFor", { names: names.join(", ") }))}</p>` : ""),
    left: challenge.left ?? ASK_MS,
    total: ASK_MS,
    buttons: [{ id: "withdraw", kind: "ghost", icon: "fa-solid fa-xmark", label: L("Duel.UI.Withdraw") }],
    onButton: async (id, el) => {
      for (const b of el.querySelectorAll(".dl-btn")) b.disabled = true;
      const result = await cancelChallenge(challenge.id);
      if (!result?.ok) closePanel(`wait:${challenge.id}`);
    }
  });
}

/** The request, on the screen of whoever answers for the challenged. */
function askPanel({ challenge }) {
  sound();
  const death = challenge.mode === "death";
  openPanel(`ask:${challenge.id}`, {
    title: L("Duel.UI.AskTitle"),
    danger: death,
    html: `${versus(challenge.a, challenge.b, { mode: challenge.mode })}`
      + `<p class="dl-box-lead">${escape(L("Duel.UI.Asks", { name: challenge.a.name, target: challenge.b.name }))}</p>`
      + `<p class="dl-box-rule">${escape(L(`Duel.ModeRule.${challenge.mode}`))}</p>`
      + (death ? `<p class="dl-box-warning"><i class="fa-solid fa-skull"></i>${escape(L("Duel.UI.DeathWarning"))}</p>` : "")
      + `<p class="dl-box-question">${escape(L("Duel.UI.Question"))}</p>`,
    left: challenge.left ?? ASK_MS,
    total: ASK_MS,
    buttons: [
      { id: "accept", kind: "primary", icon: "fa-solid fa-check", label: L("Duel.UI.Accept") },
      { id: "decline", kind: "ghost", icon: "fa-solid fa-xmark", label: L("Duel.UI.Decline") }
    ],
    onButton: async (id, el) => {
      for (const b of el.querySelectorAll(".dl-btn")) b.disabled = true;
      const result = await answerChallenge(challenge.id, id === "accept");
      if (!result?.ok) {
        closePanel(`ask:${challenge.id}`);
        const text = errorText(result);
        if (text) note(text, { icon: "fa-solid fa-ban" });
      }
    }
  });
}

/** A request ended: the panels of it close, and whoever didn't end it hears how. */
function onClosed(message) {
  const asked = panels.has(`ask:${message.id}`);
  const waited = panels.has(`wait:${message.id}`);
  closePanel(`ask:${message.id}`);
  closePanel(`wait:${message.id}`);
  const why = message.why;
  if (why === "accepted") return;
  if (why === "invalid") {
    if (asked || waited) note(errorText({ error: message.error, errorData: message.errorData }), { icon: "fa-solid fa-ban" });
    return;
  }
  if (waited && ["declined", "expired"].includes(why)) note(L(`Duel.UI.Closed.${why}`, { name: message.by }), { icon: "fa-solid fa-ban" });
  if (asked && ["cancelled", "expired"].includes(why)) note(L(`Duel.UI.Closed.${why}Asked`, { name: message.by }));
}

/* -------------------------------------------- */
/*  The countdown and the winner                */
/* -------------------------------------------- */

/** The countdown over the scene, then "Duel!". */
function showCountdown({ duel }) {
  document.getElementById("eternia-duel-count")?.remove();
  const end = Date.now() + Math.max(0, (duel.startsAt ?? 0) - (duel.createdAt ?? 0));
  const el = document.createElement("div");
  el.id = "eternia-duel-count";
  el.className = `dl-count ${duel.mode}`;
  el.innerHTML = `<div class="dl-count-names"><span>${escape(duel.a.name)}</span><i class="fa-solid fa-swords"></i><span>${escape(duel.b.name)}</span></div>`
    + `<div class="dl-count-ring"><svg viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="46"></circle></svg><span class="dl-count-n"></span></div>`
    + `<div class="dl-count-mode"><i class="${MODE_ICON[duel.mode]}"></i>${escape(L(`Duel.Mode.${duel.mode}`))}</div>`;
  layer().append(el);
  const total = Math.max(1, end - Date.now());
  const ring = el.querySelector("circle");
  ring.animate([{ strokeDashoffset: 0 }, { strokeDashoffset: 289 }], { duration: total, fill: "forwards", easing: "linear" });
  const number = el.querySelector(".dl-count-n");
  let last = null;
  const tick = () => {
    if (!el.isConnected) return;
    const n = Math.ceil((end - Date.now()) / 1000);
    if (n <= 0) return flash(el);
    if (n !== last) {
      last = n;
      number.textContent = String(n);
      number.animate([{ transform: "scale(1.35)", opacity: 0.4 }, { transform: "scale(1)", opacity: 1 }], { duration: 260, easing: "ease-out" });
    }
    setTimeout(tick, 100);
  };
  tick();
}

/** "Duel!" where the countdown was. */
function flash(el) {
  el.classList.add("go");
  el.innerHTML = `<strong class="dl-go">${escape(L("Duel.UI.Go"))}</strong>`;
  el.firstElementChild.animate([{ transform: "scale(2.2)", opacity: 0 }, { transform: "scale(1)", opacity: 1, offset: 0.3 }, { transform: "scale(1.05)", opacity: 1, offset: 0.75 }, { transform: "scale(1.3)", opacity: 0 }],
    { duration: 1300, easing: "ease-out", fill: "forwards" });
  setTimeout(() => el.remove(), 1350);
}

/** The winner's banner over the scene (a draw names both). */
function showWinner({ duel }) {
  document.getElementById("eternia-duel-count")?.remove();
  const result = duel.result ?? {};
  if (result.reason === "cancel") {
    if (canvas.scene?.id === duel.sceneId) ui.notifications.info(L("Duel.UI.CalledOff", { a: duel.a.name, b: duel.b.name }));
    return;
  }
  document.getElementById("eternia-duel-winner")?.remove();
  const el = document.createElement("div");
  el.id = "eternia-duel-winner";
  el.className = `dl-winner ${duel.mode}`;
  const winner = result.winner ? sideView(duel, result.winner) : null;
  const meta = [L("Duel.UI.Rounds", { n: toInt(result.rounds) }), duelTime(result.ms)];
  if (winner?.delta) meta.push(L("Duel.UI.Points", { delta: winner.delta, rating: winner.rating }));
  el.innerHTML = winner
    ? `<span class="dl-winner-medal"><i class="fa-solid fa-trophy"></i></span><span class="dl-winner-eyebrow">${escape(L("Duel.UI.Winner"))}</span>`
      + `<span class="dl-winner-face"><img src="${escape(winner.img)}" alt=""></span>`
      + `<strong class="dl-winner-name">${escape(winner.name)}</strong>`
      + `<span class="dl-winner-line">${escape(resultLine(duel))}</span>`
      + `<span class="dl-winner-meta">${meta.map(escape).join(" · ")}</span>`
    : `<span class="dl-winner-medal"><i class="fa-solid fa-scale-balanced"></i></span><span class="dl-winner-eyebrow">${escape(L("Duel.UI.DrawEyebrow"))}</span>`
      + `<strong class="dl-winner-name">${escape(duel.a.name)} · ${escape(duel.b.name)}</strong>`
      + `<span class="dl-winner-meta">${meta.map(escape).join(" · ")}</span>`;
  el.addEventListener("click", () => el.remove());
  layer().append(el);
  el.animate([{ opacity: 0, transform: "translate(-50%, -40%) scale(0.92)" }, { opacity: 1, transform: "translate(-50%, -50%) scale(1)" }],
    { duration: 380, easing: "cubic-bezier(.2, 1.3, .4, 1)" });
  setTimeout(() => {
    if (!el.isConnected) return;
    el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 500, fill: "forwards" });
    setTimeout(() => el.remove(), 520);
  }, WINNER_MS);
}

/* -------------------------------------------- */
/*  The duel bar                                */
/* -------------------------------------------- */

/** The duel the bar shows: the one on the scene being viewed, else one of the user's own characters. */
function barDuel() {
  const duels = liveDuels();
  return duels.find(c => duelOf(c).sceneId === canvas.scene?.id)
    ?? duels.find(c => ["a", "b"].some(s => fromUuidSync(duelOf(c)[s].actorUuid)?.isOwner && !game.user.isGM)) ?? null;
}

/** The HP of a side: its bar (green, yellow, red) and, for whoever may see them, the numbers. */
function hpView(duel, side) {
  const actor = fromUuidSync(duel[side].actorUuid);
  const max = Math.max(1, toInt(actor?.system?.health?.max));
  const hp = Math.max(0, toInt(actor?.system?.health?.value));
  const pct = Math.clamp((hp / max) * 100, 0, 100);
  return {
    pct,
    tone: (pct > 50) ? "high" : ((pct > 20) ? "mid" : "low"),
    text: actor?.testUserPermission(game.user, "OBSERVER") ? `${hp}/${max}` : "",
    owned: !!actor?.isOwner
  };
}

let barFrame = null;
/** Draw the duel bar again (at most once a frame). */
export function refreshDuelBar() {
  if (barFrame) return;
  barFrame = requestAnimationFrame(() => {
    barFrame = null;
    drawBar();
  });
}

function drawBar() {
  const combat = barDuel();
  let el = document.getElementById("eternia-duel-bar");
  if (!combat) return el?.remove();
  const duel = duelOf(combat);
  if (!el) {
    el = document.createElement("div");
    el.id = "eternia-duel-bar";
    el.addEventListener("click", onBarClick);
    layer().append(el);
  }
  el.className = `dl-bar ${duel.mode} ${duel.state}`;
  el.dataset.combatId = combat.id;
  const side = s => {
    const hp = hpView(duel, s);
    const face = sideView(duel, s);
    return `<div class="dl-bar-side ${s}"><span class="dl-bar-face"><img src="${escape(face.img)}" alt=""></span>`
      + `<div class="dl-bar-info"><span class="dl-bar-name">${escape(face.name)}</span>`
      + `<span class="dl-hp ${hp.tone}"><i style="width: ${hp.pct.toFixed(1)}%"></i>${(duel.mode === "half") ? "<em class=\"dl-hp-mark\"></em>" : ""}</span>`
      + `${hp.text ? `<small>${hp.text}</small>` : ""}</div></div>`;
  };
  const round = combat.started ? L("Duel.UI.Round", { n: combat.round }) : L("Duel.UI.Ready");
  const mine = !game.user.isGM && ["a", "b"].some(s => hpView(duel, s).owned);
  const actions = [];
  if (mine && (duel.state === "fighting")) actions.push(`<button type="button" data-bar="resign"><i class="fa-solid fa-flag"></i>${escape(L("Duel.UI.Resign"))}</button>`);
  if (game.user.isGM) {
    actions.push(`<button type="button" data-bar="menu"><i class="fa-solid fa-gavel"></i>${escape(L("Duel.UI.Decide"))}</button>`);
    actions.push(`<div class="dl-bar-menu" hidden>`
      + `<button type="button" data-bar="a">${escape(L("Duel.UI.GiveTo", { name: duel.a.name }))}</button>`
      + `<button type="button" data-bar="b">${escape(L("Duel.UI.GiveTo", { name: duel.b.name }))}</button>`
      + `<button type="button" data-bar="draw">${escape(L("Duel.UI.Draw"))}</button>`
      + `<button type="button" data-bar="cancel" class="danger">${escape(L("Duel.UI.CallOff"))}</button></div>`);
  }
  el.innerHTML = `${side("a")}<div class="dl-bar-mid"><span class="dl-bar-mode"><i class="${MODE_ICON[duel.mode]}"></i>${escape(L(`Duel.Mode.${duel.mode}`))}</span>`
    + `<span class="dl-bar-vs"><i class="fa-solid fa-swords"></i></span><span class="dl-bar-round">${escape(round)}</span></div>${side("b")}`
    + (actions.length ? `<div class="dl-bar-actions">${actions.join("")}</div>` : "");
}

async function onBarClick(event) {
  const button = event.target.closest("[data-bar]");
  const bar = event.currentTarget;
  if (!button) return;
  const combatId = bar.dataset.combatId;
  const what = button.dataset.bar;
  if (what === "menu") {
    const menu = bar.querySelector(".dl-bar-menu");
    if (menu) menu.hidden = !menu.hidden;
    return;
  }
  button.disabled = true;
  const result = (what === "resign") ? await resignDuel(combatId) : await stopDuel(combatId, what);
  if (!result?.ok) {
    button.disabled = false;
    const text = errorText(result);
    if (text) ui.notifications.warn(text);
  }
}

/* -------------------------------------------- */
/*  Someone else's character                    */
/* -------------------------------------------- */

/**
 * The token the user duels with: the one selected (a character of theirs), else their character's on this scene, else
 * (a player) their only character on the scene.
 * @returns {TokenDocument|null}
 */
export function challengerToken() {
  if (!canvas?.ready) return null;
  const own = t => (t.actor?.type === "character") && t.actor.isOwner;
  const controlled = canvas.tokens.controlled.filter(own);
  if (controlled.length === 1) return controlled[0].document;
  const assigned = game.user.character?.getActiveTokens(false, true).find(d => d.parent === canvas.scene);
  if (assigned) return assigned;
  if (!game.user.isGM) {
    const mine = canvas.tokens.placeables.filter(own);
    if (mine.length === 1) return mine[0].document;
  }
  return null;
}

/** Challenge a token (the user's own token is the challenger). */
export function challenge(token) {
  const target = token?.document ?? token;
  const mine = challengerToken();
  if (!mine) return note(L("Duel.Error.NoChallenger"), { icon: "fa-solid fa-hand-pointer" });
  if (target?.actor?.uuid === mine.actor?.uuid) return note(L("Duel.Error.Self"), { icon: "fa-solid fa-ban" });
  return challengeDialog(mine, target);
}

/** Whether a right-click on this token opens the bubble (a character the user doesn't own, with the duels on). */
export function bubbleFor(token, user = game.user) {
  return !!setting("duels") && !user.isGM && (token?.actor?.type === "character") && !token.actor.testUserPermission(user, "OWNER")
    && token.visible;
}

/** The bubble by someone else's character: its name, the duel, the Arena. */
export function openBubble(token) {
  closeBubble();
  const el = document.createElement("div");
  el.id = "eternia-duel-bubble";
  el.className = "dl-bubble";
  const face = faceOf(token.document);
  el.innerHTML = `<header><img src="${escape(face.img)}" alt=""><span>${escape(face.name)}</span></header>`
    + `<button type="button" data-bubble="duel"><i class="fa-solid fa-swords"></i>${escape(L("Duel.UI.ChallengeTo"))}</button>`
    + `<button type="button" data-bubble="arena"><i class="fa-solid fa-ranking-star"></i>${escape(L("Duel.UI.SeeRanking"))}</button>`;
  const point = canvas.clientCoordinatesFromCanvas({ x: token.center.x, y: token.y });
  el.style.left = `${Math.round(point.x)}px`;
  el.style.top = `${Math.round(point.y)}px`;
  el.addEventListener("click", event => {
    const button = event.target.closest("[data-bubble]");
    if (!button) return;
    closeBubble();
    if (button.dataset.bubble === "duel") challenge(token);
    else game.eternia.duels?.open();
  });
  layer().append(el);
  setTimeout(() => document.addEventListener("pointerdown", outside, { capture: true }), 0);
}

function outside(event) {
  if (!event.target.closest?.("#eternia-duel-bubble")) closeBubble();
}

export function closeBubble() {
  document.removeEventListener("pointerdown", outside, { capture: true });
  document.getElementById("eternia-duel-bubble")?.remove();
}

/* -------------------------------------------- */
/*  Registration                                */
/* -------------------------------------------- */

/** Call during the `init` hook. */
export function registerDuelScreens() {
  onDuelMessage("ask", askPanel);
  onDuelMessage("closed", onClosed);
  onDuelMessage("countdown", message => {
    showCountdown(message);
    refreshDuelBar();
  });
  onDuelMessage("end", message => {
    showWinner(message);
    refreshDuelBar();
  });
  document.addEventListener("keydown", onKey, { capture: true });
  for (const hook of ["createCombat", "updateCombat", "deleteCombat", "canvasReady"]) Hooks.on(hook, () => refreshDuelBar());
  Hooks.on("updateActor", actor => {
    if (document.getElementById("eternia-duel-bar") || liveDuels().length) refreshDuelBar();
  });
  Hooks.on("canvasPan", () => closeBubble());
  Hooks.once("ready", () => refreshDuelBar());
}

