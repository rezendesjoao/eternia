/**
 * Itens Deixados (AS REGRAS, V.b): a monster's drop table, rolled when it falls, and what it gives.
 *
 * A row of the table is an item kept in the monster, with `flags.eternia.drop`:
 *   min, max   the faces of the 1d6 that give it (1 to 6); `fixed: true` instead: it always drops ("Fixo")
 *   qty        how many copies (a ticket gets one item with that quantity)
 *   gold       a formula ("2d6*3"): the row gives that many Yuld instead of its item (the item is only the row's card;
 *              the field keeps its old name, as the purse's: the currency is the Yuld since 0.48)
 *   growth     true: one more set of copies for each point the monster grew (`flags.eternia.growth`, the
 *              bestiary rules), whatever the 1d6 says
 * A monster with no rows rolls the "Itens Deixados" table of its description instead (the format of the books, read
 * by `parseDropTable`): "1~5 | Mandíbula Negra [Valioso] (30G)", "Fixo", "x3", "2d6×3 de ouro", and "(conforme a
 * Lista de Itens)", which is the item of the compendium with that name. The sheet's tab turns that table into rows.
 *
 * When (the world setting `dropRoll`): "fall" (the default: when a monster becomes Incapacitated or Dead, on the
 * primary GM), "combat" (when a started combat ends, for each monster of it that fell) or "manual" (the sheet's
 * button). A monster is rolled once (`flags.eternia.dropped`, cleared by the card's Undo), and never one that came
 * after its combat started (`flags.eternia.noLoot`, on the actor or on its token: summoned by a boss, a Rift's wave,
 * placed mid-combat), unless the GM rolls it by hand.
 * Who gets it (the table's choice): whoever felled the monster gets every item and all the gold. That is the attacker
 * of the damage card that took it to 0 HP (`eternia.defeated`, kept in `flags.eternia.felledBy`), else whoever gave
 * the status that hurt it (poison, fire…). A character takes what fits in the inventory; the rest, and everything when
 * nobody (or no character) felled it, stays in a loot pile on the monster's square (piles/pile-operations.mjs).
 * The card: the 1d6, what came and where it went, and the GM's Undo (`flags.eternia.dropCard` on the message).
 */
import { L, SYSTEM_ID, setting } from "../settings.mjs";
import { isPrimaryGM } from "../helpers/clients.mjs";
import { actorName, escape, toInt } from "../helpers/utils.mjs";
import { tagLabel } from "../i18n/terms.mjs";
import { PHYSICAL_TYPES, SPACE_TYPES } from "../piles/pile-config.mjs";
import { getGold, goldPath, usedSpace } from "../piles/pile-utils.mjs";
import { lootAt } from "../piles/pile-operations.mjs";
import { ITEMS_PACK } from "../professions/data.mjs";
import { GOLD_ICON, nameKey, nameKeys, parseDropTable, parseRange, partIcon, priceOf, withoutDropTable } from "./drop-table.mjs";
import { commonValue } from "../economy/data.mjs";

export { parseDropTable, parseRange };

const TEMPLATE = "systems/eternia/templates/chat/drop-card.hbs";

/** What a common enemy leaves, by Level (1 to 10): the economy's unit (economy/data.mjs commonValue, 25 to 129 Yuld). */
export const EXPECTED_VALUE = Array.from({ length: 10 }, (_, i) => Math.round(commonValue(i + 1)));

/** The statuses that hurt their bearer, and so may have felled it (their source took the kill). */
const HURTING = ["poisoned", "burning", "decay", "blackFlame", "nightmare", "doom", "fuse", "shocked", "agony", "servant"];

/** Who felled each monster, on this window (the flag may still be on its way). */
const fellers = new Map();

const down = actor => actor.statuses.has("incapacitated") || actor.statuses.has("dead");

/** A monster that came after its combat started, and leaves nothing (the flag of the actor, or of its token). */
export const cameLate = actor => !!(actor?.getFlag(SYSTEM_ID, "noLoot") || actor?.token?.getFlag(SYSTEM_ID, "noLoot"));

/* -------------------------------------------- */
/*  The rows                                    */
/* -------------------------------------------- */

