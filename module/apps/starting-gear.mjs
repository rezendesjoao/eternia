/**
 * The starting gear of a new character (AS REGRAS, II. PERSONAGENS, "Itens Iniciais"): a Backpack, an Adventurer's Kit
 * and a Sandwich for free, and the Yuld the character has (700, the template's: economy/data.mjs START_YULD) to spend in the creation wizard's shop.
 * The shop sells what can be bought at CR 1: the items of Item Rank 1 with a price, from the system's and the world's
 * compendiums, without [Not For Sale], [Untradeable] nor a magic grade ([M1]…[M7]); a [Rare] one is sold, marked.
 *
 * Also here, for the wizard (apps/creation-wizard.mjs):
 *   - the kit recommended for each class (KITS), and for a class that fights with a weapon and a Magia whose spells
 *     attack, the accessory with the most Magic Power;
 *   - where each piece goes (gearLayout): the first weapon in the main hand (a [Two-Handed] one takes both), a shield or
 *     a second weapon in the other, the first armor, three accessories, the bag with the most space; the rest is
 *     carried and takes the inventory's space (2 plus the bag's); and the numbers the pieces give (gearNumbers), as
 *     EterniaActor#_computeBattleStatuses counts them;
 *   - the bonus points suggested for a class (suggestBonus).
 */
import { L, SYSTEM_ID } from "../settings.mjs";
import { escape, toInt } from "../helpers/utils.mjs";
import { tagLabel, term } from "../i18n/terms.mjs";
import { tagKey } from "../helpers/tag-catalog.mjs";
import { equipmentMagic } from "../helpers/magic-power.mjs";
import { fold } from "./magic-catalog.mjs";
import { STATS, firstSentence, loadDocuments, skillSummary } from "./creation-catalog.mjs";

/** What the shop sells, in the order of its filters. */
export const SHOP_CATEGORIES = [
  { id: "weapon", icon: "fa-solid fa-sword" },
  { id: "armor", icon: "fa-solid fa-shirt" },
  { id: "shield", icon: "fa-solid fa-shield" },
  { id: "accessory", icon: "fa-solid fa-ring" },
  { id: "bag", icon: "fa-solid fa-sack" },
  { id: "usable", icon: "fa-solid fa-flask" },
  { id: "gear", icon: "fa-solid fa-toolbox" }
];
const TYPES = SHOP_CATEGORIES.map(c => c.id);

/** What every character starts with, for free (the system's compendium of items). */
export const FREE_ITEMS = [
  "Compendium.eternia.items.Item.qC4UoFHhuFmTjkdd", // Mochila
  "Compendium.eternia.items.Item.Ka2QGQGiEXHsQiU0", // Kit de Aventureiro
  "Compendium.eternia.items.Item.P4jnUXvEBNmHQXrF" // (NP1) Sanduíche Favorito
];

/** The flag of the items the wizard gave: "free" or "bought" (made again, they leave first). */
export const STARTING_FLAG = "starting";
/** The flag on the character with the gold its starting gear cost ({ spent }), given back when it is made again. */
export const STARTING_GEAR_FLAG = "startingGear";

/** The Item Rank of what can be bought at creation (CR 1). */
const SHOP_RANK = 1;
/** The inventory's space without a bag (EterniaActor#_computeInventoryMaxSpace). */
const BASE_SPACE = 2;
const MAX_ACCESSORIES = 3;
const BLOCKED = new Set(["Not For Sale", "Untradeable"].map(tagKey));
const RARE = tagKey("Rare");
const TWO_HANDED = tagKey("Two-Handed");

/**
 * The kit recommended for each class (by the class item's identifier), by item name, in the order it is bought: what
 * the class fights with (the Samurai's [Katana], the Hunter's [Bow], a caster's staff with the Sigil Guard's Magic
 * Power on top), the armor of its band of HP and what helps its Motor. Each one costs 700 Yuld at most (START_YULD); why, in
 * ETERNIA.Wizard.Items.Kit.<id>.
 */
