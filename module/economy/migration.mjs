/**
 * World migration of the economy (helpers/migrations.mjs; docs/matematica.md, section 9). In 0.48 the currency became
 * the Yuld and every price and drop came from the economy's model (economy/data.mjs).
 *
 * Version 1:
 * - The purses: the Yuld (the old gold) of every character, pile and unlinked token, times PRICE_RATE (the prices went up
 *   as much, so what a character had still buys the same); the gold the creation wizard spent (`startingGear.spent`, given
 *   back when a character is made again) and the gold a monster stole (`stolenGold`), the same.
 * - The items of the world and of the actors take the price of their compendium item (found by `_stats.compendiumSource`,
 *   else by name and type); a crafted one, its base's new price plus the Anima-mundi of its level × its grade; one with no
 *   compendium item, its price × PRICE_RATE, unless it is a treasure ([Valioso], [Material-Base]: the drops kept their
 *   value). The drop rows inside monsters are the bestiary's (below) or the GM's (they stay).
 * - The bestiary's monsters brought to the world (copies, by `_stats.compendiumSource`): their drop rows take the
 *   compendium's (name, price, copies, faces, Yuld formula, the Seal), and the texts of the monster and of its skills
 *   that spoke of gold take the Yuld (CURRENCY_TEXT); the Proposal takes the compendium's formula. On the monster and on
 *   the tokens that carry their own copies.
 * - The shops that still paid the old default for what they buy (50%) pay the new one (10%; treasures and magic items
 *   have their own share).
 * Every actor, item and token delta it converts gets `flags.eternia.yuld` in the same update, and is skipped when it
 * has it: a run stopped halfway goes on where it stopped, without doubling a purse twice.
 */
import { SYSTEM_ID } from "../settings.mjs";
import { CURRENCY_TEXT, MAX_ANIMA, PRICE_RATE, RESALE, UNSEALED, animaPrice } from "./data.mjs";

const PHYSICAL = ["weapon", "armor", "shield", "accessory", "bag", "mount", "usable", "gear", "ticket"];
const ITEMS = `${SYSTEM_ID}.items`;
const BESTIARY = `${SYSTEM_ID}.bestiary`;
const toInt = value => Math.trunc(Number(value) || 0);
const times = value => Math.max(0, Math.round(toInt(value) * PRICE_RATE));

/** A text with the currency's new name (CURRENCY_TEXT, the phrases of the compendium's texts). */
export function yuldText(text) {
  if (typeof text !== "string") return text;
  return CURRENCY_TEXT.reduce((s, [from, to]) => s.split(from).join(to), text);
}

/** The compendium items, by uuid and by type and name. */
async function itemSources() {
  const pack = game.packs.get(ITEMS);
  const byUuid = new Map();
  const byName = new Map();
  if (!pack) return { byUuid, byName };
  for (const doc of await pack.getDocuments()) {
    byUuid.set(doc.uuid, doc);
    const key = `${doc.type}|${doc.name}`;
    if (!byName.has(key)) byName.set(key, doc);
  }
  return { byUuid, byName };
}

const isTreasure = data => (data.system?.tags ?? []).some(t => ["Valuable", "Core Material"].includes(t));

/** The new price of a physical item's data, or null when it keeps its price. */
function newPrice(data, sources) {
  if (!PHYSICAL.includes(data.type) || data.flags?.[SYSTEM_ID]?.drop) return null;
  const price = toInt(data.system?.price);
  const craft = data.flags?.[SYSTEM_ID]?.craft;
  if (craft?.base) {
    const base = sources.byName.get(`${craft.base.type}|${craft.base.name}`);
    const basePrice = base ? toInt(base.system.price) : times(craft.base.system?.price);
    const level = Math.min(Math.max(toInt(data.system?.rank) || 1, 1), MAX_ANIMA);
    return { price: basePrice + (animaPrice(level) * (toInt(craft.grade) || 1)), basePrice };
  }
  const source = sources.byUuid.get(data._stats?.compendiumSource) ?? sources.byName.get(`${data.type}|${data.name}`);
  if (source) return { price: toInt(source.system.price) };
  if (!price || isTreasure(data)) return null;
  return { price: times(price) };
}

