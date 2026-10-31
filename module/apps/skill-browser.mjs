/**
 * Skill selection window (in the spirit of the PF2e Compendium Browser): Combat / General / Basic tabs,
 * search and source filter over every skill of the Item compendiums, and a selection confirmed at
 * once. It opens showing only what the character can pick now: the skills of a higher CR, those missing a
 * requirement and those at their Maximum SR are hidden until "only what I can pick" is unchecked. Each pick acquires
 * a skill (SR 1) or raises it by one SR, and one skill can take several picks of a selection (acquired and raised, or
 * raised twice), never beyond its Maximum SR or the character's CR. A talent can be picked with the one it requires.
 *
 * At character creation and after a CR Up the character has skills to choose
 * (`flags.eternia.skillProgress`): the window counts them down. Opened from the sheet without pending
 * picks it has no quota. Basic skills are never counted.
 *
 * Which skills a character can learn comes from the compendium folders: Main Class (the folder named like the
 * class, docs/classes.md), Race (Human...) and Common, plus the skills its Subclass allows (`system.skills` of the
 * Subclass item) and those its Dedications open.
 *
 * Flags of a compendium skill narrow that down:
 *   flags.eternia.minRank     the CR from which it can be learned (the race skills unlocked by leveling up)
 *   flags.eternia.choiceOnly  it is only given by a choice (a race's starting skill, a Blessing, a class Path):
 *                             listed only once the character has it, to raise its SR
 *   flags.eternia.requires    identifiers of the skills it needs first (a branch of class talents)
 *   flags.eternia.pathTalent  { class, id }: a talent of a class Path, listed only for who follows that Path
 *   flags.eternia.elementTalent  { class, id }: a talent of an element (the Dragon Slayer's), listed only for who has
 *                             that element's skill (flags.eternia.element)
 *   flags.eternia.magicSpell  { id }: a spell of a Magia (the source "magic"), listed only for who has that Magia
 *                             (flags.eternia.magic), whatever its class
 *   flags.eternia.dedication  { name, id }: the Dedication of a class (the multiclass, from CR 5), listed for
 *                             characters of other classes: it opens that class's [Dedication] talents, two CR later.
 *                             At most two Dedications, the second after two talents of the first.
 *   flags.eternia.retired     it left the lists (the Dedication of a class another one replaced): listed only for
 *                             who already has it
 */

import { getOption } from "../helpers/character-options.mjs";
import { isLocalChange } from "../helpers/clients.mjs";
import { packIndex } from "../helpers/pack-index.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

/** Skill subtypes counted in the picks of a character (creation, CR Up). */
export const PICK_SUBTYPES = ["Combat", "General"];

/** Tabs of the window: the counted subtypes, then the Basic skills. */
const TABS = [...PICK_SUBTYPES, "Basic"];

/**
 * Flag of the skill picks record of a character: { base, creation }. The picks it is owed are worked
 * out from its CR: the creation picks (when `creation`), then those of each rank from base + 1 to its
 * CR. `base` is the CR the count starts from (1 for a character made with the creation picks, the CR
 * of its first CR Up otherwise).
 */
export const PROGRESS_FLAG = "skillProgress";

/**
 * Hidden mark of the skills chosen in the window (only picks that count): a list of
 * { rank, subtype, kind: "new" | "raise", fromSR }, one per pick, with the CR it was made at. The
 * picks spent are counted from these marks, and lowering the CR or removing the Main Class offers to
 * undo the marked picks (delete the skill / give back the SR).
 */
export const PICK_FLAG = "skillPicks";

/** Skills chosen at character creation, besides the three automatic ones of the Main Class. */
const CREATION_SKILLS = { combat: 3, general: 1 };

/** [Training] skills a character can acquire at creation. */
const CREATION_TRAINING = 2;
const TRAINING_TAG = "training";

/** CR from which a rank up grants one Combat skill instead of two. */
const LATE_RANK = 11;

/** Skills a character acquires or ranks up when reaching a CR. */
export function rankUpSkills(rank) {
  return { combat: (rank >= LATE_RANK) ? 1 : 2, general: 1 };
}


/** Folder of the skills every character can learn. */
const COMMON_FOLDER = "common";

/**
 * Compendiums of the Basic skills a character can take (not the GM EX Powers nor monster skills). A mount's skills come
 * with the mount (mounts/), never from here.
 */
const BASIC_PACKS = ["eternia.skills-basic"];

/** Source filter values, in display order. */
const SOURCES = ["eligible", "class", "magic", "dedication", "race", "subclass", "common", "all"];
/** Tag of the class talents a Dedication opens. */
const DEDICATION_TAG = "dedication";
/** Dedications a character can have, and the talents of the first one it needs before a second. */
const MAX_DEDICATIONS = 2;
const TALENTS_BEFORE_SECOND = 2;
/** CR a Dedication adds to the CR from which a talent it opens can be learned. */
const DEDICATION_DELAY = 2;

/** A string of the window. */
const T = (key, data) => (data ? game.i18n.format(`ETERNIA.SkillBrowser.${key}`, data) : game.i18n.localize(`ETERNIA.SkillBrowser.${key}`));

/* -------------------------------------------- */
/*  Index                                       */
/* -------------------------------------------- */

const INDEX_FIELDS = [
  "system.subtype", "system.skillRank", "system.tags", "folder", "flags.eternia.minRank", "flags.eternia.choiceOnly",
  "flags.eternia.requires", "flags.eternia.pathTalent", "flags.eternia.elementTalent", "flags.eternia.magicSpell",
  "flags.eternia.dedication", "flags.eternia.identifier", "flags.eternia.retired"
];
const listOf = value => (Array.isArray(value) ? value : ((typeof value === "string") ? [value] : Object.values(value ?? {})));

let indexPromise = null;