/** A row's rule from its flag: { fixed, min, max, qty, gold, growth }. */
export function dropRule(data) {
  const flag = (data instanceof Item) ? data.getFlag(SYSTEM_ID, "drop") : data?.flags?.[SYSTEM_ID]?.drop;
  if (!flag) return null;
  const min = Math.clamp(toInt(flag.min) || 1, 1, 6);
  return {
    fixed: !!flag.fixed,
    min,
    max: Math.clamp(toInt(flag.max) || min, min, 6),
    qty: Math.max(1, toInt(flag.qty) || 1),
    gold: String(flag.gold ?? "").trim(),
    growth: !!flag.growth
  };
}

/** The faces of a row as the table writes them: "1–3", "6", "Fixo". */
export function rangeLabel(rule) {
  if (rule.growth) return L("Drops.Growth");
  if (rule.fixed) return L("Drops.Fixed");
  return (rule.min === rule.max) ? `${rule.min}` : `${rule.min}–${rule.max}`;
}

/** The faces no row covers yet, as a range for a new row (the last face when all are covered). */
export function freeRange(actor) {
  const taken = new Set();
  for (const item of actor.items) {
    const rule = dropRule(item);
    if (rule && !rule.fixed && !rule.growth) for (let f = rule.min; f <= rule.max; f++) taken.add(f);
  }
  const free = [1, 2, 3, 4, 5, 6].filter(f => !taken.has(f));
  if (!free.length) return { min: 6, max: 6 };
  let max = free[0];
  while (free.includes(max + 1)) max++;
  return { min: free[0], max };
}

/** The drop rows kept in a monster. */
export const itemRows = actor => (actor?.items ?? []).filter(i => dropRule(i)).map(item => ({ item, rule: dropRule(item) }));

/**
 * The average gold a table gives (the gold rows at the average of their dice), for the sheet: the rolled rows weighed
 * by their faces, and the fixed ones apart.
 * @param {{rule: object, data: object}[]} rows
 * @returns {{rolled: number, fixed: number}}
 */
export function expectedValue(rows) {
  let rolled = 0;
  let fixed = 0;
  for (const { rule, data } of rows) {
    if (rule.growth) continue;
    const each = rule.gold ? averageOf(rule.gold) : (priceOf(data) * rule.qty);
    if (rule.fixed) fixed += each;
    else rolled += (each * (rule.max - rule.min + 1)) / 6;
  }
  return { rolled: Math.round(rolled), fixed: Math.round(fixed) };
}

/** The average of a dice formula ("2d6*3" → 21). */
function averageOf(formula) {
  try {
    const roll = new Roll(String(formula).replace(/×/g, "*"));
    const avg = Roll.safeEval(roll.formula.replace(/(\d*)d(\d+)/gi, (m, n, f) => `(${toInt(n) || 1}*${(toInt(f) + 1) / 2})`));
    return Math.round(Number(avg) || 0);
  }
  catch {
    return 0;
  }
}

/* -------------------------------------------- */
/*  The table written in the description        */
/* -------------------------------------------- */

/** The item compendium's entries by name, without the "(NP1) " the food carries. */
let itemsByName = null;
async function compendiumItem(name) {
  const pack = game.packs.get(ITEMS_PACK);
  if (!pack) return null;
  if (!itemsByName) {
    itemsByName = new Map();
    for (const e of await pack.getIndex()) if (!itemsByName.has(nameKey(e.name))) itemsByName.set(nameKey(e.name), e._id);
  }
  const id = nameKeys(name).map(k => itemsByName.get(k)).find(Boolean);
  const doc = id ? await pack.getDocument(id) : null;
  if (!doc) return null;
  const data = game.items.fromCompendium(doc);
  foundry.utils.setProperty(data, "_stats.compendiumSource", doc.uuid);
  return data;
}

/**
 * The item of a table entry: the compendium's (a "Lista de Itens" entry, or a name it knows), else a part of the
 * monster made here (a gear item with the tags and the price).
 * @param {object} entry   parseEntry's
 * @param {Actor} actor
 */
