/**
 * The Magia picker: a magic class's Magia slot (CR 1, 5 and 10; apps/option-grants.mjs). A large window with every
 * Magia the character can still take as a card (its picture, category, a short line and the roles of its spells),
 * filters by category and by role, a search (Magia, line or spell) and, beside the cards, the page of the Magia under
 * the pointer (or of the one selected): what it is, its Trait and Tabu, its spells by CR and the closing line of its
 * description. With no Magia under the pointer nor selected, the page says how the Magias work. Resolves with the uuid
 * chosen, or null ("Not now", Escape or the window closed).
 *
 * The cards, the filters and the pages are the Magia browser (MagicBrowser, templates/apps/magic-browser.hbs), which the
 * creation wizard uses too. The data comes from the Magia catalog (apps/magic-catalog.mjs), read from the compendium
 * indexes once per session; the page of a Magia is drawn only when it is shown. On a page, the pointer on a spell tells
 * what it does and a click opens its whole text under it: the spells' documents are read the first time a page's
 * spell is asked for, all of that page's at once.
 */
import { L } from "../settings.mjs";
import { CLASSES } from "../classes/data.mjs";
import { escape } from "../helpers/utils.mjs";
import { chipText } from "../helpers/text-chips.mjs";
import {
  MAGIC_CATEGORIES, MAGIC_ROLES, categoryView, fold, magicCatalog, magicTexts, roleView, spellTexts
} from "./magic-catalog.mjs";
import { awakeningChoices, awakeningView, rollAwakening } from "./awakening.mjs";
import { holderCensus, holderState } from "./magic-holders.mjs";

export { MAGIC_CATEGORIES } from "./magic-catalog.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

/** The template of one Magia's page (drawn when shown). */
export const MAGIC_PAGE = "systems/eternia/templates/apps/magic-page.hbs";
/** The template of the browser (filters, cards, the pages). */
export const MAGIC_BROWSER = "systems/eternia/templates/apps/magic-browser.hbs";

/* -------------------------------------------- */
/*  The browser's data                          */
/* -------------------------------------------- */

/** The Magia slots of a class item (their CR), in order. */
export const magicSlotsOf = job => (job?.system?.grants ?? []).filter(g => g?.magic).map(g => Number(g.rank) || 1);

/**
 * What the Magia browser shows: the Magias still to take (not the ones the character has), with what the page of each
 * needs, the categories and roles with their counts, and the guide.
 * @param {object} options
 * @param {number} options.cr                 The character's CR (which spells it reaches now)
 * @param {Set<string>} [options.ownedIds]    The ids of the Magias it has
 * @param {Set<string>} [options.ownedNames]  Their names (folded)
 * @param {number[]} [options.slots]          The CRs of the class's Magia slots (the guide says them)
 * @param {Actor} [options.actor]             Who chooses: the holders of each Magia are counted without it
 *                                            (apps/magic-holders.mjs), and a player can't take one it may not hold
 * @returns {Promise<object>}
 */
export async function magicBrowserContext({ cr = 1, ownedIds = new Set(), ownedNames = new Set(), slots = [], actor = null } = {}) {
  const [catalog, texts] = await Promise.all([magicCatalog(), magicTexts(), foundry.applications.handlebars.getTemplate(MAGIC_PAGE)]);
  // Who holds what, read once for every card
  const census = holderCensus();
  const magias = catalog.filter(m => !ownedIds.has(m.id) && !ownedNames.has(fold(m.name))).map(m => {
    const category = categoryView(m.category);
    const text = texts.get(m.uuid) ?? {};
    return {
      ...m,
      ...text,
      tagline: m.tagline || (text.intro ?? "").split(/[:.;]/)[0],
      categoryLabel: category.label,
      categoryIcon: category.icon,
      categoryColor: category.color,
      rolesKey: m.roles.join(" "),
      cardRoles: m.roles.slice(0, 4).map(roleView),
      allRoles: m.roles.map(roleView),
      nowCount: m.spells.filter(s => s.minRank <= cr).length,
      spells: m.spells.map(s => ({ ...s, now: s.minRank <= cr })),
      ...holderView(m, actor, census)
    };
  });
  const categories = Object.keys(MAGIC_CATEGORIES).map(id => ({ ...categoryView(id), count: magias.filter(m => m.category === id).length }))
    .filter(c => c.count);
  const roles = Object.keys(MAGIC_ROLES).map(id => ({ ...roleView(id), count: magias.filter(m => m.roles.includes(id)).length }))
    .filter(r => r.count);
  const ranks = new Intl.ListFormat(game.i18n.lang, { type: "conjunction" }).format(slots.map(rank => L("MagicPicker.SlotRank", { rank })));
  return {
    magias,
    total: magias.length,
    categories,
    roles,
    guideSlots: slots.length ? L("MagicPicker.Guide.Slots", { count: slots.length, ranks }) : L("MagicPicker.Guide.SlotsAny")
  };
}

