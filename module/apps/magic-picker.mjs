/**
 * The Magia picker: a magic class's Magia slot (CR 1, 5 and 10; apps/option-grants.mjs). A large window with every
 * Magia the character can still take as a card (its picture, category, a short line and the roles of its spells),
 * filters by category and by role, a search (Magia, line or spell) and, beside the cards, the page of the Magia under
 * the pointer (or of the one selected): what it is, its Tabu, its spells by CR and the closing line of its description.
 * With no Magia under the pointer nor selected, the page says how the Magias work. Resolves with the uuid chosen, or
 * null ("Not now", Escape or the window closed).
 *
 * The short line is the Magia's `flags.eternia.magic.tagline` (else the first words of its description). The roles come
 * from the spells' own data (target, damage, the statuses they give), so a new Magia gets them by itself.
 */
import { L } from "../settings.mjs";
import { term } from "../i18n/terms.mjs";
import { CLASSES } from "../classes/data.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

/** The categories, in the order of the filters. */
export const MAGIC_CATEGORIES = {
  caster: { icon: "fa-solid fa-wand-magic-sparkles", color: "#2f6b4a" },
  holder: { icon: "fa-solid fa-key", color: "#8a6a25" },
  lost: { icon: "fa-solid fa-book-skull", color: "#8c2f2f" },
  forbidden: { icon: "fa-solid fa-skull", color: "#4a2b57" },
  ancestral: { icon: "fa-solid fa-feather-pointed", color: "#2a6f73" }
};

/** What the spells do, read from their data. */
const ROLES = {
  area: "fa-solid fa-burst",
  control: "fa-solid fa-link",
  wear: "fa-solid fa-droplet",
  heal: "fa-solid fa-heart-pulse",
  guard: "fa-solid fa-shield-halved",
  support: "fa-solid fa-hand-sparkles",
  move: "fa-solid fa-wind"
};
const CONTROL = new Set(["prone", "slowed", "rooted", "grappled", "dazed", "confused", "frightened", "charmed", "asleep",
  "paralyzed", "silenced", "sealed", "blinded", "taunted", "staggered", "rigor", "disarmed"]);
const WEAR = new Set(["burning", "poisoned", "decay", "freezing", "shocked", "cursed", "fissured", "exposed", "marked",
  "doom", "pursuit"]);
const GUARD = new Set(["cancel", "barrier", "mirror", "intangible", "lastStand", "hidden"]);
const SUPPORT = new Set(["hasted", "empowered", "focused", "awakened", "bond"]);
const MULTI = new Set(["Area", "Wide", "Line", "Targets"]);

const statusLabel = id => game.i18n.localize(`ETERNIA.StatusEffect.${id}`);
const fold = text => String(text ?? "").normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

/* -------------------------------------------- */
/*  Catalog                                     */
/* -------------------------------------------- */

/** What a Magia's description says: the opening, the Tabu, other notes and the closing line. */
function readDescription(html) {
  const root = new DOMParser().parseFromString(`<div>${html ?? ""}</div>`, "text/html").body.firstElementChild;
  const first = root.querySelector("p");
  first?.querySelector("strong")?.remove();
  const intro = first?.textContent.trim() ?? "";
  let tabu = null;
  const notes = [];
  for (const li of root.querySelectorAll("li")) {
    const strong = li.querySelector("strong");
    const label = (strong?.textContent ?? "").replace(/[:.]\s*$/, "").trim();
    strong?.remove();
    const text = li.textContent.trim();
    if (/^tabu\b/i.test(label)) tabu = { label, text };
    // The spells and the Motor are drawn from the spells themselves.
    else if (label && !/^(feitiços|o motor|spells|the motor)\b/i.test(label)) notes.push({ label, text });
  }
  const visual = [...root.querySelectorAll("p em")].at(-1)?.textContent.trim() ?? "";
  return { intro, tabu, notes, visual };
}

