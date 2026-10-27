/**
 * World migration of the Empire's bestiary (helpers/migrations.mjs). A monster brought to the world from the compendium
 * (dragged, called, sent by a Rift: found by `_stats.compendiumSource`) is a copy and keeps what it had then. Version 1
 * (0.37): the 22 monsters renamed in 0.37 take their new names (the actor, its prototype token, its tokens on the scenes
 * and the names inside its texts and items, replaced as the compendium had them), and the ones brought before 0.36 take
 * the token art (the Rifts, their light too). Only the old names and Foundry's own icons are replaced: what the GM wrote
 * stays.
 * Version 2 (0.42, docs/matematica.md): the 17 monsters whose damage went up (the party loses at least 65% of its HP
 * per encounter, more at higher CR) take the damage of their attacks again: each skill with damage, by name, takes the
 * compendium's damage, text and monster rule (the acid of the Bog's embrace). Their HP stays.
 */
import { SYSTEM_ID } from "../settings.mjs";

/** The Empire's monsters are the ones of the bestiary with this art. */
const ART = `systems/${SYSTEM_ID}/assets/tokens/bestiary/`;

/** The first names of the 22 monsters renamed in 0.37, and the new ones. */
const RENAMED = {
  "Kobold Garimpeiro": "Kobold Batedor",
  "Kobold Mordedor": "Kobold Glutão",
  "Chefe da Galeria": "Senhor Kobold",
  "Sentinela do Castelo": "Kobold Sentinela",
  "Lobo do Peso": "Lobo Atroz",
  "Lobo do Castelo": "Worg",
  "Javali de Cristal": "Javali Atroz",
  "Javali de Presas Azuis": "Javali Gigante",
  "Aranha das Galerias": "Aranha-Alçapão",
  "Lagarto Brilhante": "Lagarto-Lanterna",
  "Mestre do Contrabando": "Capitão Contrabandista",
  "Goblin de Incursão": "Goblin Saqueador",
  "Tropa de Incursão": "Tropa Goblin",
  "Fumaceiro Goblin": "Goblin Piromaníaco",
  "Chefe de Incursão": "Chefe Goblin",
  "Oco": "Revenante",
  "O Ungido Partido": "Santo Partido",
  "O Meio-Espírito": "Espectro do Inverno",
  "O Que Não Para de Queimar": "Meio-Dragão Ardente",
  "O Sem Nome": "Demônio das Sombras",
  "O das Seis Asas": "Serafim Errante",
  "O Preso na Meia-Fera": "Homem-Tigre"
};

/**
 * The old names inside the texts, longest first: the ones the compendium had replaced. The words of the world stay (the
 * Ocos, the Meio-Espírito stage, the Era Sem Nome, the rite of the Seis Asas), so those monsters change by name only.
 */
const PROSE = [
  ["kobolds Garimpeiros e Mordedores", "kobolds batedores e glutões"],
  ["Kobolds Garimpeiros", "Kobolds Batedores"], ["Kobold Garimpeiro", "Kobold Batedor"], ["Garimpeiros", "Batedores"],
  ["Garimpeiro", "Kobold Batedor"],
  ["Kobold Mordedor", "Kobold Glutão"], ["Mordedores", "Glutões"], ["Mordedor", "Kobold Glutão"],
  ["Chefe da Galeria", "Senhor Kobold"],
  ["a Sentinela do Castelo", "o Kobold Sentinela"], ["A Sentinela do Castelo", "O Kobold Sentinela"],
  ["Sentinela do Castelo", "Kobold Sentinela"],
  ["Lobos do Peso", "Lobos Atrozes"], ["Lobo do Peso", "Lobo Atroz"],
  ["Lobos do Castelo", "Worgs"], ["lobos do castelo", "worgs"], ["lobo do castelo", "worg"], ["Lobo do Castelo", "Worg"],
  ["Javalis de Cristal", "Javalis Atrozes"], ["Javali de Cristal", "Javali Atroz"],
  ["Javali de Presas Azuis", "Javali Gigante"],
  ["Aranhas das Galerias", "Aranhas-Alçapão"], ["Aranha das Galerias", "Aranha-Alçapão"],
  ["Lagartos Brilhantes", "Lagartos-Lanterna"], ["Lagarto Brilhante", "Lagarto-Lanterna"],
  ["Mestre do Contrabando", "Capitão Contrabandista"],
  ["Goblins de Incursão", "Goblins Saqueadores"], ["goblins de incursão", "goblins saqueadores"],
  ["Goblin de Incursão", "Goblin Saqueador"], ["Tropa de Incursão", "Tropa Goblin"],
  ["Fumaceiro Goblin", "Goblin Piromaníaco"], ["Máscara de Fumaceiro", "Máscara de Piromaníaco"],
  ["Fumaceiro", "Goblin Piromaníaco"],
  ["Chefe de Incursão", "Chefe Goblin"],
  ["Ungido Partido", "Santo Partido"], ["Que Não Para de Queimar", "Meio-Dragão Ardente"],
  ["Preso na Meia-Fera", "Homem-Tigre"], ["que o Oco perdeu", "que o Revenante perdeu"],
  ["Um Juramentado que voltou da morte", "Um Oco, como o povo diz: um Juramentado que voltou da morte"]
].map(([old, name]) => [new RegExp(`(?<![\\p{L}\\p{N}_])${old.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![\\p{L}\\p{N}_])`, "gu"), name]);

