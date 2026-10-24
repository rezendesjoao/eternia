/**
 * What the creation wizard (apps/creation-wizard.mjs) shows: the races, classes and professions the user can take, with
 * what their descriptions say, and the skills they give at CR 1 (a race's two innate ones and its choices, a class's kit
 * and its choices) with the first lines of each. Read once from the compendiums (the option items and those skills:
 * a few dozen documents) and kept until a compendium item changes.
 */
import { L, SYSTEM_ID } from "../settings.mjs";
import { getOptionIndex } from "./option-browser.mjs";
import { CLASSES, KIND_ICONS } from "../classes/data.mjs";
import { motorDef, motorName } from "../classes/motor.mjs";
import { chipText } from "../helpers/text-chips.mjs";
import { tagLabel, term } from "../i18n/terms.mjs";
import { PROFESSIONS, TALENTS } from "../professions/data.mjs";
import { escape } from "../helpers/utils.mjs";

/** The look of each race in the wizard: the color of its medallion and card. */
export const RACE_COLORS = {
  human: "#9a7816",
  elf: "#2f7f86",
  flugel: "#5c7a90",
  etherious: "#5d3fa8",
  oni: "#a3302b",
  exceed: "#2f5fb3",
  vargr: "#6b5a45",
  kitsune: "#b5631c"
};
const DEFAULT_COLOR = "#1f5137";

export const STATS = ["str", "dex", "pow", "int"];

/* -------------------------------------------- */
/*  Reading texts                               */
/* -------------------------------------------- */

const parse = html => new DOMParser().parseFromString(`<div>${html ?? ""}</div>`, "text/html").body.firstElementChild;

/**
 * The parts of a description: each "<strong>Label:</strong> text" of its paragraphs ({label, text}), and the closing
 * line in italics (`lore`).
 * @param {string} html
 */
export function readParts(html) {
  const root = parse(html);
  const parts = [];
  let lore = "";
  for (const p of root.querySelectorAll(":scope > p")) {
    const em = p.querySelector(":scope > em");
    if (em && (em.textContent.trim() === p.textContent.trim())) {
      lore = em.textContent.trim();
      continue;
    }
    let current = null;
    for (const node of p.childNodes) {
      if ((node.nodeType === Node.ELEMENT_NODE) && (node.tagName === "STRONG")) {
        current = { label: node.textContent.trim().replace(/[:.]\s*$/, ""), text: "" };
        parts.push(current);
      }
      else {
        current ??= parts[parts.push({ label: "", text: "" }) - 1];
        current.text += node.textContent;
      }
    }
  }
  for (const part of parts) part.text = part.text.replace(/\s+/g, " ").trim();
  return { parts: parts.filter(p => p.label || p.text), lore };
}

/** The first lines of a skill: its opening paragraph without its label, at most about 300 letters. */
export function skillSummary(html, max = 300) {
  const root = parse(html);
  const first = root.querySelector("p");
  first?.querySelector(":scope > strong:first-child")?.remove();
  let text = (first?.textContent ?? root.textContent ?? "").replace(/\s+/g, " ").trim();
  if (text.length > max) text = `${text.slice(0, max - 3).replace(/\s+\S*$/, "")}…`;
  return text;
}

/** The first sentence of a text (a card's short line). */
export const firstSentence = text => {
  const match = String(text ?? "").match(/^(.+?[.!?])(\s|$)/);
  return (match ? match[1] : String(text ?? "")).trim();
};

/* -------------------------------------------- */
/*  Catalog                                     */
/* -------------------------------------------- */

let catalogPromise = null;

/**
 * The races, classes and professions of the wizard.
 * @returns {Promise<{races: object[], classes: object[], professions: object[]}>}
 */
export function creationCatalog() {
  catalogPromise ??= buildCatalog().catch(err => {
    catalogPromise = null;
    throw err;
  });
  return catalogPromise;
}

/** Forget the catalog (an option item or a compendium skill changed). */
export function clearCreationCatalog() {
  catalogPromise = null;
}

/** Load documents by uuid, a few compendium requests at most (one per compendium). */
export async function loadDocuments(uuids) {
  const byPack = new Map();
  const world = [];
  for (const uuid of new Set(uuids)) {
    const parsed = foundry.utils.parseUuid(uuid);
    if (String(uuid).startsWith("Compendium.") && parsed?.collection && !parsed.embedded?.length) {
      const id = parsed.collection.collection;
      if (!byPack.has(id)) byPack.set(id, []);
      byPack.get(id).push(parsed.id);
    }
    else world.push(uuid);
  }
  const docs = new Map();
  for (const [id, ids] of byPack) {
    for (const doc of await game.packs.get(id).getDocuments({ _id__in: ids })) docs.set(doc.uuid, doc);
  }
  for (const uuid of world) {
    const doc = await fromUuid(uuid).catch(() => null);
    if (doc) docs.set(uuid, doc);
  }
  return docs;
}

