/**
 * The creation wizard: a character made step by step, in one window, and created at once at the end.
 *
 *   1. Race        the races as cards; the page of the one under the pointer (or chosen) tells its story, its numbers,
 *                  its two innate skills (a choice among several is made right there; the Human picks the two
 *                  attributes of its +1) and what it unlocks at CR 3 and 5.
 *   2. Class       the 14 classes, physical and magic; the page shows the base, the Motor and how it works, the kit of
 *                  CR 1, the choice of CR 1 (the Dragon Slayer's element), the Magia slots, the Paths and the Apex.
 *   3. Magia       the Magia browser of the Magia picker, for the class's slot of CR 1 (a Magia that asks for a
 *                  choice, the Mandamentos' Decree, asks it below; a spell tells what it does under the pointer and
 *                  opens its whole text on a click). A class whose first slot comes later says so.
 *   4. Profession  the ten professions, or none for now.
 *   5. Attributes  the five bonus points (no attribute above 7) in a table, a row per attribute with what the class and
 *                  the race give, the modifier and its checks; the numbers of play below, and the points suggested for
 *                  the class above (one click uses them).
 *   6. Skills      the creation picks: three Combat skills and one General (at most two [Training]), among the class's
 *                  talents, the Magia's spells and the profession's skills of CR 1 (the skill browser's rules). A click
 *                  on a skill opens its whole text in a reading box over the step, which goes to the skills before and
 *                  after it and chooses it too; the box at a skill's side chooses it at once.
 *   7. Items       the starting gear (apps/starting-gear.mjs): a Backpack, an Adventurer's Kit and a Sandwich for free,
 *                  and the character's gold (350) to spend in the shop of Item Rank 1. The kit recommended for the class
 *                  comes equipped, on a paper doll (DOLL) with each piece where it is worn and the numbers it gives;
 *                  the shop beside it.
 *   8. Summary     the character's page: the portrait, the name and the numbers, the origins, the attributes, the
 *                  skills that come and the gear.
 *
 * Beside every step, the character as it stands. Nothing changes on the actor until "Create the character": then the
 * race, the class, the profession, every skill they give and the starting gear (equipped where the shop showed it)
 * come in one go, marked like the old dialogs marked them (the grants by their option, the picks with their marks,
 * apps/skill-browser.mjs), so changing class or CR later works as before. A character of CR 1 can be made again: what
 * its old race, class, picks and starting gear gave leaves first, and the gold of that gear comes back.
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
import { STATS, creationCatalog, loadDocuments, skillReading, skillSummary, skillTip } from "./creation-catalog.mjs";
import { BONUS_POINTS, MAX_BASE_STAT } from "./stat-allocation.mjs";
import {
  SHOP_CATEGORIES, STARTING_FLAG, STARTING_GEAR_FLAG, gearLayout, gearNumbers, gearOf, magiaSuggestion, recommendedKit,
  shopCatalog, suggestBonus
} from "./starting-gear.mjs";
import { chipText } from "../helpers/text-chips.mjs";
import { tagLabel } from "../i18n/terms.mjs";

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
  { id: "items", icon: "fa-solid fa-backpack" },
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

/**
 * The paper doll of the items step (templates/apps/creation/items.hbs): the sheet's figure (templates/character/
 * inventory.hbs) a fifth bigger, centred on a 600×362 stage (its group at translate(204 6) scale(1.2)), the slot cards
 * in the side columns and a line from each card to its body part. On the right, the armor on the chest, the bag at the
 * hip and the other hand; on the left, the main hand and the three accessories, each where it is worn (`spots`, on the
 * figure's left side), in `rows` from top to bottom like their parts, so no two lines cross. `filter`: the shop's
 * filter a click on the card sets.
 */
const DOLL = {
  width: 600,
  height: 362,
  center: [300, 184],
  card: { width: 198, height: 54, elbow: 14 },
  rows: [8, 72, 136, 230],
  slots: {
    main: { side: "left", point: [244.2, 200.4], filter: "weapon" },
    armor: { side: "right", top: 72, point: [318, 123.6], filter: "armor" },
    bag: { side: "right", top: 136, point: [325.2, 177.6], filter: "bag" },
    off: { side: "right", top: 230, point: [355.8, 200.4], filter: "shield" }
  },
  spots: {
    head: [289.7, 22.2],
    eyes: [294, 33.6],
    ear: [285.6, 37.2],
    neck: [298.8, 62.4],
    shoulder: [258, 85.2],
    chest: [283.2, 92.4],
    waist: [280.8, 153.6],
    hip: [273.6, 169.2],
    arm: [248.4, 176.4],
    hand: [243, 211.2],
    legs: [283.2, 272.4],
    feet: [284.4, 349.2]
  }
};

/**
 * Where an accessory is worn, by its name: the first that matches (the bracelets before the sashes, the capes before
 * the hoods); a book, a crystal or anything else hangs at the hip.
 */
const ACCESSORY_SPOTS = [
  ["arm", /faixas de couro|bracelete|pulseira|bracadeira|avambraco|bracelet|bangle|bracer|armlet|vambrace/],
  ["shoulder", /\bcapa\b|manto|mantelete|ombreira|\bcape\b|cloak|mantle|pauldron/],
  ["head", /chapeu|elmo|bacinete|kabuto|hachigane|coroa|diadema|tiara|boina|capuz|\bhat\b|helm|crown|circlet|hood|beret/],
  ["eyes", /oculos|mascara|visor|luneta|monoculo|glasses|goggles|mask|monocle|spyglass/],
  ["ear", /brinco|earring/],
  ["neck", /amuleto|talisma|colar|pingente|medalhao|corrente|cachecol|escaravelho|amulet|talisman|necklace|pendant|medallion|choker|scarf/],
  ["chest", /broche|insignia|casaco|gabardine|inverness|sobreveste|blazer|vestido|brooch|badge|coat|surcoat/],
  ["hand", /\banel\b|sinete|\bluva|manopla|\brings?\b|signet|glove|gauntlet/],
  ["waist", /cinto|cinturao|faixa|saia|\bbelt|sash|skirt/],
  ["legs", /calca|perneira|caneleira|greva|pants|trousers|greave|leggings|tights/],
  ["feet", /\bbota|sapato|sandalia|\bboot|\bshoe|sandal/]
];
/** The parts an empty accessory slot points at, the first ones still free. */
const EMPTY_SPOTS = ["neck", "shoulder", "ear", "chest", "head", "waist"];

const accessorySpot = name => ACCESSORY_SPOTS.find(([, pattern]) => pattern.test(fold(name)))?.[0] ?? "hip";