/** The statuses a spell gives (on a hit, or with its effects) and what they mean for its roles. */
function readSpell(doc, cr) {
  const f = doc.flags?.eternia ?? {};
  const system = doc.system ?? {};
  const damage = system.damage ?? {};
  const motor = f.motor ?? {};
  const effects = (doc.effects ?? []).filter(e => !e.transfer);
  const hit = (f.hitStatuses ?? []).map(s => s.statusId).filter(Boolean);
  const given = effects.flatMap(e => [...(e.statuses ?? []), e.flags?.eternia?.statusData?.statusId]).filter(Boolean);
  const statuses = [...new Set([...hit, ...given])];
  const dice = damage.dice;
  const deals = !damage.recovery && (!!Number(dice) || /@/.test(String(dice ?? "")));
  const heals = !!damage.recovery && (!!Number(dice) || /@/.test(String(dice ?? "")) || !!damage.mod);

  const roles = new Set();
  if (deals && MULTI.has(system.target)) roles.add("area");
  if (heals || statuses.includes("regen")) roles.add("heal");
  for (const id of statuses) {
    if (CONTROL.has(id)) roles.add("control");
    if (WEAR.has(id)) roles.add("wear");
    if (GUARD.has(id)) roles.add("guard");
    if (SUPPORT.has(id)) roles.add("support");
  }
  if ((f.useActions ?? []).some(a => a.type === "removeStatus")) roles.add("support");
  if ((system.tags ?? []).includes("Movement") || statuses.includes("flying")) roles.add("move");

  // "Major · Area 4Qd · 4d6": the timing, who it reaches and how hard
  const target = system.target;
  const reach = (!target || ["-", "Self"].includes(target)) ? L("MagicPicker.You")
    : [term("target", target), (system.range && (system.range !== "-")) ? term("range", system.range) : ""].filter(Boolean).join(" ");
  const numeric = Number(dice);
  const power = (deals || heals)
    ? (numeric ? L(heals ? "MagicPicker.HealDice" : "MagicPicker.Dice", { n: numeric }) : L("MagicPicker.MotorDice"))
    : "";
  const minRank = Math.max(1, Number(f.minRank) || 1);
  return {
    uuid: doc.uuid,
    name: doc.name,
    img: doc.img,
    minRank,
    now: minRank <= cr,
    tier: motor.needs?.full ? "supreme" : ((Number(motor.gain) >= 2) ? "big" : ""),
    meta: [term("timing", system.timing ?? ""), reach, power].filter(Boolean).join(" · "),
    statuses: statuses.map(statusLabel),
    roles
  };
}

/**
 * Every Magia of the compendiums with its spells, in name order.
 * @param {number} cr  The character's CR (which spells it already reaches)
 */
