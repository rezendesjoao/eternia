/**
 * The class tab of the character sheet (templates/character/class.hbs), made to fit without scrolling: the class band
 * (its emblem, roles and base), the Motor (its state and points, which the owner can set by hand), the CR trail (what
 * the class gives at each CR, the choices still open glowing) and the sections, one at a time: the kit with how the
 * Motor works, the element (the Dragon Slayer's, chosen at CR 1), the Magias of a magic class (a slot at CR 1, 5 and
 * 10, with their spells), the talents by branch, the Path (chosen at CR 3) with the Apex (CR 10), the general talents
 * and the Dedications. A section with a choice still open shows first. The class's skills are read from the
 * compendiums (the folder named like the class, see apps/skill-browser.mjs); the character's own copies can be used
 * and opened from here like in the skills tab, and every skill shows what it does under the pointer.
 */
import { L } from "../settings.mjs";
import { getOption } from "../helpers/character-options.mjs";
import { magicsOf, offerGrants } from "../apps/option-grants.mjs";
import { MAGIC_CATEGORIES } from "../apps/magic-picker.mjs";
import { SkillBrowser } from "../apps/skill-browser.mjs";
import { tagLabel, term } from "../i18n/terms.mjs";
import { toInt } from "../helpers/utils.mjs";
import { CLASSES, KIND_ICONS, MILESTONES } from "./data.mjs";
import {
  crOf, motorData, motorDef, motorMax, motorName, motorsOf, motorStateLabel, motorUnit, setMotor
} from "./motor.mjs";
import { chipText } from "../helpers/text-chips.mjs";

const FIELDS = [
  "system.subtype", "system.skillRank", "system.tags", "system.timing", "folder",
  "flags.eternia.identifier", "flags.eternia.kind", "flags.eternia.branch", "flags.eternia.minRank",
  "flags.eternia.requires", "flags.eternia.path", "flags.eternia.pathTalent", "flags.eternia.apex",
  "flags.eternia.dedication", "flags.eternia.element", "flags.eternia.elementTalent", "flags.eternia.magic",
  "flags.eternia.magicSpell", "flags.eternia.choiceOnly"
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
    learnable: !owned && (minRank <= cr),
    dedication: (entry.system?.tags ?? []).includes("Dedication"),
    general: entry.system?.subtype === "General"
  };
}

/** "2/4": how many of these skills the character has. */
const tally = rows => (rows.length ? `${rows.filter(r => r.owned).length}/${rows.length}` : "");

