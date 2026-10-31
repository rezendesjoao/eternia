/**
 * The parchment character sheet: the system's sheet logic (EterniaActorSheet) with new templates, laid
 * out like the Pathfinder 2e character sheet. A green banner on the left keeps what is used in play
 * (HP, Barrier, Hate, Fatigue, defenses, combat checks, statuses); the header has the name, what the character is
 * (race, class, profession), Fate and the CR; the tabs, each with its name and what waits in it, hold the character
 * (portrait, race / class / profession, the attributes with their checks), the skills, the class, the Magias, the
 * inventory, the profession, the effects and the bio. A character still blank opens the creation wizard from here.
 *
 * Every selector and data-action the parent class relies on is kept in templates/character/
 * (.item[data-item-id], .equip-slot, .inventory-list, .option-field, the status panel, tag input and
 * ticket partials, the tab groups…), so equipping, rolling, tickets and effects keep working.
 */
import { L, SYSTEM_ID } from "../settings.mjs";
import { parseSkillField } from "../helpers/skill-fields.mjs";
import { useItem } from "../helpers/item-use.mjs";
import { removeBadStatus } from "../automation/fate.mjs";
import { itemSkillsOf, linkedSkill } from "../content/content.mjs";
import { actorName, escape, toInt } from "../helpers/utils.mjs";
import { isEmpty, tagLabel, term } from "../i18n/terms.mjs";
import { EterniaActorSheet } from "./actor-sheet.mjs";
import { allocateBonusPoints } from "../apps/stat-allocation.mjs";
import { professionAction, professionContext } from "../professions/sheet.mjs";
import { activateClassTab, classAction, classBadges, classContext } from "../classes/sheet.mjs";
import { CreationWizard } from "../apps/creation-wizard.mjs";
import { OptionBrowser } from "../apps/option-browser.mjs";
import { CLASSES } from "../classes/data.mjs";
import { motorDef, motorName } from "../classes/motor.mjs";
import { professionOf, rankTitle } from "../professions/state.mjs";
import { PROFESSIONS, TALENTS } from "../professions/data.mjs";
import { categoryOf, categoryView } from "../apps/magic-catalog.mjs";
import { formOf, openEvolution, raceColor, regress, ROMAN } from "../races/evolution.mjs";
import { raceBadgeOf, raceContext } from "../races/sheet.mjs";
import { portraitFit } from "../helpers/portrait.mjs";
import { addXp, xpView } from "../experience/level.mjs";
import { boostsOf } from "../experience/boosts.mjs";
import { giveTickets, ticketCount } from "../experience/tickets.mjs";
import { byText, needsRollData } from "./sheet-render.mjs";

const DIR = `systems/eternia/templates/character`;
const PARTIALS = ["sidebar", "character", "skills", "race", "inventory", "class", "magic", "profession", "effects", "biography"];

const TABS = [
  // Portrait, race / class / profession, the attributes with their checks
  { id: "character", icon: "fa-solid fa-address-card" },
  { id: "skills", icon: "fa-solid fa-wand-sparkles" },
  // The race and the five stages of its form (module/races/)
  { id: "race", icon: "fa-solid fa-people-group" },
  // The class and its Motor (module/classes/)
  { id: "class", icon: "fa-solid fa-chess-knight" },
  // The Magias of the class's slots, with their spells
  { id: "magic", icon: "fa-solid fa-hat-wizard" },
  { id: "inventory", icon: "fa-solid fa-backpack" },
  // The profession (the subclass, module/professions/)
  { id: "profession", icon: "fa-solid fa-hammer" },
  { id: "effects", icon: "fa-solid fa-person-rays" },
  { id: "biography", icon: "fa-solid fa-book-open-reader" }
];

/** Groups of the skills tab by Timing (as parseSkillField reads it), in display order. */
export const TIMING_GROUPS = [
  { id: "major", timings: ["Major", "Main Process"] },
  { id: "minor", timings: ["Minor"] },
  { id: "move", timings: ["Move"] },
  { id: "instant", timings: ["Instant", "Action"] },
  { id: "reaction", timings: ["Before Check", "After Check", "Damage Roll", "Before Damage", "After Damage"] },
  { id: "setup", timings: ["Setup", "Initiative"] },
  { id: "cleanup", timings: ["Cleanup"] },
  { id: "constant", timings: ["Constant"] },
  { id: "downtime", timings: ["Pre-Play", "Interlude", "Briefing", "Rest Time"] },
  { id: "other", timings: [] }
];

export const ATTRIBUTES = [
  { key: "str", checks: ["athletics", "endurance"] },
  { key: "dex", checks: ["disable", "operation"] },
  { key: "pow", checks: ["perception", "negotiation"] },
  { key: "int", checks: ["knowledge", "analysis"] }
];
export const COMBAT_CHECKS = ["accuracy", "evasion", "resistance"];
const ITEM_TYPES = ["weapon", "armor", "shield", "accessory", "bag", "mount", "usable", "gear"];

/** The panes of the bio tab: the profile, the story, the connections and unions, the notes. */
const BIO_PANES = ["profile", "story", "ties", "notes"];
/** The bio's personal data (flags.eternia.bio, the guild in the system's field), four to a row. */
const BIO_DATA = ["age", "gender", "height", "weight", "eyes", "hair", "homeland", "guild"];
/** The bio's personality, two to a row, each with its icon. */
const BIO_TRAITS = [
  { key: "temperament", icon: "fa-solid fa-masks-theater" },
  { key: "ideals", icon: "fa-solid fa-scale-balanced" },
  { key: "goal", icon: "fa-solid fa-compass" },
  { key: "fear", icon: "fa-solid fa-ghost" },
  { key: "likes", icon: "fa-solid fa-heart" },
  { key: "dislikes", icon: "fa-solid fa-heart-crack" }
];

/**
 * What an item says of whoever has it: the italic paragraph after the rule (`<hr>`) that ends the descriptions of the
 * races, classes, professions and Magias, as plain text ("" when it has none).
 * @param {Item} item
 */
function flavorOf(item) {
  const parts = String(item?.system?.description ?? "").split(/<hr\s*\/?>/i);
  if (parts.length < 2) return "";
  return plainText(parts.at(-1));
}

/** The text of a piece of HTML (kept by text: the bio reads the same origins on every render). */
const plainText = byText(html => {
  const box = document.createElement("div");
  box.innerHTML = html;
  return box.textContent.replace(/\s+/g, " ").trim();
});

/**
 * Paper doll of the inventory tab (templates/character/inventory.hbs): a 480×300 stage with the figure in the
 * middle 160px, the slot cards (160×44) in the side columns, and a line from each card to the body part it
 * stands for: accessories on the head, the neck and the shoulders, armor on the chest, the bag on the hip,
 * the weapons in the hands.
 */
