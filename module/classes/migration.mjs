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
 * Version 3, the class emblems (tools/make-class-icons.mjs): the class items and the Dedications of the system's
 * classes that still have the blank picture (or the old icon) take their emblem.
 * Version 4, the Summoner became a magic class (0.13): its class items without the Magia slots take them (CR 1, 5 and
 * 10, after the kit), so the characters that already have it can choose their Magias.
 * Version 5, the 14 classes (0.22): the Monk, the Guardian and the Commander are the Lutador, the Centurião and the
 * Hierofante (the class items, the Dedications with their flag, the skill browser finds the class by its name, and the
 * Palavra de Guardião); the physical classes take their Magia slots (CR 1 and 10) and the Dragon Slayer its own (CR 5
 * and 10).
 */
const KUDEN_TYPES = new Set(["kudenResource", "kudenResourceFull", "sceneDay", "sceneNight", "sceneNoon", "sceneOpenSky",
  "sceneDarkness", "sceneMiasma", "sceneNoMiasma", "targetBossRaid", "hpAtMost"]);

/** The class icons that no longer exist, and the picture of a class without its icon. */
const OLD_ICONS = new Set(["systems/eternia/assets/icons/classes/samurai.svg"]);
const CLASS_IMG = "systems/eternia/assets/icons/classes/blank.svg";

/** The classes with an emblem: assets/icons/classes/<id>.svg, and <id>-dedicacao.svg for their Dedication. */
const EMBLEMS = new Set(["assassino", "berserker", "cacador", "comandante", "druida", "estrategista", "feiticeiro",
  "guardiao", "invocador", "menestrel", "monge", "oraculo", "ressonante", "sacerdote", "samurai", "tecelao"]);
const emblem = id => `systems/eternia/assets/icons/classes/${id}.svg`;

/** The emblem an item of a class (or of its Dedication) takes, or null. */
function emblemOf(item) {
  const source = item._source;
  if ((item.type === "class") && EMBLEMS.has(source.system?.identifier)) return emblem(source.system.identifier);
  const dedication = source.flags?.eternia?.dedication?.id;
  if ((item.type === "skill") && EMBLEMS.has(dedication)) return emblem(`${dedication}-dedicacao`);
  return null;
}

const listOf = value => (Array.isArray(value) ? value : Object.values(value ?? {}));
const stale = list => listOf(list).some(c => KUDEN_TYPES.has(c?.type));
const kept = list => listOf(list).filter(c => !KUDEN_TYPES.has(c?.type));

/** The classes that took Magia slots after they existed, and the Character Ranks of the slots. */
const MAGIC_CLASSES = {
  invocador: [1, 5, 10],
  assassino: [1, 10], berserker: [1, 10], cacador: [1, 10], comandante: [1, 10], guardiao: [1, 10], monge: [1, 10],
  samurai: [1, 10],
  matador: [5, 10]
};

/** The classes renamed in 0.22, by identifier, and the class skill renamed with them. */
const RENAMED = { monge: "Lutador", guardiao: "Centurião", comandante: "Hierofante" };
const RENAMED_SKILLS = { "guardiao-palavra-de-guardiao": "Palavra de Centurião" };

/** The grants of a class item without the Magia slots of its class, with them after the kit; or null. */
function magicGrants(item) {
  const source = item._source;
  const ranks = (item.type === "class") ? MAGIC_CLASSES[source.system?.identifier] : null;
  if (!ranks) return null;
  const grants = listOf(source.system?.grants);
  if (grants.some(g => g?.magic)) return null;
  return [...grants.filter(g => !g?.rank), ...ranks.map(rank => ({ rank, magic: true })), ...grants.filter(g => g?.rank)];
}

/** The new names of a renamed class's item, Dedication or skill. */
function renameChanges(item) {
  const source = item._source;
  const update = {};
  const name = (item.type === "class") ? RENAMED[source.system?.identifier] : null;
  if (name && (source.name !== name)) update.name = name;
  const dedication = source.flags?.eternia?.dedication;
  const renamed = (item.type === "skill") ? RENAMED[dedication?.id] : null;
  if (renamed && (source.flags?.eternia?.branch === "dedication") && (dedication.name !== renamed)) {
    update.name = `Dedicação: ${renamed}`;
    update["flags.eternia.dedication.name"] = renamed;
  }
  const skill = (item.type === "skill") ? RENAMED_SKILLS[source.flags?.eternia?.identifier] : null;
  if (skill && (source.name !== skill)) update.name = skill;
  return update;
}

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
  if (OLD_ICONS.has(source.img) || (source.img === CLASS_IMG)) update.img = emblemOf(item) ?? update.img;
  if (update.img === source.img) delete update.img;
  if (done < 5) {
    const grants = magicGrants(item);
    if (grants) update["system.grants"] = grants;
    Object.assign(update, renameChanges(item));
  }
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

export const KUDEN_CLEANUP_MIGRATION = { id: "kudenCleanup", setting: "kudenCleanupVersion", version: 5, run };
