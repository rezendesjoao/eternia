/**
 * World cleanup for the classes (docs/classes.md, "O que saiu do sistema").
 * Version 1, what the Kuden and the archetypes left:
 * - Conditions of the 11 types the Kuden added (skill `system.conditions` and effect `flags.eternia.conditions`):
 *   without the Kuden they would read as an "SR at least" with the old value once their sheet is saved again.
 * - The flags of its pieces (`flags.eternia.kuden` on items and actors), its tag and the scene environment
 *   (`flags.eternia.env`).
 * - The `archetype` of the class items.
 * Version 2, the class icons that left the system (a class is only the green until it has its own): the `img` of the
 * items that still point at one.
 */
const KUDEN_TYPES = new Set(["kudenResource", "kudenResourceFull", "sceneDay", "sceneNight", "sceneNoon", "sceneOpenSky",
  "sceneDarkness", "sceneMiasma", "sceneNoMiasma", "targetBossRaid", "hpAtMost"]);

/** The class icons that no longer exist, and the picture of a class without its icon. */
const OLD_ICONS = new Set(["systems/eternia/assets/icons/classes/samurai.svg"]);
const CLASS_IMG = "systems/eternia/assets/icons/classes/blank.svg";

const listOf = value => (Array.isArray(value) ? value : Object.values(value ?? {}));
const stale = list => listOf(list).some(c => KUDEN_TYPES.has(c?.type));
const kept = list => listOf(list).filter(c => !KUDEN_TYPES.has(c?.type));

/** The changes of an item, or null. */
function itemChanges(item, done) {
  const source = item._source;
  const update = {};
  if (done < 1) {
    if (source.flags?.eternia?.kuden !== undefined) update["flags.eternia.-=kuden"] = null;
    const tags = source.system?.tags ?? [];
    if (tags.includes("Kuden")) update["system.tags"] = tags.filter(t => t !== "Kuden");
    if ((item.type === "class") && ("archetype" in (source.system ?? {}))) update["system.-=archetype"] = null;
    if (stale(source.system?.conditions)) update["system.conditions"] = kept(source.system.conditions);
  }
  if (OLD_ICONS.has(source.img)) update.img = CLASS_IMG;
  return foundry.utils.isEmpty(update) ? null : update;
}

/** The effects of a document whose conditions use a Kuden type: [{ _id, "flags.eternia.conditions" }]. */
function effectChanges(doc) {
  return doc.effects.filter(e => stale(e._source.flags?.eternia?.conditions))
    .map(e => ({ _id: e.id, "flags.eternia.conditions": kept(e._source.flags.eternia.conditions) }));
}

async function cleanItems(items, parent, done) {
  const updates = [];
  for (const item of items) {
    const changes = itemChanges(item, done);
    if (changes) updates.push({ _id: item.id, ...changes });
    const effects = (done < 1) ? effectChanges(item) : [];
    if (effects.length) await item.updateEmbeddedDocuments("ActiveEffect", effects);
  }
  if (!updates.length) return 0;
  if (parent) await parent.updateEmbeddedDocuments("Item", updates);
  else await Item.updateDocuments(updates);
  return updates.length;
}

async function run(done) {
  let changed = 0;
  changed += await cleanItems(game.items, null, done);
  for (const actor of game.actors) {
    changed += await cleanItems(actor.items, actor, done);
    if (done >= 1) continue;
    const effects = effectChanges(actor);
    if (effects.length) await actor.updateEmbeddedDocuments("ActiveEffect", effects);
    if (actor._source.flags?.eternia?.kuden !== undefined) await actor.update({ "flags.eternia.-=kuden": null });
  }
  if (done < 1) {
    for (const scene of game.scenes) {
      if (scene._source.flags?.eternia?.env !== undefined) await scene.update({ "flags.eternia.-=env": null });
    }
  }
  if (changed) console.log(`Eternia | Classes cleanup: ${changed} items`);
  return true;
}

export const KUDEN_CLEANUP_MIGRATION = { id: "kudenCleanup", setting: "kudenCleanupVersion", version: 2, run };