/** A text with the old names replaced. */
const renameText = text => PROSE.reduce((s, [pattern, name]) => s.replace(pattern, name), text);

/** Every string of a value, with the old names replaced. */
function renameDeep(value) {
  if (typeof value === "string") return renameText(value);
  if (Array.isArray(value)) return value.map(renameDeep);
  if (value && (typeof value === "object")) {
    return Object.fromEntries(Object.entries(value).map(([key, v]) => [key, renameDeep(v)]));
  }
  return value;
}

/** The part of `after` that differs from `before` (texts and arrays whole); undefined when nothing does. */
function changedPart(before, after) {
  if (JSON.stringify(before) === JSON.stringify(after)) return undefined;
  const isObject = v => v && (typeof v === "object") && !Array.isArray(v);
  if (!isObject(before) || !isObject(after)) return after;
  const out = {};
  for (const [key, value] of Object.entries(after)) {
    const part = changedPart(before[key], value);
    if (part !== undefined) out[key] = part;
  }
  return out;
}

/** The new name of a monster's or a token's old name ("Lobo do Peso (2)" gives "Lobo Atroz (2)"); null for any other. */
function renamed(name) {
  if (typeof name !== "string") return null;
  if (Object.hasOwn(RENAMED, name)) return RENAMED[name];
  const old = Object.keys(RENAMED).find(o => name.startsWith(`${o} (`));
  return old ? RENAMED[old] + name.slice(old.length) : null;
}

/** A light that gives none (the GM didn't set one). */
const unlit = light => !(Number(light?.dim) > 0) && !(Number(light?.bright) > 0);

/** The light a token had from the system before 0.36 (none, or the Rifts' violet pulse), which 0.36's art replaces. */
const oldLight = light => unlit(light) || ((light?.color === "#9b6bd6") && (light?.animation?.type === "pulse"));

/** The changes of a world monster made from this compendium monster. */
function actorChanges(data, source) {
  const changes = {};
  const name = renamed(data.name);
  if (name) changes.name = name;
  const tokenName = renamed(data.prototypeToken?.name);
  if (tokenName) changes["prototypeToken.name"] = tokenName;
  const system = changedPart(data.system, renameDeep(data.system));
  if (system) changes.system = system;
  const from = data.flags?.[SYSTEM_ID]?.named?.from;
  if (Object.hasOwn(RENAMED, from ?? "")) changes[`flags.${SYSTEM_ID}.named.from`] = RENAMED[from];
  if (data.img?.startsWith("icons/")) changes.img = source.img;
  if (data.prototypeToken?.texture?.src?.startsWith("icons/")) {
    changes["prototypeToken.texture.src"] = source.prototypeToken.texture.src;
  }
  if (oldLight(data.prototypeToken?.light) && !unlit(source.prototypeToken.light)) {
    changes["prototypeToken.light"] = foundry.utils.deepClone(source.prototypeToken.light);
  }
  return changes;
}

/** The items of a world monster whose name or texts carry an old name. */
function itemChanges(items) {
  const updates = [];
  for (const item of items) {
    const changes = {};
    const name = renameText(item.name);
    if (name !== item.name) changes.name = name;
    const system = changedPart(item.system, renameDeep(item.system));
    if (system) changes.system = system;
    if (!foundry.utils.isEmpty(changes)) updates.push({ _id: item._id, ...changes });
  }
  return updates;
}

/** The changes of a token of such a monster on a scene (a disguised token or one with a borrowed face keeps its look). */
function tokenChanges(data, source) {
  const changes = {};
  const name = renamed(data.name);
  if (name) changes.name = name;
  const own = data.flags?.[SYSTEM_ID] ?? {};
  if (data.texture?.src?.startsWith("icons/") && !own.disguise && !own.likeness) {
    changes["texture.src"] = source.prototypeToken.texture.src;
  }
  if (oldLight(data.light) && !unlit(source.prototypeToken.light)) {
    changes.light = foundry.utils.deepClone(source.prototypeToken.light);
  }
  return changes;
}

