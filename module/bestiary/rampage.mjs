/**
 * The bloodlust (a monster rule, docs/bestiario.md): a skill with `flags.eternia.monster = { rule: "rampage" }` is the
 * blow its owner gets when it fells someone (the gnoll's). When a damage card of the owner takes another creature to
 * 0 HP (`eternia.defeated`, on the window that applied it), the GM gives the owner, standing in a started combat, one
 * more action of the skill's Timing (a Minor skill: a Minor Action) in its window of actions (conditions/window.mjs): at
 * once, until the end of the Main Process going on, and one more for each creature it fells (the snowball).
 * The skill is only used with that action: without it, automation/use.mjs asks first, as for a limit (`rampageIssues`);
 * used with an action of the Main Process all the same, the window's goes with it, so each fall gives one blow.
 */
import { L, SYSTEM_ID } from "../settings.mjs";
import { actorName, combatOf, postSummary, toInt } from "../helpers/utils.mjs";
import { parseSkillField } from "../helpers/skill-fields.mjs";
import { keyOf, openWindowOf, spendWindow, windowCovers } from "../conditions/window.mjs";
import { registerHandler, request } from "../piles/pile-socket.mjs";

/** The action a Timing spends. */
const ACTIONS = { Major: "major", Minor: "minor", Move: "move" };
const actionOf = item => ACTIONS[parseSkillField("timing", item?.system?.timing).type] ?? null;

/** Whether a skill is a bloodlust blow. */
const isRampage = item => (item?.type === "skill") && (item.getFlag?.(SYSTEM_ID, "monster")?.rule === "rampage");

/** An actor's bloodlust skills. */
const rampagesOf = actor => [...(actor?.items ?? [])].filter(isRampage);

/**
 * What keeps a bloodlust skill from being used now, in a started combat: no action of a fall to use it with.
 * @param {Item} item
 * @param {Actor} actor
 * @param {Combat|null} combat
 * @returns {string[]}
 */
export function rampageIssues(item, actor, combat) {
  if (!isRampage(item) || !combat?.started) return [];
  const action = actionOf(item);
  return (action && windowCovers(actor, combat, action)) ? [] : [L("Bestiary.RampageOnly", { skill: item.name })];
}

/** A damage card took a creature to 0 HP: whoever dealt it, with a bloodlust skill, gets its action (by the GM). */
function onDefeated(actor, card) {
  const attacker = card?.attackerUuid ? fromUuidSync(card.attackerUuid) : null;
  if (!(attacker instanceof Actor) || (attacker.uuid === actor?.uuid) || !rampagesOf(attacker).length) return;
  request("bestiaryRampage", { attackerUuid: attacker.uuid, targetUuid: actor?.uuid ?? "" })
    .catch(err => console.error(`${SYSTEM_ID} | Bloodlust failed`, err));
}

/** The GM opens the window (or widens the one open): one more action of the skill's Timing. */
async function grant({ attackerUuid, targetUuid }) {
  const actor = fromUuidSync(attackerUuid);
  const item = (actor instanceof Actor) ? rampagesOf(actor)[0] : null;
  const action = item ? actionOf(item) : null;
  const combat = action ? combatOf(actor) : null;
  if (!combat?.started || actor.statuses.has("incapacitated") || actor.statuses.has("dead")) return { ok: true };
  const window = { major: 0, minor: 0, move: 0, ...(openWindowOf(actor, combat) ?? {}), key: keyOf(combat), from: item.name };
  window[action] = toInt(window[action]) + 1;
  await actor.setFlag(SYSTEM_ID, "window", window);
  const target = targetUuid ? fromUuidSync(targetUuid) : null;
  await postSummary(item.name, [L("Bestiary.Rampage", {
    name: actorName(actor), target: actorName(target), action: L(`Window.Action.${action}`), skill: item.name
  })]);
  return { ok: true };
}

/** A bloodlust skill was used with an action of the Main Process: the window's action goes with it. */
async function onSkillUsed(item, { actor, message } = {}) {
  if (!isRampage(item) || !actor?.isOwner) return;
  const combat = combatOf(actor);
  const action = actionOf(item);
  if (!combat || !action || message?.getFlag?.(SYSTEM_ID, "usage")?.window) return;
  if (windowCovers(actor, combat, action)) await spendWindow(actor, combat, action);
}

/** Call during the `init` hook. */
export function registerRampage() {
  registerHandler("bestiaryRampage", payload => grant(payload));
  Hooks.on("eternia.defeated", onDefeated);
  Hooks.on("eternia.skillUsed", (item, context) => onSkillUsed(item, context ?? {})
    .catch(err => console.error(`${SYSTEM_ID} | Bloodlust failed`, err)));
}
