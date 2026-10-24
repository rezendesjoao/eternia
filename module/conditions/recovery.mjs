/**
 * Ending a status by spending an action of the Main Process ([Rigor]: a Minor or a Major Action, [Burning]: a Minor
 * Action, [Prone]: the Move Action…, see RECOVERY in catalog.mjs). In a started combat, with the action economy on,
 * it takes the first of those actions still left in the bearer's own Main Process; elsewhere the status just ends.
 * A Bad Status a hostile infinite effect holds (the Magia Infinito, conditions/lasting.mjs) takes a Major Action, and the
 * whole effect ends with it. The action HUD shows the button on the statuses that allow it.
 */
import { L, setting } from "../settings.mjs";
import { actorName, combatantOf, combatOf, postSummary } from "../helpers/utils.mjs";
import { actionsLeft, spendAction } from "../automation/use.mjs";
import { statusDefinition } from "../helpers/statuses.mjs";
import { AFFLICTED_PROTECTS, RECOVERY } from "./catalog.mjs";
import { agonyPain, freed } from "./damage.mjs";
import { has, removeStatuses } from "./rules.mjs";
import { breakFreeActions } from "./lasting.mjs";

const label = id => game.i18n.localize(`ETERNIA.StatusEffect.${id}`);
const actionLabel = action => L(`Use.Action.${action}`);

/** How a status can be ended by its bearer, for the HUD: the actions it takes ("Minor or Major Action"). */
export function recoveryOf(id, actor = null) {
  const free = breakFreeActions(actor, id);
  const actions = free ?? RECOVERY[id];
  if (!actions) return null;
  const text = L(free ? "Conditions.Recover.Infinite" : "Conditions.Recover.Hint", { actions: actions.map(actionLabel).join(L("Conditions.Recover.Or")) });
  return { actions, text };
}

/**
 * End a status with an action of the bearer's Main Process.
 * @param {Actor} actor
 * @param {string} id
 * @returns {Promise<boolean>}   Whether it ended
 */
export async function recover(actor, id) {
  const actions = breakFreeActions(actor, id) ?? RECOVERY[id];
  if (!actor?.isOwner || !actions || !has(actor, id)) return false;
  if (has(actor, "afflicted") && AFFLICTED_PROTECTS.includes(id)) {
    ui.notifications.warn(L("Conditions.Recover.Afflicted", { name: actorName(actor), status: label(id) }));
    return false;
  }
  let spent = null;
  const combat = combatOf(actor);
  const combatant = combat ? combatantOf(combat, actor) : null;
  const economy = setting("actions");
  if (combatant && economy && (economy !== "off")) {
    if ((combat.phase !== "main") || (combat.progress.active !== combatant.id)) {
      ui.notifications.warn(L("Conditions.Recover.NotYourProcess", { name: actorName(actor) }));
      return false;
    }
    const left = actionsLeft(actor) ?? {};
    spent = actions.find(action => left[action]);
    if (!spent) {
      ui.notifications.warn(L("Conditions.Recover.NoAction", { name: actorName(actor), actions: actions.map(actionLabel).join(L("Conditions.Recover.Or")) }));
      return false;
    }
    await spendAction(actor, spent);
  }
  await removeStatuses(actor, [id]);
  const lines = [spent
    ? L("Conditions.Recover.Done", { name: actorName(actor), action: actionLabel(spent), status: label(id) })
    : L("Conditions.Recover.DoneFree", { name: actorName(actor), status: label(id) })];
  freed(actor, [id], { by: "action" });
  // [Agony]: getting rid of a Bad Status hurts.
  const pain = (statusDefinition(id)?.group === "bad") ? await agonyPain(actor, { silent: true }) : null;
  if (pain) lines.push(pain.line);
  await postSummary(label(id), lines);
  return true;
}