/** The monsters of the compendium whose damage went up in 0.42 (version 2). */
const DAMAGE_042 = new Set(["2lxB27dxYneozYzf", "6h3V8Wbfz0iJxVIw", "8NvUhMnaRyqzRkhg", "90ylIHmyFWVsGitd", "ABzg5y8NnwsPPim7", "AUe07k6AlwL58yaS", "CJFrRICLYY3sh6Jh", "CkhKRE70mCL9DaG6", "HkGDyVSdVwMmXMUh", "QuHpyFWwbDiRUuZK", "XHQDEBynAv2Rg0rA", "ZJ7O443V1jPfFxSN", "cQT8OBd1Rr476m14", "dO7jJkg4fKhwhwU4", "dn2syyY6tBP2PQPW", "qgglrIIrmgbachDa", "s852m3qnXl3CWKUy"]);

/** Version 2: the skills with damage of a world monster take the compendium's damage, text and monster rule. */
function damageChanges(items, source) {
  const updates = [];
  for (const item of items) {
    if (item.type !== "skill") continue;
    const from = source.items.find(i => (i.type === "skill") && (i.name === item.name));
    const damage = from?.system?.damage;
    if (!from || !(damage?.dice || damage?.mod) || damage.recovery) continue;
    const update = { _id: item._id };
    if (!foundry.utils.objectsEqual(item.system?.damage ?? {}, damage)) update["system.damage"] = foundry.utils.deepClone(damage);
    if (item.system?.description !== from.system.description) update["system.description"] = from.system.description;
    const rule = from.flags?.[SYSTEM_ID]?.monster;
    if (rule && !foundry.utils.objectsEqual(item.flags?.[SYSTEM_ID]?.monster ?? {}, rule)) update[`flags.${SYSTEM_ID}.monster`] = foundry.utils.deepClone(rule);
    if (Object.keys(update).length > 1) updates.push(update);
  }
  return updates;
}

async function damage042(pack, prefix) {
  let items = 0;
  for (const actor of game.actors) {
    const uuid = actor._stats?.compendiumSource;
    if (!uuid?.startsWith(prefix) || !DAMAGE_042.has(uuid.slice(prefix.length))) continue;
    const source = (await pack.getDocument(uuid.slice(prefix.length)).catch(() => null))?._source;
    if (!source) continue;
    const updates = damageChanges(actor._source.items, source);
    if (!updates.length) continue;
    await actor.updateEmbeddedDocuments("Item", updates, { eterniaMigration: true });
    items += updates.length;
  }
  console.log(`${SYSTEM_ID} | Bestiary: ${items} attacks of the Empire's monsters with the damage of 0.42`);
}

async function run(done = 0) {
  const pack = game.packs.get(`${SYSTEM_ID}.bestiary`);
  if (!pack) return true;
  // the names first: version 2 finds the attacks by their names of 0.37
  if (done < 1) await renames(pack);
  if (done < 2) await damage042(pack, `Compendium.${SYSTEM_ID}.bestiary.Actor.`);
  return true;
}

async function renames(pack) {
  const prefix = `Compendium.${SYSTEM_ID}.bestiary.Actor.`;
  // The compendium monster of each world monster made from one of the Empire's
  const sources = new Map();
  const loaded = new Map();
  for (const actor of game.actors) {
    const uuid = actor._stats?.compendiumSource;
    if (!uuid?.startsWith(prefix)) continue;
    const id = uuid.slice(prefix.length);
    if (!loaded.has(id)) loaded.set(id, (await pack.getDocument(id).catch(() => null))?._source ?? null);
    const source = loaded.get(id);
    if (source?.img?.startsWith(ART)) sources.set(actor.id, source);
  }
  if (!sources.size) return true;

  let actors = 0;
  let items = 0;
  for (const [id, source] of sources) {
    const actor = game.actors.get(id);
    const changes = actorChanges(actor._source, source);
    if (!foundry.utils.isEmpty(changes)) {
      await actor.update(changes, { eterniaMigration: true });
      actors++;
    }
    const updates = itemChanges(actor._source.items);
    if (updates.length) {
      await actor.updateEmbeddedDocuments("Item", updates, { eterniaMigration: true });
      items += updates.length;
    }
  }
  let tokens = 0;
  for (const scene of game.scenes) {
    const updates = [];
    for (const token of scene.tokens) {
      const source = sources.get(token.actorId);
      const changes = source ? tokenChanges(token._source, source) : {};
      if (!foundry.utils.isEmpty(changes)) updates.push({ _id: token.id, ...changes });
    }
    if (updates.length) await scene.updateEmbeddedDocuments("Token", updates, { eterniaMigration: true });
    tokens += updates.length;
  }
  console.log(`${SYSTEM_ID} | Bestiary: ${actors} monsters, ${items} of their items and ${tokens} tokens with the names and the art of 0.37`);
  return true;
}

export const BESTIARY_MIGRATION = { id: "bestiary", setting: "bestiaryMigrationVersion", version: 2, run };
