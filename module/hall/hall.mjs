/**
 * The Hall of Fame (Hall da Fama): the people everyone in the world has heard of, and why. The GM puts a character in it
 * (dropping it on the window, from the Actors list's menu, or with "Add"), says what it is famous for, its epithet, its
 * field (arms, magic, nobility…) and how far its name goes (the renown, 1 to 5 stars); the players see the Hall from the
 * "Hall da Fama" button of the token controls, and an entry the GM keeps hidden only shows to the GM.
 *
 * The entries live in a world setting (`hallOfFame`): each keeps a copy of the name and the picture, so a player sees
 * them without any permission on the actor. The window shows a plaque per entry (the pinned first, then by renown) and,
 * beside them, the page of the one under the pointer (or of the one selected): drawn with the window, shown by toggling.
 */
import { L, SYSTEM_ID, setting } from "../settings.mjs";
import { escape } from "../helpers/utils.mjs";
import { fold } from "../apps/magic-catalog.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export const HALL_SETTING = "hallOfFame";

/** What a name is famous for, in the order of the filters. */
export const HALL_CATEGORIES = {
  arms: { icon: "fa-solid fa-sword", color: "#7a2e2e" },
  magic: { icon: "fa-solid fa-hat-wizard", color: "#4a3b7a" },
  crown: { icon: "fa-solid fa-crown", color: "#8a6418" },
  faith: { icon: "fa-solid fa-hands-praying", color: "#2a6f73" },
  craft: { icon: "fa-solid fa-hammer", color: "#6b4f2a" },
  arena: { icon: "fa-solid fa-swords", color: "#1f5137" },
  lore: { icon: "fa-solid fa-book", color: "#2d4f6e" },
  infamy: { icon: "fa-solid fa-skull", color: "#33302d" }
};
const DEFAULT_CATEGORY = "arms";

/** How far a name goes: 1 to 5 stars. */
export const MAX_RENOWN = 5;
const DEFAULT_RENOWN = 3;

const clampRenown = n => {
  const value = Number(n);
  return Number.isFinite(value) ? Math.clamp(Math.round(value), 1, MAX_RENOWN) : DEFAULT_RENOWN;
};
const categoryOf = id => (HALL_CATEGORIES[id] ? id : DEFAULT_CATEGORY);

/** The view of a field: its label, hint, icon and color. */
export function hallCategoryView(id) {
  const c = HALL_CATEGORIES[categoryOf(id)];
  return { id: categoryOf(id), icon: c.icon, color: c.color, label: L(`Hall.Category.${categoryOf(id)}`), hint: L(`Hall.CategoryHint.${categoryOf(id)}`) };
}

/** The view of a renown: its stars, label and what it means. */
export function renownView(n) {
  const renown = clampRenown(n);
  return {
    renown,
    stars: Array.from({ length: MAX_RENOWN }, (_, i) => ({ n: i + 1, on: i < renown })),
    label: L(`Hall.Renown.${renown}`),
    hint: L(`Hall.RenownHint.${renown}`)
  };
}

/* -------------------------------------------- */
/*  The entries                                 */
/* -------------------------------------------- */

/** The entries of the Hall, as saved (each with an id). */
export const hallEntries = () => (Array.isArray(setting(HALL_SETTING)) ? setting(HALL_SETTING) : []).filter(e => e?.id);

/** The entries a user sees: all for the GM, the ones not hidden for the players. */
export const visibleEntries = (user = game.user) => hallEntries().filter(e => user.isGM || !e.hidden);

/** Pinned first, then by renown, then by name. */
const byFame = (a, b) => (Number(!!b.pinned) - Number(!!a.pinned)) || (clampRenown(b.renown) - clampRenown(a.renown))
  || String(a.name).localeCompare(String(b.name), game.i18n.lang);

/** Save the entries (the GM's). */
async function saveHall(entries) {
  if (!game.user.isGM) throw new Error(L("Hall.GMOnly"));
  await game.settings.set(SYSTEM_ID, HALL_SETTING, entries);
}

