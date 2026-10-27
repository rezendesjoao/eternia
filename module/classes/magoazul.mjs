/**
 * The Blue Mage's Motor: the Souls (Almas). docs/classes.md has the class; AS REGRAS, its page in XI, the rules as the
 * player reads them. A magic class: the Blue Mage chooses a Magia at CR 1, 5 and 10 (skills with flags.eternia.magic),
 * and the spells of the Magias feed and spend the class Motor ("@class" in their flags.eternia.motor, see motor.mjs).
 *
 * Take Over. The mage keeps a grimoire of souls: the First Soul (its nature chosen at the first Take Over, its level
 * always the mage's CR) and the souls of the monsters it brought to 0 HP with Absorb (any of its blows with Hunger for
 * Souls; any monster falling within 4 squares on the Path of the Blue Grimoire), 3 of them +1 every 5 CR (+ the SR of
 * Wide Grimoire), kept from one combat to the next; when it is full, the soul of the lowest level goes (the oldest on a
 * tie), maybe the new one. A soul has the monster's name, level and nature (its highest attribute: Strength a Beast,
 * Dexterity an Animal, Power a Demon, Intelligence a Spirit) and, from its tags, an element. Take Over wears a soul: in
 * combat its nature is a passive status valued [min(level, CR) ÷ 3 + 2] (statuses: Beast [Empowered], Animal [Hasted] and
 * half the Value as [Empowered], Demon [Awakened], Spirit [Cancel]) and its element goes into the damage of the mage's
 * Spells (damageTags). Essence: every Spell (+1, the big ones +2: their motor.gain), a soul absorbed (+1), each Setup
 * Process in a form (+1); the Soul Strike spends it all (the nature's mark on whoever it hits), the supreme spells of the
 * Magias need the cap. The Paths: the Whole Body (+2 at each Setup in a form, the form locked until the cap), the
 * Metamorphosis (a free Take Over each round, +1 for each new nature), the Blue Grimoire (the souls of the monsters that
 * fall near). The Apex wears two souls at once.
 *
 * State in flags.eternia.motor.magoazul:
 *   state    "humano" | "fera" | "animal" | "demonio" | "espirito": the nature of the soul worn
 *   value    Essence
 *   first    the First Soul's nature (null until the first Take Over)
 *   souls    the absorbed souls: [{ id (the monster's uuid), name, img, rank, nature, element }], kept between combats
 *   worn     id of the soul worn ("primeira" for the First Soul) or null; second: the other one (the Apex)
 *   fresh    ids of the souls absorbed in this combat (Blue Lesson)
 *   round    { key, natures }: the natures worn in the round "<combat>.<round>" (A Thousand Skins)
 *   wild, barrier, hurt, swap   "<combat>.<round>" of Wild Soul, Borrowed Skin, Pain That Feeds, the Metamorphosis swap
 *   inescapable   the Inescapable Strike was used in this combat (once per scene)
 */
import { L } from "../settings.mjs";
import { combatOf, postSummary, toInt } from "../helpers/utils.mjs";
import { tagLabel } from "../i18n/terms.mjs";
import {
  areEnemies, chooseOption, crOf, hasApex, identifierOf, motorData, motorMax, pathOf, roundKey, setMotor, talentOf,
  talentRank
} from "./motor.mjs";

export const MAGOAZUL_ID = "magoazul";

/** Identifier of a Blue Mage skill. */
const T = name => `${MAGOAZUL_ID}-${name}`;

const DEFAULTS = {
  state: "humano", value: 0, first: null, souls: [], worn: null, second: null, fresh: [], round: null,
  wild: null, barrier: null, hurt: null, swap: null, inescapable: false
};

/** The natures, by the attribute that gives them (ties go to the first of the list). */
const NATURES = [["str", "fera"], ["pow", "demonio"], ["dex", "animal"], ["int", "espirito"]];
const FORMS = NATURES.map(([, nature]) => nature);
const FIRST = "primeira";

/** The mark each nature leaves with the Soul Strike (and the other strikes that carry it). */
const MARKS = { fera: "prone", animal: "slowed", demonio: "frightened", espirito: "dazed" };

