/**
 * Changing the Character Rank (Log Ticket): one flow for the sheet's rank-up button and for a CR typed in the
 * sheet. A message box sums up what changes from the old CR to the new one (any number of ranks): the Base Stats
 * (+1 each per CR, with the modifiers that move), the Max HP (the class HP Modifier per CR), the skill picks, the
 * talents that unlock and what the class gives (its Path, the Magias, the Apex, the Dedications). On confirmation the
 * CR changes, a card in the chat records it (templates/chat/rank-up-card.hbs: the portrait, the CR from and to, the
 * Base Stats, what the jump gives and the class's grants by CR), the class's choices are offered and the skill
 * selection opens with the picks owed. Going down asks too, and the picks made above the new CR can be undone
 * (skill-browser.mjs).
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
import { CLASSES } from "../classes/data.mjs";
import { formOf, ROMAN } from "../races/evolution.mjs";

const STATS = ["str", "dex", "pow", "int"];

/** CR from which a Dedication can be taken (docs/classes.md). */
const DEDICATION_RANK = 5;

/** Characters with a CR change in progress (one box at a time). */
const busy = new Set();

/** The card of a CR change in the chat. */
const CARD = "systems/eternia/templates/chat/rank-up-card.hbs";

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
    const { lines, card } = await changeLines(actor, from, to);
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
    const job = getOption(actor, "class");
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor }),
      content: await foundry.applications.handlebars.renderTemplate(CARD, {
        ...card,
        up,
        from,
        to,
        name: actor.name,
        img: actor.img,
        color: CLASSES[job?.system.identifier]?.color ?? "#1f5137",
        eyebrow: R(up ? "Card.Up" : "Card.Down"),
        // The CR is in the seal: the band says who
        title: actor.name,
        label: R(up ? "Chat" : "ChatDown", { name: actor.name, to }),
        crLabel: R("Card.CR"),
        roadLabel: R("Card.Road")
      })
    });
    if (!up) return true;
    // What the class gives (its Path, the Magias, the Apex: also those still open), then the picks.
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
 * What a CR change gives: the lines of the box, and the data of the chat card (the Base Stats, a row for the HP, the
 * picks and what unlocks, and the class's grants at the ranks crossed, by CR).
 * @param {Actor} actor
 * @param {number} from
 * @param {number} to
 * @returns {Promise<{lines: object[], card: {stats: object[], rows: object[], road: object[]}}>}
 */
async function changeLines(actor, from, to) {
  const n = to - from;
  const up = n > 0;
  const lines = [];
  const card = { stats: [], rows: [], road: [] };
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
  lines.push({ html: `${escape(R("Stats", { sign, n: Math.abs(n) }))}${grid}`, kind: "gain", icon: "fa-solid fa-chart-simple" });
  card.stats = cells.map(c => ({ ...c, mod: (c.modAfter !== c.modBefore) ? R("Mod", { from: c.modBefore, to: c.modAfter }) : "" }));

  // Max HP: the class HP Modifier per CR
  const per = classStats(actor)?.hpPerRank ?? 0;
  const hpBefore = Number(actor.system.health?.max) || 0;
  const hpAfter = hpBefore + (per * n);
  lines.push({
    text: R("HP", { from: hpBefore, to: hpAfter, sign, gain: Math.abs(per * n), per }),
    kind: "gain", icon: "fa-solid fa-heart"
  });
  card.rows.push({
    icon: "fa-solid fa-heart", tone: "hp", label: R("Card.HP"), from: hpBefore, to: hpAfter,
    note: per ? R("Card.HPNote", { sign, gain: Math.abs(per * n), per }) : ""
  });
  if (!up) {
    lines.push({ text: R("DownPicks", { to }), kind: "condition", icon: "fa-solid fa-rotate-left" });
    card.rows.push({ icon: "fa-solid fa-rotate-left", tone: "warn", value: R("Card.DownPicks", { to }) });
    return { lines, card };
  }

  // Skill picks of the ranks gained
  const picks = { combat: 0, general: 0 };
  for (let rank = from + 1; rank <= to; rank++) {
    const gained = rankUpSkills(rank);
    picks.combat += gained.combat;
    picks.general += gained.general;
  }
  lines.push({ text: R("Skills", picks), kind: "gain", icon: "fa-solid fa-book-open" });
  card.rows.push({ icon: "fa-solid fa-book-open", tone: "picks", label: R("Card.Picks"), value: R("Card.PicksValue", picks) });

  // Talents that unlock (class, Magias, race, Dedications)
  const unlocks = await unlocksBetween(actor, from, to);
  const parts = ["class", "magic", "race", "dedication"].filter(k => unlocks[k] > 0)
    .map(k => R(`Unlock.${k}`, { n: unlocks[k] }));
  if (parts.length) {
    lines.push({ text: R("Unlocks", { list: parts.join(", ") }), kind: "info", icon: "fa-solid fa-lock-open" });
    card.rows.push({ icon: "fa-solid fa-lock-open", tone: "unlock", label: R("Card.Unlocks"), value: parts.join(", ") });
  }

  // The stages of the race's form that open (races/evolution.mjs): the character may evolve from the sheet
  const form = formOf(actor);
  for (const st of form.stages.filter(st => (st.stage > form.stage) && (st.rank > from) && (st.rank <= to))) {
    lines.push({ text: R("Form", { stage: ROMAN[st.stage], name: st.name }), kind: "info", icon: "fa-solid fa-paw" });
    card.rows.push({ icon: "fa-solid fa-paw", tone: "unlock", label: R("Card.Form"), value: R("Card.FormValue", { stage: ROMAN[st.stage], name: st.name }) });
  }

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
      if (owned < magicSlot) given.push({ rank, text: R("Grant.magic"), icon: "fa-solid fa-book-skull" });
      continue;
    }
    const names = (await Promise.all((grant.uuids ?? []).map(uuid => fromUuid(uuid).catch(() => null)))).filter(Boolean)
      .map(s => s.name);
    if (!names.length) continue;
    const key = (names.length > 1) ? "Grant.choice" : (grant.auto ? "Grant.auto" : "Grant.skill");
    given.push({ rank, text: R(key, { names: names.join(", "), name: names[0] }),
      icon: (names.length > 1) ? "fa-solid fa-route" : "fa-solid fa-crown" });
  }
  if ((from < DEDICATION_RANK) && (to >= DEDICATION_RANK) && job) {
    given.push({ rank: DEDICATION_RANK, text: R("Dedication"), icon: "fa-solid fa-people-arrows" });
  }
  // In CR order: the box says "CR 3: …", the card puts the CR in a seal
  given.sort((a, b) => a.rank - b.rank);
  lines.push(...given.map(g => ({ ...g, text: R("AtRank", { rank: g.rank, text: g.text }), kind: "motor" })));
  card.road = given.map(g => ({ ...g, text: g.text.charAt(0).toUpperCase() + g.text.slice(1) }));
  return { lines, card };
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