/** The epithet an actor already has in its Biography (flags.eternia.bio.epithet). */
const epithetOf = actor => String(actor?.flags?.[SYSTEM_ID]?.bio?.epithet ?? "").trim();

/**
 * Put a character in the Hall (the GM). One already there is only shown.
 * @param {Actor|string} actorOrUuid   A world or compendium actor, or its uuid
 * @param {object} [data]              The entry's fields (reason, category, renown, epithet, hidden)
 * @returns {Promise<object|null>}     The entry
 */
export async function addToHall(actorOrUuid, data = {}) {
  const actor = (typeof actorOrUuid === "string") ? await fromUuid(actorOrUuid) : actorOrUuid;
  if (!(actor instanceof Actor)) return null;
  if (actor.type !== "character") {
    ui.notifications.warn(L("Hall.OnlyCharacters"));
    return null;
  }
  const entries = hallEntries();
  const known = entries.find(e => e.uuid === actor.uuid);
  if (known) return known;
  const entry = {
    id: foundry.utils.randomID(),
    uuid: actor.uuid,
    name: actor.prototypeToken?.name || actor.name,
    img: actor.img,
    epithet: data.epithet ?? epithetOf(actor),
    reason: String(data.reason ?? ""),
    category: categoryOf(data.category),
    renown: clampRenown(data.renown ?? DEFAULT_RENOWN),
    hidden: !!data.hidden,
    pinned: !!data.pinned,
    added: Date.now()
  };
  await saveHall([...entries, entry]);
  return entry;
}

/** Change an entry (the GM). */
export async function updateHallEntry(id, changes = {}) {
  const entries = hallEntries();
  const index = entries.findIndex(e => e.id === id);
  if (index === -1) return null;
  const entry = { ...entries[index], ...changes };
  entry.category = categoryOf(entry.category);
  entry.renown = clampRenown(entry.renown);
  entry.name = String(entry.name ?? "").trim() || entries[index].name;
  entries[index] = entry;
  await saveHall(entries);
  return entry;
}

/** Take an entry out of the Hall (the GM). */
export async function removeFromHall(id) {
  await saveHall(hallEntries().filter(e => e.id !== id));
}

/** The paragraphs of a text typed in the box (blank lines split them). */
const paragraphs = text => String(text ?? "").split(/\n\s*\n/).map(p => p.trim()).filter(Boolean)
  .map(p => `<p>${escape(p).replace(/\n/g, "<br>")}</p>`).join("");

/* -------------------------------------------- */
/*  The window                                  */
/* -------------------------------------------- */

export class HallOfFame extends HandlebarsApplicationMixin(ApplicationV2) {

  static ID = "eternia-hall";

  /** Open the Hall (on an entry), or bring it to the front. */
  static open({ select = null } = {}) {
    let app = foundry.applications.instances.get(this.ID);
    if (!app) app = new this();
    if (select) app.#selected = select;
    if (app.rendered) app.bringToFront?.();
    app.render({ force: true });
    return app;
  }

  /** The button of the token controls: opens the Hall, or closes it when it is open. */
  static toggle() {
    const existing = foundry.applications.instances.get(this.ID);
    if (existing?.rendered) return existing.close();
    return this.open();
  }

  /** The windows open (drawn again when the entries change). */
  static get instances() {
    const app = foundry.applications.instances.get(this.ID);
    return app ? [app] : [];
  }

  constructor(options = {}) {
    const width = Math.min(1200, window.innerWidth - 40);
    const height = Math.min(800, window.innerHeight - 40);
    super({ ...options, id: HallOfFame.ID, position: { width, height, left: (window.innerWidth - width) / 2, top: (window.innerHeight - height) / 2 } });
  }

