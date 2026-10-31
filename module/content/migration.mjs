/**
 * World content migration: the items and skills the worlds already have take the data their compendium gained.
 *
 * Version 1 (0.43): the bags' spaces (23 bags had 0), the effects of the consumables' higher grades (the Skill
 * Potions II–IV, the Flasks II–III, the Night Vision Potions II–III), the NP locks their texts state, and the cover of
 * Proteger, Corpo-Escudo and Transfusão (the protector takes the blow: conditions/immortal.mjs coverFor). Matched by
 * name and type to the compendium; only missing data is filled (what a GM edited by hand stays).
 * Version 2 (0.44): the Dash (Disparada) and the Shift (Deslocar-se) also spend the Minor Action
 * (`flags.eternia.alsoSpends`, automation/use.mjs).
 * Version 3 (0.49, the cleanup of Log Horizon): the damage bonuses that still had the old key (`lhtrpg.roll.`, which
 * never counted) take `eternia.roll.`; the items the cleanup changed (the classes, skills and places of Log Horizon,
 * the recipes' Anima-mundi), when the copy still has its 0.48 text (never edited), take the compendium's text, tags,
 * powers and effects, and their characters get the powers' skills again; an edited copy only takes the recipes'
 * Anima-mundi, the new roll key and loses the NH of a skill of Log Horizon; and the characters that have the Basic
 * skills get Analisar Objeto de Cena, which nobody received (it was a Combat skill).
 * Version 4 (1.0.2): the mounts take the token of their compendium dragon (`flags.eternia.mount.token`, the portrait
 * of their sheet), matched by name, or by the name of their base for a Tamer's mount (which also keeps it in the base,
 * for a Retouch). A mount that already has a token keeps it.
 */
import { SYSTEM_ID } from "../settings.mjs";
import { itemSkillsOf, syncItemSkills } from "./content.mjs";

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

/** The old prefix of the roll bonuses (helpers/roll-bonuses.mjs reads `eternia.roll.`). */
const OLD_ROLL_KEY = "lhtrpg.roll.";
const renamed = change => String(change?.key ?? "").startsWith(OLD_ROLL_KEY)
  ? { ...change, key: `eternia.roll.${change.key.slice(OLD_ROLL_KEY.length)}` } : change;

async function rollKeys() {
  let n = 0;
  for (const list of collections()) {
    for (const item of list) {
      const updates = [];
      for (const effect of item.effects ?? []) {
        const changes = effect._source?.system?.changes;
        if (Array.isArray(changes) && changes.some(c => renamed(c) !== c)) updates.push({ _id: effect.id, "system.changes": changes.map(renamed) });
      }
      if (!updates.length) continue;
      try {
        await item.updateEmbeddedDocuments("ActiveEffect", updates);
        n += updates.length;
      }
      catch (err) {
        console.error(`${SYSTEM_ID} | Content migration: could not update the effects of ${item.uuid}`, err);
      }
    }
  }
  return n;
}

