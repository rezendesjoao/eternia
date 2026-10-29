/**
 * The Rewind (the Magia Retrocesso): a body goes back to how it was at the start of the round.
 *
 * - The picture of the round: in the Setup Process of a combat with someone who has a Trait with `rewind`, the primary
 *   GM keeps, for every combatant, its HP, its Bad Statuses and whether it was down, in the combat's
 *   `flags.eternia.rewind = { round, actors: [{ uuid, hp, bad, down }] }` (a list: the uuids have dots, which flag keys
 *   would nest on).
 * - The use action `rewind` (on the actor's owner, or the GM): the HP comes back up to the picture's (never down), the
 *   Bad Statuses that came after it end, and one that fell this round ([Incapacitated], [Dying]) stands up with the HP
 *   of the picture. The dead stay dead (only the living rewind). Out of a combat, the body goes back to whole: all the
 *   HP and no Bad Status.
 * - [Hourglass] (`hourglass`): a skill with `hourglass: n` adds n when used, up to 3 (eternia.skillUsed, on the user's
 *   window). Used when the hourglass is already full, the power overflows: everyone within 3 squares of the user,
 *   enemies too, is rewound, the user falls [Asleep] and the hourglass empties. A skill with `overflow: true` always
 *   overflows (Antes de Existir).
 */
import { L, SYSTEM_ID } from "../settings.mjs";
import { request } from "../piles/pile-socket.mjs";
import { isPrimaryGM } from "../helpers/clients.mjs";
import { actorName, combatActors, combatOf, postSummary, toInt } from "../helpers/utils.mjs";
import { statusDefinition } from "../helpers/statuses.mjs";
import { has, rating, removeStatuses, rulesOn, sameActor } from "./rules.mjs";
import { registerUseAction } from "./effects.mjs";
import { realmReach } from "./realm.mjs";
import { freed } from "./damage.mjs";

const FLAG = "rewind";
const HOURGLASS_FULL = 3;
const OVERFLOW_REACH = 3;
const label = id => game.i18n.localize(`ETERNIA.StatusEffect.${id}`);

/** The Bad Statuses an actor has now (the plain ones and those with a Rating). */
const badOf = actor => [...(actor?.statuses ?? [])].filter(id => statusDefinition(id)?.group === "bad");

/** Whether an actor is down: [Incapacitated] or [Dying]. */
const isDown = actor => actor.statuses.has("incapacitated") || (toInt(actor.system?.["bad-status"]?.dying) > 0);

/** Whether someone in the combat rewinds (a Trait with `rewind`). */
function rewinds(combat) {
  return combatActors(combat).some(a => [...(a.allApplicableEffects?.() ?? [])].some(e => e.active && e.getFlag(SYSTEM_ID, "trait")?.rewind));
}

/** The Setup Process (primary GM): the picture of the round. */
async function onCombatPhase(combat, current, previous, { repeat = false } = {}) {
  if (repeat || (current?.phase !== "setup") || !isPrimaryGM() || !rulesOn()) return;
  if (previous && (current.round < previous.round)) return;
  if (!rewinds(combat)) return;
  const actors = [];
  for (const actor of combatActors(combat)) {
    if (actor.statuses.has("dead")) continue;
    actors.push({ uuid: actor.uuid, hp: toInt(actor.system.health?.value), bad: badOf(actor), down: isDown(actor) });
  }
  await combat.setFlag(SYSTEM_ID, FLAG, { round: current.round, actors });
}

/** The picture of an actor in its combat's round, or null. */
function pictureOf(actor) {
  const combat = combatOf(actor);
  const data = combat?.getFlag(SYSTEM_ID, FLAG);
  if (!data || (data.round !== combat.round)) return null;
  return (Array.isArray(data.actors) ? data.actors : []).find(a => a.uuid === actor.uuid) ?? null;
}

/**
 * Rewind one actor (by its owner): the use action `rewind`. Returns the chat line, or null.
 * @param {Actor} actor
 */
