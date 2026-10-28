/**
 * What a character does with its profession, each with its chat card: a Workshop attempt and the finished work, a
 * Fusion, a Retouch, a Gathering, a sale, and the talents used as an action (Sharpen, Mend, Banquet, Copy).
 * Every function checks what it needs and warns (and returns null) when something is missing.
 */
import { L, SYSTEM_ID } from "../settings.mjs";
import { counter } from "../automation/scenes.mjs";
import { request } from "../piles/pile-socket.mjs";
import { actorName, escape, toInt } from "../helpers/utils.mjs";
import {
  ENHANCEMENT_INDEX, GRADE_QUALITY, LEGENDARY, LEGENDARY_GRADE, MAX_MATERIAL, QUALITY_COLORS, batchOf, craftOutcome,
  gatherOutcome, isPlainItem, kindOf, materialLevel, multiplierOf
} from "./data.mjs";
import {
  baseData, banquetFrom, buildCrafted, copiableSkills, craftOf, defaultName, enhancementText, enhancementsFor,
  fusionKey, scrollFromSkill, unavailableReason
} from "./forge.mjs";
import { giveCopies, materialData, materialFor, materialsOf, professionOf, record, shardData } from "./state.mjs";
import { UNSEALED, gatherLevelCap, retouchCost as retouchPrice } from "../economy/data.mjs";

const CHAT_CARD = `systems/${SYSTEM_ID}/templates/professions/chat-card.hbs`;
/** Flag of a crafting attempt waiting for its enhancements. */
export const PENDING = "craftPending";
/** The Retouch: 2 Anima-mundi of the item's level, doubling with each one the item already had (economy/data.mjs). */
export const retouchCost = craft => retouchPrice(toInt(craft?.base?.system?.rank) || 1, toInt(craft?.retouches));
/** EXP of the actions that aren't a Workshop roll. */
export const EXP = { retouch: 5, copy: 2, sale: 2 };

const warn = (key, data) => {
  ui.notifications.warn(L(key, data));
  return null;
};

/* -------------------------------------------- */
/*  Chat cards                                  */
/* -------------------------------------------- */

/**
 * Post a profession card.
 * @param {Actor} actor
 * @param {object} p                    professionOf(actor)
 * @param {object} data
 * @param {string} data.title
 * @param {number[]} [data.dice]        The two dice of a roll
 * @param {number} [data.total]
 * @param {string} [data.quality]       A quality id (data.mjs)
 * @param {string} [data.qualityLabel]
 * @param {Item[]} [data.items]         Items made, shown with their link
 * @param {string[]} [data.lines]
 * @param {number} [data.exp]
 * @param {Roll} [data.roll]
 * @param {string[]} [data.whisper]   User ids (a trap is armed in secret)
 */
export async function postCard(actor, p, { title, dice, total, quality, qualityLabel, items = [], lines = [], exp = 0, roll = null, whisper = null }) {
  const after = professionOf(actor) ?? p;
  const content = await foundry.applications.handlebars.renderTemplate(CHAT_CARD, {
    color: p.def.color, img: p.def.img, title,
    subtitle: `${actorName(actor)} · ${p.name} ${L("Profession.RankShort", { n: after.rank })}`,
    dice, rank: p.rank, total,
    quality, qualityLabel, qualityColor: quality ? QUALITY_COLORS[quality] : null,
    items: items.map(item => ({
      uuid: item.uuid, name: item.name, img: item.img, link: `@UUID[${item.uuid}]{${item.name}}`,
      enhancements: (craftOf(item)?.enhancements ?? []).map(e => ENHANCEMENT_INDEX.get(e.id))
        .filter(Boolean).map(def => ({ icon: def.icon, legendary: !!def.legendary }))
    })),
    lines,
    footer: [
      exp ? L("Profession.Chat.Exp", { n: exp }) : "",
      after.def.kinds.length || ["gatherer", "merchant"].includes(after.id) ? L("Profession.Chat.Left", { n: after.attempts.left, max: after.attempts.max }) : ""
    ].filter(Boolean).join(" · ")
  });
  // The flag keeps the system's Fate reroll off these rolls (automation/fate.mjs): the work is already decided.
  const messageData = { speaker: ChatMessage.getSpeaker({ actor }), content, flags: { [SYSTEM_ID]: { profession: p.id } } };
  if (roll) Object.assign(messageData, { rolls: [roll], sound: CONFIG.sounds.dice });
  if (whisper) messageData.whisper = whisper;
  return ChatMessage.create(messageData);
}