/** The view of a skill a race or class gives: what the wizard's tiles and tooltips show. */
function skillView(doc) {
  const s = doc.system ?? {};
  const f = doc.flags?.[SYSTEM_ID] ?? {};
  const kind = f.kind ?? "";
  const meta = [s.subtype ? L(`Skill.Type.${s.subtype}`) : "", s.timing ? term("timing", s.timing) : "",
    (s.cost && (s.cost !== "-")) ? term("cost", s.cost) : ""].filter(Boolean);
  return {
    uuid: doc.uuid,
    name: doc.name,
    img: doc.img,
    subtype: s.subtype ?? "",
    identifier: String(f.identifier ?? ""),
    minRank: Math.max(1, Number(f.minRank) || 1),
    kind,
    kindIcon: KIND_ICONS[kind] ?? "",
    kindLabel: kind ? L(`Classes.Kind.${kind}`) : "",
    meta: meta.join(" · "),
    text: skillSummary(s.description),
    element: f.element ?? null,
    magic: f.magic ?? null,
    choiceGrants: Array.isArray(f.choiceGrants) ? f.choiceGrants.map(String) : []
  };
}

/** The tooltip of a skill tile (the same look as the class tab's). */
export function skillTip(view) {
  return `<div class="lhcl-tip"><header><img src="${view.img}" alt=""><div><strong>${escape(view.name)}</strong>`
    + `${view.meta ? `<span>${escape(view.meta)}</span>` : ""}</div></header>`
    + `${view.text ? `<p>${escape(view.text)}</p>` : ""}</div>`;
}

/** The grants of an option item at a CR: { index, rank, choice, auto, magic, uuids }. */
const grantsOf = item => (item.system?.grants ?? []).map((g, index) => ({
  index, rank: Number(g?.rank) || 1, choice: (g?.uuids ?? []).length > 1, auto: !!g?.auto, magic: !!g?.magic, uuids: g?.uuids ?? []
}));

async function buildCatalog() {
  const [raceIndex, classIndex, professionIndex] = await Promise.all(["race", "class", "subclass"].map(type => getOptionIndex(type)));
  const races = raceIndex.filter(e => !e.retired);
  const classes = classIndex.filter(e => !e.retired && CLASSES[e.identifier]?.family);
  const professions = professionIndex.filter(e => PROFESSIONS[e.identifier]);
  // One of each profession (the system compendium first)
  const seen = new Set();
  const uniqueProfessions = professions.filter(e => !seen.has(e.identifier) && seen.add(e.identifier));

  const optionDocs = await loadDocuments([...races, ...classes, ...uniqueProfessions].map(e => e.uuid));
  const skillUuids = [];
  for (const doc of optionDocs.values()) for (const g of grantsOf(doc)) skillUuids.push(...g.uuids);
  const skillDocs = await loadDocuments(skillUuids);
  const skill = uuid => (skillDocs.has(uuid) ? skillView(skillDocs.get(uuid)) : null);
  const grant = g => ({ ...g, options: g.uuids.map(skill).filter(Boolean) });

  return {
    races: races.map(e => optionDocs.get(e.uuid)).filter(Boolean).map(doc => raceView(doc, grant)),
    // The physical classes first, then the magic ones
    classes: classes.map(e => optionDocs.get(e.uuid)).filter(Boolean).map(doc => classView(doc, grant))
      .sort((a, b) => ((a.family === b.family) ? a.name.localeCompare(b.name, game.i18n.lang) : ((a.family === "physical") ? -1 : 1))),
    professions: uniqueProfessions.map(e => optionDocs.get(e.uuid)).filter(Boolean).map(professionView)
  };
}

