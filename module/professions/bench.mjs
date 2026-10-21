/**
 * The bench of a profession: the window behind the buttons of the profession tab. One per character, with a mode for
 * each thing the profession does: the Workshop and the Fusion (crafters), Gathering (Gatherer), Retouch and sales
 * (Merchant), and the talents used as an action (Sharpen, Mend, Banquet, Copy). A mode starts on a "choose" step;
 * the rolls show a "reveal" (the dice falling, then the quality), crafting goes on to the "enhance" step, and every
 * action ends on a "done" card.
 */
import { L, SYSTEM_ID } from "../settings.mjs";
import { toInt } from "../helpers/utils.mjs";
import { tagLabel, term } from "../i18n/terms.mjs";
import {
  ENHANCEMENT_INDEX, GRADE_QUALITY, ITEMS_PACK, QUALITY_COLORS, batchOf, craftChances, gatherOutcome, isPlainItem,
  kindOf, materialLevel, multiplierOf
} from "./data.mjs";
import {
  buildCrafted, copiableSkills, craftOf, defaultName, enhancementText, enhancementsFor, unavailableReason
} from "./forge.mjs";
import { materialsOf, professionOf, rankTitle } from "./state.mjs";
import {
  banquet, banquetPairs, canCutFor, copy, craftAttempt, craftProblem, discardPending, finishCraft, fuse, fusionPairs,
  gather, gatherCap, mend, partyOf, pendingOf, retouch, retouchCost, sell, sellable, sharpen, sharpenValue
} from "./actions.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;
const DIR = `systems/${SYSTEM_ID}/templates/professions`;
/** Templates of the bench and its chat card (loaded at init). */
export const PROFESSION_TEMPLATES = ["bench", "bench-choose", "bench-enhance", "bench-reveal", "bench-done", "chat-card"]
  .map(name => `${DIR}/${name}.hbs`);

const MODE_ICONS = {
  craft: "fa-solid fa-hammer", fusion: "fa-solid fa-object-group", gather: "fa-solid fa-person-digging",
  retouch: "fa-solid fa-wand-magic-sparkles", sell: "fa-solid fa-coins", sharpen: "fa-solid fa-sword",
  mend: "fa-solid fa-shirt", banquet: "fa-solid fa-bowl-food", copy: "fa-solid fa-scroll"
};
const DICE_ICONS = ["", "one", "two", "three", "four", "five", "six"].map(n => `fa-solid fa-dice-${n}`);

/** The modes of a profession, in the order of their tabs. */
export function modesOf(p) {
  const modes = [];
  if (p.def.kinds.length) modes.push("craft", "fusion");
  if (p.id === "gatherer") modes.push("gather");
  if (p.id === "merchant") modes.push("retouch", "sell");
  if (["sharpen", "mend", "banquet", "copy"].includes(p.def.talent)) modes.push(p.def.talent);
  return modes;
}

const qualityView = (id, grade) => ({
  id, color: QUALITY_COLORS[id], grade,
  label: L(`Profession.Quality.${id}`) + (grade ? ` [M${grade}]` : "")
});

/** The numbers of an item shown in the bench (before / after a crafting). */
function statsOf(data) {
  const s = data?.system ?? {};
  const n = (label, value) => ({ label: L(label), value: toInt(value) });
  switch (data?.type) {
    case "weapon": return [n("Profession.Stat.attack", s.attack), n("Profession.Stat.magic", s.magic), n("Profession.Stat.accuracy", s.accuracy), n("Profession.Stat.initiative", s.initiative)];
    case "armor": return [n("Profession.Stat.pdef", s.pdef), n("Profession.Stat.mdef", s.mdef), n("Profession.Stat.initiative", s.initiative)];
    case "shield": return [n("Profession.Stat.pdef", s.pdef), n("Profession.Stat.mdef", s.mdef)];
    case "accessory": return [n("Profession.Stat.pdef", s.pdef), n("Profession.Stat.mdef", s.mdef), n("Profession.Stat.magic", s.magic), n("Profession.Stat.initiative", s.initiative)];
    case "bag": return [n("Profession.Stat.space", s.bagSpace)];
    default: {
      const flags = data?.flags?.[SYSTEM_ID] ?? {};
      const damage = s.damage ?? {};
      const out = [
        { label: L("Profession.Stat.timing"), value: term("timing", s.timing || "-") },
        { label: L("Profession.Stat.target"), value: term("target", s.target || "-") }
      ];
      const dice = toInt(damage.dice), mod = damage.mod;
      if (flags.heal || (damage.recovery && (dice || toInt(mod)))) out.push({ label: L("Profession.Stat.heal"), value: flags.heal ? toInt(flags.heal.mod) : `${dice ? `${dice}D+` : ""}${mod}` });
      else if (dice || toInt(mod)) out.push({ label: L("Profession.Stat.damage"), value: `${dice ? `${dice}D+` : ""}${mod}` });
      if (toInt(flags.fatigue)) out.push({ label: L("Profession.Stat.fatigue"), value: `−${toInt(flags.fatigue)}` });
      return out;
    }
  }
}

/** Before → after of the numbers, marking what changed. */
function compare(before, after) {
  return before.map((stat, i) => {
    const next = after[i]?.value ?? stat.value;
    const changed = String(next) !== String(stat.value);
    const diff = (typeof next === "number") && (typeof stat.value === "number") ? next - stat.value : null;
    return { ...stat, after: next, changed, up: diff > 0, down: diff < 0 };
  }).filter(s => s.changed || (s.value !== 0));
}

