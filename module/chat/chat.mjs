/**
 * Chat in the parchment look (css/chat.css): the system's cards and the rolls, shorter and calmer.
 *
 * The hook rearranges what the system rendered. It moves elements around and never re-creates them, so their
 * click listeners and the Portuguese display (i18n/display.mjs, which reads `.chat-stat` / `.chat-card-tags .tag`
 * after this hook) keep working.
 * - Slim header with the speaker's portrait; a plain roll's flavour becomes the card's title.
 * - Every roll becomes a strip: the dice as faces, the modifier, and the total in a seal. Checks show
 *   Critical (two or more 6) and Fumble (all 1), like the system's attack cards.
 * - Skill and item cards: Timing, Target and Range under the name, Check and Damage as two lines,
 *   SR / Cost / Limit as chips, and the description folded away.
 * - Combat cards: target rows and Apply buttons that fit the sidebar; applied-damage cards on one line.
 * - Round phases as a thin divider; summary cards without a repeated title.
 */
import { L, SYSTEM_ID, setting } from "../settings.mjs";
import { parseSkillField } from "../helpers/skill-fields.mjs";

const TIMING_CLASS = {
  Major: "major", "Main Process": "major", Minor: "minor", Move: "move", Instant: "instant", Action: "instant",
  Setup: "setup", Initiative: "setup", Cleanup: "cleanup", Constant: "constant",
  "Before Check": "reaction", "After Check": "reaction", "Before Damage": "reaction", "After Damage": "reaction", "Damage Roll": "reaction"
};

/** Pip positions of a d6 face in a 24×24 box. */
const PIPS = {
  1: [[12, 12]],
  2: [[7, 7], [17, 17]],
  3: [[7, 7], [12, 12], [17, 17]],
  4: [[7, 7], [17, 7], [7, 17], [17, 17]],
  5: [[7, 7], [17, 7], [12, 12], [7, 17], [17, 17]],
  6: [[7, 6.5], [17, 6.5], [7, 12], [17, 12], [7, 17.5], [17, 17.5]]
};

/** Messages whose folded description is open (kept open when the card re-renders). */
const openDescriptions = new Set();

/**
 * A label in the current language and in English, lower-cased: a message keeps the language it was
 * written in, so older cards may still carry English labels.
 */
function labelsOf(key) {
  const labels = new Set([game.i18n.localize(key)]);
  const english = foundry.utils.getProperty(game.i18n._fallback ?? {}, key);
  if (typeof english === "string") labels.add(english);
  return [...labels].map(l => l.trim().toLowerCase());
}

/** Call during the `init` hook. */
export function registerChat() {
  Hooks.on("renderChatMessageHTML", onRender);
  // The chat theme also dresses other modules' parts (TBG cards, bubbles and tabs: css/tbg.css) through a body class.
  const sync = () => document.body.classList.toggle("lhauto-chat", !!setting("chatTheme"));
  Hooks.once("ready", sync);
  Hooks.on("updateSetting", doc => { if (doc.key === `${SYSTEM_ID}.chatTheme`) sync(); });
}

function onRender(message, html) {
  if (!setting("chatTheme")) return;
  const content = html.querySelector(".message-content");
  if (!content) return;
  const card = content.querySelector(".eternia.chat-card, .lhauto-card");
  const rolls = [...content.querySelectorAll(".dice-roll")];
  if (!card && !rolls.length) return;
  html.classList.add("lhc-msg");
  try {
    portrait(message, html);
    let check = false;
    if (!card) check = rollTitle(message, html, content);
    else markCard(card, html);
    const fresh = (Date.now() - (message.timestamp ?? 0)) < 5000;
    for (const roll of rolls) rollStrip(roll, card, { check, fresh });
    if (card?.matches(".skill-chat-card, .item-use-card")) itemCard(message, card);
    else if (card?.querySelector(".chat-card-description")) foldDescription(message, card);
    if (card?.matches(".lh-applied-card")) appliedCard(card);
    if (card?.matches(".lhauto-card, .lh-expiry-card")) summaryCard(message, card);
    if (card?.matches(".lh-phase-card")) phaseCard(card);
  }
  catch (err) {
    console.error(`${SYSTEM_ID} | Could not arrange a chat card`, err);
  }
}