export async function entryItem(entry, actor) {
  if (entry.gold) return { name: L("Drops.GoldRow"), type: "gear", img: GOLD_ICON, system: { price: 0, tags: [] } };
  const known = await compendiumItem(entry.name);
  if (known && (entry.listed || entry.tags.every(t => t === "Consumable"))) return known;
  const catalyst = entry.tags.find(t => /^Magic Catalyst/.test(t));
  const level = catalyst ? toInt(catalyst.match(/\d+/)[0]) : Math.max(1, toInt(actor?.system?.rank));
  const data = {
    name: entry.name, type: "gear", img: partIcon(entry.name),
    system: {
      description: `<p>${escape(L("Drops.PartOf", { monster: actor?.name ?? "" }))}</p>`,
      tags: entry.tags, price: entry.price ?? 0, rank: level, equipped: false
    }
  };
  data.system.price = priceOf(data);
  return data;
}

/**
 * Every row of a monster's table, with the data of its item: the rows kept in it, else the table of its description.
 * @param {Actor} actor
 * @returns {Promise<{rule: object, data: object, item: Item|null}[]>}
 */
export async function dropRows(actor) {
  const kept = itemRows(actor);
  if (kept.length) return kept.map(({ item, rule }) => ({ rule, item, data: item.toObject() }));
  const table = parseDropTable(actor?.system?.description) ?? [];
  const rows = [];
  for (const { rule, entry } of table) rows.push({ rule, item: null, data: await entryItem(entry, actor) });
  return rows;
}

/**
 * Turn the table of a monster's description into rows kept in it, and take the table out of the description.
 * @param {Actor} actor
 * @returns {Promise<number>}   How many rows
 */
export async function convertTable(actor) {
  const table = parseDropTable(actor?.system?.description);
  if (!table?.length) return 0;
  const items = [];
  for (const { rule, entry } of table) {
    const data = await entryItem(entry, actor);
    delete data._id;
    if (data.system && ("equipped" in data.system)) data.system.equipped = false;
    foundry.utils.setProperty(data, `flags.${SYSTEM_ID}.drop`, rule.fixed
      ? { fixed: true, qty: rule.qty, gold: rule.gold || undefined }
      : { min: rule.min, max: rule.max, qty: rule.qty, gold: rule.gold || undefined });
    items.push(data);
  }
  await actor.createEmbeddedDocuments("Item", items);
  await actor.update({ "system.description": withoutDropTable(actor.system.description) });
  return items.length;
}

/* -------------------------------------------- */
/*  Who felled it                               */
/* -------------------------------------------- */

/** The actor of a uuid (a token's actor too), or null. */
function actorOf(uuid) {
  const doc = uuid ? fromUuidSync(uuid) : null;
  if (doc instanceof Actor) return doc;
  return doc?.actor ?? null;
}

/**
 * Whoever felled a monster: the attacker that took it to 0 HP, else the source of a status that hurts it.
 * @param {Actor} actor
 * @returns {Actor|null}
 */
export function fellerOf(actor) {
  const known = actorOf(fellers.get(actor.uuid) ?? actor.getFlag(SYSTEM_ID, "felledBy"));
  if (known) return known;
  for (const effect of actor.effects) {
    if (![...effect.statuses].some(s => HURTING.includes(s))) continue;
    const source = actorOf(effect.getFlag(SYSTEM_ID, "source")?.casterUuid);
    if (source && (source.uuid !== actor.uuid)) return source;
  }
  return null;
}

/* -------------------------------------------- */
/*  Rolling and giving                          */
/* -------------------------------------------- */

/** The token of a monster on its scene (a synthetic actor's own, else the first one of a world actor). */
function tokenOf(actor) {
  if (actor.token) return actor.token;
  return actor.getActiveTokens(false, true)[0] ?? null;
}

/**
 * Roll a monster's drops and give them: the card, the items and the gold. GM only.
 * @param {Actor} actor
 * @param {object} [options]
 * @param {boolean} [options.force]     Roll even a monster already rolled or one that leaves nothing (the sheet's button)
 * @param {Actor|null} [options.receiver]   Who gets it (undefined: whoever felled it; null: the floor)
 * @returns {Promise<ChatMessage|null>}
 */
export async function rollDrops(actor, { force = false, receiver } = {}) {
  if (!game.user.isGM || (actor?.type !== "monster") || rolling.has(actor.uuid)) return null;
  if (!force && (actor.getFlag(SYSTEM_ID, "dropped") || cameLate(actor))) return null;
  rolling.add(actor.uuid);
  try {
    return await rollTable(actor, receiver);
  }
  finally {
    rolling.delete(actor.uuid);
  }
}

/** The monsters being rolled now (Incapacitated and Dead may come together). */
const rolling = new Set();

