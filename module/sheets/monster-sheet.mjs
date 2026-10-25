/**
 * The parchment monster sheet: the system's monster sheet logic (EterniaActorMonsterSheet) with the layout of the
 * character sheet, made small. The green banner keeps what is used in a fight (HP, Barrier, Fate, Hate multiplier,
 * defenses, Initiative, Speed, Evasion and Resistance, statuses); the header the portrait, the name, the tags and
 * the Level; a strip under it the attributes and the Identification; the tabs the abilities by Timing (the first
 * one), the effects with the statuses panel, and the description.
 *
 * The parent class's data-actions (editImage, monster-send-to-chat, monster-check-roll, item-*, the effect
 * controls), its form processing and its listeners (tag input, statuses panel) are used as they are.
 */
import { L, SYSTEM_ID } from "../settings.mjs";
import { parseSkillField } from "../helpers/skill-fields.mjs";
import { toInt } from "../helpers/utils.mjs";
import { isEmpty, term } from "../i18n/terms.mjs";
import { ATTRIBUTES, Summaries, TIMING_GROUPS, activeStatuses, signed } from "./character-sheet.mjs";
import { EterniaActorMonsterSheet } from "./actor-monster-sheet.mjs";
import { activateDropTab, addDropRow, addGoldRow, convertFromSheet, dropsContext, rollFromSheet } from "../bestiary/drop-tab.mjs";
import { PHYSICAL_TYPES } from "../piles/pile-config.mjs";

const DIR = `systems/eternia/templates/monster`;
const PARTIALS = ["sidebar", "abilities", "drops"];

const TABS = [
  { id: "abilities", icon: "fa-solid fa-swords", label: "Sheet.Tab.skills" },
  { id: "drops", icon: "fa-solid fa-sack", label: "Sheet.Monster.Drops" },
  { id: "effects", icon: "fa-solid fa-person-rays", label: "Sheet.Tab.effects" },
  { id: "description", icon: "fa-solid fa-book-open-reader", label: "Sheet.Monster.Description" }
];

const CHECKS = [{ key: "evasion", name: "Evasion" }, { key: "resistance", name: "Resistance" }];

export class EterniaMonsterSheet extends EterniaActorMonsterSheet {

  static DEFAULT_OPTIONS = {
    classes: ["lhauto", "lhpf", "monster", "themed", "theme-light"],
    position: { width: 580, height: 610 },
    actions: {
      "lhauto-summary": EterniaMonsterSheet.#onSummary,
      "lhauto-statuses": EterniaMonsterSheet.#onStatuses,
      "drops-roll": EterniaMonsterSheet.#onDropsRoll,
      "drops-gold": EterniaMonsterSheet.#onDropsGold,
      "drops-convert": EterniaMonsterSheet.#onDropsConvert
    }
  };

  static PARTS = {
    sheet: {
      template: `${DIR}/sheet.hbs`,
      scrollable: [".sidebar", ".tab[data-tab='abilities'] > .tab-content", ".tab[data-tab='drops'] > .tab-content", ".tab[data-tab='description'] > .tab-content",
        ".tab[data-group='effects'][data-tab='list'] > .tab-content", ".tab[data-group='effects'][data-tab='status'] > .tab-content"]
    }
  };

  /** Tab group states (survive re-renders). */
  tabGroups = { primary: "abilities", effects: "list" };

  /** Summaries opened from the ability names (kept open across re-renders). */
  #summaries = new Summaries(this);