/** Two dice plus the Rank. */
async function rollDice(rank) {
  const roll = await new Roll("2d6 + @rank", { rank }).evaluate();
  return { roll, dice: roll.dice[0].results.map(r => r.result) };
}

const qualityName = id => L(`Profession.Quality.${id}`);

/* -------------------------------------------- */
/*  Workshop                                    */
/* -------------------------------------------- */

/**
 * Why a base item can't be made by this character now (a localization key and its data), or null.
 * @param {Actor} actor
 * @param {Item|object} base   A compendium or world item, or one of the actor's
 * @param {"inventory"|"catalog"} from
 */
export function craftProblem(actor, base, from) {
  const p = professionOf(actor);
  if (!p) return { key: "Profession.Error.NoProfession" };
  if (!p.def.kinds.includes(kindOf(base)) || !isPlainItem(base)) return { key: "Profession.Error.NotYours" };
  const level = Math.max(1, toInt(base.system?.rank));
  if (level > p.cap) return { key: "Profession.Error.Cap", data: { n: p.cap, rank: Math.ceil(level / 6) } };
  if (!p.attempts.left) return { key: "Profession.Error.NoAttempts" };
  if (actor.getFlag(SYSTEM_ID, PENDING)) return { key: "Profession.Error.Pending" };
  if (!materialFor(actor, level)) return { key: "Profession.Error.NoMaterial", data: { n: materialLevel(level) } };
  if ((from === "catalog") && (toInt(actor.system.inventory?.gold) < toInt(base.system?.price))) {
    return { key: "Profession.Error.Gold", data: { n: toInt(base.system?.price) } };
  }
  return null;
}

/**
 * One attempt at the Workshop: spends the material (not on a Salvage), rolls 2D + Rank, and on a success keeps the
 * work waiting for its enhancements (flags.eternia.craftPending). The base is the actor's own item (it becomes the
 * work) or one of the catalog (its price is paid).
 * @param {Actor} actor
 * @param {Item} base
 * @param {"inventory"|"catalog"} from
 * @returns {Promise<{outcome: object, dice: number[], exp: number, rankUp: boolean, pending: object|null}|null>}
 */
export async function craftAttempt(actor, base, from) {
  const problem = craftProblem(actor, base, from);
  if (problem) return warn(problem.key, problem.data);
  const p = professionOf(actor);
  const level = Math.max(1, toInt(base.system.rank));
  const material = materialFor(actor, level);
  const { roll, dice } = await rollDice(p.rank);
  const outcome = craftOutcome(dice, p.rank);

  if (outcome.lose || outcome.grade) await material.delete();
  let pending = null;
  if (outcome.grade) {
    pending = {
      profession: p.id, base: baseData(base), from, grade: outcome.grade, quality: outcome.id, slots: outcome.grade,
      dice, total: outcome.total, doubleSix: outcome.doubleSix, rank: p.rank,
      copies: ["potion", "toxin"].includes(kindOf(base)) ? batchOf(p.rank) : 1,
      // A base the character had equipped: the work takes its place.
      equipped: (from === "inventory") && !!base.system.equipped,
      main: (from === "inventory") && !!base.system.main
    };
    if (from === "inventory") await base.delete();
    else if (toInt(base.system.price)) {
      await actor.update({ "system.inventory.gold": Math.max(0, toInt(actor.system.inventory?.gold) - toInt(base.system.price)) });
    }
    await actor.setFlag(SYSTEM_ID, PENDING, pending);
  }
  const done = await record(actor, { exp: outcome.exp, attempt: true });

  const lines = [L(`Profession.Chat.Outcome.${outcome.id}`, { item: base.name, n: materialLevel(level) })];
  if (outcome.doubleSix) lines.push(L("Profession.Chat.DoubleSix"));
  if (pending && (from === "catalog") && toInt(base.system.price)) lines.push(L("Profession.Chat.Paid", { n: toInt(base.system.price) }));
  await postCard(actor, p, {
    title: L("Profession.Chat.Workshop", { item: base.name }), dice, total: outcome.total,
    quality: outcome.id, qualityLabel: outcome.grade ? `${qualityName(outcome.id)} [M${outcome.grade}]` : qualityName(outcome.id),
    lines, exp: outcome.exp, roll
  });
  return { outcome, dice, exp: outcome.exp, rankUp: done.rankUp, pending };
}

