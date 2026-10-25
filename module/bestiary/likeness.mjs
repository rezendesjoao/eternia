/**
 * Taking a face (a monster rule, docs/bestiario.md): a skill with `flags.eternia.monster = { rule: "copy", dice }`
 * takes, when used, the face and the name of the creature it targets, which must be engaged with its user or right
 * next to it (the touch, as the Close reach counts it). The user's token becomes that one's: the picture, the name, the
 * size, the ring and the side of the border (a character's copy is on the characters' side, for the system too), and
 * its next damage has +`dice`d6 (1: nobody guards against a friend). The copy lasts until it takes another face, falls
 * (Incapacitated or Dead) or becomes [Identified]; then its own look comes back, and the chat says who it was.
 * State (the token's flags): likeness = { original, from, name }, `original` being the look it had before the first copy.
 */
import { L, SYSTEM_ID } from "../settings.mjs";
import { isPrimaryGM } from "../helpers/clients.mjs";
import { postSummary, toInt } from "../helpers/utils.mjs";
import { tokenOf } from "./blink.mjs";

const FLAG = "likeness";

/** The monster rule of a skill, or null. */
const ruleOf = item => item?.getFlag?.(SYSTEM_ID, "monster") ?? null;

/** What a token looks like: what a copy takes and gives back. */
function lookOf(token) {
  const source = token._source;
  return {
    name: source.name,
    texture: foundry.utils.deepClone(source.texture),
    width: source.width,
    height: source.height,
    ring: foundry.utils.deepClone(source.ring),
    disposition: source.disposition,
    displayName: source.displayName,
    displayBars: source.displayBars
  };
}

/** Whether two tokens touch: they share a square, or stand side by side or corner to corner. */
function touching(a, b) {
  const size = a.parent.grid.size;
  const box = t => {
    const i = Math.round(t._source.x / size), j = Math.round(t._source.y / size);
    return { i0: i, j0: j, i1: i + Math.max(1, toInt(t._source.width)) - 1, j1: j + Math.max(1, toInt(t._source.height)) - 1 };
  };
  const p = box(a), q = box(b);
  const gap = (lo1, hi1, lo2, hi2) => Math.max(0, lo1 - hi2, lo2 - hi1);
  return Math.max(gap(p.i0, p.i1, q.i0, q.i1), gap(p.j0, p.j1, q.j0, q.j1)) <= 1;
}

/** The copy a token wears now, or null. */
export const likenessOf = token => token?.getFlag?.(SYSTEM_ID, FLAG) ?? null;

/**
 * A token takes the look of another (the first look it had is kept, to come back to).
 * @param {TokenDocument} token
 * @param {TokenDocument} from
 */
export async function copyLook(token, from) {
  const original = likenessOf(token)?.original ?? lookOf(token);
  await token.update({ ...lookOf(from), [`flags.${SYSTEM_ID}.${FLAG}`]: { original, from: from.uuid, name: from.name } });
}

/**
 * A token gets its own look back. Returns the name it wore, or null when it wore none.
 * @param {TokenDocument} token
 */
export async function restoreLook(token) {
  const likeness = likenessOf(token);
  if (!likeness) return null;
  await token.update({ ...likeness.original, [`flags.${SYSTEM_ID}.-=${FLAG}`]: null });
  return likeness.name;
}

/** Its own look back, with the line in the chat (for everyone: the group finds out). */
async function unmask(token, why) {
  const worn = await restoreLook(token);
  if (worn) await postSummary(token.name, [L(`Bestiary.Copy.Back${why}`, { name: token.name, worn })]);
}

/**
 * A skill that takes a face was used (on the window of its user): the face of its target, if it touches the user.
 * @param {Item} item
 * @param {Actor} actor
 * @param {TokenDocument[]} targets   The user's targets when it was used
 */
async function takeFace(item, actor, targets) {
  const rule = ruleOf(item);
  const token = tokenOf(actor);
  if (!token) return;
  const target = targets.find(t => (t !== token) && (t.parent === token.parent));
  if (!target) return ui.notifications.warn(L("Bestiary.Copy.NoTarget", { skill: item.name }));
  if (!touching(token, target)) return ui.notifications.warn(L("Bestiary.Copy.Far", { skill: item.name, target: target.name }));
  const before = token.name;
  await copyLook(token, target);
  const dice = Math.max(0, toInt(rule.dice ?? 1));
  if (dice) {
    // No icon on the token: the copy would show it
    await actor.createEmbeddedDocuments("ActiveEffect", [{
      name: item.name, img: item.img, type: "base", transfer: false, disabled: false, showIcon: CONST.ACTIVE_EFFECT_SHOW_ICON?.NEVER ?? 0,
      system: { changes: [{ key: "eternia.roll.damage.dice", type: "add", value: String(dice), phase: "initial", priority: null }] },
      flags: { [SYSTEM_ID]: { consumeOn: "attack", expires: "endOfScene" } }
    }]);
  }
  // Only the GM learns who took whose face: the table sees two of the same
  await postSummary(item.name, [], [L("Bestiary.Copy.Done", { name: before, target: target.name, dice })]);
}

/** Whether an effect that came brings a copy to its end: the fall, or the [Identified] that sees through it. */
function endsCopy(effect) {
  if (effect.statuses?.has("identified")) return "Identified";
  if (effect.statuses?.has("incapacitated") || effect.statuses?.has("dead")) return "Fell";
  return null;
}

/** Call during the `init` hook. */
export function registerLikeness() {
  Hooks.on("eternia.skillUsed", (item, context) => {
    if ((ruleOf(item)?.rule !== "copy") || !context?.actor?.isOwner) return;
    const targets = [...(game.user.targets ?? [])].map(t => t.document).filter(Boolean);
    takeFace(item, context.actor, targets).catch(err => console.error(`${SYSTEM_ID} | Taking a face failed`, err));
  });
  Hooks.on("createActiveEffect", effect => {
    const actor = effect.parent;
    const why = (actor instanceof Actor) ? endsCopy(effect) : null;
    if (!why || !isPrimaryGM()) return;
    for (const token of new Set([actor.token, ...actor.getActiveTokens(false, true)].filter(Boolean))) {
      if (likenessOf(token)) unmask(token, why).catch(err => console.error(`${SYSTEM_ID} | The face could not come back`, err));
    }
  });
  // The combat tracker keeps the name and the picture a combatant had: a token that changes face shows the new one
  Hooks.on("updateToken", (token, changes) => {
    if (!("name" in changes) && !("texture" in changes)) return;
    const combatants = game.combats.contents.flatMap(c => c.combatants.filter(cb => (cb.tokenId === token.id) && (cb.sceneId === token.parent?.id)));
    if (!combatants.length) return;
    for (const combatant of combatants) combatant.reset();
    ui.combat?.render();
  });
}
