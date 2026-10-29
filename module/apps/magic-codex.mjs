/**
 * The Grimório: every Magia of the world for anyone to read (the "Magias" button of the token controls, below the
 * Market). The Magia browser of the picker (apps/magic-picker.mjs) with nothing to choose: the cards, the filters by
 * category and role, the search and, beside them, the page of the Magia under the pointer (or of the one selected),
 * whose spells open their whole text on a click. The Magias of the reader's character carry a mark, and its CR says
 * which spells it already reaches; the holders of the limited ones are everyone who has them, the reader too.
 */
import { L } from "../settings.mjs";
import { MagicBrowser, magicBrowserContext } from "./magic-picker.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

/** The character whose Magias the Grimório marks: the token selected (one of the user's), else the user's own. */
function readerOf() {
  const token = canvas?.ready ? canvas.tokens.controlled.find(t => (t.actor?.type === "character") && t.actor.isOwner) : null;
  const actor = token?.actor ?? game.user.character ?? null;
  return (actor?.type === "character") ? actor : null;
}

export class MagicCodex extends HandlebarsApplicationMixin(ApplicationV2) {

  static ID = "eternia-grimoire";

  /** Open the Grimório, or bring it to the front. */
  static open() {
    const existing = foundry.applications.instances.get(this.ID);
    if (existing) {
      existing.render({ force: true });
      existing.bringToFront?.();
      return existing;
    }
    const app = new this();
    app.render({ force: true });
    return app;
  }

  /** The button of the token controls: opens the Grimório, or closes it when it is open. */
  static toggle() {
    const existing = foundry.applications.instances.get(this.ID);
    if (existing?.rendered) return existing.close();
    return this.open();
  }

  constructor(options = {}) {
    // As large as the screen allows, centered (the picker's size)
    const width = Math.min(1180, window.innerWidth - 40);
    const height = Math.min(820, window.innerHeight - 40);
    super({ ...options, id: MagicCodex.ID, position: { width, height, left: (window.innerWidth - width) / 2, top: (window.innerHeight - height) / 2 } });
  }

  static DEFAULT_OPTIONS = {
    classes: ["eternia", "magic-picker", "magic-codex"],
    tag: "div",
    window: { icon: "fa-solid fa-book-open", resizable: true }
  };

  static PARTS = {
    main: { template: "systems/eternia/templates/apps/magic-codex.hbs" }
  };

  /** The browser of the cards. */
  #browser = null;

  /** @override */
  get title() {
    return L("Grimoire.Title");
  }

  /** @override */
  async _prepareContext(options) {
    const reader = readerOf();
    const cr = reader ? Math.max(1, Number(reader.system.infos?.crank) || 1) : 0;
    // Everyone counts among the holders here, the reader too (the picker counts them without who chooses)
    const browser = await magicBrowserContext({ cr });
    const owned = new Set((reader?.items ?? []).filter(i => (i.type === "skill") && i.getFlag("eternia", "magic")?.id)
      .map(i => i.getFlag("eternia", "magic").id));
    for (const magia of browser.magias) {
      // Nothing is taken here: a Magia this reader may not hold is read like the others (its page says why)
      magia.blocked = null;
      magia.owned = owned.has(magia.id);
      if (magia.owned) magia.ownedTip = L("Grimoire.OwnedTip", { name: reader.name });
    }
    const mine = browser.magias.filter(m => m.owned).map(m => m.name);
    return {
      ...browser,
      lead: L("Grimoire.Lead", { n: browser.total }),
      reader: reader?.name ?? "",
      mine: mine.join(", ")
    };
  }

  /** @override */
  async _onRender(context, options) {
    await super._onRender(context, options);
    this.#browser = new MagicBrowser(this.element, { magias: context.magias, selected: this.#browser?.selected ?? null });
    this.element.querySelector(".mp-search input")?.focus();
  }
}

/** Call during the `init` hook (after the Market: its button comes right below the Market's). */
export function registerMagicCodex() {
  Hooks.on("getSceneControlButtons", controls => {
    const tokens = controls.tokens;
    if (!tokens?.tools) return;
    tokens.tools.eterniaGrimoire = {
      name: "eterniaGrimoire",
      title: "ETERNIA.Grimoire.Button",
      icon: "fa-solid fa-book-open",
      order: Object.keys(tokens.tools).length,
      button: true,
      visible: true,
      onChange: () => MagicCodex.toggle()
    };
  });
  game.eternia.grimoire = { open: () => MagicCodex.open() };
}
