/**
 * Changing the Character Rank (Log Ticket): one flow for the sheet's rank-up button and for a CR typed in the
 * sheet. A message box sums up what changes from the old CR to the new one (any number of ranks): the Base Stats
 * (+1 each per CR, with the modifiers that move), the Max HP (the class HP Modifier per CR), the skill picks, the
 * talents that unlock and what the class gives (its Path, the Magias, the Apex, the Dedications). On confirmation the
 * CR changes, the chat records it, the class's choices are offered and the skill selection opens with the picks
 * owed. Going down asks too, and the picks made above the new CR can be undone (skill-browser.mjs).
 *
 * Base Stats and Max HP follow the CR on their own (EterniaActor#prepareDerivedData): this only explains and orders.
 * A CR typed in the sheet is held back (preUpdateActor) and goes through the same box; an update made with
 * `{ eterniaRankUp: true }` or `{ eterniaLevelFlow: false }` skips it (macros, migrations).
 */

import { L } from "../settings.mjs";
import { classStats, getOption } from "../helpers/character-options.mjs";
import { magicsOf, offerGrants } from "./option-grants.mjs";
import { SkillBrowser, rankUpSkills, startSkillProgress, unlocksBetween } from "./skill-browser.mjs";
import { confirmBox } from "../helpers/dialogs.mjs";
import { escape } from "../helpers/utils.mjs";

const STATS = ["str", "dex", "pow", "int"];

/** CR from which a Dedication can be taken (docs/classes.md). */
const DEDICATION_RANK = 5;

/** Characters with a CR change in progress (one box at a time). */
const busy = new Set();

const rankOf = actor => Math.max(1, Number(actor.system.infos?.crank) || 1);
const R = (key, data) => (data ? game.i18n.format(`ETERNIA.RankUp.${key}`, data) : game.i18n.localize(`ETERNIA.RankUp.${key}`));

/**
 * Raise the Character Rank of a character by one, after confirmation.
 * @param {Actor} actor
 * @returns {Promise<boolean>} The rank was raised
 */
export function rankUp(actor) {
  return levelTo(actor, rankOf(actor) + 1);
}

/**
 * Take a character to a CR, after the box with what changes.
 * @param {Actor} actor
 * @param {number} target
 * @returns {Promise<boolean>} The CR changed
 */
export async function levelTo(actor, target) {
  const from = rankOf(actor);
  const to = Math.max(1, Math.floor(Number(target) || 1));
  if ((to === from) || busy.has(actor.id)) return false;
  busy.add(actor.id);
  try {
    const up = to > from;
    const lines = await changeLines(actor, from, to);
    const confirmed = await confirmBox({
      title: R(up ? "Window" : "WindowDown"),
      icon: up ? "fa-solid fa-angles-up" : "fa-solid fa-angles-down",
      classes: ["rank-up-dialog"],
      width: 500,
      img: actor.img,
      eyebrow: R(up ? "Button" : "Down"),
      heading: actor.name,
      lead: R(up ? ((to - from > 1) ? "ConfirmMany" : "Confirm") : "ConfirmDown", { from, to, n: Math.abs(to - from) }),
      lines,
      question: R(up ? "After" : "DownAfter", { to }),
      yes: R(up ? "YesUp" : "YesDown", { to }),
      yesIcon: up ? "fa-solid fa-angles-up" : "fa-solid fa-angles-down",
      no: L("Use.Cancel")
    });
    if (!confirmed) {
      // A CR typed in the sheet goes back to the one the character has.
      if (actor.sheet?.rendered) actor.sheet.render();
      return false;
    }

    // The skill picks owed follow the CR from here (see skill-browser.mjs).
    if (up) await startSkillProgress(actor, from);
    await actor.update({ "system.infos.crank": to }, { eterniaRankUp: true });
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor }),
      content: `<div class="eternia rank-up-card"><h3><i class="fa-solid fa-angles-${up ? "up" : "down"}"></i> `
        + `${escape(R(up ? "Chat" : "ChatDown", { name: actor.name, to }))}</h3>`
        + `<ul>${lines.filter(l => l.chat !== false).map(l => `<li>${l.plain ?? escape(l.text)}</li>`).join("")}</ul></div>`
    });
    if (!up) return true;
    // What the class gives (its Path, the Magias, the Apex: also those still open), then the picks.
    const job = getOption(actor, "class");
    if (job) await offerGrants(actor, job, { above: 1, withStale: false });
    SkillBrowser.open(actor);
    return true;
  }
  finally {
    busy.delete(actor.id);
  }
}

/* -------------------------------------------- */
/*  What changes                                */
/* -------------------------------------------- */

/**
 * The lines of the box (and of the chat card) for a CR change.
 * @param {Actor} actor
 * @param {number} from
 * @param {number} to
 * @returns {Promise<object[]>}  Lines of confirmBox, with `plain` (chat HTML) where it differs
 */
