/**
 * The class tab of the character sheet (templates/character/class.hbs): the class crest and its base, the Motor
 * (its state and points, which the owner can set by hand), the kit, the talents by branch with what each does to the
 * Motor, the Path (chosen at CR 3), the Apex (CR 10), the Dedications and the milestones. The class's skills are read
 * from the compendiums (the folder named like the class, see apps/skill-browser.mjs); the character's own copies
 * can be used and opened from here like in the skills tab.
 */
import { L } from "../settings.mjs";
import { getOption } from "../helpers/character-options.mjs";
import { offerGrants } from "../apps/option-grants.mjs";
import { SkillBrowser } from "../apps/skill-browser.mjs";
import { tagLabel, term } from "../i18n/terms.mjs";
import { toInt } from "../helpers/utils.mjs";
import { CLASSES, KIND_ICONS, MILESTONES } from "./data.mjs";
import {
  crOf, motorData, motorDef, motorMax, motorName, motorsOf, motorStateLabel, motorUnit, setMotor
} from "./motor.mjs";

const FIELDS = [
  "system.subtype", "system.skillRank", "system.tags", "system.timing", "folder",
  "flags.eternia.identifier", "flags.eternia.kind", "flags.eternia.branch", "flags.eternia.minRank",
  "flags.eternia.requires", "flags.eternia.path", "flags.eternia.pathTalent", "flags.eternia.apex",
  "flags.eternia.dedication"
];

/** Class skills of the compendiums by class name (lowercase), built once and cleared when a compendium changes. */
let indexPromise = null;

async function buildIndex() {
  const byClass = new Map();
  for (const pack of game.packs) {
    if ((pack.documentName !== "Item") || !pack.visible) continue;
    const index = await pack.getIndex({ fields: FIELDS });
    for (const e of index) {
      if ((e.type !== "skill") || !e.flags?.eternia?.identifier) continue;
      let folder = e.folder ? pack.folders.get(e.folder) : null;
      while (folder) {
        const key = folder.name.trim().toLowerCase();
        if (!byClass.has(key)) byClass.set(key, []);
        byClass.get(key).push({ ...e, uuid: e.uuid ?? pack.getUuid(e._id) });
        folder = folder.folder;
      }
    }
  }
  return byClass;
}

/** The compendium skills of a class (by its name). */
async function classSkills(name) {
  indexPromise ??= buildIndex();
  return (await indexPromise).get(String(name ?? "").trim().toLowerCase()) ?? [];
}

/** Forget the index (a compendium skill changed). */
export function clearClassIndex() {
  indexPromise = null;
}

/** The character's copy of a compendium skill: same compendium entry, or same identifier. */
function ownedCopy(actor, entry) {
  const id = entry.flags?.eternia?.identifier;
  return actor.items.find(i => (i.type === "skill") && ((i._stats?.compendiumSource === entry.uuid)
    || (id && (i.flags?.eternia?.identifier === id)))) ?? null;
}

/** A row of the tab: the character's skill, or the compendium one it can still learn. */
function skillRow(actor, entry, cr, { delay = 0 } = {}) {
  const owned = ownedCopy(actor, entry);
  const flags = entry.flags?.eternia ?? {};
  const kind = flags.kind ?? "";
  const rank = owned?.system.skillRank ?? entry.system?.skillRank ?? {};
  const minRank = (toInt(flags.minRank) || 1) + delay;
  return {
    uuid: entry.uuid,
    id: owned?.id ?? null,
    name: owned?.name ?? entry.name,
    img: owned?.img ?? entry.img,
    owned: !!owned,
    kind,
    kindIcon: KIND_ICONS[kind] ?? "",
    kindLabel: kind ? L(`Classes.Kind.${kind}`) : "",
    timing: term("timing", owned?.system.timing ?? entry.system?.timing ?? ""),
    sr: (owned && (toInt(rank.max) > 1)) ? `${toInt(rank.value) || 1}/${toInt(rank.max)}` : "",
    minRank,
    locked: !owned && (minRank > cr),
    dedication: (entry.system?.tags ?? []).includes("Dedication"),
    general: entry.system?.subtype === "General"
  };
}

/** The view of one of the actor's Motors. */
function motorView(actor, def, lesser, editable) {
  const data = motorData(actor, def.id);
  const max = motorMax(actor, def.id);
  const value = Math.clamp(toInt(data.value), 0, max);
  const extra = def.display?.(actor, { lesser, data, max }) ?? {};
  return {
    id: def.id,
    name: motorName(def),
    unit: motorUnit(def),
    lesser,
    editable,
    state: data.state,
    stateLabel: motorStateLabel(def, data.state),
    nextState: motorStateLabel(def, def.states[(def.states.indexOf(data.state) + 1) % def.states.length]),
    value,
    max,
    pips: Array.from({ length: max }, (_, i) => ({ value: i + 1, on: i < value, ready: !!extra.ready })),
    ready: !!extra.ready,
    readyLabel: extra.readyLabel ?? "",
    card: ["Gain", "Spend", "Cap", "Reset", "Decision"].map(part => ({
      label: L(`Classes.Card.${part}`),
      text: L(`${def.i18n}.Card.${part}${lesser ? "Lesser" : ""}`)
    }))
  };
}

