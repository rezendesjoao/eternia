/**
 * The bubble of someone else's character: a right-click on the token of a character the user doesn't own (a player's:
 * canvas/eterniaToken.mjs) opens it over the token, with its name and what the user can do with that character. Each
 * part of the system adds its entries (registerBubbleEntry): the duels (challenge, the Arena) and the parties (invite,
 * take out, pass the lead). The bubble opens when one of its entries shows; its look is the panels' (css/duels.css).
 */
import { escape } from "../helpers/utils.mjs";
import { panelLayer } from "../helpers/panels.mjs";

/**
 * The entries, in their order.
 * @type {{id: string, order: number, visible: (token: Token, user: User) => boolean, icon: string|((token: Token) => string),
 *   label: (token: Token) => string, onClick: (token: Token) => any, note?: (token: Token) => string|null}[]}
 */
const entries = [];

/**
 * Add an entry to the bubble.
 * @param {object} entry
 * @param {string} entry.id
 * @param {number} [entry.order]
 * @param {(token: Token, user: User) => boolean} entry.visible   Whether it shows for this token and user
 * @param {string|((token: Token) => string)} entry.icon
 * @param {(token: Token) => string} entry.label
 * @param {(token: Token) => any} entry.onClick
 */
export function registerBubbleEntry(entry) {
  entries.push({ order: entries.length, ...entry });
  entries.sort((a, b) => a.order - b.order);
}

/** A picture that isn't the default one (a sheet with no portrait shows its token). */
export const pictureOf = (actor, token = null) => {
  const blank = src => !src || (src === CONST.DEFAULT_TOKEN) || /mystery-man/.test(src);
  const art = actor?.img;
  return blank(art) ? (token?.texture?.src ?? actor?.prototypeToken?.texture?.src ?? art ?? "") : art;
};

/** Whether a right-click on this token opens the bubble: a character the user doesn't own, with an entry for it. */
export function bubbleFor(token, user = game.user) {
  if (user.isGM || (token?.actor?.type !== "character") || token.actor.testUserPermission(user, "OWNER") || !token.visible) return false;
  return entries.some(e => e.visible(token, user));
}

/** The bubble by someone else's character: its name and its entries. */
export function openBubble(token) {
  closeBubble();
  const shown = entries.filter(e => e.visible(token, game.user));
  if (!shown.length) return null;
  const el = document.createElement("div");
  el.id = "eternia-bubble";
  el.className = "dl-bubble";
  const name = token.document.name || token.actor?.name || "?";
  el.innerHTML = `<header><img src="${escape(pictureOf(token.actor, token.document))}" alt=""><span>${escape(name)}</span></header>`
    + shown.map(e => {
      const icon = (typeof e.icon === "function") ? e.icon(token) : e.icon;
      const note = e.note?.(token);
      return `<button type="button" data-bubble="${e.id}"${note ? ` data-tooltip-text="${escape(note)}"` : ""}><i class="${icon}"></i>${escape(e.label(token))}</button>`;
    }).join("");
  const point = canvas.clientCoordinatesFromCanvas({ x: token.center.x, y: token.y });
  el.style.left = `${Math.round(point.x)}px`;
  el.style.top = `${Math.round(point.y)}px`;
  el.addEventListener("click", event => {
    const button = event.target.closest("[data-bubble]");
    if (!button) return;
    closeBubble();
    entries.find(e => e.id === button.dataset.bubble)?.onClick(token);
  });
  panelLayer().append(el);
  setTimeout(() => document.addEventListener("pointerdown", outside, { capture: true }), 0);
  return el;
}

function outside(event) {
  if (!event.target.closest?.("#eternia-bubble")) closeBubble();
}

export function closeBubble() {
  document.removeEventListener("pointerdown", outside, { capture: true });
  document.getElementById("eternia-bubble")?.remove();
}

/** Call during the `init` hook. */
export function registerBubble() {
  Hooks.on("canvasPan", () => closeBubble());
}
