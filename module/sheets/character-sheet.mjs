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
import { checkUsable } from "../automation/use.mjs";
import { actorName, escape, toInt } from "../helpers/utils.mjs";
import { isEmpty, tagLabel, term } from "../i18n/terms.mjs";
import { EterniaActorSheet } from "./actor-sheet.mjs";
import { allocateBonusPoints } from "../apps/stat-allocation.mjs";
import { professionAction, professionContext } from "../professions/sheet.mjs";
import { activateClassTab, classAction, classContext } from "../classes/sheet.mjs";
import { CreationWizard } from "../apps/creation-wizard.mjs";
import { OptionBrowser } from "../apps/option-browser.mjs";
import { CLASSES } from "../classes/data.mjs";
import { motorDef, motorName } from "../classes/motor.mjs";
import { professionOf, rankTitle } from "../professions/state.mjs";
import { PROFESSIONS, TALENTS } from "../professions/data.mjs";
import { categoryOf, categoryView } from "../apps/magic-catalog.mjs";
import { formOf, openEvolution, raceColor, regress, ROMAN } from "../races/evolution.mjs";
import { raceBadge, raceContext } from "../races/sheet.mjs";
import { portraitFit } from "../helpers/portrait.mjs";

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
const ITEM_TYPES = ["weapon", "armor", "shield", "accessory", "bag", "usable", "gear"];

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
  const box = document.createElement("div");
  box.innerHTML = parts.at(-1);
  return box.textContent.replace(/\s+/g, " ").trim();
}

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

  /** After a render: the summaries that were open open again (the ones of deleted items are forgotten). */
  restore(root) {
    for (const id of this.#open) {
      const row = root.querySelector(`.item[data-item-id="${id}"]`);
      if (row) this.#show(row, { animate: false });
      else this.#open.delete(id);
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

  static PARTS = {
    sheet: {
      template: `${DIR}/sheet.hbs`,
      scrollable: [".sidebar", ...TABS.map(t => `.tab[data-tab="${t.id}"] > .tab-content`),
        ...["basic", "general", "combat"].map(t => `.tab[data-group="skills"][data-tab="${t}"] > .tab-content`),
        ...BIO_PANES.map(p => `.tab[data-group="bio"][data-tab="${p}"] > .tab-content`),
        ".tab[data-group='effects'][data-tab='list'] > .tab-content", ".tab[data-group='effects'][data-tab='status'] > .tab-content",
        ".lhmg-page", ".lhcl-panels"]
    }
  };

  /** Tab group states (survive re-renders). */
  tabGroups = { primary: "character", skills: "combat", effects: "list", bio: "profile", lhcl: "kit", lhmg: "slot-0" };

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
    const system = actor.system;
    const source = context.source;
    const battle = system["battle-status"] ?? {};
    const lh = {};

    // Tabs (their badges come below, once what waits in them is known)
    if (!TABS.some(t => t.id === this.tabGroups.primary)) this.tabGroups.primary = "character";

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

    // Attributes and checks
    const check = (key, attr) => {
      const c = system.checks?.[key] ?? {};
      const dice = toInt(c.dice) || 2, value = toInt(c.total);
      return {
        key, attr, name: checkName(key), label: game.i18n.localize(`ETERNIA.Check.${checkName(key)}`),
        dice, total: value, mod: signed(value), tier: Math.clamp(dice - 1, 1, 5)
      };
    };
    // Each attribute with the two checks it gives (the character tab)
    lh.attributes = ATTRIBUTES.map(({ key, checks }) => ({
      key,
      abbr: L(`Sheet.Attr.${key}.abbr`),
      label: L(`Sheet.Attr.${key}.name`),
      base: toInt(system.attributes?.[key]?.total),
      mod: toInt(system.attributes?.[key]?.mod),
      modLabel: signed(toInt(system.attributes?.[key]?.mod)),
      checks: checks.map(c => check(c, L(`Sheet.Attr.${key}.abbr`)))
    }));
    lh.combatChecks = COMBAT_CHECKS.map(c => check(c));

    // Active statuses (sidebar tags)
    lh.statuses = activeStatuses(context.statusPanel);

    // Skills: by subtype, then by Timing
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
    const powerIcons = item => (powers.get(item?._id) ?? []).map((skill, i, list) => ({
      id: skill.id,
      n: (list.length > 1) ? i + 1 : null,
      tooltip: L("Sheet.UsePower", { name: skill.name, timing: term("timing", skill.system.timing) })
    }));
    const browse = context.skillBrowse ?? {};
    lh.skillTabs = [
      { id: "combat", subtype: "Combat", skills: listed(context.skills.combat) },
      { id: "general", subtype: "General", skills: listed(context.skills.general) },
      { id: "basic", subtype: "Basic", skills: listed(context.skills.basic) }
    ].map(tab => ({
      ...tab, groups: group(tab.skills), count: tab.skills.length,
      browse: browse[tab.subtype], pending: toInt(browse[tab.subtype]?.pending)
    }));

    // Inventory: equipment slots, carried items, space, gold
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
    lh.space = { value: space, max: maxSpace, pct: maxSpace ? Math.clamp(Math.round((space / maxSpace) * 100), 0, 100) : 100, over: space > maxSpace };
    lh.itemTypes = ITEM_TYPES.map(type => ({ type, label: game.i18n.localize(`TYPES.Item.${type}`) }));
    lh.gold = toInt(source.inventory?.gold).toLocaleString(game.i18n.lang);

    // Class: the Motor, the kit, the Path, the talents, the Dedications
    lh.classTab = await classContext(actor, { editable: this.isEditable });
    const sections = (lh.classTab.sections ?? []).map(s => s.id);
    if (!this.#classSectionPicked && lh.classTab.focus) this.tabGroups.lhcl = lh.classTab.focus;
    if (sections.length && !sections.includes(this.tabGroups.lhcl)) this.tabGroups.lhcl = sections[0];

    // Profession: crest, bench, chances, materials, talent, works, Rank ladder
    lh.profession = professionContext(actor, { editable: this.isEditable });

    // The portrait (the character tab and the bio): a token shows as it is, with no square behind it
    lh.portrait = await portraitFit(actor.img);

    // What the character is: the race, class and profession (the header and the character tab)
    lh.options = this.#optionCards(context);
    lh.identity = lh.options.filter(o => o.item).map(o => ({ id: o.item._id, name: o.item.name, type: o.type }));
    lh.creation = {
      blank: CreationWizard.isBlank(actor),
      can: this.isEditable && CreationWizard.canCreate(actor)
    };

    // The Magias tab: the slots of the class, the Magia of each and its spells
    lh.magic = this.#magicContext(lh.classTab);

    // The race tab: the race and the five stages of its form
    lh.raceTab = raceContext(actor, { editable: this.isEditable });

    // The bio: who the character is, its data, looks and ways, its origins, ties, story and notes
    lh.bio = await this.#bioContext(context);

    // The tabs, each with what waits in it
    const pendingSkills = lh.skillTabs.reduce((n, t) => n + t.pending, 0);
    const badges = {
      skills: pendingSkills,
      class: (lh.classTab.sections ?? []).filter(s => s.pending).length,
      magic: toInt(lh.classTab.magic?.open),
      race: this.isEditable ? raceBadge(lh.raceTab) : 0
    };
    lh.tabs = TABS.map(t => ({ ...t, label: L(`Sheet.TabShort.${t.id}`), badge: badges[t.id] || 0 }));

    context.lh = lh;
    return context;
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
      rollData: context.rollData, relativeTo: actor, secrets: actor.isOwner
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
  changeTab(tab, group, options = {}) {
    super.changeTab(tab, group, options);
    if (group === "lhcl") this.#classSectionPicked = true;
    if (group === "lhmg") this.#magicPicked = true;
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

    // Enter in a number field saves it (blur) instead of keeping the focus.
    for (const field of root.querySelectorAll(".lhpf-sidebar input, .lhpf-header input, .gold-input")) {
      field.addEventListener("keydown", event => { if (event.key === "Enter") { event.preventDefault(); field.blur(); } });
    }
    // The skills tab: the search narrows the list of the open pane (the headers of empty groups hide).
    for (const input of root.querySelectorAll(".lhpf-skill-search input")) {
      input.value = this.#skillQuery;
      input.addEventListener("input", () => {
        this.#skillQuery = input.value;
        this.#filterSkills(root);
      });
    }
    this.#filterSkills(root);
    // Summaries left open before this render.
    this.#summaries.restore(root);
    // The class tab: what each skill does, under the pointer
    activateClassTab(this, root);
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
    if (item && (await checkUsable(item))) return useItem(item);
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