/**
 * Data of the class tab.
 * @param {Actor} actor
 * @param {{editable: boolean}} options
 * @returns {Promise<object>}
 */
export async function classContext(actor, { editable }) {
  const job = getOption(actor, "class");
  const motors = motorsOf(actor);
  const lesserMotors = motors.filter(m => m.lesser).map(m => motorView(actor, m.def, true, editable));
  if (!job) return { none: true, editable, dedications: lesserMotors };

  const cr = crOf(actor);
  const def = CLASSES[job.system.identifier] ?? null;
  const entries = await classSkills(job.name);
  const flag = (entry, key) => entry.flags?.eternia?.[key];
  const own = motors.find(m => !m.lesser && (m.def.id === def?.motor));

  // Kit, branches of talents and the general talents
  const rows = branch => entries.filter(e => flag(e, "branch") === branch).map(e => skillRow(actor, e, cr))
    .sort((a, b) => (a.minRank - b.minRank) || a.name.localeCompare(b.name, game.i18n.lang));
  const branches = (def?.branches ?? []).map(id => ({ id, label: L(`Classes.${def.id}.Branch.${id}`), talents: rows(id) }));

  // Path: the one followed, or the three to choose from at CR 3
  const pathSkills = entries.filter(e => flag(e, "path")?.class === def?.id);
  const followed = pathSkills.find(e => ownedCopy(actor, e));
  const pathView = e => ({
    ...skillRow(actor, e, cr),
    id: flag(e, "path").id,
    itemId: ownedCopy(actor, e)?.id ?? null,
    talents: entries.filter(t => (flag(t, "pathTalent")?.id === flag(e, "path").id)).map(t => skillRow(actor, t, cr))
      .sort((a, b) => a.minRank - b.minRank)
  });
  const order = def?.paths ?? [];
  const paths = pathSkills.map(pathView).sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
  const apex = entries.find(e => flag(e, "apex") === def?.id);

  // Base: attributes and HP of the class item
  const a = job.system.attributes ?? {};
  const base = ["str", "dex", "pow", "int"].map(key => ({ label: L(`Classes.Attr.${key}`), value: toInt(a[key]) }));

  return {
    none: false,
    editable,
    isGM: game.user.isGM,
    id: def?.id ?? job.system.identifier,
    itemId: job.id,
    name: job.name,
    img: def?.img ?? job.img,
    color: def?.color ?? "#1f5137",
    roles: (job.system.tags ?? []).map(tagLabel),
    base,
    hp: { start: toInt(job.system.hp), per: toInt(job.system.hpPerRank), band: def?.band ? L(`Classes.Band.${def.band}`) : "" },
    motor: own ? motorView(actor, own.def, false, editable) : null,
    kit: rows("kit"),
    branches,
    general: rows("general"),
    path: {
      reached: cr >= 3,
      chosen: followed ? paths.find(p => p.uuid === followed.uuid) : null,
      options: followed ? [] : paths,
      pending: (cr >= 3) && !followed && paths.length > 0
    },
    apex: apex ? { ...skillRow(actor, apex, cr), reached: cr >= 10 } : null,
    dedications: lesserMotors,
    ladder: MILESTONES.map(m => ({
      rank: m.rank,
      label: L(`Classes.Milestone.${m.id}`),
      reached: cr >= m.rank,
      current: (cr >= m.rank) && !MILESTONES.some(n => (n.rank > m.rank) && (cr >= n.rank))
    }))
  };
}

/**
 * The class tab's buttons (data-op):
 *   pip     set the Motor's points (the last lit one takes one off)
 *   state   the Motor's next state
 *   browse  the skill browser
 *   grants  what the class still has to give (the Path, when skipped at the rank up)
 *   open    open a compendium skill (to read it)
 * @param {ActorSheet} sheet
 * @param {HTMLElement} target
 */
export async function classAction(sheet, target) {
  const actor = sheet.actor;
  const op = target.dataset.op;
  if (op === "open") {
    const skill = await fromUuid(target.dataset.uuid);
    return skill?.sheet.render(true);
  }
  if (!sheet.isEditable) return null;
  const id = target.closest("[data-motor]")?.dataset.motor;
  const def = id ? motorDef(id) : null;
  switch (op) {
    case "pip": {
      if (!def) return null;
      const current = toInt(motorData(actor, id).value);
      const value = toInt(target.dataset.value);
      return setMotor(actor, id, { ...motorData(actor, id), value: (value === current) ? value - 1 : value });
    }
    case "state": {
      if (!def) return null;
      const data = motorData(actor, id);
      const next = def.states[(def.states.indexOf(data.state) + 1) % def.states.length];
      return setMotor(actor, id, { ...data, state: next });
    }
    case "browse":
      return SkillBrowser.open(actor);
    case "grants": {
      const job = getOption(actor, "class");
      return job ? offerGrants(actor, job, { above: 1, withStale: false }) : null;
    }
  }
  return null;
}

/** Call during the `init` hook. */
export function registerClassSheet() {
  const watch = item => (item.type === "skill") && item.pack && clearClassIndex();
  Hooks.on("createItem", watch);
  Hooks.on("updateItem", watch);
  Hooks.on("deleteItem", watch);
  for (const hook of ["createCompendium", "deleteCompendium", "updateCompendium"]) Hooks.on(hook, clearClassIndex);
}
