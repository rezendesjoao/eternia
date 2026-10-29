/**
 * The Blessings (the Magia Portador de Bênçãos): the world gives its bearer the blessing it needs, when it needs it.
 * - A Trait with `adapt`: in a combat, a Bad Status that takes on the bearer gives it a blessing against that status
 *   until the end of the scene (an effect with `immune` and `immuneKeep`: the one that took stays until it ends, the
 *   next ones don't take); a blow of an element that hurts it gives a blessing against that element until the end of
 *   the scene (an effect with `halve`: that damage at half, bestiary/halve.mjs).
 * - An effect with `manaHog` (the Taboo): the spirits gather around the bearer, so the spells of its allies within 3
 *   squares roll 1d6 less damage (conditions/rolls.mjs).
 * - An effect with `hateStart` (a formula, the Taboo): everyone wants the strongest, so the bearer's Hate rises that
 *   much in the Setup Process of the first round (conditions/turns.mjs).
 * - A skill with `worthyOnly`: only against a worthy enemy, one of a CR (a monster's Rank) at least the user's
 *   (automation/use.mjs).
 * The Phoenix is an Extra Breath once per scenario (`revive.per: "scenario"`, conditions/damage.mjs); the arrows that
 * miss, `arrowWard` (conditions/passage.mjs).
 */
import { L, SYSTEM_ID } from "../settings.mjs";
import { isLocalChange } from "../helpers/clients.mjs";
import { actorName, combatOf, postSummary, toInt } from "../helpers/utils.mjs";
import { evaluateFormula, formulaData, isFormula } from "../helpers/effect-formulas.mjs";
import { statusDefinition } from "../helpers/statuses.mjs";
import { canonicalTag } from "../helpers/tag-catalog.mjs";
import { tagLabel } from "../i18n/terms.mjs";
import { crOf, rulesOn, sameActor } from "./rules.mjs";
import { immunities } from "./effects.mjs";
import { isSpell } from "./rolls.mjs";
import { sideOn } from "./blows.mjs";
import { squaresBetween } from "./passage.mjs";

/** The elements a blessing learns. */
const ELEMENTS = ["Flame", "Cold", "Shock", "Radiance", "Blight", "Holy", "Poison", "Iron", "Wind", "Water", "Psychic", "Mental"];
const HOG_REACH = 3;
const label = id => game.i18n.localize(`ETERNIA.StatusEffect.${id}`);

/** The active Traits of an actor with a key. */
const traitsWith = (actor, key) => [...(actor?.allApplicableEffects?.() ?? [])]
  .filter(e => e.active && e.getFlag(SYSTEM_ID, "trait")?.[key]);

/** The active effects of an actor with a flag of their own (a Taboo's). */
const flagged = (actor, key) => [...(actor?.allApplicableEffects?.() ?? [])].filter(e => e.active && e.getFlag(SYSTEM_ID, key));

/** The effect of a blessing (until the end of the scene). */
function blessing(actor, name, flags, img) {
  return {
    name: L("Blessings.Name", { what: name }), img, transfer: false, disabled: false,
    flags: { [SYSTEM_ID]: { ...flags, blessing: true, expires: "endOfScene", itemUse: true,
      source: { itemUuid: "", itemName: name, casterUuid: actor.uuid, useId: foundry.utils.randomID() } } }
  };
}

/** A Bad Status took on a blessed bearer (on the window that made it): a blessing against it. */
async function onCreateEffect(effect, options, userId) {
  const actor = effect.parent;
  if (!(actor instanceof Actor) || !isLocalChange(options, userId) || !rulesOn() || effect.getFlag(SYSTEM_ID, "blessing")) return;
  const trait = traitsWith(actor, "adapt")[0];
  if (!trait || !combatOf(actor)) return;
  const given = [...(effect.statuses ?? []), effect.getFlag(SYSTEM_ID, "statusData")?.statusId]
    .filter(id => id && (statusDefinition(id)?.group === "bad"));
  const immune = immunities(actor);
  const fresh = [...new Set(given)].filter(id => !immune.has(id));
  if (!fresh.length) return;
  await actor.createEmbeddedDocuments("ActiveEffect", fresh.map(id => blessing(actor, label(id),
    { immune: [id], immuneKeep: true }, statusDefinition(id)?.img ?? trait.img)));
  await postSummary(trait.name, [L("Blessings.Status", { name: actorName(actor), statuses: fresh.map(label).join(", ") })]);
}

