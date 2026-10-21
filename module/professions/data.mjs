/**
 * Professions (the Eternia subclasses): what each one makes, its talent, the Rank ladder, the quality table of the
 * Workshop and the enhancements of each kind of item. Data and pure helpers only (no game state).
 *
 * A profession is a Subclass item whose `system.identifier` is one of PROFESSION_IDS (compendium Raças e Classes,
 * folder Profissões). The character's progress lives in its flags (state.mjs).
 */
import { tagKey } from "../helpers/tag-catalog.mjs";
import { toInt } from "../helpers/utils.mjs";

/**
 * The ten professions: picture and color of the crest, the kinds of item they make (kindOf) and their talent.
 * `kinds` empty: the profession makes nothing in the Workshop (Gatherer, Merchant).
 */
export const PROFESSIONS = {
  blacksmith: { img: "icons/skills/trades/smithing-anvil-silver-red.webp", color: "#b4532a", icon: "fa-solid fa-hammer", kinds: ["weapon", "heavyArmor", "shield"], talent: "sharpen" },
  tailor: { img: "icons/skills/trades/textiles-stitching-leather-brown.webp", color: "#8e3b5e", icon: "fa-solid fa-scissors", kinds: ["lightArmor", "bag"], talent: "mend" },
  artisan: { img: "icons/commodities/treasure/brooch-jewel-gold-blue.webp", color: "#2f7f86", icon: "fa-solid fa-gem", kinds: ["accessory", "charm", "gem"], talent: "cut" },
  alchemist: { img: "icons/tools/laboratory/alembic-glass-ball-blue.webp", color: "#4b7f2a", icon: "fa-solid fa-flask", kinds: ["potion", "toxin"], talent: "batch" },
  cook: { img: "icons/tools/cooking/pot-camping-iron-black.webp", color: "#b8862b", icon: "fa-solid fa-utensils", kinds: ["food"], talent: "banquet" },
  scribe: { img: "icons/skills/trades/academics-scribe-quill-gray.webp", color: "#5a4a8a", icon: "fa-solid fa-feather-pointed", kinds: ["scroll"], talent: "copy" },
  engineer: { img: "icons/weapons/thrown/bomb-timer.webp", color: "#59636e", icon: "fa-solid fa-bomb", kinds: ["gadget"], talent: "trap" },
  bard: { img: "icons/tools/instruments/lute-gold-brown.webp", color: "#a63f6b", icon: "fa-solid fa-music", kinds: ["song"], talent: "masterpiece" },
  gatherer: { img: "icons/skills/trades/mining-pickaxe-yellow-blue.webp", color: "#3f7a4f", icon: "fa-solid fa-person-digging", kinds: [], talent: "gather" },
  merchant: { img: "icons/tools/hand/scale-balances-merchant-brown.webp", color: "#a8841f", icon: "fa-solid fa-scale-balanced", kinds: [], talent: "retouch" }
};
export const PROFESSION_IDS = Object.keys(PROFESSIONS);

/** The talents: used as an action (from the bench, or the trap list of the tab) or always on, and what they spend. */
export const TALENTS = {
  sharpen: { icon: "fa-solid fa-sword", action: true, attempt: true },
  mend: { icon: "fa-solid fa-shirt", action: true, attempt: true },
  cut: { icon: "fa-solid fa-gem" },
  batch: { icon: "fa-solid fa-flask-vial" },
  banquet: { icon: "fa-solid fa-bowl-food", action: true },
  copy: { icon: "fa-solid fa-scroll", action: true, attempt: true },
  trap: { icon: "fa-solid fa-land-mine-on", action: true },
  masterpiece: { icon: "fa-solid fa-star" },
  gather: { icon: "fa-solid fa-person-digging", action: true, attempt: true },
  retouch: { icon: "fa-solid fa-wand-magic-sparkles", action: true, attempt: true }
};

/* -------------------------------------------- */
/*  Rank                                        */
/* -------------------------------------------- */

/** EXP that reaches each Rank (Rank 1 from 0). */
export const RANK_EXP = [0, 20, 40, 80, 160];
export const MAX_RANK = RANK_EXP.length;

