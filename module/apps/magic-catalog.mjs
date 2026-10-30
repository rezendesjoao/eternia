/**
 * The catalog of the Magias: every Magia of the Item compendiums (a skill with flags.eternia.magic) with its spells
 * (flags.eternia.magicSpell), read from the compendium indexes (helpers/pack-index.mjs: the documents are never loaded
 * for it) and kept until a compendium skill changes. The roles of a Magia come from its spells' own data (target,
 * damage, the statuses they give), so a new Magia gets them by itself. What a Magia's description says (the opening,
 * its Trait, its Tabu and the closing line) comes apart, from the Magias' documents only, loaded once when the game is
 * idle, a slice at a time (TEXT_SLICE). The Magia picker, the creation wizard and the Magias tab of the sheet read it.
 */
import { L, SYSTEM_ID } from "../settings.mjs";
import { term } from "../i18n/terms.mjs";
import { idle, loadDocuments, packIndex } from "../helpers/pack-index.mjs";

/** The categories, in the order of the filters. */
export const MAGIC_CATEGORIES = {
  caster: { icon: "fa-solid fa-wand-magic-sparkles", color: "#2f6b4a" },
  holder: { icon: "fa-solid fa-key", color: "#8a6a25" },
  lost: { icon: "fa-solid fa-book-skull", color: "#8c2f2f" },
  forbidden: { icon: "fa-solid fa-skull", color: "#4a2b57" },
  ancestral: { icon: "fa-solid fa-feather-pointed", color: "#2a6f73" },
  curse: { icon: "fa-solid fa-eye-evil", color: "#33302d" },
  // The Absolutas (0.51): stronger than all, one holder, and they take every Magia slot of whoever has them
  absolute: { icon: "fa-solid fa-crown", color: "#8a6418" }
};

/** What the spells do, read from their data. */
export const MAGIC_ROLES = {
  area: "fa-solid fa-burst",
  control: "fa-solid fa-link",
  wear: "fa-solid fa-droplet",
  heal: "fa-solid fa-heart-pulse",
  guard: "fa-solid fa-shield-halved",
  support: "fa-solid fa-hand-sparkles",
  move: "fa-solid fa-wind"
};
const CONTROL = new Set(["prone", "slowed", "rooted", "grappled", "dazed", "confused", "frightened", "charmed", "asleep",
  "paralyzed", "silenced", "sealed", "blinded", "taunted", "staggered", "rigor", "disarmed", "dominated", "weakened",
  "petrified", "pacified", "amnesia", "nightmare", "erased", "ironBlood"]);
const WEAR = new Set(["burning", "poisoned", "decay", "freezing", "shocked", "cursed", "fissured", "exposed", "marked",
  "doom", "pursuit", "soaked", "fuse", "weakness", "blackFlame", "agony", "reaped", "ironBlood"]);
const GUARD = new Set(["cancel", "barrier", "mirror", "intangible", "lastStand", "hidden", "counter", "grudge",
  "untouchable", "inversion", "clones", "phasing", "goliath"]);
const SUPPORT = new Set(["hasted", "empowered", "focused", "awakened", "bond", "servant", "sun", "theOne", "impetus",
  "combo", "rhythm", "anticipation", "gaze", "hourglass", "jackpot", "luck", "quake"]);
const MULTI = new Set(["Area", "Wide", "Line", "Targets"]);

const statusLabel = id => game.i18n.localize(`ETERNIA.StatusEffect.${id}`);
export const fold = text => String(text ?? "").normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

/** The category of a Magia's flag (a Magia without one is a Conjuration). */
export const categoryOf = magic => (MAGIC_CATEGORIES[magic?.category] ? magic.category : "caster");

/** The view of a category: its label, icon and color. */
export function categoryView(id) {
  const c = MAGIC_CATEGORIES[id] ?? MAGIC_CATEGORIES.caster;
  return { id, icon: c.icon, color: c.color, label: L(`MagicPicker.Category.${id}`), hint: L(`MagicPicker.CategoryHint.${id}`) };
}