/** A row of the tab for a skill the character has (a Magia). */
function ownedRow(item, cr) {
  return {
    uuid: item._stats?.compendiumSource ?? item.uuid,
    id: item.id,
    name: item.name,
    img: item.img,
    owned: true,
    kind: "",
    kindIcon: "",
    kindLabel: "",
    timing: term("timing", item.system.timing ?? ""),
    sr: "",
    minRank: 1,
    locked: false,
    dedication: false,
    general: false
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
    hasStates: (def.states?.length ?? 0) > 1,
    stateLabel: motorStateLabel(def, data.state),
    nextState: motorStateLabel(def, def.states[(def.states.indexOf(data.state) + 1) % def.states.length]),
    note: extra.note ?? "",
    value,
    max,
    pips: Array.from({ length: max }, (_, i) => ({ value: i + 1, on: i < value, ready: !!extra.ready })),
    ready: !!extra.ready,
    readyLabel: extra.readyLabel ?? "",
    card: ["Gain", "Spend", "Cap", "Reset"].map(part => ({
      label: L(`Classes.Card.${part}`),
      html: chipText(L(`${def.i18n}.Card.${part}${lesser ? "Lesser" : ""}`), { actor })
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

  // Element (the Dragon Slayer's, chosen at CR 1): the one chosen, with its talents, or the ones to choose from
  const elementSkills = entries.filter(e => flag(e, "element")?.class === def?.id);
  const ownElement = elementSkills.find(e => ownedCopy(actor, e));
  const elementOrder = def?.elements ?? [];
  const elements = elementSkills.map(e => ({
    ...skillRow(actor, e, cr),
    id: flag(e, "element").id,
    talents: entries.filter(t => (flag(t, "elementTalent")?.id === flag(e, "element").id)).map(t => skillRow(actor, t, cr))
      .sort((a, b) => a.minRank - b.minRank)
  })).sort((a, b) => elementOrder.indexOf(a.id) - elementOrder.indexOf(b.id));

  // Magias (a magic class): a slot for each Magia grant (CR 1, 5 and 10) with the Magia taken there (in the order they
  // were taken) and its spells; one given by hand beyond the slots still shows
  let magic = null;
  if (def?.magic) {
    const ranks = (job.system.grants ?? []).filter(g => g.magic).map(g => Number(g.rank) || 1);
    const owned = magicsOf(actor).sort((a, b) => (toInt(a._stats?.createdTime) - toInt(b._stats?.createdTime)) || (a.sort - b.sort));
    const view = async m => {
      const data = m.getFlag("eternia", "magic");
      const category = MAGIC_CATEGORIES[data.category] ? data.category : "caster";
      // The skills only a choice gives (a Decree) show only when the character has them
      const spells = (await classSkills(m.name))
        .filter(e => (flag(e, "magicSpell")?.id === data.id) && (!flag(e, "choiceOnly") || ownedCopy(actor, e)))
        .map(e => skillRow(actor, e, cr)).sort((a, b) => (a.minRank - b.minRank) || a.name.localeCompare(b.name, game.i18n.lang));
      return {
        ...ownedRow(m, cr), spells, tally: tally(spells), tagline: data.tagline ?? "", category,
        categoryLabel: L(`MagicPicker.Category.${category}`), categoryIcon: MAGIC_CATEGORIES[category].icon,
        categoryColor: MAGIC_CATEGORIES[category].color
      };
    };
    const slots = [];
    for (const [index, rank] of ranks.entries()) {
      const m = owned[index];
      slots.push({ rank, reached: cr >= rank, magia: m ? await view(m) : null, open: !m && (cr >= rank) });
    }
    for (const m of owned.slice(ranks.length)) slots.push({ rank: null, reached: true, magia: await view(m), open: false });
    magic = { slots, open: slots.filter(s => s.open).length, count: `${owned.length}/${ranks.length}` };
  }

  // Base: attributes and HP of the class item
  const a = job.system.attributes ?? {};
  const base = ["str", "dex", "pow", "int"].map(key => ({ label: L(`Classes.Attr.${key}`), value: toInt(a[key]) }));

  const kit = rows("kit");
  const general = rows("general");
  for (const b of branches) b.tally = tally(b.talents);
  const talents = branches.flatMap(b => b.talents);
  const path = {
    reached: cr >= 3,
    chosen: followed ? paths.find(p => p.uuid === followed.uuid) : null,
    options: followed ? [] : paths,
    pending: (cr >= 3) && !followed && paths.length > 0
  };
  const element = elements.length ? {
    chosen: ownElement ? elements.find(e => e.uuid === ownElement.uuid) : null,
    options: ownElement ? [] : elements
  } : null;

  // The sections, one shown at a time; the first with a choice still open shows first
  const sections = [
    { id: "kit", icon: "fa-solid fa-toolbox", label: L("Classes.Section.kit"), count: tally(kit) },
    element && { id: "element", icon: "fa-solid fa-dragon", label: L("Classes.Element"), pending: !element.chosen },
    magic && { id: "magic", icon: "fa-solid fa-hat-wizard", label: L("Classes.Magic"), count: magic.count, pending: magic.open > 0 },
    branches.length && { id: "talents", icon: "fa-solid fa-sitemap", label: L("Classes.Section.talents"), count: tally(talents) },
    { id: "path", icon: "fa-solid fa-route", label: L("Classes.Path"), pending: path.pending },
    general.length && { id: "general", icon: "fa-solid fa-feather", label: L("Classes.Section.general"), count: tally(general) },
    { id: "dedications", icon: "fa-solid fa-link", label: L("Classes.Dedications"), count: lesserMotors.length ? String(lesserMotors.length) : "" }
  ].filter(Boolean);

  // The CR trail: what comes at each CR (the milestones, the Magia slots, how many talents), the choices still open
  const at = id => MILESTONES.find(m => m.id === id)?.rank;
  const learned = [...kit, ...talents, ...general];
  const trail = Array.from({ length: 10 }, (_, i) => {
    const rank = i + 1;
    const marks = [];
    if (rank === at("kit")) marks.push({ icon: "fa-solid fa-toolbox", label: L("Classes.Milestone.kit"), section: "kit" });
    if (element && (rank === 1)) marks.push({ icon: "fa-solid fa-dragon", label: L("Classes.Element"), section: "element", pending: !element.chosen });
    for (const slot of magic?.slots ?? []) {
      if (slot.rank === rank) marks.push({ icon: "fa-solid fa-hat-wizard", label: L("Classes.TrailMagic"), section: "magic", pending: slot.open });
    }
    if (rank === at("path")) marks.push({ icon: "fa-solid fa-route", label: L("Classes.Milestone.path"), section: "path", pending: path.pending });
    if (rank === at("dedication")) marks.push({ icon: "fa-solid fa-link", label: L("Classes.Milestone.dedication"), section: "dedications" });
    if (apex && (rank === at("apex"))) marks.push({ icon: "fa-solid fa-crown", label: L("Classes.Milestone.apex"), section: "path" });
    const lead = marks.find(m => m.pending) ?? marks[0];
    const fresh = learned.filter(r => r.minRank === rank).length;
    const lines = [...marks.map(m => m.label), fresh ? L("Classes.TrailTalents", { n: fresh }) : ""].filter(Boolean);
    return {
      rank,
      reached: cr >= rank,
      current: cr === rank,
      milestone: marks.length > 0,
      pending: marks.some(m => m.pending),
      icon: lead?.icon ?? "",
      section: lead?.section ?? "talents",
      label: marks.map(m => m.label).join(" · "),
      fresh,
      tooltip: [`<strong>${L("Classes.FromRank", { n: rank })}</strong>`, ...lines,
        (cr === rank) ? `<em>${L("Classes.TrailHere")}</em>` : ""].filter(Boolean).join("<br>")
    };
  });

  return {
    none: false,
    editable,
    isGM: game.user.isGM,
    id: def?.id ?? job.system.identifier,
    itemId: job.id,
    name: job.name,
    longName: job.name.length > 13,
    img: (job.img && !job.img.endsWith("/blank.svg")) ? job.img : "",
    color: def?.color ?? "#1f5137",
    roles: (job.system.tags ?? []).map(tagLabel),
    // Physical or magic class and its function in the group (the color); a class without them left the lists
    eyebrow: def?.family ? `${L(`Classes.Family.${def.family}`)} · ${L(`Classes.Function.${def.role}`)}` : L("Classes.Retired"),
    base,
    hp: { start: toInt(job.system.hp), per: toInt(job.system.hpPerRank), band: def?.band ? L(`Classes.Band.${def.band}`) : "" },
    motor: own ? motorView(actor, own.def, false, editable) : null,
    kit,
    branches,
    general,
    path,
    apex: apex ? { ...skillRow(actor, apex, cr), reached: cr >= 10 } : null,
    magic,
    element,
    dedications: lesserMotors,
    sections,
    focus: sections.find(s => s.pending)?.id ?? null,
    trail
  };
}

/** Pictures of the tooltips already built (uuid → HTML), until the page reloads. */
const tips = new Map();

/** The tooltip of a skill of the tab: its picture, name, what it is, and the first lines of what it does. */
async function tipOf(actor, tile) {
  const owned = tile.dataset.itemId ? actor.items.get(tile.dataset.itemId) : null;
  const key = owned ? `${owned.uuid}:${owned._stats?.modifiedTime ?? ""}` : tile.dataset.uuid;
  if (tips.has(key)) return tips.get(key);
  const skill = owned ?? await fromUuid(tile.dataset.uuid).catch(() => null);
  if (!skill) return "";
  const root = document.createElement("div");
  root.innerHTML = skill.system?.description ?? "";
  // The opening paragraph without its label, and no closing line
  const first = root.querySelector("p");
  first?.querySelector(":scope > strong:first-child")?.remove();
  let text = (first?.textContent ?? root.textContent ?? "").trim();
  if (text.length > 320) text = `${text.slice(0, 317).replace(/\s+\S*$/, "")}…`;
  const meta = [...tile.querySelectorAll(".lhcl-tile-meta > span")].map(s => s.textContent.trim()).filter(Boolean).join(" · ");
  const html = `<div class="lhcl-tip"><header><img src="${skill.img}" alt=""><div><strong>${foundry.utils.escapeHTML(skill.name)}</strong>`
    + `${meta ? `<span>${foundry.utils.escapeHTML(meta)}</span>` : ""}</div></header>`
    + `${text ? `<p>${foundry.utils.escapeHTML(text)}</p>` : ""}</div>`;
  tips.set(key, html);
  return html;
}

/**
 * After the sheet renders: every skill of the class tab shows what it does under the pointer.
 * @param {ActorSheet} sheet
 * @param {HTMLElement} root
 */
export function activateClassTab(sheet, root) {
  // The tooltip of a tile this render replaced would stay forever
  const shown = game.tooltip.element;
  if (shown?.classList?.contains("lhcl-tile") && !shown.isConnected) game.tooltip.deactivate();
  const tab = root.querySelector(".tab.class .lhcl-board");
  if (!tab) return;
  let timer = null;
  tab.addEventListener("pointerover", event => {
    const tile = event.target.closest?.(".lhcl-tile");
    if (!tile || tile.contains(event.relatedTarget)) return;
    clearTimeout(timer);
    timer = setTimeout(async () => {
      if (!tile.matches(":hover")) return;
      const html = await tipOf(sheet.actor, tile);
      if (html && tile.matches(":hover")) game.tooltip.activate(tile, { html, cssClass: "lhcl-tooltip", direction: "UP" });
    }, 350);
  });
  tab.addEventListener("pointerout", event => {
    const tile = event.target.closest?.(".lhcl-tile");
    if (!tile || tile.contains(event.relatedTarget)) return;
    clearTimeout(timer);
    if (game.tooltip.element === tile) game.tooltip.deactivate();
  });
}

/**
 * The class tab's buttons (data-op):
 *   pip     set the Motor's points (the last lit one takes one off)
 *   state   the Motor's next state
 *   browse  the skill browser
 *   grants  what the class still has to give (the Path, when skipped at the rank up)
 *   element the class's choices of CR 1 (the Dragon Slayer's element, when skipped)
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
    case "element": {
      const job = getOption(actor, "class");
      return job ? offerGrants(actor, job, { withStale: false, onlyChoices: true }) : null;
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
