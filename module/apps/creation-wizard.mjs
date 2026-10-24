/**
 * The creation wizard: a character made step by step, in one window, and created at once at the end.
 *
 *   1. Race        the races as cards; the page of the one under the pointer (or chosen) tells its story, its numbers,
 *                  its two innate skills (a choice among several is made right there; the Human picks the two
 *                  attributes of its +1) and what it unlocks at CR 3 and 5.
 *   2. Class       the 14 classes, physical and magic; the page shows the base, the Motor and how it works, the kit of
 *                  CR 1, the choice of CR 1 (the Dragon Slayer's element), the Magia slots, the Paths and the Apex.
 *   3. Magia       the Magia browser of the Magia picker, for the class's slot of CR 1 (a Magia that asks for a
 *                  choice, the Mandamentos' Decree, asks it below). A class whose first slot comes later says so.
 *   4. Profession  the ten professions, or none for now.
 *   5. Attributes  the five bonus points (no attribute above 7), with the modifiers, the checks and the numbers of play.
 *   6. Skills      the creation picks: three Combat skills and one General (at most two [Training]), among the class's
 *                  talents, the Magia's spells and the profession's skills of CR 1 (the skill browser's rules).
 *   7. Summary     the name and the portrait, and everything chosen.
 *
 * Beside every step, the character as it stands. Nothing changes on the actor until "Create the character": then the
 * race, the class, the profession and every skill they give come in one go, marked like the old dialogs marked them
 * (the grants by their option, the picks with their marks, apps/skill-browser.mjs), so changing class or CR later works
 * as before. A character of CR 1 can be made again: what its old race, class and picks gave leaves first.
 */
import { L, SYSTEM_ID, setting } from "../settings.mjs";
import { toInt } from "../helpers/utils.mjs";
import { OPTION_TYPES, getOption, optionDataFrom } from "../helpers/character-options.mjs";
import { GRANT_FLAG } from "./option-grants.mjs";
import {
  CREATION_PICKS, PICK_FLAG, PROGRESS_FLAG, creationCandidates, creationLists, getSkillIndex
} from "./skill-browser.mjs";
import { MAGIC_BROWSER, MagicBrowser, magicBrowserContext } from "./magic-picker.mjs";
import { fold } from "./magic-catalog.mjs";
import { STATS, creationCatalog, loadDocuments, skillSummary, skillTip } from "./creation-catalog.mjs";
import { BONUS_POINTS, MAX_BASE_STAT } from "./stat-allocation.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

const DIR = "systems/eternia/templates/apps/creation";

/** The steps, in order. */
const STEPS = [
  { id: "race", icon: "fa-solid fa-people-group" },
  { id: "class", icon: "fa-solid fa-chess-knight" },
  { id: "magic", icon: "fa-solid fa-hat-wizard" },
  { id: "profession", icon: "fa-solid fa-hammer" },
  { id: "attributes", icon: "fa-solid fa-chart-simple" },
  { id: "skills", icon: "fa-solid fa-book-open-reader" },
  { id: "summary", icon: "fa-solid fa-feather-pointed" }
];

/** The checks of each attribute (the sheet's order). */
const CHECKS = {
  str: ["athletics", "endurance"],
  dex: ["disable", "operation"],
  pow: ["perception", "negotiation"],
  int: ["knowledge", "analysis"]
};

/** The compendium of the Basic skills every character takes. */
const BASIC_PACK = "eternia.skills-basic";

/** A Human picks two attributes for its +1. */
const HUMAN_PICKS = 2;

const checkLabel = key => game.i18n.localize(`ETERNIA.Check.${key.charAt(0).toUpperCase()}${key.slice(1)}`);
const signed = n => (n >= 0 ? `+${n}` : `${n}`);

/** The uuids of the Basic skills of the system compendium. */
async function basicSkills() {
  const pack = game.packs.get(BASIC_PACK);
  if (!pack) return [];
  const index = await pack.getIndex();
  return index.filter(e => (e.type === "skill") && (e.system?.subtype === "Basic")).map(e => e.uuid ?? pack.getUuid(e._id));
}

/** The compendium entry a character's item came from. */
const sourceUuid = item => item?._stats?.compendiumSource ?? "";

/* -------------------------------------------- */
/*  The window                                  */
/* -------------------------------------------- */

export class CreationWizard extends HandlebarsApplicationMixin(ApplicationV2) {

  /** One window per character. */
  static idFor(actor) {
    return `eternia-creation-${actor.id}`;
  }

  /**
   * Open the wizard of a character (or bring it to the front, on a step).
   * @param {Actor} actor
   * @param {object} [options]
   * @param {string} [options.step]  The step to open on
   */
  static open(actor, { step } = {}) {
    const existing = foundry.applications.instances.get(this.idFor(actor));
    if (existing) {
      if (step) existing.goTo(step, { render: false });
      return existing.render({ force: true });
    }
    return new this(actor, { step }).render({ force: true });
  }

  /** Whether a character is made with the wizard: a CR 1 character the user owns. */
  static canCreate(actor) {
    return (actor?.type === "character") && actor.isOwner && ((Number(actor.system.infos?.crank) || 1) <= 1);
  }

  /** Whether a character is blank: no race and no class yet. */
  static isBlank(actor) {
    return (actor?.type === "character") && !getOption(actor, "race") && !getOption(actor, "class");
  }

  constructor(actor, { step = null, ...options } = {}) {
    const width = Math.min(1220, window.innerWidth - 30);
    const height = Math.min(840, window.innerHeight - 30);
    super({
      ...options,
      id: CreationWizard.idFor(actor),
      position: { width, height, left: Math.max(0, (window.innerWidth - width) / 2), top: Math.max(0, (window.innerHeight - height) / 2) }
    });
    this.actor = actor;
    this.draft = this.#initialDraft();
    this.step = step ?? "race";
  }

  static DEFAULT_OPTIONS = {
    classes: ["eternia", "creation-wizard"],
    tag: "div",
    window: { icon: "fa-solid fa-feather-pointed", resizable: true },
    actions: {
      step: CreationWizard.#onStep,
      next: CreationWizard.#onNext,
      back: CreationWizard.#onBack,
      pick: CreationWizard.#onPick,
      grant: CreationWizard.#onGrant,
      human: CreationWizard.#onHuman,
      stat: CreationWizard.#onStat,
      resetStats: CreationWizard.#onResetStats,
      skill: CreationWizard.#onSkill,
      decree: CreationWizard.#onDecree,
      later: CreationWizard.#onLater,
      family: CreationWizard.#onFamily,
      portrait: CreationWizard.#onPortrait,
      create: CreationWizard.#onCreate
    }
  };