/** The damage elements a soul can have (the monster's tags), and the status each leaves with Soul Element. */
const ELEMENTS = {
  Flame: cr => ({ statusId: "burning", value: Math.floor(cr / 2) + 1 }),
  Cold: () => ({ statusId: "freezing", value: 1 }),
  Shock: cr => ({ statusId: "shocked", value: Math.floor(cr / 2) + 2 }),
  Blight: cr => ({ statusId: "decay", value: Math.floor(cr / 2) + 2 }),
  Poison: cr => ({ statusId: "poisoned", value: Math.floor(cr / 2) + 2 }),
  Water: () => ({ statusId: "slowed", value: null }),
  Wind: () => ({ statusId: "prone", value: null }),
  Iron: () => ({ statusId: "fissured", value: 1 }),
  Radiance: () => ({ statusId: "blinded", value: null }),
  Holy: () => ({ statusId: "blinded", value: null }),
  Psychic: () => ({ statusId: "confused", value: null }),
  Mental: () => ({ statusId: "confused", value: null })
};
const ELEMENT_ALIASES = { fire: "Flame", electric: "Shock" };

/** The skills that leave the nature's mark: the Soul Strike, the Possessed Fury, the Possessed Claw with Soul Mark. */
const MARKING = [T("golpe-da-alma"), T("furia-possessa")];

const isSpell = item => (item?.system?.tags ?? []).includes("Spell");

/** The Path the actor follows (none with only the Lesser Souls). */
const path = (actor, lesser) => (lesser ? null : pathOf(actor, MAGOAZUL_ID));

/** Whether the mage has the Apex (not with only the Lesser Souls). */
const apex = (actor, lesser) => !lesser && hasApex(actor, MAGOAZUL_ID);

/** How many absorbed souls the grimoire keeps (the First Soul aside). */
function capacity(actor, lesser) {
  const base = lesser ? 1 : 3 + Math.floor(crOf(actor) / 5);
  return base + talentRank(actor, T("grimorio-amplo"));
}

/** An attribute of a creature: its total, else its value and modifier (the monsters of the bestiary). */
function attribute(actor, key) {
  const a = actor?.system?.attributes?.[key] ?? {};
  return toInt(a.total) || (toInt(a.value) + toInt(a.mod));
}

/** The nature of a creature's soul: its highest attribute. */
function natureOf(actor) {
  let best = NATURES[0][1];
  let top = -Infinity;
  for (const [key, nature] of NATURES) {
    const value = attribute(actor, key);
    if (value > top) [top, best] = [value, nature];
  }
  return best;
}

/** The element of a creature's soul: the first element among its tags, or null. */
function elementOf(actor) {
  for (const raw of actor?.system?.tags ?? []) {
    const tag = String(raw);
    const known = Object.keys(ELEMENTS).find(e => e.toLowerCase() === tag.toLowerCase()) ?? ELEMENT_ALIASES[tag.toLowerCase()];
    if (known) return known;
  }
  return null;
}

/** The soul a fallen creature leaves. */
function soulOf(victim) {
  return {
    id: victim.uuid,
    name: victim.token?.name || victim.name,
    img: victim.token?.texture?.src || victim.img,
    rank: crOf(victim),
    nature: natureOf(victim),
    element: elementOf(victim)
  };
}

/** Every soul of the grimoire: the First Soul (once chosen) and the absorbed ones. */
function soulsOf(actor, data) {
  const list = [];
  if (data.first) list.push({ id: FIRST, name: L("Motor.MagoAzul.First"), rank: crOf(actor), nature: data.first, element: null });
  return list.concat(data.souls ?? []);
}

const soulById = (actor, data, id) => (id ? soulsOf(actor, data).find(s => s.id === id) ?? null : null);

/** The souls the mage wears now (one, two with the Apex). */
function wornSouls(actor, data) {
  return [data.worn, data.second].map(id => soulById(actor, data, id)).filter(Boolean);
}

/** The Value of a worn soul's nature: [min(level, CR) ÷ 3 + 2], the CR for a fresh soul (Blue Lesson). */
function natureValue(actor, data, soul, lesser) {
  const cr = crOf(actor);
  let level = Math.min(toInt(soul.rank), cr);
  if (!lesser && talentOf(actor, T("licao-azul")) && (data.fresh ?? []).includes(soul.id)) level = cr;
  return Math.max(1, Math.floor(level / 3) + 2);
}

/** A soul as an option of a dialog: "Name: Nature, level N (Element)". */
function soulLabel(soul) {
  const element = soul.element ? L("Motor.MagoAzul.ElementOf", { element: tagLabel(soul.element) }) : "";
  return L("Motor.MagoAzul.SoulOption", { name: soul.name, nature: L(`Motor.MagoAzul.State.${soul.nature}`), rank: soul.rank, element });
}