/* -------------------------------------------- */
/*  Frame                                       */
/* -------------------------------------------- */

/** The speaker's portrait in the header (only for actors: an alias like "Round 2" has none). */
function portrait(message, html) {
  const header = html.querySelector(".message-header");
  const actor = ChatMessage.getSpeakerActor(message.speaker);
  if (!header || !actor?.img || header.querySelector(".lhc-portrait")) return;
  const img = document.createElement("img");
  img.className = "lhc-portrait";
  img.src = actor.img;
  img.alt = "";
  header.prepend(img);
}

/** Classes on the message for the cards that look different (phase divider, expiry list). */
function markCard(card, html) {
  if (card.matches(".lh-phase-card")) html.classList.add("lhc-phase");
  if (card.matches(".lh-expiry-card")) html.classList.add("lhc-expiry");
  const skill = card.matches(".skill-chat-card[data-item-uuid]") ? fromUuidSync(card.dataset.itemUuid) : null;
  if (skill?.system?.timing) card.dataset.timing = TIMING_CLASS[parseSkillField("timing", skill.system.timing).type] ?? "other";
}

/**
 * A plain roll: its flavour ("Ability Score Check - Athletics", "Pincer Break - Check (Accuracy) vs
 * Evasion") becomes a title with a small kicker above it. Returns whether the roll is a check.
 */
function rollTitle(message, html, content) {
  html.classList.add("lhc-plain");
  const flavor = html.querySelector(".message-header .flavor-text")?.textContent.trim() ?? "";
  const abilityChecks = labelsOf("ETERNIA.WindowTitle.AbilityCheck");
  const checkWords = labelsOf("ETERNIA.Skill.Label.Check");
  let name = flavor, kicker = "", ability = false, skillCheck = false;
  const cut = flavor.indexOf(" - ");
  if (cut > 0) {
    const first = flavor.slice(0, cut), rest = flavor.slice(cut + 3);
    ability = abilityChecks.includes(first.trim().toLowerCase());
    skillCheck = checkWords.some(w => rest.toLowerCase().startsWith(w));
    [name, kicker] = ability ? [rest, first] : [first, rest];
  }
  if (name) {
    const title = document.createElement("div");
    title.className = "lhc-title";
    title.innerHTML = `${kicker ? `<span class="lhc-kicker"></span>` : ""}<span class="lhc-name"></span>`;
    if (kicker) title.querySelector(".lhc-kicker").textContent = kicker;
    title.querySelector(".lhc-name").textContent = name;
    content.prepend(title);
  }
  return ability || skillCheck || !!message.getFlag(SYSTEM_ID, "rerollOf");
}

/* -------------------------------------------- */
/*  Rolls                                       */
/* -------------------------------------------- */

/** One die: a d6 as a face with pips, any other die as a numbered tile. */
function dieHTML({ value, faces, off }, index) {
  const cls = `lhc-die${off ? " off" : ""}`;
  const style = `style="--i: ${index}"`;
  if ((faces === 6) && PIPS[value]) {
    const pips = PIPS[value].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2.1"></circle>`).join("");
    return `<svg class="${cls}" data-v="${value}" ${style} viewBox="0 0 24 24" aria-hidden="true"><rect x="1.5" y="1.5" width="21" height="21" rx="5"></rect>${pips}</svg>`;
  }
  return `<span class="${cls} lhc-num" data-v="${value}" ${style}>${value}</span>`;
}

/**
 * The strip of a roll: dice, modifier, total. The roll's own formula, total and tooltip stay in the
 * DOM (hidden), so a click still opens Foundry's breakdown and other code can read them.
 */