export const KITS = {
  samurai: ["Odachi", "Armadura de Couro", "Bracelete", "Panaceia I"],
  guardiao: ["Falcione", "Broquel", "Cota de Anéis", "Elmo de Ferro", "Joia do Renascimento I"],
  berserker: ["Machado de Batalha", "Armadura de Couro", "Bracelete", "Panaceia I", "Botas de Vigor"],
  monge: ["Soqueira Kaiser", "Camisa de Couro", "Bracelete", "Capa da Agilidade", "Panaceia I", "Joia do Renascimento I"],
  assassino: ["Adaga Refinada", "Adaga Refinada", "Camisa de Couro", "Bracelete", "Luvas do Ladrão", "Veneno Mortal I",
    "Veneno de Transe I", "Panaceia I"],
  cacador: ["Arco de Caça", "Camisa de Couro", "Bracelete", "Brinco da Acuidade", "Panaceia I", "Joia do Renascimento I"],
  comandante: ["Lança Curta", "Broquel", "Armadura de Couro", "Colar da Empatia", "Joia do Renascimento I", "Panaceia I"],
  matador: ["Soqueira Kaiser", "Armadura de Couro", "Anel Cinzento", "Panaceia I"],
  magonegro: ["Cajado de Carvalho", "Guarda de Sigilos", "Camisa de Couro", "Talismã Aoi (Amuleto da Flor Azul)", "Panaceia I"],
  magobranco: ["Cajado de Carvalho", "Guarda de Sigilos", "Camisa de Couro", "Joia do Renascimento I", "Joia do Renascimento I",
    "Panaceia I"],
  magovermelho: ["Cajado de Carvalho", "Armadura de Couro", "Guarda de Sigilos", "Bracelete"],
  magoazul: ["Cajado de Carvalho", "Guarda de Sigilos", "Armadura de Couro", "Panaceia I"],
  invocador: ["Cajado de Carvalho", "Guarda de Sigilos", "Camisa de Couro", "Enciclopédia", "Panaceia I", "Joia do Renascimento I"],
  pictomante: ["Varinha de Carvalho", "Broquel", "Anel Cinzento", "Camisa de Couro", "Óculos do Artesão", "Panaceia I"]
};
/** A class without a kit of its own, by family. */
const FAMILY_KITS = {
  physical: ["Espada Grande", "Armadura de Couro", "Bracelete", "Panaceia I"],
  magic: ["Cajado de Carvalho", "Guarda de Sigilos", "Camisa de Couro", "Panaceia I"]
};

/* -------------------------------------------- */
/*  A piece of gear                             */
/* -------------------------------------------- */

/** The change keys of the effects that the numbers of the shop count, and what they add to. */
const BONUS_KEYS = {
  "system.battle-status.power.attack.mod": "attack",
  "system.battle-status.power.magic.mod": "magic",
  "system.battle-status.defense.phys.mod": "pdef",
  "system.battle-status.defense.magic.mod": "mdef",
  "system.battle-status.initiative.mod": "initiative"
};
const CHECK_KEY = /^system\.checks\.(\w+)\.mod$/;
const checkLabel = key => game.i18n.localize(`ETERNIA.Check.${key.charAt(0).toUpperCase()}${key.slice(1)}`);
const signed = n => (n >= 0 ? `+${n}` : `−${Math.abs(n)}`);

/** What the item's own effects add while it is equipped: { attack, magic, pdef, mdef, initiative, checks }. */
function bonusesOf(item) {
  const bonus = { attack: 0, magic: 0, pdef: 0, mdef: 0, initiative: 0, checks: {} };
  for (const effect of item.effects ?? []) {
    if (effect.disabled || (effect.transfer === false)) continue;
    for (const change of effect.system?.changes ?? effect.changes ?? []) {
      const adds = (change.type ?? "add") === "add" || (change.mode === CONST.ACTIVE_EFFECT_MODES?.ADD);
      const value = Number(change.value);
      if (!adds || !Number.isFinite(value) || !value) continue;
      const key = String(change.key ?? "");
      if (BONUS_KEYS[key]) bonus[BONUS_KEYS[key]] += value;
      else if (CHECK_KEY.test(key)) {
        const check = CHECK_KEY.exec(key)[1];
        bonus.checks[check] = (bonus.checks[check] ?? 0) + value;
      }
    }
  }
  return bonus;
}