  static PARTS = {
    head: { template: `${DIR}/head.hbs` },
    rail: { template: `${DIR}/rail.hbs` },
    step: { template: `${DIR}/step.hbs`, scrollable: [".wz-grid", ".wz-detail", ".wz-scroll", ".mp-grid", ".mp-detail"] },
    foot: { template: `${DIR}/foot.hbs` }
  };

  /** The catalog of the races, classes and professions. */
  #catalog = null;
  /** The Magia browser's data (the Magias with their pages' data, the categories, the roles), read once. */
  #magicContext = null;
  /** The Magias the Magia step offers. */
  #magias = null;
  /** The skill index (the races' unlockable skills, the Decrees, the picks' subtypes). */
  #skillIndex = null;
  /** The skills that can be picked now (the skills step), with their state. */
  #candidates = [];
  /** The class filter of the class step: "", "physical" or "magic". */
  #family = "";
  /** The descriptions of the skills shown in the skills step (uuid → summary). */
  #texts = new Map();
  /** The character is being created. */
  #creating = false;

  /** @override */
  get title() {
    return L("Wizard.Title", { name: this.draft?.name || this.actor.name });
  }

  /* -------------------------------------------- */
  /*  The draft                                   */
  /* -------------------------------------------- */

  /**
   * The choices to start from: none for a blank character; for one made before (CR 1), what it has.
   * @returns {object}
   */
  #initialDraft() {
    const actor = this.actor;
    const race = getOption(actor, "race");
    const job = getOption(actor, "class");
    const profession = getOption(actor, "subclass");
    const skills = actor.items.filter(i => i.type === "skill");
    const magia = skills.find(i => i.getFlag(SYSTEM_ID, "magic")?.id);
    const bonus = Object.fromEntries(STATS.map(k => [k, Math.max(0, toInt(actor._source.system.attributes?.[k]?.value))]));
    return {
      race: sourceUuid(race) || null,
      raceChoices: {},
      human: race ? STATS.filter(k => toInt(race.system.attributes?.[k]) > 0) : [],
      class: sourceUuid(job) || null,
      classChoices: {},
      magia: sourceUuid(magia) || null,
      decree: null,
      profession: profession?.system.identifier || null,
      bonus,
      picks: skills.filter(i => (i.getFlag(SYSTEM_ID, PICK_FLAG) ?? []).length).map(sourceUuid).filter(Boolean),
      name: actor.name,
      img: actor.img,
      basics: true,
      // Filled from what the character has, once the catalog is read
      owned: skills.map(sourceUuid).filter(Boolean)
    };
  }

  /** Fill the choices inside the options from the skills the character already has (made before, at CR 1). */
  #restoreChoices() {
    const owned = new Set(this.draft.owned ?? []);
    if (!owned.size) return;
    const race = this.#race();
    for (const g of race?.grants ?? []) {
      const found = g.options.find(o => owned.has(o.uuid));
      if (g.choice && found) this.draft.raceChoices[g.index] = found.uuid;
    }
    const job = this.#job();
    for (const g of job?.choices ?? []) {
      const found = g.options.find(o => owned.has(o.uuid));
      if (found) this.draft.classChoices[g.index] = found.uuid;
    }
    const magia = this.#magia();
    if (magia?.choiceGrants.length) {
      this.draft.decree = this.#skillIndex.find(e => owned.has(e.uuid) && magia.choiceGrants.includes(e.identifier))?.uuid ?? null;
    }
    this.draft.owned = null;
  }

  #race() {
    return this.#catalog?.races.find(r => r.uuid === this.draft.race) ?? null;
  }

  #job() {
    return this.#catalog?.classes.find(c => c.uuid === this.draft.class) ?? null;
  }

  #profession() {
    return this.#catalog?.professions.find(p => p.id === this.draft.profession) ?? null;
  }

  /** The Magia chosen (its catalog entry), when the class has a slot at CR 1. */
  #magia() {
    if (!this.#job()?.firstMagic || !this.draft.magia) return null;
    return this.#magias?.find(m => m.uuid === this.draft.magia) ?? null;
  }

  /** The skill the class's choice of CR 1 gave (the Dragon Slayer's element). */
  #element() {
    const job = this.#job();
    for (const g of job?.choices ?? []) {
      const option = g.options.find(o => o.uuid === this.draft.classChoices[g.index]);
      if (option?.element) return option;
    }
    return null;
  }

  /** The attributes: the class's, the race's (or the Human's two +1), the bonus points, the total and the modifier. */
  #attributes() {
    const race = this.#race();
    const job = this.#job();
    return STATS.map(key => {
      const fromClass = job?.attributes[key] ?? 0;
      const fromRace = race ? (race.human ? (this.draft.human.includes(key) ? 1 : 0) : race.attributes[key]) : 0;
      const bonus = this.draft.bonus[key] ?? 0;
      const total = fromClass + fromRace + bonus;
      return { key, fromClass, fromRace, bonus, total, mod: Math.floor(total / 3) };
    });
  }

  /** The bonus points spent. */
  #spent() {
    return STATS.reduce((n, k) => n + (this.draft.bonus[k] ?? 0), 0);
  }

  /** The numbers of play at CR 1 (the sheet's rules, without items nor effects). */
  #numbers() {
    const attrs = Object.fromEntries(this.#attributes().map(a => [a.key, a]));
    const race = this.#race();
    const job = this.#job();
    const mod = key => attrs[key].mod;
    return {
      hp: (job?.hp ?? 0) + (race?.hp ?? 0),
      fate: race?.fate ?? 0,
      physDef: mod("str") * 2,
      magicDef: mod("int") * 2,
      initiative: Math.max(0, mod("str") + mod("int")),
      speed: 2,
      accuracy: Math.max(...STATS.map(mod)),
      evasion: mod("dex"),
      resistance: mod("pow")
    };
  }

  /**
   * The compendium skills the character gets with its choices (not the picks): the race's innate ones, the class's kit
   * and choice of CR 1, the Magia and its Decree.
   * @returns {{uuid: string, by: string}[]}  `by`: "race", "class" or "magia"
   */
  #granted() {
    const out = [];
    const race = this.#race();
    for (const g of race?.grants ?? []) {
      const uuid = g.choice ? this.draft.raceChoices[g.index] : g.options[0]?.uuid;
      if (uuid) out.push({ uuid, by: "race" });
    }
    const job = this.#job();
    for (const skill of job?.kit ?? []) out.push({ uuid: skill.uuid, by: "class" });
    for (const g of job?.choices ?? []) {
      const uuid = this.draft.classChoices[g.index];
      if (uuid) out.push({ uuid, by: "class" });
    }
    const magia = this.#magia();
    if (magia) {
      out.push({ uuid: magia.uuid, by: "class" });
      if (this.draft.decree && magia.choiceGrants.length) out.push({ uuid: this.draft.decree, by: "magia" });
    }
    return out;
  }

  /** The skill lists of the character being made (apps/skill-browser.mjs). */
  async #lists() {
    const index = await getSkillIndex();
    const byUuid = new Map(index.map(e => [e.uuid, e]));
    const granted = this.#granted();
    const element = this.#element();
    const magia = this.#magia();
    return creationLists({
      className: this.#job()?.name ?? "",
      raceName: this.#race()?.name ?? "",
      magics: magia ? [magia.id] : [],
      elements: element?.element?.class ? [`${element.element.class}.${element.element.id}`] : [],
      identifiers: granted.map(g => byUuid.get(g.uuid)?.identifier ?? this.#skillView(g.uuid)?.identifier ?? "")
    });
  }

  /** The view of a skill a race or class gives (catalog). */
  #skillView(uuid) {
    for (const race of this.#catalog?.races ?? []) for (const g of race.grants) {
      const found = g.options.find(o => o.uuid === uuid);
      if (found) return found;
    }
    for (const job of this.#catalog?.classes ?? []) {
      const found = [...job.kit, ...job.choices.flatMap(g => g.options), ...job.paths, job.apex].find(o => o?.uuid === uuid);
      if (found) return found;
    }
    return null;
  }

  /**
   * The skills that can be picked now, after taking out the picks that no longer can (another class, a talent whose
   * requirement left).
   */
  async #refreshCandidates() {
    if (!this.#job()) {
      this.#candidates = [];
      this.draft.picks = [];
      return;
    }
    const lists = await this.#lists();
    const owned = new Set(this.#granted().map(g => g.uuid));
    let picked = new Set(this.draft.picks);
    for (let pass = 0; pass < 5; pass++) {
      const candidates = await creationCandidates(lists, { picked, owned });
      const byUuid = new Map(candidates.map(c => [c.uuid, c]));
      const have = new Set([...lists.identifiers, ...candidates.filter(c => picked.has(c.uuid)).map(c => c.identifier).filter(Boolean)]);
      const kept = new Set([...picked].filter(uuid => byUuid.has(uuid) && byUuid.get(uuid).requires.every(r => have.has(r))));
      // Never more than the quota of a subtype (a quota a new class made smaller)
      for (const subtype of ["Combat", "General"]) {
        const of = [...kept].filter(uuid => byUuid.get(uuid).subtype === subtype);
        for (const uuid of of.slice(CREATION_PICKS[subtype])) kept.delete(uuid);
      }
      if (kept.size === picked.size) {
        this.#candidates = candidates;
        break;
      }
      picked = kept;
    }
    this.draft.picks = [...picked];
  }

  /** How many picks of a subtype the character still has (the quota, or what is left to pick). */
  #picksOf(subtype) {
    const picked = this.#candidates.filter(c => c.picked && (c.subtype === subtype)).length;
    const open = this.#candidates.filter(c => !c.picked && (c.subtype === subtype) && !c.reason).length;
    // Fewer skills than the quota: the step is done with all of them
    const quota = Math.min(CREATION_PICKS[subtype], picked + open);
    return { picked, quota, max: CREATION_PICKS[subtype] };
  }

  /* -------------------------------------------- */
  /*  Steps                                       */
  /* -------------------------------------------- */

  /** Whether each step is done. */
  #done() {
    const race = this.#race();
    const job = this.#job();
    const magia = this.#magia();
    const attrs = this.#attributes();
    const combat = this.#picksOf("Combat");
    const general = this.#picksOf("General");
    return {
      race: !!race && race.grants.every(g => !g.choice || !!this.draft.raceChoices[g.index])
        && (!race.human || (this.draft.human.length === HUMAN_PICKS)),
      class: !!job && job.choices.every(g => !!this.draft.classChoices[g.index]),
      magic: !!job && (!job.firstMagic || (!!magia && (!magia.choiceGrants.length || !!this.draft.decree))),
      profession: !!this.draft.profession,
      attributes: !!job && (this.#spent() === BONUS_POINTS) && attrs.every(a => a.total <= MAX_BASE_STAT),
      skills: !!job && (combat.picked >= combat.quota) && (general.picked >= general.quota),
      summary: !!this.draft.name?.trim()
    };
  }

  /** A step can be opened when every step before it is done. */
  #reachable(id, done = this.#done()) {
    const index = STEPS.findIndex(s => s.id === id);
    return STEPS.slice(0, index).every(s => done[s.id]);
  }

  /**
   * Go to a step (one that can be opened).
   * @param {string} id
   * @param {object} [options]
   * @param {boolean} [options.render]  Draw the window again
   */
  goTo(id, { render = true } = {}) {
    if (!STEPS.some(s => s.id === id)) return;
    if (this.#catalog && !this.#reachable(id)) return;
    this.step = id;
    if (render) this.render({ parts: ["head", "rail", "step", "foot"] });
  }

  /** Draw again the parts that show the choices (and the step, unless it handles its own selection). */
  #refresh({ step = true } = {}) {
    return this.render({ parts: step ? ["head", "rail", "step", "foot"] : ["head", "rail", "foot"] });
  }

  /* -------------------------------------------- */
  /*  Context                                     */
  /* -------------------------------------------- */

  /** @override */
  async _prepareContext(options) {
    this.#skillIndex = await getSkillIndex();
    if (!this.#magicContext) {
      this.#magicContext = await magicBrowserContext({ cr: 1 });
      this.#magias = this.#magicContext.magias;
    }
    if (!this.#catalog) {
      this.#catalog = await creationCatalog();
      this.#restoreChoices();
    }
    await this.#refreshCandidates();
    const done = this.#done();
    if (!this.#reachable(this.step, done)) this.step = STEPS.find(s => !done[s.id])?.id ?? "race";
    const index = STEPS.findIndex(s => s.id === this.step);
    return {
      done,
      stepId: this.step,
      // A step shows done once it can be opened (the summary is "done" with the name alone)
      steps: STEPS.map((s, i) => ({
        ...s, n: i + 1, label: L(`Wizard.Step.${s.id}`), done: done[s.id] && this.#reachable(s.id, done),
        current: s.id === this.step, reachable: this.#reachable(s.id, done), last: i === STEPS.length - 1
      })),
      first: index === 0,
      last: index === STEPS.length - 1,
      next: STEPS[index + 1] ? L(`Wizard.Step.${STEPS[index + 1].id}`) : "",
      complete: done[this.step],
      allDone: STEPS.every(s => done[s.id])
    };
  }

  /** @override */
  async _preparePartContext(partId, context, options) {
    context = await super._preparePartContext(partId, context, options);
    switch (partId) {
      case "head": return Object.assign(context, this.#headContext());
      case "rail": return Object.assign(context, this.#railContext());
      case "step": return Object.assign(context, await this.#stepContext());
      case "foot": return Object.assign(context, this.#footContext(context));
    }
    return context;
  }

  #headContext() {
    return {
      eyebrow: L("Wizard.StepOf", { n: STEPS.findIndex(s => s.id === this.step) + 1, total: STEPS.length }),
      heading: L(`Wizard.Heading.${this.step}`),
      lead: L(`Wizard.Lead.${this.step}`)
    };
  }

  /** The character as it stands, beside every step. */
  #railContext() {
    const race = this.#race();
    const job = this.#job();
    const magia = this.#magia();
    const profession = this.#profession();
    const element = this.#element();
    const numbers = this.#numbers();
    const line = (step, icon, label, value) => ({ step, icon, label, ...value });
    return {
      portrait: this.draft.img,
      name: this.draft.name || this.actor.name,
      subtitle: [race?.name, job?.name].filter(Boolean).join(" · ") || L("Wizard.Rail.Empty"),
      color: job?.color ?? race?.color ?? "#1f5137",
      lines: [
        line("race", "fa-solid fa-people-group", L("Wizard.Step.race"), race ? { name: race.name, img: race.img } : {}),
        line("class", "fa-solid fa-chess-knight", L("Wizard.Step.class"), job ? { name: job.name, img: job.img, note: element?.name } : {}),
        line("magic", "fa-solid fa-hat-wizard", L("Wizard.Rail.Magia"), magia ? { name: magia.name, img: magia.img }
          : ((job && !job.firstMagic) ? { note: L("Wizard.Rail.MagiaLater", { rank: job.magicSlots[0] ?? 5 }) } : {})),
        line("profession", "fa-solid fa-hammer", L("Wizard.Step.profession"), profession ? { name: profession.name, img: profession.img }
          : ((this.draft.profession === "later") ? { note: L("Wizard.Rail.Later") } : {}))
      ],
      attributes: this.#attributes().map(a => ({ ...a, abbr: L(`Sheet.Attr.${a.key}.abbr`), modLabel: signed(a.mod) })),
      hp: numbers.hp,
      fate: numbers.fate,
      defense: `${numbers.physDef} / ${numbers.magicDef}`,
      picks: this.draft.picks.length,
      ready: !!job
    };
  }

  #footContext(context) {
    const index = STEPS.findIndex(s => s.id === this.step);
    return {
      hint: context.done[this.step] ? L(`Wizard.Done.${this.step}`) : this.#hint(),
      backLabel: index > 0 ? L(`Wizard.Step.${STEPS[index - 1].id}`) : ""
    };
  }

  /** What the step still asks for. */
  #hint() {
    const race = this.#race();
    const job = this.#job();
    switch (this.step) {
      case "race":
        if (!race) return L("Wizard.Hint.race");
        if (race.human && (this.draft.human.length < HUMAN_PICKS)) return L("Wizard.Hint.human", { n: HUMAN_PICKS - this.draft.human.length });
        return L("Wizard.Hint.raceChoice", { name: race.name });
      case "class":
        return job ? L("Wizard.Hint.classChoice", { name: job.name }) : L("Wizard.Hint.class");
      case "magic": {
        const magia = this.#magia();
        return (magia && magia.choiceGrants.length) ? L("Wizard.Hint.decree", { name: magia.name }) : L("Wizard.Hint.magic");
      }
      case "profession": return L("Wizard.Hint.profession");
      case "attributes": {
        const left = BONUS_POINTS - this.#spent();
        return L("Wizard.Hint.attributes", { n: left });
      }
      case "skills": {
        const combat = this.#picksOf("Combat");
        const general = this.#picksOf("General");
        return L("Wizard.Hint.skills", { combat: combat.quota - combat.picked, general: general.quota - general.picked });
      }
      case "summary": return L("Wizard.Hint.summary");
    }
    return "";
  }

  /** The data of the open step. */
  async #stepContext() {
    const step = { step: this.step, partial: `${DIR}/${this.step}.hbs` };
    switch (this.step) {
      case "race": return { ...step, ...this.#raceStep() };
      case "class": return { ...step, ...this.#classStep() };
      case "magic": return { ...step, ...this.#magicStep() };
      case "profession": return { ...step, ...this.#professionStep() };
      case "attributes": return { ...step, ...this.#attributesStep() };
      case "skills": return { ...step, ...(await this.#skillsStep()) };
      case "summary": return { ...step, ...(await this.#summaryStep()) };
    }
    return step;
  }

  #raceStep() {
    const chosen = this.draft.race;
    return {
      races: this.#catalog.races.map(race => ({
        ...race,
        selected: race.uuid === chosen,
        grants: race.grants.map(g => ({
          ...g,
          options: g.options.map(o => ({
            ...o, tip: skillTip(o),
            checked: g.choice ? (this.draft.raceChoices[g.index] === o.uuid) && (race.uuid === chosen) : true
          }))
        })),
        stats: STATS.map(key => ({
          key, abbr: L(`Sheet.Attr.${key}.abbr`), name: L(`Sheet.Attr.${key}.name`),
          value: race.attributes[key], on: race.human && (race.uuid === chosen) && this.draft.human.includes(key),
          full: race.human && (this.draft.human.length >= HUMAN_PICKS) && !this.draft.human.includes(key)
        })),
        unlocks: this.#unlocks(race)
      })),
      selectedKey: chosen
    };
  }

  /** What a race unlocks at CR 3 and 5 (its skills with a minRank, from the skill index). */
  #unlocks(race) {
    const name = race.name.trim().toLowerCase();
    return (this.#skillIndex ?? []).filter(e => e.folders.includes(name) && (e.minRank > 1) && !e.choiceOnly)
      .sort((a, b) => a.minRank - b.minRank).map(e => ({ uuid: e.uuid, name: e.name, img: e.img, minRank: e.minRank }));
  }

  #classStep() {
    const chosen = this.draft.class;
    const classes = this.#catalog.classes.map(job => ({
      ...job,
      selected: job.uuid === chosen,
      hidden: !!this.#family && (job.family !== this.#family),
      base: STATS.map(key => ({ key, abbr: L(`Sheet.Attr.${key}.abbr`), value: job.attributes[key] })),
      kit: job.kit.map(o => ({ ...o, tip: skillTip(o) })),
      choices: job.choices.map(g => ({
        ...g,
        options: g.options.map(o => ({ ...o, tip: skillTip(o), checked: (job.uuid === chosen) && (this.draft.classChoices[g.index] === o.uuid) }))
      })),
      road: this.#road(job)
    }));
    const count = family => this.#catalog.classes.filter(c => !family || (c.family === family)).length;
    return {
      classes,
      families: [
        { id: "", label: L("Wizard.Class.All"), count: count(""), active: !this.#family },
        { id: "physical", label: L("Classes.Family.physical"), icon: "fa-solid fa-sword", count: count("physical"), active: this.#family === "physical" },
        { id: "magic", label: L("Classes.Family.magic"), icon: "fa-solid fa-wand-magic-sparkles", count: count("magic"), active: this.#family === "magic" }
      ],
      selectedKey: chosen
    };
  }

  /** What a class gives from CR 1 to 10: the kit, the Magias, the Path, the Dedication and the Apex. */
  #road(job) {
    const magia = rank => (job.magicSlots.includes(rank) ? [{ icon: "fa-solid fa-hat-wizard", label: L("Classes.TrailMagic") }] : []);
    const tip = o => ({ icon: "fa-solid fa-signs-post", label: o.name, tip: skillTip(o) });
    return [
      { rank: 1, items: [{ icon: "fa-solid fa-toolbox", label: L("Classes.Milestone.kit") },
        ...(job.choices.length ? [{ icon: "fa-solid fa-dragon", label: L("Classes.Element") }] : []), ...magia(1)] },
      { rank: 3, items: [{ icon: "fa-solid fa-route", label: L("Classes.Milestone.path") }, ...job.paths.map(tip)] },
      { rank: 5, items: [{ icon: "fa-solid fa-link", label: L("Classes.Milestone.dedication") }, ...magia(5)] },
      { rank: 10, items: [...(job.apex ? [{ icon: "fa-solid fa-crown", label: job.apex.name, tip: skillTip(job.apex) }] : []), ...magia(10)] }
    ].filter(r => r.items.length);
  }

  #magicStep() {
    const job = this.#job();
    if (!job?.firstMagic) {
      return {
        noSlot: true,
        className: job?.name ?? "",
        slots: (job?.magicSlots ?? []).map(rank => ({ rank })),
        firstRank: job?.magicSlots[0] ?? 5
      };
    }
    const ranks = new Intl.ListFormat(game.i18n.lang, { type: "conjunction" })
      .format(job.magicSlots.map(rank => L("MagicPicker.SlotRank", { rank })));
    return {
      ...this.#magicContext,
      guideSlots: L("MagicPicker.Guide.Slots", { count: job.magicSlots.length, ranks }),
      magicBrowser: MAGIC_BROWSER,
      className: job.name,
      color: job.color,
      decree: this.#decreeContext()
    };
  }

  /** The choice a Magia asks for (the Mandamentos' Decree), with its options. */
  #decreeContext() {
    const magia = this.#magia();
    if (!magia?.choiceGrants.length) return null;
    const index = this.#skillIndex ?? [];
    const options = magia.choiceGrants.map(id => index.find(e => e.identifier === id)).filter(Boolean)
      .map(e => ({ uuid: e.uuid, name: e.name, img: e.img, checked: e.uuid === this.draft.decree }));
    return options.length ? { name: magia.name, options } : null;
  }

  #professionStep() {
    const chosen = this.draft.profession;
    return {
      professions: this.#catalog.professions.map(p => ({ ...p, selected: p.id === chosen })),
      later: chosen === "later",
      selectedKey: (chosen && (chosen !== "later")) ? chosen : null
    };
  }

  #attributesStep() {
    const spent = this.#spent();
    const left = BONUS_POINTS - spent;
    const numbers = this.#numbers();
    return {
      left,
      points: Array.from({ length: BONUS_POINTS }, (_, i) => ({ on: i < spent })),
      max: MAX_BASE_STAT,
      attributes: this.#attributes().map(a => ({
        ...a,
        abbr: L(`Sheet.Attr.${a.key}.abbr`),
        name: L(`Sheet.Attr.${a.key}.name`),
        modLabel: signed(a.mod),
        canAdd: (left > 0) && (a.total < MAX_BASE_STAT),
        canRemove: a.bonus > 0,
        // Points to the next modifier (every 3)
        toNext: 3 - (a.total % 3),
        checks: CHECKS[a.key].map(c => ({ label: checkLabel(c), mod: signed(a.mod) })),
        hint: L(`Wizard.Attr.${a.key}`)
      })),
      numbers: [
        { icon: "fa-solid fa-heart", label: L("Wizard.Numbers.hp"), value: numbers.hp },
        { icon: "fa-solid fa-star", label: L("Wizard.Numbers.fate"), value: numbers.fate },
        { icon: "fa-solid fa-shield-halved", label: L("Sheet.PhysDef"), value: numbers.physDef },
        { icon: "fa-solid fa-shield-heart", label: L("Sheet.MagicDef"), value: numbers.magicDef },
        { icon: "fa-solid fa-bolt", label: L("Sheet.Initiative"), value: numbers.initiative },
        { icon: "fa-solid fa-crosshairs", label: checkLabel("accuracy"), value: signed(numbers.accuracy) },
        { icon: "fa-solid fa-person-running", label: checkLabel("evasion"), value: signed(numbers.evasion) },
        { icon: "fa-solid fa-hand-fist", label: checkLabel("resistance"), value: signed(numbers.resistance) }
      ]
    };
  }

  async #skillsStep() {
    const magia = this.#magia();
    const profession = this.#profession();
    const sources = {
      class: this.#job()?.name ?? "",
      magic: magia?.name ?? "",
      subclass: profession?.name ?? "",
      race: this.#race()?.name ?? "",
      common: L("SkillBrowser.Source.common")
    };
    const group = subtype => {
      const rows = this.#candidates.filter(c => c.subtype === subtype).map(c => ({
        uuid: c.uuid, name: c.name, img: c.img, picked: c.picked, reason: c.picked ? "" : c.reason, training: c.training,
        disabled: !!c.reason && !c.picked, clickable: c.picked || !c.reason, source: c.source, text: this.#texts.get(c.uuid) ?? ""
      }));
      const bySource = new Map();
      for (const row of rows) {
        if (!bySource.has(row.source)) bySource.set(row.source, []);
        bySource.get(row.source).push(row);
      }
      const order = ["class", "magic", "subclass", "race", "common"];
      return [...bySource.entries()].sort((a, b) => order.indexOf(a[0]) - order.indexOf(b[0]))
        .map(([source, list]) => ({ source, label: sources[source] || L(`SkillBrowser.Source.${source}`), rows: list }));
    };
    const combat = this.#picksOf("Combat");
    const general = this.#picksOf("General");
    const training = this.#candidates.filter(c => c.picked && c.training).length;
    // The descriptions of the skills shown (read once)
    await this.#loadTexts(this.#candidates.map(c => c.uuid));
    return {
      groups: [
        { id: "Combat", label: L("Skill.Type.Combat"), ...combat, sources: group("Combat") },
        { id: "General", label: L("Skill.Type.General"), ...general, sources: group("General") }
      ].map(g => ({ ...g, full: g.picked >= g.quota, pips: Array.from({ length: g.max }, (_, i) => ({ on: i < g.picked })) })),
      training: { picked: training, max: CREATION_PICKS.training },
      granted: this.#granted().map(g => this.#skillView(g.uuid) ?? this.#indexView(g.uuid)).filter(Boolean)
    };
  }

  /** A skill of the index as a tile (the Magia, the Decree). */
  #indexView(uuid) {
    const e = (this.#skillIndex ?? []).find(x => x.uuid === uuid);
    if (e) return { uuid, name: e.name, img: e.img };
    const magia = this.#magias?.find(m => m.uuid === uuid);
    return magia ? { uuid, name: magia.name, img: magia.img } : null;
  }

  /** Read the first lines of these skills (their documents), once. */
  async #loadTexts(uuids) {
    const missing = uuids.filter(uuid => !this.#texts.has(uuid));
    if (!missing.length) return;
    const docs = await loadDocuments(missing);
    for (const uuid of missing) this.#texts.set(uuid, skillSummary(docs.get(uuid)?.system?.description ?? ""));
  }

  async #summaryStep() {
    const race = this.#race();
    const job = this.#job();
    const magia = this.#magia();
    const profession = this.#profession();
    const element = this.#element();
    const index = this.#skillIndex ?? [];
    const named = uuid => this.#skillView(uuid) ?? this.#indexView(uuid) ?? { uuid, name: "?", img: "icons/svg/mystery-man.svg" };
    const basics = await basicSkills();
    return {
      race, job, magia, profession, element,
      decree: this.draft.decree ? named(this.draft.decree) : null,
      name: this.draft.name,
      img: this.draft.img,
      basics: this.draft.basics,
      basicCount: basics.length,
      attributes: this.#attributes().map(a => ({ ...a, abbr: L(`Sheet.Attr.${a.key}.abbr`), name: L(`Sheet.Attr.${a.key}.name`), modLabel: signed(a.mod) })),
      numbers: this.#numbers(),
      granted: this.#granted().map(g => named(g.uuid)),
      picks: this.draft.picks.map(uuid => index.find(e => e.uuid === uuid)).filter(Boolean).map(e => ({ uuid: e.uuid, name: e.name, img: e.img })),
      rebuild: !CreationWizard.isBlank(this.actor)
    };
  }

  /* -------------------------------------------- */
  /*  Rendering                                   */
  /* -------------------------------------------- */

  /** @override */
  async _onRender(context, options) {
    await super._onRender(context, options);
    const root = this.element;
    root.style.setProperty("--wz-color", this.#job()?.color ?? this.#race()?.color ?? "#1f5137");
    const parts = options.parts ?? Object.keys(this.constructor.PARTS);
    if (parts.includes("step")) {
      this.#activateStep(root.querySelector(".wz-step"));
      if (this.step === "summary") this.#activateSummary(root);
    }
  }

  /** The behavior of the open step: the page of the option under the pointer, the tooltips, the Magia browser. */
  #activateStep(step) {
    if (!step) return;
    // Cards and their pages: the page of the card under the pointer, else of the one chosen
    const pages = [...step.querySelectorAll(".wz-page[data-key]")];
    if (pages.length) {
      const chosen = step.dataset.selected || "";
      const show = key => {
        const target = key || chosen || "";
        let found = false;
        for (const page of pages) {
          const on = page.dataset.key === target;
          if (on && page.hidden) page.animate?.([{ opacity: 0, transform: "translateY(4px)" }, { opacity: 1, transform: "none" }], { duration: 140, easing: "ease-out" });
          page.hidden = !on;
          found ||= on;
        }
        const guide = step.querySelector(".wz-page.wz-guide");
        if (guide) guide.hidden = found;
        step.querySelector(".wz-detail")?.classList.toggle("preview", !!key && (key !== chosen));
      };
      const grid = step.querySelector(".wz-grid");
      grid?.addEventListener("pointerover", event => {
        const card = event.target.closest?.(".wz-card[data-key]");
        if (card) show(card.dataset.key);
      });
      grid?.addEventListener("pointerleave", () => show(null));
      grid?.addEventListener("focusin", event => {
        const card = event.target.closest?.(".wz-card[data-key]");
        if (card) show(card.dataset.key);
      });
      show(null);
    }
    // Rich tooltips of the skill tiles
    for (const tile of step.querySelectorAll("[data-wz-tip]")) {
      tile.addEventListener("pointerenter", () => {
        const html = tile.dataset.wzTip;
        if (html) game.tooltip.activate(tile, { html, cssClass: "lhcl-tooltip", direction: "UP" });
      });
      tile.addEventListener("pointerleave", () => game.tooltip.deactivate());
    }
    // Enter or space on a card chooses it (as a click)
    step.addEventListener("keydown", event => {
      if (!["Enter", " "].includes(event.key)) return;
      const card = event.target.closest?.("[data-action][tabindex]");
      if (!card || (card !== event.target)) return;
      event.preventDefault();
      card.click();
    });
    // The Magia browser
    if (this.step === "magic") {
      const browser = step.querySelector(".magic-picker");
      if (browser && this.#magias) {
        new MagicBrowser(browser, {
          magias: this.#magias,
          selected: this.draft.magia,
          onSelect: uuid => {
            if (!uuid || (uuid === this.draft.magia)) return;
            this.draft.magia = uuid;
            this.draft.decree = null;
            this.#refresh({ step: false }).then(() => this.#renderDecree());
          },
          onChoose: () => this.#onNextStep()
        });
      }
      this.#renderDecree();
    }
  }

  /** The choice the Magia chosen asks for (the Decree), under the browser. */
  async #renderDecree() {
    const box = this.element?.querySelector(".wz-decree");
    if (!box) return;
    const decree = this.#decreeContext();
    box.hidden = !decree;
    box.innerHTML = decree ? await foundry.applications.handlebars.renderTemplate(`${DIR}/decree.hbs`, decree) : "";
  }

  /** The summary: the name typed changes the draft (and the title) without drawing again. */
  #activateSummary(root) {
    const input = root.querySelector(".wz-name input");
    if (!input) return;
    input.addEventListener("input", () => {
      this.draft.name = input.value;
      root.querySelector(".wz-rail-name").textContent = input.value || this.actor.name;
      const create = root.querySelector(".wz-create");
      if (create) create.disabled = !input.value.trim();
    });
    root.querySelector(".wz-basics input")?.addEventListener("change", event => {
      this.draft.basics = event.currentTarget.checked;
    });
  }

  /* -------------------------------------------- */
  /*  Actions                                     */
  /* -------------------------------------------- */

  static #onStep(event, target) {
    this.goTo(target.dataset.step);
  }

  static #onNext() {
    return this.#onNextStep();
  }

  #onNextStep() {
    const index = STEPS.findIndex(s => s.id === this.step);
    if (!this.#done()[this.step]) return;
    if (STEPS[index + 1]) this.goTo(STEPS[index + 1].id);
  }

  static #onBack() {
    const index = STEPS.findIndex(s => s.id === this.step);
    if (index > 0) this.goTo(STEPS[index - 1].id);
  }

  /** Choose a race, a class or a profession (a card). */
  static #onPick(event, target) {
    const { kind, key } = target.closest("[data-kind]").dataset;
    const d = this.draft;
    if (kind === "race" && (d.race !== key)) {
      d.race = key;
      d.raceChoices = {};
      d.human = [];
      // A choice of a single skill is made at once
      for (const g of this.#race()?.grants ?? []) if (g.choice && (g.options.length === 1)) d.raceChoices[g.index] = g.options[0].uuid;
      this.#clampBonus();
    }
    else if (kind === "class" && (d.class !== key)) {
      d.class = key;
      d.classChoices = {};
      if (!this.#job()?.firstMagic) {
        d.magia = null;
        d.decree = null;
      }
      this.#clampBonus();
    }
    else if (kind === "profession") d.profession = key;
    else return;
    this.#refresh();
  }

  /** A choice inside an option: one skill of a race's or a class's grant (choosing it also chooses the option). */
  static #onGrant(event, target) {
    const { kind, key, grant } = target.closest("[data-grant]").dataset;
    const uuid = target.dataset.uuid;
    if (kind === "race") {
      if (this.draft.race !== key) {
        this.draft.race = key;
        this.draft.raceChoices = {};
        this.draft.human = [];
      }
      this.draft.raceChoices[grant] = uuid;
    }
    else if (kind === "class") {
      if (this.draft.class !== key) {
        this.draft.class = key;
        this.draft.classChoices = {};
      }
      this.draft.classChoices[grant] = uuid;
    }
    this.#clampBonus();
    this.#refresh();
  }

  /** The Human's +1: two attributes. */
  static #onHuman(event, target) {
    const race = this.#race();
    if (!race?.human) return;
    const key = target.dataset.stat;
    const list = this.draft.human;
    if (list.includes(key)) list.splice(list.indexOf(key), 1);
    else if (list.length < HUMAN_PICKS) list.push(key);
    this.#clampBonus();
    this.#refresh();
  }

  /** A bonus point more or less. */
  static #onStat(event, target) {
    const key = target.dataset.stat;
    const delta = Number(target.dataset.delta) || 0;
    const attr = this.#attributes().find(a => a.key === key);
    if (!attr) return;
    if ((delta > 0) && ((this.#spent() >= BONUS_POINTS) || (attr.total >= MAX_BASE_STAT))) return;
    if ((delta < 0) && (attr.bonus <= 0)) return;
    this.draft.bonus[key] = attr.bonus + delta;
    this.#refresh();
  }

  static #onResetStats() {
    this.draft.bonus = Object.fromEntries(STATS.map(k => [k, 0]));
    this.#refresh();
  }

  /** No attribute above the cap: the bonus points over it come back (a race or class changed). */
  #clampBonus() {
    for (const a of this.#attributes()) {
      const over = a.total - MAX_BASE_STAT;
      if (over > 0) this.draft.bonus[a.key] = Math.max(0, a.bonus - over);
    }
  }

  /** Pick or unpick a skill of the creation picks. */
  static #onSkill(event, target) {
    const uuid = target.closest("[data-uuid]").dataset.uuid;
    const candidate = this.#candidates.find(c => c.uuid === uuid);
    if (!candidate) return;
    const picks = this.draft.picks;
    if (picks.includes(uuid)) picks.splice(picks.indexOf(uuid), 1);
    else if (!candidate.reason) picks.push(uuid);
    else return;
    this.#refresh();
  }

  /** The Decree of the Mandamentos (a Magia's choice). */
  static async #onDecree(event, target) {
    this.draft.decree = target.dataset.uuid;
    await this.#refresh({ step: false });
    this.#renderDecree();
  }

  /** No profession for now. */
  static #onLater() {
    this.draft.profession = "later";
    this.#refresh();
  }

  static #onFamily(event, target) {
    this.#family = target.dataset.family ?? "";
    this.#refresh();
  }

  /** The portrait (the token takes it too, when it still has the default picture). */
  static #onPortrait() {
    const picker = new foundry.applications.apps.FilePicker.implementation({
      type: "image",
      current: this.draft.img,
      callback: path => {
        this.draft.img = path;
        this.#refresh();
      }
    });
    return picker.browse();
  }

  static async #onCreate() {
    if (!STEPS.every(s => this.#done()[s.id])) return;
    const button = this.element.querySelector(".wz-create");
    if (button) button.disabled = true;
    try {
      await this.#create();
    }
    catch (err) {
      console.error(`${SYSTEM_ID} | Could not create the character`, err);
      ui.notifications.error(L("Wizard.Error", { error: err.message }));
      if (button) button.disabled = false;
    }
  }

  /* -------------------------------------------- */
  /*  Creating the character                      */
  /* -------------------------------------------- */

  /** Create the character (once at a time), then close and open its sheet on the character tab. */
  async #create() {
    if (this.#creating) return;
    this.#creating = true;
    try {
      await this.#make();
    }
    finally {
      this.#creating = false;
    }
    await this.close();
    this.actor.sheet?.render({ force: true });
    this.actor.sheet?.changeTab?.("character", "primary", { force: true });
  }

  /**
   * Make the character: what an earlier creation gave leaves, then the actor (name, portrait, CR 1, bonus points,
   * the picks record) and all the items at once, and the HP and Fate full.
   */
  async #make() {
    const actor = this.actor;
    const d = this.draft;
    const race = this.#race();
    const job = this.#job();
    const profession = this.#profession();
    const magia = this.#magia();
    await this.#refreshCandidates();
    const granted = this.#granted();
    const picks = [...d.picks];
    const basics = d.basics ? await basicSkills() : [];
    const docs = await loadDocuments([race.uuid, job.uuid, profession?.uuid, ...granted.map(g => g.uuid), ...picks, ...basics].filter(Boolean));
    const doc = uuid => docs.get(uuid) ?? null;

    // What an earlier creation gave (a CR 1 character made again)
    const stale = actor.items.filter(i => OPTION_TYPES.includes(i.type)
      || ((i.type === "skill") && (i.getFlag(SYSTEM_ID, GRANT_FLAG) || (i.getFlag(SYSTEM_ID, PICK_FLAG) ?? []).length)));
    if (stale.length) await actor.deleteEmbeddedDocuments("Item", stale.map(i => i.id), { eterniaCreation: true });

    // The items: the race (with the Human's +1), the class, the profession
    const items = [];
    const raceData = optionDataFrom(doc(race.uuid));
    if (race.human) raceData.system.attributes = Object.fromEntries(STATS.map(k => [k, d.human.includes(k) ? 1 : 0]));
    items.push(raceData, optionDataFrom(doc(job.uuid)));
    if (profession && doc(profession.uuid)) items.push(optionDataFrom(doc(profession.uuid)));

    // The skills they give, marked by the option that gave them (apps/option-grants.mjs)
    const have = new Set(actor.items.filter(i => (i.type === "skill") && !stale.includes(i)).map(i => fold(i.name)));
    const skillData = (uuid, extra = {}) => {
      const skill = doc(uuid);
      if (!skill || have.has(fold(skill.name))) return null;
      have.add(fold(skill.name));
      const data = skill.toObject();
      delete data._id;
      delete data.folder;
      delete data.sort;
      delete data.ownership;
      foundry.utils.setProperty(data, "_stats.compendiumSource", skill.uuid);
      for (const [path, value] of Object.entries(extra)) foundry.utils.setProperty(data, path, value);
      return data;
    };
    const by = {
      race: { type: "race", source: race.uuid },
      class: { type: "class", source: job.uuid },
      magia: { type: "skill", source: magia?.uuid }
    };
    for (const g of granted) items.push(skillData(g.uuid, { [`flags.${SYSTEM_ID}.${GRANT_FLAG}`]: by[g.by] }));
    // The creation picks, each with its mark (CR 1), so the skill browser counts them spent
    const index = await getSkillIndex();
    for (const uuid of picks) {
      const subtype = index.find(e => e.uuid === uuid)?.subtype ?? doc(uuid)?.system.subtype;
      items.push(skillData(uuid, {
        "system.skillRank.value": 1,
        [`flags.${SYSTEM_ID}.${PICK_FLAG}`]: [{ rank: 1, subtype, kind: "new" }]
      }));
    }
    for (const uuid of basics) items.push(skillData(uuid));

    // The actor
    const name = d.name.trim() || actor.name;
    const update = {
      name,
      img: d.img,
      "system.infos.crank": 1,
      [`flags.${SYSTEM_ID}.${PROGRESS_FLAG}`]: { base: 1, creation: true },
      "prototypeToken.name": name
    };
    for (const key of STATS) update[`system.attributes.${key}.value`] = d.bonus[key] ?? 0;
    // The token takes the portrait when it still has the default picture (or the old portrait)
    const token = actor.prototypeToken?.texture?.src ?? "";
    if (!token || (token === actor.img) || /mystery-man|actors_icons/.test(token)) update["prototypeToken.texture.src"] = d.img;
    await actor.update(update, { eterniaRankUp: true });
    await actor.createEmbeddedDocuments("Item", items.filter(Boolean), { eterniaCreation: true });
    // Full HP and Fate
    await actor.update({ "system.health.value": toInt(actor.system.health?.max), "system.fate.value": toInt(actor.system.fate?.max) });

    if (setting("creationCard") !== false) await this.#announce();
  }

  /** A card in the chat: the new character, with what it chose. */
  async #announce() {
    const race = this.#race();
    const job = this.#job();
    const magia = this.#magia();
    const profession = this.#profession();
    const element = this.#element();
    const content = await foundry.applications.handlebars.renderTemplate(`${DIR}/chat-card.hbs`, {
      name: this.actor.name,
      img: this.actor.img,
      color: job?.color ?? "#1f5137",
      lines: [
        race && { label: L("Wizard.Step.race"), value: race.name, img: race.img },
        job && { label: L("Wizard.Step.class"), value: element ? `${job.name} (${element.name})` : job.name, img: job.img },
        magia && { label: L("Wizard.Rail.Magia"), value: magia.name, img: magia.img },
        profession && { label: L("Wizard.Step.profession"), value: profession.name, img: profession.img }
      ].filter(Boolean)
    });
    return ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor: this.actor }), content });
  }
}

/* -------------------------------------------- */

/** Call during the `init` hook. */
export function registerCreationWizard() {
  // A character made by this user opens the wizard (a client setting turns it off)
  Hooks.on("createActor", (actor, options, userId) => {
    if ((userId !== game.user.id) || (actor.type !== "character") || options.eterniaCreation) return;
    if ((setting("creationWizard") === false) || !CreationWizard.isBlank(actor)) return;
    // After the sheet Foundry opens for it
    setTimeout(() => CreationWizard.open(actor), 150);
  });
}