function rollStrip(rollEl, card, { check, fresh }) {
  if (rollEl.querySelector(".lhc-strip")) return;
  const result = rollEl.querySelector(".dice-result") ?? rollEl;
  const totalText = rollEl.querySelector(".dice-total")?.textContent.trim() ?? "";
  const total = Number(totalText);
  const dice = [...rollEl.querySelectorAll(".dice-tooltip .roll.die")].map(li => ({
    value: Number(li.textContent.trim()),
    faces: Number(/\bd(\d+)\b/.exec(li.className)?.[1]) || 6,
    off: li.classList.contains("discarded") || li.classList.contains("rerolled")
  })).filter(d => Number.isFinite(d.value));
  const kept = dice.filter(d => !d.off);
  const mod = (dice.length && Number.isFinite(total)) ? total - kept.reduce((sum, d) => sum + d.value, 0) : 0;

  // What kind of roll, and how it came out
  let kind = "check";
  if (card?.matches(".lh-damage-card")) {
    const healOnly = card.querySelector('.lh-apply[data-mode="heal"]') && !card.querySelector('.lh-apply[data-mode="damage"]');
    kind = healOnly ? "heal" : "damage";
  }
  let outcome = "";
  if (card?.querySelector(".lh-outcome.critical")) outcome = "critical";
  else if (card?.querySelector(".lh-outcome.fumble")) outcome = "fumble";
  else if (!card && check) {
    const sixes = kept.filter(d => d.faces === 6);
    if (sixes.length && sixes.every(d => d.value === 1)) outcome = "fumble";
    else if (sixes.filter(d => d.value === 6).length >= 2) outcome = "critical";
  }

  const strip = document.createElement("div");
  strip.className = `lhc-strip${fresh ? " lhc-fresh" : ""}`;
  strip.dataset.kind = kind;
  if (outcome) strip.dataset.outcome = outcome;
  const formula = rollEl.querySelector(".dice-formula")?.textContent.trim();
  if (formula) strip.dataset.tooltip = formula;
  const modText = mod ? `<span class="lhc-mod">${mod > 0 ? "+" : "−"}${Math.abs(mod)}</span>` : "";
  strip.innerHTML = `<div class="lhc-dice">${dice.map(dieHTML).join("")}${modText}</div>
    <div class="lhc-total"><span></span></div>`;
  strip.querySelector(".lhc-total span").textContent = totalText || "?";
  result.prepend(strip);

  // Checks outside the system's cards get the Critical / Fumble ribbon (the cards have their own).
  if (outcome && !card) {
    const ribbon = document.createElement("div");
    ribbon.className = `lhc-outcome ${outcome}`;
    ribbon.textContent = game.i18n.localize(`ETERNIA.Combat.${outcome === "critical" ? "Critical" : "Fumble"}`);
    strip.after(ribbon);
  }
}

/* -------------------------------------------- */
/*  Skill and item cards                        */
/* -------------------------------------------- */

/** Which field a `.chat-stat` is, from its label. */
function statKinds() {
  const labels = keys => keys.flatMap(labelsOf);
  return {
    check: labels(["ETERNIA.Skill.Label.Check", "ETERNIA.Item.Label.Check"]),
    damage: labels(["ETERNIA.Skill.Label.Damage"]),
    sr: labels(["ETERNIA.Skill.Label.SR"]),
    timing: labels(["ETERNIA.Skill.Label.Timing", "ETERNIA.Item.Label.Timing"]),
    target: labels(["ETERNIA.Skill.Label.Target", "ETERNIA.Item.Label.Target"]),
    range: labels(["ETERNIA.Skill.Label.Range", "ETERNIA.Item.Label.Range"]),
    cost: labels(["ETERNIA.Skill.Label.Cost"]),
    limit: labels(["ETERNIA.Skill.Label.Limit"])
  };
}