/** "Ataque 6 · Precisão +1 · Duas Mãos": what a piece gives, in a line (or the first sentence of what it does). */
function statParts(entry, description) {
  const { stats, bonus } = entry;
  const label = key => game.i18n.localize(`ETERNIA.Item.Label.${key}`);
  const parts = [];
  if (entry.type === "weapon") {
    parts.push(`${label("Attack")} ${stats.attack}`);
    if (stats.magic) parts.push(`${label("Magic")} ${stats.magic}`);
    if (stats.accuracy) parts.push(`${label("Accuracy")} ${signed(stats.accuracy)}`);
    if (stats.range && !["-", "Close"].includes(stats.range)) parts.push(term("range", stats.range));
    if (entry.twoHanded) parts.push(tagLabel("Two-Handed"));
  }
  else if (entry.type === "bag") parts.push(`${label("BagSpace")} +${stats.bagSpace}`);
  if (entry.type !== "weapon") {
    if (stats.pdef || stats.mdef) parts.push(`${label("PDef")} ${stats.pdef}`, `${label("MDef")} ${stats.mdef}`);
    if (stats.initiative) parts.push(`${label("Initiative")} ${signed(stats.initiative)}`);
    const magic = stats.magic + bonus.magic;
    if (bonus.attack) parts.push(`${L("Tooltip.AttackPower")} ${signed(bonus.attack)}`);
    if (magic) parts.push(`${L("Tooltip.MagicPower")} ${signed(magic)}`);
    for (const [check, n] of Object.entries(bonus.checks)) parts.push(`${checkLabel(check)} ${signed(n)}`);
  }
  if (!parts.length) parts.push(firstSentence(skillSummary(description, 140)).replace(/[[\]]/g, ""));
  return parts.filter(Boolean);
}

/**
 * A piece of gear (an item of a compendium, or one the character has) as the shop reads it.
 * @param {Item} item
 */
export function gearEntry(item) {
  const s = item.system ?? {};
  const tags = s.tags ?? [];
  const keys = tags.map(tagKey);
  const entry = {
    uuid: item.uuid,
    name: item.name,
    img: item.img,
    type: item.type,
    price: Math.max(0, toInt(s.price)),
    rank: toInt(s.rank) || 1,
    tags,
    rare: keys.includes(RARE),
    twoHanded: keys.includes(TWO_HANDED),
    stats: {
      attack: toInt(s.attack), magic: toInt(s.magic), accuracy: toInt(s.accuracy), pdef: toInt(s.pdef),
      mdef: toInt(s.mdef), initiative: toInt(s.initiative), bagSpace: toInt(s.bagSpace), range: s.range ?? ""
    },
    bonus: bonusesOf(item)
  };
  entry.parts = statParts(entry, s.description);
  entry.line = entry.parts.join(" · ");
  entry.text = skillSummary(s.description, 260).replace(/[[\]]/g, "");
  entry.search = fold([item.name, entry.line, ...tags.map(tagLabel)].join(" "));
  return entry;
}

/** The tooltip of a piece (the look of the class tab's tiles). */
export function gearTip(entry) {
  const meta = [game.i18n.localize(`TYPES.Item.${entry.type}`), `${game.i18n.localize("ETERNIA.Item.Label.Rank")} ${entry.rank}`,
    L("Wizard.Items.Price", { n: entry.price })].join(" · ");
  const tags = entry.tags.map(t => `<span>${escape(tagLabel(t))}</span>`).join("");
  return `<div class="lhcl-tip wz-gear-tip"><header><img src="${entry.img}" alt=""><div><strong>${escape(entry.name)}</strong>`
    + `<span>${escape(meta)}</span></div></header>`
    + `<p class="wz-tip-stats">${escape(entry.line)}</p>`
    + `${entry.text ? `<p>${escape(entry.text)}</p>` : ""}`
    + `${tags ? `<p class="wz-tip-tags">${tags}</p>` : ""}`
    + `${entry.rare ? `<p class="wz-tip-rare"><i class="fa-solid fa-gem"></i> ${escape(L("Wizard.Items.RareTip"))}</p>` : ""}</div>`;
}

/* -------------------------------------------- */
/*  The shop                                    */
/* -------------------------------------------- */

let shopPromise = null;

