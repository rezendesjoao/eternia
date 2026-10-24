/**
 * What a class gives as the character goes up (docs/classes.md):
 * - its Path at CR 3 and its Apex at CR 10: slots of the class's `system.grants` with a `rank` (and `auto` for the
 *   Apex), offered by apps/option-grants.mjs when the CR goes up (apps/rank-up.mjs, the button or a CR typed in the
 *   sheet) and here when an update skips that flow;
 * - a Dedication (the multiclass) gives the other class's Lesser Motor and its skills at once
 *   (`flags.eternia.dedicationGrants`, compendium uuids), and one skill of `flags.eternia.dedicationChoice` the player
 *   picks (the Dragon Slayer's element); they go away with it.
 * Which talents can be picked (requirements, Path talents, the talents a Dedication opens) is the skill browser's
 * (apps/skill-browser.mjs). A choice inside a skill (a Magia's: `flags.eternia.choiceGrants`) is apps/choice-grants.mjs.
 */
import { isLocalChange } from "../helpers/clients.mjs";
import { getOption } from "../helpers/character-options.mjs";
import { createGranted, grantedBy, offerGrants } from "../apps/option-grants.mjs";
import { chooseOption } from "./motor.mjs";
import { registerChoiceGrants } from "../apps/choice-grants.mjs";

const listOf = value => (Array.isArray(value) ? value : Object.values(value ?? {}));

/** A skill of a character that gives skills when learned (a Dedication). */
const givesSkills = item => (item.type === "skill") && (item.parent instanceof Actor)
  && (item.parent.type === "character")
  && (listOf(item.getFlag("eternia", "dedicationGrants")).length || listOf(item.getFlag("eternia", "dedicationChoice")).length);

/** Give a Dedication's skills: the fixed ones, then the one the player picks of its choice (if any). */
async function grantDedication(item) {
  const actor = item.parent;
  await createGranted(actor, item, listOf(item.getFlag("eternia", "dedicationGrants")).map(String));
  const choice = listOf(item.getFlag("eternia", "dedicationChoice")).map(String);
  if (!choice.length) return;
  const skills = (await Promise.all(choice.map(uuid => fromUuid(uuid).catch(() => null)))).filter(Boolean);
  if (skills.some(s => actor.items.some(i => i._stats?.compendiumSource === s.uuid))) return;
  const picked = await chooseOption(item.name, skills.map(s => ({ value: s.uuid, label: s.name })), {
    hint: game.i18n.localize("ETERNIA.Classes.DedicationChoice"), selected: skills[0]?.uuid
  });
  if (picked) await createGranted(actor, item, [picked]);
}

/** Call during the `init` hook. */
export function registerClassProgression() {
  registerChoiceGrants();
  // A CR raised without the rank-up flow (an update with `eterniaLevelFlow: false`, apps/rank-up.mjs): the flow
  // offers them itself, before the picks.
  Hooks.on("updateActor", (actor, changes, options, userId) => {
    if (!isLocalChange(options, userId) || options.eterniaRankUp || (actor.type !== "character")) return;
    const before = options.eterniaPreviousRank;
    const now = Number(actor.system.infos?.crank) || 1;
    if ((before === undefined) || (now <= before)) return;
    const job = getOption(actor, "class");
    if (job) offerGrants(actor, job, { above: 1, withStale: false });
  });

  Hooks.on("createItem", (item, options, userId) => {
    if (!isLocalChange(options, userId) || options.eterniaMigration || options.eterniaCreation || !givesSkills(item)) return;
    grantDedication(item);
  });
  Hooks.on("deleteItem", (item, options, userId) => {
    if (!isLocalChange(options, userId) || options.eterniaCreation || !givesSkills(item)) return;
    const ids = grantedBy(item.parent, item).map(i => i.id);
    if (ids.length) item.parent.deleteEmbeddedDocuments("Item", ids);
  });
}
