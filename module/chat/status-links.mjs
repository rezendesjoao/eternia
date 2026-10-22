/**
 * Statuses written in chat messages become links (idea from PF2e Ctrl-Click Effects, written for the statuses of
 * the eternia system): "[Staggered]", "[Decay: 10]", "[Weakness (Flame): 5]", "[Barrier: SR×10]", in English or
 * as the Portuguese texts write them ("[Cambaleante]", "[Deterioração: 10]"…).
 *
 * Clicking one applies it to the user's targets (else the selected tokens) the way the system applies a skill's
 * effects: an Active Effect with the status data (flags.eternia.statusData), which the system mirrors in the
 * status field (Ratings keep the highest, lists add an entry) and removes with the effect. It ends with the scene
 * and names the card's skill as its origin. Actors the user doesn't own get it through the GM (the system's
 * applyItemEffects relay). A Rating written as a formula is worked out with the card skill's Skill Rank and the
 * user's Character Rank; one that is missing is asked.
 */
import { L, SYSTEM_ID, setting } from "../settings.mjs";
import { request } from "../piles/pile-socket.mjs";
import { amount } from "../automation/use.mjs";
import { actorName, escape, toInt } from "../helpers/utils.mjs";
import { statusDescription } from "../helpers/statuses.mjs";
import { LINKABLE as STATUSES, SYNONYMS } from "../helpers/status-names.mjs";

let pattern = null;
let names = null;