/** A blow of an element hurt a blessed bearer (on the window that applied it): a blessing against that element. */
async function onDamaged(actor, card, { amount }) {
  if (!rulesOn() || !(amount > 0) || !actor.isOwner) return;
  const trait = traitsWith(actor, "adapt")[0];
  if (!trait || !combatOf(actor)) return;
  const known = new Set([...(actor.effects ?? [])].filter(e => e.getFlag(SYSTEM_ID, "blessing"))
    .flatMap(e => e.getFlag(SYSTEM_ID, "halve")?.tags ?? []).map(t => canonicalTag(t)));
  const elements = [...new Set((card.tags ?? []).map(t => canonicalTag(String(t))))]
    .filter(t => ELEMENTS.includes(t) && !known.has(t));
  if (!elements.length) return;
  await actor.createEmbeddedDocuments("ActiveEffect", elements.map(tag => blessing(actor, `[${tagLabel(tag)}]`,
    { halve: { tags: [tag] } }, trait.img)));
  await postSummary(trait.name, [L("Blessings.Element", { name: actorName(actor), tags: elements.map(t => `[${tagLabel(t)}]`).join(", ") })]);
}

/**
 * The dice the spirits take from a spell of an ally of a blessed bearer within 3 squares: { dice, name } or null.
 * @param {Actor} actor   Who rolls
 * @param {Item} item
 */
export function manaHog(actor, item) {
  if (!rulesOn() || !actor || !isSpell(item) || !canvas?.ready) return null;
  const own = actor.token?.object ?? actor.getActiveTokens?.(true)?.[0];
  if (!own) return null;
  for (const token of canvas.tokens.placeables) {
    const other = token.actor;
    if (!other || sameActor(other, actor) || (sideOn(other) !== sideOn(actor)) || !sideOn(actor)) continue;
    const taboo = flagged(other, "manaHog")[0];
    if (taboo && (squaresBetween(own, token) <= HOG_REACH)) return { dice: -1, name: taboo.name };
  }
  return null;
}

/**
 * The Hate the strongest starts a combat with (the Setup Process of the first round): the line, or null.
 * @param {Actor} actor
 * @param {Combat} combat
 */
export async function hateAtStart(actor, combat) {
  if (!rulesOn() || (combat?.round !== 1) || (actor.type !== "character")) return null;
  const taboo = flagged(actor, "hateStart")[0];
  if (!taboo) return null;
  const value = taboo.getFlag(SYSTEM_ID, "hateStart");
  const n = Math.max(0, (isFormula(value) ? evaluateFormula(value, formulaData(actor, taboo.sourceItem ?? null)) : toInt(value)) || 0);
  if (!n) return null;
  const hate = toInt(actor._source.system.infos?.hate) + n;
  await actor.update({ "system.infos.hate": hate });
  return L("Blessings.Hate", { name: actorName(actor), n, hate });
}

/**
 * Whether a skill that waits for a worthy enemy can be used against these targets: the issue text, or null.
 * @param {Item} item
 * @param {Actor} actor
 * @param {Token[]|null} targets
 */
export function worthyIssue(item, actor, targets) {
  if (!rulesOn() || !item?.getFlag?.(SYSTEM_ID, "worthyOnly") || !targets) return null;
  const cr = crOf(actor);
  const worthy = targets.map(t => t.actor).filter(Boolean).some(a => crOf(a) >= cr);
  return worthy ? null : L("Blessings.Unworthy", { skill: item.name, cr });
}

/** Call during the `init` hook. */
export function registerBlessings() {
  const fail = what => err => console.error(`${SYSTEM_ID} | ${what} failed`, err);
  Hooks.on("createActiveEffect", (effect, options, userId) => onCreateEffect(effect, options, userId).catch(fail("A blessing")));
  Hooks.on("eternia.damaged", (actor, card, context) => onDamaged(actor, card, context).catch(fail("A blessing")));
}