/** The recipes' Anima-mundi: the "Catalisador Mágico" of the books, and the ones whose name the import lost. */
const RECIPE_ANIMA = [[/\[\s*Catalisador Mágico\s*(\d+)\s*\]/g, "[Anima-mundi $1]"], [/\[\s+(\d+)\s*\](?=\s*\()/g, "[Anima-mundi $1]"]];

/**
 * The items the cleanup of 0.49 changed (the classes, the skills and the places of Log Horizon, the recipes' Anima-mundi):
 * name -> the fingerprint of their 0.48 text. A world copy with that very text was never edited by hand.
 */
const ITEMS_049 = {
  "(NP3) Ninja no manpuku meshi": "41de0e1c", "Âmbar de Dun": "a7cdb6eb", "Arco Forte: Garra Golpeadora": "d09a680b",
  "Bacinete": "2fac7015", "Bastão da Vertigem": "53de0b9e", "Bastão Espiritual": "d2fe3aeb",
  "Belicista Furioso": "545f88ba", "Besta das Estrelas Gêmeas": "32e80ba6", "Bola de Cristal da Memória": "d86844fc",
  "Casaco de Barreira": "5429ca21", "Cascavel": "56a5e550", "Comando Rápido": "773fa7f1",
  "Comida para Einherial": "8a46b240", "Contenção": "c6472376", "Coroa Sólida": "198251cf",
  "Dicionário do Sábio": "f7652ab3", "Dispositivo de Autodestruição": "fd75ad50", "Elixir de Sentoka": "f11cb0ef",
  "Elixir do Luar": "935d35b8", "Elixir do Tempo Esquecido": "f2de0d3c", "Elixir: Dedo de Daidara": "131ed88c",
  "Elmo de Ferro": "f3c3e6b4", "Elmo Grande": "4c21430b", "Escaravelho da Chuva": "6c7f0db4",
  "Esmagador Ressonante": "bd624b33", "Espada da Adversidade": "bbf5429b",
  "Espada de Selamento: Yozakura": "8343b8aa", "Espada Espiritual: Toki no Tamashii": "851c731a",
  "Estrela Cadente Prateada": "5dc26d85", "Faixa Guardiã": "7afa8af1", "Glória do Vencedor": "bdb8b1b6",
  "Hachigane": "d0a1efcc", "Kabuto Negro": "5db218ae", "Lâmina do Tumulto": "26d726f7",
  "Lanterna Mágica": "a54ec82e", "Licor de Ovos de Litlabre": "b62d6ac5", "Machado de Santa Rilith": "e8c478c5",
  "Majo no Ōnabe": "5c0e4bb8", "Marca do Perseguidor": "9efd31fe", "Ovo do Devorador de Fogo": "c0c7d1e5",
  "Pássaro de Engrenagem": "142c07e2", "Pergaminho da Aparência": "70e25527",
  "R1 Bolsa do Ovo de Gema Dupla": "3497d7ae", "R1 Botas da Terra": "cfdaa7a7", "R1 M6 Agulha Inibidora": "652dc553",
  "R1 Vestido-Avental da Recém-Casada": "1bd243b6", "R10 Cofre de Otune": "a1d53089",
  "R10 Corrente da Bruxa dos Sonhos": "5f4f99f5", "R10 Cota Prismática": "f7d41a4a",
  "R10 Guarda da Ventania": "64e278d5", "R10 Hikari no kōshi": "c5f94bc0", "R10 M5 Âncora de Fuga": "19bd2ef4",
  "R10 M5 Bakukon no ō shaku": "ae070d88", "R10 M6 Esmagador de Minos": "d9558cf4",
  "R10 Pena da Amizade": "23c1c040", "R10 Traje de Guerra de Maya": "0efc92df",
  "R11 M4 Lança de Assalto do Herói Ziol": "4da50b63", "R11 M6 Meikyū-ju no kagi": "26a09955",
  "R11 Musa Dolce": "a5652ddc", "R11 Poderio de Vikum": "0fb1123d",
  "R11 Roupas de Caminhada na Floresta": "49aad1d4", "R12 Anel de Ouro Misterioso": "3e405c74",
  "R12 M4 Chicote Offyuka": "c8852596", "R12 M5 Arco Certeiro Alva": "26329167",
  "R12 M6 Espada Articulada": "ac3cd613", "R13 Escudo de Força": "faa99402",
  "R13 M5 Espada Espiritual do Alquimista": "a24845ba", "R13 M5 Hayate no kirifuda": "66e13ee6",
  "R13 Manto do Jaguar das Neves": "47418ad4", "R14 Botas de Middle Pine": "32c77eea",
  "R14 Bracelete de Apeiron": "9f1e9aa2", "R14 M5 Kogarashi no ono": "e9e3151d",
  "R14 Tabuleiro Ouija do Ladrão Mágico Adder": "84714b67", "R15 Armadura do Cavaleiro do Graal": "d2d981b4",
  "R15 Bolsa Epicurista": "fc4f7ba2", "R15 M6 Espada Comemorativa: Mordida Cerimonial": "8e72de3f",
  "R15 Rosenschild": "a2c47b12", "R16 Colete da Dança da Fênix": "a5d4e4e8",
  "R16 M4 Cajado Guardião: Protetor do Destino": "feca74da", "R16 M4 Espada sem Nome: Sakigake": "bfda4b92",
  "R16 Manto Protetor": "96267f70", "R17 Casca de Abeto": "5da52ce6", "R17 M4 Treva Pavorosa": "49d9c9da",
  "R17 M5 Espada Sagrada Alanrod": "ceb45da0", "R17 M5 Lança Mágica Coração de Âmbar": "a6f477ca",
  "R17 M6 Adaga de Antares": "50e92cce", "R17 Tíquete de Uso do Cofre da 4ª Dimensão": "f09712ab",
  "R18 Amuleto de Yulara": "226d3fbb", "R18 Armadura do Farol": "69c22459",
  "R18 M4 Lança Curta do Guarda-Costas": "e93b2715", "R18 M5 Quarteto Freccia": "fa615657",
  "R18 M6 Clock Upper": "6a4b055f", "R19 Anel de Da Squeuin": "89e99205", "R19 Elmo Cabeça de Demônio": "743028be",
  "R19 Escudo Circular do Sol": "e9bd130b", "R19 Sapatos da Fada Subterrânea": "2106f35b",
  "R2 Anel Duplo do Brasão": "2f14f469", "R2 Armadura do Leão": "e40b7964", "R2 Escudo de Folhas": "1a6eb731",
  "R2 Espreitador das Sombras": "8c197454", "R2 Insígnia da Força de Assalto": "1a5845e5",
  "R2 M4 Espada de Presa do Lagarto de Fogo": "2fead513", "R2 M5 Big Shot": "c830bbe6",
  "R2 M6 Arco Longo da Estrela Guardiã": "8052e463", "R2 Manto do Espírito do Bosque": "e7284ce0",
  "R20 Bolsa da Sorte de Black Mami": "58d20363", "R20 M5 Naginata: Fudo Flamejante": "57239e50",
  "R20 M6 Arco-Arpão": "1531bbc7", "R20 Manoplas de Daidoushi": "687924f1", "R20 Zauberflete": "52e1292f",
  "R3 Harpa Eólia da Cura Pura": "5a81843c", "R3 M4 Ceifador": "a3b4f6be", "R3 M4 Rantou Kogarashimaru": "f99c559e",
  "R3 M5 Desbravador da Tundra": "15eb24b6", "R3 M5 Devorador de Mana": "5edd3770", "R3 M5 Sonho Eterno": "36ef77a2",
  "R3 Manopla do Feiticeiro": "64e982bd", "R3 Mochila com Asas": "26bf5dff", "R3 Pele de Berserker": "da433654",
  "R3 Túnica do Eremita": "cb3346f9", "R4 Apito de Weser": "17a33c0a",
  "R4 Armadura do Juramento de Sangue": "f32c2bc8", "R4 Cinturão do Espírito da Terra": "808905c6",
  "R4 Luvas de Truque": "33b475c7", "R4 M4 Detonador Relâmpago": "c4ff632b", "R4 M4 Estrela Maligna": "842896b7",
  "R4 M6 Cajado Proibido de Agastya": "2cf2e4ea", "R4 M6 Ordem de Tegine": "565354e4",
  "R4 Pergaminho do Cavalo": "75c37d32", "R4 Shito no bōshi": "a0a26c34", "R5 Anel da Pulsação": "7a34da16",
  "R5 Ankurutēpā no toranku": "2fc565e1", "R5 Armadura de Caixa": "6e024673", "R5 Cota Reativa": "dd6fe103",
  "R5 Dux Tredegim": "9d49f578", "R5 Elmo Weissen de Fio Vermelho": "eb14b369",
  "R5 M4 Devorador do Arrebol": "db68ab0c", "R5 M4 Haōken": "44697066", "R5 M5 Arco Cantante: Suzumushi": "48d6aa72",
  "R5 M5 Espada Guardiã de Cristal Lunar": "50cac2ad", "R5 M5 Owazamono: Nue Sombrio": "73777722",
  "R5 M6 Espada Curva do Luar": "5ad818c2", "R6 Botas Altas de Couro de Crocodilo Branco": "3c5e839c",
  "R6 Guarda da Égide": "67a91658", "R6 Haori Shikigami da Repetição": "b4e317e6", "R6 Jolly Roger": "a2d23e97",
  "R6 M4 Kaishakuken Decapitador": "749375c8", "R6 M4 Varinha Kodama": "65797295",
  "R6 M6 Machado do Redemoinho Azul": "b5d76e6e", "R6 M6 Olhar da Medusa": "14ac3345",
  "R6 Manto do Horror": "498b0245", "R6 Uchikake da Névoa Kasumi": "d0ce5b1d", "R7 Banshiki no kēpu": "02c356f2",
  "R7 Coroa dos Mortos": "49ee528e", "R7 M5 Lâmina Gêmea Fantasma": "ca99eb73", "R7 M5 Lança Içadora": "d96a7bff",
  "R7 M6 Manopla de Atlas": "b984ea1b", "R7 Peitoral da Donzela Guerreira": "73849c3b",
  "R7 Pergaminho do Trovão que Divide os Céus": "784c4075", "R7 Pulseira de Feldspato da Lua Cheia": "31347645",
  "R7 Vazio": "fe318961", "R8 Armadura do Dragão": "62973ffb", "R8 Armadura Mágica Tipo 39 (Leve)": "41d4fcd6",
  "R8 Armadura Mágica Tipo 39 (Pesada)": "41d4fcd6", "R8 Bolsa Mágica de Dazanek": "f861dd9f",
  "R8 Esmeralda Verdadeira": "0cab8459", "R8 M5 Açoite de Corrente Espinhoso de Labrin": "f003f9f6",
  "R8 M5 Beco sem Saída": "18ef416b", "R8 M6 Kurokasumi no kodachi": "d6336b64", "R8 M6 Presa Faminta": "f494db41",
  "R8 Peitoral do Solstício de Verão": "8b94f40f", "R8 Proteção Relâmpago": "2b8dc853",
  "R9 Armadura de Carapaça de Aço de Andras": "b991f7a9", "R9 Botas da Águia Negra": "665f017a",
  "R9 Elmo da Barbatana do Grande Monstro Marinho": "38c5d33d", "R9 Guarda Astral": "6b2baf76",
  "R9 M5 Chama Espectral": "a1b3e9ca", "R9 M5 Kōryū no tsume": "554e234d",
  "R9 M6 Mamorugatana Hitorishizuka": "2c1981ea", "R9 Manto do Pesadelo": "c83cd95d",
  "R9 Vestes do Bravo": "346f1e03", "Remédio de Pêssego Bisen": "10b7d49c", "Reverberante": "4e4a4606",
  "Ritual da Paz": "0a627962", "Roupas Formais": "7d004b53", "Shide no Ōtsuchi": "1bbda563",
  "Shōsō no shajiku": "e7b5e451", "Suigetsu": "c2bba590", "Tiara de Chifres": "09f9c72a",
  "Tíquete de Conexão": "e562d676", "Tocha Perfurante": "357d839b", "Toge o no nigiri-te": "dc7ce77f",
  "Utage no tēburukurosu": "ef924fd3", "Varinha dos Milênios": "54768288", "Ventilador de Vácuo": "531bbb2b",
  "Visor de Dados": "3a102827", "Yakuyoke jingasa nabe": "a220d643"
};

/** FNV-1a (32 bits) of a text, as the table above was made. */
function fingerprint(text) {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}

/** The powers that read the NH of a skill of Log Horizon (`srOf`, automation/use.mjs) read the power's own. */
const fromLogHorizon = of => String(of?.uuid ?? "").startsWith("Compendium.lhtrpg.");

/** An effect, without its id, to tell whether two lists say the same. */
const effectKey = e => JSON.stringify({ n: e.name, s: e.system, f: e.flags, t: e.transfer, d: e.disabled });

async function itemTexts() {
  const pack = game.packs.get(`${SYSTEM_ID}.items`);
  const sources = new Map();
  for (const entry of (await pack?.getIndex()) ?? []) {
    if ((entry.name in ITEMS_049) && !sources.has(entry.name)) sources.set(entry.name, await pack.getDocument(entry._id));
  }
  let n = 0;
  for (const list of collections()) {
    for (const item of list) {
      const text = item._source.system?.description;
      const source = sources.get(item.name);
      const fresh = !!source && (source.type === item.type) && (typeof text === "string") && (fingerprint(text) === ITEMS_049[item.name]);
      const update = {};
      let powersChanged = false;
      let effects = null;
      if (fresh) {
        update["system.description"] = source._source.system.description;
        if (!foundry.utils.objectsEqual(item._source.system.tags ?? [], source._source.system.tags ?? [])) update["system.tags"] = [...(source._source.system.tags ?? [])];
        const powers = source._source.flags?.[SYSTEM_ID]?.powers ?? null;
        if (!foundry.utils.objectsEqual(item._source.flags?.[SYSTEM_ID]?.powers ?? null, powers)) {
          update[`flags.${SYSTEM_ID}.powers`] = foundry.utils.deepClone(powers);
          powersChanged = true;
        }
        if (item.effects.map(effectKey).join("|") !== source.effects.map(effectKey).join("|")) effects = effectsOf(source);
      }
      else {
        if (typeof text === "string") {
          const next = RECIPE_ANIMA.reduce((t, [re, now]) => t.replace(re, now), text);
          if (next !== text) update["system.description"] = next;
        }
        // In the powers: the NH of a skill of Log Horizon, and the old roll key of their effects
        const powers = item._source.flags?.[SYSTEM_ID]?.powers;
        const next = Array.isArray(powers) ? powers.map(p => {
          let power = fromLogHorizon(p?.srOf) ? { ...p, srOf: null } : p;
          const old = (power?.effects ?? []).some(e => (e.system?.changes ?? []).some(c => renamed(c) !== c));
          if (old) power = { ...power, effects: power.effects.map(e => ({ ...e, system: { ...e.system, changes: (e.system?.changes ?? []).map(renamed) } })) };
          return power;
        }) : null;
        if (next && next.some((p, i) => p !== powers[i])) {
          update[`flags.${SYSTEM_ID}.powers`] = next;
          powersChanged = true;
        }
      }
      if (foundry.utils.isEmpty(update) && !effects) continue;
      try {
        // The skills of the old powers leave first; the new ones come from the powers of the updated item
        const actor = (item.parent?.type === "character") ? item.parent : null;
        const old = (actor && powersChanged) ? (itemSkillsOf(actor).get(item.id) ?? []).map(s => s.id) : [];
        if (old.length) await actor.deleteEmbeddedDocuments("Item", old, { eterniaMigration: true });
        if (!foundry.utils.isEmpty(update)) await item.update(update);
        if (effects) {
          if (item.effects.size) await item.deleteEmbeddedDocuments("ActiveEffect", item.effects.map(e => e.id));
          if (effects.length) await item.createEmbeddedDocuments("ActiveEffect", effects);
        }
        if (actor && powersChanged) await syncItemSkills(actor, { items: [item] });
        n++;
      }
      catch (err) {
        console.error(`${SYSTEM_ID} | Content migration: could not update ${item.uuid}`, err);
      }
    }
  }
  return n;
}

/** The characters that have the Basic skills take Analisar Objeto de Cena, from the compendium. */
async function sceneAnalysis() {
  const pack = game.packs.get(`${SYSTEM_ID}.skills-basic`);
  const entry = (await pack?.getIndex())?.find(e => e.name === "Analisar Objeto de Cena");
  const source = entry ? await pack.getDocument(entry._id) : null;
  if (!source) return 0;
  let n = 0;
  for (const actor of game.actors) {
    if (actor.type !== "character") continue;
    const names = new Set(actor.items.map(i => i.name));
    if (!names.has("Desarmar Objeto de Cena") || names.has(source.name)) continue;
    const data = source.toObject();
    delete data._id;
    data._stats = { ...data._stats, compendiumSource: source.uuid };
    try {
      await actor.createEmbeddedDocuments("Item", [data], { eterniaMigration: true });
      n++;
    }
    catch (err) {
      console.error(`${SYSTEM_ID} | Content migration: could not give ${actor.uuid} Analisar Objeto de Cena`, err);
    }
  }
  return n;
}

/** The mounts take the token of the compendium mount of their name (or of their base's name, when crafted). */
async function mountTokens() {
  const pack = game.packs.get(`${SYSTEM_ID}.items`);
  const tokens = new Map();
  for (const entry of (await pack?.getIndex()) ?? []) {
    if (entry.type !== "mount") continue;
    const token = (await pack.getDocument(entry._id))?.getFlag(SYSTEM_ID, "mount")?.token;
    if (token) tokens.set(entry.name, token);
  }
  let n = 0;
  for (const list of collections()) {
    for (const item of list) {
      if ((item.type !== "mount") || item.getFlag(SYSTEM_ID, "mount")?.token) continue;
      const base = item.getFlag(SYSTEM_ID, "craft")?.base;
      const token = tokens.get(item.name) ?? tokens.get(base?.name);
      if (!token) continue;
      const update = { [`flags.${SYSTEM_ID}.mount.token`]: token };
      if (base) update[`flags.${SYSTEM_ID}.craft.base.flags.${SYSTEM_ID}.mount.token`] = token;
      try {
        await item.update(update);
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
  if (done < 3) {
    const keys = await rollKeys();
    const texts = await itemTexts();
    const characters = await sceneAnalysis();
    console.log(`${SYSTEM_ID} | Content: ${keys} effects with the roll key of Eternia, ${texts} items with the texts of 0.49, ${characters} characters with Analisar Objeto de Cena`);
  }
  if (done < 4) console.log(`${SYSTEM_ID} | Content: ${await mountTokens()} mounts with their token`);
  return true;
}

export const CONTENT_MIGRATION = { id: "content", setting: "contentMigrationVersion", version: 4, run };
