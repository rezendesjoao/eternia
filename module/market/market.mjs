/**
 * The Market and the shops' counters: one large window in the creation wizard's look (templates/market/,
 * css/market.css).
 *
 *   The Market (the "Mercado" button of the token controls) lists every item of the compendiums (catalog.mjs), with the
 *   price and what it does, the filters on the green banner (kind, Item Rank, price, sale, grade, folder, tags) and the
 *   whole page of the item chosen beside the list. Only the GM buys from it (for a character, whose gold pays), gives
 *   from it or drags an item to a sheet; players only look (the world setting `marketPlayers`: everything, only what is
 *   sold, or nothing). The GM marks items to make a shop of them (shops.mjs) or to put them in one.
 *
 *   A shop (a merchant pile) opens the same window with only its wares, when its token is double-clicked: there the
 *   players buy, as many as the stock, the gold and the inventory allow, through the GM (piles' buyItem), and sell what
 *   they carry if the shop buys. The GM sees the stock and changes it, takes wares out, opens or closes the shop, sets
 *   its prices and adds items (dropped on the window, or from the Market).
 */
import { L, SYSTEM_ID, setting } from "../settings.mjs";
import { toInt } from "../helpers/utils.mjs";
import { tagDescription } from "../helpers/tag-catalog.mjs";
import { tagLabel } from "../i18n/terms.mjs";
import { fold } from "../apps/magic-catalog.mjs";
import { STOCK_FLAG, PHYSICAL_TYPES, MAX_TICKETS, MAX_UNITS } from "../piles/pile-config.mjs";
import {
  buyPrice, freeSpace, getGold, getInteractingActor, getStock, isWithinReach, sellPrice, usedSpace
} from "../piles/pile-utils.mjs";
import { GRADES, MARKET_TYPES, facetsOf, marketCatalog, marketEntry } from "./catalog.mjs";
import {
  addToShop, buyFromShop, buyerOptions, chooseShop, createShopDialog, marketPurchase, worldShops
} from "./shops.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

const DIR = "systems/eternia/templates/market";

/** The orders of the list. */
const SORTS = ["type", "name", "priceAsc", "priceDesc", "rankAsc", "rankDesc"];

/** What each window last filtered, while the page is open (the Market, each shop). */
const VIEWS = new Map();
/** The character the GM last bought for: the next window starts with them. */
let lastBuyer = null;
const blankView = () => ({
  types: new Set(), grades: new Set(), folders: new Set(), tags: new Set(), sale: "", rankMin: null, rankMax: null,
  maxPrice: null, affordable: false, query: "", sort: "type"
});

const GRADE_COLOR = Object.fromEntries(GRADES.map(g => [g.id, g.color]));
const TYPE_ICON = Object.fromEntries(MARKET_TYPES.map(t => [t.id, t.icon]));
const number = n => Number(n ?? 0).toLocaleString(game.i18n.lang);
const inc = (map, key) => map.set(key, (map.get(key) ?? 0) + 1);

export class EterniaMarket extends HandlebarsApplicationMixin(ApplicationV2) {

  /** The id of the window: the Market, or a shop's counter. */
  static idFor(merchant = null) {
    return merchant ? `eternia-shop-${merchant.uuid.replace(/\./g, "-")}` : "eternia-market";
  }

  /**
   * Open the Market (or a shop's counter), or bring it to the front.
   * @param {object} [options]
   * @param {Actor} [options.merchant]   A shop: its counter
   * @param {Actor} [options.target]     The Market puts the items in this shop
   * @returns {EterniaMarket}
   */
  static open({ merchant = null, target = null } = {}) {
    if (!merchant && !this.canOpen()) {
      ui.notifications.warn(L("Market.NotForPlayers"));
      return null;
    }
    const existing = foundry.applications.instances.get(this.idFor(merchant));
    if (existing) {
      if (target) existing.target = target;
      existing.render({ force: true });
      existing.bringToFront?.();
      return existing;
    }
    const app = new this({ merchant, target });
    app.render({ force: true });
    return app;
  }

  /** The button of the token controls: opens the Market, or closes it when it is open. */
  static toggle() {
    const existing = foundry.applications.instances.get(this.idFor());
    if (existing?.rendered) return existing.close();
    return this.open();
  }

  /** Whether the user may open the Market (the GM always; the players by the world setting). */
  static canOpen() {
    return game.user.isGM || (setting("marketPlayers") !== "none");
  }

  constructor({ merchant = null, target = null, ...options } = {}) {
    const width = Math.min(1380, window.innerWidth - 30);
    const height = Math.min(880, window.innerHeight - 30);
    super({
      ...options,
      id: EterniaMarket.idFor(merchant),
      position: { width, height, left: Math.max(0, (window.innerWidth - width) / 2), top: Math.max(0, (window.innerHeight - height) / 2) }
    });
    this.merchant = merchant;
    this.target = target;
    if (!VIEWS.has(this.id)) VIEWS.set(this.id, blankView());
    this.#view = VIEWS.get(this.id);
  }

  static DEFAULT_OPTIONS = {
    classes: ["eternia", "eternia-market"],
    tag: "div",
    window: { icon: "fa-solid fa-store", resizable: true },
    actions: {
      select: EterniaMarket.#onSelect,
      mark: EterniaMarket.#onMark,
      markShown: EterniaMarket.#onMarkShown,
      unmark: EterniaMarket.#onUnmark,
      filter: EterniaMarket.#onFilter,
      band: EterniaMarket.#onBand,
      sale: EterniaMarket.#onSale,
      clearFilters: EterniaMarket.#onClearFilters,
      quantity: EterniaMarket.#onQuantity,
      buy: EterniaMarket.#onBuy,
      give: EterniaMarket.#onGive,
      sell: EterniaMarket.#onSell,
      putInShop: EterniaMarket.#onPutInShop,
      putMarked: EterniaMarket.#onPutMarked,
      newShop: EterniaMarket.#onNewShop,
      clearTarget: EterniaMarket.#onClearTarget,
      openSheet: EterniaMarket.#onOpenSheet,
      removeWare: EterniaMarket.#onRemoveWare,
      side: EterniaMarket.#onSide,
      toggleOpen: EterniaMarket.#onToggleOpen,
      configure: EterniaMarket.#onConfigure,
      stockMarket: EterniaMarket.#onStockMarket
    }
  };

