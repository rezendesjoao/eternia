/**
 * The Awakening (o Despertar): a player's first Magia, the class's slot of CR 1, is drawn and not chosen. The player
 * rolls up to three times, each roll a die with a face for each Magia of the catalog (apps/magic-catalog.mjs, in its
 * order: every Magia as likely, the Ancestral and the Forbidden ones too; one already drawn is drawn again, so the three
 * differ), and keeps one of what came out. Each roll is kept on the character as soon as it is made
 * (`flags.eternia.awakening`: { rolls: [{ uuid, name, n, faces }], chosen }), with a card in the chat, so closing the
 * window or reloading gives no other. The Magia the character gets in that slot (by the creation wizard, or from the
 * sheet) is kept in `chosen`: then the player can neither draw again nor take it out of the sheet. A character that
 * already has a Magia without the flag (made before, or by the GM) awakened with its first one.
 *
 * The die has a face for each Magia the character may still hold (apps/magic-holders.mjs): a Magia with a limit of
 * holders that is full in the world (the characters that have it, and the open Awakenings that drew it) is never drawn.
 *
 * Where it shows: the Magia step of the creation wizard and, for the slot of CR 1 filled from the sheet, the Magia
 * picker (apps/magic-picker.mjs), both with only the Magias rolled. The GM chooses freely in both, sees the player's
 * rolls and may free a new draw. The world setting `awakening` off brings the free choice back for everyone.
 */
import { L, SYSTEM_ID, setting } from "../settings.mjs";
import { categoryView, magicCatalog } from "./magic-catalog.mjs";
import { holderState } from "./magic-holders.mjs";

export const AWAKENING_FLAG = "awakening";
/** How many times a player rolls. */
export const AWAKENING_ROLLS = 3;

const CARD = "systems/eternia/templates/apps/awakening-card.hbs";

/** Whether the first Magia is drawn in this world. */
export const awakeningOn = () => setting("awakening") !== false;

/** Whether this user draws it (the GM chooses). */
export const drawsAwakening = () => awakeningOn() && !game.user.isGM;

/** The compendium entry an item came from (else the item itself). */
const sourceOf = item => item?._stats?.compendiumSource || item?.flags?.core?.sourceId || item?.uuid || null;

/** The character's Magias, the oldest first. */
const magiasOf = actor => (actor?.items?.contents ?? []).filter(i => (i.type === "skill") && i.getFlag(SYSTEM_ID, "magic")?.id)
  .sort((a, b) => ((a._stats?.createdTime ?? 0) - (b._stats?.createdTime ?? 0)) || (a.sort - b.sort));

/**
 * What an actor's Awakening holds: the rolls made, the Magia it awakened with (null while it is open) and how many
 * rolls are left.
 * @param {Actor} actor
 * @returns {{rolls: {uuid: string, name: string, n: number, faces: number}[], chosen: string|null, left: number}}
 */
export function awakeningOf(actor) {
  const data = actor?.getFlag(SYSTEM_ID, AWAKENING_FLAG);
  const rolls = (Array.isArray(data?.rolls) ? data.rolls : []).filter(r => r?.uuid).slice(0, AWAKENING_ROLLS);
  let chosen = data?.chosen || null;
  // A character with a Magia and no Awakening at all (made before it, or by the GM) awakened with its first one; a
  // draw the GM freed is open even so
  if (!data) chosen = sourceOf(magiasOf(actor)[0]);
  return { rolls, chosen, left: chosen ? 0 : AWAKENING_ROLLS - rolls.length };
}

/** The Magias a player may have in the slot: the one it awakened with, else the ones rolled. */
export function awakeningChoices(actor) {
  const { rolls, chosen } = awakeningOf(actor);
  return chosen ? [chosen] : rolls.map(r => r.uuid);
}

/**
 * Whether an item is the Magia of the actor's Awakening (the player can't take it out of the sheet).
 * @param {Actor} actor
 * @param {Item} item
 */
export function isAwakenedMagia(actor, item) {
  if (!awakeningOn() || !item?.getFlag(SYSTEM_ID, "magic")?.id) return false;
  const { chosen } = awakeningOf(actor);
  return !!chosen && (sourceOf(item) === chosen);
}

/**
 * The Magias an actor's Awakening may draw: the whole catalog but those whose holders are full (not counting the actor
 * itself: its own rolls keep their places).
 * @param {Actor} actor
 * @returns {Promise<object[]>}
 */
export async function awakeningPool(actor) {
  return (await magicCatalog()).filter(m => !holderState(m, actor).full);
}

/** Actors rolling now (a second click waits for the first). */
const rolling = new Set();

/**
 * Roll the next Magia of an actor's Awakening: kept on the actor at once, then shown in the chat.
 * @param {Actor} actor
 * @returns {Promise<object|null>}  The roll ({ uuid, name, n, faces }), or null when there is none to make
 */
export async function rollAwakening(actor) {
  if (!actor?.isOwner || rolling.has(actor.uuid)) return null;
  const state = awakeningOf(actor);
  if (state.left <= 0) return null;
  rolling.add(actor.uuid);
  try {
    const pool = await awakeningPool(actor);
    const drawn = new Set(state.rolls.map(r => r.uuid));
    if (pool.length <= drawn.size) return null;
    let n = 0;
    let magia = null;
    // A Magia already drawn is drawn again: the three always differ
    for (let tries = 0; (!magia || drawn.has(magia.uuid)) && (tries < 200); tries++) {
      n = (await new Roll(`1d${pool.length}`).evaluate()).total;
      magia = pool[n - 1] ?? null;
    }
    if (!magia || drawn.has(magia.uuid)) return null;
    const roll = { uuid: magia.uuid, name: magia.name, n, faces: pool.length };
    await actor.setFlag(SYSTEM_ID, AWAKENING_FLAG, { rolls: [...state.rolls, roll], chosen: null });
    await announce(actor, roll, magia, state.rolls.length + 1)
      .catch(err => console.error(`${SYSTEM_ID} | Could not post the Awakening roll`, err));
    return roll;
  }
  finally {
    rolling.delete(actor.uuid);
  }
}

