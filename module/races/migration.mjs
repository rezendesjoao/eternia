/**
 * World migration of the races (helpers/migrations.mjs). The race item on a character is a copy: when the stages of
 * a race change in the compendium, the copies keep the old ones. Version 1 (0.33, the line of what changes in the body
 * at each stage): the race items of the world and of the characters take the stages of their compendium race again,
 * by `system.identifier`. Where the character is (`stage`, `stageBonus`, `stageLog`) stays as it was.
 */
import { SYSTEM_ID } from "../settings.mjs";

/** The races of the compendium with stages, by identifier. */
async function raceSources() {
  const docs = await game.packs.get(`${SYSTEM_ID}.races-classes`)?.getDocuments({ type: "race" }) ?? [];
  return new Map(docs.filter(d => Array.isArray(d.flags?.[SYSTEM_ID]?.stages) && !d.flags[SYSTEM_ID].retired)
    .map(d => [d.system.identifier, d]));
}

/**
 * The race items among these that take the compendium stages.
 * @param {Collection<Item>} items
 * @param {Actor|null} parent
 * @param {Map<string, Item>} sources
 * @returns {Promise<number>}
 */
async function refreshStages(items, parent, sources) {
  const updates = [];
  for (const item of items) {
    const source = (item.type === "race") ? sources.get(item.system.identifier) : null;
    if (!source) continue;
    const stages = foundry.utils.deepClone(source.flags[SYSTEM_ID].stages);
    if (foundry.utils.objectsEqual({ s: item._source.flags?.[SYSTEM_ID]?.stages ?? null }, { s: stages })) continue;
    updates.push({ _id: item.id, [`flags.${SYSTEM_ID}.stages`]: stages });
  }
  if (!updates.length) return 0;
  if (parent) await parent.updateEmbeddedDocuments("Item", updates, { eterniaMigration: true });
  else await Item.updateDocuments(updates, { eterniaMigration: true });
  return updates.length;
}

async function run() {
  const sources = await raceSources();
  if (!sources.size) return true;
  let changed = await refreshStages(game.items, null, sources);
  for (const actor of game.actors) changed += await refreshStages(actor.items, actor, sources);
  if (changed) console.log(`Eternia | Race stages: ${changed} items`);
  return true;
}

export const RACE_STAGES_MIGRATION = { id: "raceStages", setting: "raceStagesVersion", version: 1, run };