  static PARTS = {
    head: { template: `${DIR}/head.hbs` },
    rail: { template: `${DIR}/rail.hbs`, scrollable: [".mk-rail-scroll"] },
    tools: { template: `${DIR}/tools.hbs` },
    list: { template: `${DIR}/list.hbs`, scrollable: [".mk-list"] },
    detail: { template: `${DIR}/detail.hbs`, scrollable: [".mk-page"] },
    foot: { template: `${DIR}/foot.hbs` }
  };

  /** The shop this window is the counter of (null: the Market). */
  merchant = null;
  /** The shop the Market puts the items in ("Add from the Market" of a shop). */
  target = null;

  /** The filters and the order. */
  #view;
  /** The entries of the list, in its order. */
  #entries = [];
  /** The values of the filters in the entries. */
  #facets = null;
  /** The key of the item chosen (a uuid in the Market, an item id in a shop). */
  #selected = null;
  /** The items the GM marked in the Market (uuids). */
  #marked = new Set();
  /** How many the next purchase buys. */
  #quantity = 1;
  /** The counter's side: "buy" or "sell". */
  #tab = "buy";
  /** The character the GM buys for (uuid). */
  #buyerUuid = null;
  /** The rows of the list, by key. */
  #rows = new Map();
  /** A render waiting (actors changing in a row). */
  #pending = null;

  /** @override */
  get title() {
    return this.merchant ? (this.merchant.token?.name ?? this.merchant.name) : L("Market.Title");
  }