/** Rank of an EXP total (1 to 5). */
export const rankOf = exp => Math.max(1, RANK_EXP.filter(n => toInt(exp) >= n).length);
/** Attempts per scenario. */
export const attemptsOf = rank => rank + 1;
/** Highest item level the profession makes. */
export const levelCapOf = rank => rank * 6;
/** Alchemist's Batch: copies of each potion or toxin. */
export const batchOf = rank => (rank >= 5) ? 3 : (rank >= 3) ? 2 : 1;

/* -------------------------------------------- */
/*  Workshop and gathering rolls                */
/* -------------------------------------------- */

/** 2D + Rank: the result of a Workshop attempt. `grade`: Magic Grade of the item; `slots`: its enhancements. */
export const QUALITIES = [
  { id: "fail", min: -Infinity, exp: 1, lose: true },
  { id: "salvage", min: 7, exp: 2 },
  { id: "uncommon", min: 10, exp: 3, grade: 1 },
  { id: "rare", min: 12, exp: 5, grade: 2 },
  { id: "perfect", min: 14, exp: 8, grade: 3 }
];
/** Quality of each Magic Grade (Legendary only comes from a fusion). */
export const GRADE_QUALITY = { 1: "uncommon", 2: "rare", 3: "perfect", 4: "legendary" };
export const LEGENDARY_GRADE = 4;
/** Colors of the qualities (sheet, Workshop, chat). */
export const QUALITY_COLORS = {
  fail: "#a3392f", salvage: "#8a7a62", uncommon: "#3f8a3f", rare: "#2d6db5", perfect: "#8a4cc2", legendary: "#d4861a"
};

const isDoubleSix = dice => (dice[0] === 6) && (dice[1] === 6);

/**
 * The quality of a Workshop roll: two sixes go one step up.
 * @param {number[]} dice   The two dice
 * @param {number} rank
 */
export function craftOutcome(dice, rank) {
  const total = dice[0] + dice[1] + rank;
  let index = QUALITIES.findLastIndex(q => total >= q.min);
  const doubleSix = isDoubleSix(dice);
  if (doubleSix) index = Math.min(index + 1, QUALITIES.length - 1);
  return { ...QUALITIES[index], total, doubleSix };
}

/** Chance of each quality at a Rank, in %. */
export function craftChances(rank) {
  const counts = Object.fromEntries(QUALITIES.map(q => [q.id, 0]));
  for (let a = 1; a <= 6; a++) for (let b = 1; b <= 6; b++) counts[craftOutcome([a, b], rank).id]++;
  return QUALITIES.map(q => ({ id: q.id, pct: (counts[q.id] / 36) * 100 }));
}

/** 2D + Rank of the Gatherer: materials found. Two sixes also find a Quintessence. */
export const GATHER = [
  { id: "none", min: -Infinity, count: 0, exp: 1 },
  { id: "one", min: 8, count: 1, exp: 3 },
  { id: "two", min: 11, count: 2, exp: 5 }
];
export const SHARD_EXP = 8;

export function gatherOutcome(dice, rank) {
  const total = dice[0] + dice[1] + rank;
  const tier = GATHER.findLast(g => total >= g.min);
  const shard = isDoubleSix(dice);
  return { ...tier, total, shard, exp: shard ? SHARD_EXP : tier.exp };
}

/* -------------------------------------------- */
/*  Materials                                   */
/* -------------------------------------------- */

/** Anima-mundi 1 to 10 ([Magic Catalyst N]): its price. */
export const MATERIAL_PRICES = [15, 20, 25, 30, 40, 50, 60, 70, 90, 110];
export const MAX_MATERIAL = MATERIAL_PRICES.length;
/** The Anima-mundi an item of this level takes (10 from level 10 up). */
export const materialLevel = level => Math.clamp(toInt(level), 1, MAX_MATERIAL);
export const materialPrice = level => MATERIAL_PRICES[materialLevel(level) - 1];
/** Level of an Anima-mundi from its tag ("Magic Catalyst 3"), or 0. */
export function catalystLevel(item) {
  for (const tag of item?.system?.tags ?? []) {
    const m = /^magic catalyst (\d+)$/.exec(tagKey(tag));
    if (m) return toInt(m[1]);
  }
  return 0;
}
/** Flag of the Quintessence (flags.eternia.material), named after its 0.4.0 name, Star Shard. */
export const SHARD = "starShard";