const DOLL = {
  acc0: { side: "left", top: 6, point: [228, 30] },
  acc1: { side: "left", top: 62, point: [239, 51] },
  acc2: { side: "left", top: 118, point: [205, 70] },
  main: { side: "left", top: 180, point: [193.5, 166] },
  armor: { side: "right", top: 72, point: [255, 102] },
  bag: { side: "right", top: 126, point: [261, 147] },
  off: { side: "right", top: 180, point: [286.5, 166] }
};
const CARD = { width: 160, height: 44, elbow: 12 };

/** Where a doll slot's card sits and the polyline from the card to its body point. */
function dollPlace(pos) {
  const { side, top, point: [x, y] } = DOLL[pos];
  const cy = top + (CARD.height / 2);
  const edge = (side === "left") ? CARD.width : 480 - CARD.width;
  const knee = (side === "left") ? edge + CARD.elbow : edge - CARD.elbow;
  return { side, top, x, y, line: `${edge},${cy} ${knee},${cy} ${x},${y}` };
}

/** "athletics" -> "Athletics" (the key the system's roll-check action localizes) */
const checkName = key => key.charAt(0).toUpperCase() + key.slice(1);
export const signed = n => (n >= 0 ? `+${n}` : `${n}`);

/** A check as the sheet shows it (the banner's combat checks, the character tab's attribute checks): a click rolls it. */
function checkView(system, key, attr) {
  const c = system.checks?.[key] ?? {};
  const dice = toInt(c.dice) || 2, value = toInt(c.total);
  return {
    key, attr, name: checkName(key), label: game.i18n.localize(`ETERNIA.Check.${checkName(key)}`),
    dice, total: value, mod: signed(value), tier: Math.clamp(dice - 1, 1, 5)
  };
}

/** Enter in a number field (the banner, the header, the gold) saves it (blur) instead of keeping the focus. */
const blurOnEnter = field => field.addEventListener("keydown", event => {
  if (event.key === "Enter") {
    event.preventDefault();
    field.blur();
  }
});

/** The boxes of each tab that scroll, besides its content (each tab's part keeps them across its renders). */
const TAB_SCROLL = {
  skills: ["basic", "general", "combat"].map(t => `.tab[data-group="skills"][data-tab="${t}"] > .tab-content`),
  class: [".lhcl-panels"],
  magic: [".lhmg-page"],
  effects: ["list", "status"].map(t => `.tab[data-group='effects'][data-tab='${t}'] > .tab-content`),
  biography: BIO_PANES.map(p => `.tab[data-group="bio"][data-tab="${p}"] > .tab-content`)
};

/**
 * The active statuses of a status panel (the system's getStatusPanel), as the sidebar tags: rated ones with their
 * value, list ones with their entries.
 * @param {object[]} panel
 */
export function activeStatuses(panel) {
  const entry = v => ((v && typeof v === "object") ? [v.tag, v.value].filter(x => x !== undefined && x !== "").join(" ") : String(v));
  return (panel ?? []).flatMap(group => group.statuses.filter(s => s.active).map(s => {
    let detail = "";
    if (s.list && Array.isArray(s.value) && s.value.length) detail = s.value.map(entry).join(", ");
    else if (s.rated && toInt(s.value)) detail = String(toInt(s.value));
    return { id: s.id, img: s.img, label: detail ? `${s.label} ${detail}` : s.label };
  }));
}

/** The summary of a skill or item: its tags, its fields and its text. */
export async function summaryHTML(item) {
  const s = item.system;
  const fields = [
    ["ETERNIA.Item.Label.Timing", "timing"], ["ETERNIA.Item.Label.Check", "checkType"],
    ["ETERNIA.Item.Label.Target", "target"], ["ETERNIA.Item.Label.Range", "range"],
    ["ETERNIA.Sheet.Cost", "cost"], ["ETERNIA.Sheet.Limit", "limit"], ["ETERNIA.Sheet.Damage", "damageLabel"]
  ].filter(([, key]) => !isEmpty(s[key])).map(([label, key]) =>
    `<span class="field"><b>${escape(game.i18n.localize(label))}</b> ${escape(key === "damageLabel" ? s[key] : term(key === "checkType" ? "check" : key, s[key]))}</span>`);
  const tags = (s.tags ?? []).map(t => `<li class="tag">${escape(tagLabel(t))}</li>`).join("");
  const text = await foundry.applications.ux.TextEditor.implementation.enrichHTML(s.description ?? "", {
    relativeTo: item, rollData: item.getRollData?.() ?? {}, secrets: item.isOwner
  });
  return `${tags ? `<ul class="tags">${tags}</ul>` : ""}
    ${fields.length ? `<div class="fields">${fields.join("")}</div>` : ""}
    <div class="description">${text || `<p class="empty">${escape(L("Sheet.NoDescription"))}</p>`}</div>`;
}

/**
 * The summaries a sheet opens from the names of its rows (`.item[data-item-id]` with an `.item-summary`), kept
 * open across its re-renders.
 */
export class Summaries {
  #open = new Set();

  /** @param {foundry.applications.sheets.ActorSheetV2} sheet */
  constructor(sheet) {
    this.sheet = sheet;
  }

  /** Open or close the summary of the row the clicked element is in. */
  async toggle(target) {
    const row = target.closest(".item[data-item-id]");
    const summary = row?.querySelector(":scope > .item-summary");
    if (!summary) return;
    if (!summary.hidden) {
      summary.hidden = true;
      row.classList.remove("expanded");
      this.#open.delete(row.dataset.itemId);
      return;
    }
    this.#open.add(row.dataset.itemId);
    await this.#show(row);
  }

  /**
   * After a render: the summaries that were open open again (the ones of deleted items are forgotten). One still open
   * is in a part the render kept: it stays as it is.
   */
  restore(root) {
    for (const id of this.#open) {
      const row = root.querySelector(`.item[data-item-id="${id}"]`);
      if (!row) this.#open.delete(id);
      else if (row.querySelector(":scope > .item-summary")?.hidden !== false) this.#show(row, { animate: false });
    }
  }

  async #show(row, { animate = true } = {}) {
    const item = this.sheet.actor.items.get(row.dataset.itemId);
    const summary = row.querySelector(":scope > .item-summary");
    if (!item || !summary) return;
    summary.innerHTML = await summaryHTML(item);
    summary.hidden = false;
    row.classList.add("expanded");
    if (animate) summary.animate([{ opacity: 0, transform: "translateY(-4px)" }, { opacity: 1, transform: "none" }], { duration: 160, easing: "ease-out" });
  }
}

export class EterniaCharacterSheet extends EterniaActorSheet {