/**
 * What the shop sells and the free items: { items (by category, price and name), byUuid, byName, free }.
 * Read once from the compendiums (their indexes, then the documents of what is sold) and kept until an item changes.
 * @returns {Promise<object>}
 */
export function shopCatalog() {
  shopPromise ??= buildShop().catch(err => {
    shopPromise = null;
    throw err;
  });
  return shopPromise;
}

/** Forget the shop (an item of a compendium changed). */
export function clearShopCatalog() {
  shopPromise = null;
}

/** Whether a compendium entry can be bought at creation. */
function sellable(e) {
  if (!TYPES.includes(e.type) || ((toInt(e.system?.rank) || 1) > SHOP_RANK) || (toInt(e.system?.price) <= 0)) return false;
  const keys = (e.system?.tags ?? []).map(tagKey);
  return !keys.some(k => BLOCKED.has(k) || /^m\d$/.test(k));
}

async function buildShop() {
  // The system's compendiums first, then the world's (the first item of a name wins)
  const ours = p => ((p.metadata.packageType === "system") && (p.metadata.packageName === SYSTEM_ID));
  const packs = game.packs.filter(p => (p.documentName === "Item") && p.visible && (ours(p) || (p.metadata.packageType === "world")))
    .sort((a, b) => (ours(a) ? 0 : 1) - (ours(b) ? 0 : 1));
  const seen = new Set();
  const uuids = [];
  for (const pack of packs) {
    for (const e of await pack.getIndex()) {
      const name = fold(e.name);
      if (!sellable(e) || seen.has(name)) continue;
      seen.add(name);
      uuids.push(e.uuid ?? pack.getUuid(e._id));
    }
  }
  const docs = await loadDocuments([...uuids, ...FREE_ITEMS]);
  const order = type => TYPES.indexOf(type);
  const items = uuids.map(uuid => docs.get(uuid)).filter(Boolean).map(gearEntry)
    .sort((a, b) => (order(a.type) - order(b.type)) || (a.price - b.price) || a.name.localeCompare(b.name, game.i18n.lang));
  for (const entry of items) entry.tip = gearTip(entry);
  const free = FREE_ITEMS.map(uuid => docs.get(uuid)).filter(Boolean).map(doc => {
    const entry = gearEntry(doc);
    entry.tip = gearTip(entry);
    return entry;
  });
  return {
    items,
    free,
    byUuid: new Map([...items, ...free].map(e => [e.uuid, e])),
    byName: new Map(items.map(e => [fold(e.name), e]))
  };
}

/** Call during the `init` hook. */
export function registerShopCatalog() {
  const watch = item => item.pack && TYPES.includes(item.type) && clearShopCatalog();
  Hooks.on("createItem", watch);
  Hooks.on("updateItem", watch);
  Hooks.on("deleteItem", watch);
  for (const hook of ["createCompendium", "deleteCompendium", "updateCompendium"]) Hooks.on(hook, clearShopCatalog);
}

/* -------------------------------------------- */
/*  Recommendations                             */
/* -------------------------------------------- */

/**
 * The kit recommended for a class: the shop's entries of its kit, in the order they are bought.
 * @param {object} shop          shopCatalog()
 * @param {string} classId       The class item's identifier
 * @param {string} [family]      "physical" or "magic", for a class without a kit of its own
 * @returns {{entries: object[], cost: number, own: boolean}}  own: the class has a kit of its own (its reason)
 */
export function recommendedKit(shop, classId, family) {
  const names = KITS[classId] ?? FAMILY_KITS[family] ?? [];
  const entries = names.map(name => shop.byName.get(fold(name))).filter(Boolean);
  return { entries, cost: entries.reduce((n, e) => n + e.price, 0), own: !!KITS[classId] };
}

/**
 * For a Magia whose spells attack with magic, when the kit gives no Magic Power (a class that fights with a weapon):
 * the accessory with the most Magic Power (the Grey Ring).
 * @param {object} shop
 * @param {object[]} kit         The kit's entries
 * @param {boolean} attacks      The Magia has spells that are [Magic Attack]s
 * @returns {object|null}
 */