export async function rewindActor(actor) {
  if (!actor || actor.statuses.has("dead")) return actor ? L("Rewind.Dead", { name: actorName(actor) }) : null;
  const max = toInt(actor.system.health?.max);
  const hp = toInt(actor.system.health?.value);
  const picture = pictureOf(actor);
  // Out of a combat (or before the first picture): whole again
  const target = picture ?? { hp: max, bad: [], down: false };
  const gained = badOf(actor).filter(id => !target.bad.includes(id) && !["incapacitated", "dying"].includes(id));
  const down = isDown(actor);
  const rises = down && !target.down;
  const next = Math.min(max, Math.max(hp, toInt(target.hp), rises ? 1 : 0));
  const updates = {};
  if (next !== hp) updates["system.health.value"] = next;
  if (rises && (toInt(actor.system["bad-status"]?.dying) > 0)) updates["system.bad-status.dying"] = 0;
  if (!foundry.utils.isEmpty(updates)) await actor.update(updates);
  if (gained.length) {
    await removeStatuses(actor, gained);
    freed(actor, gained);
  }
  if (rises && actor.statuses.has("incapacitated") && (next > 0)) await actor.toggleStatusEffect("incapacitated", { active: false });
  if ((next === hp) && !gained.length && !rises) return L("Rewind.Nothing", { name: actorName(actor) });
  return L(rises ? "Rewind.Rose" : "Rewind.Back", {
    name: actorName(actor), hp: next, statuses: gained.length ? gained.map(label).join(", ") : "—"
  });
}

/** Rewind an actor wherever it is owned. */
async function rewindAnywhere(actor, caster) {
  if (actor.isOwner) return rewindActor(actor);
  return (await request("conditionAction", { actorUuid: actor.uuid, casterUuid: caster?.uuid ?? "", type: "rewind", value: 0 }))?.line ?? null;
}

/** A skill that turns the hourglass was used (on the user's window): it fills, or overflows. */
async function onSkillUsed(item, { actor }) {
  const gain = toInt(item.getFlag?.(SYSTEM_ID, "hourglass"));
  const always = !!item.getFlag?.(SYSTEM_ID, "overflow");
  if (!rulesOn() || !actor?.isOwner || (!gain && !always)) return;
  const before = rating(actor, "hourglass");
  if (!always && (before < HOURGLASS_FULL)) {
    const after = Math.min(HOURGLASS_FULL, before + gain);
    if (after !== before) await actor.update({ "system.bad-status.hourglass": after });
    if (after >= HOURGLASS_FULL) await postSummary(label("hourglass"), [L("Rewind.Full", { name: actorName(actor) })]);
    return;
  }
  // The overflow: everyone around, the enemies too; then the user sleeps and the hourglass empties
  const lines = [L("Rewind.Overflow", { name: actorName(actor) })];
  const reach = realmReach(actor, OVERFLOW_REACH, canvas?.scene ?? null);
  for (const other of [...reach.allies, ...reach.enemies]) {
    if (sameActor(other, actor)) continue;
    const line = await rewindAnywhere(other, actor);
    if (line) lines.push(line);
  }
  await removeStatuses(actor, ["hourglass"]);
  if (!has(actor, "asleep")) await actor.toggleStatusEffect("asleep", { active: true });
  lines.push(L("Rewind.Asleep", { name: actorName(actor) }));
  await postSummary(label("hourglass"), lines);
}

/** Call during the `init` hook. */
export function registerRewind() {
  const fail = what => err => console.error(`${SYSTEM_ID} | ${what} failed`, err);
  Hooks.on("eternia.combatPhase", (combat, current, previous, context) => onCombatPhase(combat, current, previous, context)
    .catch(fail("The picture of the round")));
  Hooks.on("eternia.skillUsed", (item, context) => onSkillUsed(item, context).catch(fail("The hourglass")));
  registerUseAction("rewind", actor => rewindActor(actor));
}