async function magicCatalog(cr) {
  const magias = [];
  for (const pack of game.packs) {
    if ((pack.documentName !== "Item") || !pack.visible) continue;
    const index = await pack.getIndex({ fields: ["flags.eternia.magic", "flags.eternia.magicSpell"] });
    const ids = index.filter(e => (e.type === "skill") && (e.flags?.eternia?.magic?.id || e.flags?.eternia?.magicSpell?.id))
      .map(e => e._id);
    if (!ids.length) continue;
    const docs = await pack.getDocuments({ _id__in: ids });
    const spellsOf = new Map();
    for (const doc of docs) {
      const of = doc.flags?.eternia?.magicSpell?.id;
      if (!of) continue;
      if (!spellsOf.has(of)) spellsOf.set(of, []);
      spellsOf.get(of).push(doc);
    }
    for (const doc of docs) {
      const magic = doc.flags?.eternia?.magic;
      if (!magic?.id) continue;
      const text = readDescription(doc.system?.description);
      const spells = (spellsOf.get(magic.id) ?? []).sort((a, b) => ((Number(a.flags.eternia.minRank) || 1)
        - (Number(b.flags.eternia.minRank) || 1)) || (a.sort - b.sort)).map(s => readSpell(s, cr));
      // The roles of the Magia: those of its spells, the most frequent first
      const counts = new Map();
      for (const spell of spells) for (const role of spell.roles) counts.set(role, (counts.get(role) ?? 0) + 1);
      const roles = [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([id]) => id);
      const category = MAGIC_CATEGORIES[magic.category] ? magic.category : "caster";
      const tagline = magic.tagline || text.intro.split(/[:.;]/)[0];
      magias.push({
        uuid: doc.uuid,
        id: magic.id,
        name: doc.name,
        img: doc.img,
        category,
        tagline,
        ...text,
        spells,
        roles,
        search: fold([doc.name, tagline, ...spells.map(s => s.name)].join(" "))
      });
    }
  }
  return magias.sort((a, b) => a.name.localeCompare(b.name, game.i18n.lang));
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
   * @returns {Promise<string|null>}  The uuid of the Magia chosen
   */
  static choose(actor, { source = null, rank = 1 } = {}) {
    return new Promise(resolve => new this({ actor, source, rank, resolve }).render({ force: true }));
  }

  constructor({ actor, source, rank, resolve, ...options } = {}) {
    // As large as the screen allows, centered
    const width = Math.min(1180, window.innerWidth - 40);
    const height = Math.min(820, window.innerHeight - 40);
    super({ ...options, position: { width, height, left: (window.innerWidth - width) / 2, top: (window.innerHeight - height) / 2 } });
    this.actor = actor;
    this.source = source;
    this.rank = rank;
    this.#resolve = resolve;
  }

  static DEFAULT_OPTIONS = {
    classes: ["eternia", "magic-picker"],
    tag: "div",
    window: { icon: "fa-solid fa-hat-wizard", resizable: true },
    actions: {
      category: MagicPicker.#onCategory,
      role: MagicPicker.#onRole,
      choose: MagicPicker.#onChoose,
      skip: MagicPicker.#onSkip
    }
  };

  static PARTS = {
    main: { template: "systems/eternia/templates/apps/magic-picker.hbs" }
  };

  /** Resolves the promise of `choose` (once). */
  #resolve;

  /** The Magia selected (uuid). */
  #selected = null;

  /** The filters: one category, the roles every Magia shown must have, the search. */
  #category = "";
  #roles = new Set();
  #query = "";

  /** @override */
  get title() {
    return L("MagicPicker.Title", { name: this.source?.name ?? this.actor.name });
  }

  /** @override */
  async _prepareContext(options) {
    const cr = Math.max(1, Number(this.actor.system.infos?.crank) || 1);
    const owned = this.actor.items.filter(i => (i.type === "skill") && i.getFlag("eternia", "magic")?.id);
    const ownedIds = new Set(owned.map(i => i.getFlag("eternia", "magic").id));
    const ownedNames = new Set(owned.map(i => fold(i.name)));
    const magias = (await magicCatalog(cr)).filter(m => !ownedIds.has(m.id) && !ownedNames.has(fold(m.name)));
    const job = CLASSES[this.source?.system?.identifier] ?? null;

    const categories = Object.entries(MAGIC_CATEGORIES).map(([id, c]) => ({
      id, icon: c.icon, color: c.color, label: L(`MagicPicker.Category.${id}`), hint: L(`MagicPicker.CategoryHint.${id}`),
      count: magias.filter(m => m.category === id).length
    })).filter(c => c.count);
    const roles = Object.entries(ROLES).map(([id, icon]) => ({
      id, icon, label: L(`MagicPicker.Role.${id}`), hint: L(`MagicPicker.RoleHint.${id}`),
      count: magias.filter(m => m.roles.includes(id)).length
    })).filter(r => r.count);
    const roleView = id => ({ id, icon: ROLES[id], label: L(`MagicPicker.Role.${id}`) });

    return {
      cr,
      rank: this.rank,
      color: job?.color ?? "#1f5137",
      slot: L("MagicPicker.Slot", { rank: this.rank }),
      className: this.source?.name ?? "",
      total: magias.length,
      categories,
      roles,
      owned: owned.map(i => i.name).join(", "),
      magias: magias.map(m => ({
        ...m,
        categoryLabel: L(`MagicPicker.Category.${m.category}`),
        categoryIcon: MAGIC_CATEGORIES[m.category].icon,
        categoryColor: MAGIC_CATEGORIES[m.category].color,
        rolesKey: m.roles.join(" "),
        cardRoles: m.roles.slice(0, 4).map(roleView),
        allRoles: m.roles.map(roleView),
        nowCount: m.spells.filter(s => s.now).length,
        spells: m.spells.map(s => ({ ...s, tierLabel: s.tier ? L(`MagicPicker.Tier.${s.tier}`) : "" }))
      }))
    };
  }

  /** @override */
  async _onRender(context, options) {
    await super._onRender(context, options);
    const root = this.element;
    const grid = root.querySelector(".mp-grid");
    const cardOf = event => event.target.closest?.(".mp-card");

    grid.addEventListener("pointerover", event => {
      const card = cardOf(event);
      if (card) this.#show(card.dataset.uuid);
    });
    grid.addEventListener("pointerleave", () => this.#show(null));
    grid.addEventListener("focusin", event => {
      const card = cardOf(event);
      if (card) this.#show(card.dataset.uuid);
    });
    grid.addEventListener("click", event => {
      const card = cardOf(event);
      if (card) this.#select(card.dataset.uuid);
    });
    grid.addEventListener("dblclick", event => {
      const card = cardOf(event);
      if (card) this.#finish(card.dataset.uuid);
    });
    grid.addEventListener("keydown", event => this.#onKey(event));
    root.querySelector(".mp-search input")?.addEventListener("input", event => {
      this.#query = fold(event.currentTarget.value.trim());
      this.#filter();
    });
    this.#show(null);
    root.querySelector(".mp-search input")?.focus();
  }

  /** @override */
  _onClose(options) {
    super._onClose(options);
    this.#resolve?.(null);
    this.#resolve = null;
  }

  /* -------------------------------------------- */
  /*  Behavior                                    */
  /* -------------------------------------------- */

  /** Show the page of a Magia (the one under the pointer; with none, the one selected; else the guide). */
  #show(uuid) {
    const shown = uuid ?? this.#selected;
    let found = false;
    for (const page of this.element.querySelectorAll(".mp-page")) {
      const on = page.dataset.uuid === (shown ?? "guide");
      if (on && page.hidden) page.animate?.([{ opacity: 0, transform: "translateY(4px)" }, { opacity: 1, transform: "none" }],
        { duration: 140, easing: "ease-out" });
      page.hidden = !on;
      found ||= on;
    }
    if (!found) this.element.querySelector('.mp-page[data-uuid="guide"]').hidden = false;
    this.element.querySelector(".mp-detail")?.classList.toggle("preview", !!uuid && (uuid !== this.#selected));
  }

  /** Select a Magia: its card is marked and the button says its name. */
  #select(uuid) {
    this.#selected = uuid;
    for (const card of this.element.querySelectorAll(".mp-card")) {
      const on = card.dataset.uuid === uuid;
      card.classList.toggle("selected", on);
      card.setAttribute("aria-selected", String(on));
    }
    const card = this.element.querySelector(`.mp-card[data-uuid="${uuid}"]`);
    const button = this.element.querySelector(".mp-choose");
    if (button) {
      button.disabled = !card;
      button.querySelector("span").textContent = card
        ? L("MagicPicker.Choose", { name: card.dataset.name }) : L("MagicPicker.ChooseNone");
    }
    this.#show(uuid);
  }

  /** Close with this Magia. */
  #finish(uuid) {
    if (!uuid) return;
    this.#resolve?.(uuid);
    this.#resolve = null;
    this.close();
  }

  /** Show the cards that pass the filters (the selected one stays selected even when hidden). */
  #filter() {
    let shown = 0;
    for (const card of this.element.querySelectorAll(".mp-card")) {
      const roles = (card.dataset.roles ?? "").split(" ");
      const ok = (!this.#category || (card.dataset.category === this.#category))
        && [...this.#roles].every(r => roles.includes(r))
        && (!this.#query || card.dataset.search.includes(this.#query));
      card.hidden = !ok;
      if (ok) shown += 1;
    }
    this.element.querySelector(".mp-empty").hidden = shown > 0;
  }

  /** Arrows move between the cards, Enter selects (twice: chooses), Escape closes. */
  #onKey(event) {
    const card = event.target.closest?.(".mp-card");
    if (!card) return;
    if ((event.key === "Enter") || (event.key === " ")) {
      event.preventDefault();
      if (this.#selected === card.dataset.uuid) this.#finish(card.dataset.uuid);
      else this.#select(card.dataset.uuid);
      return;
    }
    const steps = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: "row", ArrowUp: "-row" };
    if (!(event.key in steps)) return;
    event.preventDefault();
    const cards = [...this.element.querySelectorAll(".mp-card:not([hidden])")];
    const index = cards.indexOf(card);
    const columns = getComputedStyle(card.parentElement).gridTemplateColumns.split(" ").length || 1;
    const step = steps[event.key];
    const next = (step === "row") ? index + columns : (step === "-row") ? index - columns : index + step;
    cards[Math.clamp(next, 0, cards.length - 1)]?.focus();
  }

  /* -------------------------------------------- */
  /*  Actions                                     */
  /* -------------------------------------------- */

  static #onCategory(event, target) {
    this.#category = target.dataset.value ?? "";
    for (const chip of this.element.querySelectorAll('[data-action="category"]')) {
      chip.classList.toggle("active", chip === target);
    }
    this.#filter();
  }

  static #onRole(event, target) {
    const role = target.dataset.value;
    if (this.#roles.has(role)) this.#roles.delete(role);
    else this.#roles.add(role);
    target.classList.toggle("active", this.#roles.has(role));
    this.#filter();
  }

  static #onChoose() {
    this.#finish(this.#selected);
  }

  static #onSkip() {
    this.close();
  }
}