/** Where a doll slot's card sits, and the line from the card to its body point. */
function dollPlace(pos, { side, top, point: [x, y], filter }) {
  const { width, height, elbow } = DOLL.card;
  const cy = top + (height / 2);
  const edge = (side === "left") ? width : DOLL.width - width;
  const knee = (side === "left") ? edge + elbow : edge - elbow;
  return { pos, side, top, x, y, filter, line: `${edge},${cy} ${knee},${cy} ${x},${y}` };
}

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
    this.#have = gearOf(actor);
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
      suggestStats: CreationWizard.#onSuggestStats,
      buy: CreationWizard.#onBuy,
      sell: CreationWizard.#onSell,
      kit: CreationWizard.#onKit,
      emptyCart: CreationWizard.#onEmptyCart,
      shopFilter: CreationWizard.#onShopFilter,
      skill: CreationWizard.#onSkill,
      read: CreationWizard.#onRead,
      readerMove: CreationWizard.#onReaderMove,
      readerClose: CreationWizard.#onReaderClose,
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
    step: {
      template: `${DIR}/step.hbs`,
      scrollable: [".wz-grid", ".wz-detail", ".wz-scroll", ".mp-grid", ".mp-detail", ".wz-shop-grid", ".wz-cart-scroll"]
    },
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
  /** The reading box of the skills step: the skill it shows and whether it goes through what comes ({uuid, granted}),
      or null when closed. */
  #reader = null;
  /** What the reading box shows of each skill (uuid → promise of skillReading), read once. */
  #readings = new Map();
  /** What the shop sells (apps/starting-gear.mjs). */
  #shop = null;
  /** The gear the character already has (not given by the wizard): the slots it takes, what it carries. */
  #have = null;
  /** The shop's filter ("", "recommended" or a type) and the name searched. */
  #shopFilter = "";
  #shopQuery = "";
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
      // A character made before with a class and no profession left it for later
      profession: profession?.system.identifier || (job ? "later" : null),
      bonus,
      picks: skills.filter(i => (i.getFlag(SYSTEM_ID, PICK_FLAG) ?? []).length).map(sourceUuid).filter(Boolean),
      name: actor.name,
      img: actor.img,
      basics: true,
      // The starting gear bought (by compendium entry, in the order bought) and the gold to buy it with: what the
      // character has, plus what its starting gear cost when it was made before
      cart: actor.items.filter(i => i.getFlag(SYSTEM_ID, STARTING_FLAG) === "bought").map(sourceUuid).filter(Boolean),
      budget: Math.max(0, toInt(actor._source.system.inventory?.gold) + toInt(actor.getFlag(SYSTEM_ID, STARTING_GEAR_FLAG)?.spent)),
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

  /** The numbers of play at CR 1 (the sheet's rules, with the starting gear equipped where the shop puts it). */
  #numbers() {
    const attrs = Object.fromEntries(this.#attributes().map(a => [a.key, a]));
    const race = this.#race();
    const job = this.#job();
    const mod = key => attrs[key].mod;
    const layout = this.#layout();
    const gear = layout ? gearNumbers(layout) : { attack: 0, magic: 0, accuracy: 0, pdef: 0, mdef: 0, initiative: 0, checks: {} };
    return {
      hp: (job?.hp ?? 0) + (race?.hp ?? 0),
      fate: race?.fate ?? 0,
      physDef: (mod("str") * 2) + gear.pdef,
      magicDef: (mod("int") * 2) + gear.mdef,
      initiative: Math.max(0, mod("str") + mod("int") + gear.initiative),
      speed: 2,
      accuracy: Math.max(...STATS.map(mod)) + gear.accuracy,
      evasion: mod("dex"),
      resistance: mod("pow"),
      attack: gear.attack,
      magic: gear.magic,
      checks: gear.checks
    };
  }

  /* -------------------------------------------- */
  /*  The starting gear                           */
  /* -------------------------------------------- */

  /** The free items the character gets: those it doesn't have yet (by name). */
  #freeEntries() {
    return (this.#shop?.free ?? []).filter(e => !this.#have.names.has(fold(e.name)));
  }

  /** The starting gear (the free items, then what was bought, in that order) and where each piece goes. */
  #layout() {
    const shop = this.#shop;
    if (!shop) return null;
    const bought = this.draft.cart.map(uuid => shop.byUuid.get(uuid)).filter(Boolean);
    return gearLayout([...this.#freeEntries().map(entry => ({ entry, free: true })), ...bought.map(entry => ({ entry }))], this.#have);
  }

  /** The gold: what the character has to spend, what the gear bought costs and what is left. */
  #gold() {
    const budget = this.draft.budget;
    const spent = this.draft.cart.reduce((n, uuid) => n + (this.#shop?.byUuid.get(uuid)?.price ?? 0), 0);
    return { budget, spent, left: budget - spent, pct: budget ? Math.clamp(Math.round(((budget - spent) / budget) * 100), 0, 100) : 0 };
  }

  /** Whether one more of a piece can be bought: the gold, and the space when it would be carried. */
  #canBuy(entry, layout = this.#layout(), gold = this.#gold()) {
    if (entry.price > gold.left) return { ok: false, reason: L("Wizard.Items.NoGold") };
    const after = gearLayout([...layout.units.map(({ entry: e, free }) => ({ entry: e, free })), { entry }], this.#have);
    if ((after.space.used > after.space.max) && (after.space.used > layout.space.used)) return { ok: false, reason: L("Wizard.Items.NoSpace") };
    return { ok: true, reason: "" };
  }

  /** The kit recommended for the class, and for a Magia whose spells attack, what gives them Magic Power. */
  #recommendation() {
    const job = this.#job();
    if (!job || !this.#shop) return null;
    const kit = recommendedKit(this.#shop, job.identifier, job.family);
    const magia = this.#magia();
    const attacks = !!magia && (this.#skillIndex ?? []).some(e => (e.magicSpell === magia.id) && e.tags.includes("Magic Attack"));
    return { ...kit, magia, extra: magiaSuggestion(this.#shop, kit.entries, attacks) };
  }

  /**
   * What the kit buys: its pieces in their order while the gold lasts, then the Magia's suggestion when it still fits.
   * @param {object} rec   #recommendation()
   * @returns {string[]}   The uuids, in the order bought
   */
  #kitCart(rec) {
    const cart = [];
    let left = this.draft.budget;
    for (const entry of [...rec.entries, ...(rec.extra ? [rec.extra] : [])]) {
      if (entry.price > left) continue;
      cart.push(entry.uuid);
      left -= entry.price;
    }
    return cart;
  }

  /**
   * The first time the items step opens with nothing bought, the kit recommended for the class goes in, each piece
   * equipped where it goes (giving it all back keeps the bag empty).
   */
  #offerKit() {
    if (this.draft.kitOffered || this.draft.cart.length || !this.#shop) return;
    const rec = this.#recommendation();
    if (!rec?.entries.length) return;
    this.draft.kitOffered = true;
    this.draft.cart = this.#kitCart(rec);
  }

  /** The bonus points suggested for the class (apps/starting-gear.mjs). */
  #suggestion() {
    const job = this.#job();
    if (!job) return null;
    const before = Object.fromEntries(this.#attributes().map(a => [a.key, a.fromClass + a.fromRace]));
    return suggestBonus(job.attributes, before, BONUS_POINTS, MAX_BASE_STAT);
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
      // Buying is free: the gold not spent stays in the purse
      items: !!this.#shop && (this.#gold().left >= 0),
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
    if (id !== this.step) this.#closeReader({ focus: false });
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
    this.#shop ??= await shopCatalog();
    await this.#refreshCandidates();
    const done = this.#done();
    if (!this.#reachable(this.step, done)) this.step = STEPS.find(s => !done[s.id])?.id ?? "race";
    if (this.step === "items") this.#offerKit();
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
          : ((this.draft.profession === "later") ? { note: L("Wizard.Rail.Later") } : {})),
        line("items", "fa-solid fa-backpack", L("Wizard.Step.items"), this.#railGear())
      ],
      attributes: this.#attributes().map(a => ({ ...a, abbr: L(`Sheet.Attr.${a.key}.abbr`), modLabel: signed(a.mod) })),
      hp: numbers.hp,
      fate: numbers.fate,
      defense: `${numbers.physDef} / ${numbers.magicDef}`,
      picks: this.draft.picks.length,
      ready: !!job
    };
  }

  /** The starting gear on the banner: the main weapon and how many pieces were bought, and the gold left. */
  #railGear() {
    if (!this.#shop) return {};
    const layout = this.#layout();
    const gold = L("Wizard.Rail.Gold", { n: this.#gold().left });
    const count = this.draft.cart.length;
    if (!count) return { note: gold };
    return { name: L("Wizard.Rail.Items", { n: count }), img: (layout.main ?? layout.armor)?.img, note: gold };
  }

  #footContext(context) {
    const index = STEPS.findIndex(s => s.id === this.step);
    const done = (this.step === "items")
      ? L("Wizard.Done.items", { n: this.draft.cart.length, gold: this.#gold().left })
      : L(`Wizard.Done.${this.step}`);
    return {
      hint: context.done[this.step] ? done : this.#hint(),
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
      case "items": return L("Wizard.Hint.items", { n: this.#gold().left });
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
      case "items": return { ...step, ...this.#itemsStep() };
      case "summary": return { ...step, ...(await this.#summaryStep()) };
    }
    return step;
  }

  #raceStep() {
    const chosen = this.draft.race;
    const races = this.#catalog.races.map(race => ({
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
      // The stages of the form, each skill with its tooltip (a slot of several is a choice made when evolving)
      stages: race.stages.map(st => ({ ...st, slots: st.slots.map(slot => ({ choice: slot.length > 1, skills: slot.map(o => ({ ...o, tip: skillTip(o) })) })) }))
    }));
    // A group of races is one card (the Bestials): its lineages are chosen in the page, and the card opens the page of
    // the one chosen (or the first)
    const cards = [];
    for (const race of races) {
      if (!race.group) {
        cards.push({ ...race, key: race.uuid });
        continue;
      }
      if (cards.some(c => c.group === race.group)) continue;
      const members = races.filter(r => r.group === race.group);
      const current = members.find(m => m.uuid === chosen) ?? members[0];
      cards.push({
        group: race.group, key: current.uuid, img: current.img, color: race.groupColor ?? current.color,
        name: L(`Wizard.Race.Group.${race.group}.Name`), tagline: L(`Wizard.Race.Group.${race.group}.Tagline`),
        bonusLabel: members.map(m => m.lineage).join(" · "), selected: members.some(m => m.uuid === chosen)
      });
      for (const member of members) {
        member.lineages = members.map(m => ({ uuid: m.uuid, name: m.lineage, img: m.img, bonus: m.bonusLabel,
          on: m.uuid === member.uuid, chosen: m.uuid === chosen }));
      }
    }
    return { races, cards, selectedKey: chosen };
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
    const suggestion = this.#suggestion();
    const job = this.#job();
    const tile = (icon, label, value) => ({ icon, label, value });
    return {
      left,
      spent,
      total: BONUS_POINTS,
      points: Array.from({ length: BONUS_POINTS }, (_, i) => ({ on: i < spent })),
      max: MAX_BASE_STAT,
      // The points suggested for the class, and whether they are the ones in use
      suggest: suggestion && {
        title: L("Wizard.Attr.Suggest", { name: job.name }),
        parts: STATS.filter(k => suggestion[k]).map(k => ({ abbr: L(`Sheet.Attr.${k}.abbr`), n: suggestion[k] })),
        applied: STATS.every(k => (this.draft.bonus[k] ?? 0) === suggestion[k]),
        color: job.color
      },
      attributes: this.#attributes().map(a => ({
        ...a,
        abbr: L(`Sheet.Attr.${a.key}.abbr`),
        name: L(`Sheet.Attr.${a.key}.name`),
        modLabel: signed(a.mod),
        canAdd: (left > 0) && (a.total < MAX_BASE_STAT),
        canRemove: a.bonus > 0,
        suggested: suggestion?.[a.key] ?? 0,
        // How far the next modifier is (one every 3 points): the points already toward it, and what is missing
        next: [0, 1, 2].map(i => i < (a.total % 3)),
        nextTip: (a.total >= MAX_BASE_STAT) ? L("Wizard.Attr.AtMax", { max: MAX_BASE_STAT })
          : L("Wizard.Attr.NextTip", { n: 3 - (a.total % 3), mod: signed(a.mod + 1) }),
        // The checks with what the starting gear adds (the Cloak of Agility's +1 in Athletics)
        checks: CHECKS[a.key].map(c => ({ label: checkLabel(c), mod: signed(a.mod + (numbers.checks[c] ?? 0)) })),
        hint: L(`Wizard.Attr.${a.key}`)
      })),
      // What the attributes give in play, by kind
      gives: [
        { label: L("Wizard.Attr.Gives.life"), items: [
          tile("fa-solid fa-heart", L("Wizard.Numbers.hp"), numbers.hp),
          tile("fa-solid fa-star", L("Wizard.Numbers.fate"), numbers.fate)
        ] },
        { label: L("Wizard.Attr.Gives.defense"), items: [
          tile("fa-solid fa-shield-halved", L("Wizard.Attr.Gives.phys"), numbers.physDef),
          tile("fa-solid fa-shield-heart", L("Wizard.Attr.Gives.magic"), numbers.magicDef)
        ] },
        { label: L("Wizard.Attr.Gives.combat"), items: [
          tile("fa-solid fa-bolt", L("Sheet.Initiative"), numbers.initiative),
          tile("fa-solid fa-crosshairs", checkLabel("accuracy"), signed(numbers.accuracy)),
          tile("fa-solid fa-person-running", checkLabel("evasion"), signed(numbers.evasion)),
          tile("fa-solid fa-hand-fist", checkLabel("resistance"), signed(numbers.resistance))
        ] }
      ]
    };
  }

  /**
   * The items step. On the left, the kit recommended for the class (with the Magia's suggestion) over the paper doll
   * with each piece where it goes (a click on a card shows that kind in the shop), the numbers the gear gives and what is
   * carried in the bag's space; on the right, the gold and the shop of Item Rank 1, by type (the filter and the name
   * searched are applied in the page too, without drawing it again).
   */
  #itemsStep() {
    const shop = this.#shop;
    const layout = this.#layout();
    const gold = this.#gold();
    const rec = this.#recommendation();
    const job = this.#job();
    const marked = new Set([...(rec?.entries ?? []), ...(rec?.extra ? [rec.extra] : [])].map(e => e.uuid));
    const counts = new Map();
    for (const uuid of this.draft.cart) counts.set(uuid, (counts.get(uuid) ?? 0) + 1);
    const query = fold(this.#shopQuery.trim());
    const filter = this.#shopFilter;
    const visible = e => (!filter || ((filter === "recommended") ? marked.has(e.uuid) : (e.type === filter)))
      && (!query || e.search.includes(query));
    const cards = shop.items.map(e => {
      const can = this.#canBuy(e, layout, gold);
      return {
        uuid: e.uuid, name: e.name, img: e.img, type: e.type, price: e.price, line: e.line, tip: e.tip, rare: e.rare,
        search: e.search, count: counts.get(e.uuid) ?? 0, marked: marked.has(e.uuid),
        recommended: !!rec?.entries.some(k => k.uuid === e.uuid), forMagia: rec?.extra?.uuid === e.uuid,
        canBuy: can.ok, reason: can.reason, hidden: !visible(e)
      };
    });
    const ofType = id => shop.items.filter(e => e.type === id).length;
    const filters = [
      { id: "", icon: "fa-solid fa-border-all", label: L("Wizard.Items.All"), count: shop.items.length },
      ...(marked.size ? [{ id: "recommended", icon: "fa-solid fa-star", label: L("Wizard.Items.Recommended"), count: marked.size }] : []),
      ...SHOP_CATEGORIES.filter(c => ofType(c.id)).map(c => ({ id: c.id, icon: c.icon, label: L(`Wizard.Items.Category.${c.id}`), count: ofType(c.id) }))
    ].map(f => ({ ...f, active: f.id === filter }));

    // The kit: its pieces (a piece twice shows ×2), what it costs, and whether the bag has exactly it
    let kit = null;
    if (rec?.entries.length) {
      const pieces = new Map();
      for (const e of rec.entries) pieces.set(e.uuid, { ...e, count: (pieces.get(e.uuid)?.count ?? 0) + 1 });
      kit = {
        className: job.name,
        img: job.img,
        color: job.color,
        reason: chipText(L(rec.own ? `Wizard.Items.Kit.${job.identifier}` : "Wizard.Items.Kit.family")),
        pieces: [...pieces.values()].map(p => ({ name: p.name, img: p.img, price: p.price, count: p.count, tip: p.tip })),
        cost: rec.cost,
        short: Math.max(0, rec.cost - gold.budget),
        taken: [...this.draft.cart].sort().join("|") === this.#kitCart(rec).sort().join("|"),
        extra: rec.extra && {
          uuid: rec.extra.uuid, img: rec.extra.img, tip: rec.extra.tip, owned: counts.has(rec.extra.uuid),
          canBuy: this.#canBuy(rec.extra, layout, gold).ok,
          text: chipText(L("Wizard.Items.Magia", { name: rec.magia.name, item: rec.extra.name, n: rec.extra.stats.magic + rec.extra.bonus.magic }))
        }
      };
    }

    const numbers = this.#numbers();
    return {
      kit,
      filters,
      cards,
      query: this.#shopQuery,
      gold,
      doll: this.#dollSlots(layout),
      stage: DOLL,
      carried: this.#carriedRows(layout),
      ownCarried: this.#have.carried,
      space: { ...layout.space, over: layout.space.used > layout.space.max },
      hasCart: this.draft.cart.length > 0,
      // The numbers the gear gives, under the doll: how it strikes on the left, how it holds on the right
      stats: {
        left: [
          { icon: "fa-solid fa-sword", label: L("Wizard.Items.Num.attack"), tip: L("Tooltip.AttackPower"), value: numbers.attack },
          { icon: "fa-solid fa-wand-magic-sparkles", label: L("Wizard.Items.Num.magic"), tip: L("Tooltip.MagicPower"), value: numbers.magic },
          { icon: "fa-solid fa-crosshairs", label: checkLabel("accuracy"), value: signed(numbers.accuracy) }
        ],
        right: [
          { icon: "fa-solid fa-shield-halved", label: L("Wizard.Attr.Gives.phys"), tip: L("Sheet.PhysDef"), value: numbers.physDef },
          { icon: "fa-solid fa-shield-heart", label: L("Wizard.Attr.Gives.magic"), tip: L("Sheet.MagicDef"), value: numbers.magicDef },
          { icon: "fa-solid fa-bolt", label: L("Sheet.Initiative"), value: numbers.initiative }
        ]
      }
    };
  }

  /**
   * The doll's cards: the hands, the armor, the bag and the three accessories, each with what is in it (bought, free, or
   * the character's own), where it sits and its line to the body.
   */
  #dollSlots(layout) {
    const own = this.#have.equipped;
    const card = (pos, where, label, icon, unit, mine) => {
      const entry = unit?.entry ?? mine?.entry ?? null;
      return {
        ...dollPlace(pos, where), label, icon, entry, tip: entry?.tip ?? "",
        free: !!unit?.free, own: !unit && !!mine, sellable: !!unit && !unit.free
      };
    };
    const at = slot => layout.units.find(u => u.slot === slot);
    const mine = slot => own.find(o => o.slot === slot);
    const type = id => game.i18n.localize(`TYPES.Item.${id}`);
    const count = DOLL.rows.length - 1;
    const accessories = [...own.filter(o => o.slot === "accessory").map(o => ({ mine: o })),
      ...layout.units.filter(u => u.slot === "accessory").map(u => ({ unit: u }))].slice(0, count);
    // Each accessory where it is worn, an empty slot on a part still free; the left column follows the body down
    const spots = accessories.map(a => accessorySpot((a.unit ?? a.mine).entry.name));
    for (const spot of EMPTY_SPOTS) if ((spots.length < count) && !spots.includes(spot)) spots.push(spot);
    const left = [
      { pos: "main", point: DOLL.slots.main.point, filter: "weapon", label: L("Hands.Main"), icon: "fa-solid fa-hand-fist", unit: at("main"), mine: mine("main") },
      ...spots.map((spot, i) => ({
        pos: `acc${i}`, point: DOLL.spots[spot], filter: "accessory", label: type("accessory"), icon: "fa-solid fa-ring",
        unit: accessories[i]?.unit, mine: accessories[i]?.mine
      }))
    ].sort((a, b) => a.point[1] - b.point[1]);
    return [
      ...left.map((s, row) => card(s.pos, { side: "left", top: DOLL.rows[row], point: s.point, filter: s.filter }, s.label, s.icon, s.unit, s.mine)),
      // A [Two-Handed] weapon takes the other hand too
      layout.locked
        ? { ...dollPlace("off", DOLL.slots.off), label: L("Hands.Off"), icon: "fa-solid fa-hand", entry: null, note: tagLabel("Two-Handed"), locked: true }
        : card("off", DOLL.slots.off, L("Hands.Off"), "fa-solid fa-shield", at("off"), mine("off")),
      card("armor", DOLL.slots.armor, type("armor"), "fa-solid fa-shirt", at("armor"), mine("armor")),
      card("bag", DOLL.slots.bag, type("bag"), "fa-solid fa-sack", at("bag"), mine("bag"))
    ];
  }

  /** What is carried (takes the bag's space), a row per piece with how many. */
  #carriedRows(layout) {
    const rows = new Map();
    for (const unit of layout.carried) {
      const key = `${unit.entry.uuid}${unit.free ? ":free" : ""}`;
      const row = rows.get(key) ?? { entry: unit.entry, tip: unit.entry.tip, count: 0, free: !!unit.free, sellable: !unit.free };
      row.count += 1;
      rows.set(key, row);
    }
    return [...rows.values()];
  }

  /** The name of where a skill to pick comes from (the class, the Magia, the profession, the race, the common ones). */
  #sourceLabel(source) {
    const names = {
      class: this.#job()?.name,
      magic: this.#magia()?.name,
      subclass: this.#profession()?.name,
      race: this.#race()?.name,
      common: L("SkillBrowser.Source.common")
    };
    return names[source] || L(`SkillBrowser.Source.${source}`);
  }

  async #skillsStep() {
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
        .map(([source, list]) => ({ source, label: this.#sourceLabel(source), rows: list }));
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

  /**
   * The summary, as the character's first page: the portrait and the name (both can still change) with what it is; then
   * its origins (the race, the class, the Magia, the profession), the attributes and the numbers of play, the skills it
   * starts with (by where they come from) and the gear on it and in its bag.
   */
  async #summaryStep() {
    const race = this.#race();
    const job = this.#job();
    const magia = this.#magia();
    const profession = this.#profession();
    const element = this.#element();
    const numbers = this.#numbers();
    const gold = this.#gold();
    const basics = await basicSkills();
    // The first lines of the picks, for their tooltips (read in the skills step, unless the wizard opened here)
    await this.#loadTexts(this.draft.picks);
    const decree = this.draft.decree ? this.#skillTile(this.draft.decree) : null;

    // The skills it starts with, by where they come from (the Magia and its Decree apart from the class's)
    const granted = this.#granted();
    const groups = [
      { id: "race", icon: "fa-solid fa-people-group", uuids: granted.filter(g => g.by === "race").map(g => g.uuid) },
      { id: "class", icon: "fa-solid fa-chess-knight", uuids: granted.filter(g => (g.by === "class") && (g.uuid !== magia?.uuid)).map(g => g.uuid) },
      { id: "magia", icon: "fa-solid fa-hat-wizard", uuids: granted.filter(g => (g.uuid === magia?.uuid) || (g.by === "magia")).map(g => g.uuid) },
      { id: "picks", icon: "fa-solid fa-hand-pointer", uuids: this.draft.picks }
    ].map(g => ({ ...g, label: L(`Wizard.Summary.From.${g.id}`), tiles: g.uuids.map(uuid => this.#skillTile(uuid)).filter(Boolean) }))
      .filter(g => g.tiles.length);

    return {
      name: this.draft.name,
      img: this.draft.img,
      color: job?.color ?? race?.color ?? "#1f5137",
      identity: [race?.name, element ? `${job?.name} (${element.name})` : job?.name, magia?.name, profession?.name].filter(Boolean),
      hero: [
        { icon: "fa-solid fa-heart", label: L("Wizard.Numbers.hp"), value: numbers.hp },
        { icon: "fa-solid fa-star", label: L("Wizard.Numbers.fate"), value: numbers.fate },
        { icon: "fa-solid fa-coins", label: L("Wizard.Summary.Gold"), value: gold.left }
      ],
      origins: [
        race && { label: L("Wizard.Step.race"), name: race.name, img: race.img, color: race.color, line: race.tagline },
        job && { label: job.eyebrow, name: element ? `${job.name} · ${element.name}` : job.name, img: job.img, color: job.color,
          line: job.motor ? L("Sheet.MotorLine", { name: job.motor.name }) : job.tagline, emblem: true },
        magia && { label: magia.categoryLabel, name: magia.name, img: magia.img, color: magia.categoryColor, line: magia.tagline,
          note: decree?.name },
        profession ? { label: L("Wizard.Step.profession"), name: profession.name, img: profession.img, color: profession.color,
          line: profession.talent.name }
          : { label: L("Wizard.Step.profession"), name: L("Wizard.Summary.NoProfession"), icon: "fa-solid fa-hourglass-half", empty: true }
      ].filter(Boolean),
      attributes: this.#attributes().map(a => ({ ...a, abbr: L(`Sheet.Attr.${a.key}.abbr`), name: L(`Sheet.Attr.${a.key}.name`), modLabel: signed(a.mod) })),
      numbers: [
        { icon: "fa-solid fa-shield-halved", label: L("Wizard.Attr.Gives.phys"), value: numbers.physDef },
        { icon: "fa-solid fa-shield-heart", label: L("Wizard.Attr.Gives.magic"), value: numbers.magicDef },
        { icon: "fa-solid fa-bolt", label: L("Sheet.Initiative"), value: numbers.initiative },
        { icon: "fa-solid fa-crosshairs", label: checkLabel("accuracy"), value: signed(numbers.accuracy) },
        { icon: "fa-solid fa-person-running", label: checkLabel("evasion"), value: signed(numbers.evasion) },
        { icon: "fa-solid fa-hand-fist", label: checkLabel("resistance"), value: signed(numbers.resistance) },
        { icon: "fa-solid fa-sword", label: L("Wizard.Items.Num.attack"), value: numbers.attack },
        { icon: "fa-solid fa-wand-magic-sparkles", label: L("Wizard.Items.Num.magic"), value: numbers.magic }
      ],
      groups,
      skillCount: groups.reduce((n, g) => n + g.tiles.length, 0),
      basics: this.draft.basics,
      basicCount: basics.length,
      gear: this.#summaryGear(),
      rebuild: !CreationWizard.isBlank(this.actor)
    };
  }

  /** A skill as a tile of the summary: its picture, its name and its tooltip. */
  #skillTile(uuid) {
    const view = this.#skillView(uuid);
    if (view) return { uuid, name: view.name, img: view.img, tip: skillTip(view) };
    const entry = (this.#skillIndex ?? []).find(e => e.uuid === uuid) ?? this.#magias?.find(m => m.uuid === uuid);
    if (!entry) return null;
    return { uuid, name: entry.name, img: entry.img, tip: skillTip({ name: entry.name, img: entry.img, meta: "", text: this.#texts.get(uuid) ?? entry.tagline ?? "" }) };
  }

  /**
   * The gear of the summary: what goes on the body, slot by slot (the hands, the armor, the accessories, the bag), what
   * goes in the bag (with how many), and the gold left.
   */
  #summaryGear() {
    const layout = this.#layout();
    if (!layout) return null;
    const own = this.#have.equipped;
    const type = id => game.i18n.localize(`TYPES.Item.${id}`);
    const piece = (label, icon, entry) => ({ label, icon, name: entry?.name ?? "", img: entry?.img ?? "", tip: entry?.tip ?? "" });
    const slotEntry = slot => layout.units.find(u => u.slot === slot)?.entry ?? own.find(o => o.slot === slot)?.entry ?? null;
    const accessories = [...own.filter(o => o.slot === "accessory").map(o => o.entry), ...layout.units.filter(u => u.slot === "accessory").map(u => u.entry)];
    const worn = [
      piece(L("Hands.Main"), "fa-solid fa-hand-fist", slotEntry("main")),
      layout.locked ? { label: L("Hands.Off"), icon: "fa-solid fa-hand", name: tagLabel("Two-Handed"), note: true }
        : piece(L("Hands.Off"), "fa-solid fa-shield", slotEntry("off")),
      piece(type("armor"), "fa-solid fa-shirt", slotEntry("armor")),
      ...accessories.map(entry => piece(type("accessory"), "fa-solid fa-ring", entry)),
      piece(type("bag"), "fa-solid fa-sack", slotEntry("bag"))
    ].filter(p => p.name);
    return { worn, carried: this.#carriedRows(layout), gold: this.#gold().left, space: layout.space };
  }

  /* -------------------------------------------- */
  /*  Rendering                                   */
  /* -------------------------------------------- */

  /** @override A step opened anew starts at its top: only a step drawn again keeps where it was scrolled. */
  _syncPartState(partId, newElement, priorElement, state) {
    if ((partId === "step") && (priorElement?.className !== newElement?.className)) state.scrollPositions = [];
    super._syncPartState(partId, newElement, priorElement, state);
  }

  /** @override */
  async _onRender(context, options) {
    await super._onRender(context, options);
    const root = this.element;
    root.style.setProperty("--wz-color", this.#job()?.color ?? this.#race()?.color ?? "#1f5137");
    const parts = options.parts ?? Object.keys(this.constructor.PARTS);
    if (parts.includes("step")) {
      this.#activateStep(root.querySelector(".wz-step"));
      if (this.step === "summary") this.#activateSummary(root);
      // The reading box stays over the skills step drawn again (a pick changes what can be chosen)
      if (this.#reader) {
        if (this.step === "skills") this.#renderReader();
        else this.#closeReader({ focus: false });
      }
    }
  }

  /** @override */
  _onClose(options) {
    this.#closeReader({ focus: false });
    super._onClose(options);
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
    // Enter or space on a card chooses it (as a click); on a button, the button's own. Neither goes on to the core's
    // keys (the space would pause the game)
    step.addEventListener("keydown", event => {
      if (!["Enter", " "].includes(event.key)) return;
      if (event.target.closest?.("button, [data-action][tabindex]")) event.stopPropagation();
      const card = event.target.closest?.("[data-action][tabindex]");
      if (!card || (card !== event.target)) return;
      event.preventDefault();
      card.click();
    });
    if (this.step === "items") this.#activateShop(step);
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

  /** The shop's search box: the cards whose name (or numbers) don't match hide as you type. */
  #activateShop(step) {
    const input = step.querySelector(".wz-shop-search input");
    input?.addEventListener("input", () => {
      this.#shopQuery = input.value;
      this.#applyShopFilter(step);
    });
    this.#applyShopFilter(step);
  }

  /** Show the cards of the filter and of the name searched (and the line that says there are none). */
  #applyShopFilter(step) {
    if (!step) return;
    const query = fold(this.#shopQuery.trim());
    const filter = this.#shopFilter;
    let shown = 0;
    for (const card of step.querySelectorAll(".wz-ware")) {
      const { type, search, marked } = card.dataset;
      const on = (!filter || ((filter === "recommended") ? !!marked : (type === filter))) && (!query || (search ?? "").includes(query));
      card.hidden = !on;
      if (on) shown += 1;
    }
    for (const chip of step.querySelectorAll("[data-action='shopFilter']")) chip.classList.toggle("active", (chip.dataset.filter ?? "") === filter);
    const empty = step.querySelector(".wz-shop-empty");
    if (empty) empty.hidden = shown > 0;
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
  /*  The reading box                             */
  /* -------------------------------------------- */

  /**
   * The skills the reading box goes through, in the order the step shows them: the ones to pick (Combat, then General),
   * or, opened from what comes with the race, the class and the Magia, those.
   */
  #readerOrder({ granted = false } = {}) {
    const selector = granted ? ".wz-granted [data-action='read'][data-uuid]" : ".wz-skill[data-action='read'][data-uuid]";
    const nodes = this.element?.querySelectorAll(`.wz-step ${selector}`) ?? [];
    return [...new Set([...nodes].map(node => node.dataset.uuid))];
  }

  /** What the reading box shows of a skill (its document read and its text enriched once). */
  #reading(uuid) {
    if (!this.#readings.has(uuid)) {
      this.#readings.set(uuid, loadDocuments([uuid]).then(docs => skillReading(docs.get(uuid))).catch(err => {
        this.#readings.delete(uuid);
        throw err;
      }));
    }
    return this.#readings.get(uuid);
  }

  /**
   * The data of the reading box: the skill (a pick, or one the character gets anyway), where it comes from, its
   * fields and its whole text, whether it can be chosen now (and why not), the quota of its kind and where it is in
   * the step.
   */
  async #readerContext(uuid, order) {
    const reading = await this.#reading(uuid);
    const candidate = this.#candidates.find(c => c.uuid === uuid);
    const granted = candidate ? null : this.#granted().find(g => g.uuid === uuid);
    const view = candidate ?? this.#skillView(uuid) ?? this.#indexView(uuid) ?? {};
    const subtype = candidate?.subtype ?? reading.subtype;
    // The Magia says its category (a Magia is a passive skill of Combat, which says little)
    const magia = this.#magia();
    const kind = (magia?.uuid === uuid) ? magia.categoryLabel : (subtype ? L(`Skill.Type.${subtype}`) : "");
    const from = candidate ? this.#sourceLabel(candidate.source) : (granted ? L(`Wizard.Reader.From.${granted.by}`) : "");
    const picks = candidate ? this.#picksOf(subtype) : null;
    const index = order.indexOf(uuid);
    return {
      uuid,
      name: view.name || reading.name,
      img: view.img || reading.img,
      eyebrow: [kind, from].filter(Boolean).join(" · "),
      training: !!candidate?.training,
      tags: reading.tags,
      fields: reading.fields,
      html: reading.html || `<p class="wz-reader-empty">${L("Wizard.Reader.NoText")}</p>`,
      reason: (candidate && !candidate.picked) ? candidate.reason : "",
      pickable: !!candidate,
      picked: !!candidate?.picked,
      blocked: !!candidate && !candidate.picked && !!candidate.reason,
      granted: granted ? L("Wizard.Reader.Granted") : "",
      quota: picks && {
        label: L(`Skill.Type.${subtype}`),
        picked: picks.picked,
        quota: picks.quota,
        full: picks.picked >= picks.quota,
        pips: Array.from({ length: picks.max }, (_, i) => ({ on: i < picks.picked }))
      },
      position: L("Wizard.Reader.Position", { n: index + 1, total: order.length }),
      prev: index > 0,
      next: index < order.length - 1
    };
  }

  /**
   * Open the reading box on a skill of the step.
   * @param {string} uuid
   * @param {object} [options]
   * @param {boolean} [options.granted]  One of what comes with the race, the class and the Magia (not a pick)
   */
  #openReader(uuid, { granted = false } = {}) {
    if (!uuid || (this.step !== "skills")) return;
    if (!this.#reader) document.addEventListener("keydown", this.#onReaderKey, true);
    this.#reader = { uuid, granted };
    return this.#renderReader();
  }

  /**
   * Draw the reading box (again, when it moves to another skill or a pick changes what can be chosen). It goes in the
   * window's content, beside the parts, over the step's area: drawing the step again leaves it there.
   */
  async #renderReader() {
    const reader = this.#reader;
    if (!reader) return;
    const order = this.#readerOrder(reader);
    if (!order.includes(reader.uuid)) return this.#closeReader({ focus: false });
    const html = await foundry.applications.handlebars.renderTemplate(`${DIR}/reader.hbs`, await this.#readerContext(reader.uuid, order));
    const content = this.element?.querySelector(".window-content");
    // Closed or moved on while it was being read
    if ((this.#reader !== reader) || !content) return;
    let host = content.querySelector(":scope > .wz-reader");
    const fresh = !host;
    if (fresh) {
      host = document.createElement("div");
      host.className = "wz-reader";
      // Space and Enter on its buttons are theirs (not the core's keys: the pause)
      host.addEventListener("keydown", event => {
        if ([" ", "Enter"].includes(event.key)) event.stopPropagation();
      });
      content.append(host);
    }
    // The same skill drawn again keeps where its text was scrolled and the button in focus
    const same = host.dataset.uuid === reader.uuid;
    const scroll = same ? (host.querySelector(".wz-reader-text")?.scrollTop ?? 0) : 0;
    const focused = host.contains(document.activeElement) ? document.activeElement : null;
    const focusKey = focused?.dataset.action ? `[data-action="${focused.dataset.action}"]${focused.dataset.dir ? `[data-dir="${focused.dataset.dir}"]` : ""}` : "";
    host.dataset.uuid = reader.uuid;
    host.innerHTML = html;
    const box = host.querySelector(".wz-reader-box");
    host.querySelector(".wz-reader-text").scrollTop = scroll;
    const step = this.element.querySelector("[data-application-part='step']");
    if (step) step.inert = true;
    const again = focusKey && host.querySelector(`.wz-reader-box ${focusKey}:not(:disabled)`);
    (again || box).focus({ preventScroll: true });
    const motion = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (fresh && motion) {
      host.querySelector(".wz-reader-shade").animate?.([{ opacity: 0 }, { opacity: 1 }], { duration: 160, easing: "ease-out" });
      box.animate?.([{ opacity: 0, transform: "translateY(8px) scale(0.98)" }, { opacity: 1, transform: "none" }], { duration: 180, easing: "ease-out" });
    }
    else if (!same && motion) host.querySelector(".wz-reader-text").animate?.([{ opacity: 0.25 }, { opacity: 1 }], { duration: 140, easing: "ease-out" });
    // The skills before and after it, read ahead
    for (const near of [order[order.indexOf(reader.uuid) - 1], order[order.indexOf(reader.uuid) + 1]]) {
      if (near) this.#reading(near).catch(() => null);
    }
  }

  /** Show the skill before (−1) or after (+1) the one open. */
  #moveReader(dir) {
    const reader = this.#reader;
    if (!reader) return;
    const order = this.#readerOrder(reader);
    const uuid = order[order.indexOf(reader.uuid) + dir];
    if (!uuid) return;
    this.#reader = { uuid, granted: reader.granted };
    this.#renderReader();
  }

  /**
   * Close the reading box. With `focus`, the skill it showed last comes into view and takes the focus (after going
   * through the list, the step is where the reading stopped).
   */
  #closeReader({ focus = true } = {}) {
    const reader = this.#reader;
    if (!reader) return;
    this.#reader = null;
    document.removeEventListener("keydown", this.#onReaderKey, true);
    const root = this.element;
    if (!root) return;
    root.querySelector(".window-content > .wz-reader")?.remove();
    const step = root.querySelector("[data-application-part='step']");
    if (step) step.inert = false;
    if (!focus) return;
    const tile = root.querySelector(`.wz-step [data-action='read'][data-uuid="${CSS.escape(reader.uuid)}"]`);
    tile?.scrollIntoView({ block: "nearest" });
    tile?.focus({ preventScroll: true });
  }

  /**
   * The keys of the reading box: Escape closes it (and only it: the core's Escape would close every window), the arrows
   * go to the skill before and after. Not while another window's field has the focus.
   * @param {KeyboardEvent} event
   */
  #onReaderKey = event => {
    if (!this.#reader || !["Escape", "ArrowLeft", "ArrowRight"].includes(event.key)) return;
    const active = document.activeElement;
    if (active && (active !== document.body) && !this.element?.contains(active)) return;
    event.preventDefault();
    event.stopPropagation();
    if (event.key === "Escape") this.#closeReader();
    else this.#moveReader((event.key === "ArrowLeft") ? -1 : 1);
  };

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

  /** The bonus points suggested for the class. */
  static #onSuggestStats() {
    const suggestion = this.#suggestion();
    if (!suggestion) return;
    this.draft.bonus = { ...suggestion };
    this.#refresh();
  }

  /**
   * One more of a piece of the shop (the gold and the bag's space allowing). A weapon, an armor or a shield whose place
   * on the body something bought already takes goes on in its place (the other one goes to the bag).
   */
  static #onBuy(event, target) {
    const uuid = target.closest("[data-uuid]")?.dataset.uuid;
    const entry = this.#shop?.byUuid.get(uuid);
    if (!entry || !this.#canBuy(entry).ok) return;
    const slot = { weapon: "main", armor: "armor", shield: "off" }[entry.type];
    const worn = slot ? this.#layout().units.find(u => !u.free && (u.slot === slot) && (u.entry.type === entry.type)) : null;
    const index = worn ? this.draft.cart.indexOf(worn.entry.uuid) : -1;
    if (index >= 0) this.draft.cart.splice(index, 0, uuid);
    else this.draft.cart.push(uuid);
    this.#refresh();
  }

  /** One of a piece back to the shop (the last one bought). */
  static #onSell(event, target) {
    const uuid = target.dataset.uuid ?? target.closest("[data-uuid]")?.dataset.uuid;
    const index = this.draft.cart.lastIndexOf(uuid);
    if (index < 0) return;
    this.draft.cart.splice(index, 1);
    this.#refresh();
  }

  /** The kit recommended for the class instead of what the bag had (what fits in the gold, in its order). */
  static #onKit() {
    const rec = this.#recommendation();
    if (!rec?.entries.length) return;
    this.draft.cart = this.#kitCart(rec);
    this.#refresh();
  }

  /** Everything bought back to the shop. */
  static #onEmptyCart() {
    this.draft.cart = [];
    this.#refresh();
  }

  /** The shop's filter: everything, what is recommended, or one type (a card of the doll shows its kind). */
  static #onShopFilter(event, target) {
    const filter = target.dataset.filter ?? "";
    // The doll's card of the kind already shown shows everything again
    this.#shopFilter = (target.closest(".wz-doll-slot") && (filter === this.#shopFilter)) ? "" : filter;
    this.#applyShopFilter(this.element.querySelector(".wz-step"));
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

  /** Read a skill of the skills step whole (a tile or a chip of what comes). */
  static #onRead(event, target) {
    this.#openReader(target.closest("[data-uuid]")?.dataset.uuid, { granted: !!target.closest(".wz-granted") });
  }

  /** The skill before or after the one in the reading box. */
  static #onReaderMove(event, target) {
    this.#moveReader(Number(target.dataset.dir) || 1);
  }

  static #onReaderClose() {
    this.#closeReader();
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
    // The sheet opens (or comes back) on the character tab
    const sheet = this.actor.sheet;
    if (!sheet) return;
    sheet.tabGroups.primary = "character";
    await sheet.render({ force: true });
  }

  /**
   * Make the character: what an earlier creation gave leaves, then the actor (name, portrait, CR 1, bonus points,
   * the picks record, the gold left) and all the items at once (the starting gear equipped where the shop showed it),
   * and the HP and Fate full.
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
    const stale = actor.items.filter(i => OPTION_TYPES.includes(i.type) || i.getFlag(SYSTEM_ID, STARTING_FLAG)
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

    // The starting gear: the free items and what was bought, equipped where the shop showed them (the first weapon
    // in the main hand), each marked so that making the character again takes it back
    const layout = this.#layout();
    const gold = this.#gold();
    const gearDocs = await loadDocuments(layout.units.map(u => u.entry.uuid));
    for (const unit of layout.units) {
      const piece = gearDocs.get(unit.entry.uuid);
      if (!piece) continue;
      const data = piece.toObject();
      delete data._id;
      delete data.folder;
      delete data.sort;
      delete data.ownership;
      foundry.utils.setProperty(data, "_stats.compendiumSource", piece.uuid);
      foundry.utils.setProperty(data, `flags.${SYSTEM_ID}.${STARTING_FLAG}`, unit.free ? "free" : "bought");
      data.system.equipped = unit.slot !== "carried";
      if (data.type === "weapon") data.system.main = unit.slot === "main";
      items.push(data);
    }

    // The actor
    const name = d.name.trim() || actor.name;
    const update = {
      name,
      img: d.img,
      "system.infos.crank": 1,
      "system.inventory.gold": Math.max(0, gold.left),
      [`flags.${SYSTEM_ID}.${PROGRESS_FLAG}`]: { base: 1, creation: true },
      [`flags.${SYSTEM_ID}.${STARTING_GEAR_FLAG}`]: { spent: gold.spent },
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
    // The gear in the hands and the armor
    const layout = this.#layout();
    const worn = [layout?.main, layout?.locked ? null : layout?.off, layout?.armor].filter(Boolean);
    const content = await foundry.applications.handlebars.renderTemplate(`${DIR}/chat-card.hbs`, {
      name: this.actor.name,
      img: this.actor.img,
      color: job?.color ?? "#1f5137",
      lines: [
        race && { label: L("Wizard.Step.race"), value: race.name, img: race.img },
        job && { label: L("Wizard.Step.class"), value: element ? `${job.name} (${element.name})` : job.name, img: job.img },
        magia && { label: L("Wizard.Rail.Magia"), value: magia.name, img: magia.img },
        profession && { label: L("Wizard.Step.profession"), value: profession.name, img: profession.img },
        worn.length && { label: L("Wizard.Chat.Gear"), value: worn.map(e => e.name).join(", "), img: worn[0].img }
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