/** Forget the index (a skill changed in a compendium, or the compendiums changed). */
export function clearSkillIndex() {
  indexPromise = null;
}

/** Every Combat / General / Basic skill of the visible Item compendiums. */
export function getSkillIndex() {
  indexPromise ??= buildIndex();
  return indexPromise;
}

async function buildIndex() {
  const entries = [];
  for (const pack of game.packs) {
    if ((pack.documentName !== "Item") || !pack.visible) continue;
    const index = await packIndex(pack, INDEX_FIELDS);
    for (const e of index) {
      if ((e.type !== "skill") || !TABS.includes(e.system?.subtype)) continue;
      // Folder placeholders left in the compendiums by the old Compendium Folders module.
      if (e.name?.startsWith("#[CF_tempEntity]")) continue;
      // Folder names from the skill up to the root, lowercased, to match classes / races.
      const folders = [];
      let folder = e.folder ? pack.folders.get(e.folder) : null;
      while (folder) {
        folders.push(folder.name);
        folder = folder.folder;
      }
      const flags = e.flags?.eternia ?? {};
      const path = flags.pathTalent;
      const element = flags.elementTalent;
      entries.push({
        uuid: e.uuid ?? pack.getUuid(e._id),
        name: e.name,
        img: e.img,
        subtype: e.system.subtype,
        maxSR: Number(e.system.skillRank?.max) || 1,
        minRank: Number(flags.minRank) || 0,
        choiceOnly: !!flags.choiceOnly,
        identifier: String(flags.identifier ?? ""),
        requires: listOf(flags.requires).map(String).filter(Boolean),
        pathTalent: path?.class ? `${path.class}.${path.id}` : "",
        elementTalent: element?.class ? `${element.class}.${element.id}` : "",
        magicSpell: String(flags.magicSpell?.id ?? ""),
        dedicationOf: flags.dedication?.name ? { name: normalize(flags.dedication.name), id: String(flags.dedication.id ?? "") } : null,
        dedicationTalent: (e.system.tags ?? []).some(t => normalize(t) === DEDICATION_TAG),
        retired: !!flags.retired,
        tags: e.system.tags ?? [],
        folder: folders[0] ?? "",
        folders: folders.map(f => f.toLowerCase()),
        pack: pack.title,
        packId: pack.collection
      });
    }
  }
  return entries.sort((a, b) => a.name.localeCompare(b.name, game.i18n.lang));
}

function normalize(name) {
  return String(name ?? "").trim().toLowerCase();
}

/**
 * Where a character can learn a skill from: "class", "dedication", "race", "subclass", "common" or null.
 * @param {object} entry  Index entry
 * @param {{class: string, race: string, subclass: Set<string>, dedications: string[]}} lists  The character's skill lists
 */
function sourceOf(entry, lists) {
  // Basic skills of the system compendiums belong to every character.
  if (entry.subtype === "Basic") return BASIC_PACKS.includes(entry.packId) ? "basic" : null;
  // The spells of a Magia are for who has it, whatever the class.
  if (entry.magicSpell) return lists.magics.has(entry.magicSpell) ? "magic" : null;
  const folders = entry.folders;
  // A class's Dedication is for the characters of the other classes.
  if (entry.dedicationOf) return (lists.class && (entry.dedicationOf.name !== lists.class)) ? "dedication" : null;
  if (lists.class && folders.includes(lists.class)) return "class";
  if (entry.dedicationTalent && lists.dedications.some(c => folders.includes(c))) return "dedication";
  if (lists.race && folders.includes(lists.race)) return "race";
  if (lists.subclass.has(entry.uuid)) return "subclass";
  if (folders.includes(COMMON_FOLDER)) return "common";
  return null;
}

/**
 * The skill lists of a character: its class name, race name and Subclass skills, the classes of its Dedications,
 * the Paths it follows ("class.id") and the identifiers of its skills.
 */
function skillLists(actor) {
  const job = getOption(actor, "class");
  const skills = actor.items.filter(i => i.type === "skill");
  const dedications = skills.map(i => i.getFlag("eternia", "dedication")).filter(d => d?.name);
  return {
    class: normalize(job?.name),
    race: normalize(getOption(actor, "race")?.name),
    subclass: new Set(getOption(actor, "subclass")?.system.skills ?? []),
    dedications: dedications.map(d => normalize(d.name)),
    dedicationIds: dedications.map(d => String(d.id ?? "")),
    paths: new Set(skills.map(i => i.getFlag("eternia", "path")).filter(p => p?.class).map(p => `${p.class}.${p.id}`)),
    elements: new Set(skills.map(i => i.getFlag("eternia", "element")).filter(e => e?.class).map(e => `${e.class}.${e.id}`)),
    magics: new Set(skills.map(i => i.getFlag("eternia", "magic")?.id).filter(Boolean)),
    identifiers: new Set(skills.map(i => i.getFlag("eternia", "identifier")).filter(Boolean))
  };
}

/**
 * Why a Dedication can't be taken yet: at most two, and the second after two talents of the first.
 * @param {Actor} actor
 * @param {object} lists   See skillLists
 * @returns {string}
 */
function dedicationIssue(actor, lists) {
  if (lists.dedications.length >= MAX_DEDICATIONS) {
    return game.i18n.format("ETERNIA.SkillBrowser.DedicationMax", { max: MAX_DEDICATIONS });
  }
  if (!lists.dedicationIds.length) return "";
  const first = lists.dedicationIds[0];
  const talents = actor.items.filter(i => (i.type === "skill") && String(i.getFlag("eternia", "identifier") ?? "").startsWith(`${first}-`)
    && (i.system.tags ?? []).some(t => normalize(t) === DEDICATION_TAG)).length;
  return (talents < TALENTS_BEFORE_SECOND)
    ? game.i18n.format("ETERNIA.SkillBrowser.DedicationNext", { n: TALENTS_BEFORE_SECOND, have: talents }) : "";
}