  static DEFAULT_OPTIONS = {
    classes: ["eternia", "eternia-hall"],
    tag: "div",
    window: { icon: "fa-solid fa-building-columns", resizable: true },
    actions: {
      adding: HallOfFame.#onAdding,
      addActor: HallOfFame.#onAddActor,
      edit: HallOfFame.#onEdit,
      cancelEdit: HallOfFame.#onCancelEdit,
      save: HallOfFame.#onSave,
      star: HallOfFame.#onStar,
      toggleHidden: HallOfFame.#onToggleHidden,
      togglePinned: HallOfFame.#onTogglePinned,
      remove: HallOfFame.#onRemove,
      openSheet: HallOfFame.#onOpenSheet
    }
  };

  static PARTS = {
    main: { template: "systems/eternia/templates/hall/hall.hbs", scrollable: [".hf-wall", ".hf-spotlight", ".hf-add-list"] }
  };

  /** The entry selected (its page stays when the pointer leaves the plaques). */
  #selected = null;
  /** The entry the GM is editing (its page is a form). */
  #editing = null;
  /** The renown picked in the form, before it is saved. */
  #renownDraft = null;
  /** The GM is picking a character to add (the page is the list of candidates). */
  #adding = false;
  /** The filters: one field, the search. */
  #category = "";
  #query = "";

  /** @override */
  get title() {
    return L("Hall.Title");
  }