/**
 * The mark of a document already brought to the Yuld (`flags.eternia.yuld`), set in the same update: a migration that
 * stops halfway (an error, a closed window) runs again on the next load, and nothing is doubled twice.
 */
const MARK = `flags.${SYSTEM_ID}.yuld`;
const marked = data => !!data?.flags?.[SYSTEM_ID]?.yuld;

/** The updates of a collection of items (their price, and a crafted one's base), each with the mark. */
function priceUpdates(items, sources) {
  const updates = [];
  for (const item of items) {
    const data = item._source ?? item;
    if (marked(data)) continue;
    const next = newPrice(data, sources);
    if (!next || ((next.price === toInt(data.system?.price)) && (next.basePrice === undefined))) continue;
    const update = { _id: data._id, "system.price": next.price, [MARK]: 1 };
    if (next.basePrice !== undefined) update[`flags.${SYSTEM_ID}.craft.base.system.price`] = next.basePrice;
    updates.push(update);
  }
  return updates;
}

/** The drop rows and the currency's texts of a bestiary monster's items, from its compendium monster. */
function monsterItemUpdates(items, source) {
  const updates = [];
  const byId = new Map(source.items.map(i => [i._id, i]));
  const byName = new Map(source.items.map(i => [i.name, i]));
  for (const item of items) {
    const data = item._source ?? item;
    const from = byId.get(data._id) ?? byName.get(data.name);
    const update = { _id: data._id };
    if (data.flags?.[SYSTEM_ID]?.drop && from?.flags?.[SYSTEM_ID]?.drop) {
      Object.assign(update, {
        name: from.name, "system.price": toInt(from.system?.price), "system.description": from.system?.description ?? "",
        [`flags.${SYSTEM_ID}.drop`]: foundry.utils.deepClone(from.flags[SYSTEM_ID].drop)
      });
      if (from.flags[SYSTEM_ID][UNSEALED]) update[`flags.${SYSTEM_ID}.${UNSEALED}`] = true;
    }
    else {
      // The skills that take or offer Yuld (the Light Hand, the Proposal…) take the compendium's text; the rest, the name
      const yuld = /Yuld/.test(from?.system?.description ?? "");
      const text = yuld ? from.system.description : yuldText(data.system?.description);
      if (text !== data.system?.description) update["system.description"] = text;
      const rule = from?.flags?.[SYSTEM_ID]?.monster;
      if ((rule?.rule === "offer") && data.flags?.[SYSTEM_ID]?.monster) update[`flags.${SYSTEM_ID}.monster.gold`] = rule.gold;
    }
    if (Object.keys(update).length > 1) updates.push(update);
  }
  return updates;
}

/** The Light Hand's effect (inside its skill) takes the compendium's formula: the monster steals twice the old Yuld. */
async function handEffects(items, source, opts) {
  const byName = new Map(source.items.map(i => [i.name, i]));
  for (const item of items) {
    const next = (byName.get(item.name)?.effects ?? []).find(e => e.flags?.[SYSTEM_ID]?.pickpocket)?.flags[SYSTEM_ID].pickpocket.gold;
    if (!next) continue;
    const updates = item.effects.filter(e => e.getFlag(SYSTEM_ID, "pickpocket")?.gold && (e.getFlag(SYSTEM_ID, "pickpocket").gold !== next))
      .map(e => ({ _id: e.id, [`flags.${SYSTEM_ID}.pickpocket.gold`]: next }));
    if (updates.length) await item.updateEmbeddedDocuments("ActiveEffect", updates, opts());
  }
}

/** The compendium monster of a copy (its source data), loaded once. */
async function bestiarySource(actor, cache) {
  const uuid = actor?._stats?.compendiumSource;
  const prefix = `Compendium.${BESTIARY}.Actor.`;
  if (!uuid?.startsWith(prefix)) return null;
  if (!cache.has(uuid)) cache.set(uuid, (await fromUuid(uuid).catch(() => null))?.toObject() ?? null);
  return cache.get(uuid);
}

