/**
 * What a class gives as the character goes up (docs/classes.md):
 * - its Path at CR 3 and its Apex at CR 10: slots of the class's `system.grants` with a `rank` (and `auto` for the
 *   Apex), offered by apps/option-grants.mjs at the rank up (apps/rank-up.mjs) and here when the CR is raised by hand;
 * - a Dedication (the multiclass) gives the other class's Lesser Motor and its skills at once
 *   (`flags.eternia.dedicationGrants`, compendium uuids), and they go away with it.
 * Which talents can be picked (requirements, Path talents, the talents a Dedication opens) is the skill browser's
 * (apps/skill-browser.mjs).
 */
import { isLocalChange } from "../helpers/clients.mjs";
import { getOption } from "../helpers/character-options.mjs";
import { createGranted, grantedBy, offerGrants } from "../apps/option-grants.mjs";

const listOf = value => (Array.isArray(value) ? value : Object.values(value ?? {}));

/** A skill of a character that gives skills when learned (a Dedication). */
const givesSkills = item => (item.type === "skill") && (item.parent instanceof Actor)
  && (item.parent.type === "character") && listOf(item.getFlag("eternia", "dedicationGrants")).length;

/** Call during the `init` hook. */
export function registerClassProgression() {
  // The CR raised by hand (not the rank up, which offers them itself before the picks).
  Hooks.on("updateActor", (actor, changes, options, userId) => {
    if (!isLocalChange(options, userId) || options.eterniaRankUp || (actor.type !== "character")) return;
    const before = options.eterniaPreviousRank;
    const now = Number(actor.system.infos?.crank) || 1;
    if ((before === undefined) || (now <= before)) return;
    const job = getOption(actor, "class");
    if (job) offerGrants(actor, job, { above: 1, withStale: false });
  });

  Hooks.on("createItem", (item, options, userId) => {
    if (!isLocalChange(options, userId) || options.eterniaMigration || !givesSkills(item)) return;
    createGranted(item.parent, item, listOf(item.getFlag("eternia", "dedicationGrants")).map(String));
  });
  Hooks.on("deleteItem", (item, options, userId) => {
    if (!isLocalChange(options, userId) || !givesSkills(item)) return;
    const ids = grantedBy(item.parent, item).map(i => i.id);
    if (ids.length) item.parent.deleteEmbeddedDocuments("Item", ids);
  });
}