export class ProfessionBench extends HandlebarsApplicationMixin(ApplicationV2) {

  static DEFAULT_OPTIONS = {
    classes: ["lhwin", "themed", "theme-light", "lhp-bench"],
    tag: "div",
    window: { icon: "fa-solid fa-hammer", resizable: true },
    position: { width: 860, height: 660 },
    actions: {
      mode: ProfessionBench.#onMode,
      source: ProfessionBench.#onSource,
      filter: ProfessionBench.#onFilter,
      select: ProfessionBench.#onSelect,
      roll: ProfessionBench.#onRoll,
      continue: ProfessionBench.#onContinue,
      pick: ProfessionBench.#onPick,
      unpick: ProfessionBench.#onUnpick,
      cut: ProfessionBench.#onCut,
      master: ProfessionBench.#onMaster,
      keep: ProfessionBench.#onKeep,
      out: ProfessionBench.#onOut,
      finish: ProfessionBench.#onFinish,
      confirm: ProfessionBench.#onConfirm,
      toggle: ProfessionBench.#onToggle,
      again: ProfessionBench.#onAgain,
      discard: ProfessionBench.#onDiscard,
      view: ProfessionBench.#onView
    }
  };

  static PARTS = {
    main: { template: `${DIR}/bench.hbs`, scrollable: [".lhp-list", ".lhp-enh-grid", ".lhp-side-scroll"] }
  };

  /**
   * Open the bench of a character in a mode (the window is reused).
   * @param {Actor} actor
   * @param {string} [mode]
   */
  static open(actor, mode) {
    const id = `lhp-bench-${actor.uuid.replaceAll(".", "-")}`;
    const app = foundry.applications.instances.get(id) ?? new ProfessionBench(actor, { id });
    app.setMode(mode);
    return app.render({ force: true });
  }

  /** @param {Actor} actor */
  constructor(actor, options = {}) {
    super(options);
    this.actor = actor;
    this.#reset();
  }