/** Give a status to an actor, from the mage (the system's relay when the user doesn't own it). */
function giveStatus(actor, from, statusId, { value = null, expires = "endOfScene" } = {}) {
  return game.eternia?.applyStatus?.(actor, statusId, { value, expires, from });
}

/** Writes of the Motor one after the other (several events can arrive together). */
const queues = new Map();
function serial(actor, fn) {
  const before = queues.get(actor.uuid) ?? Promise.resolve();
  const next = before.then(fn, fn);
  queues.set(actor.uuid, next.catch(() => null));
  return next;
}

/** Squares between two actors' tokens on the scene being viewed (Infinity when one has none). */
function squaresBetween(a, b) {
  const ta = a?.getActiveTokens?.()[0]?.document;
  const tb = b?.getActiveTokens?.()[0]?.document;
  if (!ta || !tb || (ta.parent !== tb.parent)) return Infinity;
  const size = ta.parent.grid?.size || 100;
  return Math.round(Math.max(Math.abs(ta.x - tb.x), Math.abs(ta.y - tb.y)) / size);
}

/**
 * Absorb a fallen monster's soul into the grimoire: +1 Essence (+2 with the Apex on the Path of the Blue Grimoire).
 * When the grimoire is full, the soul of the lowest level goes (the oldest on a tie), maybe the new one.
 */
function absorb(actor, lesser, victim) {
  return serial(actor, async () => {
    const data = motorData(actor, MAGOAZUL_ID);
    const souls = [...(data.souls ?? [])];
    if (souls.some(s => s.id === victim.uuid)) return;
    const soul = soulOf(victim);
    let kept = [...souls, soul];
    let lost = null;
    if (kept.length > capacity(actor, lesser)) {
      lost = kept.reduce((low, s) => (toInt(s.rank) < toInt(low.rank) ? s : low), kept[0]);
      kept = kept.filter(s => s !== lost);
    }
    const lines = [];
    const changes = { souls: kept };
    if (lost === soul) lines.push(L("Motor.MagoAzul.Escaped", { soul: soul.name }));
    else {
      const bonus = (apex(actor, lesser) && (path(actor, lesser) === "grimorio-azul")) ? 2 : 1;
      changes.value = toInt(data.value) + bonus;
      changes.fresh = [...(data.fresh ?? []), soul.id];
      lines.push(L("Motor.MagoAzul.Absorbed", {
        name: actor.name, soul: soulLabel(soul)
      }));
      if (lost) lines.push(L("Motor.MagoAzul.Replaced", { soul: lost.name }));
      // A worn soul that left: the other one stays, else back to the human form.
      if (lost && [data.worn, data.second].includes(lost.id)) {
        const worn = (data.worn === lost.id) ? data.second : data.worn;
        changes.worn = worn ?? null;
        changes.second = null;
        changes.state = worn ? (soulById(actor, { ...data, souls: kept }, worn)?.nature ?? "humano") : "humano";
      }
    }
    await setMotor(actor, MAGOAZUL_ID, { ...data, ...changes });
    await postSummary(L("Motor.MagoAzul.Name"), lines);
  });
}