  /** The actor whose items the rows show (the item icons find each row's item by it). */
  get actor() {
    return this.merchant ? ((this.#tab === "sell") ? this.buyer : this.merchant) : null;
  }

  /** The shop is a counter (not the Market). */
  get isShop() {
    return !!this.merchant;
  }

  /**
   * Who buys: for the GM, the character chosen at the foot (the selected token's first); for a player, the character
   * they act with (their selected token, else their own character).
   * @returns {Actor|null}
   */
  get buyer() {
    if (!game.user.isGM) return getInteractingActor();
    const options = buyerOptions();
    const uuid = this.#buyerUuid ?? lastBuyer;
    const chosen = uuid ? fromUuidSync(uuid) : null;
    return (chosen && options.includes(chosen)) ? chosen : (options[0] ?? null);
  }

  /* -------------------------------------------- */
  /*  Data                                        */
  /* -------------------------------------------- */

  /** The entries of the list: the Market's catalog, a shop's wares, or what the buyer can sell there. */
  async #load() {
    let entries;
    if (!this.isShop) {
      const catalog = await marketCatalog();
      entries = catalog.entries.map(e => ({ ...e, key: e.uuid }));
      if (!game.user.isGM && (setting("marketPlayers") === "sale")) entries = entries.filter(e => e.forSale);
    }
    else if (this.#tab === "sell") {
      const buyer = this.buyer;
      const items = (buyer?.items.contents ?? []).filter(i => PHYSICAL_TYPES.includes(i.type) && (i.system.equipped !== true));
      entries = items.map(item => ({
        ...marketEntry(item), key: item.id, itemId: item.id, basePrice: toInt(item.system.price),
        price: sellPrice(this.merchant, item), forSale: true
      }));
    }
    else {
      const items = this.merchant.items.contents.filter(i => PHYSICAL_TYPES.includes(i.type));
      entries = items.map(item => {
        const stock = getStock(item);
        return {
          ...marketEntry(item), key: item.id, itemId: item.id, stock, soldOut: stock === 0,
          basePrice: toInt(item.system.price), price: buyPrice(this.merchant, item), forSale: true
        };
      });
    }
    this.#entries = this.#sorted(entries);
    this.#facets = facetsOf(this.#entries);
    if (this.#selected && !this.#entries.some(e => e.key === this.#selected)) this.#selected = null;
  }

  /** The entries in the order chosen. */
  #sorted(entries) {
    const byName = (a, b) => a.name.localeCompare(b.name, game.i18n.lang);
    const order = type => MARKET_TYPES.findIndex(t => t.id === type);
    const compare = {
      type: (a, b) => (order(a.type) - order(b.type)) || (a.rank - b.rank) || (a.price - b.price) || byName(a, b),
      name: byName,
      priceAsc: (a, b) => (a.price - b.price) || byName(a, b),
      priceDesc: (a, b) => (b.price - a.price) || byName(a, b),
      rankAsc: (a, b) => (a.rank - b.rank) || (a.price - b.price) || byName(a, b),
      rankDesc: (a, b) => (b.rank - a.rank) || (b.price - a.price) || byName(a, b)
    }[this.#view.sort] ?? (() => 0);
    return [...entries].sort(compare);
  }

  #entry(key = this.#selected) {
    return key ? (this.#entries.find(e => e.key === key) ?? null) : null;
  }

  /** The buyer as the foot and the page show it. */
  #buyerView(buyer = this.buyer) {
    if (!buyer) return null;
    const max = toInt(buyer.system.inventory?.maxSpace);
    return {
      uuid: buyer.uuid,
      name: buyer.name,
      img: buyer.img,
      gold: getGold(buyer),
      goldLabel: number(getGold(buyer)),
      space: (buyer.type === "character") ? { used: usedSpace(buyer), max, full: usedSpace(buyer) >= max } : null
    };
  }

  /* -------------------------------------------- */
  /*  Context                                     */
  /* -------------------------------------------- */

  /** @override */
  async _prepareContext(options) {
    // The Market's catalog is read again only when the list or the filters are drawn (the page and the foot use it as it is)
    const parts = options.parts ?? Object.keys(this.constructor.PARTS);
    if (this.isShop || !this.#facets || parts.some(p => ["head", "rail", "list"].includes(p))) await this.#load();
    const shop = this.merchant;
    const merchantSystem = shop?.system.merchant ?? {};
    return {
      isGM: game.user.isGM,
      isShop: !!shop,
      isMarket: !shop,
      tab: this.#tab,
      selling: this.#tab === "sell",
      closed: !!shop && !merchantSystem.open && !game.user.isGM,
      buyer: this.#buyerView(),
      acceptsSales: !!merchantSystem.acceptsSales
    };
  }

  /** @override */
  async _preparePartContext(partId, context, options) {
    context = await super._preparePartContext(partId, context, options);
    switch (partId) {
      case "head": return Object.assign(context, await this.#headContext());
      case "rail": return Object.assign(context, this.#railContext(context));
      case "tools": return Object.assign(context, this.#toolsContext(context));
      case "list": return Object.assign(context, this.#listContext(context));
      case "detail": return Object.assign(context, await this.#detailContext(context));
      case "foot": return Object.assign(context, this.#footContext(context));
    }
    return context;
  }

  async #headContext() {
    const shop = this.merchant;
    if (!shop) {
      const count = this.#entries.length;
      return {
        eyebrow: L("Market.Eyebrow"),
        heading: L("Market.Heading"),
        lead: game.user.isGM ? L("Market.LeadGM") : L("Market.LeadPlayer"),
        facts: [
          { icon: "fa-solid fa-boxes-stacked", value: number(count), label: L("Market.Fact.Items") },
          { icon: "fa-solid fa-folder-open", value: this.#facets.folders.length, label: L("Market.Fact.Folders") },
          { icon: "fa-solid fa-layer-group", value: `${this.#facets.ranks.min}–${this.#facets.ranks.max}`, label: L("Market.Fact.Ranks") }
        ]
      };
    }
    const system = shop.system;
    const open = !!system.merchant?.open;
    const buy = Math.round(Number(system.merchant?.buyMultiplier ?? 1) * 100);
    const greeting = system.description
      ? await foundry.applications.ux.TextEditor.implementation.enrichHTML(system.description, { relativeTo: shop, secrets: shop.isOwner })
      : "";
    return {
      portrait: shop.token?.texture?.src ?? shop.img,
      eyebrow: L("Market.ShopEyebrow"),
      status: { id: open ? "open" : "closed", label: game.i18n.localize(open ? "ETERNIA.Piles.ShopOpen" : "ETERNIA.Piles.ShopClosed") },
      heading: this.title,
      leadHTML: greeting,
      lead: greeting ? "" : L("Market.ShopLead"),
      facts: [
        { icon: "fa-solid fa-boxes-stacked", value: shop.items.filter(i => PHYSICAL_TYPES.includes(i.type)).length, label: L("Market.Fact.Wares") },
        { icon: "fa-solid fa-tag", value: `${buy}%`, label: L("Market.Fact.Prices") },
        {
          icon: system.merchant?.acceptsSales ? "fa-solid fa-hand-holding-dollar" : "fa-solid fa-ban",
          value: system.merchant?.acceptsSales ? `${Math.round(Number(system.merchant?.sellMultiplier ?? 0.5) * 100)}%` : "—",
          label: L("Market.Fact.Buys")
        }
      ]
    };
  }

  #railContext(context) {
    const f = this.#facets;
    const v = this.#view;
    const typeLabel = id => L(`Market.Type.${id}`);
    return {
      types: f.types.map(id => ({ id, icon: TYPE_ICON[id], label: typeLabel(id), active: v.types.has(id) })),
      ranks: f.ranks,
      rankMin: v.rankMin ?? "",
      rankMax: v.rankMax ?? "",
      bands: f.bands.map(([min, max]) => ({ key: `${min}-${max}`, min, max, label: `${min}–${max}`, active: (v.rankMin === min) && (v.rankMax === max) })),
      maxPrice: v.maxPrice ?? "",
      affordable: v.affordable,
      buyerName: context.buyer?.name ?? "",
      showSale: !this.isShop && f.sale,
      sale: [
        { id: "", label: L("Market.Filter.SaleAll") },
        { id: "sale", label: L("Market.Filter.ForSale") },
        { id: "notSale", label: L("Market.Filter.NotForSale") }
      ].map(s => ({ ...s, active: v.sale === s.id })),
      grades: (f.grades.length > 1) ? f.grades.map(id => ({ id, label: L(`Market.Grade.${id}`), color: GRADE_COLOR[id], active: v.grades.has(id) })) : [],
      folders: (f.folders.length > 1) ? f.folders.map(name => ({ name, active: v.folders.has(name) })) : [],
      tagGroups: f.tags.map(g => ({
        label: game.i18n.localize(`ETERNIA.TagGroup.${g.group}`),
        tags: g.tags.map(t => ({ ...t, active: v.tags.has(t.key), tip: tagDescription(t.tag) }))
      }))
    };
  }

  #toolsContext(context) {
    return {
      query: this.#view.query,
      sorts: Object.fromEntries(SORTS.map(id => [id, L(`Market.Sort.${id}`)])),
      sort: this.#view.sort,
      tabs: (context.isShop && context.acceptsSales && !context.closed) ? [
        { id: "buy", icon: "fa-solid fa-cart-shopping", label: game.i18n.localize("ETERNIA.Piles.BuyTab"), active: this.#tab === "buy" },
        { id: "sell", icon: "fa-solid fa-hand-holding-dollar", label: game.i18n.localize("ETERNIA.Piles.SellTab"), active: this.#tab === "sell" }
      ] : null,
      canMark: game.user.isGM && !context.isShop
    };
  }

  #listContext(context) {
    const isGM = game.user.isGM;
    const gold = context.buyer?.gold;
    const row = e => {
      const short = (gold !== undefined) && !context.selling && (e.price > gold);
      return {
        key: e.key,
        itemId: e.itemId ?? "",
        name: e.name,
        img: e.img,
        rank: e.rank,
        typeLabel: e.typeLabel,
        // An item without numbers shows its tags beside the kind, and what it does below
        line: e.statless ? e.tags.filter(t => !/^M\d$/.test(t)).slice(0, 3).map(tagLabel).join(" · ") : e.line,
        text: (e.statless || (e.text !== e.line)) ? e.text : "",
        gradeLabel: (e.gradeId === "common") ? "" : L(`Market.Grade.${e.gradeId}`),
        gradeColor: GRADE_COLOR[e.gradeId],
        price: e.price,
        priceLabel: e.price ? number(e.price) : "—",
        short,
        notSale: !context.isShop && !e.forSale,
        blockedLabel: (!context.isShop && !e.forSale) ? (e.blocked ? tagLabel(e.blocked) : (e.grade ? L("Market.Grade.Magic") : L("Market.NoPrice"))) : "",
        qty: (e.type === "ticket") && (e.quantity > 1) ? e.quantity : null,
        stockLabel: context.isShop && !context.selling ? (e.soldOut ? game.i18n.localize("ETERNIA.Piles.SoldOut") : ((e.stock === -1) ? "" : L("Market.StockLeft", { n: e.stock }))) : "",
        soldOut: !!e.soldOut,
        selected: e.key === this.#selected,
        marked: this.#marked.has(e.key)
      };
    };
    let groups;
    if (this.#view.sort === "type") {
      groups = MARKET_TYPES.map(t => ({
        id: t.id, icon: t.icon, label: L(`Market.Type.${t.id}`),
        rows: this.#entries.filter(e => e.type === t.id).map(row)
      })).filter(g => g.rows.length);
    }
    else groups = [{ id: "all", rows: this.#entries.map(row) }];
    let empty = "";
    if (!this.#entries.length) {
      if (context.isShop) empty = context.selling ? game.i18n.localize("ETERNIA.Piles.NothingToSell") : game.i18n.localize("ETERNIA.Piles.NothingForSale");
      else empty = L("Market.Empty");
    }
    return { groups, empty, drag: isGM && !context.isShop, canMark: isGM && !context.isShop, dropHint: isGM && context.isShop };
  }

  async #detailContext(context) {
    const e = this.#entry();
    if (!e) return { guide: this.#guide(context) };
    const isGM = game.user.isGM;
    const description = e.description
      ? await foundry.applications.ux.TextEditor.implementation.enrichHTML(e.description, { secrets: isGM })
      : "";
    const page = {
      ...e,
      gradeLabel: (e.gradeId === "common") ? "" : L(`Market.Grade.${e.gradeId}`),
      gradeColor: GRADE_COLOR[e.gradeId],
      parts: e.statless ? [] : e.parts,
      priceLabel: e.price ? number(e.price) : "—",
      basePriceLabel: (e.basePrice !== undefined) && (e.basePrice !== e.price) ? number(e.basePrice) : "",
      tagChips: e.tags.map(tag => ({ label: tagLabel(tag), tip: tagDescription(tag) })),
      description,
      sourceLine: [e.source, e.folder].filter(Boolean).join(" › ")
    };
    return { page, actions: this.#actions(e, context, this.buyer) };
  }

  /**
   * What the page of an item lets the user do, and why a button is off.
   * @param {object} e          The entry
   * @param {object} context
   * @param {Actor|null} actor  Who buys
   */
  #actions(e, context, actor) {
    const isGM = game.user.isGM;
    const ticket = e.type === "ticket";
    const buyer = context.buyer;
    const space = actor ? freeSpace(actor) : 0;
    const view = {
      sheet: true,
      quantity: null,
      buy: null,
      give: null,
      sell: null,
      put: null,
      stock: null,
      remove: false,
      reason: ""
    };
    const clampQty = max => {
      const top = Math.max(1, Math.min(max, ticket ? MAX_TICKETS : MAX_UNITS));
      this.#quantity = Math.clamp(this.#quantity, 1, top);
      return (top > 1) ? { value: this.#quantity, max: top, canLess: this.#quantity > 1, canMore: this.#quantity < top } : null;
    };

    // The Market: the GM buys for the character chosen, gives, puts in a shop; players read
    if (!context.isShop) {
      if (!isGM) return view;
      const slots = ticket ? Infinity : space;
      const affordable = (e.price > 0) ? Math.floor((buyer?.gold ?? 0) / e.price) : Infinity;
      view.quantity = clampQty(slots);
      const qty = this.#quantity;
      const cost = e.price * qty;
      let reason = "";
      if (!buyer) reason = L("Market.Why.NoBuyer");
      else if (!ticket && (space < qty)) reason = game.i18n.format("ETERNIA.Piles.Error.InventoryFull", { actor: buyer.name, item: e.name });
      view.give = { label: buyer ? L("Market.GiveTo", { name: buyer.name }) : L("Market.Give"), disabled: !!reason };
      let buyReason = reason;
      if (!buyReason && !(e.price > 0)) buyReason = L("Market.Why.NoPrice");
      else if (!buyReason && (affordable < qty)) buyReason = game.i18n.format("ETERNIA.Piles.Error.NotEnoughGold", { actor: buyer.name });
      view.buy = {
        label: buyer ? L("Market.BuyFor", { name: buyer.name }) : game.i18n.localize("ETERNIA.Piles.Buy"),
        cost: number(cost), disabled: !!buyReason
      };
      view.reason = buyReason || reason;
      view.put = { label: this.target ? L("Market.PutIn", { name: this.target.name }) : L("Market.PutInShop"), disabled: !this.target && !worldShops().length };
      return view;
    }

    // A shop's counter: selling what the buyer carries (the piles' sale asks how many tickets, and confirms)
    if (this.#tab === "sell") {
      view.sheet = false;
      view.sell = { label: game.i18n.localize("ETERNIA.Piles.Sell"), gain: number(e.price), disabled: !buyer };
      if (!buyer) view.reason = game.i18n.localize("ETERNIA.Piles.Error.NoActor");
      return view;
    }

    // A shop's counter: buying
    const shop = this.merchant;
    const stockTop = (e.stock === -1) ? Infinity : e.stock;
    const slots = ticket ? Infinity : space;
    const affordable = (e.price > 0) ? Math.floor((buyer?.gold ?? 0) / e.price) : Infinity;
    view.quantity = clampQty(Math.max(1, Math.min(stockTop, slots, affordable)));
    const qty = this.#quantity;
    let reason = "";
    if (!buyer) reason = game.i18n.localize("ETERNIA.Piles.Error.NoActor");
    else if (!shop.system.merchant?.open && !isGM) reason = game.i18n.format("ETERNIA.Piles.Error.MerchantClosed", { pile: this.title });
    else if (e.soldOut) reason = game.i18n.format("ETERNIA.Piles.Error.OutOfStock", { item: e.name });
    else if (!ticket && (space < qty)) reason = game.i18n.format("ETERNIA.Piles.Error.InventoryFull", { actor: buyer.name, item: e.name });
    else if (affordable < qty) reason = game.i18n.format("ETERNIA.Piles.Error.NotEnoughGold", { actor: buyer.name });
    else if (!isGM && !isWithinReach(shop, actor)) reason = game.i18n.format("ETERNIA.Piles.Error.TooFar", { pile: this.title });
    view.buy = {
      label: (isGM && buyer) ? L("Market.BuyFor", { name: buyer.name }) : game.i18n.localize("ETERNIA.Piles.Buy"),
      cost: number(e.price * qty), disabled: !!reason
    };
    view.reason = reason;
    if (isGM) {
      view.stock = { value: (e.stock === -1) ? "" : e.stock };
      view.remove = true;
    }
    return view;
  }

  /** The page shown before an item is chosen. */
  #guide(context) {
    if (context.isShop) {
      return {
        icon: context.selling ? "fa-solid fa-hand-holding-dollar" : "fa-solid fa-cart-shopping",
        title: context.selling ? L("Market.Guide.SellTitle") : L("Market.Guide.ShopTitle"),
        lines: (context.selling ? ["SellPick", "SellPrice"] : (game.user.isGM ? ["ShopPick", "ShopGM", "ShopDrop"] : ["ShopPick", "ShopBuy"]))
          .map(k => L(`Market.Guide.${k}`))
      };
    }
    return {
      icon: "fa-solid fa-store",
      title: L("Market.Guide.Title"),
      lines: (game.user.isGM ? ["Pick", "Drag", "Buy", "Shop"] : ["Pick", "Look"]).map(k => L(`Market.Guide.${k}`))
    };
  }

  #footContext(context) {
    const isGM = game.user.isGM;
    const shop = this.merchant;
    const buyers = isGM ? buyerOptions().map(a => ({ uuid: a.uuid, name: a.name, selected: a.uuid === context.buyer?.uuid })) : [];
    const foot = { buyers, marked: this.#marked.size, target: this.target ? { name: this.target.name } : null };
    if (!shop) {
      foot.hint = isGM ? L("Market.Hint.GM") : L("Market.Hint.Player");
      foot.shops = isGM;
      return foot;
    }
    const merchant = shop.system.merchant ?? {};
    foot.hint = context.closed ? game.i18n.localize("ETERNIA.Piles.ShopClosedHint")
      : (context.selling ? L("Market.Hint.Sell") : (isGM ? L("Market.Hint.ShopGM") : L("Market.Hint.Shop")));
    if (isGM) foot.manage = { open: !!merchant.open, buyPercent: Math.round(Number(merchant.buyMultiplier ?? 1) * 100) };
    return foot;
  }

  /* -------------------------------------------- */
  /*  Rendering                                   */
  /* -------------------------------------------- */

  /** @override */
  async _onRender(context, options) {
    await super._onRender(context, options);
    const root = this.element;
    const parts = options.parts ?? Object.keys(this.constructor.PARTS);
    root.classList.toggle("is-shop", this.isShop);
    root.classList.toggle("is-gm", game.user.isGM);
    if (parts.includes("list")) this.#activateList(root);
    if (parts.includes("rail")) this.#activateRail(root);
    if (parts.includes("tools")) this.#activateTools(root);
    if (parts.includes("detail")) this.#activateDetail(root);
    if (parts.includes("foot")) this.#activateFoot(root);
    if (options.isFirstRender && this.isShop && game.user.isGM) this.#activateDrop(root);
    this.#markAffordable();
    this.#applyFilters();
    if (parts.includes("rail")) this.#syncRail();
  }

  /** The rows the buyer can't pay for show the price in red (the buyer's gold changes without drawing the list). */
  #markAffordable() {
    const gold = this.buyer ? getGold(this.buyer) : null;
    const selling = this.#tab === "sell";
    for (const e of this.#entries) {
      const price = this.#rows.get(e.key)?.querySelector(".mk-price");
      price?.classList.toggle("short", (gold !== null) && !selling && (e.price > gold));
    }
  }

  /** The rows: their elements by key, the GM's drag to a sheet (the Market), the keys to move in the list. */
  #activateList(root) {
    const list = root.querySelector(".mk-list");
    this.#rows = new Map([...root.querySelectorAll(".mk-row[data-key]")].map(row => [row.dataset.key, row]));
    if (!list) return;
    list.addEventListener("dragstart", event => {
      const row = event.target.closest?.(".mk-row[draggable='true']");
      if (!row || !game.user.isGM || this.isShop) return;
      event.dataTransfer.setData("text/plain", JSON.stringify({ type: "Item", uuid: row.dataset.key }));
      event.dataTransfer.effectAllowed = "copy";
    });
    list.addEventListener("keydown", event => {
      const row = event.target.closest?.(".mk-row");
      if (!row) return;
      if (["Enter", " "].includes(event.key) && (event.target === row)) {
        event.preventDefault();
        this.#select(row.dataset.key);
      }
      else if (["ArrowDown", "ArrowUp"].includes(event.key)) {
        event.preventDefault();
        const visible = [...this.#rows.values()].filter(r => !r.hidden);
        const next = visible[visible.indexOf(row) + ((event.key === "ArrowDown") ? 1 : -1)];
        if (next) {
          next.focus();
          this.#select(next.dataset.key);
        }
      }
    });
  }

  /** The filters typed in (Item Rank, price, what the buyer can pay). */
  #activateRail(root) {
    const rail = root.querySelector(".mk-rail");
    if (!rail) return;
    const read = value => ((String(value).trim() === "") ? null : Math.max(0, toInt(value)));
    rail.querySelectorAll("input[name='rankMin'], input[name='rankMax'], input[name='maxPrice']").forEach(input => {
      input.addEventListener("input", () => {
        this.#view[input.name] = read(input.value);
        this.#syncRail();
        this.#applyFilters();
      });
    });
    rail.querySelector("input[name='affordable']")?.addEventListener("change", event => {
      this.#view.affordable = event.currentTarget.checked;
      this.#applyFilters();
    });
  }

  /** The search, as it is typed, and the order. */
  #activateTools(root) {
    const search = root.querySelector(".mk-search input");
    search?.addEventListener("input", () => {
      this.#view.query = search.value;
      this.#applyFilters();
    });
    search?.addEventListener("keydown", event => { if (event.key === "Enter") event.preventDefault(); });
    root.querySelector(".mk-sort select")?.addEventListener("change", event => {
      this.#view.sort = SORTS.includes(event.currentTarget.value) ? event.currentTarget.value : "type";
      this.render({ parts: ["list"] });
    });
  }

  /** The page: the stock the GM types. */
  #activateDetail(root) {
    const stock = root.querySelector(".mk-actions input[name='stock']");
    stock?.addEventListener("change", async () => {
      const item = this.merchant?.items.get(this.#selected);
      if (!item) return;
      const raw = stock.value.trim();
      const value = ((raw === "") || (raw === "∞")) ? -1 : Math.max(0, toInt(raw));
      await item.setFlag(SYSTEM_ID, STOCK_FLAG, value);
    });
  }

  /** The foot: the GM's buyer and the shop's prices. */
  #activateFoot(root) {
    root.querySelector(".mk-foot select[name='buyer']")?.addEventListener("change", event => {
      this.#buyerUuid = lastBuyer = event.currentTarget.value;
      this.#quantity = 1;
      this.render({ parts: (this.#tab === "sell") ? ["rail", "list", "detail", "foot"] : ["rail", "detail", "foot"] });
    });
    root.querySelector(".mk-foot input[name='buyPercent']")?.addEventListener("change", async event => {
      const percent = Math.max(0, toInt(event.currentTarget.value));
      await this.merchant?.update({ "system.merchant.buyMultiplier": percent / 100 });
    });
  }

  /** A shop's counter takes items dropped on it (the GM): the Market's, a compendium's, the sidebar's. */
  #activateDrop(root) {
    root.addEventListener("dragover", event => {
      if (!this.merchant) return;
      event.preventDefault();
      root.classList.add("mk-drop-over");
    });
    root.addEventListener("dragleave", event => {
      if (!root.contains(event.relatedTarget)) root.classList.remove("mk-drop-over");
    });
    root.addEventListener("drop", async event => {
      root.classList.remove("mk-drop-over");
      if (!this.merchant) return;
      const data = foundry.applications.ux.TextEditor.implementation.getDragEventData(event);
      if (data?.type !== "Item" || !data.uuid) return;
      event.preventDefault();
      const item = await fromUuid(data.uuid);
      if (!item || !PHYSICAL_TYPES.includes(item.type) || (item.parent?.uuid === this.merchant.uuid)) return;
      const { added, more } = await addToShop(this.merchant, [{ uuid: item.uuid }]);
      if (added || more) ui.notifications.info(L("Market.Shop.Added", { name: this.title, n: added, more }));
    });
  }

  /* -------------------------------------------- */
  /*  Filtering                                   */
  /* -------------------------------------------- */

  /** The tests of each filter, by name. */
  #tests() {
    const v = this.#view;
    const words = fold(v.query.trim()).split(/\s+/).filter(Boolean);
    const gold = this.buyer ? getGold(this.buyer) : null;
    return {
      type: e => !v.types.size || v.types.has(e.type),
      grade: e => !v.grades.size || v.grades.has(e.gradeId),
      folder: e => !v.folders.size || v.folders.has(e.folder),
      sale: e => !v.sale || ((v.sale === "sale") === !!e.forSale),
      rank: e => ((v.rankMin === null) || (e.rank >= v.rankMin)) && ((v.rankMax === null) || (e.rank <= v.rankMax)),
      price: e => ((v.maxPrice === null) || (e.price <= v.maxPrice))
        && (!v.affordable || (gold === null) || (this.#tab === "sell") || (e.price <= gold)),
      tags: e => [...v.tags].every(k => e.tagKeys.includes(k)),
      query: e => words.every(w => e.search.includes(w))
    };
  }

  /**
   * Show the rows the filters let through, and beside each filter how many it would show (counted with the other
   * filters on; a tag counts among the rows shown, since tags add up).
   */
  #applyFilters() {
    const root = this.element;
    if (!root) return;
    const tests = Object.entries(this.#tests());
    const counts = { type: new Map(), grade: new Map(), folder: new Map(), sale: new Map(), tags: new Map(), band: new Map() };
    const groups = new Map();
    const bands = this.#facets?.bands ?? [];
    let shown = 0;
    for (const e of this.#entries) {
      let fails = 0;
      let failed = null;
      for (const [name, test] of tests) {
        if (test(e)) continue;
        fails += 1;
        failed = name;
        if (fails > 1) break;
      }
      const visible = fails === 0;
      const row = this.#rows.get(e.key);
      if (row) row.hidden = !visible;
      if (visible) {
        shown += 1;
        inc(groups, e.type);
        for (const k of e.tagKeys) inc(counts.tags, k);
      }
      const counted = name => visible || ((fails === 1) && (failed === name));
      if (counted("type")) inc(counts.type, e.type);
      if (counted("grade")) inc(counts.grade, e.gradeId);
      if (counted("folder") && e.folder) inc(counts.folder, e.folder);
      if (counted("sale")) inc(counts.sale, e.forSale ? "sale" : "notSale");
      if (counted("rank")) for (const [min, max] of bands) if ((e.rank >= min) && (e.rank <= max)) inc(counts.band, `${min}-${max}`);
    }
    counts.sale.set("", [...counts.sale.values()].reduce((a, b) => a + b, 0));
    for (const badge of root.querySelectorAll("[data-count]")) {
      const [facet, ...rest] = badge.dataset.count.split(":");
      const n = counts[facet]?.get(rest.join(":")) ?? 0;
      badge.textContent = n;
      badge.closest("button")?.classList.toggle("none", !n && !badge.closest("button")?.classList.contains("active"));
    }
    for (const group of root.querySelectorAll(".mk-group[data-group]")) {
      const id = group.dataset.group;
      const n = (id === "all") ? shown : (groups.get(id) ?? 0);
      group.hidden = !n;
      const count = group.querySelector("[data-group-count]");
      if (count) count.textContent = n;
    }
    const empty = root.querySelector(".mk-empty");
    if (empty) empty.hidden = (shown > 0) || !this.#entries.length;
    const total = root.querySelector(".mk-count");
    if (total) total.innerHTML = L("Market.Shown", { n: `<b>${number(shown)}</b>`, total: number(this.#entries.length) });
    const markShown = root.querySelector("[data-action='markShown']");
    if (markShown) markShown.disabled = !shown;
    VIEWS.set(this.id, this.#view);
  }

  /** The filter chips and fields as the view says (after a click, without drawing the banner again). */
  #syncRail() {
    const root = this.element;
    const v = this.#view;
    for (const button of root.querySelectorAll(".mk-rail [data-action='filter']")) {
      const { facet, value } = button.dataset;
      const set = { type: v.types, grade: v.grades, folder: v.folders, tags: v.tags }[facet];
      button.classList.toggle("active", !!set?.has(value));
      button.setAttribute("aria-pressed", set?.has(value) ? "true" : "false");
    }
    for (const button of root.querySelectorAll(".mk-rail [data-action='band']")) {
      button.classList.toggle("active", (v.rankMin === toInt(button.dataset.min)) && (v.rankMax === toInt(button.dataset.max)));
    }
    for (const button of root.querySelectorAll(".mk-rail [data-action='sale']")) {
      button.classList.toggle("active", (button.dataset.value ?? "") === v.sale);
    }
    const field = name => root.querySelector(`.mk-rail input[name='${name}']`);
    for (const name of ["rankMin", "rankMax", "maxPrice"]) {
      const input = field(name);
      if (input && (document.activeElement !== input)) input.value = v[name] ?? "";
    }
    const affordable = field("affordable");
    if (affordable) affordable.checked = v.affordable;
    const clear = root.querySelector(".mk-rail [data-action='clearFilters']");
    if (clear) clear.disabled = !this.#filtering();
  }

  /** Whether any filter is on (the search too). */
  #filtering() {
    const v = this.#view;
    return !!(v.types.size || v.grades.size || v.folders.size || v.tags.size || v.sale || (v.rankMin !== null)
      || (v.rankMax !== null) || (v.maxPrice !== null) || v.affordable || v.query.trim());
  }

  /* -------------------------------------------- */
  /*  Updates                                     */
  /* -------------------------------------------- */

  /**
   * Draw again what an actor's change touches: the shop's wares (everything) or the buyer's gold and items (the page,
   * the foot and what they can pay; the list when selling). A burst of changes draws once.
   * @param {"shop"|"buyer"} kind
   */
  refresh(kind) {
    if (!this.rendered) return;
    const parts = (kind === "shop") ? ["head", "rail", "tools", "list", "detail", "foot"]
      : ((this.#tab === "sell") ? ["rail", "list", "detail", "foot"] : ["detail", "foot"]);
    if (this.#pending) this.#pending.parts = [...new Set([...this.#pending.parts, ...parts])];
    else {
      this.#pending = { parts };
      setTimeout(() => {
        const { parts: todo } = this.#pending;
        this.#pending = null;
        if (this.rendered) this.render({ parts: todo });
      }, 60);
    }
  }

  /** Whether an actor is the one this window sells for, or the one buying. */
  touches(actor) {
    if (!actor) return null;
    if (this.merchant && (actor.uuid === this.merchant.uuid)) return "shop";
    if (actor.uuid === this.buyer?.uuid) return "buyer";
    return null;
  }

  /* -------------------------------------------- */
  /*  Actions                                     */
  /* -------------------------------------------- */

  #select(key) {
    if (key === this.#selected) return;
    this.#selected = key;
    this.#quantity = 1;
    for (const [k, row] of this.#rows) row.classList.toggle("selected", k === key);
    this.render({ parts: ["detail"] });
  }

  static #onSelect(event, target) {
    this.#select(target.dataset.key);
  }

  static #onMark(event, target) {
    event.stopPropagation();
    const row = target.closest(".mk-row");
    const key = row?.dataset.key;
    if (!key) return;
    if (this.#marked.has(key)) this.#marked.delete(key);
    else this.#marked.add(key);
    row.classList.toggle("marked", this.#marked.has(key));
    target.setAttribute("aria-pressed", this.#marked.has(key) ? "true" : "false");
    this.render({ parts: ["foot"] });
  }

  static #onMarkShown() {
    for (const [key, row] of this.#rows) {
      if (row.hidden) continue;
      this.#marked.add(key);
      row.classList.add("marked");
    }
    this.render({ parts: ["foot"] });
  }

  static #onUnmark() {
    this.#marked.clear();
    for (const row of this.#rows.values()) row.classList.remove("marked");
    this.render({ parts: ["foot"] });
  }

  static #onFilter(event, target) {
    const { facet, value } = target.dataset;
    const set = { type: this.#view.types, grade: this.#view.grades, folder: this.#view.folders, tags: this.#view.tags }[facet];
    if (!set) return;
    if (set.has(value)) set.delete(value);
    else set.add(value);
    this.#syncRail();
    this.#applyFilters();
  }

  static #onBand(event, target) {
    const min = toInt(target.dataset.min);
    const max = toInt(target.dataset.max);
    const on = (this.#view.rankMin === min) && (this.#view.rankMax === max);
    this.#view.rankMin = on ? null : min;
    this.#view.rankMax = on ? null : max;
    this.#syncRail();
    this.#applyFilters();
  }

  static #onSale(event, target) {
    this.#view.sale = target.dataset.value ?? "";
    this.#syncRail();
    this.#applyFilters();
  }

  static #onClearFilters() {
    const sort = this.#view.sort;
    Object.assign(this.#view, blankView(), { sort });
    const search = this.element.querySelector(".mk-search input");
    if (search) search.value = "";
    this.#syncRail();
    this.#applyFilters();
  }

  static #onQuantity(event, target) {
    this.#quantity = Math.max(1, this.#quantity + toInt(target.dataset.step));
    this.render({ parts: ["detail"] });
  }

  static async #onBuy() {
    const e = this.#entry();
    const buyer = this.buyer;
    if (!e || !buyer) return;
    const done = this.isShop
      ? await buyFromShop(this.merchant, this.merchant.items.get(e.itemId), buyer, this.#quantity)
      : await marketPurchase(buyer, e, { quantity: this.#quantity });
    if (done) this.#quantity = 1;
  }

  static async #onGive() {
    const e = this.#entry();
    const buyer = this.buyer;
    if (!e || !buyer || this.isShop) return;
    if (await marketPurchase(buyer, e, { quantity: this.#quantity, free: true })) this.#quantity = 1;
  }

  static async #onSell() {
    const e = this.#entry();
    const item = this.buyer?.items.get(e?.itemId);
    if (item) await game.eternia.piles.sellItem(this.merchant, item);
  }

  static async #onPutInShop() {
    const e = this.#entry();
    if (!e) return;
    if (this.target) {
      const { added, more } = await addToShop(this.target, [e]);
      ui.notifications.info(L("Market.Shop.Added", { name: this.target.name, n: added, more }));
    }
    else await chooseShop([e]);
  }

  static async #onPutMarked() {
    const entries = [...this.#marked].map(key => this.#entry(key)).filter(Boolean);
    if (!entries.length) return ui.notifications.warn(L("Market.Why.NoMarks"));
    const shop = this.target ?? await chooseShop(entries);
    if (!shop) return;
    if (this.target) {
      const { added, more } = await addToShop(shop, entries);
      ui.notifications.info(L("Market.Shop.Added", { name: shop.name, n: added, more }));
    }
    EterniaMarket.#onUnmark.call(this);
  }

  static async #onNewShop() {
    const entries = [...this.#marked].map(key => this.#entry(key)).filter(Boolean);
    const shop = await createShopDialog(entries);
    if (!shop) return;
    EterniaMarket.#onUnmark.call(this);
    EterniaMarket.open({ merchant: shop });
  }

  static #onClearTarget() {
    this.target = null;
    this.render({ parts: ["detail", "foot"] });
  }

  static async #onOpenSheet() {
    const e = this.#entry();
    if (!e) return;
    const doc = this.isShop ? this.actor?.items.get(e.itemId) : await fromUuid(e.uuid);
    doc?.sheet?.render(true);
  }

  static async #onRemoveWare() {
    const item = this.merchant?.items.get(this.#entry()?.itemId);
    if (!item || !game.user.isGM) return;
    this.#selected = null;
    await item.delete();
  }

  static #onSide(event, target) {
    const tab = (target.dataset.side === "sell") ? "sell" : "buy";
    if (tab === this.#tab) return;
    this.#tab = tab;
    this.#selected = null;
    this.#quantity = 1;
    this.render({ parts: ["rail", "tools", "list", "detail", "foot"] });
  }

  static async #onToggleOpen() {
    if (!game.user.isGM || !this.merchant) return;
    await this.merchant.update({ "system.merchant.open": !this.merchant.system.merchant?.open });
  }

  static #onConfigure() {
    if (game.user.isGM) this.merchant?.sheet.render(true);
  }

  /** "Add from the Market": the Market opens to put its items in this shop. */
  static #onStockMarket() {
    if (game.user.isGM && this.merchant) EterniaMarket.open({ target: this.merchant });
  }
}

/** The windows open now. */
export const openMarkets = () => [...foundry.applications.instances.values()].filter(app => app instanceof EterniaMarket);