export function magiaSuggestion(shop, kit, attacks) {
  if (!attacks) return null;
  const layout = gearLayout(kit.map(entry => ({ entry })));
  if (gearNumbers(layout).magic > 0) return null;
  const power = e => e.stats.magic + e.bonus.magic;
  return shop.items.filter(e => (e.type === "accessory") && (power(e) > 0))
    .sort((a, b) => (power(b) - power(a)) || (a.price - b.price))[0] ?? null;
}

/* -------------------------------------------- */
/*  Where the pieces go                         */
/* -------------------------------------------- */

/**
 * Where each piece goes, in the order given (the free items, then what was bought): the first weapon in the main hand
 * ([Two-Handed]: both), the first shield (else a second one-handed weapon) in the other, the first armor, the first
 * three accessories and the bag with the most space; the rest is carried. The slots the character's own equipped items
 * already take stay theirs.
 * @param {{entry: object, free?: boolean}[]} units
 * @param {object} [have]     What the character already has: { equipped: entries with their slot, carried: n }
 * @returns {{units: object[], main: object|null, off: object|null, locked: boolean, armor: object|null,
 *   accessories: object[], bag: object|null, carried: object[], space: {used: number, max: number}}}
 */
export function gearLayout(units, have = { equipped: [], carried: 0 }) {
  const placed = units.map(u => ({ ...u, slot: "carried" }));
  const own = have.equipped ?? [];
  const taken = slot => own.find(o => o.slot === slot) ?? null;
  let main = taken("main"), off = taken("off"), armor = taken("armor");
  const accessories = own.filter(o => o.slot === "accessory").map(o => o.entry);
  let bag = taken("bag")?.entry ?? null;
  const put = (unit, slot) => {
    unit.slot = slot;
    return unit;
  };
  const free = type => placed.find(u => (u.entry.type === type) && (u.slot === "carried"));
  main ??= free("weapon") && put(free("weapon"), "main");
  const locked = !!main?.entry.twoHanded;
  // The other hand: a shield, else a second one-handed weapon (a [Two-Handed] main weapon takes both)
  if (!off && !locked) {
    const second = free("shield") ?? placed.find(u => (u.entry.type === "weapon") && (u.slot === "carried") && !u.entry.twoHanded);
    if (second) off = put(second, "off");
  }
  armor ??= free("armor") && put(free("armor"), "armor");
  for (const unit of placed) {
    if ((unit.entry.type !== "accessory") || (accessories.length >= MAX_ACCESSORIES)) continue;
    accessories.push(put(unit, "accessory").entry);
  }
  const bags = placed.filter(u => u.entry.type === "bag");
  if (!bag && bags.length) bag = put(bags.reduce((a, b) => ((b.entry.stats.bagSpace > a.entry.stats.bagSpace) ? b : a)), "bag").entry;
  const carried = placed.filter(u => u.slot === "carried");
  return {
    units: placed,
    main: main?.entry ?? null,
    off: off?.entry ?? null,
    locked,
    armor: armor?.entry ?? null,
    accessories,
    bag,
    carried,
    space: { used: carried.length + toInt(have.carried), max: BASE_SPACE + toInt(bag?.stats.bagSpace) }
  };
}

/**
 * What the equipped pieces add to the numbers of play, as the character's sheet counts them: the main weapon's Attack,
 * the Magic Power (one source, the weapon or the best Magic Stone, plus the other accessories: helpers/magic-power.mjs), the Accuracy of the weapons in the hands, the Defenses and the Initiative of
 * the armor, the shield and the accessories, and their effects (the Bracelet's +1 Attack Power, a check's +1).
 * @param {object} layout   gearLayout()
 * @returns {{attack: number, magic: number, accuracy: number, pdef: number, mdef: number, initiative: number, checks: object}}
 */