async function changeLines(actor, from, to) {
  const n = to - from;
  const up = n > 0;
  const lines = [];
  const sign = up ? "+" : "−";

  // Base Stats: +1 (or −1) each per CR; the modifier is a third of the total
  const attributes = actor.system.attributes ?? {};
  const cells = STATS.map(key => {
    const before = Number(attributes[key]?.total) || 0;
    const after = before + n;
    const modBefore = Math.floor(before / 3);
    const modAfter = Math.floor(after / 3);
    return { key, label: L(`Classes.Attr.${key}`), before, after, modBefore, modAfter };
  });
  const grid = `<span class="lhd-stats">${cells.map(c => `<span class="lhd-stat"><b>${escape(c.label)}</b>`
    + `<span>${c.before} → <strong>${c.after}</strong></span>`
    + `${(c.modAfter !== c.modBefore) ? `<em>${escape(R("Mod", { from: c.modBefore, to: c.modAfter }))}</em>` : ""}</span>`).join("")}</span>`;
  const statsText = R("Stats", { sign, n: Math.abs(n) });
  lines.push({
    html: `${escape(statsText)}${grid}`, kind: "gain", icon: "fa-solid fa-chart-simple",
    plain: `${escape(statsText)}: ${cells.map(c => `${escape(c.label)} ${c.before} → ${c.after}`).join(", ")}`
  });

  // Max HP: the class HP Modifier per CR
  const per = classStats(actor)?.hpPerRank ?? 0;
  const hpBefore = Number(actor.system.health?.max) || 0;
  lines.push({
    text: R("HP", { from: hpBefore, to: hpBefore + (per * n), sign, gain: Math.abs(per * n), per }),
    kind: "gain", icon: "fa-solid fa-heart"
  });
  if (!up) {
    lines.push({ text: R("DownPicks", { to }), kind: "condition", icon: "fa-solid fa-rotate-left", chat: false });
    return lines;
  }

  // Skill picks of the ranks gained
  const picks = { combat: 0, general: 0 };
  for (let rank = from + 1; rank <= to; rank++) {
    const gained = rankUpSkills(rank);
    picks.combat += gained.combat;
    picks.general += gained.general;
  }
  lines.push({ text: R("Skills", picks), kind: "gain", icon: "fa-solid fa-book-open" });

  // Talents that unlock (class, Magias, race, Dedications)
  const unlocks = await unlocksBetween(actor, from, to);
  const parts = ["class", "magic", "race", "dedication"].filter(k => unlocks[k] > 0)
    .map(k => R(`Unlock.${k}`, { n: unlocks[k] }));
  if (parts.length) lines.push({ text: R("Unlocks", { list: parts.join(", ") }), kind: "info", icon: "fa-solid fa-lock-open" });

  // What the class gives at the ranks crossed, in CR order: a choice (the Path), a Magia, a skill given (the Apex),
  // the Dedications
  const job = getOption(actor, "class");
  const given = [];
  let magicSlot = 0;
  const owned = magicsOf(actor).length;
  for (const grant of job?.system.grants ?? []) {
    if (grant.magic) magicSlot += 1;
    const rank = Number(grant.rank) || 1;
    if ((rank <= from) || (rank > to)) continue;
    if (grant.magic) {
      if (owned < magicSlot) given.push({ rank, text: R("Grant.magic", { rank }), kind: "motor", icon: "fa-solid fa-book-skull" });
      continue;
    }
    const names = (await Promise.all((grant.uuids ?? []).map(uuid => fromUuid(uuid).catch(() => null)))).filter(Boolean)
      .map(s => s.name);
    if (!names.length) continue;
    const key = (names.length > 1) ? "Grant.choice" : (grant.auto ? "Grant.auto" : "Grant.skill");
    given.push({ rank, text: R(key, { rank, names: names.join(", "), name: names[0] }), kind: "motor",
      icon: (names.length > 1) ? "fa-solid fa-route" : "fa-solid fa-crown" });
  }
  if ((from < DEDICATION_RANK) && (to >= DEDICATION_RANK) && job) {
    given.push({ rank: DEDICATION_RANK, text: R("Dedication", { rank: DEDICATION_RANK }), kind: "motor", icon: "fa-solid fa-people-arrows" });
  }
  lines.push(...given.sort((a, b) => a.rank - b.rank));
  return lines;
}

/* -------------------------------------------- */
/*  A CR typed in the sheet                     */
/* -------------------------------------------- */

/** Call during the `init` hook. */
export function registerLevelFlow() {
  // A CR typed in the sheet (or changed by an update without the flags) waits for the box: the rest of the update
  // goes through, and the box changes the CR on confirmation.
  Hooks.on("preUpdateActor", (actor, changes, options) => {
    if ((actor.type !== "character") || options.eterniaRankUp || (options.eterniaLevelFlow === false)) return;
    if (!foundry.utils.hasProperty(changes, "system.infos.crank") || !getOption(actor, "class")) return;
    const to = Math.max(1, Math.floor(Number(foundry.utils.getProperty(changes, "system.infos.crank")) || 1));
    delete changes.system.infos.crank;
    if (to !== rankOf(actor)) levelTo(actor, to);
  });
}
