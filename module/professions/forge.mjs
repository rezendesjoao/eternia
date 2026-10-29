/**
 * The items the professions make. A crafted item is its base item (a copy of its data, kept in
 * `flags.eternia.craft.base`) with enhancements applied, so a Retouch or a Fusion builds it again from the base:
 *   flags.eternia.craft = { grade, enhancements: [{id, tag?, cut?}], base, crafter, profession, rank,
 *                           masterpiece?, retouches? }
 * The numbers go into the item's own fields when it has them (a weapon's Attack Power), else into Active Effects
 * of the item that act while it is equipped (Max HP, Evasion…). Consumables change what they do when used.
 */
import { L, SYSTEM_ID } from "../settings.mjs";
import { escape, toInt } from "../helpers/utils.mjs";
import { tagLabel } from "../i18n/terms.mjs";
import { evaluateFormula, formulaData, isFormula, resolveChanges } from "../helpers/effect-formulas.mjs";
import {
  ENHANCEMENTS, ENHANCEMENT_INDEX, FIELD_KEYS, GRADE_QUALITY, ITEM_FIELDS, LEGENDARY, QUICK_FROM, WIDE_TARGET, categoryOf,
  kindOf, materialPrice, multiplierOf
} from "./data.mjs";

const STATUS_IMG = id => `systems/${SYSTEM_ID}/assets/ui/status/${id}.svg`;
const change = (key, value) => ({ key, type: "add", value, phase: "initial", priority: null });
const isSet = v => (v !== undefined) && (v !== null) && !["", "0"].includes(String(v).trim());
const hasDamage = d => !!d && (isSet(d.dice) || isSet(d.mod));

/** An Active Effect of a crafted item. */
function effectData({ name, img, changes = [], statuses = [], transfer = true, flags = {}, text = "" }) {
  return {
    name, img, type: "base", transfer, disabled: false, statuses,
    system: { changes },
    description: text ? `<p>${escape(text)}</p>` : "",
    flags: { [SYSTEM_ID]: flags }
  };
}

/**
 * Plain data of an item as the base of a crafted one: no ids, unequipped, without craft data.
 * @param {Item|object} item
 */
export function baseData(item) {
  const data = item.toObject ? item.toObject() : foundry.utils.deepClone(item);
  for (const key of ["_id", "folder", "sort", "ownership"]) delete data[key];
  if (item.pack || item.uuid?.startsWith("Compendium.")) foundry.utils.setProperty(data, "_stats.compendiumSource", item.uuid);
  if (data.flags?.[SYSTEM_ID]?.craft) delete data.flags[SYSTEM_ID].craft;
  data.system.equipped = false;
  for (const effect of data.effects ?? []) delete effect._id;
  return data;
}

/* -------------------------------------------- */
/*  What an enhancement does to an item         */
/* -------------------------------------------- */

/** What the Potent enhancement adds to on this item: "xp", "heal", "damage", "fatigue", "status" or null. */
export function potentKind(data) {
  const flags = data.flags?.[SYSTEM_ID] ?? {};
  const damage = data.system?.damage ?? {};
  // A boost of the XP (experience/boosts.mjs): more monsters
  if (toInt(flags.xpBoost?.count) > 0) return "xp";
  if (flags.heal || (damage.recovery && hasDamage(damage))) return "heal";
  if (hasDamage(damage)) return "damage";
  if (toInt(flags.fatigue) > 0) return "fatigue";
  if ((data.effects ?? []).some(e => toInt(e.flags?.[SYSTEM_ID]?.statusData?.value) > 0)) return "status";
  return null;
}

/** Whether an item is used against enemies (an opposed check, damage, a toxin). */
export function isHostileData(data) {
  const s = data.system ?? {};
  if (["evasion", "resistance"].includes(s.check?.vs)) return true;
  if (/vs\.?\s*(evasion|resistance)/i.test(s.checkType ?? "")) return true;
  if (hasDamage(s.damage) && !s.damage.recovery) return true;
  return kindOf(data) === "toxin";
}