/** The work waiting for its enhancements, or null. */
export const pendingOf = actor => actor?.getFlag(SYSTEM_ID, PENDING) ?? null;

/**
 * Check a list of enhancement picks for an item: as many as `slots`, from its list, each once (unless it repeats),
 * usable on it, with a valid tag, at most one cut (Artisan, accessories). Returns a localization key, or null.
 * @param {object} base     The base item's data
 * @param {object[]} picks
 * @param {object} [options]
 * @param {number} [options.slots]
 * @param {boolean} [options.canCut]
 * @param {object[]} [options.kept]   Enhancements already on the item (Fusion, Retouch)
 */
export function picksProblem(base, picks, { slots = picks.length, canCut = false, kept = [] } = {}) {
  const { list } = enhancementsFor(base);
  if (picks.length !== slots) return "Profession.Error.Slots";
  const all = [...kept, ...picks];
  for (const pick of picks) {
    const def = list.find(e => e.id === pick.id);
    if (!def) return "Profession.Error.Enhancement";
    if (!def.repeat && (all.filter(e => e.id === pick.id).length > 1)) return "Profession.Error.Twice";
    if (unavailableReason(def, base)) return "Profession.Error.Enhancement";
    if (pick.tag && !def.tags?.includes(pick.tag)) return "Profession.Error.Enhancement";
    if (pick.cut && (!canCut || def.uncut)) return "Profession.Error.Enhancement";
  }
  if (all.filter(e => e.cut).length > 1) return "Profession.Error.CutOnce";
  return null;
}

/** Whether the Artisan's Cut applies to this work (an accessory the Artisan makes). */
export const canCutFor = (professionId, base) => (professionId === "artisan") && (kindOf(base) === "accessory");

/**
 * Finish the work waiting for its enhancements: the item (and its copies) goes to the inventory.
 * @param {Actor} actor
 * @param {object} choice
 * @param {object[]} choice.picks           [{id, tag?, cut?}]
 * @param {string} [choice.name]
 * @param {"mass"|"instant"} [choice.masterpiece]   A Bard's Masterpiece (two sixes)
 * @returns {Promise<Item[]|null>}
 */