/** The view of a role. */
export const roleView = id => ({ id, icon: MAGIC_ROLES[id], label: L(`MagicPicker.Role.${id}`), hint: L(`MagicPicker.RoleHint.${id}`) });

/* -------------------------------------------- */
/*  Reading                                     */
/* -------------------------------------------- */

/** What a Magia's description says: the opening, the Tabu, its Trait, other notes and the closing line. */
export function readDescription(html) {
  const root = new DOMParser().parseFromString(`<div>${html ?? ""}</div>`, "text/html").body.firstElementChild;
  const first = root.querySelector("p");
  first?.querySelector("strong")?.remove();
  const intro = first?.textContent.trim() ?? "";
  let tabu = null;
  let trait = null;
  const notes = [];
  for (const li of root.querySelectorAll("li")) {
    const strong = li.querySelector("strong");
    const label = (strong?.textContent ?? "").replace(/[:.]\s*$/, "").trim();
    strong?.remove();
    const text = li.textContent.trim();
    if (/^tabu\b/i.test(label)) tabu = { label, text };
    else if (/^(traço|trait)\b/i.test(label)) trait = { label, text };
    // The spells and the Motor are drawn from the spells themselves.
    else if (label && !/^(feitiços|o motor|spells|the motor)\b/i.test(label)) notes.push({ label, text });
  }
  const visual = [...root.querySelectorAll("p em")].at(-1)?.textContent.trim() ?? "";
  return { intro, tabu, trait, notes, visual };
}

/**
 * The effects of a spell's index entry. Once the pack's documents are loaded (a migration, the skill browser), Foundry
 * rebuilds the entry with "effects" as an object instead of a list: then the loaded document's own effects are read.
 */
function entryEffects(entry, pack) {
  if (Array.isArray(entry.effects)) return entry.effects;
  const doc = pack?.get?.(entry._id);
  return doc ? doc.effects.map(e => e._source) : [];
}

/**
 * A spell of a Magia, from its index entry: when it comes, how hard it hits, the statuses it gives (on a hit, or with
 * its effects) and what they mean for the roles of the Magia.
 */
function readSpell(entry, pack) {
  const f = entry.flags?.eternia ?? {};
  const system = entry.system ?? {};
  const damage = system.damage ?? {};
  const motor = f.motor ?? {};
  const effects = entryEffects(entry, pack).filter(e => e && (typeof e === "object") && !e.transfer);
  const hit = (f.hitStatuses ?? []).map(s => s.statusId).filter(Boolean);
  const given = effects.flatMap(e => [...(e.statuses ?? []), e.flags?.eternia?.statusData?.statusId]).filter(Boolean);
  const statuses = [...new Set([...hit, ...given])];
  const dice = damage.dice;
  const deals = !damage.recovery && (!!Number(dice) || /@/.test(String(dice ?? "")));
  const heals = !!damage.recovery && (!!Number(dice) || /@/.test(String(dice ?? "")) || !!damage.mod);

  const roles = new Set();
  if (deals && MULTI.has(system.target)) roles.add("area");
  if (heals || statuses.includes("regen")) roles.add("heal");
  for (const id of statuses) {
    if (CONTROL.has(id)) roles.add("control");
    if (WEAR.has(id)) roles.add("wear");
    if (GUARD.has(id)) roles.add("guard");
    if (SUPPORT.has(id)) roles.add("support");
  }
  if ((f.useActions ?? []).some(a => a.type === "removeStatus")) roles.add("support");
  if ((system.tags ?? []).includes("Movement") || statuses.includes("flying")) roles.add("move");

  // "Major · Area 4Qd · 4d6": the timing, who it reaches and how hard
  const target = system.target;
  const reach = (!target || ["-", "Self"].includes(target)) ? L("MagicPicker.You")
    : [term("target", target), (system.range && (system.range !== "-")) ? term("range", system.range) : ""].filter(Boolean).join(" ");
  const numeric = Number(dice);
  const power = (deals || heals)
    ? (numeric ? L(heals ? "MagicPicker.HealDice" : "MagicPicker.Dice", { n: numeric }) : L("MagicPicker.MotorDice"))
    : "";
  const tier = motor.needs?.full ? "supreme" : ((Number(motor.gain) >= 2) ? "big" : "");
  return {
    uuid: entry.uuid,
    name: entry.name,
    img: entry.img,
    minRank: Math.max(1, Number(f.minRank) || 1),
    tier,
    tierLabel: tier ? L(`MagicPicker.Tier.${tier}`) : "",
    meta: [term("timing", system.timing ?? ""), reach, power].filter(Boolean).join(" · "),
    statuses: statuses.map(statusLabel),
    roles: [...roles]
  };
}

