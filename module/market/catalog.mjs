/**
 * What the Market shows (module/market/market.mjs): every item that can be carried (weapons, armors, shields,
 * accessories, bags, usables, gear and tickets) from the system's and the world's Item compendiums and from the
 * world's own items, read once and kept until an item changes. The first item of a name wins, the system's first, as
 * in the creation wizard's shop; a world item copied from a compendium item that is listed stays out.
 *
 * Each entry is what the creation wizard's shop reads of a piece of gear (apps/starting-gear.mjs, gearEntry), with
 * what the Market filters by: the magic grade ([M1]–[M7]), whether shops sell it (no [Not For Sale], [Untradeable] nor
 * grade), the folder and a search text with the description. A shop's wares and what a character can sell are entries
 * of the same kind (marketEntry), made from the items themselves.
 *
 * The compendium items are read from their compendium's index, asked for the fields the entries read (INDEX_FIELDS,
 * the description and the effects among them, only of the compendiums with something to carry), not as documents: a
 * thousand Items made at once would hold a weak PC for seconds. The entries are made a slice at a time, the game drawing
 * its frames between the slices.
 */
import { SYSTEM_ID } from "../settings.mjs";
import { toInt } from "../helpers/utils.mjs";
import { loadDocuments } from "../helpers/pack-index.mjs";
import { TAG_CATALOG, tagKey } from "../helpers/tag-catalog.mjs";
import { tagLabel } from "../i18n/terms.mjs";
import { fold } from "../apps/magic-catalog.mjs";
import { gearEntry } from "../apps/starting-gear.mjs";
import { gradeOf } from "../icons/index.mjs";
import { GRADES as ICON_GRADES } from "../icons/data.mjs";
import { PHYSICAL_TYPES } from "../piles/pile-config.mjs";

/** The kinds of item the Market sells, in the order of its filters, with their icons. */
export const MARKET_TYPES = [
  { id: "weapon", icon: "fa-solid fa-sword" },
  { id: "armor", icon: "fa-solid fa-shirt" },
  { id: "shield", icon: "fa-solid fa-shield" },
  { id: "accessory", icon: "fa-solid fa-ring" },
  { id: "bag", icon: "fa-solid fa-sack" },
  { id: "usable", icon: "fa-solid fa-flask" },
  { id: "gear", icon: "fa-solid fa-toolbox" },
  { id: "ticket", icon: "fa-solid fa-ticket" }
].filter(t => PHYSICAL_TYPES.includes(t.id));
const TYPES = MARKET_TYPES.map(t => t.id);

/** The tags that keep an item out of the shops (AS REGRAS: a prize, or crafted). */
const BLOCKED = new Set(["Not For Sale", "Untradeable"].map(tagKey));
const RARE = tagKey("Rare");
/** The tags the grade and sale filters already cover: they stay out of the tag filter. */
const OWN_FILTERS = new Set([...BLOCKED, RARE, ...[1, 2, 3, 4, 5, 6, 7].map(n => `m${n}`)]);

/**
 * The grades, from the commonest, with the colors of the item icons' frames (module/icons/data.mjs): M1–M3 the
 * profession qualities, M4–M7 their gems (the darker one of the spectral M7, to read on the parchment).
 */
export const GRADES = [
  { id: "common", color: "#8a7a62" },
  { id: "rare", color: "#23807c" },
  ...[1, 2, 3, 4, 5, 6, 7].map(n => ({ id: `m${n}`, color: ICON_GRADES[n].color ?? ICON_GRADES[n].gem[n === 7 ? 2 : 1] }))
];

/** The groups of the tag filter, in order (the tag catalog's groups). */
const TAG_GROUPS = ["Equipment", "Item", "Element", "Attack", "Skill", "Creature", "Other"];
const GROUP_OF = new Map(TAG_CATALOG.map(t => [tagKey(t.label), t.group.split(".").pop()]));

/** Bands of the Item Rank, for the quick filters. */
export const RANK_BANDS = [[1, 5], [6, 10], [11, 15], [16, 20], [21, 25], [26, 30]];

/**
 * The fields of a compendium index that gearEntry and marketEntry read of an item (asked only of the compendiums with
 * something to carry: the other indexes stay without the descriptions, helpers/pack-index.mjs). An effect's changes are
 * asked in both places: Foundry 14's `system.changes` and the `changes` of an older save.
 */
const INDEX_FIELDS = [
  "system.description", "system.tags", "system.price", "system.rank", "system.quantity", "system.attack", "system.magic",
  "system.accuracy", "system.pdef", "system.mdef", "system.initiative", "system.bagSpace", "system.range",
  "effects.disabled", "effects.transfer", "effects.system.changes", "effects.changes"
];
/** The types of an effect's changes saved before Foundry 14, by their numeric mode. */
const CHANGE_TYPES = ["custom", "multiply", "add", "downgrade", "upgrade", "override"];
/** How long the entries are made on a row before the game draws a frame (ms). */
const SLICE_MS = 10;

