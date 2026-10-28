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
import { isEmpty, tagLabel, term } from "../i18n/terms.mjs";
import { PROFESSIONS, TALENTS } from "../professions/data.mjs";
import { escape } from "../helpers/utils.mjs";
import { loadDocuments } from "../helpers/pack-index.mjs";
import { GROUP_COLORS, RACE_COLORS, RACE_DEFAULT_COLOR, RACE_ORDER, ROMAN } from "../races/data.mjs";

export { loadDocuments };

/** The look of each race in the wizard: the color of its medallion and card. */
export { RACE_COLORS };
const DEFAULT_COLOR = RACE_DEFAULT_COLOR;

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

/**
 * The fields of a skill the reading box shows: the action HUD's tooltip fields (hud/data.mjs), without the damage, which
 * the text right below tells with its highlights.
 */
const READING_FIELDS = [
  ["ETERNIA.Item.Label.Timing", "timing", "timing"], ["ETERNIA.Item.Label.Check", "checkLabel", "check"],
  ["ETERNIA.Item.Label.Target", "target", "target"], ["ETERNIA.Item.Label.Range", "range", "range"],
  ["ETERNIA.Sheet.Cost", "cost", "cost"], ["ETERNIA.Sheet.Limit", "limit", "limit"]
];

/**
 * What the reading box of the skills step shows of a skill: its name and picture, the fields and the tags as the table
 * reads them, the SR it can reach (from 1, at creation) and its whole text.
 * @param {Item|undefined} doc  The skill's document
 * @returns {Promise<{name: string, img: string, subtype: string, fields: {label: string, value: string}[], tags: string[], html: string}>}
 */
export async function skillReading(doc) {
  const s = doc?.system ?? {};
  const fields = READING_FIELDS.filter(([, key]) => !isEmpty(s[key]))
    .map(([label, key, field]) => ({ label: game.i18n.localize(label), value: term(field, s[key]) }));
  const maxSR = Number(s.skillRank?.max) || 1;
  if (maxSR > 1) fields.push({ label: L("Wizard.Reader.SR"), value: L("Wizard.Reader.SRValue", { max: maxSR }) });
  const html = doc ? await foundry.applications.ux.TextEditor.implementation.enrichHTML(s.description ?? "", { relativeTo: doc }) : "";
  return { name: doc?.name ?? "", img: doc?.img ?? "", subtype: s.subtype ?? "", fields, tags: (s.tags ?? []).map(tagLabel), html };
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
  // The skills of the stages of a race's form
  for (const doc of optionDocs.values()) for (const st of stagesOf(doc)) for (const slot of st.grants) skillUuids.push(...slot);
  const skillDocs = await loadDocuments(skillUuids);
  const skill = uuid => (skillDocs.has(uuid) ? skillView(skillDocs.get(uuid)) : null);
  const grant = g => ({ ...g, options: g.uuids.map(skill).filter(Boolean) });

  return {
    // In the order of the world's races (the others after, by name)
    races: races.map(e => optionDocs.get(e.uuid)).filter(Boolean).map(doc => raceView(doc, grant, skill))
      .sort((a, b) => (raceOrder(a) - raceOrder(b)) || a.name.localeCompare(b.name, game.i18n.lang)),
    // The physical classes first, then the magic ones
    classes: classes.map(e => optionDocs.get(e.uuid)).filter(Boolean).map(doc => classView(doc, grant))
      .sort((a, b) => ((a.family === b.family) ? a.name.localeCompare(b.name, game.i18n.lang) : ((a.family === "physical") ? -1 : 1))),
    professions: uniqueProfessions.map(e => optionDocs.get(e.uuid)).filter(Boolean).map(professionView)
  };
}

const raceOrder = race => (RACE_ORDER.includes(race.identifier) ? RACE_ORDER.indexOf(race.identifier) : RACE_ORDER.length);

/** The stages 2 to 5 of a race's form (races/evolution.mjs), as the race item lists them. */
const stagesOf = doc => (Array.isArray(doc.flags?.[SYSTEM_ID]?.stages) ? doc.flags[SYSTEM_ID].stages : [])
  .filter(st => Number(st?.stage) >= 2)
  .map(st => ({ ...st, grants: (st.grants ?? []).map(slot => (Array.isArray(slot) ? slot : [slot]).map(String)) }));

/** A race: its numbers, its lore, its innate skills (a choice becomes a set of options), its group (the Bestials'
    lineages) and the stages of its form with the skills of each. */
function raceView(doc, grant, skill) {
  const s = doc.system;
  const id = s.identifier ?? "";
  const f = doc.flags?.[SYSTEM_ID] ?? {};
  const { lore } = readParts(s.description);
  const attributes = Object.fromEntries(STATS.map(k => [k, Number(s.attributes?.[k]) || 0]));
  const bonus = STATS.filter(k => attributes[k]).map(k => `${L(`Sheet.Attr.${k}.abbr`)} +${attributes[k]}`);
  const stages = stagesOf(doc).map(st => {
    const attribute = (st.attribute ?? []).filter(k => STATS.includes(k));
    return {
      stage: Number(st.stage),
      roman: ROMAN[Number(st.stage)] ?? "",
      rank: Number(st.rank) || 1,
      name: String(st.name ?? ""),
      rite: String(st.rite ?? ""),
      // A slot with several skills is a choice: its tiles say so
      slots: st.grants.map(slot => slot.map(skill).filter(Boolean)).filter(slot => slot.length),
      attribute: attribute.length ? L("Wizard.Race.StageAttribute", {
        stats: (attribute.length === 4) ? L("Wizard.Race.AnyAttribute") : attribute.map(k => L(`Sheet.Attr.${k}.abbr`)).join(` ${L("Wizard.Race.Or")} `)
      }) : ""
    };
  });
  return {
    group: f.raceGroup ?? null,
    groupColor: GROUP_COLORS[f.raceGroup] ?? null,
    lineage: f.lineage ?? "",
    firstStage: Array.isArray(f.stages) ? String(f.stages.find(st => Number(st?.stage) === 1)?.name ?? "") : "",
    stages,
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
