/**
 * The boosts of the XP: the Alchemist's potions and the Cook's food. An item with `flags.eternia.xpBoost = { kind, pct,
 * count }` gives whoever drinks or eats it an effect with `flags.eternia.xpBoost = { kind, pct, left, max, item, img }`:
 * +pct% of the XP of the next `left` monsters that give that character XP (award.mjs spends one each). One of each kind
 * at a time (a new potion takes the old one's place, a new food the old food's); a potion and a food add up. The effect
 * lasts until spent: no combat, scene or rest ends it.
 * Who gets it: the same as the food and the healing items (content/content.mjs recipients): the user (Target: Self),
 * the targeted characters (a potion widened at the Workshop), the user's party on the scene (a Banquet).
 */
import { L, SYSTEM_ID } from "../settings.mjs";
import { actorName, toInt } from "../helpers/utils.mjs";
import { isLocalChange } from "../helpers/clients.mjs";
import { registerHandler, request } from "../piles/pile-socket.mjs";
import { recipients } from "../content/content.mjs";
import { BOOST_KINDS } from "./data.mjs";

const X = (key, data) => L(`Xp.${key}`, data);
const FLAG = "xpBoost";

/** The boost an item gives (its flag), or null. */
export function itemBoost(data) {
  const flag = data?.flags?.[SYSTEM_ID]?.[FLAG];
  if (!flag) return null;
  const pct = toInt(flag.pct), count = toInt(flag.count);
  if ((pct <= 0) || (count <= 0)) return null;
  return { kind: BOOST_KINDS.includes(flag.kind) ? flag.kind : "potion", pct, count };
}

/** The boosts an actor has now (effects with charges left). */
export const boostsOf = actor => (actor?.effects ?? []).filter(e => !e.disabled && (toInt(e.getFlag(SYSTEM_ID, FLAG)?.left) > 0));

/** The XP the boosts of an actor add, in %. */
export const boostPct = actor => boostsOf(actor).reduce((sum, e) => sum + toInt(e.getFlag(SYSTEM_ID, FLAG).pct), 0);

/** The effect's name: the item, the bonus and the monsters left. */
const effectName = boost => X("Boost.Name", { item: boost.item, pct: boost.pct, left: boost.left });

/**
 * Give an actor a boost: it takes the place of the one of its kind.
 * @param {Actor} actor
 * @param {{kind: string, pct: number, count: number}} boost
 * @param {{name: string, img: string, uuid?: string}} item
 */
export async function giveBoost(actor, boost, item) {
  const old = actor.effects.filter(e => e.getFlag(SYSTEM_ID, FLAG)?.kind === boost.kind).map(e => e.id);
  if (old.length) await actor.deleteEmbeddedDocuments("ActiveEffect", old);
  const flag = { kind: boost.kind, pct: boost.pct, left: boost.count, max: boost.count, item: item.name, img: item.img };
  const [effect] = await actor.createEmbeddedDocuments("ActiveEffect", [{
    name: effectName(flag),
    img: item.img,
    origin: item.uuid ?? null,
    transfer: false,
    disabled: false,
    description: `<p>${X("Boost.Text", { pct: boost.pct, count: boost.count })}</p>`,
    flags: { [SYSTEM_ID]: { [FLAG]: flag } }
  }]);
  return effect;
}

/**
 * Spend a monster of each boost of an actor (award.mjs, when a monster gives it XP): one fewer left, gone at 0.
 * @param {Actor} actor
 * @returns {Promise<{id: string, kind: string, pct: number, name: string, data: object}[]>}   What was spent (for the Undo)
 */
export async function spendBoosts(actor) {
  const spent = [];
  for (const effect of boostsOf(actor)) {
    const flag = effect.getFlag(SYSTEM_ID, FLAG);
    const left = toInt(flag.left) - 1;
    spent.push({ id: effect.id, kind: flag.kind, pct: toInt(flag.pct), name: flag.item, data: effect.toObject() });
    if (left <= 0) await effect.delete();
    else await effect.update({ name: effectName({ ...flag, left }), [`flags.${SYSTEM_ID}.${FLAG}.left`]: left });
  }
  return spent;
}