export const MAGOAZUL = {
  id: MAGOAZUL_ID,
  i18n: "Motor.MagoAzul",
  states: ["humano", ...FORMS],
  stateColors: { humano: 0x5b6f8f, fera: 0x8b5a2b, animal: 0x4f8a3d, demonio: 0x6a2d8a, espirito: 0x3aa0b5 },
  defaults: DEFAULTS,
  costKeyword: "Essência",

  /** The cap of Essence. */
  max(actor, { lesser }) {
    const max = 3 + Math.floor(crOf(actor) / 5);
    return lesser ? Math.max(1, Math.floor(max / 2)) : max;
  },

  /** The Whole Body locks the form until the cap; the Feast and the Sacrifice need a soul. */
  issues(actor, item, motor, { data, lesser }) {
    const id = identifierOf(item);
    if (id === T("take-over")) {
      const locked = (path(actor, lesser) === "corpo-inteiro") && combatOf(actor) && (data.state !== "humano");
      if (locked && (toInt(data.value) < motorMax(actor, MAGOAZUL_ID))) return [L("Motor.MagoAzul.WholeLock")];
    }
    if ((id === T("banquete-de-almas")) && !(data.souls ?? []).length) return [L("Motor.MagoAzul.NoSouls")];
    if ((id === T("alma-sacrificada")) && (!data.worn || (data.worn === FIRST))) return [L("Motor.MagoAzul.NeedsSoul")];
    return [];
  },

  /** The Metamorphosis: the first Take Over of each round spends no action. */
  actionOf(actor, item, motor, action) {
    if (identifierOf(item) !== T("take-over")) return action;
    const data = motorData(actor, MAGOAZUL_ID);
    const free = (pathOf(actor, MAGOAZUL_ID) === "metamorfose") && combatOf(actor) && (data.swap !== roundKey(actor));
    return free ? "none" : action;
  },

  /** Take Over (the souls to wear), the Feast of Souls, the Sacrificed Soul and the Inescapable Strike. */
  async plan(actor, item, motor, { data, max, lesser, plan }) {
    const id = identifierOf(item);
    if (id === T("take-over")) return planTakeOver(actor, item, data, lesser, plan);
    if (id === T("golpe-da-alma") && !lesser && talentOf(actor, T("golpe-inescapavel")) && (max > 0) && (plan.spent >= max)
      && !data.inescapable) {
      plan.autoHit = true;
      plan.changes.inescapable = true;
    }
    if (id === T("banquete-de-almas")) {
      const options = (data.souls ?? []).map(s => ({ value: s.id, label: soulLabel(s) }));
      const picked = await chooseOption(item.name, options, { hint: L("Motor.MagoAzul.FeastHint") });
      if (!picked) return null;
      const soul = (data.souls ?? []).find(s => s.id === picked);
      plan.gain = Math.max(1, Math.floor(toInt(soul?.rank) / 2));
      Object.assign(plan.changes, release(actor, data, picked));
      if (plan.changes.state) plan.set = plan.changes.state;
    }
    if (id === T("alma-sacrificada")) {
      Object.assign(plan.changes, release(actor, data, data.worn));
      if (plan.changes.state) plan.set = plan.changes.state;
    }
    return plan;
  },

  /** Borrowed Skin ([Barrier: CR+5], once a round) and Shed Skin (the bonds stay behind) after a Take Over. */
  async onUse(actor, { lesser }, item, plan) {
    if ((identifierOf(item) !== T("take-over")) || !plan?.set || (plan.set === "humano")) return;
    const key = roundKey(actor);
    const data = motorData(actor, MAGOAZUL_ID);
    if (talentOf(actor, T("pele-emprestada")) && (data.barrier !== key)) {
      await setMotor(actor, MAGOAZUL_ID, { ...data, barrier: key });
      await giveStatus(actor, actor, "barrier", { value: crOf(actor) + 5 });
    }
    if ((path(actor, lesser) === "metamorfose") && talentOf(actor, T("pele-trocada"))) {
      const { removeStatuses } = await import("../conditions/rules.mjs");
      await removeStatuses(actor, ["slowed", "rooted", "grappled"]);
    }
  },

  /** The worn souls' natures, in combat; Perfect Form, [Cancel: Essence] in a form. */
  statuses(actor, { data, lesser }) {
    if (!combatOf(actor)) return [];
    const out = [];
    if (!lesser && data.worn && (toInt(data.value) > 0) && talentOf(actor, T("forma-perfeita"))) {
      out.push({ key: "perfeita", statusId: "cancel", value: toInt(data.value) });
    }
    wornSouls(actor, data).forEach((soul, i) => {
      const value = natureValue(actor, data, soul, lesser);
      const key = `forma${i + 1}`;
      switch (soul.nature) {
        case "fera": out.push({ key, statusId: "empowered", value }); break;
        case "animal":
          out.push({ key, statusId: "hasted" });
          out.push({ key: `${key}b`, statusId: "empowered", value: Math.max(1, Math.floor(value / 2)) });
          break;
        case "demonio": out.push({ key, statusId: "awakened", value }); break;
        case "espirito": out.push({ key, statusId: "cancel", value }); break;
      }
    });
    return out;
  },

  /** The worn souls' elements go into the damage of the mage's Spells, in combat. */
  damageTags(actor, item) {
    if (!isSpell(item) || item.system?.damage?.recovery || !combatOf(actor)) return [];
    const data = motorData(actor, MAGOAZUL_ID);
    return [...new Set(wornSouls(actor, data).map(s => s.element).filter(Boolean))];
  },

  /**
   * On whoever a strike hits: the nature's mark (the Soul Strike, the Possessed Fury, the Possessed Claw with Soul Mark;
   * every nature worn in the round with A Thousand Skins) and the element's status (the Spells with Soul Element, the
   * Blue Magic).
   */
  onHit(actor, item, { lesser }) {
    const id = identifierOf(item);
    const data = motorData(actor, MAGOAZUL_ID);
    const worn = wornSouls(actor, data);
    const out = [];
    const marking = MARKING.includes(id) || ((id === T("garra-possuida")) && !lesser && talentOf(actor, T("marca-da-alma")));
    if (marking) {
      const natures = new Set(worn.map(s => s.nature));
      if ((id === T("golpe-da-alma")) && (path(actor, lesser) === "metamorfose") && talentOf(actor, T("mil-peles"))) {
        if (data.round?.key === roundKey(actor)) for (const n of data.round.natures ?? []) natures.add(n);
      }
      for (const nature of natures) if (MARKS[nature]) out.push({ statusId: MARKS[nature], value: null, name: item.name });
    }
    const elemental = (id === T("magia-azul")) || (!lesser && isSpell(item) && talentOf(actor, T("elemento-da-alma")));
    if (elemental && !item.system?.damage?.recovery) {
      const cr = crOf(actor);
      for (const element of new Set(worn.map(s => s.element).filter(Boolean))) {
        const status = ELEMENTS[element]?.(cr);
        if (status) out.push({ ...status, name: item.name });
      }
    }
    return out;
  },

  /** The class tab and the HUD: the souls worn, else how full the grimoire is; ready for the Inescapable Strike. */
  display(actor, { lesser, data, max }) {
    const worn = wornSouls(actor, data);
    const note = worn.length ? worn.map(s => s.name).join(" + ")
      : L("Motor.MagoAzul.Book", { n: (data.souls ?? []).length, max: capacity(actor, lesser) });
    const ready = !lesser && (max > 0) && (toInt(data.value) >= max) && !data.inescapable
      && !!talentOf(actor, T("golpe-inescapavel"));
    return { note, ready, readyLabel: L("Motor.MagoAzul.ReadyLabel") };
  },

  /* ------------------------------------------ */
  /*  Events                                    */
  /* ------------------------------------------ */

  /** Every combat starts in the human form, with the Essence of Kept Essence. */
  async onCombatStart(actor) {
    const data = motorData(actor, MAGOAZUL_ID);
    await setMotor(actor, MAGOAZUL_ID, {
      ...data, state: "humano", worn: null, second: null, value: talentRank(actor, T("essencia-guardada")), fresh: [],
      round: null, wild: null, barrier: null, hurt: null, swap: null, inescapable: false
    });
  },

  /** In a form, the soul grows at each Setup Process (+1, +2 on the Whole Body); Full Grimoire. */
  async onSetup(actor, { lesser }) {
    const data = motorData(actor, MAGOAZUL_ID);
    let gain = 0;
    if (data.worn) {
      gain = 1;
      if (path(actor, lesser) === "corpo-inteiro") gain = 2;
    }
    if (!lesser && talentOf(actor, T("grimorio-cheio")) && ((data.souls ?? []).length >= capacity(actor, lesser))) gain += 1;
    if (gain) await setMotor(actor, MAGOAZUL_ID, { ...data, value: toInt(data.value) + gain });
  },

  /** The end of the combat: the form and the Essence go; the grimoire stays. */
  async onCombatEnd(actor) {
    const data = motorData(actor, MAGOAZUL_ID);
    await setMotor(actor, MAGOAZUL_ID, {
      ...DEFAULTS, first: data.first ?? null, souls: data.souls ?? []
    });
  },

  /** A monster the mage brought to 0 HP: Absorb (any blow with Hunger for Souls) takes its soul. */
  async onKill(actor, { lesser }, target, item) {
    if (!(target instanceof Actor) || (target.type !== "monster") || !areEnemies(actor, target)) return;
    if (item?.actor && (item.actor.uuid !== actor.uuid)) return;
    const absorbing = identifierOf(item) === T("absorver");
    if (!absorbing && (lesser || !talentOf(actor, T("fome-de-almas")))) return;
    await absorb(actor, lesser, target);
  },

  /** The Path of the Blue Grimoire: any monster falling within 4 squares of the mage, whoever brought it down. */
  async onAnyKill(actor, { lesser }, victim) {
    if ((path(actor, lesser) !== "grimorio-azul") || !(victim instanceof Actor) || (victim.type !== "monster")) return;
    if (!areEnemies(actor, victim) || (squaresBetween(actor, victim) > 4)) return;
    await absorb(actor, lesser, victim);
  },

  /** Wild Soul: in a form, the first hit of the mage in each round (+1). */
  onHitTarget(actor, { lesser }, target) {
    if (lesser || !talentOf(actor, T("alma-selvagem")) || !areEnemies(actor, target)) return;
    return serial(actor, async () => {
      const data = motorData(actor, MAGOAZUL_ID);
      const key = roundKey(actor);
      if (!data.worn || (data.wild === key)) return;
      await setMotor(actor, MAGOAZUL_ID, { ...data, wild: key, value: toInt(data.value) + 1 });
    });
  },

  /** Pain That Feeds (Whole Body): in a form, the first blow the mage takes in each round (+1). */
  onDamaged(actor, { lesser }, amount) {
    if ((toInt(amount) <= 0) || (path(actor, lesser) !== "corpo-inteiro") || !talentOf(actor, T("dor-que-alimenta"))) return;
    return serial(actor, async () => {
      const data = motorData(actor, MAGOAZUL_ID);
      const key = roundKey(actor);
      if (!data.worn || (data.hurt === key)) return;
      await setMotor(actor, MAGOAZUL_ID, { ...data, hurt: key, value: toInt(data.value) + 1 });
    });
  }
};