/** A race: its numbers, its lore, its innate skills (a choice becomes a set of options) and its unlockable skills. */
function raceView(doc, grant) {
  const s = doc.system;
  const id = s.identifier ?? "";
  const { lore } = readParts(s.description);
  const attributes = Object.fromEntries(STATS.map(k => [k, Number(s.attributes?.[k]) || 0]));
  const bonus = STATS.filter(k => attributes[k]).map(k => `${L(`Sheet.Attr.${k}.abbr`)} +${attributes[k]}`);
  return {
    uuid: doc.uuid,
    name: doc.name,
    img: doc.img,
    identifier: id,
    human: id === "human",
    color: RACE_COLORS[id] ?? DEFAULT_COLOR,
    attributes,
    bonusLabel: (id === "human") ? L("Wizard.Race.HumanShort") : bonus.join(", "),
    hp: Number(s.hp) || 0,
    fate: Number(s.fate) || 0,
    lore,
    tagline: firstSentence(lore),
    grants: grantsOf(doc).filter(g => !g.magic && (g.rank <= 1)).map(grant).filter(g => g.options.length)
  };
}

/** A class: its family and function, its base, its Motor, the kit and the choices of CR 1, the Magia slots, the Paths. */
function classView(doc, grant) {
  const s = doc.system;
  const def = CLASSES[s.identifier];
  const { parts, lore } = readParts(s.description);
  const motorPart = parts.find(p => /^motor\b/i.test(p.label));
  const magicPart = parts.find(p => /^magias?\b/i.test(p.label));
  const motor = motorDef(def.motor);
  const grants = grantsOf(doc);
  const atRank = rank => grants.filter(g => !g.magic && (g.rank === rank));
  const kit = atRank(1).filter(g => !g.choice).map(grant).flatMap(g => g.options);
  const paths = grants.filter(g => !g.magic && (g.rank === 3) && g.choice).map(grant).flatMap(g => g.options);
  const apex = grants.filter(g => !g.magic && g.auto).map(grant).flatMap(g => g.options)[0] ?? null;
  const magicSlots = grants.filter(g => g.magic).map(g => g.rank);
  return {
    uuid: doc.uuid,
    name: doc.name,
    img: doc.img,
    identifier: s.identifier,
    def,
    family: def.family,
    role: def.role,
    color: def.color,
    eyebrow: `${L(`Classes.Family.${def.family}`)} · ${L(`Classes.Function.${def.role}`)}`,
    familyLabel: L(`Classes.Family.${def.family}`),
    roleLabel: L(`Classes.Function.${def.role}`),
    roles: (s.tags ?? []).map(tagLabel),
    attributes: Object.fromEntries(STATS.map(k => [k, Number(s.attributes?.[k]) || 0])),
    hp: Number(s.hp) || 0,
    hpPerRank: Number(s.hpPerRank) || 0,
    band: def.band ? L(`Classes.Band.${def.band}`) : "",
    motor: motor ? {
      name: motorName(motor),
      text: motorPart?.text ?? "",
      card: ["Gain", "Spend", "Cap", "Reset"].map(part => ({
        label: L(`Classes.Card.${part}`), html: chipText(L(`${motor.i18n}.Card.${part}`))
      }))
    } : null,
    magicText: magicPart?.text ?? "",
    lore,
    tagline: firstSentence(motorPart?.text ?? lore),
    kit,
    // The choices of CR 1 (the Dragon Slayer's element)
    choices: atRank(1).filter(g => g.choice).map(grant).filter(g => g.options.length),
    magicSlots,
    firstMagic: magicSlots.includes(1),
    paths,
    apex
  };
}

/** A profession: its crest, what it makes and its talent. */
function professionView(doc) {
  const id = doc.system.identifier;
  const def = PROFESSIONS[id];
  const { parts, lore } = readParts(doc.system.description);
  const talent = TALENTS[def.talent];
  return {
    uuid: doc.uuid,
    id,
    name: L(`Profession.Name.${id}`),
    img: def.img,
    color: def.color,
    icon: def.icon,
    crafts: L(`Profession.Crafts.${id}`),
    crafter: def.kinds.length > 0,
    talent: {
      name: L(`Profession.Talent.${def.talent}.name`),
      text: L(`Profession.Talent.${def.talent}.text`),
      icon: talent.icon,
      passive: !talent.action
    },
    workshop: parts.find(p => /^oficina\b/i.test(p.label))?.text ?? "",
    rank: parts.find(p => /^rank\b/i.test(p.label))?.text ?? "",
    lore,
    tagline: firstSentence(lore)
  };
}

/** Call during the `init` hook. */
export function registerCreationCatalog() {
  const watch = item => (["race", "class", "subclass", "skill"].includes(item.type) && (item.pack || !item.parent)) && clearCreationCatalog();
  Hooks.on("createItem", watch);
  Hooks.on("updateItem", watch);
  Hooks.on("deleteItem", watch);
  for (const hook of ["createCompendium", "deleteCompendium", "updateCompendium"]) Hooks.on(hook, clearCreationCatalog);
}