/** The status names of the current language and of English (lower case → status id), and the link pattern. */
function buildPattern() {
  names = new Map(Object.entries(SYNONYMS));
  for (const id of Object.keys(STATUSES)) {
    const key = `ETERNIA.StatusEffect.${id}`;
    for (const label of [game.i18n.localize(key), foundry.utils.getProperty(game.i18n._fallback ?? {}, key), id]) {
      if ((typeof label === "string") && label && (label !== key)) names.set(label.toLowerCase(), id);
    }
  }
  const alternatives = [...names.keys()].sort((a, b) => b.length - a.length).map(n => RegExp.escape?.(n) ?? n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  pattern = new RegExp(`\\[\\s*(${alternatives.join("|")})\\s*(?:\\(([^()\\[\\]]*)\\))?\\s*(?::\\s*([^\\[\\]]*?))?\\s*\\]`, "giu");
}

/** Call during the `init` hook. */
export function registerStatusLinks() {
  Hooks.once("ready", buildPattern);
  Hooks.on("renderChatMessageHTML", onRender);
}

/* -------------------------------------------- */
/*  Links                                       */
/* -------------------------------------------- */

/** Text nodes that are never linked. */
const SKIP = "a, button, input, textarea, select, .lhauto-status, .dice-tooltip, .dice-formula, .dice-total, .lhc-strip";

function onRender(message, html) {
  if (!setting("statusLinks") || !pattern) return;
  const content = html.querySelector(".message-content");
  if (!content) return;
  let linked = linkChips(content);
  if (content.textContent.includes("[")) {
    const walker = document.createTreeWalker(content, NodeFilter.SHOW_TEXT, {
      acceptNode: node => ((node.nodeValue.includes("[") && !node.parentElement?.closest(SKIP)) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT)
    });
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    for (const node of nodes) linked += linkNode(node);
  }
  if (!linked) return;
  content.addEventListener("click", event => {
    const link = event.target.closest(".lhauto-status");
    if (!link) return;
    event.preventDefault();
    event.stopPropagation();
    applyFromLink(link, message).catch(err => console.error(`${SYSTEM_ID} | Could not apply the status`, err));
  });
}

/** The status chips of the card (helpers/text-chips.mjs) that a click can apply become links; returns how many. */
function linkChips(content) {
  let linked = 0;
  for (const chip of content.querySelectorAll(".lhb-status[data-status]:not(.lhauto-status)")) {
    const def = STATUSES[chip.dataset.status];
    if (!def) continue;
    // "[Cancel: Flame]": a tag where the Rating would be.
    if (def.tagged && chip.dataset.value && !/\d|SR|CR|NH|NP/i.test(chip.dataset.value)) {
      chip.dataset.tag ||= chip.dataset.value;
      delete chip.dataset.value;
    }
    if (!def.rated) delete chip.dataset.value;
    chip.classList.add("lhauto-status");
    chip.insertAdjacentHTML("afterbegin", `<i class="fa-solid fa-hand-sparkles"></i>`);
    const tip = chip.dataset.tooltipHtml;
    if (tip) chip.dataset.tooltipHtml = tip.replace(/<\/div>$/, `<span class="lhb-tip-note">${escape(L("StatusLink.Hint"))}</span></div>`);
    else chip.dataset.tooltipText = L("StatusLink.Hint");
    linked += 1;
  }
  return linked;
}

/** Replace the statuses of a text node by links; returns how many. */
function linkNode(node) {
  const text = node.nodeValue;
  pattern.lastIndex = 0;
  const parts = [];
  let last = 0;
  for (const match of text.matchAll(pattern)) {
    const id = names.get(match[1].toLowerCase());
    if (!id) continue;
    const def = STATUSES[id];
    let tag = (match[2] ?? "").trim();
    let value = (match[3] ?? "").trim();
    // "[Cancel: Flame]": a tag where the Rating would be.
    if (def.tagged && value && !/\d|SR|CR|NH|NP/i.test(value)) {
      tag ||= value;
      value = "";
    }
    if (!def.rated) value = "";
    parts.push(text.slice(last, match.index));
    const link = document.createElement("a");
    link.className = "lhauto-status";
    link.dataset.status = id;
    if (value) link.dataset.value = value;
    if (tag) link.dataset.tag = tag;
    link.dataset.tooltipText = [statusDescription(id), L("StatusLink.Hint")].filter(Boolean).join(" · ");
    link.innerHTML = `<i class="fa-solid fa-hand-sparkles"></i>${escape(match[0])}`;
    parts.push(link);
    last = match.index + match[0].length;
  }
  if (!parts.length) return 0;
  parts.push(text.slice(last));
  node.replaceWith(...parts.filter(p => p !== ""));
  return parts.filter(p => typeof p !== "string").length;
}

/* -------------------------------------------- */
/*  Applying                                    */
/* -------------------------------------------- */

/** The item a card was made from (skill, item, use card), if it can still be found. */
export async function cardItem(message) {
  const flags = message.flags?.eternia ?? {};
  const uuid = flags.attack?.itemUuid ?? flags.damage?.itemUuid ?? String(message.content ?? "").match(/data-item-uuid="([^"]+)"/)?.[1];
  if (uuid) {
    const item = await fromUuid(uuid).catch(() => null);
    if (item) return item;
  }
  const use = flags.use;
  if (use?.item) {
    const actor = fromUuidSync(use.actorUuid);
    if (actor) return actor.items.get(use.item._id) ?? new Item.implementation(use.item, { parent: actor });
  }
  return null;
}

/** The actors of the user's targets, else of the selected tokens (each once). */
export function chosenActors() {
  const tokens = game.user.targets.size ? [...game.user.targets] : (canvas?.tokens?.controlled ?? []);
  const actors = new Map();
  for (const token of tokens) if (token.actor) actors.set(token.actor.uuid, token.actor);
  return [...actors.values()];
}

/** A Rating: a number, or a formula with the card skill's Skill Rank; null when it can't be worked out. */
function ratingOf(text, item) {
  if (!text) return null;
  if (/^\d+$/.test(text)) return toInt(text);
  if (!item) return null;
  const value = amount(text.replace(/NH/gi, "SR").replace(/NP/gi, "CR"), item);
  return (value > 0) ? value : null;
}