/* -------------------------------------------- */
/*  Catalog                                     */
/* -------------------------------------------- */

/** The catalog being built or built (Promise of the Magias, in name order). */
let catalogPromise = null;
/** What the Magias' descriptions say (Promise of uuid → text). */
let textsPromise = null;
/** Whether a window waits for the texts: the slices not read yet are then asked at once. */
let textsWanted = false;
/**
 * How many Magias' documents are read in one go: made in one piece of work (the Items, then their texts), a slice keeps a
 * weak PC from stopping the game for long.
 */
const TEXT_SLICE = 20;

/**
 * Every Magia of the compendiums with its spells, in name order. Each one:
 * { uuid, id, name, img, category, tagline, holders, exclusive, choiceGrants, spells, roles, search }
 * (the spells: { uuid, name, img, minRank, tier, tierLabel, meta, statuses, roles }).
 * @returns {Promise<object[]>}
 */
export function magicCatalog() {
  catalogPromise ??= buildCatalog().catch(err => {
    catalogPromise = null;
    throw err;
  });
  return catalogPromise;
}

async function buildCatalog() {
  const magias = [];
  for (const pack of game.packs) {
    if ((pack.documentName !== "Item") || !pack.visible) continue;
    const index = await packIndex(pack);
    const spellsOf = new Map();
    const found = [];
    for (const entry of index) {
      if (entry.type !== "skill") continue;
      const f = entry.flags?.eternia ?? {};
      if (f.magic?.id) found.push(entry);
      // The skills only a choice gives (the Decrees of the Mandamentos) are not spells to learn
      else if (f.magicSpell?.id && !f.choiceOnly) {
        if (!spellsOf.has(f.magicSpell.id)) spellsOf.set(f.magicSpell.id, []);
        spellsOf.get(f.magicSpell.id).push(entry);
      }
    }
    for (const entry of found) {
      const magic = entry.flags.eternia.magic;
      const spells = (spellsOf.get(magic.id) ?? [])
        .sort((a, b) => ((Number(a.flags.eternia.minRank) || 1) - (Number(b.flags.eternia.minRank) || 1)) || (a.sort - b.sort))
        .map(entry => readSpell(entry, pack));
      // The roles of the Magia: those of its spells, the most frequent first
      const counts = new Map();
      for (const spell of spells) for (const role of spell.roles) counts.set(role, (counts.get(role) ?? 0) + 1);
      const roles = [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([id]) => id);
      const tagline = magic.tagline ?? "";
      magias.push({
        uuid: entry.uuid ?? pack.getUuid(entry._id),
        pack: pack.collection,
        _id: entry._id,
        id: magic.id,
        name: entry.name,
        img: entry.img,
        category: categoryOf(magic),
        tagline,
        // How many may hold it at once (0: no limit) and whether it takes every slot (apps/magic-holders.mjs)
        holders: Math.max(0, Math.trunc(Number(magic.holders) || 0)),
        exclusive: !!magic.exclusive || (categoryOf(magic) === "absolute"),
        choiceGrants: (Array.isArray(entry.flags.eternia.choiceGrants) ? entry.flags.eternia.choiceGrants : []).map(String),
        spells,
        roles,
        search: fold([entry.name, tagline, ...spells.map(s => s.name)].join(" "))
      });
    }
  }
  return magias.sort((a, b) => a.name.localeCompare(b.name, game.i18n.lang));
}