export async function finishCraft(actor, { picks, name = "", masterpiece = null }) {
  const pending = pendingOf(actor);
  const p = professionOf(actor);
  if (!pending || !p) return warn("Profession.Error.NoPending");
  const clean = picks.map(pick => ({ id: pick.id, ...(pick.tag ? { tag: pick.tag } : {}), ...(pick.cut ? { cut: true } : {}) }));
  const problem = picksProblem(pending.base, clean, { slots: pending.slots, canCut: canCutFor(pending.profession, pending.base) });
  if (problem) return warn(problem);
  const master = ((pending.profession === "bard") && pending.doubleSix && ["mass", "instant"].includes(masterpiece)) ? masterpiece : null;
  const data = buildCrafted(pending.base, {
    grade: pending.grade, enhancements: clean, crafter: actor.name, profession: pending.profession, rank: pending.rank,
    masterpiece: master, name
  });
  const copies = toInt(pending.copies || 1) + (clean.some(e => e.id === "double") ? 1 : 0);
  if (pending.equipped && (copies === 1)) {
    data.system.equipped = true;
    if (data.type === "weapon") data.system.main = !!pending.main;
  }
  const items = await giveCopies(actor, data, copies);
  await actor.unsetFlag(SYSTEM_ID, PENDING);
  const lines = clean.map(pick => {
    const def = ENHANCEMENT_INDEX.get(pick.id);
    const { name: enh, text } = enhancementText(def, pending.base, pick);
    return `${enh}${pick.cut ? " ✦" : ""}: ${text}`;
  });
  if (master) lines.push(`${L("Profession.Masterpiece.Name")}: ${L(`Profession.Masterpiece.${master}`)}`);
  if (copies > 1) lines.push(L("Profession.Chat.Copies", { n: copies }));
  await postCard(actor, p, {
    title: L("Profession.Chat.Made", { name: actorName(actor) }),
    quality: GRADE_QUALITY[pending.grade], qualityLabel: `${qualityName(GRADE_QUALITY[pending.grade])} [M${pending.grade}]`,
    items: items.slice(0, 1), lines
  });
  return items;
}

/** Throw away the work waiting for its enhancements (the GM's way out of a stuck one). */
export async function discardPending(actor) {
  await actor.unsetFlag(SYSTEM_ID, PENDING);
}

/* -------------------------------------------- */
/*  Fusion                                      */
/* -------------------------------------------- */

/**
 * The pairs a character can fuse: two crafted items with the same base and Magic Grade, of a kind its profession
 * makes, below Perfect (or Perfect with a legendary enhancement for its list).
 * @param {Actor} actor
 * @returns {{key: string, items: Item[], grade: number, next: number, legendary: object|null}[]}
 */
export function fusionPairs(actor) {
  const p = professionOf(actor);
  if (!p) return [];
  const groups = new Map();
  for (const item of actor.items) {
    const craft = craftOf(item);
    if (!craft || !p.def.kinds.includes(craft.kind)) continue;
    const key = fusionKey(item);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(item);
  }
  return [...groups].filter(([, items]) => items.length >= 2).map(([key, items]) => {
    const craft = craftOf(items[0]);
    const legendary = (craft.grade === LEGENDARY_GRADE - 1) ? (LEGENDARY[craft.category] ?? null) : null;
    return { key, items, grade: craft.grade, next: craft.grade + 1, legendary };
  }).filter(pair => (pair.grade < LEGENDARY_GRADE - 1) || pair.legendary);
}

/**
 * Fuse two equal crafted items into one of the next quality: it keeps the enhancements of one of them and takes one
 * more (a Perfect pair and a Quintessence: a Legendary item with the legendary enhancement of its list).
 * @param {Actor} actor
 * @param {object} choice
 * @param {string[]} choice.ids     The two items
 * @param {string} choice.keep      Whose enhancements stay
 * @param {object} [choice.pick]    The new enhancement (not for a Legendary)
 * @param {string} [choice.name]
 * @returns {Promise<Item|null>}
 */