/** Why an enhancement can't go on this item (localization key), or null. */
export function unavailableReason(def, data) {
  if (def.potent && !potentKind(data)) return "Profession.Why.potent";
  if (def.timing && !QUICK_FROM.includes(String(data.system?.timing ?? "").trim().toLowerCase())) return "Profession.Why.quick";
  if (def.wide && !WIDE_TARGET.test(data.system?.target ?? "")) return "Profession.Why.wide";
  if ((def.purify || def.status) && isHostileData(data)) return "Profession.Why.hostile";
  return null;
}

/** The enhancements an item can take (its list), with the legendary one of its list. */
export function enhancementsFor(data) {
  const category = categoryOf(data);
  return { category, list: ENHANCEMENTS[category] ?? [], legendary: LEGENDARY[category] ?? null };
}

/** How much the numbers of an enhancement count on this item: ×2 from level 11, ×3 from 21, ×2 more when cut. */
export const factorOf = (data, pick = {}) => multiplierOf(data.system?.rank) * (pick.cut ? 2 : 1);

/** The status a Potent enhancement raises, for its text. */
const potentStatus = data => (data.effects ?? []).map(e => e.flags?.[SYSTEM_ID]?.statusData).find(s => toInt(s?.value) > 0)?.statusId;

/**
 * Name and rule of an enhancement on an item, with its numbers.
 * @param {object} def    An enhancement (data.mjs)
 * @param {object} data   The base item's data
 * @param {object} [pick] {tag, cut}
 * @returns {{name: string, text: string}}
 */
export function enhancementText(def, data, pick = {}) {
  const f = factorOf(data, pick);
  const key = `Profession.Enh.${def.id}`;
  const name = L(`${key}.name`);
  const tag = tagLabel(pick.tag || def.tags?.[0] || "");
  let text;
  if (def.fields || def.changes) {
    const values = [...Object.values(def.fields ?? {}), ...Object.values(def.changes ?? {})].map(v => Math.abs(v * f));
    text = L(`${key}.text`, { n: values[0], m: values[1] ?? "" });
  }
  else if (def.cancel) text = L(`${key}.text`, { n: def.cancel * f, tag });
  else if (def.tags) text = L(`${key}.text`, { tag });
  else if (def.potent) {
    const kind = potentKind(data) ?? "damage";
    const status = potentStatus(data);
    text = L(`${key}.${kind}`, {
      n: ((kind === "status") ? def.potent.status : def.potent.amount) * f,
      status: status ? game.i18n.localize(`ETERNIA.StatusEffect.${status}`) : ""
    });
  }
  else if (def.wide) text = L(`${key}.text`, { n: def.wide });
  else text = L(`${key}.text`);
  return { name, text };
}

/** The epithet an enhancement gives a name ("do Gume", "das Chamas"). */
export function epithetOf(pick) {
  const def = ENHANCEMENT_INDEX.get(pick.id);
  if (!def) return "";
  if (def.tags) return L(`Profession.Enh.${def.id}.epithet.${pick.tag || def.tags[0]}`);
  return L(`Profession.Enh.${def.id}.epithet`);
}

/** The name a crafted item gets: its base and the epithet of its legendary enhancement, else of the first one. */
export function defaultName(data, picks) {
  const first = picks.find(p => ENHANCEMENT_INDEX.get(p.id)?.legendary) ?? picks[0];
  return first ? `${data.name} ${epithetOf(first)}` : data.name;
}

/** "Self" / "Single" / "2 Targets" with more targets. */
function widen(target, n) {
  const m = WIDE_TARGET.exec(target ?? "");
  if (!m) return target;
  return `${(m[2] ? toInt(m[2]) : 1) + n} Targets`;
}

/** A number or a formula plus n. */
const plus = (value, n) => ((typeof value === "string") && isFormula(value)) ? `${value}+${n}` : toInt(value) + n;