/** The roll itself: the rows, the 1d6, what each row gives, who gets it and the card. */
async function rollTable(actor, receiver) {
  const rows = await dropRows(actor);
  const stolen = Math.max(0, toInt(actor.getFlag(SYSTEM_ID, "stolenGold")));
  if (!rows.length && !stolen) return null;
  await actor.setFlag(SYSTEM_ID, "dropped", true);

  // The 1d6, only when some row needs it
  const rolled = rows.some(r => !r.rule.fixed && !r.rule.growth);
  const roll = rolled ? await new Roll("1d6").evaluate() : null;
  const face = roll?.total ?? null;
  if (roll) game.dice3d?.showForRoll(roll, game.user, true);
  const growth = Math.max(0, toInt(actor.getFlag(SYSTEM_ID, "growth")));

  const lines = [];
  const items = [];
  let gold = 0;
  for (const { rule, data } of rows) {
    const hit = rule.growth ? (growth > 0) : (rule.fixed || ((face >= rule.min) && (face <= rule.max)));
    if (!hit) continue;
    const sets = rule.growth ? growth : 1;
    if (rule.gold) {
      let amount = 0;
      for (let n = 0; n < sets; n++) amount += toInt((await new Roll(rule.gold.replace(/×/g, "*")).evaluate()).total);
      gold += amount;
      lines.push({ img: data.img, name: L("Drops.GoldRow"), value: L("Drops.Value", { n: amount }), formula: rule.gold, gold: true, range: rangeLabel(rule) });
      continue;
    }
    const copies = rule.qty * sets;
    const copy = foundry.utils.deepClone(data);
    delete copy._id;
    if (copy.flags?.[SYSTEM_ID]) delete copy.flags[SYSTEM_ID].drop;
    if (copy.system && ("equipped" in copy.system)) copy.system.equipped = false;
    if (copy.type === "ticket") items.push({ ...copy, system: { ...copy.system, quantity: copies } });
    else for (let n = 0; n < copies; n++) items.push(foundry.utils.deepClone(copy));
    lines.push({
      img: data.img, name: data.name, qty: copies, range: rangeLabel(rule),
      tags: (data.system?.tags ?? []).map(t => tagLabel(t)), value: L("Drops.Value", { n: priceOf(data) * copies })
    });
  }
  if (stolen) {
    gold += stolen;
    lines.push({ img: "icons/commodities/currency/coins-plain-stack-gold.webp", name: L("Drops.Stolen"), value: L("Drops.Value", { n: stolen }), gold: true });
  }

  const feller = (receiver === undefined) ? fellerOf(actor) : receiver;
  const given = await giveDrops(actor, feller, items, gold);
  const content = await renderCard(actor, { face, lines, given, gold });
  const message = await ChatMessage.create({
    speaker: { alias: actorName(actor) },
    content,
    flags: { [SYSTEM_ID]: { dropCard: { actorUuid: actor.uuid, face, lines, gold, ...given, undone: false } } }
  });
  await actor.setFlag(SYSTEM_ID, "dropped", message?.id ?? true);
  return message;
}

/**
 * Give the items and the gold: to a character, what fits in its inventory, the rest to a pile on the monster's square.
 * @returns {Promise<{receiverUuid: string|null, receiverName: string|null, itemIds: string[], gold: number,
 *   pile: object|null, overflow: string[]}>}
 */
async function giveDrops(actor, feller, items, gold) {
  const receiver = (feller?.type === "character") ? feller : null;
  const carried = [];
  const floor = [];
  if (receiver) {
    let room = Math.max(0, toInt(receiver.system.inventory?.maxSpace) - usedSpace(receiver));
    for (const data of items) {
      if (!SPACE_TYPES.includes(data.type)) carried.push(data);
      else if (room > 0) { carried.push(data); room--; }
      else floor.push(data);
    }
  }
  else floor.push(...items.filter(d => PHYSICAL_TYPES.includes(d.type)));
  const created = carried.length ? await receiver.createEmbeddedDocuments("Item", carried) : [];
  if (receiver && (gold > 0)) await receiver.update({ [goldPath(receiver)]: getGold(receiver) + gold });
  const token = tokenOf(actor);
  const floorGold = receiver ? 0 : gold;
  const pile = (token && (floor.length || floorGold)) ? await lootAt(token.parent, {
    x: token.x + 1, y: token.y + 1, level: token.level, elevation: token.elevation
  }, floor, floorGold) : null;
  return {
    receiverUuid: receiver?.uuid ?? null,
    receiverName: receiver ? actorName(receiver) : null,
    feller: feller ? actorName(feller) : null,
    itemIds: created.map(i => i.id),
    gold: receiver ? gold : 0,
    pile,
    overflow: receiver ? counted(floor.map(d => d.name)) : []
  };
}

