/**
 * The experience (docs/matematica.md, section 10): the XP table of the NP, what each monster gives, how a party shares
 * it, the Evolution Ticket and the boosts. Pure numbers, no Foundry: the award, the sheets, the named beast's template
 * and the simulator (Eternia-Balanceamento/simulador, xp-*.mjs) read them from here.
 *
 * The unit is the common, as in the economy (economy/data.mjs): a common monster of an NP gives 10 × (NP + 4) XP (50 at
 * NP 1, 140 at NP 10), and an NP takes NP + 5 of them for one character alone (6 at NP 1: the user's anchor, "NP 2 is
 * at least 6 monsters of NP 1"). So the XP from an NP to the next is 10 × (NP + 4) × (NP + 5): 300 at NP 1, 2,100 at
 * NP 10. A monster gives what it weighs in an encounter, as its drops do: a mob ⅔ of a common, a common that comes 3 to
 * an encounter 4/3, a troop 2, a group boss 4, a solo boss 6; a Rift pays its scene (1, 2 or 3 encounters).
 */

/** The highest NP the table reaches. */
export const MAX_RANK = 30;

/** The most characters a party holds (as the floating castle's: six). */
export const MAX_PARTY = 6;

const rankOf = np => Math.min(MAX_RANK, Math.max(1, Math.trunc(Number(np) || 1)));

/** The XP of a common monster of an NP: 50 at NP 1, 140 at NP 10, 240 at NP 20. */
export const commonXp = np => 10 * (rankOf(np) + 4);

/** How many commons of its NP one character alone fells to reach the next NP: 6 at NP 1, 15 at NP 10. */
export const commonsPerRank = np => rankOf(np) + 5;

/** The XP from an NP to the next: 300 at NP 1, 900 at NP 5, 2,100 at NP 10. */
export const xpToNext = np => commonXp(np) * commonsPerRank(np);

/** The total XP that reaches each NP (index = NP; 0 at NP 1, 300 at NP 2, 8,700 at NP 10). */
export const XP_TABLE = (() => {
  const table = [0, 0];
  for (let np = 1; np < MAX_RANK; np++) table[np + 1] = table[np] + xpToNext(np);
  return table;
})();

/** The total XP an NP starts at. */
export const xpForRank = np => XP_TABLE[rankOf(np)];

/** The NP a total of XP reaches. */
export function rankForXp(xp) {
  const total = Math.max(0, Number(xp) || 0);
  let np = 1;
  while ((np < MAX_RANK) && (XP_TABLE[np + 1] <= total)) np++;
  return np;
}

/**
 * Where a total of XP stands in its NP: the NP, the XP gained in it, the XP it takes and the share (0 to 1).
 * @param {number} xp
 * @returns {{rank: number, into: number, need: number, pct: number, next: number|null, max: boolean}}
 */
export function xpProgress(xp) {
  const total = Math.max(0, Math.trunc(Number(xp) || 0));
  const rank = rankForXp(total);
  if (rank >= MAX_RANK) return { rank, into: 0, need: 0, pct: 1, next: null, max: true };
  const into = total - XP_TABLE[rank];
  const need = xpToNext(rank);
  return { rank, into, need, pct: Math.min(1, into / need), next: XP_TABLE[rank + 1], max: false };
}

/* -------------------------------------------- */
/*  What a monster gives                        */
/* -------------------------------------------- */

/** The commons a boss weighs (the economy's boss table: 4 for a group boss, 6 for a solo boss, its whole encounter). */
export const BOSS_WEIGHT = { boss: 4, solo: 6 };

/** The encounters a Rift's scene is worth (the economy's: the Small 1, the Great 2, the Mother 3). */
export const RIFT_ENCOUNTERS = { small: 1, great: 2, mother: 3 };

/**
 * The XP of a monster by its kind and by how many of it make an encounter for 4 characters (the same weights as its
 * drops, economy/data.mjs monsterValue): an encounter is worth 4 commons whatever fills it.
 * @param {number} np
 * @param {object} [options]
 * @param {"mob"|"common"|"boss"|"solo"} [options.kind]
 * @param {number} [options.perEncounter]   6 mobs or 4 commons by default; 3 for the stronger commons, 2 for a troop
 * @param {number} [options.encounters]     A whole scene (a Rift): that many encounters
 * @returns {number}
 */