/** The numbers of the enhancements double from level 11 and triple from 21. */
export const multiplierOf = level => (toInt(level) > 20) ? 3 : (toInt(level) > 10) ? 2 : 1;

/* -------------------------------------------- */
/*  Kinds of items                              */
/* -------------------------------------------- */

/** Usable items by their tags. */
const USABLE_KINDS = [
  ["charm", ["Charm"]], ["gem", ["Gem"]], ["potion", ["Potion", "Medicine"]], ["toxin", ["Toxin"]],
  ["food", ["Food"]], ["scroll", ["Scroll"]], ["gadget", ["Gadget"]], ["song", ["Song"]]
];

const tagsOf = data => new Set((data?.system?.tags ?? []).map(tagKey));

/**
 * The kind of an item for the professions, or null.
 * @param {Item|object} data   An item or its data
 */
export function kindOf(data) {
  const tags = tagsOf(data);
  switch (data?.type) {
    case "weapon": return "weapon";
    case "armor": return tags.has(tagKey("Light Armor")) ? "lightArmor" : "heavyArmor";
    case "shield": return "shield";
    case "bag": return "bag";
    case "accessory": return "accessory";
    case "usable": return USABLE_KINDS.find(([, list]) => list.some(t => tags.has(tagKey(t))))?.[0] ?? null;
    default: return null;
  }
}

/** Enhancement list of each kind. */
export const CATEGORY = {
  weapon: "weapon", heavyArmor: "protection", lightArmor: "protection", shield: "protection", bag: "bag",
  accessory: "accessory", charm: "consumable", gem: "consumable", potion: "consumable", toxin: "consumable",
  food: "consumable", scroll: "consumable", gadget: "consumable", song: "consumable"
};
export const categoryOf = data => CATEGORY[kindOf(data)] ?? null;

/** Magic items ([M1]…[M7]) and items that can't be sold are not bases for the Workshop. */
export function isPlainItem(data) {
  const tags = tagsOf(data);
  if ([...tags].some(t => /^m\d$/.test(t))) return false;
  if (tags.has(tagKey("Not For Sale")) || tags.has(tagKey("Untradeable"))) return false;
  return !data?.flags?.eternia?.craft;
}

/* -------------------------------------------- */
/*  Enhancements                                */
/* -------------------------------------------- */

/**
 * The enhancements of each list. What each one does:
 *   fields   numbers added to the item's own fields (an item without the field gets an effect on the
 *            matching actor value instead, see FIELD_KEYS)
 *   changes  an Active Effect of the item on these keys (transfers to whoever equips it)
 *   tags     a tag to choose: added to the item (elemental), or the tag of its [Cancel] (resistant)
 *   cancel   a permanent [Cancel] of that value (eternia.passive.cancel)
 *   repeat   may be taken more than once
 *   uncut    the Artisan's Cut doesn't double it
 * Consumables: potent (+5 to what it heals/deals/removes or +1 to its status), copies, timing, wide,
 * purify (statuses it also removes), status (status it also gives).
 */
