/**
 * Devouring gear (a monster rule, docs/bestiario.md): the hits of a skill with `flags.eternia.monster = { rule: "devour",
 * types }` swallow a piece of the target's gear (the Shield-Eater of the Northern Cave): the first item it wears of the
 * `types`, in that order (["shield", "armor"]), is taken off and kept inside the monster: the item stays in the
 * character's inventory, unequipped, with `flags.eternia.devoured = { by, name }` (the monster's uuid and token name),
 * and can't be worn again (the equip is refused with a warning). It comes back when that monster falls, or when the
 * combat ends: the flag goes, and the piece is worn again when nothing of its type took its place. One piece per hit.
 * Runs on the window that applied the damage (the swallow) and on the primary GM (the return).
 */
import { L, SYSTEM_ID } from "../settings.mjs";
import { isPrimaryGM } from "../helpers/clients.mjs";
import { actorName, postSummary, toInt } from "../helpers/utils.mjs";
import { rulesOn, sameActor } from "../conditions/rules.mjs";

/** What a devouring skill swallows when its rule doesn't say. */
const TYPES = ["shield", "armor"];

/** The pieces an actor has lost to a monster (any, or that one). */
export const devouredOn = (actor, by = null) => (actor?.items ?? []).filter(i => {
  const flag = i.getFlag(SYSTEM_ID, "devoured");
  return flag && (!by || (flag.by === by));
});

/** A damage card of a devouring skill was applied (on the window that applied it): a piece of the target's gear goes. */
async function onDamaged(actor, card, { amount = 0, absorbed = 0, attacker = null, item = null } = {}) {
  const rule = item?.getFlag?.(SYSTEM_ID, "monster");
  if (!rulesOn() || (rule?.rule !== "devour") || card?.recovery || !actor?.isOwner || !attacker || sameActor(attacker, actor)) return;
  if ((actor.type !== "character") || ((toInt(amount) <= 0) && (toInt(absorbed) <= 0))) return;
  const types = Array.isArray(rule.types) && rule.types.length ? rule.types : TYPES;
  let piece = null;
  for (const type of types) {
    piece = actor.items.find(i => (i.type === type) && i.system.equipped && !i.getFlag(SYSTEM_ID, "devoured"));
    if (piece) break;
  }
  if (!piece) return;
  const name = attacker.token?.name ?? attacker.name;
  await piece.update({ "system.equipped": false, [`flags.${SYSTEM_ID}.devoured`]: { by: attacker.uuid, name } }, { eterniaDevour: true });
  await postSummary(item.name, [L("Bestiary.Devour.Swallowed", { name, target: actorName(actor), piece: piece.name })]);
}

/** Give back what a monster swallowed (all of it, or what's left at the end of a combat). GM only. */
export async function giveBack(monster = null) {
  const lines = [];
  const owners = game.actors.filter(a => a.type === "character");
  for (const actor of owners) {
    for (const piece of devouredOn(actor, monster?.uuid ?? null)) {
      const kind = actor.items.some(i => (i.type === piece.type) && (i !== piece) && i.system.equipped);
      await piece.update({ [`flags.${SYSTEM_ID}.-=devoured`]: null, ...(kind ? {} : { "system.equipped": true }) }, { eterniaDevour: true });
      lines.push(L("Bestiary.Devour.Back", { piece: piece.name, target: actorName(actor) }));
    }
  }
  if (lines.length) await postSummary(L("Bestiary.Devour.Title"), lines);
}

/** Call during the `init` hook. */
export function registerDevour() {
  Hooks.on("eternia.damaged", (actor, card, context) => onDamaged(actor, card, context ?? {}).catch(err => console.error(`${SYSTEM_ID} | Devour failed`, err)));
  // A swallowed piece can't be worn
  Hooks.on("preUpdateItem", (item, changes, options) => {
    if (options.eterniaDevour || (foundry.utils.getProperty(changes, "system.equipped") !== true)) return;
    const flag = item.getFlag(SYSTEM_ID, "devoured");
    if (!flag) return;
    ui.notifications.warn(L("Bestiary.Devour.Inside", { piece: item.name, name: flag.name }));
    return false;
  });
  // The monster falls: it gives back what it swallowed
  Hooks.on("createActiveEffect", effect => {
    const actor = effect.parent;
    if (!(actor instanceof Actor) || (actor.type !== "monster") || !effect.statuses?.has("incapacitated") || !isPrimaryGM()) return;
    giveBack(actor).catch(err => console.error(`${SYSTEM_ID} | Devour return failed`, err));
  });
  // The combat ends: whatever is still inside comes back
  Hooks.on("deleteCombat", () => {
    if (isPrimaryGM()) giveBack().catch(err => console.error(`${SYSTEM_ID} | Devour return failed`, err));
  });
}