export function gearNumbers(layout) {
  const { main, off, armor, accessories } = layout;
  const equipped = [main, off, armor, ...accessories, layout.bag].filter(Boolean);
  const weapons = [main, off].filter(e => e?.type === "weapon");
  const sum = (list, key) => list.reduce((n, e) => n + (e.stats[key] ?? 0), 0);
  const bonus = key => equipped.reduce((n, e) => n + (e.bonus[key] ?? 0), 0);
  const defenders = [armor, off?.type === "shield" ? off : null, ...accessories].filter(Boolean);
  const checks = {};
  for (const e of equipped) for (const [k, n] of Object.entries(e.bonus.checks)) checks[k] = (checks[k] ?? 0) + n;
  return {
    attack: (main?.stats.attack ?? 0) + bonus("attack"),
    magic: equipmentMagic(main?.stats.magic ?? 0, accessories.map(e => ({ magic: e.stats.magic, tags: e.tags }))) + bonus("magic"),
    accuracy: sum(weapons, "accuracy"),
    pdef: sum(defenders, "pdef") + bonus("pdef"),
    mdef: sum(defenders, "mdef") + bonus("mdef"),
    initiative: sum([...weapons, armor, ...accessories].filter(Boolean), "initiative") + bonus("initiative"),
    checks
  };
}

/**
 * What a character already carries and has equipped (the items the wizard didn't give: those leave and come again),
 * for gearLayout: each equipped piece with its slot, and how many take space.
 * @param {Actor} actor
 */
export function gearOf(actor) {
  const items = actor.items.filter(i => TYPES.includes(i.type) && !i.getFlag(SYSTEM_ID, STARTING_FLAG));
  const equipped = items.filter(i => i.system.equipped && ["weapon", "armor", "shield", "accessory", "bag"].includes(i.type));
  const weapons = equipped.filter(i => i.type === "weapon");
  const main = weapons.find(w => w.system.main) ?? weapons[0] ?? null;
  const out = [];
  if (main) out.push({ slot: "main", entry: gearEntry(main) });
  const second = weapons.find(w => w !== main) ?? equipped.find(i => i.type === "shield");
  if (second) out.push({ slot: "off", entry: gearEntry(second) });
  const armor = equipped.find(i => i.type === "armor");
  if (armor) out.push({ slot: "armor", entry: gearEntry(armor) });
  const accessories = equipped.filter(i => i.type === "accessory").slice(0, MAX_ACCESSORIES);
  for (const a of accessories) out.push({ slot: "accessory", entry: gearEntry(a) });
  const bag = equipped.filter(i => i.type === "bag").sort((a, b) => toInt(b.system.bagSpace) - toInt(a.system.bagSpace))[0];
  if (bag) out.push({ slot: "bag", entry: gearEntry(bag) });
  return { equipped: out, carried: items.filter(i => !equipped.includes(i)).length, names: new Set(items.map(i => fold(i.name))) };
}

/* -------------------------------------------- */
/*  The bonus points                            */
/* -------------------------------------------- */

/**
 * The bonus points suggested for a class: where its base is high, up to the next modifier (one every 3 points), since
 * the modifier is what the checks, the Defenses and the Initiative read and Accuracy takes the highest one. Every split
 * of the points is tried: the best gives the most modifier weighted by the class's base (each attribute weighs its base
 * squared, plus one), then the highest attributes where the class is strong (they reach the next modifier sooner, as
 * each CR adds +1 to all of them).
 * @param {object} base     The class's attributes
 * @param {object} before   The attributes before the bonus points (the class's and the race's)
 * @param {number} points
 * @param {number} max      No attribute above it
 * @returns {object|null}  The bonus of each attribute
 */
export function suggestBonus(base, before, points, max) {
  const weight = Object.fromEntries(STATS.map(k => [k, (toInt(base[k]) ** 2) + 1]));
  let best = null;
  const bonus = {};
  const visit = (index, left) => {
    const key = STATS[index];
    if (index === STATS.length - 1) {
      bonus[key] = left;
      if (STATS.some(k => toInt(before[k]) + bonus[k] > max)) return;
      const total = k => toInt(before[k]) + bonus[k];
      const score = STATS.reduce((n, k) => n + (weight[k] * Math.floor(total(k) / 3)), 0);
      const lean = STATS.reduce((n, k) => n + (weight[k] * total(k)), 0);
      const better = !best || (score > best.score) || ((score === best.score) && (lean > best.lean));
      if (better) best = { score, lean, bonus: { ...bonus } };
      return;
    }
    for (let n = 0; n <= left; n++) {
      bonus[key] = n;
      visit(index + 1, left - n);
    }
  };
  visit(0, points);
  return best?.bonus ?? null;
}