/**
 * Take Over: the First Soul's nature the first time; then the soul to wear (or the human form) and, with the Apex, a
 * second one. The Whole Body pays all the Essence to change in a combat; the Metamorphosis marks its free swap and gives
 * +1 for each new nature; A Thousand Skins keeps the natures worn in the round.
 */
async function planTakeOver(actor, item, data, lesser, plan) {
  const changes = {};
  let worn = null;
  let second = null;
  if (!data.first) {
    const options = FORMS.map(n => ({ value: n, label: L(`Motor.MagoAzul.State.${n}`) }));
    const nature = await chooseOption(item.name, options, { hint: L("Motor.MagoAzul.ChooseFirst") });
    if (!nature) return null;
    changes.first = nature;
    worn = FIRST;
  }
  else {
    const souls = soulsOf(actor, data);
    const options = souls.filter(s => apex(actor, lesser) || (s.id !== data.worn)).map(s => ({ value: s.id, label: soulLabel(s) }));
    if (data.worn) options.push({ value: "humano", label: L("Motor.MagoAzul.Human") });
    const picked = await chooseOption(item.name, options, { hint: L("Motor.MagoAzul.ChooseSoul"), selected: options[0]?.value });
    if (!picked) return null;
    if (picked !== "humano") {
      worn = picked;
      const others = souls.filter(s => s.id !== picked);
      if (apex(actor, lesser) && others.length) {
        const list = [{ value: "", label: L("Motor.MagoAzul.None") }, ...others.map(s => ({ value: s.id, label: soulLabel(s) }))];
        const other = await chooseOption(item.name, list, { hint: L("Motor.MagoAzul.ChooseSecond"), selected: others[0].id });
        if (other === null) return null;
        second = other || null;
      }
    }
  }
  const book = { ...data, ...changes };
  const before = wornSouls(actor, data).map(s => s.nature);
  const after = [worn, second].map(id => soulById(actor, book, id)).filter(Boolean).map(s => s.nature);
  changes.worn = worn;
  changes.second = second;
  plan.set = after[0] ?? "humano";
  Object.assign(plan.changes, changes);

  const combat = combatOf(actor);
  const key = roundKey(actor);
  // The Whole Body: changing in a combat spends all the Essence (it needs the cap: issues).
  if (combat && (path(actor, lesser) === "corpo-inteiro") && data.worn) plan.spent = toInt(data.value);
  // The Metamorphosis: the free swap of the round, and +1 for each nature that was not worn.
  if (combat && (path(actor, lesser) === "metamorfose")) {
    if (data.swap !== key) plan.changes.swap = key;
    plan.gain = toInt(plan.gain) + new Set(after.filter(n => !before.includes(n))).size;
  }
  // The natures worn in this round (A Thousand Skins).
  const earlier = (data.round?.key === key) ? (data.round.natures ?? []) : [];
  plan.changes.round = { key, natures: [...new Set([...earlier, ...before, ...after])] };
  return plan;
}

/** What letting go of a soul changes: it leaves the grimoire; worn, the other one stays, else the human form. */
function release(actor, data, id) {
  const souls = (data.souls ?? []).filter(s => s.id !== id);
  const changes = { souls };
  if ([data.worn, data.second].includes(id)) {
    const worn = (data.worn === id) ? data.second : data.worn;
    changes.worn = worn ?? null;
    changes.second = null;
    changes.state = worn ? (soulById(actor, { ...data, souls }, worn)?.nature ?? "humano") : "humano";
  }
  return changes;
}
