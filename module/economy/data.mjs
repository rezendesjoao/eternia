/**
 * The economy (docs/matematica.md, section 9): one unit, what a common monster of each NP leaves, and every price,
 * drop and reward measured in it. The anchor is the user's: an Anima-mundi 1 is bought with what 2 commons of NP 1
 * leave. Pure numbers, no Foundry: the bestiary's drops, the named beast, the professions, the creation wizard, the
 * shops and the economy's simulator (Eternia-Balanceamento/simulador, economia-*.mjs) read them from here.
 *
 * The currency is the Yuld. In the data it is still the gold field (system.inventory.gold of a character,
 * system.gold of a pile, the `gold` of a drop row): only the name on screen changed, in 0.48.
 */

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

/**
 * A round price: steps of 5 below 200, of 10 below 2,000, of 50 below 20,000 and of 100 above.
 * @param {number} value
 * @returns {number}
 */
export function nice(value) {
  const v = Math.max(0, Number(value) || 0);
  const step = (v < 200) ? 5 : (v < 2000) ? 10 : (v < 20000) ? 50 : 100;
  return Math.max(v > 0 ? step : 0, Math.round(v / step) * step);
}

/** What a common monster of an NP leaves, at full price, in Yuld: 25 at NP 1, 56 at NP 5, 128.5 at NP 10. */
export const commonValue = np => ((3 * np * np) + (13 * np) + 84) / 4;

/** A standard encounter (4 commons, 6 mobs, or the creatures that weigh as much). */
export const encounterValue = np => 4 * commonValue(np);

/** The highest Anima-mundi there is (the named items' recipes cite catalysts above it). */
export const MAX_ANIMA = 10;

/**
 * A boss's table on the 1d6, in commons of its NP, as the Guide of enemies has it (Passo 6): 4 for a group boss, 6 for
 * a solo boss (its whole encounter); besides it, an Anima-mundi of its NP + 1 and a [Material-Base] of its NP, fixed.
 */
export const BOSS_TABLE = { boss: 4, solo: 6 };

/**
 * What a monster leaves, by its kind and by how many of it make an encounter for 4 characters (XIV.g, O PESO DOS
 * ENCONTROS): the encounter is worth the same whatever fills it, and a boss is worth its table and its two fixed rows.
 * @param {number} np
 * @param {object} [options]
 * @param {"mob"|"common"|"boss"|"solo"} [options.kind]
 * @param {number} [options.perEncounter]   6 mobs or 4 commons by default; 3 for the stronger commons, 2 for a troop
 * @returns {number}
 */
export function monsterValue(np, { kind = "common", perEncounter } = {}) {
  if ((kind === "boss") || (kind === "solo")) {
    return (BOSS_TABLE[kind] * commonValue(np)) + animaPrice(Math.min(np + 1, MAX_ANIMA)) + materialPrice(np);
  }
  return encounterValue(np) / Math.max(1, perEncounter ?? ((kind === "mob") ? 6 : 4));
}

/**
 * The Anima-mundi of a level: (2 + 0.1 × (level − 1)) commons of its NP. 50 Yuld at level 1 (the anchor), 370 at 10.
 * @param {number} level
 * @returns {number}
 */
export const animaPrice = level => {
  const l = Math.max(1, Math.trunc(Number(level) || 1));
  return nice(commonValue(l) * (2 + (0.1 * (l - 1))));
};

/** A [Material-Base] of a level: 1.5 commons of its NP (a boss leaves one of its own NP, fixed). */
export const materialPrice = level => nice(1.5 * commonValue(Math.max(1, Math.trunc(Number(level) || 1))));

/** The Quintessence: the price of 3 Anima-mundi 10. */
export const QUINTESSENCE_PRICE = nice(3 * animaPrice(MAX_ANIMA));

/**
 * The items' prices: the book's (Log Horizon, in G) twice over. The Anima-mundi went further (15 G to 50 Yuld, the
 * anchor): it is dearer than the gear than it was in the book. With 10/3 for the gear too, the drops would pay a sixth of
 * what keeping the balance's gear costs, and farming would stop being a way (docs/matematica.md, section 9).
 */
export const PRICE_RATE = 2;

/** The Yuld a character starts with (the template's): the dearest kit of a class costs it at most (KITS). */
export const START_YULD = 700;

/**
 * What a shop pays for an item, as a share of its price (AS REGRAS V.e): treasures to sell ([Valioso],
 * [Material-Base]) in full; magic items ([M1]–[M7]) and the Anima-mundi and the Quintessence by half; everything else
 * (used gear, consumables) by a tenth, or by the shop's own rate. The Merchant sells everything in full.
 */
