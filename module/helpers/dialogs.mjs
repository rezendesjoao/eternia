/**
 * The system's message boxes (css/windows.css, "Message boxes"): one layout for every confirmation, warning and
 * choice. Inside the parchment window with the green bar: an optional head (the picture of what the box is about, a
 * small label and its name), a lead sentence, the lines of a warning (each with the icon of its kind), any form, and
 * the closing question; the buttons below, the safe one first in focus.
 */

const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" })[c]);

/** Icon and tone of each kind of warning line. */
export const LINE_KINDS = {
  timing: { icon: "fa-solid fa-hourglass-half", tone: "time" },
  action: { icon: "fa-solid fa-hand", tone: "time" },
  limit: { icon: "fa-solid fa-rotate", tone: "limit" },
  item: { icon: "fa-solid fa-box-open", tone: "limit" },
  motor: { icon: "fa-solid fa-gear", tone: "motor" },
  fate: { icon: "fa-solid fa-star", tone: "motor" },
  condition: { icon: "fa-solid fa-triangle-exclamation", tone: "danger" },
  out: { icon: "fa-solid fa-bed", tone: "danger" },
  gain: { icon: "fa-solid fa-plus", tone: "motor" },
  info: { icon: "fa-solid fa-circle-info", tone: "info" }
};

/**
 * The inside of a message box.
 * @param {object} [parts]
 * @param {string} [parts.img]       Picture of what the box is about (a skill, an item)
 * @param {string} [parts.eyebrow]   Small label above the heading
 * @param {string} [parts.heading]   Its name
 * @param {string} [parts.lead]      A sentence before the lines
 * @param {{text?: string, html?: string, kind?: string, icon?: string}[]} [parts.lines]   Warning lines (html: already safe)
 * @param {string} [parts.body]      Free HTML (paragraphs, a form), already safe
 * @param {string} [parts.question]  The question that closes the box
 * @param {string} [parts.tone]      "danger": the box's Yes goes against a warning
 * @returns {string}
 */
export function boxContent({ img, eyebrow, heading, lead, lines = [], body = "", question, tone } = {}) {
  const titles = `${eyebrow ? `<span class="lhd-eyebrow">${esc(eyebrow)}</span>` : ""}${heading ? `<strong class="lhd-heading">${esc(heading)}</strong>` : ""}`;
  const head = (img || titles) ? `<header class="lhd-head${img ? "" : " no-img"}">${img ? `<img class="lhd-img" src="${esc(img)}" alt="">` : ""}<div class="lhd-titles">${titles}</div></header>` : "";
  const list = lines.length ? `<ul class="lhd-lines">${lines.map(line => {
    const kind = LINE_KINDS[line.kind] ?? LINE_KINDS.info;
    return `<li class="lhd-line tone-${kind.tone}"><span class="lhd-icon"><i class="${esc(line.icon ?? kind.icon)}"></i></span><span class="lhd-text">${line.html ?? esc(line.text)}</span></li>`;
  }).join("")}</ul>` : "";
  return `<div class="lhd${tone ? ` lhd-${tone}` : ""}">${head}${lead ? `<p class="lhd-lead">${esc(lead)}</p>` : ""}${list}${body}${question ? `<p class="lhd-question">${esc(question)}</p>` : ""}</div>`;
}

/**
 * A Yes / No message box; No is the default answer.
 * @param {object} options
 * @param {string} options.title      The window title
 * @param {string} [options.icon]     The window icon (Font Awesome classes)
 * @param {string} [options.content]  HTML of the body, already safe (or the parts of boxContent)
 * @param {string} [options.yes]      Label of Yes
 * @param {string} [options.no]       Label of No
 * @param {string} [options.yesIcon]
 * @param {string} [options.noIcon]
 * @param {string[]} [options.classes]  More classes for the window
 * @returns {Promise<boolean>}
 */
export async function confirmBox({ title, icon, content, yes, no, yesIcon, noIcon, classes = [], ...parts }) {
  const answer = await foundry.applications.api.DialogV2.confirm({
    window: { title, icon: icon ?? "fa-solid fa-circle-question" },
    classes: ["lhauto-dialog", "lhd-box", ...classes],
    position: { width: 440 },
    content: boxContent({ ...parts, body: content ?? parts.body ?? "" }),
    modal: true,
    rejectClose: false,
    yes: { label: yes ?? "COMMON.Yes", icon: yesIcon ?? "fa-solid fa-check" },
    no: { label: no ?? "COMMON.No", icon: noIcon ?? "fa-solid fa-xmark" }
  });
  return answer === true;
}

/**
 * A choice in a message box: one select, OK and the window's close; null when closed.
 * @param {object} options
 * @param {string} options.title      The window title
 * @param {string} [options.icon]
 * @param {string} [options.eyebrow]  Small label above the heading
 * @param {string} [options.heading]
 * @param {string} [options.img]
 * @param {string} [options.lead]     A sentence before the select
 * @param {string} [options.label]    Label of the select
 * @param {{value: string, label: string}[]} options.options
 * @param {string} [options.selected]
 * @param {string} [options.ok]       Label of OK
 * @param {string} [options.okIcon]
 * @returns {Promise<string|null>}
 */
export async function chooseBox({ title, icon, eyebrow, heading, img, lead, label, options, selected = null, ok, okIcon }) {
  const list = options.map(o => `<option value="${esc(o.value)}"${o.value === selected ? " selected" : ""}>${esc(o.label)}</option>`).join("");
  const body = `<div class="form-group lhd-field">${label ? `<label>${esc(label)}</label>` : ""}<select name="choice">${list}</select></div>`;
  const result = await foundry.applications.api.DialogV2.prompt({
    window: { title, icon: icon ?? "fa-solid fa-list-check" },
    classes: ["eternia", "lhd-box", "motor-choose"],
    content: boxContent({ eyebrow, heading, img, lead, body }),
    ok: { label: ok ?? "COMMON.Confirm", icon: okIcon ?? "fa-solid fa-check", callback: (event, button) => button.form.elements.choice.value },
    rejectClose: false
  });
  return result ?? null;
}
