/**
 * World migration of the professions (helpers/migrations.mjs). Version 1 (1.0.1): the Bard and the Engineer left the
 * list. Their characters (and the world's Subclass items) become the Tamer and the Sealer: the Subclass taken again
 * from the compendium, the EXP of the old profession (with the attempts of its scenario) kept under the new one, a
 * work waiting at the Workshop marked with the new one. The Sealer gets its skill (professions/skills.mjs, on the
 * new Subclass). The Engineer's traps still on the scenes (Regions with `flags.eternia.trap`) leave.
 */
import { SYSTEM_ID } from "../settings.mjs";
import { toInt } from "../helpers/utils.mjs";
import { CORE_PACK, optionDataFrom } from "../helpers/character-options.mjs";

/** The professions that left, and the ones that took their places. */
export const RENAMED = { bard: "tamer", engineer: "sealer" };

/** The Subclasses of the compendium of the new professions, by identifier. */
async function sources() {
  const docs = await game.packs.get(CORE_PACK)?.getDocuments({ type: "subclass" }) ?? [];
  return new Map(docs.filter(d => Object.values(RENAMED).includes(d.system.identifier)).map(d => [d.system.identifier, d]));
}

/** The old EXP moved to the new profession (the larger one stays, when the character already had both). */
function expUpdates(actor) {
  const flags = actor._source.flags?.[SYSTEM_ID]?.professions ?? {};
  const updates = {};
  for (const [from, to] of Object.entries(RENAMED)) {
    if (!flags[from]) continue;
    if (toInt(flags[from].exp) >= toInt(flags[to]?.exp)) updates[`flags.${SYSTEM_ID}.professions.${to}`] = { ...flags[from] };
    updates[`flags.${SYSTEM_ID}.professions.-=${from}`] = null;
  }
  const pending = actor._source.flags?.[SYSTEM_ID]?.craftPending;
  if (pending && RENAMED[pending.profession]) updates[`flags.${SYSTEM_ID}.craftPending.profession`] = RENAMED[pending.profession];
  return updates;
}

/**
 * One actor: its EXP, then its Subclass (the old one out, the new one in, without the dialogs of a new profession).
 * @returns {Promise<boolean>}   Whether it changed
 */
async function migrateActor(actor, found) {
  const updates = expUpdates(actor);
  if (!foundry.utils.isEmpty(updates)) await actor.update(updates, { eterniaMigration: true });
  const old = actor.items.find(i => (i.type === "subclass") && RENAMED[i.system.identifier]);
  const source = old ? found.get(RENAMED[old.system.identifier]) : null;
  if (source) {
    await actor.deleteEmbeddedDocuments("Item", [old.id], { eterniaMigration: true });
    await actor.createEmbeddedDocuments("Item", [optionDataFrom(source)], { eterniaMigration: true });
  }
  return !foundry.utils.isEmpty(updates) || !!source;
}

async function run() {
  const found = await sources();
  if (found.size < 2) return false;
  let actors = 0;
  for (const actor of game.actors) {
    if (await migrateActor(actor, found)) actors++;
  }
  // Unlinked tokens with a Subclass of their own in their delta
  for (const scene of game.scenes) {
    for (const token of scene.tokens) {
      if (token.actorLink) continue;
      const own = (token._source.delta?.items ?? []).some(i => (i?.type === "subclass") && RENAMED[i.system?.identifier]);
      if (own && token.actor && await migrateActor(token.actor, found)) actors++;
    }
  }
  // The world's Subclass items: the new profession's data
  const items = game.items.filter(i => (i.type === "subclass") && RENAMED[i.system.identifier]);
  for (const item of items) {
    const data = optionDataFrom(found.get(RENAMED[item.system.identifier]));
    await item.update({ name: data.name, img: data.img, system: data.system }, { eterniaMigration: true });
  }
  // The Engineer's traps left on the scenes
  let traps = 0;
  for (const scene of game.scenes) {
    const ids = scene.regions.filter(r => r.getFlag(SYSTEM_ID, "trap")).map(r => r.id);
    if (ids.length) await scene.deleteEmbeddedDocuments("Region", ids);
    traps += ids.length;
  }
  if (actors || items.length || traps) console.log(`Eternia | Professions: ${actors} characters, ${items.length} items, ${traps} traps`);
  return true;
}

export const PROFESSIONS_MIGRATION = { id: "professions", setting: "professionsVersion", version: 1, run };