export const ENHANCEMENTS = {
  weapon: [
    { id: "sharp", icon: "fa-solid fa-sword", fields: { attack: 2 } },
    { id: "runic", icon: "fa-solid fa-wand-sparkles", fields: { magic: 2 } },
    { id: "heavy", icon: "fa-solid fa-weight-hanging", fields: { attack: 4, initiative: -2 } },
    { id: "swift", icon: "fa-solid fa-wind", fields: { initiative: 3 } },
    { id: "true", icon: "fa-solid fa-crosshairs", fields: { accuracy: 1 } },
    { id: "elemental", icon: "fa-solid fa-fire-flame-curved", tags: ["Flame", "Cold", "Shock", "Radiance"] }
  ],
  protection: [
    { id: "reinforced", icon: "fa-solid fa-shield-halved", fields: { pdef: 2 } },
    { id: "enchanted", icon: "fa-solid fa-hat-wizard", fields: { mdef: 2 } },
    { id: "vigorous", icon: "fa-solid fa-heart", changes: { "system.health.effect": 6 } },
    { id: "agile", icon: "fa-solid fa-person-running", changes: { "system.checks.evasion.mod": 1 } },
    { id: "light", icon: "fa-solid fa-feather", fields: { initiative: 2 } },
    { id: "resistant", icon: "fa-solid fa-shield-virus", cancel: 3, tags: ["Flame", "Cold", "Shock", "Radiance", "Blight", "Poison"] }
  ],
  bag: [
    { id: "roomy", icon: "fa-solid fa-sack-xmark", fields: { bagSpace: 2 }, repeat: true }
  ],
  accessory: [
    { id: "lucky", icon: "fa-solid fa-clover", changes: { "eternia.passive.luck": 1 }, uncut: true },
    { id: "vital", icon: "fa-solid fa-heart-pulse", changes: { "system.health.effect": 5 } },
    { id: "restoring", icon: "fa-solid fa-hand-holding-heart", changes: { "system.battle-status.power.restoration.mod": 3 } },
    { id: "arcane", icon: "fa-solid fa-hat-wizard", fields: { magic: 2 } },
    { id: "sage", icon: "fa-solid fa-book-open", changes: { "system.checks.knowledge.mod": 1, "system.checks.analysis.mod": 1 } },
    { id: "explorer", icon: "fa-solid fa-compass", changes: { "system.checks.perception.mod": 1, "system.checks.athletics.mod": 1 } }
  ],
  consumable: [
    { id: "potent", icon: "fa-solid fa-flask-vial", potent: { amount: 5, status: 1 } },
    { id: "double", icon: "fa-solid fa-clone", copies: 1 },
    { id: "quick", icon: "fa-solid fa-bolt", timing: "Minor" },
    { id: "wide", icon: "fa-solid fa-users", wide: 2 },
    { id: "purifying", icon: "fa-solid fa-droplet", purify: ["burning", "poisoned", "freezing"] },
    { id: "invigorating", icon: "fa-solid fa-eye", status: "focused" }
  ]
};

/** The legendary enhancement of a Legendary item, by list (consumables and bags have none). */
export const LEGENDARY = {
  weapon: { id: "fate", icon: "fa-solid fa-dice-d20", legendary: true },
  protection: { id: "aegis", icon: "fa-solid fa-shield", legendary: true },
  accessory: { id: "starheart", icon: "fa-solid fa-star", legendary: true }
};

/** Every enhancement by id. */
export const ENHANCEMENT_INDEX = new Map([
  ...Object.values(ENHANCEMENTS).flat().map(e => [e.id, e]),
  ...Object.values(LEGENDARY).map(e => [e.id, e])
]);

/** The fields of each item type the character's numbers read (actor.mjs): the others go through an effect. */
export const ITEM_FIELDS = {
  weapon: ["attack", "magic", "accuracy", "initiative"],
  armor: ["pdef", "mdef", "initiative"],
  shield: ["pdef", "mdef"],
  accessory: ["pdef", "mdef", "magic", "initiative"],
  bag: ["bagSpace"]
};

/** Actor values of the item fields, for items whose field the character doesn't read (a shield's Initiative). */
export const FIELD_KEYS = {
  attack: "system.battle-status.power.attack.mod",
  magic: "system.battle-status.power.magic.mod",
  accuracy: "system.checks.accuracy.mod",
  initiative: "system.battle-status.initiative.mod",
  pdef: "system.battle-status.defense.phys.mod",
  mdef: "system.battle-status.defense.magic.mod",
  bagSpace: "system.inventory.mod"
};

/** Timings the Quick enhancement turns into a Minor Action. */
export const QUICK_FROM = ["major", "rest time", "interlude", "main process"];
/** Targets the Wide enhancement widens ("Self", "Single", "2 Targets"). */
export const WIDE_TARGET = /^\s*(self|single|(\d+)\s*targets?)\s*$/i;

/** Where the Gatherer's Anima-mundi and the Quintessence are. */
export const ITEMS_PACK = "eternia.items";