  /**
   * @override
   * Without the system's "eternia" class (its sheet styles) the window is drawn by css/sheet.css alone.
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
    const modified = context.modified;
    const lh = {};

    lh.tabs = TABS.map(t => ({ ...t, label: L(t.label) }));
    lh.tabLabel = lh.tabs.find(t => t.id === this.tabGroups.primary)?.label ?? "";

    // Banner: HP, Barrier, Fate (a box that fills with the Fate left)
    const hp = toInt(system.health?.value), hpMax = Math.max(0, toInt(system.health?.max));
    lh.hp = { value: hp, max: hpMax, pct: hpMax ? Math.clamp(Math.round((hp / hpMax) * 100), 0, 100) : 0 };
    lh.barrier = toInt(actor._source.system["bad-status"]?.barrier);
    const fate = toInt(system.fate?.value), fateMax = Math.max(0, toInt(system.fate?.max));
    lh.fate = {
      fill: fateMax ? Math.clamp(Math.round((fate / fateMax) * 100), 0, 100) : 0,
      tooltip: L("Sheet.Monster.FateBox", { value: fate, max: fateMax })
    };

    // Evasion and Resistance: the fields edit the base check, the roll uses the effective one
    lh.checks = CHECKS.map(({ key, name }) => {
      const base = source.checks[key], effective = system.checks?.[key] ?? base;
      const dice = toInt(effective.dice), mod = toInt(effective.mod);
      return {
        key, name,
        label: game.i18n.localize(`ETERNIA.Check.${name}`),
        dice: toInt(base.dice),
        mod: signed(toInt(base.mod)),
        tier: Math.clamp(toInt(base.dice) - 1, 1, 5),
        modified: modified[key],
        rollTip: `${game.i18n.localize("ETERNIA.ButtonLabel.Roll")}: ${dice}d6${mod ? signed(mod) : ""}`
      };
    });

    // Strip: attributes (the monster's are modifiers)
    lh.attributes = ATTRIBUTES.map(({ key }) => ({
      key,
      abbr: L(`Sheet.Attr.${key}.abbr`),
      label: L(`Sheet.Attr.${key}.name`),
      value: source.attributes[key].mod,
      modified: modified[key]
    }));

    lh.statuses = activeStatuses(context.statusPanel);

    // Abilities by Timing, with the check, the damage and the limit as chips
    const groups = TIMING_GROUPS.map(g => ({ id: g.id, label: L(`Sheet.Timing.${g.id}`), skills: [] }));
    const skills = actor.items.filter(i => i.type === "skill").sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0));
    for (const item of skills) {
      const s = item.system;
      const index = TIMING_GROUPS.findIndex(g => g.timings.includes(parseSkillField("timing", s.timing).type));
      const group = groups[(index >= 0) ? index : groups.length - 1];
      const chips = [];
      // Timings the groups don't know ("Post-action", "Fail a defence roll"…) are said on the row.
      if ((group.id === "other") && !isEmpty(s.timing)) chips.push({ cls: "tag_alt", text: term("timing", s.timing), tip: game.i18n.localize("ETERNIA.Item.Label.Timing") });
      if (!isEmpty(s.checkLabel)) chips.push({ cls: "tag_secondary", text: term("check", s.checkLabel), tip: game.i18n.localize("ETERNIA.Item.Label.Check") });
      if (!isEmpty(s.damageLabel)) chips.push({ cls: "tag_damage", text: s.damageLabel, tip: L("Sheet.Damage") });
      if (!isEmpty(s.limit)) chips.push({ cls: "tag_transparent", text: term("limit", s.limit), tip: L("Sheet.Limit") });
      group.skills.push({ id: item.id, name: item.name, img: item.img, chips });
    }
    lh.groups = groups.filter(g => g.skills.length);
    lh.skillCount = skills.length;

    // Itens Deixados: the drop table (bestiary/drop-tab.mjs)
    lh.drops = await dropsContext(actor);

    context.lh = lh;
    return context;
  }

  /**
   * @override
   * A physical item dropped on the sheet is a new row of the drop table (the tab opens); the rest as usual.
   */
  async _onDropItem(event, item) {
    if (!this.actor.isOwner || !PHYSICAL_TYPES.includes(item?.type) || (this.actor.uuid === item.parent?.uuid)) {
      return super._onDropItem(event, item);
    }
    const data = item.inCompendium ? game.items.fromCompendium(item, { clearFolder: true }) : item.toObject();
    const created = await addDropRow(this.actor, data);
    this.changeTab("drops", "primary");
    return created?.[0] ?? null;
  }

  /* -------------------------------------------- */
  /*  Rendering                                   */
  /* -------------------------------------------- */

  /** @override */
  changeTab(tab, group, options = {}) {
    super.changeTab(tab, group, options);
    if (group === "primary") this.#showTitle();
  }

  /** @override */
  async _onRender(context, options) {
    await super._onRender(context, options);
    const root = this.element;
    root.classList.remove("eternia");

    // The tabs open as they were (the template draws them all closed).
    for (const [group, tab] of Object.entries(this.tabGroups)) {
      for (const el of root.querySelectorAll(`[data-group="${group}"][data-tab]`)) el.classList.toggle("active", el.dataset.tab === tab);
    }
    this.#showTitle();

    // Barrier: its own field is also in the statuses panel, so this copy saves by itself (no form name).
    root.querySelector(".lhpf-barrier")?.addEventListener("change", event => {
      event.stopPropagation();
      const value = Math.max(0, Math.floor(Number(event.currentTarget.value) || 0));
      this.actor.update({ "system.bad-status.barrier": value });
    });

    // Enter in a field of the banner, the header or the strip saves it (blur) instead of keeping the focus.
    for (const field of root.querySelectorAll(".lhpf-sidebar input, .lhpf-header input.char-name, .lhpf-header .level input, .lhpf-stats input")) {
      field.addEventListener("keydown", event => { if (event.key === "Enter") { event.preventDefault(); field.blur(); } });
    }

    this.#summaries.restore(root);
    if (this.isEditable) activateDropTab(root, this.actor);
  }

  /** The band's title follows the open tab (a render prepared before a tab change would show the old one). */
  #showTitle() {
    const title = this.element?.querySelector(".lhpf-nav .panel-title");
    if (title) title.textContent = L(TABS.find(t => t.id === this.tabGroups.primary)?.label ?? TABS[0].label);
  }

  /* -------------------------------------------- */
  /*  Actions                                     */
  /* -------------------------------------------- */

  static #onSummary(event, target) {
    return this.#summaries.toggle(target);
  }

  /** The banner's statuses: to the statuses panel of the effects tab. */
  static #onStatuses() {
    this.changeTab("effects", "primary");
    this.changeTab("status", "effects");
  }

  /** Itens Deixados: roll now (GM), for whom it asks. */
  static #onDropsRoll() {
    return rollFromSheet(this.actor);
  }

  /** Itens Deixados: a row of gold. */
  static #onDropsGold() {
    if (this.isEditable) return addGoldRow(this.actor);
  }

  /** Itens Deixados: the description's table becomes rows (GM). */
  static #onDropsConvert() {
    if (game.user.isGM) return convertFromSheet(this.actor);
  }
}

/** Call during the `init` hook. */
export function registerMonsterSheet() {
  foundry.applications.handlebars.loadTemplates([`${DIR}/sheet.hbs`, ...PARTIALS.map(p => `${DIR}/${p}.hbs`)]);
  foundry.documents.collections.Actors.registerSheet(SYSTEM_ID, EterniaMonsterSheet, {
    types: ["monster"],
    makeDefault: true,
    label: "ETERNIA.Sheet.Monster.Label"
  });
}
