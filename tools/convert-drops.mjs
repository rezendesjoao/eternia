/**
 * Turn the "Itens Deixados" tables written in the bestiary's descriptions (src/packs/bestiary) into the drop rows the
 * system rolls (module/bestiary/drops.mjs): an item kept in the monster per row, with `flags.eternia.drop` (the faces,
 * "Fixo", the copies, the gold formula). An entry of the item list ("conforme a Lista de Itens", or a name the item
 * compendium knows) is a copy of that item; any other is a part of the monster (a gear item with the tags and the
 * price, and an icon chosen by the words of its name). The table leaves the description.
 * Usage: node tools/convert-drops.mjs [--dry]
 */
import fs from "node:fs";
import path from "node:path";
import { GOLD_ICON, nameKey, nameKeys, parseDropTable, partIcon, priceOf, withoutDropTable } from "../module/bestiary/drop-table.mjs";

const dry = process.argv.includes("--dry");
const BESTIARY = path.resolve("src/packs/bestiary");
const ITEMS = path.resolve("src/packs/items");

const randomID = () => Array.from({ length: 16 }, () => "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"[Math.floor(Math.random() * 62)]).join("");
const stats = { coreVersion: "14.360", systemId: "eternia", systemVersion: "0.33.0", createdTime: null, modifiedTime: null,
  lastModifiedBy: null, compendiumSource: null, duplicateSource: null, exportSource: null };

/** The item compendium's items by name. */
const items = new Map();
for (const file of fs.readdirSync(ITEMS)) {
  const doc = JSON.parse(fs.readFileSync(path.join(ITEMS, file), "utf8"));
  if (doc._key?.startsWith("!items!") && !items.has(nameKey(doc.name))) items.set(nameKey(doc.name), doc);
}

/** A gear item of the monster's (a part, or the card of a gold row). */
function gear(name, { img, tags = [], price = 0, rank = 1, description = "" }) {
  return {
    name, type: "gear", img,
    system: { description, tags, rank, price, equipped: false, skillText: "", linkedSkillUuid: "", timing: "", checkType: "", range: "", target: "" },
    effects: [], ownership: { default: 0 }, flags: {}
  };
}

/** The item of an entry, as embedded data (no ids yet). */
function itemOf(entry, monster) {
  if (entry.gold) return gear("Ouro", { img: GOLD_ICON });
  const known = nameKeys(entry.name).map(k => items.get(k)).find(Boolean);
  if (known && (entry.listed || entry.tags.every(t => t === "Consumable"))) {
    const copy = structuredClone(known);
    for (const key of ["_id", "_key", "folder", "sort"]) delete copy[key];
    copy._stats = { ...stats, compendiumSource: `Compendium.eternia.items.Item.${known._id}` };
    if (copy.system && ("equipped" in copy.system)) copy.system.equipped = false;
    return copy;
  }
  if (entry.listed) console.warn(`  ! ${monster.name}: "${entry.name}" is not in the item compendium; it becomes a part`);
  const catalyst = entry.tags.find(t => /^Magic Catalyst/.test(t));
  const data = gear(entry.name, {
    img: partIcon(entry.name), tags: entry.tags, price: entry.price ?? 0,
    rank: catalyst ? Number(catalyst.match(/\d+/)[0]) : Math.max(1, Number(monster.system.rank) || 1),
    description: `<p>Deixado por ${monster.name}.</p>`
  });
  data.system.price = priceOf(data);
  return data;
}

let monsters = 0;
let rows = 0;
for (const file of fs.readdirSync(BESTIARY)) {
  const full = path.join(BESTIARY, file);
  const text = fs.readFileSync(full, "utf8");
  const doc = JSON.parse(text);
  if (doc.type !== "monster" || doc.items?.some(i => i.flags?.eternia?.drop)) continue;
  const table = parseDropTable(doc.system?.description);
  if (!table?.length) continue;
  let sort = Math.max(0, ...doc.items.map(i => i.sort ?? 0));
  for (const { rule, entry } of table) {
    const item = itemOf(entry, doc);
    const id = randomID();
    item._id = id;
    item._key = `!actors.items!${doc._id}.${id}`;
    item.sort = (sort += 100000);
    item._stats ??= { ...stats };
    for (const effect of item.effects ?? []) effect._key = `!actors.items.effects!${doc._id}.${id}.${effect._id}`;
    const drop = rule.fixed ? { fixed: true, qty: rule.qty } : { min: rule.min, max: rule.max, qty: rule.qty };
    if (rule.gold) drop.gold = rule.gold;
    item.flags = { ...(item.flags ?? {}), eternia: { ...(item.flags?.eternia ?? {}), drop } };
    doc.items.push(item);
    rows++;
  }
  doc.system.description = withoutDropTable(doc.system.description);
  monsters++;
  console.log(`${doc.name}: ${table.length} rows`);
  if (!dry) fs.writeFileSync(full, JSON.stringify(doc, null, 2) + (text.endsWith("\n") ? "\n" : ""));
}
console.log(`${dry ? "[dry] " : ""}${monsters} monsters, ${rows} rows.`);