export function monsterXpValue(np, { kind = "common", perEncounter, encounters } = {}) {
  const common = commonXp(np);
  if (encounters) return Math.round(4 * common * encounters);
  if (kind in BOSS_WEIGHT) return Math.round(BOSS_WEIGHT[kind] * common);
  const per = Math.max(1, Number(perEncounter) || ((kind === "mob") ? 6 : 4));
  return Math.round((4 * common) / per);
}

/* -------------------------------------------- */
/*  Who gets it                                 */
/* -------------------------------------------- */

/**
 * What the difference between the monster's NP and the character's does to the XP: +20% for each NP above (up to
 * +50%), −20% for one below, half for two, a fifth for three, and nothing from four below on (the monster has nothing
 * left to teach).
 */
export const LEVEL_FACTORS = { "-3": 0.2, "-2": 0.5, "-1": 0.8, 0: 1, 1: 1.2, 2: 1.4, 3: 1.5 };

/**
 * The factor of a difference (the monster's NP − the character's).
 * @param {number} diff
 * @returns {number}
 */
export function levelFactor(diff) {
  const d = Math.trunc(Number(diff) || 0);
  if (d <= -4) return 0;
  return LEVEL_FACTORS[Math.min(3, d)];
}

/** The party's bonus: +10% for each member past the first (+50% for six). */
export const partyBonus = n => 1 + (0.1 * (Math.min(MAX_PARTY, Math.max(1, Math.trunc(Number(n) || 1))) - 1));

/**
 * How the XP of a monster is shared: with the party's bonus, by the NP of each one (who has more NP takes a bigger
 * part), each part times the factor of its own difference. One character alone takes it all, times its factor.
 * @param {number} base          The monster's XP
 * @param {number} monsterRank   The monster's NP
 * @param {{id: string, rank: number}[]} members   Who shares it (the feller alone, or the party there)
 * @param {object} [options]
 * @param {number} [options.bonusCount]   The count the bonus reads (a boss shared by everyone of its fight: up to six)
 * @returns {{id: string, rank: number, weight: number, factor: number, xp: number}[]}
 */
export function shareXp(base, monsterRank, members, { bonusCount } = {}) {
  const list = (members ?? []).filter(Boolean);
  const value = Math.max(0, Number(base) || 0);
  if (!list.length || !value) return [];
  const pot = value * partyBonus(bonusCount ?? list.length);
  const total = list.reduce((sum, m) => sum + rankOf(m.rank), 0);
  return list.map(m => {
    const weight = rankOf(m.rank) / total;
    const factor = levelFactor(rankOf(monsterRank) - rankOf(m.rank));
    return { ...m, weight, factor, xp: Math.round(pot * weight * factor) };
  });
}

/* -------------------------------------------- */
/*  The ticket and the boosts                   */
/* -------------------------------------------- */

/** The XP of an Evolution Ticket (Tíquete de Evolução), whatever the NP: a third of NP 1, a twentieth of NP 10. */
export const TICKET_XP = 100;

/** What an Evolution Ticket is worth in Yuld (a shop pays it in full: it is a [Valioso]). */
export const TICKET_PRICE = 100;

/**
 * The boosts: +pct% of the XP that the next `count` monsters give. One of each kind at a time (a new one takes the old
 * one's place); a potion and a food add up.
 */
export const BOOST_KINDS = ["potion", "food"];

/**
 * A round price: steps of 5 below 200, of 10 below 2,000, of 50 below 20,000 and of 100 above (economy/data.mjs nice).
 * @param {number} value
 */
const nice = value => {
  const v = Math.max(0, Number(value) || 0);
  const step = (v < 200) ? 5 : (v < 2000) ? 10 : (v < 20000) ? 50 : 100;
  return Math.max(v > 0 ? step : 0, Math.round(v / step) * step);
};

/**
 * What a boost costs: twice the XP it adds to one character alone fighting monsters of its level, a Yuld for each XP
 * (the Ticket's rate). Dear on purpose: the time it saves is the luxury.
 * @param {number} level   The item's level
 * @param {number} pct
 * @param {number} count
 */
export const boostPrice = (level, pct, count) => nice(2 * (pct / 100) * count * commonXp(level));
