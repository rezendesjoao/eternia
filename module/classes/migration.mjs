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
 * Version 6, the Slayers (0.25): the Dragon Slayer's class items and Dedications take the new elements (White,
 * Shadow, Poison) in their element choice, and the Magia Matador de Deuses is the Matador de Deuses do Céu.
 * Version 7, the review of the Magias (0.26): the Magias and their spells that the characters have take their
 * compendium version again (each Magia's Trait, the spells that changed), keeping their Skill Rank and use records.
 * Version 8, the balance of 0.42 (docs/matematica.md): the class skills, Magias and spells, and the racial skills that
 * changed take their compendium version again the same way (the Skill Rank kept, up to the new maximum), and the
 * Draconic race items their HP (+16).
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

/** The classes renamed in 0.22, by identifier, and the skills renamed: with them, and the Magia of 0.25. */
const RENAMED = { monge: "Lutador", guardiao: "Centurião", comandante: "Hierofante" };
const RENAMED_SKILLS = {
  "guardiao-palavra-de-guardiao": "Palavra de Centurião",
  "matador-deuses-matador-deuses": "Matador de Deuses do Céu"
};

/** The Dragon Slayer's element choice (found by the Fire Dragon) and the elements of 0.25: White, Shadow, Poison. */
const FIRE_DRAGON = "Compendium.eternia.skills-class.Item.2LZiyVdS3eA4cfL9";
const NEW_ELEMENTS = ["vxbsKYsv0rW5pxNG", "I06j5U06avxb6mHH", "V5UtR116rb1xfxWz"]
  .map(id => `Compendium.eternia.skills-class.Item.${id}`);

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

/** The new elements in a Dragon Slayer class item's choice (after `grants`, its grants so far) or its Dedication's. */
function elementChanges(item, grants) {
  const source = item._source;
  if ((item.type === "class") && (source.system?.identifier === "matador")) {
    const list = listOf(grants ?? source.system?.grants).map(g => ({ ...g }));
    const choice = list.find(g => listOf(g?.uuids).includes(FIRE_DRAGON));
    const missing = choice ? NEW_ELEMENTS.filter(u => !listOf(choice.uuids).includes(u)) : [];
    if (!missing.length) return {};
    choice.uuids = [...listOf(choice.uuids), ...missing];
    return { "system.grants": list };
  }
  const flags = source.flags?.eternia;
  if ((item.type === "skill") && (flags?.dedication?.id === "matador") && (flags.branch === "dedication")) {
    const choice = listOf(flags.dedicationChoice);
    const missing = NEW_ELEMENTS.filter(u => !choice.includes(u));
    if (choice.length && missing.length) return { "flags.eternia.dedicationChoice": [...choice, ...missing] };
  }
  return {};
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
  }
  if (done < 6) Object.assign(update, renameChanges(item), elementChanges(item, update["system.grants"]));
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

/** The class skills (by identifier) and the racial skills (by compendium id) that changed in 0.42. */
const BALANCE_CLASS = new Set([
  "arca-arca", "arca-flecha", "arca-luz", "arca-purgar", "arco-grande-arvore-arco-grande-arvore",
  "artes-brancas-artes-brancas", "artes-negras-esfera-da-morte", "artes-negras-predacao-da-morte",
  "artes-negras-toque-da-morte", "assassino-carrasco", "assassino-contrato", "assassino-execucao",
  "assassino-machado-erguido", "berserker-dragao", "berserker-explosao", "berserker-furia-dos-ancestrais",
  "berserker-furia-imortal", "berserker-gigante", "berserker-golpe-selvagem", "berserker-ira",
  "berserker-olhos-vermelhos", "berserker-sangue-fervente", "cacador-aguia", "cacador-concentracao",
  "cacador-olhar-frio", "cacador-olho-do-ceu", "cacador-respiracao-contida", "cacador-tiro-certeiro",
  "cacador-tiro-impossivel", "caos-caos", "caos-forma", "caos-realidade", "comandante-alvo-prioritario",
  "comandante-bandeira", "comandante-clarim-de-guerra", "comandante-comando-supremo", "comandante-marechal",
  "comandante-ordem-atacar", "comandante-ponto-de-ataque", "contra-ataque-contra-ataque",
  "contra-ataque-golpe-do-rancor", "criacao-abraco-da-rainha", "criacao-criacao", "criacao-gladio-da-grande-terra",
  "criacao-martelo-duplo", "desastre-desastre", "desastre-gota-condensada", "desastre-murchar",
  "desastre-vinha-amaldicoada", "espinhos-espinhos", "fadas-brilho", "fadas-fadas", "fadas-luz", "guardiao-baluarte",
  "guardiao-golpe", "guardiao-ira-do-bastiao", "guardiao-martelo-do-bastiao", "guardiao-onda-de-choque",
  "guardiao-pedra-angular", "guardiao-retaliacao", "invocador-comando-ataque", "invocador-investida",
  "invocador-invocar", "invocador-legiao", "invocador-pacto", "invocador-pacto-eterno", "invocador-pacto-menor", "invocador-selo", "invocador-tita",
  "lampejo-faiscante", "lampejo-lampejo", "lampejo-rajada", "magoazul-alma-soberana", "magoazul-forma-perfeita",
  "magoazul-golpe-inescapavel", "magoazul-take-over", "magobranco-duas-sentencas", "magobranco-lei",
  "magobranco-lei-absoluta", "magobranco-lei-perfeita", "magobranco-reescrever", "magobranco-runa-guia",
  "magobranco-runa-sagrada", "magobranco-sentenca-final", "magonegro-classe-s", "magonegro-colapso",
  "magonegro-segunda-origem", "magovermelho-arsenal", "magovermelho-lamina-convocada", "magovermelho-panoplia",
  "matador-abismo", "matador-carma-demoniaco", "matador-demonios-arco", "matador-demonios-matador-demonios",
  "matador-deuses-matador-deuses", "matador-deuses-raio-matador-deuses-raio", "matador-lotus-carmesim",
  "matador-luz-despedacadora", "matador-mandibula", "matador-nova-sagrada", "matador-rei-dragao", "matador-segunda",
  "matador-trovao-rugente", "monge-corrente", "monge-corrente-infinita", "monge-golpe-final",
  "monge-investida-do-tigre", "monge-montanha", "monge-punho-que-atravessa", "monge-tempestade", "pictomante-arma",
  "pictomante-criatura", "pictomante-golpe-esculpido", "portao-inferno-chamado", "portao-inferno-portao-inferno",
  "portao-inferno-veneno", "samurai-bainha", "samurai-bainha-longa", "samurai-contra-saque",
  "samurai-corte-circular", "samurai-corte-do-vento", "samurai-iai", "samurai-lua", "samurai-mao-no-cabo",
  "samurai-mente-vazia", "samurai-relampago", "samurai-silencio", "sangue-demoniaco-sangue-demoniaco",
  "sol-chama-do-orgulho", "sol-espada-divina", "sol-proeminencia-louca", "sol-punho-de-helio", "sol-sol",
  "sol-sol-cruel"
]);
const BALANCE_RACIAL = new Set([
  "7E1mggdoGOD8QuPs", "IOxQ5fElUNU4QS24", "Kdh400VjaYkn8eB8", "KswX20cUPAQT9Vw5", "QQ0ddm1QULt33uY0",
  "WtNsydeBGwRNhQR2", "Z7f2hSnBS8pvguh7", "ivk6bhPxmG6y2Ak1", "k8yKSVvSM8Tx7b1M", "nM0n1Ffk1pOwjJb7",
  "sTxMEIOu32apqvt7"
]);

/** The skills of a compendium pack: by identifier (skills-class) or by id (skills-racial). */
async function packSkills(name, key) {
  const docs = await game.packs.get(`eternia.${name}`)?.getDocuments() ?? [];
  return new Map(docs.map(d => [key(d), d]));
}

/**
 * Version 8: the class and racial skills of 0.42 among these items take their compendium version again (name,
 * picture, data, flags and effects), keeping their Skill Rank (up to the new maximum) and their use record; the
 * Draconic race items take their new HP.
 * @param {Collection<Item>|Item[]} items
 * @param {Actor|null} parent
 * @param {{classes: Map<string, Item>, racial: Map<string, Item>, races: Map<string, Item>}} sources
 * @returns {Promise<number>}
 */
async function refreshBalance(items, parent, sources) {
  let count = 0;
  for (const item of items) {
    if (item.type === "race") {
      const race = sources.races.get(item._source.system?.identifier);
      // only the old +12 (a GM's own number stays)
      if (!race || (item._source.system?.hp !== 12)) continue;
      const update = { _id: item.id, "system.hp": race.system.hp, "system.description": race.system.description };
      if (parent) await parent.updateEmbeddedDocuments("Item", [update]);
      else await item.update(update);
      count++;
      continue;
    }
    if (item.type !== "skill") continue;
    const flags = item._source.flags?.eternia ?? {};
    const compendiumId = String(item._source._stats?.compendiumSource ?? "").split(".").pop();
    const source = BALANCE_CLASS.has(flags.identifier) ? sources.classes.get(flags.identifier)
      : (BALANCE_RACIAL.has(compendiumId) ? sources.racial.get(compendiumId) : null);
    if (!source) continue;
    const data = source.toObject();
    const max = Math.max(1, Number(data.system.skillRank?.max) || 1);
    const rank = Math.min(Number(item._source.system?.skillRank?.value) || 1, max);
    const eternia = { ...data.flags.eternia, ...(flags.usage ? { usage: flags.usage } : {}) };
    const update = {
      _id: item.id, name: data.name, img: data.img,
      system: { ...data.system, skillRank: { ...data.system.skillRank, value: rank } },
      flags: { ...item._source.flags, eternia: eternia }
    };
    if (parent) await parent.updateEmbeddedDocuments("Item", [update], { recursive: false, diff: false });
    else await item.update(update, { recursive: false, diff: false });
    const old = item.effects.map(e => e.id);
    if (old.length) await item.deleteEmbeddedDocuments("ActiveEffect", old);
    if (data.effects?.length) await item.createEmbeddedDocuments("ActiveEffect", data.effects, { keepId: true });
    count++;
  }
  return count;
}

/** The Magias and spells of the compendium, by identifier (read once per run). */
async function magiaSources() {
  const docs = await game.packs.get("eternia.skills-class")?.getDocuments() ?? [];
  return new Map(docs.filter(d => d.flags?.eternia?.magic || d.flags?.eternia?.magicSpell)
    .map(d => [d.flags.eternia.identifier, d]));
}

/**
 * Version 7: the Magia skills and spells among these items take their compendium version again (name, picture, data,
 * flags and effects), keeping their Skill Rank and their use record (`flags.eternia.usage`).
 * @param {Collection<Item>|Item[]} items
 * @param {Actor|null} parent
 * @param {Map<string, Item>} sources
 * @returns {Promise<number>}
 */
async function refreshMagias(items, parent, sources) {
  let count = 0;
  for (const item of items) {
    const flags = item._source.flags?.eternia ?? {};
    if ((item.type !== "skill") || !(flags.magic || flags.magicSpell)) continue;
    const source = sources.get(flags.identifier);
    if (!source) continue;
    const data = source.toObject();
    const eternia = { ...data.flags.eternia, ...(flags.usage ? { usage: flags.usage } : {}) };
    const update = {
      _id: item.id, name: data.name, img: data.img,
      system: { ...data.system, skillRank: item._source.system?.skillRank ?? data.system.skillRank },
      flags: { ...item._source.flags, eternia: eternia }
    };
    if (parent) await parent.updateEmbeddedDocuments("Item", [update], { recursive: false, diff: false });
    else await item.update(update, { recursive: false, diff: false });
    const old = item.effects.map(e => e.id);
    if (old.length) await item.deleteEmbeddedDocuments("ActiveEffect", old);
    if (data.effects?.length) await item.createEmbeddedDocuments("ActiveEffect", data.effects, { keepId: true });
    count++;
  }
  return count;
}

async function run(done) {
  let changed = 0;
  const sources = (done < 7) ? await magiaSources() : null;
  const balance = (done < 8) ? {
    classes: await packSkills("skills-class", d => d.flags?.eternia?.identifier),
    racial: await packSkills("skills-racial", d => d.id),
    races: new Map(((await game.packs.get("eternia.races-classes")?.getDocuments({ type: "race" })) ?? [])
      .filter(d => d.system.identifier === "draconic").map(d => [d.system.identifier, d]))
  } : null;
  changed += await cleanItems(game.items, null, done);
  if (sources) changed += await refreshMagias(game.items, null, sources);
  if (balance) changed += await refreshBalance(game.items, null, balance);
  for (const actor of game.actors) {
    changed += await cleanItems(actor.items, actor, done);
    if (sources) changed += await refreshMagias(actor.items, actor, sources);
    if (balance) changed += await refreshBalance(actor.items, actor, balance);
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

export const KUDEN_CLEANUP_MIGRATION = { id: "kudenCleanup", setting: "kudenCleanupVersion", version: 8, run };
