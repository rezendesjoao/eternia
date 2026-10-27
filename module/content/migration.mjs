/**
 * World content migration: the items and skills the worlds already have take the data their compendium gained.
 *
 * Version 1 (0.43): the bags' spaces (23 bags had 0), the effects of the consumables' higher grades (the Skill
 * Potions II–IV, the Flasks II–III, the Night Vision Potions II–III), the NP locks their texts state, and the cover of
 * Proteger, Corpo-Escudo and Transfusão (the protector takes the blow: conditions/immortal.mjs coverFor). Matched by
 * name and type to the compendium; only missing data is filled (what a GM edited by hand stays).
 * Version 2 (0.44): the Dash (Disparada) and the Shift (Deslocar-se) also spend the Minor Action
 * (`flags.eternia.alsoSpends`, automation/use.mjs).
 */
import { SYSTEM_ID } from "../settings.mjs";

/** The items of the compendium `items` that gained data in 0.43. */
const ITEMS_043 = new Set(["Algibeira", "Algibeira de Joias", "Algibeira Impermeável", "Bolsa de Comida", "Bolsa de Mão do Corvo",
  "Bolsa Devoradora I", "Bolsa Devoradora II", "Bolsa Devoradora III", "Bolsa Devoradora IV", "Bolsa Pequena", "Cesta",
  "Cofre Pesado", "Frasco de Golpes Poderosos II", "Frasco de Golpes Poderosos III", "Frasco de Potência Mágica II",
  "Frasco de Potência Mágica III", "Marmita", "Mochila Mestra", "Okamochi do Entregador",
  ...["Análise", "Atletismo", "Conhecimento", "Desarme", "Negociação", "Operação", "Percepção", "Vigor"]
    .flatMap(skill => ["I", "II", "III", "IV"].map(grade => `Poção de Perícia ${grade}: ${skill}`)),
  "Poção de Respiração Aquática I", "Poção de Respiração Aquática II", "Poção de Visão no Escuro I",
  "Poção de Visão no Escuro II", "Poção de Visão no Escuro III", "Porta-Poções II", "Porta-Poções III", "R10 Cofre de Otune",
  "R15 Bolsa Epicurista", "R20 Bolsa da Sorte de Black Mami", "R8 Bolsa Mágica de Dazanek", "Saco de Aventura", "Sacola",
  "Unguento Amuleto (Iniciante)", "Unguento de Esquiva I"]);

/** The skills that gained the cover, by compendium. */
const COVER_043 = { "skills-basic": ["Proteger"], "skills-class": ["Corpo-Escudo", "Transfusão"] };

/** The line of the texts the cover made automatic. */
const COVER_TEXT = ["Aplique o dano em você pelo cartão de dano.", "O dano vem para você sozinho, como dano direto, depois da Defesa e da Anulação do aliado."];

/** The compendium documents of these names, by name. */
async function sources(packName, names) {
  const pack = game.packs.get(`${SYSTEM_ID}.${packName}`);
  if (!pack) return new Map();
  const index = await pack.getIndex();
  const out = new Map();
  for (const entry of index) {
    if (names.has(entry.name) && !out.has(entry.name)) out.set(entry.name, await pack.getDocument(entry._id));
  }
  return out;
}

/** The effects of a compendium document, ready to be created on a copy. */
const effectsOf = (doc, only = () => true) => doc.effects.filter(only).map(e => {
  const data = e.toObject();
  delete data._id;
  return data;
});

/** Every item collection of the world: the world's items and those of each actor (linked tokens share their actor). */
function collections() {
  const out = [game.items];
  for (const actor of game.actors) out.push(actor.items);
  for (const scene of game.scenes) {
    for (const token of scene.tokens) {
      if (token.actorLink || !token.actor) continue;
      // Only the items the token overrides live in its delta; the others are its actor's, done with it
      const own = new Set((token.delta?._source?.items ?? []).map(i => i._id));
      if (own.size) out.push(token.actor.items.filter(i => own.has(i.id)));
    }
  }
  return out;
}

async function itemsData() {
  const found = await sources("items", ITEMS_043);
  let n = 0;
  for (const list of collections()) {
    for (const item of list) {
      const source = found.get(item.name);
      if (!source || (source.type !== item.type)) continue;
      try {
        const update = {};
        const space = Number(source.system.bagSpace) || 0;
        if ((space > 0) && !(Number(item.system.bagSpace) > 0)) update["system.bagSpace"] = space;
        const lock = Number(source.getFlag(SYSTEM_ID, "crLock")) || 0;
        if (lock && !(Number(item.getFlag(SYSTEM_ID, "crLock")) > 0)) update[`flags.${SYSTEM_ID}.crLock`] = lock;
        if (!foundry.utils.isEmpty(update)) await item.update(update);
        if (source.effects.size && !item.effects.size) await item.createEmbeddedDocuments("ActiveEffect", effectsOf(source));
        if (!foundry.utils.isEmpty(update) || (source.effects.size && !item.effects.size)) n++;
      }
      catch (err) {
        console.error(`${SYSTEM_ID} | Content migration: could not update ${item.uuid}`, err);
      }
    }
  }
  return n;
}

async function coverSkills() {
  const found = new Map();
  for (const [pack, names] of Object.entries(COVER_043)) {
    for (const [name, doc] of await sources(pack, new Set(names))) found.set(name, doc);
  }
  let n = 0;
  for (const list of collections()) {
    for (const item of list) {
      const source = (item.type === "skill") ? found.get(item.name) : null;
      if (!source || item.effects.some(e => e.getFlag(SYSTEM_ID, "cover"))) continue;
      try {
        await item.createEmbeddedDocuments("ActiveEffect", effectsOf(source, e => e.getFlag(SYSTEM_ID, "cover")));
        const text = item.system.description ?? "";
        if (text.includes(COVER_TEXT[0])) await item.update({ "system.description": text.replace(COVER_TEXT[0], COVER_TEXT[1]) });
        n++;
      }
      catch (err) {
        console.error(`${SYSTEM_ID} | Content migration: could not give ${item.uuid} the cover`, err);
      }
    }
  }
  return n;
}

/** The basic skills that spend another action too, since 0.44. */
const ALSO_SPENDS_044 = new Set(["Disparada", "Deslocar-se"]);

async function alsoSpends() {
  const found = await sources("skills-basic", ALSO_SPENDS_044);
  let n = 0;
  for (const list of collections()) {
    for (const item of list) {
      const source = (item.type === "skill") ? found.get(item.name) : null;
      const value = source?.getFlag(SYSTEM_ID, "alsoSpends");
      if (!value?.length || item.getFlag(SYSTEM_ID, "alsoSpends")) continue;
      try {
        await item.setFlag(SYSTEM_ID, "alsoSpends", [...value]);
        n++;
      }
      catch (err) {
        console.error(`${SYSTEM_ID} | Content migration: could not update ${item.uuid}`, err);
      }
    }
  }
  return n;
}

async function run(done = 0) {
  if (done < 1) {
    const items = await itemsData();
    const skills = await coverSkills();
    console.log(`${SYSTEM_ID} | Content: ${items} items, ${skills} skills with the cover`);
  }
  if (done < 2) console.log(`${SYSTEM_ID} | Content: ${await alsoSpends()} skills that also spend the Minor Action`);
  return true;
}

export const CONTENT_MIGRATION = { id: "content", setting: "contentMigrationVersion", version: 2, run };
