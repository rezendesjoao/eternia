/**
 * A character's profession and its progress: EXP, Rank and the attempts of its current scenario, kept per
 * profession in `flags.eternia.professions.<id> = { exp, used, scenario }`. The attempts count in the character's
 * scenario (automation/scenes.mjs): ending the scenario in the GM tools gives them back. Changing the Subclass and
 * coming back to a profession keeps its EXP.
 */
import { L, SYSTEM_ID } from "../settings.mjs";
import { counter } from "../automation/scenes.mjs";
import { actorName, escape, toInt } from "../helpers/utils.mjs";
import {
  ITEMS_PACK, MAX_RANK, PROFESSIONS, RANK_EXP, SHARD, attemptsOf, catalystLevel, levelCapOf, materialLevel, rankOf
} from "./data.mjs";

/** The Subclass item of an actor that is a profession, or null. */
export function professionItem(actor) {
  return actor?.items?.find(i => (i.type === "subclass") && PROFESSIONS[i.system.identifier]) ?? null;
}

/**
 * The profession of a character, with its progress.
 * @param {Actor} actor
 * @returns {{id: string, item: Item, def: object, name: string, exp: number, rank: number, next: number|null,
 *   attempts: {max: number, used: number, left: number}, cap: number}|null}
 */
export function professionOf(actor) {
  const item = professionItem(actor);
  if (!item) return null;
  const id = item.system.identifier;
  const state = actor.getFlag(SYSTEM_ID, "professions")?.[id] ?? {};
  const exp = Math.max(0, toInt(state.exp));
  const rank = rankOf(exp);
  const max = attemptsOf(rank);
  const used = (toInt(state.scenario) === counter(actor, "scenario")) ? Math.max(0, toInt(state.used)) : 0;
  return {
    id, item, def: PROFESSIONS[id], name: item.name, exp, rank,
    next: (rank < MAX_RANK) ? RANK_EXP[rank] : null,
    attempts: { max, used, left: Math.max(0, max - used) },
    cap: levelCapOf(rank)
  };
}

/** Localized title of a Rank ("Aprendiz"). */
export const rankTitle = rank => L(`Profession.RankTitle.${rank}`);

/**
 * Record what an attempt (or any profession action) gave: EXP, and one attempt spent. Announces a new Rank.
 * @param {Actor} actor
 * @param {object} [options]
 * @param {number} [options.exp]       EXP gained
 * @param {boolean} [options.attempt]  Spend an attempt
 * @returns {Promise<{exp: number, rank: number, rankUp: boolean}>}
 */
export async function record(actor, { exp = 0, attempt = false } = {}) {
  const p = professionOf(actor);
  if (!p) return { exp: 0, rank: 0, rankUp: false };
  const after = Math.max(0, p.exp + toInt(exp));
  const update = { exp: after };
  if (attempt) Object.assign(update, { used: p.attempts.used + 1, scenario: counter(actor, "scenario") });
  await actor.update({ [`flags.${SYSTEM_ID}.professions.${p.id}`]: update });
  const rank = rankOf(after);
  const rankUp = rank > p.rank;
  if (rankUp) await announceRank(actor, p, rank);
  return { exp: after, rank, rankUp };
}

/** Set the EXP of the character's profession (sheet). */
export async function setExp(actor, exp) {
  const p = professionOf(actor);
  if (!p) return;
  const after = Math.max(0, toInt(exp));
  await actor.update({ [`flags.${SYSTEM_ID}.professions.${p.id}.exp`]: after });
  if (rankOf(after) > p.rank) await announceRank(actor, p, rankOf(after));
}

/** Give back one attempt of the current scenario (GM, sheet). */
export async function refundAttempt(actor) {
  const p = professionOf(actor);
  if (!p?.attempts.used) return;
  await actor.update({ [`flags.${SYSTEM_ID}.professions.${p.id}`]: { used: p.attempts.used - 1, scenario: counter(actor, "scenario") } });
}

/** Characters that just reached a new Rank: their sheet celebrates on its next render. */
export const freshRanks = new Set();

/** A chat card for a new Rank: what it gives now. */
async function announceRank(actor, p, rank) {
  freshRanks.add(actor.id);
  const lines = [
    L("Profession.Chat.RankBonus", { n: rank }),
    L("Profession.Chat.RankAttempts", { n: attemptsOf(rank) })
  ];
  if (p.def.kinds.length) lines.push(L("Profession.Chat.RankCap", { n: levelCapOf(rank) }));
  if ((p.id === "alchemist") && [3, 5].includes(rank)) lines.push(L("Profession.Chat.RankBatch", { n: (rank >= 5) ? 3 : 2 }));
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content: `<div class="eternia chat-card lhauto-card lhp-card lhp-rankup" style="--lhp-color: ${p.def.color}">
      <header class="lhp-card-head"><img src="${escape(p.def.img)}" alt="">
        <div><h3>${escape(L("Profession.Chat.RankUp", { name: actorName(actor), rank }))}</h3>
        <span>${escape(`${p.name} · ${rankTitle(rank)}`)}</span></div></header>
      <ul>${lines.map(l => `<li>${escape(l)}</li>`).join("")}</ul>
    </div>`
  });
}

/* -------------------------------------------- */
/*  Materials                                   */
/* -------------------------------------------- */

/**
 * The Item Misterioso (by level) and Star Shards an actor carries.
 * @param {Actor} actor
 * @returns {{levels: Map<number, Item[]>, shards: Item[]}}
 */
export function materialsOf(actor) {
  const levels = new Map();
  const shards = [];
  for (const item of actor?.items ?? []) {
    if (item.getFlag(SYSTEM_ID, "material") === SHARD) shards.push(item);
    const level = catalystLevel(item);
    if (!level) continue;
    if (!levels.has(level)) levels.set(level, []);
    levels.get(level).push(item);
  }
  return { levels, shards };
}

/** One Item Misterioso of the level an item of this level takes, or null. */
export function materialFor(actor, level) {
  return materialsOf(actor).levels.get(materialLevel(level))?.[0] ?? null;
}

/** Index of the system's item compendium, with what finds the materials. */
let packIndex = null;
async function itemsIndex() {
  const pack = game.packs.get(ITEMS_PACK);
  if (!pack) return null;
  packIndex ??= await pack.getIndex({ fields: ["system.tags", `flags.${SYSTEM_ID}.material`] });
  return { pack, index: packIndex };
}

/** Data of a compendium item found by a test on its index entry (null if missing). */
async function compendiumData(test) {
  const found = await itemsIndex();
  const entry = found?.index.find(test);
  const doc = entry ? await found.pack.getDocument(entry._id) : null;
  if (!doc) return null;
  const data = game.items.fromCompendium(doc);
  foundry.utils.setProperty(data, "_stats.compendiumSource", doc.uuid);
  return data;
}

/** Data of an Item Misterioso N. */
export const materialData = level => compendiumData(e => (e.type === "gear")
  && catalystLevel(e) === materialLevel(level));

/** Data of a Star Shard. */
export const shardData = () => compendiumData(e => foundry.utils.getProperty(e, `flags.${SYSTEM_ID}.material`) === SHARD);

/**
 * Give an actor copies of an item.
 * @param {Actor} actor
 * @param {object|null} data
 * @param {number} count
 * @returns {Promise<Item[]>}
 */
export async function giveCopies(actor, data, count) {
  if (!data || (count < 1)) return [];
  return actor.createEmbeddedDocuments("Item", Array.from({ length: count }, () => foundry.utils.deepClone(data)));
}
