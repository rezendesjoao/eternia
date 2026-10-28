/**
 * The curse (a monster rule, docs/bestiario.md): the hits of a skill with `flags.eternia.monster = { rule: "curse",
 * statuses }` give those statuses (the Cursed Hound's bite: [Doom: 3]) with the monster as their source and
 * `flags.eternia.curseOf` (its uuid) on the effects. They last until the end of the scene, or until that very monster
 * falls (Incapacitated): then they end on everyone, with a line in the chat. Killing the one that bit is the cure; the
 * tokens of a pack look alike, and their Roman numbers tell them apart. Runs on the window that applied the damage (the
 * hit) and on the primary GM (the fall).
 */
import { L, SYSTEM_ID } from "../settings.mjs";
import { isPrimaryGM } from "../helpers/clients.mjs";
import { actorName, postSummary, toInt } from "../helpers/utils.mjs";
import { giveEffects } from "../chat/status-links.mjs";
import { rulesOn, sameActor } from "../conditions/rules.mjs";
import { statusList } from "./rust.mjs";

const label = id => game.i18n.localize(`ETERNIA.StatusEffect.${id}`);

/** The curse effects on an actor (any source). */
export const cursesOn = actor => [...(actor?.effects ?? [])].filter(e => e.getFlag(SYSTEM_ID, "curseOf"));

/** A damage card of a cursing skill was applied (on the window that applied it): the target is cursed. */
async function onDamaged(actor, card, { amount = 0, absorbed = 0, attacker = null, item = null } = {}) {
  const rule = item?.getFlag?.(SYSTEM_ID, "monster");
  if (!rulesOn() || (rule?.rule !== "curse") || card?.recovery || !actor?.isOwner || !attacker || sameActor(attacker, actor)) return;
  if ((toInt(amount) <= 0) && (toInt(absorbed) <= 0)) return;
  const { effects, names } = statusList(rule.statuses, attacker);
  if (!effects.length) return;
  for (const effect of effects) effect.flags[SYSTEM_ID].curseOf = attacker.uuid;
  if (!(await giveEffects(actor, effects))) return;
  await postSummary(item.name, [L("Bestiary.Curse.Given", { name: actorName(actor), by: actorName(attacker), statuses: names.join(", ") })]);
}

/** Every actor that may carry a curse: the world's and the unlinked tokens' of every scene. */
function everyActor() {
  const actors = [...game.actors];
  for (const scene of game.scenes) for (const token of scene.tokens) if (!token.actorLink && token.actor) actors.push(token.actor);
  return actors;
}

/** A monster fell (on the primary GM): the curses it gave end on everyone. */
async function onFall(monster) {
  const freed = [];
  for (const actor of everyActor()) {
    const mine = cursesOn(actor).filter(e => e.getFlag(SYSTEM_ID, "curseOf") === monster.uuid);
    if (!mine.length) continue;
    const ids = mine.map(e => e.id);
    const statuses = [...new Set(mine.flatMap(e => [...e.statuses]))];
    await actor.deleteEmbeddedDocuments("ActiveEffect", ids).catch(() => null);
    // The Rating field of a status kept in `bad-status` goes with its last effect
    for (const id of statuses) {
      if (!actor.effects.some(e => e.statuses.has(id)) && (toInt(foundry.utils.getProperty(actor.system, `bad-status.${id}`)) > 0)) {
        await actor.update({ [`system.bad-status.${id}`]: 0 }).catch(() => null);
      }
    }
    freed.push(`${actorName(actor)} (${statuses.map(label).join(", ")})`);
  }
  if (freed.length) await postSummary(L("Bestiary.Curse.Title"), [L("Bestiary.Curse.Ended", { name: actorName(monster), list: freed.join("; ") })]);
}

/** Call during the `init` hook. */
export function registerCurse() {
  Hooks.on("eternia.damaged", (actor, card, context) => onDamaged(actor, card, context ?? {}).catch(err => console.error(`${SYSTEM_ID} | Curse failed`, err)));
  Hooks.on("createActiveEffect", effect => {
    const actor = effect.parent;
    if (!(actor instanceof Actor) || !effect.statuses?.has("incapacitated") || !isPrimaryGM() || !rulesOn()) return;
    onFall(actor).catch(err => console.error(`${SYSTEM_ID} | Curse end failed`, err));
  });
}