/**
 * What the cards and the pages say about who holds a Magia: "1/1" (full or not), the crown of the exclusive ones, and
 * whether this user may take it (a player can't take one that is full, nor an exclusive one beside another Magia).
 */
function holderView(magia, actor, census) {
  const state = holderState(magia, actor, census);
  const names = state.names.length ? state.names.join(", ") : L("Holders.Nobody");
  return {
    holderLabel: state.label,
    holderFull: state.full,
    holderTip: state.limit ? L("Holders.Tip", { n: state.limit, names }) : "",
    exclusive: state.exclusive,
    blocked: game.user.isGM ? null : state.blocked,
    blockedNote: state.blocked
  };
}

/* -------------------------------------------- */
/*  What the spells say                         */
/* -------------------------------------------- */

/** The tooltip of a spell: its picture, name and line, what it does and how to read the rest. */
function spellTip(spell, text) {
  const statuses = spell.statuses?.length
    ? `<p class="mp-tip-statuses">${spell.statuses.map(s => `<span>${escape(s)}</span>`).join("")}</p>` : "";
  return `<div class="lhcl-tip mp-spell-tip"><header><img src="${spell.img}" alt=""><div><strong>${escape(spell.name)}</strong>`
    + `${spell.meta ? `<span>${escape(spell.meta)}</span>` : ""}</div></header>`
    + `${text?.summary ? `<p>${chipText(text.summary)}</p>` : ""}${statuses}`
    + `<p class="mp-tip-hint"><i class="fa-solid fa-hand-pointer"></i> ${escape(L("MagicPicker.SpellOpen"))}</p></div>`;
}

/* -------------------------------------------- */
/*  The browser                                 */
/* -------------------------------------------- */

/**
 * The behavior of the Magia browser on its HTML (templates/apps/magic-browser.hbs): the filters and the search, the
 * page of the Magia under the pointer (drawn the first time it is shown), the selection, the keyboard, and on a page,
 * each spell's tooltip and its whole text.
 */
export class MagicBrowser {

  /**
   * @param {HTMLElement} root       An element with the browser inside
   * @param {object} options
   * @param {object[]} options.magias  The Magias of magicBrowserContext
   * @param {string|null} [options.selected]  The uuid selected at first
   * @param {(uuid: string) => void} [options.onSelect]  A Magia was selected
   * @param {(uuid: string) => void} [options.onChoose]  A Magia was chosen (double click, or Enter on the selected one)
   */
  constructor(root, { magias, selected = null, onSelect = null, onChoose = null }) {
    this.root = root;
    this.magias = new Map(magias.map(m => [m.uuid, m]));
    this.spells = new Map(magias.flatMap(m => m.spells.map(s => [s.uuid, s])));
    this.onSelect = onSelect;
    this.onChoose = onChoose;
    this.selected = null;
    this.#listen();
    if (selected && this.magias.has(selected)) this.select(selected);
    else this.show(null);
  }

  /** The filters: one category, the roles every Magia shown must have, the search. */
  #category = "";
  #roles = new Set();
  #query = "";

