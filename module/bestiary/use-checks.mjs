/**
 * The bestiary's checks on using a skill (read by automation/use.mjs, next to the troop's targets): a monster that only
 * attacks the nearest (bestiary/nearest.mjs), the Major Actions of the heads (bestiary/heads.mjs), a monster inside
 * someone (bestiary/possess.mjs) and one that spares whoever bows (bestiary/bow.mjs). Each issue comes with the mode of its setting: the conditions' limits, and the action
 * economy for the heads.
 */
import { setting } from "../settings.mjs";
import { limitsMode, rulesOn } from "../conditions/rules.mjs";
import { nearestIssues } from "./nearest.mjs";
import { headsIssues } from "./heads.mjs";
import { possessIssues } from "./possess.mjs";
import { bowIssues } from "./bow.mjs";

/**
 * The issues the bestiary's rules raise against a monster using a skill now.
 * @param {Item} item
 * @param {Actor} actor
 * @param {object} [context]
 * @param {Token[]|null} [context.targets]   The user's targets (known when the skill is used, not in the HUD)
 * @param {Combat|null} [context.combat]
 * @returns {{text: string, mode: string, kind: string}[]}
 */
export function monsterUseIssues(item, actor, { targets = null, combat = null } = {}) {
  if ((actor?.type !== "monster") || !rulesOn()) return [];
  const issues = [];
  const limits = limitsMode();
  if (limits !== "off") {
    for (const text of [...possessIssues(actor), ...nearestIssues(item, actor, targets), ...bowIssues(item, actor, targets)]) issues.push({ text, mode: limits, kind: "condition" });
  }
  const actions = setting("actions");
  if (actions && (actions !== "off")) {
    for (const text of headsIssues(item, actor, combat)) issues.push({ text, mode: actions, kind: "action" });
  }
  return issues;
}