  static DEFAULT_OPTIONS = {
    classes: ["lhauto", "lhpf", "character", "themed", "theme-light"],
    position: { width: 940, height: 780 },
    window: { resizable: true },
    actions: {
      "lhauto-summary": EterniaCharacterSheet.#onSummary,
      // A blank character's race / class / subclass field opens the creation wizard (else the option browser)
      "option-browse": EterniaCharacterSheet.#onOptionBrowse,
      "lhpf-open-item": EterniaCharacterSheet.#onOpenItem,
      "lhpf-wizard": EterniaCharacterSheet.#onWizard,
      // The race card's seal: the stage of the form, and the box to evolve (races/evolution.mjs)
      "lhpf-evolve": EterniaCharacterSheet.#onEvolve,
      // The race tab: going back one stage (the GM), choosing the race of a character without one
      "lhpf-regress": EterniaCharacterSheet.#onRegress,
      "lhpf-race-browse": EterniaCharacterSheet.#onRaceBrowse,
      "lhauto-fate": EterniaCharacterSheet.#onFate,
      // The XP of the header (the GM): give or take XP, give Evolution Tickets
      "lhpf-xp": EterniaCharacterSheet.#onXp,
      "lhauto-remove-bad": EterniaCharacterSheet.#onRemoveBad,
      "lhauto-allocate": EterniaCharacterSheet.#onAllocate,
      "lhauto-gold": EterniaCharacterSheet.#onGold,
      "lhauto-delete": EterniaCharacterSheet.#onDelete,
      "lhauto-power": EterniaCharacterSheet.#onPower,
      "linked-skill-throw": EterniaCharacterSheet.#onLinkedSkill,
      "item-use": EterniaCharacterSheet.#onItemUse,
      "lhp": EterniaCharacterSheet.#onProfession,
      "lhcl": EterniaCharacterSheet.#onClass
    }
  };

  /**
   * The frame (the banner, the header, the tab bar and the body) and each tab as a part of its own, put in the body in
   * their order (_replaceHTML): a change of the character draws the frame and the open tab, and a tab drawn before the
   * last changes draws again when it is opened (_configureRenderOptions, changeTab).
   */
  static PARTS = {
    frame: { template: `${DIR}/sheet.hbs`, scrollable: [".sidebar"] },
    ...Object.fromEntries(TABS.map(({ id }) => [id, {
      template: `${DIR}/${id}.hbs`,
      scrollable: [":scope > .tab-content", ...(TAB_SCROLL[id] ?? [])]
    }]))
  };

  /** Tab group states (survive re-renders). */
  tabGroups = { primary: "character", skills: "combat", effects: "list", bio: "profile", lhcl: "kit", lhmg: "slot-0" };

  /** The tabs drawn before the character's last changes: drawn again when opened. */
  #stale = new Set();

  /** The tab last asked for (a stale one opens after its render, unless another was asked meanwhile). */
  #wanted = null;

  /** How many times parts were put in the window (tells whether a render drew). */
  #drawn = 0;

  /** The player picked a section of the class tab (until then it opens on a choice still open). */
  #classSectionPicked = false;

  /** The player picked a page of the Magias tab (until then it opens on a slot still open). */
  #magicPicked = false;

  /** Summaries opened from the names (kept open across re-renders). */
  #summaries = new Summaries(this);

  /**
   * @override
   * AppV2 joins the `classes` of the whole inheritance chain: without this, the window would also
   * carry the system's "eternia" class and its sheet styles (absolute header, frame artwork…).
   */
  static _initializeApplicationOptions(options) {
    const result = super._initializeApplicationOptions(options);
    result.classes = (result.classes ?? []).filter(c => c !== "eternia");
    return result;
  }

  /* -------------------------------------------- */
  /*  Data                                        */
  /* -------------------------------------------- */