/** Names with how many of each ("Cristal Roído ×3"). */
function counted(names) {
  const counts = new Map();
  for (const name of names) counts.set(name, (counts.get(name) ?? 0) + 1);
  return [...counts].map(([name, n]) => (n > 1 ? `${name} ×${n}` : name));
}

/** The faces of Font Awesome's dice. */
const DIE_ICONS = ["", "one", "two", "three", "four", "five", "six"];

/** The card's HTML. */
async function renderCard(actor, { face, lines, given, gold }, { undone = false } = {}) {
  const items = lines.filter(l => !l.gold).length;
  const name = given.receiverName;
  let where;
  if (!name) where = given.feller ? L("Drops.FloorNotCharacter", { name: given.feller }) : L("Drops.Floor");
  else if (!given.overflow?.length) where = L("Drops.To", { name });
  else if (given.overflow.length < items || given.itemIds?.length) where = L("Drops.ToPart", { name, items: given.overflow.join(", ") });
  else where = L(gold ? "Drops.ToFullGold" : "Drops.ToFull", { name });
  return foundry.applications.handlebars.renderTemplate(TEMPLATE, {
    img: actor.img, name: actorName(actor), eyebrow: L("Drops.Eyebrow"),
    face, dieIcon: DIE_ICONS[face] ?? "", faceLabel: L("Drops.Die"), fixedLabel: L("Drops.FixedOnly"),
    lines, gold: gold ? L("Drops.Value", { n: gold }) : null, goldLabel: L(name ? "Drops.GoldTo" : "Drops.GoldFloor", { name }),
    where, pile: !!given.pile, pileLabel: L("Drops.PileHint"),
    undone, undoLabel: L("Drops.Undo"), undoneLabel: L("Drops.Undone"), nothing: !lines.length ? L("Drops.Nothing") : null
  });
}

/**
 * The card's Undo (GM): the items and the gold come back from whoever got them, the pile loses what it got, and the
 * monster can be rolled again.
 * @param {ChatMessage} message
 */
export async function undoDrop(message) {
  const data = message.getFlag(SYSTEM_ID, "dropCard");
  if (!game.user.isGM || !data || data.undone) return;
  const receiver = actorOf(data.receiverUuid);
  if (receiver) {
    const ids = (data.itemIds ?? []).filter(id => receiver.items.has(id));
    if (ids.length) await receiver.deleteEmbeddedDocuments("Item", ids);
    if (data.gold) await receiver.update({ [goldPath(receiver)]: Math.max(0, getGold(receiver) - toInt(data.gold)) });
  }
  if (data.pile?.tokenUuid) {
    const token = fromUuidSync(data.pile.tokenUuid);
    const pile = token?.actor;
    if (pile) {
      const ids = (data.pile.itemIds ?? []).filter(id => pile.items.has(id));
      if (ids.length) await pile.deleteEmbeddedDocuments("Item", ids);
      if (data.pile.gold) await pile.update({ [goldPath(pile)]: Math.max(0, getGold(pile) - toInt(data.pile.gold)) });
      if (data.pile.created && !pile.items.size && !getGold(pile)) await token.delete();
    }
  }
  const actor = actorOf(data.actorUuid);
  if (actor) await actor.unsetFlag(SYSTEM_ID, "dropped");
  const content = await renderCard(actor ?? { img: "", name: "?" }, {
    face: data.face, lines: data.lines ?? [], gold: data.gold || (data.pile?.gold ?? 0),
    given: { receiverName: data.receiverName, feller: data.feller, overflow: data.overflow, pile: data.pile }
  }, { undone: true });
  await message.update({ content, [`flags.${SYSTEM_ID}.dropCard.undone`]: true });
}

/* -------------------------------------------- */
/*  When                                        */
/* -------------------------------------------- */