/** The character's copy of a skill (same compendium entry, or same name). */
function ownedSkill(actor, entry) {
  return actor.items.find(i => (i.type === "skill")
    && ((i._stats?.compendiumSource === entry.uuid) || (normalize(i.name) === normalize(entry.name))));
}

/**
 * The character's copies of the skills, for a whole list of entries (a render of the window): entry -> what ownedSkill
 * finds, the first of the character's skills from that compendium entry or of that name (null when none), read once
 * from its items.
 * @param {Actor} actor
 * @returns {(entry: object) => Item|null}
 */
function ownedSkills(actor) {
  const order = new Map();
  const bySource = new Map();
  const byName = new Map();
  for (const item of actor.items) {
    if (item.type !== "skill") continue;
    order.set(item, order.size);
    const source = item._stats?.compendiumSource;
    if (!bySource.has(source)) bySource.set(source, item);
    const name = normalize(item.name);
    if (!byName.has(name)) byName.set(name, item);
  }
  return entry => {
    const source = bySource.get(entry.uuid);
    const named = byName.get(normalize(entry.name));
    if (!source || !named) return source ?? named ?? null;
    return (order.get(source) <= order.get(named)) ? source : named;
  };
}

/* -------------------------------------------- */
/*  Pending picks                               */
/* -------------------------------------------- */

function rankOf(actor) {
  return Number(actor.system.infos?.crank) || 1;
}

/** Skill picks record of a character, or null when it has none. */
function getProgress(actor) {
  return actor.getFlag("eternia", PROGRESS_FLAG) ?? null;
}

/** Skills a character is owed at its CR: { Combat, General }. */
function ownedPicks(actor, progress) {
  const picks = { Combat: 0, General: 0 };
  if (progress.creation) {
    picks.Combat += CREATION_SKILLS.combat;
    picks.General += CREATION_SKILLS.general;
  }
  for (let rank = (Number(progress.base) || 1) + 1; rank <= rankOf(actor); rank++) {
    const skills = rankUpSkills(rank);
    picks.Combat += skills.combat;
    picks.General += skills.general;
  }
  return picks;
}

/** Marked picks of a skill item. */
function picksOf(item) {
  const picks = item.getFlag("eternia", PICK_FLAG);
  return Array.isArray(picks) ? picks : [];
}

/** Picks the character has spent: { Combat, General }. */
function spentPicks(actor) {
  const spent = { Combat: 0, General: 0 };
  for (const item of actor.items) {
    if (item.type !== "skill") continue;
    for (const pick of picksOf(item)) if (pick.subtype in spent) spent[pick.subtype] += 1;
  }
  return spent;
}

/** Skills a character still has to choose: { Combat, General } (none without a Main Class). */
export function getPendingSkills(actor) {
  const progress = getProgress(actor);
  if (!progress || !getOption(actor, "class")) return { Combat: 0, General: 0 };
  const owed = ownedPicks(actor, progress);
  const spent = spentPicks(actor);
  return Object.fromEntries(PICK_SUBTYPES.map(s => [s, Math.max(0, owed[s] - spent[s])]));
}

function isTraining(entry) {
  return (entry.tags ?? []).some(t => normalize(t) === TRAINING_TAG);
}

/** [Training] skills the character can still acquire (at creation), or null when there is no such limit. */
function getTrainingLimit(actor) {
  const progress = getProgress(actor);
  if (!progress?.creation || (rankOf(actor) > 1)) return null;
  const acquired = actor.items.filter(i => (i.type === "skill") && isTraining(i.system)
    && picksOf(i).some(p => (p.kind === "new") && (p.rank === 1))).length;
  return Math.max(0, CREATION_TRAINING - acquired);
}

/**
 * Start counting the skill picks of a character that has no record yet: from its current CR (or the CR given: the
 * one it is leaving), before its first CR Up.
 * @param {Actor} actor
 * @param {number} [base]
 */
export async function startSkillProgress(actor, base = rankOf(actor)) {
  if (getProgress(actor)) return;
  await actor.setFlag("eternia", PROGRESS_FLAG, { base: Math.max(1, Number(base) || 1), creation: false });
}

/**
 * How many skills a character could start learning between two CRs (minRank in (from, to]), by source: the class's
 * talents, its Magias' spells, its race's unlockable skills and its Dedications' talents (the rank-up box).
 * @param {Actor} actor
 * @param {number} from
 * @param {number} to
 * @returns {Promise<{class: number, magic: number, race: number, dedication: number}>}
 */
export async function unlocksBetween(actor, from, to) {
  const lists = skillLists(actor);
  const out = { class: 0, magic: 0, race: 0, dedication: 0 };
  const index = await getSkillIndex();
  const ownedOf = ownedSkills(actor);
  for (const entry of index) {
    if (!PICK_SUBTYPES.includes(entry.subtype) || entry.choiceOnly || entry.dedicationOf) continue;
    const source = sourceOf(entry, lists);
    if (!(source in out)) continue;
    if (entry.pathTalent && !lists.paths.has(entry.pathTalent)) continue;
    if (entry.elementTalent && !lists.elements.has(entry.elementTalent)) continue;
    if (ownedOf(entry)) continue;
    const minRank = entry.minRank + (((source === "dedication") && entry.dedicationTalent) ? DEDICATION_DELAY : 0);
    if ((minRank > from) && (minRank <= to)) out[source] += 1;
  }
  return out;
}

/**
 * A Main Class was taken: at CR 1 the character gets its creation picks, the three Combat skills and
 * the General skill (at most two [Training] skills); then the selection opens when there are picks
 * to choose. A CR 1 character with skills of its own and no record (made before this existed)
 * doesn't get creation picks.
 * @param {Actor} actor
 */