export const RESALE = { treasure: 1, magic: 0.5, material: 0.5, other: 0.1 };

/**
 * The flag of an Anima-mundi without the Seal of the Anima (`flags.eternia.unsealed`): what the Gatherer finds and the
 * monsters' parts that serve as one. The Oficina takes it; no shop buys it (only the Office sells the sealed one).
 */
export const UNSEALED = "unsealed";

/**
 * The share of its price a shop pays for an item (RESALE).
 * @param {object} data            The item or its data (its tags and flags)
 * @param {number} [shopRate]      The shop's rate for the rest (its sellMultiplier); it never pays less for the others
 * @returns {number}
 */
export function saleRate(data, shopRate = RESALE.other) {
  const tags = (data?.system?.tags ?? []).map(t => String(t).trim().toLowerCase());
  const flags = data?.flags?.eternia ?? {};
  const other = Math.max(0, Number(shopRate) || 0);
  if (flags[UNSEALED]) return 0;
  if (tags.includes("valuable") || tags.includes("core material")) return Math.max(RESALE.treasure, other);
  if (tags.some(t => /^m[1-7]$/.test(t))) return Math.max(RESALE.magic, other);
  if (tags.some(t => /^magic catalyst \d+$/.test(t)) || (flags.material === "starShard")) return Math.max(RESALE.material, other);
  return other;
}

/**
 * The missions' reward, for each character, in commons of the NP (the GM's table, AS REGRAS V.e): a small one (an
 * errand, a short escort), the standard one (one for each NP the party gains: it keeps the gear of the party at its NP,
 * with the drops of 3 encounters), a big one (a boss, a dungeon) and an epic one (the end of an arc).
 */
export const MISSIONS = { small: 4, standard: 12, big: 24, epic: 48 };
export const MISSION_SIZES = Object.keys(MISSIONS);

/** A mission's reward for each character, in Yuld. */
export const missionReward = (np, size = "standard") => nice((MISSIONS[size] ?? MISSIONS.standard) * commonValue(np));

/** The Merchant's Retouch: 2 Anima-mundi of the item's level (10 at most), doubling with each retouch of the item. */
export const retouchCost = (level, retouches = 0) =>
  2 * animaPrice(clamp(Math.trunc(Number(level) || 1), 1, MAX_ANIMA)) * (2 ** Math.max(0, Math.trunc(Number(retouches) || 0)));

/** A monster's offer to be let go (the rule `offer`): half of what it leaves, so the choice weighs. */
export const OFFER_SHARE = 0.5;

/**
 * The phrases of the texts (the bestiary's, AS REGRAS) where the gold was the currency, and the Yuld in its place: the
 * compendium was rewritten with them in 0.48, and the economy's migration rewrites the copies the worlds have. The gold
 * that is a metal (a gold ring, the buried gold of a tomb) stays.
 */
export const CURRENCY_TEXT = [
  ["] de ouro da bolsa", "] Yuld da bolsa"], ["] de ouro para ser deixado ir", "] Yuld para ser deixado ir"],
  ["rouba ouro", "rouba Yuld"], ["tira ouro da bolsa", "tira Yuld da bolsa"], ["oferece ouro para", "oferece Yuld para"],
  ["O ouro roubado", "O Yuld roubado"], ["o ouro roubado", "o Yuld roubado"], ["O ouro volta", "O Yuld volta"],
  ["o ouro volta", "o Yuld volta"], ["aceita o ouro", "aceita o Yuld"], ["o ouro vai para quem aceitou", "o Yuld vai para quem aceitou"],
  ["e o Mestre descreve o ouro", "e o Mestre descreve as moedas"], ["vendidas, dão ouro", "vendidas, dão Yuld"],
  ["a pagam em ouro", "a pagam em Yuld"], ["e todo o ouro", "e todo o Yuld"], ["o que veio, o ouro e", "o que veio, o Yuld e"],
  ["Uma linha pode ser de ouro", "Uma linha pode ser de Yuld"], ["Aceita, o ouro vai", "Aceita, o Yuld vai"],
  ["punhado de Shia", "punhado de Yuld"]
];

/** The Gatherer finds Anima-mundi up to the character's NP (and the profession's cap): no level-6 vein at NP 1. */
export const gatherLevelCap = (np, cap) => clamp(Math.min(Math.trunc(Number(np) || 1), Math.trunc(Number(cap) || 1)), 1, MAX_ANIMA);
