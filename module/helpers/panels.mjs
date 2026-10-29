/**
 * The system's floating panels (css/duels.css, prefix dl, since the duels had them first): the duels' challenges and
 * the parties' invitations, in the look of the message boxes: the green bar with a gold edge, parchment, the green
 * action and the parchment Cancel, a time bar that runs out. They go in one layer over the interface and under the
 * tooltips (#eternia-duels), one per key; a short note closes by itself. Enter (the action) and Escape (Cancel) reach
 * the panel on top before Foundry, while one is open and the focus is in it or nowhere.
 */
import { escape } from "./utils.mjs";

/** How long a note stays. */
const NOTE_MS = 3800;

/** The panels open, by key. */
const panels = new Map();

/** The layer the panels go in. */
export function panelLayer() {
  let el = document.getElementById("eternia-duels");
  if (!el) {
    el = document.createElement("div");
    el.id = "eternia-duels";
    document.body.append(el);
  }
  return el;
}

/** Whether a panel is open. */
export const hasPanel = key => panels.has(key);

/**
 * Open a panel (one per key: the old one goes).
 * @param {string} key
 * @param {object} options
 * @param {string} options.title
 * @param {string} options.html            The body (already escaped)
 * @param {object[]} [options.buttons]     { id, kind: "primary"|"ghost", icon, label }
 * @param {number} [options.left]          The time left (ms): the bar under the body runs out
 * @param {number} [options.total]         The whole time (the bar's full width)
 * @param {boolean} [options.danger]       Red (a duel to the death)
 * @param {string} [options.icon]          The bar's icon
 * @param {boolean} [options.focus]        Its action takes the focus (a box the user opened; never a request that
 *                                         arrives while the user may be typing)
 * @param {(id: string, panel: HTMLElement) => any} [options.onButton]
 * @returns {HTMLElement}
 */
export function openPanel(key, { title, html, buttons = [], left = 0, total = 0, danger = false, onButton = null, icon = "fa-solid fa-swords", focus = false }) {
  closePanel(key, { now: true });
  const el = document.createElement("section");
  el.className = `dl-box${danger ? " danger" : ""}`;
  el.dataset.key = key;
  el.setAttribute("role", "dialog");
  el.innerHTML = `<header class="dl-box-head"><i class="${icon}"></i><span>${escape(title)}</span></header>
    <div class="dl-box-body">${html}${left > 0 ? "<div class=\"dl-box-timer\"><span></span></div>" : ""}
    <footer class="dl-box-foot">${buttons.map(b => `<button type="button" class="dl-btn ${b.kind}" data-button="${b.id}">`
      + `<i class="${b.icon}"></i>${escape(b.label)}</button>`).join("")}</footer></div>`;
  panelLayer().append(el);
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
export function closePanel(key, { now = false } = {}) {
  const el = panels.get(key);
  if (!el) return;
  panels.delete(key);
  if (now) return el.remove();
  el.classList.add("closing");
  setTimeout(() => el.remove(), 200);
}

/**
 * A short note in a panel (how a request ended, an error), that closes by itself.
 * @param {string} text
 * @param {object} [options]
 * @param {string} options.title
 * @param {string} [options.icon]
 * @param {boolean} [options.danger]
 * @param {string} [options.ok]    The label of its button
 */
export function notePanel(text, { title, icon = "fa-solid fa-circle-info", danger = false, ok = "OK" } = {}) {
  const el = openPanel("note", {
    title, icon, danger,
    html: `<p class="dl-box-lead">${escape(text)}</p>`,
    buttons: [{ id: "ok", kind: "primary", icon: "fa-solid fa-check", label: ok }],
    onButton: () => closePanel("note")
  });
  setTimeout(() => {
    if (panels.get("note") === el) closePanel("note");
  }, NOTE_MS);
  return el;
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

let registered = false;

/** Call during the `init` hook (once: the duels and the parties both ask). */
export function registerPanels() {
  if (registered) return;
  registered = true;
  document.addEventListener("keydown", onKey, { capture: true });
}