  #listen() {
    const root = this.root;
    const grid = root.querySelector(".mp-grid");
    const cardOf = event => event.target.closest?.(".mp-card");
    grid.addEventListener("pointerover", event => {
      const card = cardOf(event);
      if (card) this.show(card.dataset.uuid);
    });
    grid.addEventListener("pointerleave", () => this.show(null));
    grid.addEventListener("focusin", event => {
      const card = cardOf(event);
      if (card) this.show(card.dataset.uuid);
    });
    grid.addEventListener("click", event => {
      const card = cardOf(event);
      if (card) this.select(card.dataset.uuid);
    });
    grid.addEventListener("dblclick", event => {
      const card = cardOf(event);
      if (card) this.onChoose?.(card.dataset.uuid);
    });
    grid.addEventListener("keydown", event => this.#onKey(event));
    root.querySelector(".mp-search input")?.addEventListener("input", event => {
      this.#query = fold(event.currentTarget.value.trim());
      this.#filter();
    });
    for (const chip of root.querySelectorAll(".mp-chip[data-filter='category']")) {
      chip.addEventListener("click", () => {
        this.#category = chip.dataset.value ?? "";
        for (const other of root.querySelectorAll(".mp-chip[data-filter='category']")) other.classList.toggle("active", other === chip);
        this.#filter();
      });
    }
    for (const chip of root.querySelectorAll(".mp-chip[data-filter='role']")) {
      chip.addEventListener("click", () => {
        const role = chip.dataset.value;
        if (this.#roles.has(role)) this.#roles.delete(role);
        else this.#roles.add(role);
        chip.classList.toggle("active", this.#roles.has(role));
        this.#filter();
      });
    }
    // The spells of the pages (drawn later: the events come from the pages' box)
    const pages = root.querySelector(".mp-pages");
    const spellOf = event => event.target.closest?.(".mp-spell[data-uuid]");
    pages?.addEventListener("pointerover", event => {
      const spell = spellOf(event);
      if (spell && !spell.contains(event.relatedTarget)) this.#spellTip(spell);
    });
    pages?.addEventListener("pointerout", event => {
      const spell = spellOf(event);
      if (spell && !spell.contains(event.relatedTarget) && (game.tooltip.element === spell)) game.tooltip.deactivate();
    });
    pages?.addEventListener("click", event => {
      const spell = spellOf(event);
      // A link inside the opened text (a status, a tag) is its own
      if (spell && !event.target.closest(".mp-spell-text")) this.#toggleSpell(spell);
    });
    pages?.addEventListener("keydown", event => {
      if (!["Enter", " "].includes(event.key) || !event.target.matches?.(".mp-spell[data-uuid]")) return;
      event.preventDefault();
      this.#toggleSpell(event.target);
    });
  }

  /** The uuids of the spells on the page of a spell (read together). */
  #pageSpells(li) {
    return [...(li.closest(".mp-page")?.querySelectorAll(".mp-spell[data-uuid]") ?? [li])].map(s => s.dataset.uuid);
  }

  /** The tooltip of a spell under the pointer (not of an opened one: its text is already there). */
  async #spellTip(li) {
    if (li.classList.contains("open")) return;
    const spell = this.spells.get(li.dataset.uuid);
    if (!spell) return;
    const texts = await spellTexts(this.#pageSpells(li)).catch(() => new Map());
    if (!li.matches(":hover") || li.classList.contains("open")) return;
    game.tooltip.activate(li, { html: spellTip(spell, texts.get(spell.uuid)), cssClass: "lhcl-tooltip", direction: "LEFT" });
  }

  /** Open or close a spell's whole text under it. */
  async #toggleSpell(li) {
    const box = li.querySelector(".mp-spell-text");
    if (!box) return;
    const open = !li.classList.contains("open");
    if (game.tooltip.element === li) game.tooltip.deactivate();
    if (open && !box.dataset.filled) {
      const texts = await spellTexts(this.#pageSpells(li)).catch(() => new Map());
      box.innerHTML = texts.get(li.dataset.uuid)?.html || `<p>${escape(L("MagicPicker.SpellNoText"))}</p>`;
      box.dataset.filled = "1";
    }
    li.classList.toggle("open", open);
    li.setAttribute("aria-expanded", String(open));
    box.hidden = !open;
    if (open) box.animate?.([{ opacity: 0, transform: "translateY(-3px)" }, { opacity: 1, transform: "none" }], { duration: 150, easing: "ease-out" });
  }

  /** The page of a Magia, drawn the first time it is shown. */
  #page(uuid) {
    const pages = this.root.querySelector(".mp-pages");
    let page = pages.querySelector(`.mp-page[data-uuid="${CSS.escape(uuid)}"]`);
    if (page) return page;
    const magia = this.magias.get(uuid);
    const template = Handlebars.partials[MAGIC_PAGE];
    if (!magia || (typeof template !== "function")) return null;
    pages.insertAdjacentHTML("beforeend", template(magia, { allowProtoMethodsByDefault: true, allowProtoPropertiesByDefault: true }));
    page = pages.lastElementChild;
    page.hidden = true;
    return page;
  }