function applyPotent(data, def, f) {
  const flags = data.flags[SYSTEM_ID];
  const damage = data.system.damage ?? {};
  switch (potentKind(data)) {
    case "xp":
      flags.xpBoost = { ...flags.xpBoost, count: toInt(flags.xpBoost.count) + (def.potent.amount * f) };
      break;
    case "heal":
      if (flags.heal) flags.heal = { ...flags.heal, mod: plus(flags.heal.mod ?? 0, def.potent.amount * f) };
      else damage.mod = plus(damage.mod, def.potent.amount * f);
      break;
    case "damage":
      damage.mod = plus(damage.mod, def.potent.amount * f);
      break;
    case "fatigue":
      flags.fatigue = toInt(flags.fatigue) + (def.potent.amount * f);
      break;
    case "status":
      for (const effect of data.effects ?? []) {
        const status = effect.flags?.[SYSTEM_ID]?.statusData;
        if (toInt(status?.value) > 0) status.value = toInt(status.value) + (def.potent.status * f);
      }
      break;
  }
}

/** The Aegis: a power of the item (content.mjs) that cancels the next damage, once per scene. */
function aegisPower(name, text, img) {
  return {
    timing: "Before Damage", target: "Self", range: "-", cost: "", limit: "1/Scene", text: `${name}: ${text}`,
    effects: [effectData({
      name, img, transfer: false, changes: [change("eternia.passive.cancel", 9999)],
      flags: { recipients: "self", consumeOn: "damage", expires: "endOfScene" }
    })]
  };
}

/* -------------------------------------------- */
/*  Building a crafted item                     */
/* -------------------------------------------- */

/**
 * The data of a crafted item: its base with the enhancements, Magic Grade, name, price and text.
 * @param {object} base    baseData() of the base item
 * @param {object} craft   {grade, enhancements: [{id, tag?, cut?}], crafter?, profession?, rank?, masterpiece?,
 *                         retouches?, name?}
 * @returns {object}
 */
export function buildCrafted(base, craft) {
  const data = foundry.utils.deepClone(base);
  const system = data.system;
  data.effects ??= [];
  data.flags ??= {};
  data.flags[SYSTEM_ID] ??= {};
  const flags = data.flags[SYSTEM_ID];
  const lines = [];

  for (const pick of craft.enhancements) {
    const def = ENHANCEMENT_INDEX.get(pick.id);
    if (!def) continue;
    const f = factorOf(base, pick);
    const { name, text } = enhancementText(def, base, pick);
    lines.push({ name, text, cut: !!pick.cut, legendary: !!def.legendary });
    const changes = [];
    for (const [field, value] of Object.entries(def.fields ?? {})) {
      if (ITEM_FIELDS[data.type]?.includes(field)) system[field] = toInt(system[field]) + (value * f);
      else changes.push(change(FIELD_KEYS[field], value * f));
    }
    for (const [key, value] of Object.entries(def.changes ?? {})) changes.push(change(key, value * f));
    const effectFlags = { craftEnh: def.id };
    if (def.cancel) {
      changes.push(change("eternia.passive.cancel", def.cancel * f));
      effectFlags.cancelTag = pick.tag || def.tags[0];
    }
    if (changes.length) data.effects.push(effectData({ name, img: data.img, changes, flags: effectFlags, text }));
    if (def.tags && !def.cancel) system.tags = [...(system.tags ?? []), pick.tag || def.tags[0]];

    // Consumables
    if (def.potent) applyPotent(data, def, f);
    if (def.timing) system.timing = def.timing;
    if (def.wide) system.target = widen(system.target, def.wide);
    if (def.purify) flags.useActions = [...(flags.useActions ?? []), { type: "removeStatus", statuses: def.purify }];
    if (def.status) {
      data.effects.push(effectData({
        name, img: STATUS_IMG(def.status), statuses: [def.status], transfer: false,
        flags: { craftEnh: def.id, expires: "endOfScene" }
      }));
    }

    // Legendary
    if (def.id === "fate") {
      data.effects.push(effectData({
        name, img: data.img, changes: [change("eternia.roll.damage.dice", 1)], text,
        flags: { craftEnh: def.id, rollFilter: { damageTypes: ["physical", "magical", "penetrating", "direct"] } }
      }));
    }
    if (def.id === "aegis") flags.powers = [...(flags.powers ?? []), aegisPower(name, text, data.img)];
    if (def.id === "starheart") flags.sceneStatuses = [...(flags.sceneStatuses ?? []), { status: "lastStand" }];
  }

  if (craft.masterpiece === "mass") system.target = "All";
  if (craft.masterpiece === "instant") system.timing = "Instant";

  system.tags = [...(system.tags ?? []).filter(t => !/^\s*\[?m\d\]?\s*$/i.test(String(t))), `M${craft.grade}`];
  system.price = toInt(base.system.price) + (materialPrice(system.rank) * craft.grade);
  data.name = craft.name?.trim() || defaultName(base, craft.enhancements);
  system.description = craftNote(craft, lines) + (base.system.description ?? "");
  flags.craft = {
    grade: craft.grade,
    enhancements: craft.enhancements.map(p => ({ id: p.id, ...(p.tag ? { tag: p.tag } : {}), ...(p.cut ? { cut: true } : {}) })),
    base,
    crafter: craft.crafter ?? "",
    profession: craft.profession ?? "",
    rank: toInt(craft.rank),
    ...(craft.masterpiece ? { masterpiece: craft.masterpiece } : {}),
    retouches: toInt(craft.retouches)
  };
  return data;
}