export async function offerClassSkills(actor) {
  if ((rankOf(actor) === 1) && !getProgress(actor)?.creation) {
    const chosen = actor.items.some(i => (i.type === "skill") && PICK_SUBTYPES.includes(i.system.subtype)
      && !i.getFlag("eternia", "grantedBy") && !picksOf(i).length);
    if (getProgress(actor) || !chosen) await actor.setFlag("eternia", PROGRESS_FLAG, { base: 1, creation: true });
  }
  const pending = getPendingSkills(actor);
  if (PICK_SUBTYPES.some(s => pending[s] > 0)) return SkillBrowser.open(actor);
}

/* -------------------------------------------- */
/*  Creation picks (the creation wizard)        */
/* -------------------------------------------- */

/** How many skills of each subtype a character picks at creation, and the [Training] ones it can take. */
export const CREATION_PICKS = { Combat: CREATION_SKILLS.combat, General: CREATION_SKILLS.general, training: CREATION_TRAINING };

/**
 * The skill lists of a character being made (the shape of skillLists), from what it will have.
 * @param {object} draft
 * @param {string} [draft.className]
 * @param {string} [draft.raceName]
 * @param {string[]} [draft.subclassSkills]  The skills its Subclass allows
 * @param {string[]} [draft.magics]          The ids of its Magias
 * @param {string[]} [draft.elements]        Its elements ("class.id")
 * @param {string[]} [draft.identifiers]     The identifiers of the skills it will have
 */
export function creationLists({ className = "", raceName = "", subclassSkills = [], magics = [], elements = [], identifiers = [] } = {}) {
  return {
    class: normalize(className),
    race: normalize(raceName),
    subclass: new Set(subclassSkills),
    dedications: [],
    dedicationIds: [],
    paths: new Set(),
    elements: new Set(elements),
    magics: new Set(magics),
    identifiers: new Set(identifiers.filter(Boolean))
  };
}

/**
 * The Combat and General skills a character being made can take with its creation picks: those of its lists at CR 1,
 * without the ones it gets anyway, and why each can't be picked now (`reason`, empty when it can). A talent shows when
 * what it requires can be picked too, and is picked with it. The rules are the window's at CR 1.
 * @param {object} lists                 See creationLists
 * @param {object} [options]
 * @param {Set<string>} [options.picked]  The uuids picked so far
 * @param {Set<string>} [options.owned]   The uuids of the skills it gets anyway (the kit, the race, the Magia...)
 * @returns {Promise<object[]>}  Index entries with { source, picked, reason, training }
 */
export async function creationCandidates(lists, { picked = new Set(), owned = new Set() } = {}) {
  const index = await getSkillIndex();
  const ownedNames = new Set(index.filter(e => owned.has(e.uuid)).map(e => normalize(e.name)));
  const open = [];
  for (const entry of index) {
    if (!PICK_SUBTYPES.includes(entry.subtype)) continue;
    if (owned.has(entry.uuid) || ownedNames.has(normalize(entry.name))) continue;
    if (entry.choiceOnly || entry.retired || entry.dedicationOf) continue;
    const source = sourceOf(entry, lists);
    if (!source) continue;
    if (entry.pathTalent && !lists.paths.has(entry.pathTalent)) continue;
    if (entry.elementTalent && !lists.elements.has(entry.elementTalent)) continue;
    const minRank = entry.minRank + (((source === "dedication") && entry.dedicationTalent) ? DEDICATION_DELAY : 0);
    if (minRank > 1) continue;
    open.push({ entry, source });
  }
  // What can be had at CR 1: the identifiers it will have and those of the skills open now
  const reachable = new Set([...lists.identifiers, ...open.map(o => o.entry.identifier).filter(Boolean)]);
  const have = new Set([...lists.identifiers, ...open.filter(o => picked.has(o.entry.uuid)).map(o => o.entry.identifier).filter(Boolean)]);
  const count = subtype => open.filter(o => picked.has(o.entry.uuid) && (o.entry.subtype === subtype)).length;
  const training = open.filter(o => picked.has(o.entry.uuid) && isTraining(o.entry)).length;
  const name = id => index.find(e => e.identifier === id)?.name ?? id;
  return open.filter(({ entry }) => entry.requires.every(r => reachable.has(r))).map(({ entry, source }) => {
    const isPicked = picked.has(entry.uuid);
    const missing = isPicked ? [] : entry.requires.filter(r => !have.has(r));
    const full = !isPicked && (count(entry.subtype) >= CREATION_PICKS[entry.subtype]);
    const trainingFull = !isPicked && isTraining(entry) && (training >= CREATION_TRAINING);
    const reason = missing.length ? T("Requires", { names: missing.map(name).join(", ") })
      : (full ? T("Full") : (trainingFull ? T("TrainingFull", { max: CREATION_TRAINING }) : ""));
    return { ...entry, source, picked: isPicked, reason, training: isTraining(entry) };
  });
}

/* -------------------------------------------- */
/*  Undoing picks                               */
/* -------------------------------------------- */

/** Actor id -> Promise of the undo dialog in progress (the class selection waits for it). */
const rollbacks = new Map();

/** Wait for the undo dialog of a character, if one is open. */
export function waitForRollback(actor) {
  return rollbacks.get(actor.id);
}

/**
 * Offer to undo marked picks: the skills acquired are deleted, the SR raised given back. The skills
 * the user keeps lose the marks of those picks (they no longer count as picks).
 * @param {Actor} actor
 * @param {object} options
 * @param {number} [options.aboveRank]  Undo the picks made above this CR (CR lowered); all when omitted
 * @param {string} options.reason       Localization key of the dialog hint
 * @returns {Promise<void>}
 */
