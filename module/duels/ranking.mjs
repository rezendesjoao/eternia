/**
 * The duel ranking: every duel that ended with a result goes into the world's history (the setting `duelHistory`,
 * written by the primary GM), and the standings come out of it, replayed in order: the points (an Elo rating, 1000 at
 * first) move by how surprising the result was (beating someone above you gives more, losing to them costs less) and
 * by the mode (a duel to the death weighs twice a first strike). Voiding a duel takes it out of the history and replays
 * the rest. No Foundry here but the setting's reading in `duelHistory`: the Arena (arena.mjs) and the duels (duels.mjs)
 * share it.
 */
import { SYSTEM_ID, setting } from "../settings.mjs";

export const HISTORY_SETTING = "duelHistory";

/** The points of someone who never dueled. */
export const START_RATING = 1000;
/** How far one duel moves the points, by mode. */
export const K_FACTOR = { strike: 24, half: 32, death: 48 };
/** The titles by points (from the lowest). */
export const TIERS = [
  { id: "aspirant", min: -Infinity },
  { id: "duelist", min: 960 },
  { id: "veteran", min: 1040 },
  { id: "master", min: 1120 },
  { id: "legend", min: 1200 }
];
/** How many results each record keeps for the row's dots. */
const FORM = 5;

/** The chance of `a` beating `b` (0 to 1). */
export const expected = (a, b) => 1 / (1 + (10 ** ((b - a) / 400)));

/**
 * How much one duel moves the points of each side.
 * @param {number} ra       The points of side a before
 * @param {number} rb       Those of side b
 * @param {"a"|"b"|null} winner   null: a draw
 * @param {string} mode
 * @returns {{a: number, b: number}}
 */
export function eloDeltas(ra, rb, winner, mode) {
  const k = K_FACTOR[mode] ?? K_FACTOR.strike;
  const score = (winner === "a") ? 1 : ((winner === "b") ? 0 : 0.5);
  const a = Math.round(k * (score - expected(ra, rb)));
  return { a, b: -a };
}

/** The title of a number of points. */
export const tierOf = rating => [...TIERS].reverse().find(t => rating >= t.min)?.id ?? TIERS[0].id;

/** The duels of the history, oldest first. */
export function duelHistory() {
  const list = setting(HISTORY_SETTING);
  return Array.isArray(list) ? list.filter(d => d?.id && d.a?.key && d.b?.key) : [];
}

/**
 * The standings, replaying the history in order.
 * @param {object[]} [history]
 * @returns {{records: object[], deltas: Map<string, {a: number, b: number, ra: number, rb: number}>}}
 *   records: one per duelist, best first ({ key, name, img, rating, wins, losses, draws, duels, streak, best,
 *   deathWins, form, lastAt, rank }); deltas: what each duel gave, by its id
 */
export function standings(history = duelHistory()) {
  const records = new Map();
  const deltas = new Map();
  const recordOf = side => {
    if (!records.has(side.key)) {
      records.set(side.key, { key: side.key, name: side.name, img: side.img, rating: START_RATING, wins: 0, losses: 0, draws: 0,
        duels: 0, streak: 0, best: 0, deathWins: 0, form: [], lastAt: 0 });
    }
    const record = records.get(side.key);
    // The name and the picture of the latest duel
    if (side.name) record.name = side.name;
    if (side.img) record.img = side.img;
    return record;
  };
  for (const duel of [...history].sort((x, y) => (x.at ?? 0) - (y.at ?? 0))) {
    const a = recordOf(duel.a);
    const b = recordOf(duel.b);
    const winner = ["a", "b"].includes(duel.winner) ? duel.winner : null;
    const change = eloDeltas(a.rating, b.rating, winner, duel.mode);
    deltas.set(duel.id, { ...change, ra: a.rating + change.a, rb: b.rating + change.b });
    a.rating += change.a;
    b.rating += change.b;
    for (const [record, side] of [[a, "a"], [b, "b"]]) {
      record.duels += 1;
      record.lastAt = Math.max(record.lastAt, duel.at ?? 0);
      const result = !winner ? "draw" : ((winner === side) ? "win" : "loss");
      if (result === "win") {
        record.wins += 1;
        record.streak = Math.max(0, record.streak) + 1;
        record.best = Math.max(record.best, record.streak);
        if (duel.mode === "death") record.deathWins += 1;
      }
      else if (result === "loss") {
        record.losses += 1;
        record.streak = Math.min(0, record.streak) - 1;
      }
      else {
        record.draws += 1;
        record.streak = 0;
      }
      record.form = [...record.form, result].slice(-FORM);
    }
  }
  const sorted = [...records.values()].sort((x, y) => (y.rating - x.rating) || (y.wins - x.wins) || (x.losses - y.losses)
    || String(x.name).localeCompare(String(y.name)));
  sorted.forEach((record, i) => record.rank = i + 1);
  return { records: sorted, deltas };
}

/** The points of a duelist now (its key: the actor's uuid). */
export function ratingOf(key, history = duelHistory()) {
  return standings(history).records.find(r => r.key === key)?.rating ?? START_RATING;
}

/** Add a duel to the history (the primary GM). Returns what it gave each side. */
export async function recordDuel(entry) {
  const history = [...duelHistory(), entry];
  await game.settings.set(SYSTEM_ID, HISTORY_SETTING, history);
  return standings(history).deltas.get(entry.id) ?? { a: 0, b: 0, ra: START_RATING, rb: START_RATING };
}

/** Take a duel out of the history (the GM): the standings are replayed without it. */
export async function voidDuel(id) {
  await game.settings.set(SYSTEM_ID, HISTORY_SETTING, duelHistory().filter(d => d.id !== id));
}

/** Empty the history (the GM). */
export async function resetRanking() {
  await game.settings.set(SYSTEM_ID, HISTORY_SETTING, []);
}