/** A monster fell (Incapacitated or Dead came): its drops, a moment later, when the felling attacker is known. */
function onStatus(effect) {
  const actor = effect.parent;
  // A Rift gives its drops when it closes (bestiary/rifts.mjs), not when it falls
  if (!(actor instanceof Actor) || (actor.type !== "monster") || actor.getFlag(SYSTEM_ID, "rift") || !isPrimaryGM()) return;
  if (!effect.statuses?.has("incapacitated") && !effect.statuses?.has("dead")) return;
  if (setting("dropRoll") !== "fall") return;
  setTimeout(() => {
    if (down(actor)) rollDrops(actor).catch(err => console.error(`${SYSTEM_ID} | Drops failed`, err));
  }, 600);
}

/** A damage card took a monster to 0 HP (on the GM's window that applied it): who felled it. */
function onDefeated(actor, card) {
  if ((actor?.type !== "monster") || !card?.attackerUuid) return;
  fellers.set(actor.uuid, card.attackerUuid);
  if (actor.isOwner) actor.setFlag(SYSTEM_ID, "felledBy", card.attackerUuid).catch(() => null);
}

/** A started combat ended: with the drops rolled at the end of the combat, each monster of it that fell. */
async function onDeleteCombat(combat) {
  if (!combat.started || !isPrimaryGM() || (setting("dropRoll") !== "combat")) return;
  const seen = new Set();
  for (const combatant of combat.combatants) {
    const actor = combatant.actor;
    if (!actor || (actor.type !== "monster") || seen.has(actor.uuid)) continue;
    seen.add(actor.uuid);
    if (down(actor) || combatant.isDefeated) await rollDrops(actor).catch(err => console.error(`${SYSTEM_ID} | Drops failed`, err));
  }
}

/**
 * A monster's token placed while its scene's combat is going: it came too late to leave anything. The mark goes on the
 * token: one made from a world actor has no delta yet, and its delta can't be made before the token has its id.
 */
function onPreCreateToken(token, data) {
  const scene = token.parent;
  const marked = data?.delta?.flags?.[SYSTEM_ID]?.noLoot ?? data?.flags?.[SYSTEM_ID]?.noLoot;
  if (!scene || token.actorLink || (marked !== undefined)) return;
  const actor = game.actors.get(data?.actorId ?? token.actorId);
  if (actor?.type !== "monster") return;
  const fighting = game.combats.some(c => c.started && (c.scene?.id === scene.id));
  if (fighting) token.updateSource({ [`flags.${SYSTEM_ID}.noLoot`]: true });
}

/** The card's Undo button, for the GM while it can be undone. */
function onRenderMessage(message, html) {
  const data = message.getFlag(SYSTEM_ID, "dropCard");
  if (!data) return;
  const actions = html.querySelector(".rk-actions");
  if (!actions) return;
  if (!game.user.isGM || data.undone) return actions.remove();
  actions.querySelector('[data-action="drop-undo"]')?.addEventListener("click", event => {
    event.preventDefault();
    undoDrop(message).catch(err => console.error(`${SYSTEM_ID} | Drop undo failed`, err));
  });
}

/** Call during the `init` hook. */
export function registerDrops() {
  game.settings.register(SYSTEM_ID, "dropRoll", {
    name: "ETERNIA.Settings.dropRoll.Name",
    hint: "ETERNIA.Settings.dropRoll.Hint",
    scope: "world",
    config: true,
    type: String,
    choices: {
      fall: "ETERNIA.Settings.dropRoll.fall",
      combat: "ETERNIA.Settings.dropRoll.combat",
      manual: "ETERNIA.Settings.dropRoll.manual"
    },
    default: "fall"
  });
  Hooks.on("createActiveEffect", (effect, options, userId) => onStatus(effect));
  Hooks.on("eternia.defeated", onDefeated);
  Hooks.on("deleteCombat", (combat, options, userId) => onDeleteCombat(combat).catch(err => console.error(`${SYSTEM_ID} | Drops failed`, err)));
  Hooks.on("preCreateToken", onPreCreateToken);
  Hooks.on("renderChatMessageHTML", onRenderMessage);
  // A new world index for the "Lista de Itens" entries when the compendium changes
  Hooks.on("updateCompendium", () => { itemsByName = null; });
  foundry.applications.handlebars.loadTemplates([TEMPLATE]);
}