export function rollbackPicks(actor, { aboveRank = 0, reason }) {
  const previous = rollbacks.get(actor.id) ?? Promise.resolve();
  const run = previous.then(() => rollbackDialog(actor, aboveRank, reason)).finally(() => {
    if (rollbacks.get(actor.id) === run) rollbacks.delete(actor.id);
  });
  rollbacks.set(actor.id, run);
  return run;
}

async function rollbackDialog(actor, aboveRank, reason) {
  const rows = [];
  for (const item of actor.items) {
    if (item.type !== "skill") continue;
    const undone = picksOf(item).filter(p => p.rank > aboveRank);
    if (!undone.length) continue;
    const acquired = undone.some(p => p.kind === "new");
    // Back to the SR before the first pick undone.
    const fromSR = Math.min(...undone.filter(p => p.kind === "raise").map(p => Number(p.fromSR) || 1));
    const sr = Number(item.system.skillRank?.value) || 1;
    rows.push({
      id: item.id,
      name: item.name,
      img: item.img,
      acquired,
      fromSR,
      action: acquired
        ? game.i18n.localize("ETERNIA.SkillBrowser.Undo.Delete")
        : game.i18n.format("ETERNIA.SkillBrowser.Undo.Lower", { from: sr, to: fromSR }),
      ranks: [...new Set(undone.map(p => p.rank))].sort((x, y) => x - y).join(", ")
    });
  }
  if (!rows.length) return;

  const { DialogV2 } = foundry.applications.api;
  const content = await foundry.applications.handlebars.renderTemplate(
    "systems/eternia/templates/apps/skill-undo.hbs",
    { rows, hint: game.i18n.format(reason, { name: actor.name, rank: aboveRank }) }
  );
  const data = await DialogV2.wait({
    window: { title: game.i18n.format("ETERNIA.SkillBrowser.Undo.Title", { name: actor.name }), icon: "fa-solid fa-rotate-left" },
    classes: ["eternia", "skill-undo"],
    position: { width: 420 },
    content,
    buttons: [
      {
        action: "apply",
        label: "ETERNIA.SkillBrowser.Undo.Apply",
        icon: "fa-solid fa-check",
        default: true,
        callback: (event, button) => new foundry.applications.ux.FormDataExtended(button.form).object
      },
      { action: "keep", label: "ETERNIA.SkillBrowser.Undo.Keep", icon: "fa-solid fa-xmark", callback: () => ({}) }
    ],
    rejectClose: false
  });
  // Closing the dialog keeps everything, like "Keep".
  const chosen = (data && (typeof data === "object")) ? data : {};

  const toDelete = [];
  const toUpdate = [];
  for (const row of rows) {
    const item = actor.items.get(row.id);
    const kept = picksOf(item).filter(p => p.rank <= aboveRank);
    if (chosen[row.id] && row.acquired) toDelete.push(row.id);
    else if (chosen[row.id]) toUpdate.push({ _id: row.id, "system.skillRank.value": row.fromSR, [`flags.eternia.${PICK_FLAG}`]: kept });
    else toUpdate.push({ _id: row.id, [`flags.eternia.${PICK_FLAG}`]: kept });
  }
  if (toDelete.length) await actor.deleteEmbeddedDocuments("Item", toDelete);
  if (toUpdate.length) await actor.updateEmbeddedDocuments("Item", toUpdate);
}

/* -------------------------------------------- */
/*  Window                                      */
/* -------------------------------------------- */

export class SkillBrowser extends HandlebarsApplicationMixin(ApplicationV2) {

  constructor(actor, options = {}) {
    super({ ...options, id: SkillBrowser.idFor(actor) });
    this.actor = actor;
    this.tab = options.tab ?? "Combat";
    this.source = "eligible";
    this.query = "";
    /** Only the skills the character can pick now (not those of a higher CR, missing a requirement or capped) */
    this.available = true;
    /** uuid -> pick: the skill and `count`, the SRs it gains (the first acquires it when the character lacks it) */
    this.picks = new Map();
    /** uuids whose description is shown */
    this.expanded = new Set();
    /** uuid -> enriched description */
    this.descriptions = new Map();
  }

  static idFor(actor) {
    return `eternia-skill-browser-${actor.id}`;
  }

  /**
   * Open the window of a character (one per character).
   * @param {Actor} actor
   * @param {object} [options]
   * @param {string} [options.tab]  "Combat" or "General"
   */
  static open(actor, { tab } = {}) {
    const existing = foundry.applications.instances.get(SkillBrowser.idFor(actor));
    if (existing) {
      if (tab) existing.tab = tab;
      return existing.render({ force: true });
    }
    const pending = getPendingSkills(actor);
    // Start on the first tab with picks left.
    tab ??= PICK_SUBTYPES.find(s => pending[s] > 0) ?? "Combat";
    return new SkillBrowser(actor, { tab }).render({ force: true });
  }

  static DEFAULT_OPTIONS = {
    classes: ["eternia", "skill-browser"],
    tag: "div",
    window: { icon: "fa-solid fa-book-open-reader", resizable: true },
    position: { width: 640, height: 680 },
    actions: {
      switchTab: SkillBrowser.#onTab,
      pick: SkillBrowser.#onPick,
      unpick: SkillBrowser.#onUnpick,
      expand: SkillBrowser.#onExpand,
      view: SkillBrowser.#onView,
      showAll: SkillBrowser.#onShowAll,
      confirm: SkillBrowser.#onConfirm
    }
  };

  static PARTS = {
    main: { template: "systems/eternia/templates/apps/skill-browser.hbs", scrollable: [".skill-list"] }
  };

  /** @override */
  get title() {
    return game.i18n.format("ETERNIA.SkillBrowser.Title", { name: this.actor.name });
  }

  /** Pending picks of the character, or null when it has none (no quota). */
  get quota() {
    const pending = getPendingSkills(this.actor);
    return PICK_SUBTYPES.some(s => pending[s] > 0) ? pending : null;
  }

