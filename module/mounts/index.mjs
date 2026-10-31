/**
 * Mounts (Montarias): the earth dragons and whatever else a character rides (docs/montarias.md).
 *   data.mjs     the item type, the [Mounted] status and its effect, the statuses that throw a rider off
 *   state.mjs    the mounts of a character, the one it rides and its rules
 *   actions.mjs  mounting (free out of combat, the Move Action in the rounds) and dismounting, with their cards
 * The numbers of the mount ridden are read by documents/actor.mjs, its powers by content/content.mjs, the
 * Wind-Repelling Blessing by automation/use.mjs (the Dash), the sheet and the HUD show the mounts.
 */
import { SYSTEM_ID } from "../settings.mjs";
import { isLocalChange } from "../helpers/clients.mjs";
import { MOUNTED, MOUNT_TYPE, THROWN_BY, mountedEffect } from "./data.mjs";
import { mountsOf, riddenMount } from "./state.mjs";
import { dismount, mountUp, toggleMount } from "./actions.mjs";

/** A mount without its [Mounted] effect (made by hand, from an old copy) gets one. */
function onPreCreateItem(item) {
  if ((item.type !== MOUNT_TYPE) || (item._source.effects ?? []).some(e => (e.statuses ?? []).includes(MOUNTED))) return;
  item.updateSource({ effects: [...(item._source.effects ?? []), mountedEffect(game.i18n.localize(`ETERNIA.StatusEffect.${MOUNTED}`))] });
}

/** A fall, death or the ground throws the rider off (on the window that gave the status). */
function onCreateEffect(effect, options, userId) {
  if (!isLocalChange(options, userId)) return;
  const actor = effect.parent;
  if (!(actor instanceof Actor) || !riddenMount(actor)) return;
  const status = THROWN_BY.find(id => effect.statuses?.has(id));
  if (status) dismount(actor, { status }).catch(err => console.error(`${SYSTEM_ID} | Could not dismount ${actor.uuid}`, err));
}

/** One mount ridden at a time: a mount ridden by another way (its sheet) leaves the one before. */
function onUpdateItem(item, changed, options, userId) {
  if (!isLocalChange(options, userId) || options.eterniaMount || (item.type !== MOUNT_TYPE)) return;
  if (foundry.utils.getProperty(changed, "system.equipped") !== true) return;
  const actor = item.parent;
  const others = mountsOf(actor).filter(i => (i.id !== item.id) && (i.system.equipped === true));
  if (others.length) {
    actor.updateEmbeddedDocuments("Item", others.map(i => ({ _id: i.id, "system.equipped": false })), { eterniaMount: "down" })
      .catch(err => console.error(`${SYSTEM_ID} | Could not leave the other mounts of ${actor.uuid}`, err));
  }
}

/** Call during the `init` hook. */
export function registerMounts() {
  Hooks.on("preCreateItem", onPreCreateItem);
  Hooks.on("createActiveEffect", onCreateEffect);
  Hooks.on("updateItem", onUpdateItem);
}

/** For macros: game.eternia.mounts. */
export const mountsApi = {
  up: (actor, item, options) => mountUp(actor, item, options),
  down: (actor, options) => dismount(actor, options),
  toggle: (actor, item) => toggleMount(actor, item),
  ridden: riddenMount,
  of: mountsOf
};
