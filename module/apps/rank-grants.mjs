/**
 * Skills that give other skills as they rise ("each SR gives one more Blessing"): `flags.eternia.rankGrants`
 * lists the skills to choose from (compendium uuids). When the character acquires the skill or raises its SR, a
 * dialog offers one more of the list for each SR not yet used. The skills given this way remember the skill
 * that gave them (the same flag as the starting skills of a Race) and go away with it.
 */
import { GRANT_FLAG } from "./option-grants.mjs";
import { isLocalChange } from "../helpers/clients.mjs";

const { DialogV2 } = foundry.applications.api;

const sourceOf = item => item._stats?.compendiumSource ?? item.name;
const normalize = name => String(name ?? "").trim().toLowerCase();
const listOf = item => {
  const uuids = item.getFlag("eternia", "rankGrants");
  return Array.isArray(uuids) ? uuids : Object.values(uuids ?? {});
};

/** The actor already has this skill (same compendium entry or same name). */
function owns(actor, skill) {
  return actor.items.some(i => (i.type === "skill")
    && ((i._stats?.compendiumSource === skill.uuid) || (normalize(i.name) === normalize(skill.name))));
}

/** Skills of the actor given by this skill. */
function givenBy(actor, item) {
  const source = sourceOf(item);
  return actor.items.filter(i => {
    const flag = i.getFlag("eternia", GRANT_FLAG);
    return (flag?.type === "skill") && (flag.source === source);
  });
}

/**
 * Offer the skills a skill still owes at its SR, one dialog per skill.
 * @param {Actor} actor
 * @param {Item} item   The skill with `flags.eternia.rankGrants`
 */
export async function offerRankGrants(actor, item) {
  const uuids = listOf(item);
  if (!uuids.length) return;
  const sr = Number(item.system.skillRank?.value) || 1;
  while (givenBy(actor, item).length < sr) {
    const skills = (await Promise.all(uuids.map(uuid => fromUuid(uuid).catch(() => null))))
      .filter(skill => skill && !owns(actor, skill));
    if (!skills.length) return;
    const options = skills.map((s, i) => ({ uuid: s.uuid, name: s.name, img: s.img, checked: i === 0 }));
    const content = await foundry.applications.handlebars.renderTemplate(
      "systems/eternia/templates/apps/option-grants.hbs",
      {
        item, stale: [],
        hint: game.i18n.format("ETERNIA.RankGrants.Hint", { name: item.name, n: sr - givenBy(actor, item).length }),
        slots: [{ index: 0, choice: true, options }]
      }
    );
    const data = await DialogV2.wait({
      window: { title: game.i18n.format("ETERNIA.RankGrants.Title", { name: item.name }), icon: "fa-solid fa-book-atlas" },
      classes: ["eternia", "option-grants"],
      position: { width: 420 },
      content,
      buttons: [
        {
          action: "add",
          label: "ETERNIA.RankGrants.Add",
          icon: "fa-solid fa-check",
          default: true,
          callback: (event, button) => new foundry.applications.ux.FormDataExtended(button.form).object
        },
        { action: "skip", label: "ETERNIA.CharacterOptions.Grants.Skip", icon: "fa-solid fa-xmark" }
      ],
      rejectClose: false
    });
    const uuid = (data && (typeof data === "object")) ? data.slot0 : null;
    const skill = (typeof uuid === "string") ? await fromUuid(uuid) : null;
    if (!skill) return;
    const skillData = skill.toObject();
    delete skillData._id;
    delete skillData.folder;
    delete skillData.sort;
    delete skillData.ownership;
    foundry.utils.setProperty(skillData, "_stats.compendiumSource", skill.uuid);
    foundry.utils.setProperty(skillData, `flags.eternia.${GRANT_FLAG}`, { type: "skill", source: sourceOf(item) });
    await actor.createEmbeddedDocuments("Item", [skillData]);
  }
}

/** Call during the `init` hook. */
export function registerRankGrants() {
  const ofCharacter = item => (item.type === "skill") && (item.parent instanceof Actor)
    && (item.parent.type === "character") && listOf(item).length;
  Hooks.on("createItem", (item, options, userId) => {
    if (!isLocalChange(options, userId) || options.eterniaMigration || options.eterniaCreation || !ofCharacter(item)) return;
    offerRankGrants(item.parent, item);
  });
  Hooks.on("updateItem", (item, changes, options, userId) => {
    if (!isLocalChange(options, userId) || !ofCharacter(item)) return;
    if (!foundry.utils.hasProperty(changes, "system.skillRank.value")) return;
    offerRankGrants(item.parent, item);
  });
  // The skills it gave go away with it.
  Hooks.on("deleteItem", (item, options, userId) => {
    if (!isLocalChange(options, userId) || options.eterniaCreation || !ofCharacter(item)) return;
    const ids = givenBy(item.parent, item).map(i => i.id);
    if (ids.length) item.parent.deleteEmbeddedDocuments("Item", ids);
  });
}