/**
 * What the Magias' descriptions say, by uuid: { intro, tabu, trait, notes, visual } (readDescription). Their documents
 * are loaded once, TEXT_SLICE at a time: read ahead (prewarmMagicCatalog), each slice once the game is idle again; for a
 * window waiting for them, the slices left are asked together (each still made when it comes).
 * @returns {Promise<Map<string, object>>}
 */
export function magicTexts() {
  textsWanted = true;
  return textsOf();
}

/** The texts, being read or read (the prewarm asks through here: it doesn't hurry the slices). */
function textsOf() {
  textsPromise ??= loadTexts().catch(err => {
    textsPromise = null;
    throw err;
  });
  return textsPromise;
}

async function loadTexts() {
  const texts = new Map();
  const byPack = new Map();
  for (const m of await magicCatalog()) {
    if (!byPack.has(m.pack)) byPack.set(m.pack, []);
    byPack.get(m.pack).push(m._id);
  }
  const slices = [];
  for (const [id, ids] of byPack) {
    for (let i = 0; i < ids.length; i += TEXT_SLICE) slices.push([id, ids.slice(i, i + TEXT_SLICE)]);
  }
  const read = async ([id, ids]) => {
    const docs = await game.packs.get(id)?.getDocuments({ _id__in: ids }) ?? [];
    for (const doc of docs) texts.set(doc.uuid, readDescription(doc.system?.description));
  };
  // Read ahead, one slice each time the game is idle; once a window waits, the ones left together
  while (slices.length && !textsWanted) {
    await idle(1000, 100);
    await read(slices.shift());
  }
  await Promise.all(slices.map(read));
  return texts;
}

/** What each spell says (uuid → Promise of { summary, html }), read the first time it is asked for. */
const spellPromises = new Map();

/**
 * What these spells say: the first lines of each (the Magia page's tooltip) and its whole text, enriched (opened under
 * it). The ones not read yet come in one go.
 * @param {string[]} uuids
 * @returns {Promise<Map<string, {summary: string, html: string}>>}
 */
export async function spellTexts(uuids) {
  const missing = uuids.filter(uuid => !spellPromises.has(uuid));
  if (missing.length) {
    const loading = loadDocuments(missing);
    for (const uuid of missing) {
      spellPromises.set(uuid, loading.then(async docs => {
        const doc = docs.get(uuid);
        const description = doc?.system?.description ?? "";
        const html = await foundry.applications.ux.TextEditor.implementation.enrichHTML(description, { relativeTo: doc });
        // The first paragraph without its label (the Magia's name), cut at about 320 letters
        const intro = readDescription(description).intro.replace(/\s+/g, " ");
        return { summary: (intro.length > 320) ? `${intro.slice(0, 317).replace(/\s+\S*$/, "")}…` : intro, html };
      }).catch(err => {
        spellPromises.delete(uuid);
        throw err;
      }));
    }
  }
  const out = new Map();
  for (const uuid of uuids) out.set(uuid, await spellPromises.get(uuid));
  return out;
}

/** Forget the catalog (a compendium skill changed, or the compendiums did). */
export function clearMagicCatalog() {
  catalogPromise = null;
  textsPromise = null;
  spellPromises.clear();
}

/** Call during the `init` hook. */
export function registerMagicCatalog() {
  const watch = item => (item.type === "skill") && item.pack && clearMagicCatalog();
  Hooks.on("createItem", watch);
  Hooks.on("updateItem", watch);
  Hooks.on("deleteItem", watch);
  for (const hook of ["createCompendium", "deleteCompendium"]) Hooks.on(hook, clearMagicCatalog);
  // Only an Item compendium's change (the Magias come from them)
  Hooks.on("updateCompendium", pack => (pack.documentName === "Item") && clearMagicCatalog());
}

/** Build the catalog and read the descriptions while the game is idle (the first window opens at once). */
export function prewarmMagicCatalog() {
  return magicCatalog().then(() => textsOf())
    .catch(err => console.warn(`${SYSTEM_ID} | Could not prepare the Magia catalog`, err));
}