/**
 * Skill and usable-item cards: Timing · Target · Range under the name; Check and Damage as a small
 * table; SR, Cost and Limit as chips; the description folded. The `.chat-stat` elements are moved
 * whole (label and value inside) so their translation still finds them.
 */
function itemCard(message, card) {
  const statBox = card.querySelector(":scope > .chat-card-stats");
  if (statBox && !card.querySelector(".lhc-spec")) {
    const kinds = statKinds();
    const empties = new Set(labelsOf("None"));
    const groups = { sub: [], spec: [], chips: [] };
    for (const stat of [...statBox.querySelectorAll(":scope > .chat-stat")]) {
      const label = stat.querySelector(".chat-stat-label")?.textContent.trim().toLowerCase();
      const value = stat.querySelector(".chat-stat-value")?.textContent.trim() ?? "";
      if (!value || /^[\p{Pd}−]+$/u.test(value) || empties.has(value.toLowerCase())) stat.classList.add("lhc-empty");
      const kind = Object.keys(kinds).find(k => kinds[k].includes(label));
      if (["timing", "target", "range"].includes(kind)) groups.sub.push(stat);
      else if (["check", "damage"].includes(kind)) groups.spec.push(stat);
      else groups.chips.push(stat);
    }
    const box = (cls, stats) => {
      if (!stats.some(s => !s.classList.contains("lhc-empty"))) return null;
      const el = document.createElement("div");
      el.className = cls;
      el.append(...stats);
      return el;
    };
    const sub = box("lhc-sub", groups.sub);
    if (sub) card.querySelector(".chat-card-title")?.append(sub);
    const spec = box("lhc-spec", groups.spec);
    const chips = box("lhc-chips", groups.chips);
    statBox.after(...[spec, chips].filter(Boolean));
    statBox.remove();
  }
  foldDescription(message, card);
}

/** The card's description folded under a one-line peek; open ones stay open across re-renders. */
function foldDescription(message, card) {
  const description = card.querySelector(":scope > .chat-card-description");
  if (!description || description.closest("details")) return;
  const details = document.createElement("details");
  details.className = "lhc-desc";
  details.open = openDescriptions.has(message.id);
  const summary = document.createElement("summary");
  summary.innerHTML = '<i class="fa-solid fa-caret-right"></i><span class="lhc-desc-label"></span><span class="lhc-desc-peek"></span>';
  summary.querySelector(".lhc-desc-label").textContent = L("Chat.Description");
  summary.querySelector(".lhc-desc-peek").textContent = description.textContent.replace(/\s+/g, " ").trim();
  description.before(details);
  details.append(summary, description);
  details.addEventListener("toggle", () => {
    if (details.open) openDescriptions.add(message.id);
    else openDescriptions.delete(message.id);
  });
}

/* -------------------------------------------- */
/*  Other cards                                 */
/* -------------------------------------------- */

/** Applied damage: who and which skill on one line that never wraps, the result as a pill. */
function appliedCard(card) {
  const title = card.querySelector(".lh-applied-title");
  const pill = title?.querySelector(".lh-applied");
  if (!title || !pill || title.querySelector(".lhc-who")) return;
  const who = document.createElement("span");
  who.className = "lhc-who";
  while (title.firstChild && (title.firstChild !== pill)) who.append(title.firstChild);
  title.prepend(who);
  if (/^\s*\+/.test(pill.textContent)) pill.classList.add("heal");
}

/** The summary cards (utils.mjs postSummary): no title when it repeats the speaker's name. */
function summaryCard(message, card) {
  const header = card.querySelector(":scope > .chat-card-header");
  const title = header?.querySelector("h3")?.textContent.trim();
  if (title && (title === (message.speaker?.alias ?? "").trim())) header.remove();
}

/** Round phase: a thin divider; the long hint becomes its tooltip. */
function phaseCard(card) {
  const hint = card.querySelector(":scope > p");
  if (!hint) return;
  card.dataset.tooltip = hint.textContent.trim();
  hint.remove();
}