/** Ask for a Rating (and a tag) the text doesn't give. */
async function askRating(label, { text, tagged, tag }) {
  const result = await foundry.applications.api.DialogV2.prompt({
    window: { title: L("StatusLink.Title", { status: label }), icon: "fa-solid fa-hand-sparkles" },
    classes: ["lhauto-dialog"],
    content: `${text ? `<p>${escape(L("StatusLink.Written", { text }))}</p>` : ""}
      <div class="form-group"><label>${escape(L("StatusLink.Value"))}</label>
        <input type="number" name="value" min="1" step="1" autofocus></div>
      ${tagged ? `<div class="form-group"><label>${escape(L("StatusLink.Tag"))}</label>
        <input type="text" name="tag" value="${escape(tag)}"></div>` : ""}`,
    ok: {
      label: L("StatusLink.Apply"),
      callback: (event, button) => ({
        value: Math.max(0, Math.floor(Number(button.form.elements.value.value) || 0)),
        tag: tagged ? button.form.elements.tag.value.trim() : ""
      })
    },
    rejectClose: false
  });
  return (result?.value > 0) ? result : null;
}

/** "Decay: 10", "Weakness (Flame): 5", "Dazed". */
function statusName(id, value, tag) {
  const label = game.i18n.localize(`ETERNIA.StatusEffect.${id}`);
  return `${label}${tag ? ` (${tag})` : ""}${value ? `: ${value}` : ""}`;
}

async function applyFromLink(link, message) {
  const id = link.dataset.status;
  const def = STATUSES[id];
  if (!def) return;
  const actors = chosenActors();
  const label = game.i18n.localize(`ETERNIA.StatusEffect.${id}`);
  if (!actors.length) return ui.notifications.warn(L("StatusLink.NoTargets", { status: label }));

  const item = await cardItem(message);
  let value = null;
  let tag = link.dataset.tag ?? "";
  if (def.rated) {
    value = ratingOf(link.dataset.value ?? "", item);
    if (!value) {
      const asked = await askRating(label, { text: link.textContent.trim(), tagged: def.tagged, tag });
      if (!asked) return;
      value = asked.value;
      tag = asked.tag;
    }
  }

  const caster = item?.actor ?? ChatMessage.getSpeakerActor(message.speaker);
  const effect = statusEffectData(id, value, tag, { item, caster });
  const done = [];
  for (const actor of actors) {
    if (await giveEffects(actor, [effect])) done.push(actorName(actor));
  }
  if (done.length) ui.notifications.info(L("StatusLink.Applied", { status: effect.name, names: done.join(", ") }));
}

/**
 * The data of an effect that gives a status, as the system's skill effects do.
 * @param {string} id
 * @param {number|null} value
 * @param {string} tag
 * @param {{item?: Item|null, caster?: Actor|null, expires?: string}} [source]
 */
export function statusEffectData(id, value, tag, { item = null, caster = null, expires = "endOfScene" } = {}) {
  const status = CONFIG.statusEffects.find(s => s.id === id);
  const statusData = { statusId: id };
  if (value) statusData.value = value;
  if (tag) statusData.tag = tag;
  return {
    name: statusName(id, value, tag),
    img: status?.img ?? item?.img ?? "icons/svg/aura.svg",
    statuses: [id],
    origin: item?.uuid ?? null,
    transfer: false,
    disabled: false,
    flags: {
      [SYSTEM_ID]: {
        statusData, expires, itemUse: true, fromText: true,
        source: { itemUuid: item?.uuid ?? "", itemName: item?.name ?? statusName(id, value, tag), casterUuid: caster?.uuid ?? "", useId: foundry.utils.randomID() }
      }
    }
  };
}

/**
 * Create effects on an actor: directly when the user owns it, else through the GM (the system's relay, which
 * takes the effects marked as an item use).
 * @param {Actor} actor
 * @param {object[]} effects
 * @returns {Promise<boolean>}
 */
export async function giveEffects(actor, effects) {
  if (actor.isOwner) {
    await actor.createEmbeddedDocuments("ActiveEffect", effects);
    return true;
  }
  const result = await request("applyItemEffects", { actorUuid: actor.uuid, effects, replace: false });
  if (!result?.ok) {
    ui.notifications.warn(game.i18n.localize(result?.error ?? "ETERNIA.Piles.Error.Generic"));
    return false;
  }
  return true;
}