export async function fuse(actor, { ids, keep, pick = null, name = "" }) {
  const p = professionOf(actor);
  const items = (ids ?? []).map(id => actor.items.get(id)).filter(Boolean);
  if (!p || (items.length !== 2) || (items[0] === items[1])) return warn("Profession.Error.Fusion");
  if (fusionKey(items[0]) !== fusionKey(items[1])) return warn("Profession.Error.Fusion");
  const kept = items.find(i => i.id === keep) ?? items[0];
  const craft = craftOf(kept);
  if (!p.def.kinds.includes(craft.kind)) return warn("Profession.Error.NotYours");
  const grade = craft.grade + 1;
  let enhancements;
  let shard = null;
  if (grade === LEGENDARY_GRADE) {
    const legendary = LEGENDARY[craft.category];
    if (!legendary) return warn("Profession.Error.Fusion");
    shard = materialsOf(actor).shards[0];
    if (!shard) return warn("Profession.Error.NoShard");
    enhancements = [...craft.enhancements, { id: legendary.id }];
  }
  else {
    const clean = pick ? [{ id: pick.id, ...(pick.tag ? { tag: pick.tag } : {}), ...(pick.cut ? { cut: true } : {}) }] : [];
    const problem = picksProblem(craft.base, clean, { slots: 1, canCut: canCutFor(p.id, craft.base), kept: craft.enhancements });
    if (problem) return warn(problem);
    enhancements = [...craft.enhancements, ...clean];
  }
  const custom = kept.name !== defaultName(craft.base, craft.enhancements);
  const data = buildCrafted(craft.base, {
    grade, enhancements, crafter: actor.name, profession: p.id, rank: p.rank, masterpiece: craft.masterpiece,
    retouches: craft.retouches, name: name || (custom ? kept.name : "")
  });
  await actor.deleteEmbeddedDocuments("Item", [...items.map(i => i.id), ...(shard ? [shard.id] : [])]);
  const [item] = await actor.createEmbeddedDocuments("Item", [data]);
  const added = enhancements.at(-1);
  const { name: enh, text } = enhancementText(ENHANCEMENT_INDEX.get(added.id), craft.base, added);
  const lines = [L("Profession.Chat.Fused", { a: items[0].name, b: items[1].name }), `${enh}: ${text}`];
  if (shard) lines.push(L("Profession.Chat.ShardSpent"));
  await postCard(actor, p, {
    title: L("Profession.Chat.Fusion"), quality: GRADE_QUALITY[grade],
    qualityLabel: `${qualityName(GRADE_QUALITY[grade])} [M${grade}]`, items: [item], lines
  });
  return item;
}

/* -------------------------------------------- */
/*  Merchant: Retouch and sales                 */
/* -------------------------------------------- */

/**
 * Retouch: one enhancement of a crafted item becomes another of its list (the legendary one stays). Costs 100 G,
 * doubling with each Retouch the item had, and an attempt.
 * @param {Actor} actor
 * @param {object} choice
 * @param {string} choice.itemId
 * @param {number} choice.out      Index of the enhancement that leaves
 * @param {object} choice.pick     The one that comes in
 * @returns {Promise<Item|null>}
 */
export async function retouch(actor, { itemId, out, pick }) {
  const p = professionOf(actor);
  const item = actor.items.get(itemId);
  const craft = craftOf(item);
  if (p?.id !== "merchant") return warn("Profession.Error.NoProfession");
  if (!craft) return warn("Profession.Error.NotCrafted");
  if (!p.attempts.left) return warn("Profession.Error.NoAttempts");
  const old = craft.enhancements[toInt(out)];
  if (!old || ENHANCEMENT_INDEX.get(old.id)?.legendary) return warn("Profession.Error.Enhancement");
  const cost = retouchCost(craft);
  const gold = toInt(actor.system.inventory?.gold);
  if (gold < cost) return warn("Profession.Error.Gold", { n: cost });
  const kept = craft.enhancements.filter((_, i) => i !== toInt(out));
  // A cut enhancement passes its cut to the one that takes its place (when that one can be cut).
  const cut = !!old.cut && !ENHANCEMENT_INDEX.get(pick?.id)?.uncut;
  const clean = [{ id: pick?.id, ...(pick?.tag ? { tag: pick.tag } : {}), ...(cut ? { cut: true } : {}) }];
  const problem = picksProblem(craft.base, clean, { slots: 1, canCut: !!old.cut, kept });
  if (problem) return warn(problem);
  const enhancements = craft.enhancements.map((e, i) => (i === toInt(out)) ? clean[0] : e);
  const custom = item.name !== defaultName(craft.base, craft.enhancements);
  const data = buildCrafted(craft.base, { ...craft, enhancements, retouches: toInt(craft.retouches) + 1, name: custom ? item.name : "" });
  // The new item takes the place of the old one: equipped (and in the main hand) if it was.
  data.system.equipped = !!item.system.equipped;
  if (item.type === "weapon") data.system.main = !!item.system.main;
  await actor.update({ "system.inventory.gold": gold - cost });
  await item.delete();
  const [made] = await actor.createEmbeddedDocuments("Item", [data]);
  await record(actor, { exp: EXP.retouch, attempt: true });
  const name = def => enhancementText(ENHANCEMENT_INDEX.get(def.id), craft.base, def).name;
  await postCard(actor, p, {
    title: L("Profession.Chat.Retouch"), items: [made], exp: EXP.retouch,
    lines: [L("Profession.Chat.Retouched", { out: name(old), in: name(clean[0]), n: cost })]
  });
  return made;
}

