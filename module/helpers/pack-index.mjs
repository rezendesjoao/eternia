/**
 * The fields of the Item compendium indexes the system reads: the class tab, the skill browser, the option browser,
 * the Magia catalog, the creation wizard, the professions and the item icons. Foundry keeps one index per compendium,
 * for the last set of fields asked, so windows asking for fields of their own fetched the whole index from the server
 * again each time they opened. With all of them in CONFIG.Item.compendiumIndexFields, the first index of a compendium
 * (the item icons ask for every Item compendium when the game is ready) serves every window after it.
 *
 * The descriptions stay out (they would weigh the index of every compendium): what reads them loads its documents.
 */
export const ITEM_INDEX_FIELDS = [
  // Skills: what the browsers, the class tab and the Magia catalog read
  "system.subtype", "system.skillRank", "system.tags", "system.timing", "system.target", "system.range",
  "system.cost", "system.limit", "system.damage",
  "flags.eternia.identifier", "flags.eternia.kind", "flags.eternia.branch", "flags.eternia.minRank",
  "flags.eternia.choiceOnly", "flags.eternia.requires", "flags.eternia.path", "flags.eternia.pathTalent",
  "flags.eternia.apex", "flags.eternia.dedication", "flags.eternia.element", "flags.eternia.elementTalent",
  "flags.eternia.magic", "flags.eternia.magicSpell", "flags.eternia.retired", "flags.eternia.motor",
  "flags.eternia.hitStatuses", "flags.eternia.useActions", "flags.eternia.choiceGrants",
  // The statuses a spell gives with its effects (the roles of the Magias)
  "effects.statuses", "effects.transfer", "effects.flags.eternia.statusData",
  // Races, classes and professions
  "system.identifier", "system.attributes", "system.hp", "system.hpPerRank", "system.fate", "system.grants",
  // Items: the icons, the professions' catalog and materials, the tickets, the creation wizard's shop
  "system.rank", "system.price", "flags.eternia.icon", "flags.eternia.material"
];

/** Call during the `init` hook. */
export function registerPackIndex() {
  CONFIG.Item.compendiumIndexFields = [...new Set([...(CONFIG.Item.compendiumIndexFields ?? []), ...ITEM_INDEX_FIELDS])];
}

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