  /** Show the page of a Magia (the one under the pointer; with none, the one selected; else the guide). */
  show(uuid) {
    const shown = uuid ?? this.selected;
    const page = shown ? this.#page(shown) : null;
    const guide = this.root.querySelector(".mp-page.mp-guide");
    for (const other of this.root.querySelectorAll(".mp-page")) {
      const on = page ? (other === page) : (other === guide);
      if (on && other.hidden) other.animate?.([{ opacity: 0, transform: "translateY(4px)" }, { opacity: 1, transform: "none" }],
        { duration: 140, easing: "ease-out" });
      other.hidden = !on;
    }
    this.root.querySelector(".mp-detail")?.classList.toggle("preview", !!uuid && (uuid !== this.selected));
  }

  /** Select a Magia: its card is marked. */
  select(uuid) {
    this.selected = this.magias.has(uuid) ? uuid : null;
    for (const card of this.root.querySelectorAll(".mp-card")) {
      const on = card.dataset.uuid === this.selected;
      card.classList.toggle("selected", on);
      card.setAttribute("aria-selected", String(on));
    }
    this.show(this.selected);
    this.onSelect?.(this.selected);
  }

  /** Show the cards that pass the filters (the selected one stays selected even when hidden). */
  #filter() {
    let shown = 0;
    for (const card of this.root.querySelectorAll(".mp-card")) {
      const roles = (card.dataset.roles ?? "").split(" ");
      const ok = (!this.#category || (card.dataset.category === this.#category))
        && [...this.#roles].every(r => roles.includes(r))
        && (!this.#query || card.dataset.search.includes(this.#query));
      card.hidden = !ok;
      if (ok) shown += 1;
    }
    const empty = this.root.querySelector(".mp-empty");
    if (empty) empty.hidden = shown > 0;
  }

  /** Arrows move between the cards, Enter selects (twice: chooses). */
  #onKey(event) {
    const card = event.target.closest?.(".mp-card");
    if (!card) return;
    if ((event.key === "Enter") || (event.key === " ")) {
      event.preventDefault();
      if (this.selected === card.dataset.uuid) this.onChoose?.(card.dataset.uuid);
      else this.select(card.dataset.uuid);
      return;
    }
    const steps = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: "row", ArrowUp: "-row" };
    if (!(event.key in steps)) return;
    event.preventDefault();
    const cards = [...this.root.querySelectorAll(".mp-card:not([hidden])")];
    const index = cards.indexOf(card);
    const columns = getComputedStyle(card.parentElement).gridTemplateColumns.split(" ").length || 1;
    const step = steps[event.key];
    const next = (step === "row") ? index + columns : (step === "-row") ? index - columns : index + step;
    cards[Math.clamp(next, 0, cards.length - 1)]?.focus();
  }
}

/* -------------------------------------------- */
/*  Window                                      */
/* -------------------------------------------- */

export class MagicPicker extends HandlebarsApplicationMixin(ApplicationV2) {

  /**
   * Let the player pick a Magia for a slot of their class.
   * @param {Actor} actor
   * @param {object} [options]
   * @param {Item} [options.source]  The class item that gives the slot
   * @param {number} [options.rank]  The CR of the slot (1, 5 or 10)
   * @param {boolean} [options.awakening]  The player draws it (apps/awakening.mjs): the rolls, and only the Magias rolled
   * @returns {Promise<string|null>}  The uuid of the Magia chosen
   */
  static choose(actor, { source = null, rank = 1, awakening = false } = {}) {
    return new Promise(resolve => new this({ actor, source, rank, awakening, resolve }).render({ force: true }));
  }

  constructor({ actor, source, rank, awakening = false, resolve, ...options } = {}) {
    // As large as the screen allows, centered
    const width = Math.min(1180, window.innerWidth - 40);
    const height = Math.min(820, window.innerHeight - 40);
    super({ ...options, position: { width, height, left: (window.innerWidth - width) / 2, top: (window.innerHeight - height) / 2 } });
    this.actor = actor;
    this.source = source;
    this.rank = rank;
    this.awakening = !!awakening;
    this.#resolve = resolve;
  }

