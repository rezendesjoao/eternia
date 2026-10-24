/**
 * A choice inside a skill: `flags.eternia.choiceGrants` lists the identifiers (`flags.eternia.identifier`) of the
 * compendium skills it offers, and when a character gets the skill (not by a migration) the player picks one of those
 * it doesn't have yet. The skill picked remembers the one that gave it (option-grants.mjs, GRANT_FLAG) and goes away
 * with it. The skills offered carry `choiceOnly`: the skill browser and the class tab don't list them for who doesn't
 * have them. The Magia Mandamentos asks for its Decree this way, and its spell Absorver Mandamento for a second one.
 */
import { L, SYSTEM_ID } from "../settings.mjs";
import { isLocalChange } from "../helpers/clients.mjs";
import { chooseOption } from "../classes/motor.mjs";
import { createGranted, grantedBy } from "./option-grants.mjs";

const listOf = value => (Array.isArray(value) ? value : Object.values(value ?? {}));

/** The identifiers a skill offers. */
const choicesOf = item => listOf(item?.getFlag?.("eternia", "choiceGrants")).map(String).filter(Boolean);

/** A character's skill that offers a choice. */
const offers = item => (item.type === "skill") && (item.parent instanceof Actor) && (item.parent.type === "character")
  && (choicesOf(item).length > 0);

/**
 * The compendium skills of these identifiers, in that order.
 * @param {string[]} identifiers
 * @returns {Promise<{uuid: string, name: string, identifier: string}[]>}
 */
async function skillsOf(identifiers) {
  const found = new Map();
  for (const pack of game.packs) {
    if ((pack.documentName !== "Item") || !pack.visible) continue;
    const index = await pack.getIndex({ fields: ["flags.eternia.identifier"] });
    for (const e of index) {
      const id = e.flags?.eternia?.identifier;
      if ((e.type === "skill") && identifiers.includes(id) && !found.has(id)) {
        found.set(id, { uuid: e.uuid ?? pack.getUuid(e._id), name: e.name, identifier: id });
      }
    }
  }
  return identifiers.map(id => found.get(id)).filter(Boolean);
}

/** Whether an actor has a skill (same identifier, or same name). */
const owns = (actor, skill) => actor.items.some(i => (i.type === "skill")
  && ((i.flags?.eternia?.identifier === skill.identifier) || (i.name === skill.name)));

/**
 * Offer the choice of a skill: one of its skills the character doesn't have yet (nothing when the skill already gave
 * one, or there is none left). Returns the uuid given, or null.
 * @param {Actor} actor
 * @param {Item} item   The skill with `choiceGrants`
 * @returns {Promise<string|null>}
 */
export async function offerChoice(actor, item) {
  const identifiers = choicesOf(item);
  if (!identifiers.length) return null;
  const skills = await skillsOf(identifiers);
  const uuids = new Set(skills.map(s => s.uuid));
  if (grantedBy(actor, item).some(i => uuids.has(i._stats?.compendiumSource))) return null;
  const options = skills.filter(s => !owns(actor, s));
  if (!options.length) return null;
  const picked = await chooseOption(item.name, options.map(s => ({ value: s.uuid, label: s.name })), {
    hint: L("ChoiceGrants.Hint", { name: item.name }), selected: options[0].uuid
  });
  if (!picked || !options.some(s => s.uuid === picked)) return null;
  await createGranted(actor, item, [picked]);
  return picked;
}

/** Call during the `init` hook. */
export function registerChoiceGrants() {
  Hooks.on("createItem", (item, options, userId) => {
    if (!isLocalChange(options, userId) || options.eterniaMigration || options.eterniaCreation || !offers(item)) return;
    offerChoice(item.parent, item).catch(err => console.error(`${SYSTEM_ID} | Choice failed`, err));
  });
  // The skill it gave goes away with it.
  Hooks.on("deleteItem", (item, options, userId) => {
    if (!isLocalChange(options, userId) || options.eterniaCreation || !offers(item)) return;
    const ids = grantedBy(item.parent, item).map(i => i.id);
    if (ids.length) item.parent.deleteEmbeddedDocuments("Item", ids);
  });
}