async function run(done = 0) {
  if (done >= 1) return true;
  const sources = await itemSources();
  const monsters = new Map();
  // A new options object for every call: Foundry writes the parent of an embedded update into the one it gets
  const opts = () => ({ eterniaMigration: true });
  const counts = { purses: 0, items: 0, monsters: 0, shops: 0, tokens: 0 };

  // The world's items
  const worldUpdates = priceUpdates(game.items.contents, sources);
  if (worldUpdates.length) await Item.updateDocuments(worldUpdates, opts());
  counts.items += worldUpdates.length;

  for (const actor of game.actors) {
    if (marked(actor._source)) continue;
    // The items first (each one marked), the actor and its purse last, with its own mark
    if (actor.type !== "monster") {
      const updates = priceUpdates(actor.items.contents, sources);
      if (updates.length) await actor.updateEmbeddedDocuments("Item", updates, opts());
      counts.items += updates.length;
    }
    const changes = { [MARK]: 1 };
    if (actor.type === "character") {
      changes["system.inventory.gold"] = times(actor._source.system?.inventory?.gold);
      const spent = actor.getFlag(SYSTEM_ID, "startingGear")?.spent;
      if (spent) changes[`flags.${SYSTEM_ID}.startingGear.spent`] = times(spent);
    }
    else if (actor.type === "pile") {
      changes["system.gold"] = times(actor._source.system?.gold);
      if ((actor._source.system?.mode === "merchant") && (Number(actor._source.system?.merchant?.sellMultiplier) === 0.5)) {
        changes["system.merchant.sellMultiplier"] = RESALE.other;
        counts.shops++;
      }
    }
    else if (actor.type === "monster") {
      const stolen = toInt(actor.getFlag(SYSTEM_ID, "stolenGold"));
      if (stolen) changes[`flags.${SYSTEM_ID}.stolenGold`] = times(stolen);
      const source = await bestiarySource(actor, monsters);
      if (source) {
        const text = yuldText(actor._source.system?.description);
        if (text !== actor._source.system?.description) changes["system.description"] = text;
        const updates = monsterItemUpdates(actor.items.contents, source);
        if (updates.length) await actor.updateEmbeddedDocuments("Item", updates, opts());
        await handEffects(actor.items.contents, source, opts);
        counts.monsters++;
      }
    }
    if (("system.inventory.gold" in changes) || ("system.gold" in changes)) counts.purses++;
    await actor.update(changes, opts());
  }

  // The unlinked tokens: their own purse and their own copies of items (the delta carries its own mark)
  for (const scene of game.scenes) {
    const tokenUpdates = [];
    for (const token of scene.tokens) {
      if (token.actorLink || !token.actor) continue;
      const delta = token.delta?._source ?? {};
      const type = token.actor.type;
      const own = new Set((delta.items ?? []).map(i => i._id));
      if (own.size) {
        const items = token.actor.items.filter(i => own.has(i.id));
        const source = (type === "monster") ? await bestiarySource(token.baseActor ?? game.actors.get(token.actorId), monsters) : null;
        const updates = source ? monsterItemUpdates(items, source) : priceUpdates(items, sources);
        if (updates.length) await token.actor.updateEmbeddedDocuments("Item", updates, opts());
        if (source) await handEffects(token.actor.items.filter(i => own.has(i.id)), source, opts);
      }
      if (marked(delta)) continue;
      const change = {};
      if ((type === "character") && (delta.system?.inventory?.gold !== undefined)) change["delta.system.inventory.gold"] = times(delta.system.inventory.gold);
      if ((type === "pile") && (delta.system?.gold !== undefined)) change["delta.system.gold"] = times(delta.system.gold);
      if ((type === "monster") && delta.flags?.[SYSTEM_ID]?.stolenGold) change[`delta.flags.${SYSTEM_ID}.stolenGold`] = times(delta.flags[SYSTEM_ID].stolenGold);
      if (!foundry.utils.isEmpty(change)) tokenUpdates.push({ _id: token.id, ...change, [`delta.${MARK}`]: 1 });
    }
    if (tokenUpdates.length) await scene.updateEmbeddedDocuments("Token", tokenUpdates, opts());
    counts.tokens += tokenUpdates.length;
  }
  console.log(`${SYSTEM_ID} | Economy (0.48): ${counts.purses} purses and ${counts.tokens} tokens in Yuld (×${PRICE_RATE}), ${counts.items} item prices, ${counts.monsters} bestiary monsters with the new drops, ${counts.shops} shops at the new rate`);
  return true;
}

export const ECONOMY_MIGRATION = { id: "economy", setting: "economyMigrationVersion", version: 1, run };