/** The block a crafted item's text starts with: quality, who made it and its enhancements. */
function craftNote(craft, lines) {
  const quality = L(`Profession.Quality.${GRADE_QUALITY[craft.grade]}`);
  const profession = craft.profession ? L(`Profession.Name.${craft.profession}`) : "";
  const by = craft.crafter ? L("Profession.Forge.MadeBy", { name: craft.crafter, profession, rank: toInt(craft.rank) }) : "";
  const items = lines.map(l => `<li><strong>${escape(l.name)}${l.cut ? " ✦" : ""}:</strong> ${escape(l.text)}.</li>`);
  if (craft.masterpiece) items.push(`<li><strong>${escape(L("Profession.Masterpiece.Name"))}:</strong> ${escape(L(`Profession.Masterpiece.${craft.masterpiece}`))}.</li>`);
  return `<div class="lhp-craft-note"><p><strong>${escape(quality)} [M${craft.grade}]</strong>${by ? ` · ${escape(by)}` : ""}</p><ul>${items.join("")}</ul></div>`;
}

/**
 * The craft data of a crafted item, with its base kind and list.
 * @param {Item|object} item
 */
export function craftOf(item) {
  const craft = item?.flags?.[SYSTEM_ID]?.craft ?? item?.getFlag?.(SYSTEM_ID, "craft");
  if (!craft?.base) return null;
  return { ...craft, kind: kindOf(craft.base), category: categoryOf(craft.base) };
}

/** What makes two crafted items "the same" for a Fusion: same base and same Magic Grade. */
export function fusionKey(item) {
  const craft = craftOf(item);
  if (!craft) return null;
  const source = craft.base._stats?.compendiumSource || craft.base.name;
  return `${source}|${craft.grade}`;
}

/* -------------------------------------------- */
/*  Scribe and Cook                             */
/* -------------------------------------------- */

/** A roll field (check / damage) with its formulas resolved by the scribe's values. */
function resolvedRoll(values, data) {
  const out = foundry.utils.deepClone(values ?? {});
  out.dice = toInt(values?.dice) + (values?.diceFormula ? Math.max(0, evaluateFormula(values.diceFormula, data) ?? 0) : 0);
  out.mod = toInt(values?.mod) + (values?.formula ? (evaluateFormula(values.formula, data) ?? 0) : 0);
  delete out.diceFormula;
  delete out.formula;
  delete out.label;
  return out;
}