/** Items a Merchant can sell: carried (not equipped), with a price, not [Not For Sale], not an Anima-mundi without the Seal. */
export function sellable(actor) {
  return actor.items.filter(i => ["weapon", "armor", "shield", "accessory", "bag", "gear", "usable"].includes(i.type)
    && !i.system.equipped && (toInt(i.system.price) > 0)
    && !(i.system.tags ?? []).some(t => /not for sale|untradeable/i.test(String(t))) && !i.getFlag(SYSTEM_ID, UNSEALED));
}

/**
 * The Merchant sells an item at its full price. A magic item ([M1] and up) gives EXP.
 * @param {Actor} actor
 * @param {string} itemId
 */
export async function sell(actor, itemId) {
  const p = professionOf(actor);
  const item = actor.items.get(itemId);
  if (p?.id !== "merchant") return warn("Profession.Error.NoProfession");
  if (!item || !sellable(actor).includes(item)) return warn("Profession.Error.NotForSale");
  const price = toInt(item.system.price);
  const magic = (item.system.tags ?? []).some(t => /^\s*\[?m\d\]?\s*$/i.test(String(t)));
  await actor.update({ "system.inventory.gold": toInt(actor.system.inventory?.gold) + price });
  await item.delete();
  if (magic) await record(actor, { exp: EXP.sale });
  await postCard(actor, p, {
    title: L("Profession.Chat.Sale"), exp: magic ? EXP.sale : 0,
    lines: [L("Profession.Chat.Sold", { item: item.name, n: price })]
  });
  return price;
}

/* -------------------------------------------- */
/*  Gatherer                                    */
/* -------------------------------------------- */

/** A material the Gatherer found: without the Seal of the Anima. */
function unsealed(data) {
  if (data) foundry.utils.setProperty(data, `flags.${SYSTEM_ID}.${UNSEALED}`, true);
  return data;
}

/** Highest Anima-mundi the Gatherer finds: up to its NP and the profession's cap (economy/data.mjs). */
export const gatherCap = (p, actor) => Math.min(MAX_MATERIAL, gatherLevelCap(actor?.system?.infos?.crank ?? 1, p.cap));

/**
 * Gathering: 2D + Rank finds Anima-mundi of the chosen level (8+: one, 11+: two) and, on two sixes, a Quintessence.
 * What it finds has no Seal of the Anima (`flags.eternia.unsealed`): the Workshop takes it, no shop buys it.
 * @param {Actor} actor
 * @param {number} level
 */
