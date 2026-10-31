/**
 * The fields of the Item compendium indexes the system reads: the class tab, the skill browser, the option browser,
 * the Magia catalog, the creation wizard, the professions and the item icons. Foundry keeps one index per compendium,
 * for the last set of fields asked, so windows asking for fields of their own fetched the whole index from the server
 * again each time they opened. With all of them in CONFIG.Item.compendiumIndexFields, the first index of a compendium
 * (the item icons ask for the compendiums with gear when the game is ready, helpers/prewarm.mjs for the others once it
 * is idle) serves every window after it.
 *
 * The descriptions stay out (they would weigh the index of every compendium): what reads them loads its documents.
 */
import { SYSTEM_ID } from "../settings.mjs";

export const ITEM_INDEX_FIELDS = [
  // Skills: what the browsers, the class tab and the Magia catalog read
  "system.subtype", "system.skillRank", "system.tags", "system.timing", "system.target", "system.range",
  "system.cost", "system.limit", "system.damage",
  "flags.eternia.identifier", "flags.eternia.kind", "flags.eternia.branch", "flags.eternia.minRank",
  "flags.eternia.choiceOnly", "flags.eternia.requires", "flags.eternia.path", "flags.eternia.pathTalent",
  "flags.eternia.apex", "flags.eternia.dedication", "flags.eternia.element", "flags.eternia.elementTalent",
  "flags.eternia.magic", "flags.eternia.magicSpell", "flags.eternia.retired", "flags.eternia.motor",
  "flags.eternia.hitStatuses", "flags.eternia.useActions", "flags.eternia.choiceGrants",
  // The skills a profession gives (professions/skills.mjs)
  "flags.eternia.profession",
  // The statuses a spell gives with its effects (the roles of the Magias)
  "effects.statuses", "effects.transfer", "effects.flags.eternia.statusData",
  // Races, classes and professions
  "system.identifier", "system.attributes", "system.hp", "system.hpPerRank", "system.fate", "system.grants",
  // Items: the icons, the professions' catalog and materials, the tickets, the creation wizard's shop
  "system.rank", "system.price", "flags.eternia.icon", "flags.eternia.material"
];

/**
 * The fields of a compendium index that the Market reads of an item (market/catalog.mjs: gearEntry and marketEntry), the
 * descriptions and the effects among them: asked only of the compendiums it lists (marketPack) with something to carry,
 * the other indexes stay without the descriptions. The GM's item icons ask for them with their own fields when the game
 * is ready (icons/index.mjs), so the Market's catalog reads that index instead of fetching it again. An effect's changes
 * are asked in both places: Foundry 14's `system.changes` and the `changes` of an older save.
 */
export const MARKET_INDEX_FIELDS = [
  "system.description", "system.tags", "system.price", "system.rank", "system.quantity", "system.attack", "system.magic",
  "system.accuracy", "system.pdef", "system.mdef", "system.initiative", "system.bagSpace", "system.range", "system.speed",
  "effects.disabled", "effects.transfer", "effects.system.changes", "effects.changes"
];

/** Whether the Market lists the items of a compendium: the system's and the world's Item compendiums the user sees. */
export const marketPack = pack => (pack.documentName === "Item") && pack.visible
  && (((pack.metadata.packageType === "system") && (pack.metadata.packageName === SYSTEM_ID))
    || (pack.metadata.packageType === "world"));

/** Call during the `init` hook. */
export function registerPackIndex() {
  CONFIG.Item.compendiumIndexFields = [...new Set([...(CONFIG.Item.compendiumIndexFields ?? []), ...ITEM_INDEX_FIELDS])];
}

/** The index requests in flight, by compendium: the fields they index (with Foundry's and CONFIG's) and the request. */
const requests = new Map();

/**
 * A compendium's index with these fields, as `pack.getIndex({ fields })` gives it, asked of the server once while a
 * request is in flight. Foundry marks the fields as indexed only when its request comes back, so two windows asking at
 * the same time fetched the whole index twice: here a request in flight that indexes every field asked serves the next
 * ones, and one that doesn't is waited for before asking (getIndex then fetches only when a field is still missing).
 * @param {CompendiumCollection} pack
 * @param {string[]} [fields]   Fields beyond the compendium's own and CONFIG's
 * @returns {Promise<foundry.utils.Collection>}  The compendium's index
 */
export function packIndex(pack, fields = []) {
  const wanted = new Set([...pack.indexFields, ...fields]);
  const current = requests.get(pack.collection);
  if (current && wanted.isSubsetOf(current.fields)) return current.promise;
  const promise = current ? current.promise.catch(() => null).then(() => pack.getIndex({ fields })) : pack.getIndex({ fields });
  const request = { fields: wanted, promise };
  requests.set(pack.collection, request);
  const done = () => {
    if (requests.get(pack.collection) === request) requests.delete(pack.collection);
  };
  promise.then(done, done);
  return promise;
}

/**
 * Until the game is idle: what reads the compendiums ahead of time (helpers/prewarm.mjs) waits for it, a step at a time.
 * @param {number} timeout   At most so long (ms)
 * @param {number} wait      So long, where the browser can't tell when it is idle (ms)
 */
export const idle = (timeout, wait) => new Promise(resolve => {
  if (window.requestIdleCallback) window.requestIdleCallback(() => resolve(), { timeout });
  else setTimeout(resolve, wait);
});

/**
 * Load documents by uuid, a few requests at most (one per compendium; the world's one by one).
 * @param {string[]} uuids
 * @returns {Promise<Map<string, foundry.abstract.Document>>}
 */
export async function loadDocuments(uuids) {
  const byPack = new Map();
  const world = [];
  for (const uuid of new Set(uuids)) {
    const parsed = foundry.utils.parseUuid(uuid);
    if (String(uuid).startsWith("Compendium.") && parsed?.collection && !parsed.embedded?.length) {
      const id = parsed.collection.collection;
      if (!byPack.has(id)) byPack.set(id, []);
      byPack.get(id).push(parsed.id);
    }
    else world.push(uuid);
  }
  const docs = new Map();
  for (const [id, ids] of byPack) {
    for (const doc of await game.packs.get(id).getDocuments({ _id__in: ids })) docs.set(doc.uuid, doc);
  }
  for (const uuid of world) {
    const doc = await fromUuid(uuid).catch(() => null);
    if (doc) docs.set(uuid, doc);
  }
  return docs;
}