/**
 * The Magia the actor got in the slot of CR 1: its Awakening is closed with it (the rolls stay, for the GM to read).
 * @param {Actor} actor
 * @param {string} uuid  The Magia's compendium uuid
 */
export async function lockAwakening(actor, uuid) {
  if (!actor || !uuid || !awakeningOn()) return;
  const data = actor.getFlag(SYSTEM_ID, AWAKENING_FLAG) ?? {};
  if (data.chosen === uuid) return;
  await actor.setFlag(SYSTEM_ID, AWAKENING_FLAG, { rolls: awakeningOf(actor).rolls, chosen: uuid });
}

/**
 * The GM frees a new draw: the rolls and the Magia chosen are forgotten. The Magia stays on the sheet, no longer locked:
 * the player swaps it by making the character again, or by taking it out and filling the slot.
 */
export async function resetAwakening(actor) {
  if (!game.user.isGM || !actor) return;
  await actor.update({ [`flags.${SYSTEM_ID}.${AWAKENING_FLAG}`]: { rolls: [], chosen: null } });
}

/** The card of a roll in the chat, for everyone. */
async function announce(actor, roll, magia, index) {
  const category = categoryView(magia.category);
  const content = await foundry.applications.handlebars.renderTemplate(CARD, {
    eyebrow: L("Awakening.Chat.Eyebrow", { n: index, total: AWAKENING_ROLLS }),
    who: actor.name,
    img: magia.img,
    name: magia.name,
    tagline: magia.tagline,
    category,
    die: L("Awakening.Chat.Die", { faces: roll.faces, n: roll.n })
  });
  return ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor }), content });
}

/* -------------------------------------------- */
/*  The bar of the rolls                        */
/* -------------------------------------------- */

/**
 * What the bar of the rolls shows (templates/apps/awakening-bar.hbs): a slot for each roll, made or to make, and a
 * line on where the Awakening stands.
 * @param {Actor} actor
 * @param {object[]} magias  The Magia catalog's entries (the rolled ones' picture and category)
 * @returns {Promise<object>}
 */
export async function awakeningView(actor, magias = []) {
  const state = awakeningOf(actor);
  const faces = (await awakeningPool(actor)).length;
  const byUuid = new Map(magias.map(m => [m.uuid, m]));
  const slots = [];
  for (let i = 0; i < AWAKENING_ROLLS; i++) {
    const roll = state.rolls[i];
    if (!roll) {
      slots.push({ index: i + 1, next: !state.chosen && (i === state.rolls.length), spent: !!state.chosen });
      continue;
    }
    const category = categoryView(byUuid.get(roll.uuid)?.category ?? "caster");
    slots.push({
      index: i + 1,
      roll: {
        ...roll, categoryLabel: category.label, categoryIcon: category.icon, categoryColor: category.color,
        chosen: roll.uuid === state.chosen
      }
    });
  }
  const chosenName = state.chosen ? (byUuid.get(state.chosen)?.name ?? state.rolls.find(r => r.uuid === state.chosen)?.name ?? "") : "";
  let note;
  if (state.chosen) note = L("Awakening.Note.Locked", { name: chosenName });
  else if (!state.rolls.length) note = L("Awakening.Note.First", { faces });
  else if (state.left) note = L("Awakening.Note.Left", { n: state.left });
  else note = L("Awakening.Note.Spent");
  return { slots, locked: !!state.chosen, chosenName, left: state.left, faces, note };
}

/**
 * What the GM reads of a player's Awakening (the rolls made and the Magia kept), or null when the player never rolled.
 * @param {Actor} actor
 */
export function awakeningRecord(actor) {
  const data = actor?.getFlag(SYSTEM_ID, AWAKENING_FLAG) ?? {};
  const rolls = Array.isArray(data.rolls) ? data.rolls.filter(r => r?.uuid) : [];
  if (!rolls.length) return null;
  const names = new Intl.ListFormat(game.i18n.lang, { type: "conjunction" })
    .format(rolls.map(r => L("Awakening.GM.Roll", { name: r.name, n: r.n })));
  const chosen = data.chosen ? (rolls.find(r => r.uuid === data.chosen)?.name ?? fromUuidSync(data.chosen)?.name ?? "") : "";
  return {
    text: L("Awakening.GM.Rolls", { names }) + (chosen ? ` ${L("Awakening.GM.Chosen", { name: chosen })}` : ""),
    rolled: rolls.length
  };
}

/* -------------------------------------------- */

/** Call during the `init` hook: the Magia of the Awakening doesn't leave a player's sheet. */
export function registerAwakening() {
  Hooks.on("preDeleteItem", (item, options, userId) => {
    if ((userId !== game.user.id) || game.user.isGM || options.eterniaCreation) return;
    const actor = item.parent;
    if (!(actor instanceof Actor) || !isAwakenedMagia(actor, item)) return;
    ui.notifications.warn(L("Awakening.Locked", { name: item.name }));
    return false;
  });
}