  /** Catalog of base items of the profession (compendium and world), loaded once. */
  #catalog = null;
  /** Documents of the catalog already fetched, by uuid. */
  #docs = new Map();
  #busy = false;
  #hooks = [];
  #renderSoon = foundry.utils.debounce(() => {
    if (this.rendered && (this.step === "choose")) this.render();
  }, 150);

  #reset() {
    this.step = "choose";
    this.source = "inventory";
    this.filter = "all";
    this.search = "";
    this.selected = null;
    this.reveal = null;
    this.picks = [];
    this.name = "";
    this.nameEdited = false;
    this.masterpiece = null;
    this.pairKey = null;
    this.keep = null;
    this.itemId = null;
    this.out = null;
    this.level = null;
    this.targets = new Set();
    this.done = null;
  }

  /** Switch to a mode of the profession (the first one by default; the Workshop with a work waiting). */
  setMode(mode) {
    const p = professionOf(this.actor);
    const modes = p ? modesOf(p) : [];
    const next = modes.includes(mode) ? mode : (modes.includes(this.mode) ? this.mode : modes[0]);
    if (next !== this.mode) this.#reset();
    this.mode = next;
    if ((next === "craft") && pendingOf(this.actor) && (this.step === "choose")) this.step = "enhance";
  }

  /** @override */
  get title() {
    const p = professionOf(this.actor);
    return p ? `${p.name} · ${this.actor.name}` : L("Profession.Bench.Title");
  }

  /* -------------------------------------------- */
  /*  Data                                        */
  /* -------------------------------------------- */

  /** @override */
  async _prepareContext(options) {
    const actor = this.actor;
    const p = professionOf(actor);
    if (!p) return { none: true };
    if (!modesOf(p).includes(this.mode)) this.setMode();
    const pending = pendingOf(actor);
    if ((this.mode === "craft") && pending && (this.step === "choose")) this.step = "enhance";

    const context = {
      actor, p, color: p.def.color, img: p.def.img, name: p.name, rank: p.rank, rankTitle: rankTitle(p.rank),
      mode: this.mode, step: this.step, editable: actor.isOwner, gold: toInt(actor.system.inventory?.gold),
      modes: modesOf(p).map(id => ({ id, icon: MODE_ICONS[id], label: L(`Profession.Mode.${id}`), active: id === this.mode })),
      attempts: { ...p.attempts, pips: Array.from({ length: p.attempts.max }, (_, i) => ({ used: i >= p.attempts.left })) },
      hint: L(`Profession.Bench.Hint.${this.mode}`)
    };
    if (this.step === "reveal") context.reveal = this.#revealContext();
    else if (this.step === "done") context.done = this.done;
    else if (this.step === "enhance") Object.assign(context, await this.#enhanceContext(p, pending));
    else Object.assign(context, await this.#chooseContext(p));
    context.isEnhance = this.step === "enhance";
    context.isChoose = this.step === "choose";
    return context;
  }

  /** The dice and the quality of the last roll. */
  #revealContext() {
    const r = this.reveal;
    return {
      ...r,
      faces: r.dice.map((d, i) => ({ icon: DICE_ICONS[d], delay: i * 90 })),
      quality: qualityView(r.quality, r.grade),
      button: L(r.success ? "Profession.Bench.ChooseEnhancements" : "Profession.Bench.Continue")
    };
  }

  /** The catalog of base items: the system compendium and the world's items the profession makes. */
  async #loadCatalog(p) {
    if (this.#catalog?.profession === p.id) return this.#catalog.list;
    const list = [];
    const add = (entry, uuid) => {
      const kind = kindOf(entry);
      if (!p.def.kinds.includes(kind) || !isPlainItem(entry)) return;
      list.push({ uuid, name: entry.name, img: entry.img, kind, level: Math.max(1, toInt(entry.system?.rank)), price: toInt(entry.system?.price) });
    };
    const pack = game.packs.get(ITEMS_PACK);
    if (pack) {
      const index = await pack.getIndex({ fields: ["system.rank", "system.price", "system.tags"] });
      for (const entry of index) add(entry, entry.uuid);
    }
    for (const item of game.items) add(item, item.uuid);
    list.sort((a, b) => (a.level - b.level) || a.name.localeCompare(b.name, game.i18n.lang));
    this.#catalog = { profession: p.id, list };
    return list;
  }

  /** A document of the catalog (or of the inventory). */
  async #doc(uuid) {
    if (!uuid) return null;
    if (!this.#docs.has(uuid)) this.#docs.set(uuid, await fromUuid(uuid).catch(() => null));
    return this.#docs.get(uuid);
  }

  /** What the "choose" step of the mode shows. */
  async #chooseContext(p) {
    const actor = this.actor;
    const search = this.search.trim().toLowerCase();
    const matches = name => !search || name.toLowerCase().includes(search);
    const card = (o) => ({ ...o, selected: o.key === this.#selectedKey() });

    switch (this.mode) {
      case "craft": {
        const inventory = actor.items.filter(i => p.def.kinds.includes(kindOf(i)) && isPlainItem(i)).map(i => ({
          uuid: i.uuid, name: i.name, img: i.img, kind: kindOf(i), level: Math.max(1, toInt(i.system.rank)), price: toInt(i.system.price)
        }));
        const catalog = (this.source === "catalog") ? await this.#loadCatalog(p) : [];
        const list = (this.source === "catalog") ? catalog : inventory;
        const { levels } = materialsOf(actor);
        const items = list.filter(e => ((this.filter === "all") || (e.kind === this.filter)) && matches(e.name)).map(e => card({
          key: e.uuid, uuid: e.uuid, name: e.name, img: e.img, level: e.level,
          meta: (this.source === "catalog") ? L("Profession.Bench.Price", { n: e.price }) : L(`Profession.Kind.${e.kind}`),
          locked: e.level > p.cap, lockHint: L("Profession.Error.Cap", { n: p.cap, rank: Math.ceil(e.level / 6) }),
          material: materialLevel(e.level), hasMaterial: !!levels.get(materialLevel(e.level))?.length
        }));
        const side = await this.#craftSide(p);
        return {
          list: { items, empty: L(this.source === "catalog" ? "Profession.Bench.EmptyCatalog" : "Profession.Bench.EmptyInventory"), search: this.search, searchable: true },
          sources: ["inventory", "catalog"].map(id => ({ id, label: L(`Profession.Bench.Source.${id}`), active: id === this.source, count: (id === "inventory") ? inventory.length : null })),
          filters: (p.def.kinds.length > 1) ? [{ id: "all", label: L("Profession.Bench.All"), active: this.filter === "all" },
            ...p.def.kinds.map(k => ({ id: k, label: L(`Profession.Kind.${k}`), active: this.filter === k }))] : null,
          side
        };
      }
      case "fusion": {
        const shards = materialsOf(actor).shards.length;
        const items = fusionPairs(actor).filter(pair => matches(pair.items[0].name)).map(pair => card({
          key: pair.key, name: pair.items[0].name, img: pair.items[0].img,
          meta: `${L(`Profession.Quality.${GRADE_QUALITY[pair.grade]}`)} → ${L(`Profession.Quality.${GRADE_QUALITY[pair.next]}`)}`,
          quality: QUALITY_COLORS[GRADE_QUALITY[pair.next]], count: pair.items.length,
          locked: !!pair.legendary && !shards, lockHint: L("Profession.Error.NoShard")
        }));
        return { list: { items, empty: L("Profession.Bench.EmptyFusion"), search: this.search, searchable: true }, side: this.#fusionSide(shards) };
      }
      case "retouch": {
        const items = actor.items.filter(i => craftOf(i) && matches(i.name)).map(i => {
          const craft = craftOf(i);
          return card({
            key: i.id, name: i.name, img: i.img, quality: QUALITY_COLORS[GRADE_QUALITY[craft.grade]],
            meta: L("Profession.Bench.Price", { n: retouchCost(craft) })
          });
        });
        return { list: { items, empty: L("Profession.Bench.EmptyRetouch"), search: this.search, searchable: true }, side: this.#simpleSide("retouch") };
      }
      case "sell": {
        const items = sellable(actor).filter(i => matches(i.name)).map(i => {
          const craft = craftOf(i);
          return card({
            key: i.id, name: i.name, img: i.img, meta: L("Profession.Bench.Price", { n: toInt(i.system.price) }),
            quality: craft ? QUALITY_COLORS[GRADE_QUALITY[craft.grade]] : null
          });
        });
        const item = actor.items.get(this.itemId);
        return {
          list: { items, empty: L("Profession.Bench.EmptySell"), search: this.search, searchable: true },
          side: this.#simpleSide("sell", item ? {
            img: item.img, name: item.name, lines: [L("Profession.Bench.SellFor", { n: toInt(item.system.price) })],
            confirm: L("Profession.Bench.Confirm.sell", { n: toInt(item.system.price) })
          } : null)
        };
      }
      case "gather": {
        const cap = gatherCap(p);
        const { levels, shards } = materialsOf(actor);
        const items = Array.from({ length: cap }, (_, i) => i + 1).map(n => card({
          key: String(n), name: L("Profession.Bench.MaterialName", { n }), img: "icons/commodities/treasure/puzzle-box-glowing-blue.webp",
          level: n, meta: L("Profession.Bench.Owned", { n: levels.get(n)?.length ?? 0 })
        }));
        const chances = { none: 0, one: 0, two: 0, shard: 0 };
        for (let a = 1; a <= 6; a++) for (let b = 1; b <= 6; b++) {
          const o = gatherOutcome([a, b], p.rank);
          chances[o.id]++;
          if (o.shard) chances.shard++;
        }
        return {
          list: { items, grid: "levels" },
          side: {
            gather: true, level: this.level, shards: shards.length,
            chances: Object.entries(chances).map(([id, n]) => ({ id, label: L(`Profession.Gather.Chance.${id}`), pct: Math.round((n / 36) * 100) })),
            can: !!this.level && p.attempts.left > 0,
            why: !p.attempts.left ? L("Profession.Error.NoAttempts") : (!this.level ? L("Profession.Bench.PickLevel") : "")
          }
        };
      }
      case "sharpen": {
        const groups = partyOf(actor).map(owner => ({
          name: owner.name, img: owner.img,
          items: owner.items.filter(i => i.type === "weapon" && matches(i.name)).map(i => card({
            key: i.uuid, name: i.name, img: i.img, level: Math.max(1, toInt(i.system.rank)),
            meta: i.system.equipped ? L("Profession.Bench.Equipped") : "",
            locked: i.effects.some(e => e.getFlag(SYSTEM_ID, "sharpen")), lockHint: L("Profession.Error.Sharpened")
          }))
        })).filter(g => g.items.length);
        const weapon = await this.#doc(this.itemId);
        return {
          list: { groups, empty: L("Profession.Bench.EmptySharpen"), search: this.search, searchable: true },
          side: this.#simpleSide("sharpen", weapon ? {
            img: weapon.img, name: weapon.name, lines: [L("Profession.Talent.sharpen.effect", { n: sharpenValue(weapon), name: actor.name })],
            confirm: L("Profession.Bench.Confirm.sharpen", { n: sharpenValue(weapon) }), attempt: true
          } : null)
        };
      }
      case "mend": {
        const items = partyOf(actor).map(a => card({
          key: a.id, name: a.name, img: a.img, meta: L("Profession.Bench.Fatigue", { n: toInt(a.system.infos?.fatigue) }),
          checked: this.targets.has(a.id)
        }));
        items.forEach(i => i.selected = i.checked);
        const value = p.rank * 3;
        return {
          list: { items, multi: true },
          side: this.#simpleSide("mend", {
            icon: "fa-solid fa-shirt", name: L("Profession.Talent.mend.name"),
            lines: [L("Profession.Bench.MendLine", { n: value, count: this.targets.size })],
            confirm: L("Profession.Bench.Confirm.mend", { n: value }), attempt: true, ready: this.targets.size > 0
          })
        };
      }
      case "banquet": {
        const items = banquetPairs(actor).filter(list => matches(list[0].name)).map(list => card({
          key: list[0].name, name: list[0].name, img: list[0].img, count: list.length, meta: L("Profession.Bench.Pair")
        }));
        const pair = banquetPairs(actor).find(list => list[0].name === this.itemId);
        return {
          list: { items, empty: L("Profession.Bench.EmptyBanquet"), search: this.search, searchable: true },
          side: this.#simpleSide("banquet", pair ? {
            img: pair[0].img, name: L("Profession.Banquet.Name", { name: pair[0].name }),
            lines: [L("Profession.Bench.BanquetLine")], confirm: L("Profession.Bench.Confirm.banquet")
          } : null)
        };
      }
      case "copy": {
        const items = copiableSkills(actor).filter(s => matches(s.name)).map(s => card({
          key: s.id, name: s.name, img: s.img, meta: term("timing", s.system.timing || "-")
        }));
        const skill = actor.items.get(this.itemId);
        return {
          list: { items, empty: L("Profession.Bench.EmptyCopy"), search: this.search, searchable: true },
          side: this.#simpleSide("copy", skill ? {
            img: "icons/sundries/scrolls/scroll-bound-gold-tan.webp", name: L("Profession.Copy.Name", { name: skill.name }),
            lines: [L("Profession.Bench.CopyLine", { sr: toInt(skill.system.skillRank?.value) || 1 })],
            confirm: L("Profession.Bench.Confirm.copy"), attempt: true
          } : null)
        };
      }
    }
    return {};
  }

  /** The key of the selected card of the mode. */
  #selectedKey() {
    switch (this.mode) {
      case "craft": return this.selected?.uuid ?? null;
      case "fusion": return this.pairKey;
      case "gather": return this.level ? String(this.level) : null;
      default: return this.itemId;
    }
  }

  /** The Workshop's side panel: the base chosen, its material, the price, the chances and the roll button. */
  async #craftSide(p) {
    const chances = craftChances(p.rank).map(c => ({
      ...c, label: L(`Profession.Quality.${c.id}`), color: QUALITY_COLORS[c.id], pct: Math.round(c.pct), width: c.pct.toFixed(2)
    }));
    const doc = this.selected ? await this.#doc(this.selected.uuid) : null;
    if (!doc) return { craft: true, chances, empty: true };
    const level = Math.max(1, toInt(doc.system.rank));
    const material = materialLevel(level);
    const have = materialsOf(this.actor).levels.get(material)?.length ?? 0;
    const problem = craftProblem(this.actor, doc, this.selected.from);
    const copies = ["potion", "toxin"].includes(kindOf(doc)) ? batchOf(p.rank) : 1;
    return {
      craft: true, chances, img: doc.img, name: doc.name, level, kind: L(`Profession.Kind.${kindOf(doc)}`),
      stats: statsOf(doc).filter(s => s.value !== 0),
      material, have, materialName: L("Profession.Bench.MaterialName", { n: material }),
      price: (this.selected.from === "catalog") ? toInt(doc.system.price) : 0,
      fromInventory: this.selected.from === "inventory",
      copies: copies > 1 ? copies : 0,
      can: !problem, why: problem ? L(problem.key, problem.data) : "",
      list: enhancementsFor(doc).list.map(def => ({ icon: def.icon, ...enhancementText(def, doc.toObject(), {}) }))
    };
  }

  /** The Fusion's side panel: the rules and the Star Shards. */
  #fusionSide(shards) {
    return { fusion: true, shards, lines: [L("Profession.Bench.FusionRule"), L("Profession.Bench.FusionLegendary")] };
  }

  /** A side panel with the chosen thing and its button. */
  #simpleSide(mode, data = null) {
    return { simple: true, mode, ...(data ?? { empty: true, prompt: L(`Profession.Bench.Prompt.${mode}`) }) };
  }

  /**
   * The "enhance" step: the work's quality and sockets, the enhancement cards, the name and the before/after.
   * Crafting (the work waiting), Fusion (the pair chosen) and Retouch (the item chosen).
   */
  async #enhanceContext(p, pending) {
    let base, grade, slots, kept = [], canCut = false, legendary = null, title, keepChoice = null, cost = null, roll = null;
    // A Fusion or Retouch of an item with a name of its own keeps it, and its Masterpiece.
    let ownName = null;
    let masterpiece = (this.mode === "craft") ? this.masterpiece : null;
    if (this.mode === "craft") {
      if (!pending) {
        this.step = "choose";
        return this.#chooseContext(p);
      }
      base = pending.base;
      grade = pending.grade;
      slots = pending.slots;
      canCut = canCutFor(pending.profession, base);
      title = L("Profession.Bench.CraftTitle", { item: base.name });
      roll = { faces: pending.dice.map(d => DICE_ICONS[d]), total: pending.total, rank: pending.rank };
    }
    else if (this.mode === "fusion") {
      const pair = fusionPairs(this.actor).find(pr => pr.key === this.pairKey);
      if (!pair) {
        this.step = "choose";
        return this.#chooseContext(p);
      }
      const keepItem = pair.items.find(i => i.id === this.keep) ?? pair.items[0];
      this.keep = keepItem.id;
      const craft = craftOf(keepItem);
      base = craft.base;
      grade = pair.next;
      kept = craft.enhancements;
      legendary = pair.legendary;
      slots = legendary ? 0 : 1;
      canCut = canCutFor(p.id, base);
      title = L("Profession.Bench.FusionTitle", { item: keepItem.name });
      if (keepItem.name !== defaultName(craft.base, craft.enhancements)) ownName = keepItem.name;
      masterpiece = craft.masterpiece ?? null;
      const sets = pair.items.slice(0, 2);
      if (JSON.stringify(craftOf(sets[0]).enhancements) !== JSON.stringify(craftOf(sets[1]).enhancements)) {
        keepChoice = sets.map(item => ({
          id: item.id, name: item.name, img: item.img, active: item.id === this.keep,
          enhancements: craftOf(item).enhancements.map(e => enhancementText(ENHANCEMENT_INDEX.get(e.id), base, e).name).join(", ")
        }));
      }
    }
    else if (this.mode === "retouch") {
      const item = this.actor.items.get(this.itemId);
      const craft = craftOf(item);
      if (!craft) {
        this.step = "choose";
        return this.#chooseContext(p);
      }
      base = craft.base;
      grade = craft.grade;
      kept = craft.enhancements;
      slots = 1;
      canCut = !!kept[this.out]?.cut;
      title = L("Profession.Bench.RetouchTitle", { item: item.name });
      if (item.name !== defaultName(craft.base, craft.enhancements)) ownName = item.name;
      masterpiece = craft.masterpiece ?? null;
      cost = retouchCost(craft);
    }

    const { list } = enhancementsFor(base);
    const quality = qualityView(GRADE_QUALITY[grade], grade);
    const retouching = this.mode === "retouch";
    const keptView = kept.map((e, index) => {
      const def = ENHANCEMENT_INDEX.get(e.id);
      const text = enhancementText(def, base, e);
      return { index, icon: def.icon, ...text, cut: !!e.cut, legendary: !!def.legendary, kept: true, out: retouching && (index === this.out), outable: retouching && !def.legendary };
    });
    // The enhancements that stay (a Retouch takes one out) and the new ones.
    const staying = retouching ? kept.filter((_, i) => i !== this.out) : kept;
    const picks = this.picks.slice(0, slots);
    const sockets = [
      ...keptView.filter(k => !k.out),
      ...picks.map((pick, index) => {
        const def = ENHANCEMENT_INDEX.get(pick.id);
        return { index, icon: def.icon, ...enhancementText(def, base, pick), cut: !!pick.cut, picked: true };
      }),
      ...(legendary ? [{ icon: legendary.icon, ...enhancementText(legendary, base, {}), legendary: true, fixed: true }] : []),
      ...Array.from({ length: Math.max(0, slots - picks.length) }, () => ({ empty: true }))
    ];

    const options = list.map(def => {
      const reason = unavailableReason(def, base);
      // On the item already (a Retouch: also the one that leaves, which would change nothing).
      const takenBefore = staying.some(e => e.id === def.id) || (retouching && (kept[this.out]?.id === def.id));
      const picked = picks.filter(e => e.id === def.id);
      const pick = picked[0];
      const text = enhancementText(def, base, pick ?? {});
      return {
        id: def.id, icon: def.icon, ...text,
        selected: picked.length > 0, count: def.repeat ? picked.length : 0, repeat: !!def.repeat,
        disabled: !!reason || (takenBefore && !def.repeat) || (retouching && (this.out === null)),
        why: reason ? L(reason) : (takenBefore && !def.repeat) ? L("Profession.Error.Twice") : (retouching && (this.out === null)) ? L("Profession.Bench.PickOut") : "",
        tags: def.tags?.map(t => ({ value: t, label: tagLabel(t), selected: (pick?.tag ?? def.tags[0]) === t })) ?? null,
        cuttable: canCut && !def.uncut && picked.length > 0 && (this.mode !== "retouch"), cut: !!pick?.cut,
        multiplier: multiplierOf(base.system?.rank)
      };
    });

    // The finished item, for the before/after.
    const enhancements = retouching
      ? kept.map((e, i) => (i === this.out) ? (picks[0] ?? null) : e).filter(Boolean)
      : [...kept, ...picks, ...(legendary ? [{ id: legendary.id }] : [])];
    const preview = buildCrafted(base, { grade, enhancements, name: "", masterpiece });
    const placeholder = ownName ?? defaultName(base, enhancements);
    const effects = enhancements.map(e => {
      const def = ENHANCEMENT_INDEX.get(e.id);
      return def ? { icon: def.icon, ...enhancementText(def, base, e), legendary: !!def.legendary, cut: !!e.cut } : null;
    }).filter(Boolean);
    if (masterpiece) effects.push({ icon: "fa-solid fa-star", name: L("Profession.Masterpiece.Name"), text: L(`Profession.Masterpiece.${masterpiece}`), legendary: true });

    const ready = (picks.length === slots) && !(retouching && (this.out === null))
      && !((this.mode === "craft") && (pending.profession === "bard") && pending.doubleSix && !this.masterpiece);
    const copies = (this.mode === "craft") ? toInt(pending.copies || 1) + (picks.some(e => e.id === "double") ? 1 : 0) : 1;
    return {
      enhance: {
        title, quality, roll, slots, sockets, options, keepChoice, legendary: !!legendary, cost,
        shards: legendary ? materialsOf(this.actor).shards.length : null,
        retouching, keptView: retouching ? keptView : null, pickOut: retouching && (this.out === null),
        name: this.nameEdited ? this.name : "", placeholder,
        stats: compare(statsOf(base), statsOf(preview)), effects, copies: copies > 1 ? copies : 0,
        masterpiece: ((this.mode === "craft") && (pending.profession === "bard") && pending.doubleSix)
          ? ["mass", "instant"].map(id => ({ id, label: L(`Profession.Masterpiece.${id}`), hint: L(`Profession.Masterpiece.${id}Hint`), active: this.masterpiece === id }))
          : null,
        ready, canDiscard: (this.mode === "craft") && game.user.isGM,
        finish: L(`Profession.Bench.Finish.${this.mode}`, { n: cost ?? 0 }),
        lede: L(`Profession.Bench.Lede.${this.mode}`, { n: slots })
      }
    };
  }

  /* -------------------------------------------- */
  /*  Rendering                                   */
  /* -------------------------------------------- */

  /** @override */
  async _onFirstRender(context, options) {
    await super._onFirstRender(context, options);
    const mine = doc => (doc === this.actor) || (doc?.parent === this.actor);
    for (const hook of ["createItem", "deleteItem", "updateItem", "updateActor"]) {
      this.#hooks.push([hook, Hooks.on(hook, doc => mine(doc) && this.#renderSoon())]);
    }
  }

  /** @override */
  _onClose(options) {
    super._onClose(options);
    for (const [hook, id] of this.#hooks) Hooks.off(hook, id);
    this.#hooks = [];
  }

  /** @override */
  async _onRender(context, options) {
    await super._onRender(context, options);
    const root = this.element;
    // Search: filters as you type, keeping the caret.
    const search = root.querySelector("input.lhp-search");
    search?.addEventListener("input", foundry.utils.debounce(() => {
      this.search = search.value;
      this.render().then(() => {
        const field = this.element.querySelector("input.lhp-search");
        field?.focus();
        field?.setSelectionRange(field.value.length, field.value.length);
      });
    }, 200));
    // The tag of an enhancement (Elemental, Resistant).
    for (const select of root.querySelectorAll("select[data-enh-tag]")) {
      select.addEventListener("change", () => {
        const pick = this.picks.find(e => e.id === select.dataset.enhTag);
        if (pick) pick.tag = select.value;
        else this.#pick(select.dataset.enhTag, select.value);
        this.render();
      });
      select.addEventListener("click", event => event.stopPropagation());
    }
    // The name of the work.
    const name = root.querySelector("input.lhp-name");
    name?.addEventListener("input", () => {
      this.name = name.value;
      this.nameEdited = !!name.value.trim();
    });
  }

  /* -------------------------------------------- */
  /*  Actions                                     */
  /* -------------------------------------------- */

  static #onMode(event, target) {
    this.setMode(target.dataset.mode);
    this.render();
  }

  static #onSource(event, target) {
    this.source = target.dataset.source;
    this.selected = null;
    this.render();
  }

  static #onFilter(event, target) {
    this.filter = target.dataset.filter;
    this.render();
  }

  static #onSelect(event, target) {
    const key = target.closest("[data-key]")?.dataset.key;
    if (!key || target.closest(".locked")) return;
    switch (this.mode) {
      case "craft": this.selected = { uuid: key, from: this.source }; break;
      case "fusion":
        this.pairKey = key;
        this.keep = null;
        this.picks = [];
        this.nameEdited = false;
        this.step = "enhance";
        break;
      case "retouch":
        this.itemId = key;
        this.out = null;
        this.picks = [];
        this.step = "enhance";
        break;
      case "gather": this.level = toInt(key); break;
      case "mend": return ProfessionBench.#onToggle.call(this, event, target);
      default: this.itemId = key;
    }
    this.render();
  }

  /** Mend: a character in or out (three at most). */
  static #onToggle(event, target) {
    const key = target.closest("[data-key]")?.dataset.key;
    if (!key) return;
    if (this.targets.has(key)) this.targets.delete(key);
    else if (this.targets.size < 3) this.targets.add(key);
    else ui.notifications.info(L("Profession.Bench.MendMax"));
    this.render();
  }

  /** The Workshop or the Gathering: roll, then show the dice. */
  static async #onRoll() {
    if (this.#busy) return;
    this.#busy = true;
    try {
      const p = professionOf(this.actor);
      if (this.mode === "gather") {
        const result = await gather(this.actor, this.level);
        if (!result) return;
        this.reveal = {
          dice: result.dice, total: result.outcome.total, rank: p.rank, exp: result.exp, rankUp: result.rankUp,
          quality: result.outcome.shard ? "legendary" : (result.outcome.count > 1 ? "rare" : result.outcome.count ? "uncommon" : "fail"),
          grade: null, success: false, lines: [
            L(`Profession.Chat.Gather.${result.outcome.id}`, { n: this.level, count: result.found.length }),
            ...(result.shards.length ? [L("Profession.Chat.Gather.shard")] : [])
          ],
          label: L(`Profession.Gather.Result.${result.outcome.shard ? "shard" : result.outcome.id}`, { count: result.outcome.count })
        };
      }
      else {
        const doc = await this.#doc(this.selected?.uuid);
        if (!doc) return;
        const result = await craftAttempt(this.actor, doc, this.selected.from);
        if (!result) return;
        this.reveal = {
          dice: result.dice, total: result.outcome.total, rank: p.rank, exp: result.exp, rankUp: result.rankUp,
          quality: result.outcome.id, grade: result.outcome.grade ?? null, success: !!result.pending,
          doubleSix: result.outcome.doubleSix,
          lines: [L(`Profession.Bench.Reveal.${result.outcome.id}`, { n: materialLevel(doc.system.rank) })]
        };
        if (result.pending) {
          this.picks = [];
          this.name = "";
          this.nameEdited = false;
          this.masterpiece = null;
          if (this.selected.from === "inventory") this.selected = null;
        }
      }
      this.step = "reveal";
    }
    finally {
      this.#busy = false;
      this.render();
    }
  }

  static #onContinue() {
    this.step = this.reveal?.success ? "enhance" : "choose";
    this.reveal = null;
    this.render();
  }

  /** Add an enhancement to the work (a single slot: it replaces the one there). */
  #pick(id, tag = null) {
    const def = ENHANCEMENT_INDEX.get(id);
    if (!def) return;
    const slots = this.#slots();
    const at = this.picks.findIndex(e => e.id === id);
    if ((at >= 0) && !def.repeat) this.picks.splice(at, 1);
    else if (this.picks.length < slots) this.picks.push({ id, tag: tag ?? def.tags?.[0] ?? null });
    else if (slots === 1) this.picks = [{ id, tag: tag ?? def.tags?.[0] ?? null }];
    else ui.notifications.info(L("Profession.Bench.Full"));
  }

  /** How many enhancements the step takes. */
  #slots() {
    if (this.mode === "craft") return toInt(pendingOf(this.actor)?.slots);
    if (this.mode === "fusion") return fusionPairs(this.actor).find(pr => pr.key === this.pairKey)?.legendary ? 0 : 1;
    return 1;
  }

  static #onPick(event, target) {
    const card = target.closest("[data-enh]");
    if (!card || card.classList.contains("disabled")) return;
    this.#pick(card.dataset.enh);
    this.render();
  }

  static #onUnpick(event, target) {
    const index = toInt(target.closest("[data-index]")?.dataset.index);
    this.picks.splice(index, 1);
    this.render();
  }

  /** Artisan's Cut: one enhancement of the accessory counts double. */
  static #onCut(event, target) {
    event.stopPropagation();
    const id = target.closest("[data-enh]")?.dataset.enh;
    const pick = this.picks.find(e => e.id === id);
    if (!pick) return;
    const on = !pick.cut;
    for (const e of this.picks) e.cut = false;
    pick.cut = on;
    this.render();
  }

  static #onMaster(event, target) {
    this.masterpiece = target.dataset.value;
    this.render();
  }

  /** Fusion: whose enhancements stay. */
  static #onKeep(event, target) {
    this.keep = target.dataset.id;
    this.picks = [];
    this.render();
  }

  /** Retouch: the enhancement that leaves. */
  static #onOut(event, target) {
    const index = target.closest("[data-index]")?.dataset.index;
    if (index === undefined) return;
    this.out = toInt(index);
    this.picks = [];
    this.render();
  }

  /** Craft, Fusion or Retouch: finish the work. */
  static async #onFinish() {
    if (this.#busy) return;
    this.#busy = true;
    try {
      const name = this.nameEdited ? this.name : "";
      let items = null;
      if (this.mode === "craft") items = await finishCraft(this.actor, { picks: this.picks, name, masterpiece: this.masterpiece });
      else if (this.mode === "fusion") {
        const pair = fusionPairs(this.actor).find(pr => pr.key === this.pairKey);
        const item = pair && await fuse(this.actor, { ids: pair.items.slice(0, 2).map(i => i.id), keep: this.keep, pick: this.picks[0] ?? null, name });
        items = item ? [item] : null;
      }
      else if (this.mode === "retouch") {
        const item = await retouch(this.actor, { itemId: this.itemId, out: this.out, pick: this.picks[0] });
        items = item ? [item] : null;
      }
      if (!items?.length) return;
      this.#finished(items, L(`Profession.Bench.Done.${this.mode}`));
    }
    finally {
      this.#busy = false;
      this.render();
    }
  }

  /** The "done" card of an item made. */
  #finished(items, title, lines = []) {
    const item = items[0];
    const craft = craftOf(item);
    const quality = craft ? qualityView(GRADE_QUALITY[craft.grade], craft.grade) : null;
    this.done = {
      title, quality, lines, count: items.length,
      item: item ? {
        uuid: item.uuid, id: item.id, name: item.name, img: item.img,
        enhancements: (craft?.enhancements ?? []).map(e => {
          const def = ENHANCEMENT_INDEX.get(e.id);
          return { icon: def.icon, ...enhancementText(def, craft.base, e), legendary: !!def.legendary, cut: !!e.cut };
        })
      } : null,
      again: L(`Profession.Bench.Again.${this.mode}`)
    };
    this.picks = [];
    this.name = "";
    this.nameEdited = false;
    this.masterpiece = null;
    this.step = "done";
  }

  /** The other modes: sell, sharpen, mend, banquet, copy. */
  static async #onConfirm() {
    if (this.#busy) return;
    this.#busy = true;
    try {
      const actor = this.actor;
      switch (this.mode) {
        case "sell": {
          const item = actor.items.get(this.itemId);
          const price = item && await sell(actor, this.itemId);
          if (price === null || price === undefined) return;
          this.done = { title: L("Profession.Bench.Done.sell"), lines: [L("Profession.Chat.Sold", { item: item.name, n: price })], again: L("Profession.Bench.Again.sell"), coins: price };
          this.itemId = null;
          this.step = "done";
          break;
        }
        case "sharpen": {
          const weapon = await this.#doc(this.itemId);
          if (!weapon || !(await sharpen(actor, weapon))) return;
          this.#docs.delete(this.itemId);
          this.done = { title: L("Profession.Bench.Done.sharpen"), item: { name: weapon.name, img: weapon.img, enhancements: [] }, lines: [L("Profession.Chat.Sharpened", { item: weapon.name, name: weapon.actor.name, n: sharpenValue(weapon) })], again: L("Profession.Bench.Again.sharpen") };
          this.itemId = null;
          this.step = "done";
          break;
        }
        case "mend": {
          const targets = [...this.targets].map(id => game.actors.get(id)).filter(Boolean);
          if (!(await mend(actor, targets))) return;
          this.done = { title: L("Profession.Bench.Done.mend"), lines: targets.map(a => a.name), again: L("Profession.Bench.Again.mend") };
          this.targets.clear();
          this.step = "done";
          break;
        }
        case "banquet": {
          const item = await banquet(actor, this.itemId);
          if (!item) return;
          this.itemId = null;
          this.#finished([item], L("Profession.Bench.Done.banquet"));
          break;
        }
        case "copy": {
          const item = await copy(actor, this.itemId);
          if (!item) return;
          this.itemId = null;
          this.#finished([item], L("Profession.Bench.Done.copy"));
          break;
        }
      }
    }
    finally {
      this.#busy = false;
      this.render();
    }
  }

  static #onAgain() {
    this.done = null;
    this.step = "choose";
    this.render();
  }

  /** GM: throw away a stuck work. */
  static async #onDiscard() {
    if (!game.user.isGM) return;
    await discardPending(this.actor);
    this.step = "choose";
    this.render();
  }

  /** Open the sheet of an item shown on the bench. */
  static async #onView(event, target) {
    const uuid = target.closest("[data-uuid]")?.dataset.uuid;
    const doc = uuid ? await fromUuid(uuid).catch(() => null) : null;
    doc?.sheet?.render(true);
  }
}