  /** Picks of a subtype in the current selection (a skill raised twice counts two). */
  #picked(subtype) {
    return [...this.picks.values()].filter(p => p.subtype === subtype).reduce((n, p) => n + p.count, 0);
  }

  /**
   * What judging the skills needs: the character's lists (with the identifiers of the selection, so a talent can be
   * picked with the one it requires), its CR, the picks owed and the [Training] skills left.
   * @param {object[]} index  The skill index
   */
  #context(index) {
    const actor = this.actor;
    const lists = skillLists(actor);
    for (const pick of this.picks.values()) if (pick.identifier) lists.identifiers.add(pick.identifier);
    // [Training] skills left at creation: the limit minus the new ones picked.
    let training = getTrainingLimit(actor);
    if (training !== null) training -= [...this.picks.values()].filter(p => p.training && !p.owned).length;
    return { index, lists, rank: rankOf(actor), quota: this.quota, training };
  }

  /**
   * Where a skill stands: the SR it has, the picks it has in the selection and why one SR more can't be picked now
   * (`reason`, empty when it can).
   * @param {object} entry   Index entry
   * @param {object} ctx     See #context
   * @param {Item} [owned]   The character's copy of the skill
   */
  #state(entry, { index, lists, rank, quota, training }, owned = ownedSkill(this.actor, entry)) {
    const source = sourceOf(entry, lists);
    const count = this.picks.get(entry.uuid)?.count ?? 0;
    const sr = owned ? (Number(owned.system.skillRank?.value) || 1) : 0;
    const maxSR = owned ? (Number(owned.system.skillRank?.max) || entry.maxSR) : entry.maxSR;
    // The SR one pick more takes it to.
    const next = sr + count + 1;
    const counted = PICK_SUBTYPES.includes(entry.subtype);
    // The skills a talent needs first, and the limits of the Dedications.
    const missing = (owned || count) ? [] : entry.requires.filter(r => !lists.identifiers.has(r));
    const blocked = missing.length
      ? T("Requires", { names: missing.map(r => index.find(e => e.identifier === r)?.name ?? r).join(", ") })
      : ((!owned && !count && entry.dedicationOf) ? dedicationIssue(this.actor, lists) : "");
    const minRank = entry.minRank + (((source === "dedication") && entry.dedicationTalent) ? DEDICATION_DELAY : 0);
    // Not yet: learned from a higher CR.
    const locked = !owned && (minRank > rank);
    // Can't go beyond the Maximum SR of the skill or the character's CR.
    const capped = (next > maxSR) || (next > rank);
    const full = counted && !!quota && (this.#picked(entry.subtype) >= quota[entry.subtype]);
    const trainingFull = !owned && !count && (training !== null) && (training <= 0) && isTraining(entry);
    // Without picks owed, only the GM adds Combat and General skills (the free mode).
    const noPicks = counted && !quota && !game.user.isGM;
    const reason = locked ? T("MinCR", { rank: minRank })
      : noPicks ? T("NoPending")
      : blocked || (capped ? T((next > maxSR) ? "MaxSR" : "MaxCR", { max: Math.min(maxSR, rank) })
        : (full ? T("Full") : (trainingFull ? T("TrainingFull", { max: CREATION_TRAINING }) : "")));
    return { source, count, sr, maxSR, next, locked, capped, blocked, reason };
  }

  /** @override */
  async _prepareContext(options) {
    const actor = this.actor;
    const ctx = this.#context(await getSkillIndex());
    const { lists, rank, quota, training } = ctx;

    const entries = [];
    let hidden = 0;
    // The character's copies, read once for the whole list
    const ownedOf = ownedSkills(actor);
    for (const entry of ctx.index) {
      if (entry.subtype !== this.tab) continue;
      const source = sourceOf(entry, lists);
      if ((this.source === "eligible") && !source) continue;
      if (!["eligible", "all"].includes(this.source) && (source !== this.source)) continue;

      const owned = ownedOf(entry);
      if (entry.choiceOnly && !owned) continue;
      // What left the lists (the Dedication of a class another one replaced) stays only for who has it.
      if (entry.retired && !owned) continue;
      // A Path's talents are for who follows it.
      if (entry.pathTalent && !owned && !lists.paths.has(entry.pathTalent)) continue;
      // An element's talents are for who has it.
      if (entry.elementTalent && !owned && !lists.elements.has(entry.elementTalent)) continue;
      const { count, sr, maxSR, next, locked, capped, blocked, reason } = this.#state(entry, ctx, owned);
      // What can't be picked now, whatever the selection (the quotas only wait for a pick to be undone).
      if (this.available && !count && (locked || capped || !!blocked)) {
        hidden += 1;
        continue;
      }
      // Picked, the button stays where it was: one click more raises it one SR more.
      const raise = !!owned || (count > 0);
      const planned = sr + count;
      entries.push({
        ...entry,
        sourceLabel: (source === "basic") ? entry.pack
          : (source ? game.i18n.localize(`ETERNIA.SkillBrowser.Source.${source}`) : (entry.folder || entry.pack)),
        owned: !!owned,
        sr,
        maxSR,
        picked: count > 0,
        // The SR it has, or the one the selection takes it to.
        badge: count ? (owned ? T("SRTo", { from: sr, to: planned }) : T("SR", { sr: planned })) : (owned ? T("SR", { sr }) : ""),
        disabled: !!reason,
        reason,
        pickIcon: raise ? "fa-arrow-up" : "fa-plus",
        pickTip: raise ? T("Raise", { sr: next }) : T("Acquire"),
        unpickIcon: (count > 1) ? "fa-minus" : "fa-xmark",
        unpickTip: (count > 1) ? T("UnpickOne", { sr: planned - 1 }) : T("Unpick"),
        expanded: this.expanded.has(entry.uuid),
        description: this.descriptions.get(entry.uuid) ?? "",
        search: `${entry.name} ${entry.folder} ${entry.tags.join(" ")}`.toLowerCase()
      });
    }

    const tabs = TABS.map(subtype => ({
      subtype,
      label: game.i18n.localize(`ETERNIA.Skill.Type.${subtype}`),
      active: subtype === this.tab,
      count: (quota && PICK_SUBTYPES.includes(subtype)) ? `${this.#picked(subtype)}/${quota[subtype]}` : (this.#picked(subtype) || "")
    }));
    const sources = SOURCES.map(value => ({
      value,
      label: game.i18n.localize(`ETERNIA.SkillBrowser.Filter.${value}`),
      selected: value === this.source
    }));
    const picks = [...this.picks.values()].map(p => ({
      ...p,
      label: p.owned ? T("PickRaise", { name: p.name, from: p.sr, to: p.sr + p.count })
        : ((p.count > 1) ? T("PickNew", { name: p.name, sr: p.count }) : p.name)
    }));

    return {
      entries,
      tabs,
      sources,
      picks,
      query: this.query,
      available: this.available,
      hidden,
      hiddenNote: hidden ? game.i18n.format("ETERNIA.SkillBrowser.Hidden", { n: hidden }) : "",
      emptyText: game.i18n.localize((hidden > 0) ? "ETERNIA.SkillBrowser.EmptyAvailable" : "ETERNIA.SkillBrowser.Empty"),
      rank,
      quota,
      editable: actor.isOwner,
      hint: [
        quota ? game.i18n.format("ETERNIA.SkillBrowser.HintPending", { combat: quota.Combat, general: quota.General })
          : game.i18n.localize(game.user.isGM ? "ETERNIA.SkillBrowser.HintFree" : "ETERNIA.SkillBrowser.HintNone"),
        (training !== null) ? game.i18n.format("ETERNIA.SkillBrowser.HintTraining", { left: Math.max(0, training), max: CREATION_TRAINING }) : ""
      ].filter(Boolean).join(" ")
    };
  }

  /** @override */
  _onFirstRender(context, options) {
    super._onFirstRender(context, options);
    // Next to the character sheet when there is room.
    const sheet = this.actor.sheet;
    if (!sheet?.rendered) return;
    const { left, top, width } = sheet.position;
    const own = this.position.width;
    const x = (left + width + own + 10 < window.innerWidth) ? left + width + 5 : Math.max(0, window.innerWidth - own - 10);
    this.setPosition({ left: Math.max(0, x), top: Math.max(0, top) });
  }

  /** @override */
  _onRender(context, options) {
    super._onRender(context, options);
    const input = this.element.querySelector("input[name=search]");
    input.addEventListener("input", ev => {
      this.query = ev.currentTarget.value;
      this.#applySearch();
    });
    this.element.querySelector("select[name=source]").addEventListener("change", ev => {
      this.source = ev.currentTarget.value;
      this.render();
    });
    this.element.querySelector("input[name=available]").addEventListener("change", ev => {
      this.available = ev.currentTarget.checked;
      this.render();
    });
    this.#applySearch();
  }

  /** Live search, without rendering again. */
  #applySearch() {
    const query = this.query.trim().toLowerCase();
    let shown = 0;
    for (const row of this.element.querySelectorAll(".skill-row")) {
      const match = !query || row.dataset.search.includes(query);
      row.hidden = !match;
      if (match) shown += 1;
    }
    this.element.querySelector(".skill-empty-search").hidden = (shown > 0) || !query;
  }

  /** Index entry of a row. */
  async #entry(target) {
    const uuid = target.closest("[data-uuid]").dataset.uuid;
    return (await getSkillIndex()).find(e => e.uuid === uuid);
  }

  static #onTab(event, target) {
    this.tab = target.dataset.subtype;
    this.render();
  }

  /** Pick a skill, or one SR more of a skill already picked. */
  static async #onPick(event, target) {
    const entry = await this.#entry(target);
    if (!entry) return;
    // Checked here too, not only by the button: two quick clicks come before the window renders again.
    const state = this.#state(entry, this.#context(await getSkillIndex()));
    if (state.reason) return;
    const pick = this.picks.get(entry.uuid);
    if (pick) pick.count += 1;
    else this.picks.set(entry.uuid, {
      uuid: entry.uuid,
      name: entry.name,
      img: entry.img,
      subtype: entry.subtype,
      identifier: entry.identifier,
      requires: entry.requires,
      owned: state.sr > 0,
      training: isTraining(entry),
      sr: state.sr,
      count: 1
    });
    this.render();
  }

  /** Show the skills hidden because they can't be picked now. */
  static #onShowAll() {
    this.available = false;
    this.render();
  }

  /** One SR less of a pick (its row), or the whole pick (its chip); the talents picked with it leave too. */
  static #onUnpick(event, target) {
    const uuid = target.closest("[data-uuid]").dataset.uuid;
    const pick = this.picks.get(uuid);
    if (!pick) return;
    if ((pick.count > 1) && !target.dataset.all) pick.count -= 1;
    else {
      this.picks.delete(uuid);
      this.#dropOrphans();
    }
    this.render();
  }

  /** Take out the picks whose required talent left the selection (and the ones that required those). */
  #dropOrphans() {
    const owned = skillLists(this.actor).identifiers;
    for (let dropped = true; dropped;) {
      dropped = false;
      const have = new Set([...owned, ...[...this.picks.values()].map(p => p.identifier).filter(Boolean)]);
      for (const [uuid, pick] of this.picks) {
        if (pick.owned || pick.requires.every(r => have.has(r))) continue;
        this.picks.delete(uuid);
        dropped = true;
      }
    }
  }

  static async #onExpand(event, target) {
    const uuid = target.closest("[data-uuid]").dataset.uuid;
    if (this.expanded.has(uuid)) this.expanded.delete(uuid);
    else {
      this.expanded.add(uuid);
      if (!this.descriptions.has(uuid)) {
        const item = await fromUuid(uuid);
        const html = await foundry.applications.ux.TextEditor.implementation.enrichHTML(item?.system.description ?? "", { relativeTo: item });
        this.descriptions.set(uuid, html);
      }
    }
    this.render();
  }

  static async #onView(event, target) {
    const item = await fromUuid(target.closest("[data-uuid]").dataset.uuid);
    item?.sheet.render(true);
  }

  /** Acquire / raise the picked skills, count them down from the pending ones and record it in the chat. */
  static async #onConfirm() {
    const actor = this.actor;
    if (!this.picks.size) return;
    const toCreate = [];
    const toUpdate = [];
    const lines = [];
    // Picks that count (Combat / General while some are owed) get a hidden mark with the current CR, one per SR.
    const quota = this.quota;
    const rank = rankOf(actor);
    const mark = (pick, kind, fromSR) => (quota && PICK_SUBTYPES.includes(pick.subtype))
      ? [{ rank, subtype: pick.subtype, kind, ...(kind === "raise" ? { fromSR } : {}) }] : [];
    // The SRs raised from an SR, each marked with the one it raised from (undoing goes back to the first).
    const raises = (pick, from, n) => Array.from({ length: n }, (_, i) => mark(pick, "raise", from + i)).flat();
    const index = await getSkillIndex();
    for (const pick of this.picks.values()) {
      const entry = index.find(e => e.uuid === pick.uuid);
      const owned = entry && ownedSkill(actor, entry);
      if (owned) {
        const from = Number(owned.system.skillRank?.value) || 1;
        // Never beyond the Maximum SR or the CR (the skill may have changed since it was picked).
        const sr = Math.min(from + pick.count, Number(owned.system.skillRank?.max) || entry.maxSR, rank);
        if (sr <= from) continue;
        const picks = [...picksOf(owned), ...raises(pick, from, sr - from)];
        toUpdate.push({ _id: owned.id, "system.skillRank.value": sr, [`flags.eternia.${PICK_FLAG}`]: picks });
        lines.push(T("ChatRaise", { name: owned.name, sr }));
        continue;
      }
      const skill = await fromUuid(pick.uuid);
      if (!skill) continue;
      const data = skill.toObject();
      delete data._id;
      delete data.folder;
      delete data.sort;
      delete data.ownership;
      const sr = Math.max(1, Math.min(pick.count, Number(data.system.skillRank?.max) || 1, rank));
      foundry.utils.setProperty(data, "_stats.compendiumSource", skill.uuid);
      foundry.utils.setProperty(data, "system.skillRank.value", sr);
      // Acquired at SR 1, then raised for each pick more.
      const picks = [...mark(pick, "new"), ...raises(pick, 1, sr - 1)];
      if (picks.length) foundry.utils.setProperty(data, `flags.eternia.${PICK_FLAG}`, picks);
      toCreate.push(data);
      lines.push(T("ChatNew", { name: skill.name, sr }));
    }
    if (toUpdate.length) await actor.updateEmbeddedDocuments("Item", toUpdate);
    if (toCreate.length) await actor.createEmbeddedDocuments("Item", toCreate);

    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor }),
      content: `<div class="eternia skill-pick-card"><h3><i class="fa-solid fa-book-open-reader"></i> `
        + `${game.i18n.format("ETERNIA.SkillBrowser.ChatTitle", { name: actor.name })}</h3>`
        + `<ul>${lines.map(l => `<li>${l}</li>`).join("")}</ul></div>`
    });

    this.picks.clear();
    if (this.quota) this.render();
    else this.close();
  }
}

