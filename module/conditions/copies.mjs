/**
 * The copies (the Lâmina Divisora, docs/condicoes.md): what its spells and its Trait do with the [Clones] of the base
 * rule, and a skill flag any skill may use.
 *
 * - A Trait with `cloneReaction` (Cópias Reais): once per round of a combat, the first reaction spell (Before / After
 *   Check, Damage Roll, Before / After Damage) its bearer uses with at least one [Clone] is used by a copy: the use
 *   doesn't count in the spell's limit (automation/use.mjs asks copyUses before counting it). The costs are paid.
 * - An effect with `decoy` (Troca com a Cópia): the next damage card applied to its bearer hits the copy: nothing of it
 *   reaches the bearer, damage or statuses (conditions/damage.mjs asks decoyTakes); with `consumeOn: "damage"` it ends
 *   with that card.
 * - A skill with `needsStatus` (a status id): its user can't use it without that status (the limits of the conditions,
 *   conditions/actions.mjs). The Clone a swap spends is its use action `addStatus` with a negative value
 *   (conditions/effects.mjs).
 *
 * State: flags.eternia.cloneReaction = "<combat>.<round>" of the last reaction a copy used.
 */
import { L, SYSTEM_ID } from "../settings.mjs";
import { parseSkillField } from "../helpers/skill-fields.mjs";
import { actorName, combatOf, postSummary } from "../helpers/utils.mjs";
import { has, rating, rulesOn } from "./rules.mjs";

const label = id => game.i18n.localize(`ETERNIA.StatusEffect.${id}`);
const flag = (doc, key) => doc?.getFlag?.(SYSTEM_ID, key) ?? doc?.flags?.[SYSTEM_ID]?.[key];

/** The Timings of the reactions. */
const REACTIONS = new Set(["Before Check", "After Check", "Damage Roll", "Before Damage", "After Damage"]);

/** Whether an actor has an active Trait whose copies use its reactions (`cloneReaction`). */
function copiesReact(actor) {
  return [...(actor?.allApplicableEffects?.() ?? [])].some(e => e.active && flag(e, "trait")?.cloneReaction);
}

/**
 * Whether a copy uses this reaction for its user (Cópias Reais): a reaction spell, in a combat, with a [Clone], the
 * first one of the round. When it does, the round is marked and a line is posted; the use is not counted.
 * @param {Item} item
 * @param {Actor} actor
 * @returns {Promise<boolean>}
 */
export async function copyUses(item, actor) {
  if (!rulesOn() || !actor?.isOwner || !(item.system.tags ?? []).includes("Spell")) return false;
  if (!REACTIONS.has(parseSkillField("timing", item.system.timing).type)) return false;
  const combat = combatOf(actor);
  if (!combat || (rating(actor, "clones") <= 0) || !copiesReact(actor)) return false;
  const key = `${combat.id}.${combat.round}`;
  if (actor.getFlag(SYSTEM_ID, "cloneReaction") === key) return false;
  await actor.setFlag(SYSTEM_ID, "cloneReaction", key);
  await postSummary(item.name, [L("Conditions.CopyReaction", { name: actorName(actor), skill: item.name })]);
  return true;
}

/**
 * The note of a decoy that takes this damage card (Troca com a Cópia), or "": then nothing of the card reaches the
 * actor, and the decoy ends with it (`consumeOn: "damage"`).
 * @param {Actor} actor
 * @param {object} card
 * @returns {string}
 */
export function decoyTakes(actor, card) {
  if (!rulesOn() || card?.recovery) return "";
  const decoy = [...(actor?.effects ?? [])].find(e => e.active && flag(e, "decoy"));
  return decoy ? L("Conditions.Applied.Decoy", { effect: decoy.name }) : "";
}

/**
 * The issue of a skill whose user lacks the status it needs (`needsStatus`), as the conditions' use issues.
 * @param {Item} item
 * @param {Actor} actor
 * @param {string} mode   The setting of the limits
 * @returns {{text: string, mode: string}[]}
 */
export function needsIssues(item, actor, mode) {
  const id = flag(item, "needsStatus");
  if (!id || has(actor, id)) return [];
  return [{ text: L("Conditions.Use.NeedsStatus", { name: actorName(actor), status: label(id) }), mode }];
}