  static DEFAULT_OPTIONS = {
    classes: ["eternia", "magic-picker"],
    tag: "div",
    window: { icon: "fa-solid fa-hat-wizard", resizable: true },
    actions: {
      choose: MagicPicker.#onChoose,
      skip: MagicPicker.#onSkip,
      awaken: MagicPicker.#onAwaken
    }
  };

  static PARTS = {
    main: { template: "systems/eternia/templates/apps/magic-picker.hbs" }
  };

  /** Resolves the promise of `choose` (once). */
  #resolve;

  /** The browser of the cards. */
  #browser = null;

  /** @override */
  get title() {
    if (this.awakening) return L("Awakening.Title", { name: this.actor.name });
    return L("MagicPicker.Title", { name: this.source?.name ?? this.actor.name });
  }

  /** @override */
  async _prepareContext(options) {
    const cr = Math.max(1, Number(this.actor.system.infos?.crank) || 1);
    const owned = this.actor.items.filter(i => (i.type === "skill") && i.getFlag("eternia", "magic")?.id);
    const job = CLASSES[this.source?.system?.identifier] ?? null;
    const browser = await magicBrowserContext({
      cr,
      ownedIds: new Set(owned.map(i => i.getFlag("eternia", "magic").id)),
      ownedNames: new Set(owned.map(i => fold(i.name))),
      slots: magicSlotsOf(this.source),
      actor: this.actor
    });
    // The Awakening: the bar of the rolls, and only the Magias rolled
    if (this.awakening) {
      const all = browser.magias;
      browser.magias = awakeningChoices(this.actor).map(uuid => all.find(m => m.uuid === uuid)).filter(Boolean);
      browser.awakening = await awakeningView(this.actor, all);
      browser.awakenWaiting = !browser.magias.length;
    }
    return {
      ...browser,
      cr,
      rank: this.rank,
      color: job?.color ?? "#1f5137",
      slot: L("MagicPicker.Slot", { rank: this.rank }),
      className: this.source?.name ?? "",
      owned: owned.map(i => i.name).join(", ")
    };
  }

  /** @override */
  async _onRender(context, options) {
    await super._onRender(context, options);
    const button = this.element.querySelector(".mp-choose");
    // A roll in the Awakening's bar selects its Magia too
    const rolls = [...this.element.querySelectorAll(".aw-roll.made[data-uuid]")];
    const selected = this.#selectNext ?? this.#browser?.selected ?? null;
    this.#selectNext = null;
    this.#browser = new MagicBrowser(this.element, {
      magias: context.magias,
      selected,
      onSelect: uuid => {
        rolls.forEach(li => li.classList.toggle("selected", li.dataset.uuid === uuid));
        if (!button) return;
        const magia = context.magias.find(m => m.uuid === uuid);
        // One this player may not hold (full, or an exclusive one beside another Magia): seen, not taken
        button.disabled = !magia || !!magia.blocked;
        button.querySelector("span").textContent = !magia ? L("MagicPicker.ChooseNone")
          : (magia.blocked ? magia.blocked : L("MagicPicker.Choose", { name: magia.name }));
      },
      onChoose: uuid => this.#finish(uuid)
    });
    for (const li of rolls) li.addEventListener("click", () => this.#browser.select(li.dataset.uuid));
    this.element.querySelector(".mp-search input")?.focus();
  }

  /** The Magia to select once the window is drawn again (the one just rolled). */
  #selectNext = null;

  /** The next roll of the Awakening; the first Magia rolled comes selected. */
  static async #onAwaken(event, target) {
    if (target) target.disabled = true;
    try {
      const roll = await rollAwakening(this.actor);
      if (roll && !this.#browser?.selected) this.#selectNext = roll.uuid;
    }
    catch (err) {
      console.error("eternia | Could not roll the Awakening", err);
      ui.notifications.error(L("Awakening.Error", { error: err.message }));
    }
    await this.render();
  }

  /** @override */
  _onClose(options) {
    super._onClose(options);
    this.#resolve?.(null);
    this.#resolve = null;
  }

  /** Close with this Magia (not one this player may not hold). */
  #finish(uuid) {
    if (!uuid) return;
    const blocked = this.#browser?.magias.get(uuid)?.blocked;
    if (blocked) return ui.notifications.warn(blocked);
    this.#resolve?.(uuid);
    this.#resolve = null;
    this.close();
  }

  static #onChoose() {
    this.#finish(this.#browser?.selected);
  }

  static #onSkip() {
    this.close();
  }
}