export async function gather(actor, level) {
  const p = professionOf(actor);
  if (p?.id !== "gatherer") return warn("Profession.Error.NoProfession");
  if (!p.attempts.left) return warn("Profession.Error.NoAttempts");
  const n = Math.clamp(toInt(level), 1, gatherCap(p, actor));
  const { roll, dice } = await rollDice(p.rank);
  const outcome = gatherOutcome(dice, p.rank);
  const found = await giveCopies(actor, unsealed(await materialData(n)), outcome.count);
  const shards = outcome.shard ? await giveCopies(actor, unsealed(await shardData()), 1) : [];
  const done = await record(actor, { exp: outcome.exp, attempt: true });
  const lines = [L(`Profession.Chat.Gather.${outcome.id}`, { n, count: found.length })];
  if (shards.length) lines.push(L("Profession.Chat.Gather.shard"));
  await postCard(actor, p, {
    title: L("Profession.Chat.Gathering"), dice, total: outcome.total,
    quality: outcome.shard ? "legendary" : (outcome.count ? (outcome.count > 1 ? "rare" : "uncommon") : "fail"),
    qualityLabel: L(`Profession.Gather.Result.${outcome.shard ? "shard" : outcome.id}`, { count: outcome.count }),
    items: [...found.slice(0, 1), ...shards], lines, exp: outcome.exp, roll
  });
  return { outcome, dice, found, shards, exp: outcome.exp, rankUp: done.rankUp };
}

/* -------------------------------------------- */
/*  Talents used as an action                   */
/* -------------------------------------------- */

/** The characters of the players (the party), this one first. */
export function partyOf(actor) {
  const party = game.actors.filter(a => (a.type === "character") && a.hasPlayerOwner && (a !== actor));
  return [actor, ...party.sort((a, b) => a.name.localeCompare(b.name))];
}

/** Sharpen's bonus to a weapon of this level. */
export const sharpenValue = weapon => 2 * multiplierOf(weapon?.system?.rank);

/** The effect a Sharpen puts on a weapon, until its owner's scenario ends. */
export function sharpenEffect(weapon, smith) {
  const value = sharpenValue(weapon);
  return {
    name: L("Profession.Talent.sharpen.name"), img: "icons/skills/trades/smithing-anvil-silver-red.webp",
    type: "base", transfer: true, disabled: false,
    system: { changes: [{ key: "system.battle-status.power.attack.mod", type: "add", value, phase: "initial", priority: null }] },
    description: `<p>${escape(L("Profession.Talent.sharpen.effect", { n: value, name: smith.name }))}</p>`,
    flags: { [SYSTEM_ID]: { sharpen: { scenario: counter(weapon.actor, "scenario"), smith: smith.name } } }
  };
}

/**
 * Sharpen (Blacksmith): a weapon of the party gets +2 Attack Power (×2 from level 11, ×3 from 21) until its owner's
 * scenario ends. Spends an attempt.
 * @param {Actor} actor
 * @param {Item} weapon
 */
export async function sharpen(actor, weapon) {
  const p = professionOf(actor);
  if (p?.id !== "blacksmith") return warn("Profession.Error.NoProfession");
  if (!p.attempts.left) return warn("Profession.Error.NoAttempts");
  if ((weapon?.type !== "weapon") || (weapon.actor?.type !== "character")) return warn("Profession.Error.NoWeapon");
  if (weapon.effects.some(e => e.getFlag(SYSTEM_ID, "sharpen"))) return warn("Profession.Error.Sharpened");
  if (weapon.isOwner) await weapon.createEmbeddedDocuments("ActiveEffect", [sharpenEffect(weapon, actor)]);
  else {
    const result = await request("professionSharpen", { smithUuid: actor.uuid, itemUuid: weapon.uuid });
    if (!result?.ok) return warn(result?.error ?? "Profession.Error.Generic");
  }
  await record(actor, { attempt: true });
  await postCard(actor, p, {
    title: L("Profession.Talent.sharpen.name"),
    lines: [L("Profession.Chat.Sharpened", { item: weapon.name, name: actorName(weapon.actor), n: sharpenValue(weapon) })]
  });
  return true;
}

/** GM side of a Sharpen on someone else's weapon: only from the owner of a Blacksmith with an attempt left. */
export async function onSharpenRequest({ smithUuid, itemUuid }, user) {
  const smith = await fromUuid(smithUuid);
  const weapon = await fromUuid(itemUuid);
  if (!smith?.testUserPermission(user, "OWNER") || (professionOf(smith)?.id !== "blacksmith")) return { ok: false };
  if ((weapon?.type !== "weapon") || (weapon.actor?.type !== "character")) return { ok: false };
  if (weapon.effects.some(e => e.getFlag(SYSTEM_ID, "sharpen"))) return { ok: false, error: "Profession.Error.Sharpened" };
  await weapon.createEmbeddedDocuments("ActiveEffect", [sharpenEffect(weapon, smith)]);
  return { ok: true };
}

