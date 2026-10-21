/**
 * [Hate Top] / [Hate Under] per combat (Rules IV.b HATE).
 *
 * The system works them out from the combat each client is viewing, so with several combats at once
 * a character outside the viewed one loses the +2 to its Dodge Check and Hate Damage stops. Here the
 * GM's window keeps the two statuses on every character of every started combat, which the system
 * reads first (hateRank in effect-conditions.mjs): the same answer on every client, and players see
 * who is [Hate Top] on the tokens.
 *
 * Highest Hate among the characters still fighting = [Hate Top] (ties included); the others are
 * [Hate Under]. Incapacitated and Dead characters have neither, nor characters outside any combat.
 */
import { SYSTEM_ID, setting } from "../settings.mjs";
import { isPrimaryGM } from "../helpers/clients.mjs";
import { combatActors, fightsIn, toInt } from "../helpers/utils.mjs";

const STATUSES = ["hateTop", "hateUnder"];

/** Combats waiting to be worked out (several changes in a row count once). */
const pending = new Map();

const active = () => setting("hatePerCombat") && isPrimaryGM();

/** The started combats an actor fights in. */
const combatsOf = actor => game.combats.filter(c => c.started && fightsIn(c, actor));

function schedule(combat) {
  if (!combat) return;
  clearTimeout(pending.get(combat.id));
  pending.set(combat.id, setTimeout(() => {
    pending.delete(combat.id);
    refresh(combat).catch(err => console.error(`${SYSTEM_ID} | Could not work out the Hate of ${combat.id}`, err));
  }, 150));
}

/**
 * Set [Hate Top] / [Hate Under] (or neither) on an actor.
 * @param {Actor} actor
 * @param {"hateTop"|"hateUnder"|null} wanted
 */
export async function setHateStatus(actor, wanted) {
  for (const id of STATUSES) {
    const on = id === wanted;
    if (actor.statuses.has(id) !== on) await actor.toggleStatusEffect(id, { active: on });
  }
}

/** Work out the Hate statuses of one combat's characters. */
async function refresh(combat) {
  if (!game.combats.has(combat.id)) return;
  const characters = combatActors(combat).filter(a => a.type === "character");
  if (!combat.started) {
    for (const actor of characters) if (!combatsOf(actor).length) await setHateStatus(actor, null);
    return;
  }
  const fighting = characters.filter(a => !a.statuses.has("incapacitated") && !a.statuses.has("dead"));
  const hate = actor => toInt(actor.system.infos?.hate);
  const top = fighting.length ? Math.max(...fighting.map(hate)) : 0;
  for (const actor of characters) {
    const wanted = fighting.includes(actor) ? ((hate(actor) >= top) ? "hateTop" : "hateUnder") : null;
    await setHateStatus(actor, wanted);
  }
}

/** A combat ended: its characters lose the statuses, unless they fight in another one. */
async function clear(combat) {
  for (const actor of combatActors(combat)) {
    if ((actor.type !== "character") || combatsOf(actor).some(c => c.id !== combat.id)) continue;
    await setHateStatus(actor, null);
  }
}

/** Call during the `init` hook. */
export function registerHate() {
  Hooks.on("updateActor", (actor, changes) => {
    if (!active() || !foundry.utils.hasProperty(changes, "system.infos.hate")) return;
    for (const combat of combatsOf(actor)) schedule(combat);
  });
  for (const hook of ["createActiveEffect", "deleteActiveEffect"]) {
    Hooks.on(hook, effect => {
      if (!active() || !(effect.statuses?.has("incapacitated") || effect.statuses?.has("dead"))) return;
      const actor = effect.parent;
      if (actor instanceof Actor) for (const combat of combatsOf(actor)) schedule(combat);
    });
  }
  Hooks.on("createCombatant", combatant => active() && schedule(combatant.parent));
  Hooks.on("deleteCombatant", combatant => {
    if (!active()) return;
    const actor = combatant.actor;
    schedule(combatant.parent);
    if ((actor?.type === "character") && !combatsOf(actor).length) {
      setHateStatus(actor, null).catch(err => console.error(`${SYSTEM_ID} | Could not clear the Hate statuses`, err));
    }
  });
  Hooks.on("updateCombat", (combat, changes) => {
    if (active() && ("round" in changes)) schedule(combat);
  });
  Hooks.on("deleteCombat", combat => {
    if (!active()) return;
    clearTimeout(pending.get(combat.id));
    pending.delete(combat.id);
    clear(combat).catch(err => console.error(`${SYSTEM_ID} | Could not clear the Hate statuses`, err));
  });
}