/** Skills a Scribe can copy: used ones (not Constant, not from items), of the character. */
export function copiableSkills(actor) {
  return actor.items.filter(i => (i.type === "skill") && !["Item", "Basic"].includes(i.system.subtype)
    && !/^\s*constant\s*$/i.test(i.system.timing ?? "") && !i.getFlag(SYSTEM_ID, "itemSkill"));
}

/** Battle status a character skill adds to its damage, by damage type (as skill-rolls.mjs does). */
const DAMAGE_POWERS = { physical: "attack", magical: "magic" };

/**
 * A scroll with one of the scribe's skills: anyone uses it once. Usable items roll their numbers as they are, so
 * the scroll keeps the scribe's: the check with the scribe's check, the damage with the scribe's power.
 * @param {Item} skill
 * @param {Actor} scribe
 * @param {number} rank   The scribe's Rank
 */
export function scrollFromSkill(skill, scribe, rank) {
  const data = formulaData(scribe, skill);
  const s = skill.system;
  const check = resolvedRoll(s.check, data);
  if (check.stat) {
    const own = scribe.system.checks?.[check.stat] ?? {};
    check.dice += toInt(own.dice) || 2;
    check.mod += toInt(own.total);
    check.stat = "";
  }
  const damage = resolvedRoll(s.damage, data);
  if ((toInt(damage.dice) || toInt(damage.mod)) && !damage.noPower) {
    const power = scribe.system["battle-status"]?.power ?? {};
    for (const key of [DAMAGE_POWERS[damage.type], damage.recovery ? "restoration" : null].filter(Boolean)) {
      damage.mod += toInt(power[key]?.total);
    }
    damage.noPower = true;
  }
  const effects = skill.effects.filter(e => e.transfer === false).map(effect => {
    const e = effect.toObject();
    delete e._id;
    e.transfer = false;
    e.system.changes = resolveChanges(e.system.changes, data);
    const status = e.flags?.[SYSTEM_ID]?.statusData;
    if (isFormula(status?.value)) status.value = Math.max(1, evaluateFormula(status.value, data) ?? 1);
    if (e.flags?.[SYSTEM_ID]?.conditions) delete e.flags[SYSTEM_ID].conditions;
    return e;
  });
  const useActions = (skill.getFlag(SYSTEM_ID, "useActions") ?? []).map(a => ({
    ...a, ...(isFormula(a.value) ? { value: evaluateFormula(a.value, data) ?? 0 } : {})
  }));
  const sr = toInt(s.skillRank?.value) || 1;
  const note = L("Profession.Copy.Note", { skill: skill.name, sr, name: scribe.name });
  return {
    name: L("Profession.Copy.Name", { name: skill.name }),
    type: "usable",
    img: "icons/sundries/scrolls/scroll-bound-gold-tan.webp",
    system: {
      description: `<div class="lhp-craft-note"><p>${escape(note)}</p></div>${s.description ?? ""}`,
      tags: [...new Set(["Scroll", "Consumable", ...(s.tags ?? [])])],
      timing: s.timing, target: s.target, range: s.range, checkType: "",
      check, damage,
      rank: Math.max(1, toInt(scribe.system.infos?.crank)),
      price: 0
    },
    effects,
    flags: {
      [SYSTEM_ID]: {
        ...(useActions.length ? { useActions } : {}),
        copy: { skill: skill.name, sr, scribe: scribe.name, rank }
      }
    }
  };
}

/** A Banquet: one portion of a food for the whole party (content.mjs feeds every character of the players). */
export function banquetFrom(food, cook) {
  const data = baseData(food);
  data.name = L("Profession.Banquet.Name", { name: food.name });
  data.system.target = "Party";
  data.system.price = toInt(food.system.price) * 2;
  data.flags[SYSTEM_ID] ??= {};
  data.flags[SYSTEM_ID].banquet = true;
  data.system.description = `<div class="lhp-craft-note"><p>${escape(L("Profession.Banquet.Note", { name: cook.name }))}</p></div>${food.system.description ?? ""}`;
  return data;
}

