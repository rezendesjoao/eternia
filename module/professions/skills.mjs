/**
 * The skills a profession gives (the Sealer's Seal, Selar): compendium skills with `flags.eternia.profession` = the
 * profession's id, in the Common skills (`choiceOnly`, so the skill browser never offers them). A character with the
 * profession holds them; changing the profession takes them away (syncProfessionSkills, on every change of the
 * Subclass). Each use spends an attempt of the profession and gives its EXP; without the profession, or without an
 * attempt left, the use stops (automation/use.mjs asks professionSkillIssue).
 */
import { L, SYSTEM_ID } from "../settings.mjs";
import { isLocalChange } from "../helpers/clients.mjs";
import { packIndex } from "../helpers/pack-index.mjs";
import { SEAL_EXP } from "./data.mjs";
import { professionOf, record } from "./state.mjs";

/** Flag of a skill that belongs to a profession: its id. */
export const PROFESSION_SKILL = "profession";
/** The compendium of the profession skills. */
const SKILLS_PACK = `${SYSTEM_ID}.skills-common`;
/** EXP of a use of each profession skill. */
const SKILL_EXP = { sealer: SEAL_EXP };

/** The compendium entries of the profession skills. */
async function professionEntries() {
  const pack = game.packs.get(SKILLS_PACK);
  if (!pack) return { pack: null, entries: [] };
  const index = await packIndex(pack, [`flags.${SYSTEM_ID}.${PROFESSION_SKILL}`]);
  return { pack, entries: index.filter(e => foundry.utils.getProperty(e, `flags.${SYSTEM_ID}.${PROFESSION_SKILL}`)) };
}

/**
 * Give a character the skills of its profession and take away those of any other.
 * @param {Actor} actor
 * @returns {Promise<{created: number, removed: number}>}
 */
export async function syncProfessionSkills(actor) {
  const out = { created: 0, removed: 0 };
  if ((actor?.type !== "character") || !actor.isOwner) return out;
  const id = professionOf(actor)?.id ?? null;
  const own = actor.items.filter(i => (i.type === "skill") && i.getFlag(SYSTEM_ID, PROFESSION_SKILL));
  const remove = own.filter(i => i.getFlag(SYSTEM_ID, PROFESSION_SKILL) !== id).map(i => i.id);
  const { pack, entries } = await professionEntries();
  const missing = id ? entries.filter(e => (foundry.utils.getProperty(e, `flags.${SYSTEM_ID}.${PROFESSION_SKILL}`) === id)
    && !own.some(i => (i.getFlag(SYSTEM_ID, PROFESSION_SKILL) === id) && (i.name === e.name))) : [];
  if (remove.length) await actor.deleteEmbeddedDocuments("Item", remove);
  if (missing.length) {
    const docs = await Promise.all(missing.map(e => pack.getDocument(e._id)));
    const data = docs.filter(Boolean).map(doc => {
      const source = game.items.fromCompendium(doc);
      foundry.utils.setProperty(source, "_stats.compendiumSource", doc.uuid);
      return source;
    });
    if (data.length) await actor.createEmbeddedDocuments("Item", data);
  }
  out.created = missing.length;
  out.removed = remove.length;
  return out;
}

/** What stops the use of a profession skill now: another profession, or no attempt left (automation/use.mjs). */
export function professionSkillIssue(item, actor) {
  const id = item?.getFlag?.(SYSTEM_ID, PROFESSION_SKILL);
  if (!id || (actor?.type !== "character")) return null;
  const p = professionOf(actor);
  if (p?.id !== id) return L("Profession.Error.NotYourSkill", { skill: item.name, name: L(`Profession.Name.${id}`) });
  if (!p.attempts.left) return L("Profession.Error.NoAttempts");
  return null;
}

/** A profession skill was used (its card posted): one attempt and its EXP, on the user's window. */
function onSkillUsed(item, { actor } = {}) {
  const id = item?.getFlag?.(SYSTEM_ID, PROFESSION_SKILL);
  if (!id || !actor || (professionOf(actor)?.id !== id)) return;
  record(actor, { attempt: true, exp: SKILL_EXP[id] ?? 0 })
    .catch(err => console.error(`${SYSTEM_ID} | Could not record the use of ${item.name}`, err));
}

/** One sync at a time per character. */
const queues = new Map();

/** The Subclass of a character came or went (on the window that changed it): its profession skills follow. */
function onSubclass(item, options, userId) {
  if (!isLocalChange(options, userId) || (item.type !== "subclass") || !(item.parent instanceof Actor)) return;
  const actor = item.parent;
  // A new profession over another one: the old one leaves next (helpers/character-options.mjs), and that syncs
  if (actor.items.has(item.id) && (actor.itemTypes.subclass.length > 1)) return;
  const run = (queues.get(actor.uuid) ?? Promise.resolve()).then(() => syncProfessionSkills(actor))
    .catch(err => console.error(`${SYSTEM_ID} | Could not sync the profession skills of ${actor.uuid}`, err));
  queues.set(actor.uuid, run);
}

/** A character made with its items (a ready NPC from the compendium, a copy): the skills of its profession. */
function onCreateActor(actor, options, userId) {
  if (!isLocalChange(options, userId) || (actor.type !== "character") || !professionOf(actor)) return;
  syncProfessionSkills(actor).catch(err => console.error(`${SYSTEM_ID} | Could not sync the profession skills of ${actor.uuid}`, err));
}

/** Call during the `init` hook. */
export function registerProfessionSkills() {
  Hooks.on("eternia.skillUsed", onSkillUsed);
  Hooks.on("createItem", onSubclass);
  Hooks.on("deleteItem", onSubclass);
  Hooks.on("createActor", onCreateActor);
}