  /** @override */
  async _prepareContext(options) {
    const gm = game.user.isGM;
    const entries = visibleEntries().sort(byFame);
    if (this.#selected && !entries.some(e => e.id === this.#selected)) this.#selected = null;
    if (this.#editing && !entries.some(e => e.id === this.#editing)) this.#editing = null;
    const view = entries.map(e => {
      const category = hallCategoryView(e.category);
      const renown = renownView((this.#editing === e.id) && this.#renownDraft ? this.#renownDraft : e.renown);
      return {
        ...e,
        ...renown,
        categoryId: category.id,
        categoryLabel: category.label,
        categoryIcon: category.icon,
        categoryColor: category.color,
        reasonHtml: paragraphs(e.reason),
        search: fold(`${e.name} ${e.epithet ?? ""} ${e.reason ?? ""} ${category.label}`),
        editing: this.#editing === e.id,
        selected: this.#selected === e.id,
        canOpen: gm && !!e.uuid
      };
    });
    const categories = Object.keys(HALL_CATEGORIES).map(id => ({ ...hallCategoryView(id), count: view.filter(e => e.categoryId === id).length }))
      .filter(c => gm || c.count);
    const choices = Object.keys(HALL_CATEGORIES).map(id => ({ id, label: L(`Hall.Category.${id}`) }));
    const inHall = new Set(hallEntries().map(e => e.uuid));
    // The GM's list to add from: the world's characters not in the Hall yet, the ones with no player first
    const candidates = (gm && this.#adding) ? game.actors.filter(a => (a.type === "character") && !inHall.has(a.uuid))
      .sort((a, b) => (Number(a.hasPlayerOwner) - Number(b.hasPlayerOwner)) || a.name.localeCompare(b.name, game.i18n.lang))
      .map(a => ({ uuid: a.uuid, name: a.name, img: a.img, epithet: epithetOf(a), player: a.hasPlayerOwner, search: fold(`${a.name} ${epithetOf(a)}`) })) : [];
    const hiddenCount = view.filter(e => e.hidden).length;
    return {
      gm,
      entries: view,
      total: view.length,
      shown: view.length - hiddenCount,
      hiddenCount,
      categories,
      choices,
      category: this.#category,
      query: this.#query,
      adding: gm && this.#adding,
      candidates,
      lead: gm ? L("Hall.LeadGM") : L("Hall.Lead"),
      tiers: Array.from({ length: MAX_RENOWN }, (_, i) => renownView(MAX_RENOWN - i))
    };
  }

  /** @override */
  async _onRender(context, options) {
    await super._onRender(context, options);
    const root = this.element;
    const wall = root.querySelector(".hf-wall");
    const plaqueOf = event => event.target.closest?.(".hf-plaque[data-id]");
    wall?.addEventListener("pointerover", event => {
      const plaque = plaqueOf(event);
      if (plaque) this.#show(plaque.dataset.id, { preview: true });
    });
    wall?.addEventListener("pointerleave", () => this.#show(null));
    wall?.addEventListener("focusin", event => {
      const plaque = plaqueOf(event);
      if (plaque) this.#show(plaque.dataset.id, { preview: true });
    });
    wall?.addEventListener("click", event => {
      const plaque = plaqueOf(event);
      if (plaque) this.#select(plaque.dataset.id);
    });
    wall?.addEventListener("keydown", event => {
      const plaque = plaqueOf(event);
      if (!plaque || !["Enter", " "].includes(event.key)) return;
      event.preventDefault();
      this.#select(plaque.dataset.id);
    });
    // The filters run on the plaques already drawn
    root.querySelector(".hf-search input")?.addEventListener("input", event => {
      this.#query = fold(event.currentTarget.value.trim());
      this.#filter();
    });
    for (const chip of root.querySelectorAll(".hf-chip[data-category]")) {
      chip.addEventListener("click", () => {
        this.#category = chip.dataset.category ?? "";
        for (const other of root.querySelectorAll(".hf-chip[data-category]")) other.classList.toggle("active", other === chip);
        this.#filter();
      });
    }
    root.querySelector(".hf-add-search input")?.addEventListener("input", event => {
      const query = fold(event.currentTarget.value.trim());
      for (const li of root.querySelectorAll(".hf-candidate")) li.hidden = !!query && !li.dataset.search.includes(query);
    });
    // The GM drops a character on the window
    if (game.user.isGM) {
      root.addEventListener("dragover", event => {
        event.preventDefault();
        root.classList.add("hf-dropping");
      });
      root.addEventListener("dragleave", event => {
        if (!root.contains(event.relatedTarget)) root.classList.remove("hf-dropping");
      });
      root.addEventListener("drop", event => this.#onDrop(event));
    }
    this.#filter();
    this.#show(null);
    if (this.#editing) root.querySelector(".hf-edit [name='epithet']")?.focus();
  }

  /** Show the page of an entry (under the pointer, else the one selected, else the welcome page). */
  #show(id, { preview = false } = {}) {
    const pages = [...this.element.querySelectorAll(".hf-page")];
    // The form of the entry being edited stays, alone
    if (this.#editing) {
      for (const page of pages) page.hidden = !page.classList.contains("hf-edit");
      return;
    }
    if (this.#adding) return;
    const shown = id ?? this.#selected;
    const page = shown ? pages.find(p => p.dataset.id === shown) : null;
    const welcome = this.element.querySelector(".hf-page.hf-welcome");
    for (const other of pages) {
      const on = page ? (other === page) : (other === welcome);
      if (on && other.hidden) other.animate?.([{ opacity: 0, transform: "translateY(4px)" }, { opacity: 1, transform: "none" }], { duration: 140, easing: "ease-out" });
      other.hidden = !on;
    }
    this.element.querySelector(".hf-spotlight")?.classList.toggle("preview", preview && !!id && (id !== this.#selected));
  }

  /** Select an entry: its plaque is marked, and its page stays. */
  #select(id) {
    this.#selected = (this.#selected === id) ? null : id;
    for (const plaque of this.element.querySelectorAll(".hf-plaque[data-id]")) {
      const on = plaque.dataset.id === this.#selected;
      plaque.classList.toggle("selected", on);
      plaque.setAttribute("aria-selected", String(on));
    }
    this.#show(this.#selected);
  }

  /** Show the plaques that pass the filters. */
  #filter() {
    let shown = 0;
    for (const plaque of this.element.querySelectorAll(".hf-plaque[data-id]")) {
      const ok = (!this.#category || (plaque.dataset.category === this.#category)) && (!this.#query || plaque.dataset.search.includes(this.#query));
      plaque.hidden = !ok;
      if (ok) shown += 1;
    }
    const empty = this.element.querySelector(".hf-none");
    if (empty) empty.hidden = (shown > 0) || !this.element.querySelector(".hf-plaque[data-id]");
  }

  /** A character dropped on the window (the GM): into the Hall, and its page opens to be written. */
  async #onDrop(event) {
    event.preventDefault();
    this.element.classList.remove("hf-dropping");
    const data = foundry.applications.ux.TextEditor.implementation.getDragEventData(event);
    if ((data?.type !== "Actor") || !data.uuid) return;
    const entry = await addToHall(data.uuid);
    if (!entry) return;
    this.#adding = false;
    this.#selected = entry.id;
    this.#editing = entry.id;
    this.#renownDraft = null;
    this.render();
  }

  /** "Add": the list of the world's characters to pick from (again: back to the pages). */
  static #onAdding() {
    this.#adding = !this.#adding;
    this.#editing = null;
    this.render();
  }

  static async #onAddActor(event, target) {
    const entry = await addToHall(target.dataset.uuid);
    if (!entry) return;
    this.#adding = false;
    this.#selected = entry.id;
    this.#editing = entry.id;
    this.#renownDraft = null;
    this.render();
  }

  static #onEdit(event, target) {
    this.#editing = target.closest("[data-id]")?.dataset.id ?? null;
    this.#selected = this.#editing ?? this.#selected;
    this.#renownDraft = null;
    this.#adding = false;
    this.render();
  }

  static #onCancelEdit() {
    this.#editing = null;
    this.#renownDraft = null;
    this.render();
  }

  /** A star of the form: the renown, saved with the rest. */
  static #onStar(event, target) {
    this.#renownDraft = clampRenown(target.dataset.n);
    const form = target.closest(".hf-edit");
    for (const star of form?.querySelectorAll(".hf-star-pick") ?? []) star.classList.toggle("on", Number(star.dataset.n) <= this.#renownDraft);
    const label = form?.querySelector(".hf-star-label");
    if (label) label.textContent = renownView(this.#renownDraft).label;
  }

  static async #onSave(event, target) {
    const form = target.closest(".hf-edit");
    const id = form?.dataset.id;
    if (!id) return;
    const value = name => form.querySelector(`[name="${name}"]`)?.value ?? "";
    const changes = {
      name: value("name"),
      epithet: value("epithet").trim(),
      category: value("category"),
      reason: value("reason").trim()
    };
    if (this.#renownDraft) changes.renown = this.#renownDraft;
    this.#editing = null;
    this.#renownDraft = null;
    await updateHallEntry(id, changes);
  }

  static async #onToggleHidden(event, target) {
    const id = target.closest("[data-id]")?.dataset.id;
    const entry = hallEntries().find(e => e.id === id);
    if (entry) await updateHallEntry(id, { hidden: !entry.hidden });
  }

  static async #onTogglePinned(event, target) {
    const id = target.closest("[data-id]")?.dataset.id;
    const entry = hallEntries().find(e => e.id === id);
    if (entry) await updateHallEntry(id, { pinned: !entry.pinned });
  }

  static async #onRemove(event, target) {
    const id = target.closest("[data-id]")?.dataset.id;
    const entry = hallEntries().find(e => e.id === id);
    if (!entry) return;
    const ok = await foundry.applications.api.DialogV2.confirm({
      window: { title: L("Hall.RemoveTitle"), icon: "fa-solid fa-building-columns" },
      classes: ["eternia"],
      content: `<p>${escape(L("Hall.RemoveConfirm", { name: entry.name }))}</p>`
    });
    if (!ok) return;
    if (this.#selected === id) this.#selected = null;
    this.#editing = null;
    await removeFromHall(id);
  }

  static async #onOpenSheet(event, target) {
    const id = target.closest("[data-id]")?.dataset.id;
    const entry = hallEntries().find(e => e.id === id);
    const actor = entry?.uuid ? await fromUuid(entry.uuid) : null;
    if (actor) actor.sheet.render({ force: true });
    else ui.notifications.warn(L("Hall.Missing", { name: entry?.name ?? "?" }));
  }
}