/**
 * Mend (Tailor): up to three characters lose Fatigue equal to the Rank × 3. Spends an attempt.
 * @param {Actor} actor
 * @param {Actor[]} targets
 */
export async function mend(actor, targets) {
  const p = professionOf(actor);
  if (p?.id !== "tailor") return warn("Profession.Error.NoProfession");
  if (!p.attempts.left) return warn("Profession.Error.NoAttempts");
  const list = [...new Set(targets)].filter(a => a?.type === "character").slice(0, 3);
  if (!list.length) return warn("Profession.Error.NoTargets");
  const value = p.rank * 3;
  const lines = [];
  for (const target of list) {
    if (target.isOwner) {
      const before = toInt(target._source.system.infos?.fatigue);
      const after = Math.max(0, before - value);
      if (after !== before) await target.update({ "system.infos.fatigue": after });
      lines.push(L("Conditions.Actions.Fatigue", { name: actorName(target), before, after }));
    }
    else {
      const result = await request("conditionAction", { actorUuid: target.uuid, casterUuid: actor.uuid, type: "fatigue", value: -value });
      lines.push(result?.line ?? L("Profession.Chat.NoFatigue", { name: actorName(target) }));
    }
  }
  await record(actor, { attempt: true });
  await postCard(actor, p, { title: L("Profession.Talent.mend.name"), lines: [L("Profession.Chat.Mended", { n: value }), ...lines] });
  return true;
}

/** Pairs of equal foods a Cook can turn into a Banquet. */
export function banquetPairs(actor) {
  const groups = new Map();
  for (const item of actor.items) {
    if ((kindOf(item) !== "food") || item.getFlag(SYSTEM_ID, "banquet")) continue;
    if (!groups.has(item.name)) groups.set(item.name, []);
    groups.get(item.name).push(item);
  }
  return [...groups.values()].filter(list => list.length >= 2);
}

/**
 * Banquet (Cook): two equal foods become one portion for the whole party.
 * @param {Actor} actor
 * @param {string} name   The foods' name
 */
export async function banquet(actor, name) {
  const p = professionOf(actor);
  if (p?.id !== "cook") return warn("Profession.Error.NoProfession");
  const pair = banquetPairs(actor).find(list => list[0].name === name);
  if (!pair) return warn("Profession.Error.NoPair");
  const data = banquetFrom(pair[0], actor);
  await actor.deleteEmbeddedDocuments("Item", pair.slice(0, 2).map(i => i.id));
  const [item] = await actor.createEmbeddedDocuments("Item", [data]);
  await postCard(actor, p, { title: L("Profession.Talent.banquet.name"), items: [item], lines: [L("Profession.Chat.Banquet", { item: name })] });
  return item;
}

/**
 * Copy (Scribe): one of the scribe's skills on a scroll anyone uses once. Spends an attempt.
 * @param {Actor} actor
 * @param {string} skillId
 */
export async function copy(actor, skillId) {
  const p = professionOf(actor);
  if (p?.id !== "scribe") return warn("Profession.Error.NoProfession");
  if (!p.attempts.left) return warn("Profession.Error.NoAttempts");
  const skill = copiableSkills(actor).find(s => s.id === skillId);
  if (!skill) return warn("Profession.Error.NoSkill");
  const [item] = await actor.createEmbeddedDocuments("Item", [scrollFromSkill(skill, actor, p.rank)]);
  await record(actor, { exp: EXP.copy, attempt: true });
  await postCard(actor, p, { title: L("Profession.Talent.copy.name"), items: [item], exp: EXP.copy, lines: [L("Profession.Chat.Copied", { skill: skill.name })] });
  return item;
}