/** A moment for the game to draw its frames and read the input, in the middle of a long work. */
const pause = () => (globalThis.scheduler?.yield ? globalThis.scheduler.yield() : new Promise(resolve => setTimeout(resolve)));

/**
 * An item as the Market shows it.
 * @param {Item|object} item        An item, or a compendium index entry standing for one (indexedItem)
 * @param {object} [extra]
 * @param {string} [extra.folder]   The name of its folder
 * @param {string} [extra.source]   Where it comes from (the compendium's label)
 * @returns {object}
 */
export function marketEntry(item, { folder = "", source = "" } = {}) {
  const entry = gearEntry(item);
  const keys = entry.tags.map(tagKey);
  entry.tagKeys = keys;
  entry.grade = gradeOf(entry.tags);
  entry.gradeId = entry.grade ? `m${entry.grade}` : (entry.rare ? "rare" : "common");
  entry.blocked = entry.tags.find(t => BLOCKED.has(tagKey(t))) ?? "";
  entry.forSale = !entry.blocked && !entry.grade && (entry.price > 0);
  entry.typeLabel = game.i18n.localize(`TYPES.Item.${item.type}`);
  entry.quantity = (item.type === "ticket") ? Math.max(1, toInt(item.system.quantity)) : 1;
  entry.folder = folder;
  entry.source = source;
  entry.description = item.system?.description ?? "";
  // Without numbers to show, the line is the description's first sentence: the summary already says it
  entry.statless = !!entry.text && (entry.parts.length === 1) && entry.text.startsWith(entry.line.replace(/…$/, ""));
  entry.search = fold([entry.name, entry.line, entry.text, entry.typeLabel, folder, ...entry.tags.map(tagLabel)].join(" "));
  return entry;
}

/* -------------------------------------------- */
/*  The catalog                                 */
/* -------------------------------------------- */

let catalogPromise = null;

/**
 * Every item the Market shows: { entries (by type, Item Rank and name), byUuid }.
 * @returns {Promise<{entries: object[], byUuid: Map<string, object>}>}
 */
export function marketCatalog() {
  catalogPromise ??= buildCatalog().catch(err => {
    catalogPromise = null;
    throw err;
  });
  return catalogPromise;
}

/** Forget the catalog (an item changed): the next window reads it again. */
export function clearMarketCatalog() {
  catalogPromise = null;
}

/** Whether the catalog is already read (the window opens at once). */
export const catalogReady = () => !!catalogPromise;

/**
 * A compendium index entry (read with INDEX_FIELDS) as the item it stands for: what gearEntry and marketEntry read of an
 * item, its system data and its effects, with the changes as Foundry 14 reads them (an older save's numeric `mode` made
 * a `type`).
 * @param {object} e   The index entry
 * @returns {object|null}  Null when Foundry indexed the entry again from its document (loaded or changed since), which
 *   leaves the effects out: the document is read instead
 */
function indexedItem(e) {
  if (!Array.isArray(e.effects)) return null;
  const changes = effect => (effect.system?.changes ?? effect.changes ?? []).map(change => (((change.type === undefined)
    && (typeof change.mode === "number")) ? { ...change, type: CHANGE_TYPES[change.mode] ?? `custom.${change.mode}` } : change));
  return {
    uuid: e.uuid,
    name: e.name,
    img: e.img || Item.implementation.getDefaultArtwork(e).img,
    type: e.type,
    system: e.system ?? {},
    effects: e.effects.map(effect => ({ disabled: !!effect.disabled, transfer: effect.transfer, system: { changes: changes(effect) } }))
  };
}

