/**
 * Mounting and dismounting. Out of combat (and in the Briefing, before it starts) mounting is free; in the rounds of
 * a combat it takes the Move Action of the rider's Main Process. Dismounting is free. A fall, death or [Prone] throws
 * the rider off (index.mjs). Each one posts a short card, so the table reads who is on a dragon.
 */
import { L, SYSTEM_ID, setting } from "../settings.mjs";
import { actorName, combatOf, combatantOf, escape } from "../helpers/utils.mjs";
import { actionsLeft, spendAction } from "../automation/use.mjs";
import { MOUNT_TYPE, THROWN_BY } from "./data.mjs";
import { mountsOf, riddenMount } from "./state.mjs";

/** The color of the mount cards (the Tamer's, professions/data.mjs). */
const COLOR = "#7a5230";

const warn = (key, data) => {
  ui.notifications.warn(L(key, data));
  return false;
};

/** A card in the chat: the rider, the mount, and what happened. */
async function postCard(actor, item, title, lines = []) {
  const content = `<div class="eternia chat-card lhauto-card lhp-card lhm-card" style="--lhp-color: ${COLOR}">
    <header class="lhp-card-head"><img src="${escape(item.img)}" alt="${escape(item.name)}">
      <div><h3>${escape(title)}</h3><span>${escape(`${actorName(actor)} · ${item.name}`)}</span></div></header>
    ${lines.length ? `<ul class="lhp-card-lines">${lines.map(l => `<li>${escape(l)}</li>`).join("")}</ul>` : ""}
  </div>`;
  return ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor }), content, flags: { [SYSTEM_ID]: { mountCard: true } } });
}

/**
 * Ride a mount: the others the character owns are left, and in the rounds of a combat the Move Action is spent.
 * @param {Actor} actor
 * @param {Item} item              One of the actor's mounts
 * @param {object} [options]
 * @param {boolean} [options.quiet]  No card (the creation of a character, tests)
 * @returns {Promise<boolean>}     Whether the character rides it now
 */
export async function mountUp(actor, item, { quiet = false } = {}) {
  if (!actor?.isOwner || (item?.type !== MOUNT_TYPE) || (item.parent !== actor)) return false;
  if (item.system.equipped === true) return true;
  const down = THROWN_BY.find(id => actor.statuses.has(id));
  if (down) return warn("Mount.Error.Down", { name: actorName(actor), status: game.i18n.localize(`ETERNIA.StatusEffect.${down}`) });

  // In the rounds of a combat: the Move Action of the rider's Main Process (the GM may also do it out of turn)
  let spent = false;
  const combat = combatOf(actor);
  const combatant = combat ? combatantOf(combat, actor) : null;
  const economy = setting("actions");
  if (combatant && economy && (economy !== "off")) {
    const ownTurn = (combat.phase === "main") && (combat.progress.active === combatant.id);
    const move = !!(actionsLeft(actor) ?? {}).move;
    if (!game.user.isGM && !ownTurn) return warn("Mount.Error.NotYourTurn", { name: actorName(actor) });
    if (!game.user.isGM && !move) return warn("Mount.Error.NoMove", { name: actorName(actor) });
    if (ownTurn && move) {
      await spendAction(actor, "move");
      spent = true;
    }
  }
  const updates = mountsOf(actor).filter(i => (i.id !== item.id) && (i.system.equipped === true))
    .map(i => ({ _id: i.id, "system.equipped": false }));
  updates.push({ _id: item.id, "system.equipped": true });
  await actor.updateEmbeddedDocuments("Item", updates, { eterniaMount: "up" });
  if (!quiet) await postCard(actor, item, L("Mount.Card.Up", { name: actorName(actor) }), [L(spent ? "Mount.Card.UpMove" : "Mount.Card.UpFree")]);
  return true;
}

/**
 * Get off the mount ridden (free).
 * @param {Actor} actor
 * @param {object} [options]
 * @param {string} [options.status]  The status that threw the rider off
 * @param {boolean} [options.quiet]
 * @returns {Promise<boolean>}       Whether the character was riding
 */
export async function dismount(actor, { status = null, quiet = false } = {}) {
  const item = riddenMount(actor);
  if (!item || !actor.isOwner) return false;
  await actor.updateEmbeddedDocuments("Item", [{ _id: item.id, "system.equipped": false }], { eterniaMount: "down" });
  if (quiet) return true;
  const title = status
    ? L("Mount.Card.Thrown", { name: actorName(actor), status: game.i18n.localize(`ETERNIA.StatusEffect.${status}`) })
    : L("Mount.Card.Down", { name: actorName(actor) });
  await postCard(actor, item, title);
  return true;
}

/** Ride a mount, or get off it when it is the one ridden. */
export function toggleMount(actor, item) {
  return (item?.system?.equipped === true) ? dismount(actor) : mountUp(actor, item);
}