  /** @override */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const actor = this.actor;
    // What more than one part shows (each part adds its own: _preparePartContext). The XP to the next NP
    // (experience/level.mjs), what boosts it and the Evolution Tickets in the bag: the header and the inventory.
    // Whether the character is still blank: the header and the character tab. The portrait (the character tab and the
    // bio): a token shows as it is, with no square behind it.
    context.lh = {
      xp: this.#xpContext(),
      creation: {
        blank: CreationWizard.isBlank(actor),
        can: this.isEditable && CreationWizard.canCreate(actor)
      },
      portrait: await portraitFit(actor.img)
    };
    return context;
  }

  /** @override */
  async _preparePartContext(partId, context, options) {
    context = await super._preparePartContext(partId, context, options);
    const actor = this.actor;
    const lh = context.lh;
    switch (partId) {
      case "frame":
        Object.assign(lh, await this.#frameContext(context));
        break;
      case "character": {
        // Each attribute with the two checks it gives
        const system = actor.system;
        lh.attributes = ATTRIBUTES.map(({ key, checks }) => ({
          key,
          abbr: L(`Sheet.Attr.${key}.abbr`),
          label: L(`Sheet.Attr.${key}.name`),
          base: toInt(system.attributes?.[key]?.total),
          mod: toInt(system.attributes?.[key]?.mod),
          modLabel: signed(toInt(system.attributes?.[key]?.mod)),
          checks: checks.map(c => checkView(system, c, L(`Sheet.Attr.${key}.abbr`)))
        }));
        // What the character is: the race, class and profession
        lh.options = this.#optionCards(context);
        break;
      }
      case "skills":
        lh.skillTabs = this.#skillTabs(context);
        break;
      // The race and the five stages of its form
      case "race":
        lh.raceTab = raceContext(actor, { editable: this.isEditable });
        break;
      // The class: the Motor, the kit, the Path, the talents, the Dedications (the Magias tab reads it too)
      case "class": {
        lh.classTab ??= await classContext(actor, { editable: this.isEditable });
        const sections = (lh.classTab.sections ?? []).map(s => s.id);
        if (!this.#classSectionPicked && lh.classTab.focus) this.tabGroups.lhcl = lh.classTab.focus;
        if (sections.length && !sections.includes(this.tabGroups.lhcl)) this.tabGroups.lhcl = sections[0];
        break;
      }
      // The slots of the class, the Magia of each and its spells
      case "magic":
        lh.classTab ??= await classContext(actor, { editable: this.isEditable });
        lh.magic = this.#magicContext(lh.classTab);
        break;
      case "inventory":
        Object.assign(lh, this.#inventoryContext(context));
        break;
      // Crest, bench, chances, materials, talent, works, Rank ladder (a new Rank celebrates when this tab draws)
      case "profession":
        lh.profession = professionContext(actor, { editable: this.isEditable });
        break;
      case "effects":
        this._prepareEffects(context);
        break;
      // Who the character is, its data, looks and ways, its origins, ties, story and notes
      case "biography":
        await this._prepareBiography(context);
        lh.bio = await this.#bioContext(context);
        break;
    }
    return context;
  }

  /**
   * The frame: the banner (HP, Barrier, Hate, Fatigue, defenses, power, combat checks, statuses), the header (what the
   * character is, Fate) and the tabs, each with what waits in it.
   * @param {object} context
   */
  async #frameContext(context) {
    const actor = this.actor;
    const system = actor.system;
    const source = context.source;
    const battle = system["battle-status"] ?? {};
    const lh = {};

    // Sidebar: HP, Barrier, Hate, Fatigue
    const hp = toInt(system.health?.value), hpMax = Math.max(0, toInt(system.health?.max));
    const pct = hpMax ? Math.clamp(Math.round((hp / hpMax) * 100), 0, 100) : 0;
    lh.hp = { value: hp, max: hpMax, pct };
    lh.barrier = toInt(source["bad-status"]?.barrier);
    lh.hateRank = actor.statuses.has("hateTop") ? "top" : actor.statuses.has("hateUnder") ? "under" : null;
    if (lh.hateRank) lh.hateRankLabel = game.i18n.localize(`ETERNIA.StatusEffect.${lh.hateRank === "top" ? "hateTop" : "hateUnder"}`);

    // Hate and Fatigue boxes fill up: Hate a tenth per point (full at 10), Fatigue by the share of the
    // maximum HP it takes away. A little fill shows as soon as there is any.
    const fill = share => ((share > 0) ? Math.clamp(Math.round(share * 100), 8, 100) : 0);
    const hate = toInt(source.infos?.hate), fatigue = toInt(source.infos?.fatigue);
    lh.hate = {
      fill: fill(hate / 10),
      tooltip: [L("Sheet.HateBox", { value: hate }), lh.hateRankLabel].filter(Boolean).join(" · ")
    };
    lh.fatigue = {
      fill: fill(fatigue / Math.max(1, hpMax + fatigue)),
      tooltip: L("Sheet.FatigueBox", { value: fatigue })
    };

    // Header: Fate as stars
    const fate = toInt(source.fate?.value), fateMax = Math.max(0, toInt(system.fate?.max));
    lh.fate = {
      pips: Array.from({ length: Math.clamp(Math.max(fateMax, fate), 0, 10) }, (_, i) => i < fate),
      tooltip: L("Sheet.FateHint", { value: fate, max: fateMax })
    };

    // Defenses, initiative, speed, power
    const total = path => toInt(foundry.utils.getProperty(battle, `${path}.total`));
    lh.defense = { phys: total("defense.phys"), magic: total("defense.magic") };
    lh.initiative = total("initiative");
    lh.speed = total("speed");
    lh.power = [
      { id: "attack", icon: "fa-solid fa-sword", label: L("Sheet.Attack"), tooltip: "ETERNIA.Tooltip.AttackPower", value: total("power.attack") },
      { id: "magic", icon: "fa-solid fa-wand-magic-sparkles", label: L("Sheet.Magic"), tooltip: "ETERNIA.Tooltip.MagicPower", value: total("power.magic") },
      { id: "recovery", icon: "fa-solid fa-hand-holding-heart", label: L("Sheet.Recovery"), tooltip: "ETERNIA.Tooltip.RestorationPower", value: total("power.restoration") }
    ];
    lh.combatChecks = COMBAT_CHECKS.map(c => checkView(system, c));

    // Active statuses (sidebar tags)
    lh.statuses = activeStatuses(context.statusPanel);

    // What the character is: the race, class and profession (the cards of the character tab, in their order)
    const owned = context.characterOptions;
    lh.identity = ["race", "class", "subclass"].filter(type => owned[type])
      .map(type => ({ id: owned[type]._id, name: owned[type].name, type }));

    // The tabs, each with what waits in it: counted without building the tabs (they draw when opened)
    const browse = context.skillBrowse ?? {};
    const open = await classBadges(actor);
    const badges = {
      skills: ["Combat", "General", "Basic"].reduce((n, subtype) => n + toInt(browse[subtype]?.pending), 0),
      class: open.class,
      magic: open.magic,
      race: this.isEditable ? raceBadgeOf(actor, { editable: this.isEditable }) : 0
    };
    lh.tabs = TABS.map(t => ({ ...t, label: L(`Sheet.TabShort.${t.id}`), badge: badges[t.id] || 0 }));
    return lh;
  }

  /**
   * The skills tab: Combat / General / Basic, each by Timing.
   * @param {object} context
   */
  #skillTabs(context) {
    const actor = this.actor;
    const enrich = item => {
      const s = item.system;
      const max = Math.clamp(toInt(s.skillRank?.max), 0, 10), value = toInt(s.skillRank?.value);
      item.lh = {
        timing: parseSkillField("timing", s.timing).type,
        sr: max ? `${value}/${max}` : "",
        cost: isEmpty(s.cost) ? "" : term("cost", s.cost),
        limit: isEmpty(s.limit) ? "" : term("limit", s.limit)
      };
      return item;
    };
    const group = skills => {
      const groups = TIMING_GROUPS.map(g => ({ id: g.id, label: L(`Sheet.Timing.${g.id}`), skills: [] }));
      for (const item of skills.map(enrich)) {
        const index = TIMING_GROUPS.findIndex(g => g.timings.includes(item.lh.timing));
        groups[index >= 0 ? index : groups.length - 1].skills.push(item);
      }
      return groups.filter(g => g.skills.length);
    };
    // The skills of the items' trigger powers (content.mjs) are used from their item, in the inventory.
    const powers = itemSkillsOf(actor);
    const fromItems = new Set([...powers].filter(([id]) => actor.items.has(id)).flatMap(([, list]) => list.map(s => s.id)));
    const listed = skills => skills.filter(s => !fromItems.has(s._id));
    const browse = context.skillBrowse ?? {};
    return [
      { id: "combat", subtype: "Combat", skills: listed(context.skills.combat) },
      { id: "general", subtype: "General", skills: listed(context.skills.general) },
      { id: "basic", subtype: "Basic", skills: listed(context.skills.basic) }
    ].map(tab => ({
      ...tab, groups: group(tab.skills), count: tab.skills.length,
      browse: browse[tab.subtype], pending: toInt(browse[tab.subtype]?.pending)
    }));
  }

  /**
   * The inventory tab: the equipment slots, the items carried, the space and the gold.
   * @param {object} context
   */
  #inventoryContext(context) {
    const actor = this.actor;
    const system = actor.system;
    const lh = {};
    // The items' trigger powers (content.mjs), used from the item
    const powers = itemSkillsOf(actor);
    const powerIcons = item => (powers.get(item?._id) ?? []).map((skill, i, list) => ({
      id: skill.id,
      n: (list.length > 1) ? i + 1 : null,
      tooltip: L("Sheet.UsePower", { name: skill.name, timing: term("timing", skill.system.timing) })
    }));
    const eq = context.items.equipped, hands = context.hands;
    lh.slots = [
      { pos: "main", type: "hand", hand: "main", index: 0, icon: "weapon", label: "ETERNIA.Hands.Main", item: hands.main, swap: hands.canSwap },
      { pos: "off", type: "hand", hand: "off", index: 0, icon: "shield", label: "ETERNIA.Hands.Off", item: hands.off, locked: hands.locked },
      { pos: "armor", type: "armor", index: 0, icon: "armor", label: "TYPES.Item.armor", item: eq.armors[0] },
      { pos: "bag", type: "bag", index: 0, icon: "bag", label: "TYPES.Item.bag", item: eq.bags[0] },
      { pos: "acc0", type: "accessory", index: 0, icon: "accessory", label: "TYPES.Item.accessory", item: eq.accessories[0] },
      { pos: "acc1", type: "accessory", index: 1, icon: "accessory", label: "TYPES.Item.accessory", item: eq.accessories[1] },
      { pos: "acc2", type: "accessory", index: 2, icon: "accessory", label: "TYPES.Item.accessory", item: eq.accessories[2] }
    ].map(slot => ({ ...slot, doll: dollPlace(slot.pos), filled: !!(slot.item || slot.locked) }));
    for (const slot of lh.slots) if (slot.item) slot.item.lhPowers = powerIcons(slot.item);
    const items = context.items;
    const space = toInt(system.inventory?.space), maxSpace = toInt(system.inventory?.maxSpace);
    lh.carried = [].concat(items.weapons, items.armors, items.shields, items.accessories, items.bags, items.usables, items.gear)
      .map((item, i) => Object.assign(item, {
        typeLabel: game.i18n.localize(`TYPES.Item.${item.type}`),
        over: i >= maxSpace,
        lhPowers: powerIcons(item)
      }));
    // The mounts (mounts/): the one ridden first, with what it gives
    lh.mounts = (items.mounts ?? []).map(item => {
      const s = item.system;
      const stat = (key, value) => (toInt(value) ? `${L(`Mount.Stat.${key}`)} ${toInt(value) > 0 ? "+" : ""}${toInt(value)}` : "");
      return Object.assign(item, {
        ridden: s.equipped === true,
        line: [stat("speed", s.speed), stat("space", s.bagSpace), stat("initiative", s.initiative), stat("pdef", s.pdef), stat("mdef", s.mdef)]
          .filter(Boolean).join(" · "),
        toggle: L((s.equipped === true) ? "Mount.Dismount" : "Mount.Ride"),
        // Its powers only work mounted
        lhPowers: (s.equipped === true) ? powerIcons(item) : []
      });
    }).sort((a, b) => (b.ridden - a.ridden) || a.name.localeCompare(b.name, game.i18n.lang));
    lh.space = { value: space, max: maxSpace, pct: maxSpace ? Math.clamp(Math.round((space / maxSpace) * 100), 0, 100) : 100, over: space > maxSpace };
    lh.itemTypes = ITEM_TYPES.map(type => ({ type, label: game.i18n.localize(`TYPES.Item.${type}`) }));
    lh.gold = toInt(context.source.inventory?.gold).toLocaleString(game.i18n.lang);
    return lh;
  }

  /**
   * The race, class and profession cards of the character tab: each one's picture, name and one line about it.
   * @param {object} context
   */
  #optionCards(context) {
    const actor = this.actor;
    const race = context.characterOptions.race;
    const job = context.characterOptions.class;
    const subclass = context.characterOptions.subclass;
    const raceLine = () => {
      // With the +1 of the stages of the form
      const bonus = race.flags?.[SYSTEM_ID]?.stageBonus ?? {};
      const a = Object.fromEntries(["str", "dex", "pow", "int"].map(k => [k, toInt(race.system.attributes?.[k]) + toInt(bonus[k])]));
      const stats = ["str", "dex", "pow", "int"].filter(k => toInt(a[k])).map(k => `${L(`Sheet.Attr.${k}.abbr`)} +${toInt(a[k])}`);
      return [stats.join(", "), `${L("Sheet.HPShort")} +${toInt(race.system.hp)}`, `${game.i18n.localize("ETERNIA.Label.Fate")} +${toInt(race.system.fate)}`]
        .filter(Boolean).join(" · ");
    };
    const classLine = () => {
      const def = CLASSES[job.system.identifier];
      const motor = def ? motorDef(def.motor) : null;
      return [def?.family ? `${L(`Classes.Family.${def.family}`)} · ${L(`Classes.Function.${def.role}`)}` : L("Classes.Retired"),
        motor ? L("Sheet.MotorLine", { name: motorName(motor) }) : ""].filter(Boolean).join(" · ");
    };
    const professionLine = () => {
      const p = professionOf(actor);
      if (!p) return "";
      return [`${L("Profession.RankShort", { n: p.rank })} · ${rankTitle(p.rank)}`, L(`Profession.Talent.${p.def.talent}.name`)].join(" · ");
    };
    const profession = subclass ? PROFESSIONS[subclass.system.identifier] : null;
    // The stage of the race's form: a seal on the card, the box to evolve when the next stage is open (or for the GM)
    const form = formOf(actor);
    const raceForm = form.stage ? {
      roman: ROMAN[form.stage],
      ready: form.ready && this.isEditable,
      can: this.isEditable && (!!form.next || (game.user.isGM && (form.stage > 1))),
      tip: [L("Evolve.SealTip", { stage: ROMAN[form.stage], name: form.current?.name ?? "" }),
        form.next ? L(form.ready ? "Evolve.SealReady" : "Evolve.SealNext", { stage: ROMAN[form.next.stage], name: form.next.name, rank: form.next.rank })
          : L("Evolve.SealLast")].join(" ")
    } : null;
    return [
      { type: "race", label: L("Sheet.Option.race"), item: race, img: race?.img, line: race ? raceLine() : L("Sheet.Option.raceHint"),
        color: race ? raceColor(race) : "#2f6b4a", form: raceForm, placeholder: game.i18n.localize("ETERNIA.Placeholder.Race") },
      { type: "class", label: L("Sheet.Option.class"), item: job, img: job?.img, emblem: true, line: job ? classLine() : L("Sheet.Option.classHint"),
        color: CLASSES[job?.system.identifier]?.color ?? "#1f5137", placeholder: game.i18n.localize("ETERNIA.Placeholder.Class") },
      { type: "subclass", label: L("Sheet.Option.subclass"), item: subclass, img: subclass?.img, line: subclass ? professionLine() : L("Sheet.Option.subclassHint"),
        color: profession?.color ?? "#8a6a25", icon: profession ? TALENTS[profession.talent]?.icon : "",
        placeholder: L("Sheet.Option.subclass") }
    ];
  }

  /**
   * The Magias tab: a page for each slot of the class (the Magia taken there with its Trait, its Tabu and its spells,
   * or the slot still to fill) and the rail to pick one.
   * @param {object} classTab  The class tab's data (classes/sheet.mjs)
   */
  #magicContext(classTab) {
    const magic = classTab?.magic;
    if (!magic) return { none: true, noClass: !!classTab?.none, editable: this.isEditable };
    const pages = magic.slots.map((slot, index) => ({ ...slot, id: `slot-${index}` }));
    if (!pages.some(p => p.id === this.tabGroups.lhmg)) this.tabGroups.lhmg = pages[0]?.id ?? "slot-0";
    // An open slot shows first, until the player picks another one
    const open = pages.find(p => p.open);
    if (open && !this.#magicPicked) this.tabGroups.lhmg = open.id;
    return {
      none: false,
      editable: this.isEditable,
      pages,
      open: magic.open,
      count: magic.count,
      ranks: pages.filter(p => p.rank).map(p => p.rank).join(", ")
    };
  }

  /**
   * The bio tab. The profile: who the character is (the portrait, the epithet and the catchphrase, what it is and who
   * plays it), its personal data, appearance and personality (flags.eternia.bio; the guild is the system's field) and
   * its origins, what its race, class, profession and Magias say of whoever has them (the closing lines of their
   * descriptions). Then the connections and unions, the story (system.biography) and the notes.
   * @param {object} context
   */
  async #bioContext(context) {
    const actor = this.actor;
    const bio = actor.flags?.[SYSTEM_ID]?.bio ?? {};
    if (!BIO_PANES.includes(this.tabGroups.bio)) this.tabGroups.bio = "profile";
    const field = key => ({
      key,
      name: (key === "guild") ? "system.social.guild" : `flags.${SYSTEM_ID}.bio.${key}`,
      value: String(((key === "guild") ? context.source.social?.guild : bio[key]) ?? ""),
      label: L(`Bio.Field.${key}`),
      placeholder: game.i18n.has(`ETERNIA.Bio.Placeholder.${key}`) ? L(`Bio.Placeholder.${key}`) : ""
    });

    // What the character is and who plays it
    const { race, class: job, subclass } = context.characterOptions;
    const rank = toInt(actor.system.infos?.crank);
    const identity = [race?.name, job?.name, subclass?.name, rank ? L("Bio.Rank", { n: rank }) : ""].filter(Boolean);
    const players = game.users.filter(u => !u.isGM && actor.testUserPermission(u, "OWNER")).map(u => u.name);

    // The origins: the race, the class, the profession and each Magia, with what they say
    const magias = actor.items.filter(i => i.flags?.[SYSTEM_ID]?.magic);
    const origins = [
      race && { type: "race", label: L("Sheet.Option.race"), item: race, color: "#2f6b4a" },
      job && { type: "class", label: L("Sheet.Option.class"), item: job, color: CLASSES[job.system.identifier]?.color ?? "#1f5137", emblem: true },
      subclass && { type: "subclass", label: L("Sheet.Option.subclass"), item: subclass, color: PROFESSIONS[subclass.system.identifier]?.color ?? "#8a6a25" },
      ...magias.map(magia => {
        const category = categoryView(categoryOf(magia.flags[SYSTEM_ID].magic));
        return { type: "magia", label: category.label, item: magia, color: category.color, tagline: magia.flags[SYSTEM_ID].magic.tagline ?? "" };
      })
    ].filter(Boolean).map(o => ({ ...o, id: o.item.id, name: o.item.name, img: o.item.img, text: flavorOf(o.item) }))
      .filter(o => o.text || o.tagline);

    // The connections and unions, with their tags
    const withTags = list => list.map(item => ({ ...item, lhTags: (item.system?.tags ?? []).map(tagLabel) }));
    const ties = [
      { id: "connections", type: "connection", label: L("Sheet.Connections"), items: withTags(context.social.connections) },
      { id: "unions", type: "union", label: L("Sheet.Unions"), items: withTags(context.social.unions) }
    ];

    const enrich = html => foundry.applications.ux.TextEditor.implementation.enrichHTML(html ?? "", {
      rollData: needsRollData(html) ? context.rollData : undefined, relativeTo: actor, secrets: actor.isOwner
    });
    return {
      epithet: field("epithet"),
      catchphrase: field("catchphrase"),
      identity,
      players: players.join(", "),
      data: BIO_DATA.map(field),
      appearance: field("appearance"),
      traits: BIO_TRAITS.map(t => ({ ...field(t.key), icon: t.icon })),
      origins,
      ties,
      tieCount: ties.reduce((n, t) => n + t.items.length, 0),
      story: { empty: !String(context.source.biography ?? "").trim() },
      notes: { value: String(bio.notes ?? ""), html: await enrich(bio.notes), empty: !String(bio.notes ?? "").trim() },
      panes: BIO_PANES.map(id => ({ id, label: L(`Bio.Pane.${id}`) }))
    };
  }

  /* -------------------------------------------- */
  /*  Rendering                                   */
  /* -------------------------------------------- */

  /** @override */
  _configureRenderOptions(options) {
    if (!TABS.some(t => t.id === this.tabGroups.primary)) this.tabGroups.primary = "character";
    // A change of the character (its data, items or effects) draws the frame and the open tab; the other tabs draw
    // when they are opened (changeTab). The first render and the forced ones draw everything.
    const partial = !options.isFirstRender && !options.force && !options.parts && !options.tab && !!options.renderContext;
    if (partial) options.parts = ["frame", this.tabGroups.primary];
    super._configureRenderOptions(options);
    if (partial) for (const { id } of TABS) if (id !== this.tabGroups.primary) this.#stale.add(id);
  }

  /**
   * @override
   * The tabs go in the frame's body, in their order. When the frame draws, the tabs this render doesn't draw move from
   * the old body to the new one and the ones it draws get their place kept there, before the old frame leaves: each tab
   * drawn then takes its place (HandlebarsApplicationMixin#_replaceHTML finds the parts by data-application-part).
   */
  _replaceHTML(result, content, options) {
    if (result.frame) {
      const body = result.frame.querySelector(".lhpf-body");
      for (const { id } of TABS) {
        const kept = (id in result) ? null : this.parts[id];
        if (kept) {
          body.append(kept);
          continue;
        }
        const place = document.createElement("section");
        place.dataset.applicationPart = id;
        body.append(place);
        // Neither drawn nor kept (never drawn): drawn when opened
        if (!(id in result)) this.#stale.add(id);
      }
      result = { frame: result.frame, ...result };
    }
    super._replaceHTML(result, content, options);
    for (const id of Object.keys(result)) this.#stale.delete(id);
    this.#drawn += 1;
  }

  /** @override */
  changeTab(tab, group, options = {}) {
    if (group === "primary") {
      this.#wanted = tab;
      // A tab drawn before the character's last changes draws first, then opens (unless another tab was asked for)
      if (this.#stale.has(tab)) {
        const drawn = this.#drawn;
        this.render({ parts: [tab] }).then(() => {
          const open = this.state > foundry.applications.api.ApplicationV2.RENDER_STATES.NONE;
          if (open && (this.#wanted === tab) && (this.#drawn !== drawn)) this.changeTab(tab, group, options);
        });
        return;
      }
    }
    super.changeTab(tab, group, options);
    if (group === "lhcl") this.#classSectionPicked = true;
    if (group === "lhmg") this.#magicPicked = true;
  }

  /**
   * @override
   * The fields of a tab drawn before the character's last changes hold the values of then: they stay out of the
   * update (a tab that isn't open isn't edited), or they would put the old values back.
   */
  _processFormData(event, form, formData) {
    const stale = [...this.#stale].map(id => this.parts[id]).filter(Boolean);
    const inStale = el => stale.some(part => part.contains(el));
    for (const part of stale) {
      for (const field of part.querySelectorAll("[name], [data-edit]")) {
        const key = field.getAttribute("name") ?? field.dataset.edit;
        const same = form.querySelectorAll(`[name="${CSS.escape(key)}"], [data-edit="${CSS.escape(key)}"]`);
        if (![...same].some(el => !inStale(el))) delete formData.object[key];
      }
    }
    return super._processFormData(event, form, formData);
  }

  /** @override */
  async _onFirstRender(context, options) {
    await super._onFirstRender(context, options);
    // Close the "add item" menu when clicking elsewhere (the window element outlives the renders).
    this.element.addEventListener("pointerdown", event => {
      if (!event.target.closest(".addItem")) this.element.querySelector(".addItem .dropdown-content")?.classList.remove("show");
    });
  }

  /** @override */
  async _onRender(context, options) {
    await super._onRender(context, options);
    const root = this.element;
    root.classList.remove("eternia");
    // Summaries left open before this render.
    this.#summaries.restore(root);
  }

  /** @override */
  _activateSheetListeners(root, partId) {
    // The frame's body holds the tabs, each with its own listeners (attached when the tab draws)
    if (partId === "frame") {
      for (const region of root.children) if (!region.matches(".lhpf-body")) super._activateSheetListeners(region, partId);
      this.#activateFrame(root);
      return;
    }
    super._activateSheetListeners(root, partId);
    switch (partId) {
      // The search narrows the list of the open pane (the headers of empty groups hide).
      case "skills":
        for (const input of root.querySelectorAll(".lhpf-skill-search input")) {
          input.value = this.#skillQuery;
          input.addEventListener("input", () => {
            this.#skillQuery = input.value;
            this.#filterSkills(root);
          });
        }
        this.#filterSkills(root);
        break;
      case "inventory":
        for (const field of root.querySelectorAll(".gold-input")) blurOnEnter(field);
        break;
      // What each skill does, under the pointer
      case "race":
      case "class":
      case "magic":
        activateClassTab(this, root);
        break;
    }
  }

  /** The banner's and the header's listeners. */
  #activateFrame(root) {
    // Barrier: its own field is also in the status panel, so this copy saves by itself (no form name).
    const barrier = root.querySelector(".lhpf-barrier");
    barrier?.addEventListener("change", event => {
      event.stopPropagation();
      const value = Math.max(0, Math.floor(Number(event.currentTarget.value) || 0));
      this.actor.update({ "system.bad-status.barrier": value });
    });

    // Fate stars: click +1 (data-action), right click −1.
    root.querySelector(".lhpf-header .pips")?.addEventListener("contextmenu", event => {
      event.preventDefault();
      this.#setFate(-1);
    });

    for (const field of root.querySelectorAll(".lhpf-sidebar input, .lhpf-header input")) blurOnEnter(field);
  }

  /** What the skills tab's search has (kept across renders). */
  #skillQuery = "";

  /** Show the skills whose name has the search, in every pane of the skills tab. */
  #filterSkills(root) {
    const fold = text => String(text ?? "").normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
    const query = fold(this.#skillQuery.trim());
    for (const pane of root.querySelectorAll('.tab[data-group="skills"]')) {
      let header = null;
      let shown = 0;
      const flush = () => { if (header) header.hidden = !shown; };
      for (const row of pane.querySelectorAll(".lhpf-list > li")) {
        if (row.classList.contains("action-header")) {
          flush();
          header = row;
          shown = 0;
          continue;
        }
        if (!row.classList.contains("skill")) continue;
        const match = !query || fold(row.querySelector(".name")?.textContent).includes(query);
        row.hidden = !match;
        if (match) shown += 1;
      }
      flush();
    }
  }

  static #onSummary(event, target) {
    return this.#summaries.toggle(target);
  }

  /** The race / class / subclass field of a blank character: the creation wizard, on that step. */
  static #onOptionBrowse(event, target) {
    if (!this.isEditable) return;
    const type = target.closest(".option-field")?.dataset.optionType;
    if (!type) return;
    if (CreationWizard.isBlank(this.actor) && CreationWizard.canCreate(this.actor)) {
      return CreationWizard.open(this.actor, { step: { race: "race", class: "class", subclass: "profession" }[type] });
    }
    return OptionBrowser.open(this.actor, type);
  }

  /** Open an item of the character (the race, class or profession of the header). */
  static #onOpenItem(event, target) {
    this.actor.items.get(target.dataset.itemId)?.sheet.render(true);
  }

  /** The creation wizard. */
  static #onWizard() {
    if (this.isEditable) return CreationWizard.open(this.actor);
  }

  static #onEvolve() {
    if (this.isEditable) return openEvolution(this.actor);
  }

  static async #onRegress() {
    if (!this.isEditable || !game.user.isGM) return;
    const form = formOf(this.actor);
    if (form.stage <= 1) return;
    const ok = await foundry.applications.api.DialogV2.confirm({
      window: { title: L("Evolve.Window", { name: this.actor.name }), icon: "fa-solid fa-arrow-rotate-left" },
      content: `<p>${escape(L("RaceTab.BackConfirm", { name: this.actor.name, from: ROMAN[form.stage], to: ROMAN[form.stage - 1] }))}</p>`,
      rejectClose: false
    });
    if (ok) return regress(this.actor);
  }

  static #onRaceBrowse() {
    if (!this.isEditable) return;
    if (CreationWizard.isBlank(this.actor) && CreationWizard.canCreate(this.actor)) return CreationWizard.open(this.actor, { step: "race" });
    return OptionBrowser.open(this.actor, "race");
  }

  /* -------------------------------------------- */
  /*  Actions                                     */
  /* -------------------------------------------- */

  async #setFate(delta) {
    if (!this.isEditable) return;
    const value = toInt(this.actor._source.system.fate?.value), max = toInt(this.actor.system.fate?.max);
    const next = Math.max(0, value + delta);
    if ((delta > 0) && max && (next > max)) return;
    if (next !== value) await this.actor.update({ "system.fate.value": next });
  }

  static #onFate() {
    return this.#setFate(1);
  }

  /** The XP bar of the header: where the character is in its NP, its boosts, its Tickets. */
  #xpContext() {
    const actor = this.actor;
    const bar = xpView(actor);
    const boosts = boostsOf(actor).map(e => e.getFlag(SYSTEM_ID, "xpBoost"));
    const lines = [L("Xp.Tip.Total", { total: bar.total.toLocaleString(game.i18n.lang) })];
    lines.push(bar.max ? L("Xp.Tip.Max") : L("Xp.Tip.Next", { n: bar.left.toLocaleString(game.i18n.lang), rank: bar.rank + 1 }));
    for (const b of boosts) lines.push(L("Xp.Tip.Boost", { item: b.item, pct: b.pct, left: b.left }));
    const tickets = ticketCount(actor);
    if (tickets) lines.push(L("Xp.Tip.Tickets", { n: tickets }));
    const gm = game.user.isGM;
    if (gm) lines.push(L("Xp.Tip.GM"));
    return { ...bar, boost: boosts.length > 0, gm, tooltip: lines.map(l => `<p>${escape(l)}</p>`).join("") };
  }

  /** The GM's box of the XP: XP to give (or take, negative) and Evolution Tickets to give. */
  static async #onXp() {
    if (!game.user.isGM) return;
    const actor = this.actor;
    const bar = xpView(actor);
    const data = await foundry.applications.api.DialogV2.input({
      window: { title: L("Xp.Gm.Title", { name: actor.name }), icon: "fa-solid fa-star" },
      classes: ["eternia", "lhd-box"],
      position: { width: 420 },
      content: `<p>${escape(L("Xp.Gm.Lead", { total: bar.total, rank: bar.rank }))}</p>`
        + `<div class="form-group"><label>${escape(L("Xp.Gm.Add"))}</label><input type="number" name="xp" step="1" value="" placeholder="0" autofocus></div>`
        + `<div class="form-group"><label>${escape(L("Xp.Gm.Tickets"))}</label><input type="number" name="tickets" min="0" step="1" value="" placeholder="0"></div>`
        + `<p class="hint">${escape(L("Xp.Gm.Hint"))}</p>`,
      ok: { label: L("Xp.Gm.Ok"), icon: "fa-solid fa-check" }
    });
    if (!data) return;
    const tickets = Math.max(0, toInt(data.tickets));
    if (tickets) await giveTickets(actor, tickets);
    const xp = toInt(data.xp);
    if (xp) await addXp(actor, xp, { source: (xp < 0) ? "undo" : "gm" });
  }

  static #onRemoveBad() {
    return removeBadStatus(this.actor);
  }

  /** Delete an item after a confirmation (connections and unions). */
  static #onDelete(event, target) {
    if (!this.isEditable) return;
    const item = this.actor.items.get(target.closest("[data-item-id]")?.dataset.itemId);
    return item?.deleteDialog({ classes: ["lhauto-dialog"] });
  }

  static #onAllocate() {
    if (this.isEditable) return allocateBonusPoints(this.actor);
  }

  /** One of an item's trigger powers: its skill (content.mjs), used like any skill. */
  static #onPower(event, target) {
    return this.actor.items.get(target.dataset.skillId)?.ItemThrow();
  }

  /** The item's linked skill: the one on this character first (a copied character still links to the original's). */
  static async #onLinkedSkill(event, target) {
    const item = this.actor.items.get(target.closest(".item")?.dataset.itemId);
    if (!item) return;
    const skill = linkedSkill(item);
    if (skill?.ItemThrow) return skill.ItemThrow();
    const found = item.system.linkedSkillUuid ? await fromUuid(item.system.linkedSkillUuid).catch(() => null) : null;
    return found?.ItemThrow?.();
  }

  /** A usable item, used after the check of its Character Rank lock (use.mjs). */
  static async #onItemUse(event, target) {
    const item = this.actor.items.get(target.closest(".item")?.dataset.itemId);
    if (item) return useItem(item);
  }

  /** Add or spend gold, with a note in the chat (the table's economy log). */
  static async #onGold(event, target) {
    if (!this.isEditable) return;
    const sign = Number(target.dataset.sign) || 1;
    const amount = await foundry.applications.api.DialogV2.prompt({
      window: { title: L(sign > 0 ? "Sheet.GoldAdd" : "Sheet.GoldSpend"), icon: "fa-solid fa-coins" },
      classes: ["lhauto-dialog"],
      content: `<div class="form-group"><label>${escape(L("Sheet.GoldAmount"))}</label>
        <input type="number" name="amount" min="1" step="1" autofocus></div>`,
      ok: { label: L(sign > 0 ? "Sheet.GoldAdd" : "Sheet.GoldSpend"), callback: (ev, button) => Math.floor(Math.abs(Number(button.form.elements.amount.value)) || 0) },
      rejectClose: false
    });
    if (!amount) return;
    const before = toInt(this.actor._source.system.inventory?.gold);
    const after = Math.max(0, before + sign * amount);
    if (after === before) return;
    await this.actor.update({ "system.inventory.gold": after });
    const fmt = n => n.toLocaleString(game.i18n.lang);
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      content: `<div class="eternia chat-card lhauto-card lhauto-gold-card"><p><i class="fa-solid fa-coins"></i> ${escape(L(sign > 0 ? "Sheet.GoldGained" : "Sheet.GoldSpent", {
        name: actorName(this.actor), amount: fmt(Math.abs(after - before)), total: fmt(after)
      }))}</p></div>`
    });
  }

  /** The profession tab's buttons (data-op: professions/sheet.mjs). */
  static #onProfession(event, target) {
    return professionAction(this, target);
  }

  /** The class tab's buttons (data-op: classes/sheet.mjs). */
  static #onClass(event, target) {
    return classAction(this, target);
  }
}

/** Call during the `init` hook. */
export function registerCharacterSheet() {
  foundry.applications.handlebars.loadTemplates([`${DIR}/sheet.hbs`, ...PARTIALS.map(p => `${DIR}/${p}.hbs`)]);
  // An effect without an origin has "None" as its source (localized or not): shown as nothing.
  Handlebars.registerHelper("eterniaSource", value => (((value === "None") || (value === game.i18n.localize("None"))) ? "" : value));
  foundry.documents.collections.Actors.registerSheet(SYSTEM_ID, EterniaCharacterSheet, {
    types: ["character"],
    makeDefault: true,
    label: "ETERNIA.Sheet.Label"
  });
}