async function buildCatalog() {
  const ours = p => (p.metadata.packageType === "system") && (p.metadata.packageName === SYSTEM_ID);
  const packs = game.packs.filter(p => (p.documentName === "Item") && p.visible && (ours(p) || (p.metadata.packageType === "world")))
    .sort((a, b) => (ours(a) ? 0 : 1) - (ours(b) ? 0 : 1));
  const seen = new Set();
  const uuids = [];
  const info = new Map();
  /** Each item by uuid: its document when it is loaded already, else what its index entry tells. */
  const items = new Map();
  for (const pack of packs) {
    // Only a compendium with something to carry is asked for the fields the Market reads
    if (!pack.index.some(e => TYPES.includes(e.type))) continue;
    const index = await pack.getIndex({ fields: INDEX_FIELDS });
    for (const e of index) {
      if (!TYPES.includes(e.type)) continue;
      const key = `${e.type}|${fold(e.name)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const uuid = e.uuid ?? pack.getUuid(e._id);
      uuids.push(uuid);
      info.set(uuid, { source: pack.metadata.label, folder: pack.folders.get(e.folder)?.name ?? "" });
      const item = pack.has(e._id) ? pack.get(e._id) : indexedItem(e);
      if (item) items.set(uuid, item);
    }
  }
  // The entries indexed again without their effects: their documents
  const missing = uuids.filter(uuid => !items.has(uuid));
  if (missing.length) for (const [uuid, doc] of await loadDocuments(missing)) items.set(uuid, doc);

  // A slice at a time: the game draws its frames between them
  let slice = performance.now();
  const breathe = async () => {
    if ((performance.now() - slice) < SLICE_MS) return;
    await pause();
    slice = performance.now();
  };
  const entries = [];
  for (const uuid of uuids) {
    const item = items.get(uuid);
    if (item) entries.push(marketEntry(item, info.get(uuid)));
    await breathe();
  }

  // The world's own items (not the copies of a compendium item already listed)
  const listed = new Set(uuids);
  const worldLabel = game.i18n.localize("ETERNIA.Market.WorldItems");
  for (const item of game.items) {
    if (!TYPES.includes(item.type) || !item.visible) continue;
    const from = item._stats?.compendiumSource ?? item.flags?.core?.sourceId;
    if ((from && listed.has(from)) || seen.has(`${item.type}|${fold(item.name)}`)) continue;
    entries.push(marketEntry(item, { source: worldLabel, folder: item.folder?.name ?? "" }));
    await breathe();
  }

  const order = type => TYPES.indexOf(type);
  entries.sort((a, b) => (order(a.type) - order(b.type)) || (a.rank - b.rank) || (a.price - b.price)
    || a.name.localeCompare(b.name, game.i18n.lang));
  return { entries, byUuid: new Map(entries.map(e => [e.uuid, e])) };
}

/**
 * The values each filter can take in a list of entries (only those some entry has).
 * @param {object[]} entries
 * @returns {{types: string[], grades: string[], folders: string[], tags: {group: string, tags: object[]}[],
 *   ranks: {min: number, max: number}, bands: number[][], sale: boolean, maxPrice: number}}
 */
export function facetsOf(entries) {
  const types = new Set();
  const grades = new Set();
  const folders = new Map();
  const tags = new Map();
  let min = Infinity, max = 0, maxPrice = 0, forSale = 0;
  for (const e of entries) {
    types.add(e.type);
    grades.add(e.gradeId);
    if (e.folder) folders.set(e.folder, (folders.get(e.folder) ?? 0) + 1);
    e.tags.forEach((tag, i) => {
      const key = e.tagKeys[i];
      if (!OWN_FILTERS.has(key) && !tags.has(key)) tags.set(key, tag);
    });
    min = Math.min(min, e.rank);
    max = Math.max(max, e.rank);
    maxPrice = Math.max(maxPrice, e.price);
    if (e.forSale) forSale += 1;
  }
  const byGroup = new Map(TAG_GROUPS.map(g => [g, []]));
  for (const [key, tag] of tags) {
    const group = byGroup.has(GROUP_OF.get(key)) ? GROUP_OF.get(key) : "Other";
    byGroup.get(group).push({ key, tag, label: tagLabel(tag) });
  }
  if (!Number.isFinite(min)) min = 1;
  return {
    types: TYPES.filter(t => types.has(t)),
    grades: GRADES.map(g => g.id).filter(id => grades.has(id)),
    folders: [...folders.keys()].sort((a, b) => a.localeCompare(b, game.i18n.lang)),
    tags: [...byGroup].filter(([, list]) => list.length)
      .map(([group, list]) => ({ group, tags: list.sort((a, b) => a.label.localeCompare(b.label, game.i18n.lang)) })),
    ranks: { min, max },
    bands: RANK_BANDS.filter(([a, b]) => (b >= min) && (a <= max)),
    sale: (forSale > 0) && (forSale < entries.length),
    maxPrice
  };
}

/** Call during the `init` hook: the catalog is read again once an item of a compendium or of the world changes. */
export function registerMarketCatalog() {
  const watch = item => {
    if (item.parent || !TYPES.includes(item.type)) return;
    clearMarketCatalog();
  };
  Hooks.on("createItem", watch);
  Hooks.on("updateItem", watch);
  Hooks.on("deleteItem", watch);
  for (const hook of ["createCompendium", "deleteCompendium", "updateCompendium"]) Hooks.on(hook, clearMarketCatalog);
}