/**
 * Give back the monsters an Undo took (award.mjs undoXp): one more left, or the effect again when it was spent out.
 * @param {Actor} actor
 * @param {object[]} spent   spendBoosts's
 */
export async function restoreBoosts(actor, spent) {
  for (const entry of spent ?? []) {
    const effect = actor.effects.get(entry.id);
    if (effect) {
      const flag = effect.getFlag(SYSTEM_ID, FLAG);
      const left = Math.min(toInt(flag.max) || 99, toInt(flag.left) + 1);
      await effect.update({ name: effectName({ ...flag, left }), [`flags.${SYSTEM_ID}.${FLAG}.left`]: left });
      continue;
    }
    if (!entry.data) continue;
    // Another of its kind came in its place: that one stays
    if (actor.effects.some(e => e.getFlag(SYSTEM_ID, FLAG)?.kind === entry.kind)) continue;
    const data = foundry.utils.deepClone(entry.data);
    data.flags[SYSTEM_ID][FLAG].left = 1;
    data.name = effectName(data.flags[SYSTEM_ID][FLAG]);
    await actor.createEmbeddedDocuments("ActiveEffect", [data], { keepId: true });
  }
}

/* -------------------------------------------- */
/*  Using the item                              */
/* -------------------------------------------- */

/** The boost of a use card's item, or null. */
const boostOfMessage = message => itemBoost(message.getFlag(SYSTEM_ID, "use")?.item);

/** Someone drank or ate an item with a boost: whoever gets it, gets it. */
function onCreateMessage(message, options, userId) {
  // Only the window that used it (the same user may have two open)
  if (!isLocalChange(options, userId)) return;
  const boost = boostOfMessage(message);
  if (!boost) return;
  drink(message, boost).catch(err => console.error(`${SYSTEM_ID} | XP boost failed`, err));
}

async function drink(message, boost) {
  const use = message.getFlag(SYSTEM_ID, "use");
  const item = { name: use.item.name, img: use.item.img };
  const given = [];
  for (const actor of recipients(use)) {
    const result = actor.isOwner ? await giveBoost(actor, boost, item).then(() => ({ ok: true }))
      : await request("xpBoost", { messageId: message.id, actorUuid: actor.uuid });
    if (result?.ok) given.push(actorName(actor));
  }
  if (given.length) await message.setFlag(SYSTEM_ID, "boosted", { names: given, pct: boost.pct, count: boost.count });
}

/** GM side: the boost for a character the user doesn't own, from that user's own card, once each. */
async function onBoostRequest({ messageId, actorUuid }, user) {
  const message = game.messages.get(messageId);
  const actor = await fromUuid(actorUuid);
  const boost = message ? boostOfMessage(message) : null;
  if (!boost || (message.author?.id !== user.id) || (actor?.type !== "character")) return { ok: false };
  const done = message.getFlag(SYSTEM_ID, "boostedActors") ?? [];
  if (done.includes(actor.uuid)) return { ok: false };
  await message.setFlag(SYSTEM_ID, "boostedActors", [...done, actor.uuid]);
  const use = message.getFlag(SYSTEM_ID, "use");
  await giveBoost(actor, boost, { name: use.item.name, img: use.item.img });
  return { ok: true };
}

/** The use card says who got the boost. */
function onRenderMessage(message, html) {
  const done = message.getFlag(SYSTEM_ID, "boosted");
  if (!done?.names?.length) return;
  const card = html.querySelector(".chat-card") ?? html.querySelector(".message-content");
  const line = document.createElement("div");
  line.className = "lhauto-use xp-boosted";
  line.innerHTML = `<span><i class="fa-solid fa-star"></i> </span>`;
  line.querySelector("span").append(X("Boost.Given", { names: done.names.join(", "), pct: done.pct, count: done.count }));
  card?.append(line);
}

/** Call during the `init` hook. */
export function registerBoosts() {
  registerHandler("xpBoost", onBoostRequest);
  Hooks.on("createChatMessage", onCreateMessage);
  Hooks.on("renderChatMessageHTML", onRenderMessage);
}