/* -------------------------------------------- */

/** Rebuild the index whenever a skill changes in a compendium. */
function watchSkills(item) {
  if ((item.type === "skill") && item.pack) clearSkillIndex();
}

export function registerSkillBrowser() {
  Hooks.on("createItem", watchSkills);
  Hooks.on("updateItem", watchSkills);
  Hooks.on("deleteItem", watchSkills);
  Hooks.on("createCompendium", clearSkillIndex);
  Hooks.on("deleteCompendium", clearSkillIndex);
  // Only an Item compendium's change (the skills come from them)
  Hooks.on("updateCompendium", pack => (pack.documentName === "Item") && clearSkillIndex());
  // The pending picks and the skills of a character change what the window shows.
  const refresh = actor => {
    if (!(actor instanceof Actor)) return;
    foundry.applications.instances.get(SkillBrowser.idFor(actor))?.render();
  };
  Hooks.on("updateActor", actor => refresh(actor));
  Hooks.on("deleteItem", item => (item.type === "skill") && refresh(item.parent));
  // A skill given by a choice (a class Path) opens its own talents.
  Hooks.on("createItem", item => (item.type === "skill") && refresh(item.parent));

  // CR lowered (by hand, e.g. a GM fixing a wrong CR Up): offer to undo the picks of the ranks removed.
  Hooks.on("preUpdateActor", (actor, changes, options) => {
    if ((actor.type !== "character") || !foundry.utils.hasProperty(changes, "system.infos.crank")) return;
    options.eterniaPreviousRank = rankOf(actor);
  });
  Hooks.on("updateActor", (actor, changes, options, userId) => {
    if (!isLocalChange(options, userId) || (options.eterniaPreviousRank === undefined)) return;
    const rank = rankOf(actor);
    if (rank < options.eterniaPreviousRank) rollbackPicks(actor, { aboveRank: rank, reason: "ETERNIA.SkillBrowser.Undo.HintRank" });
  });
}
