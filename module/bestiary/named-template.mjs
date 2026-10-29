/**
 * The named beast (fera com nome): the template that turns a monster into the one a whole guild goes after, without
 * Foundry (bestiary/named.mjs gives it the button; the bestiary's generator, the beasts of the compendium). From the
 * monster's data it makes a new one: Level +2, every attribute +1, Defenses +3, Evasion and Resistance +1, Initiative
 * +1, HP ×1.25 and then ×2 with its pack or ×4 alone, 3 Fate, the [Boss] tag (not [Mob]), Hate ×+1, Identification +2,
 * its attacks +1 to hit and the damage of the new Level (scaleDamage: the common's of each Level, docs/matematica.md),
 * [Fate 1] on its strongest attack (it hits everyone engaged with it, as the bosses of the Guide), its drops ×4 plus an
 * Anima-mundi of the Level + 1 and a [Material-Base] of the Level, fixed, the XP of a boss of its new Level (alone, a
 * solo boss's), and one Mark of the Weight (MARKS), a passive skill of its own.
 */
import { materialPrice } from "../economy/data.mjs";
import { monsterXpValue } from "../experience/data.mjs";

/** The Marks of the Weight: what the named beast has that the others don't. */
export const MARKS = ["skin", "eyes", "fury", "sparks", "regen", "breath"];

const int = value => Math.trunc(Number(value) || 0);
const html = text => `<p>${text}</p>`;

/** The average damage of the common's main attack at Levels 1 to 10 (docs/matematica.md, "O comum de cada NP"). */
const COMMON = [29, 29, 29, 38, 47, 53, 63, 78, 78, 97, 104];

/** The average damage of the common at a Level: from Level 11 on, the Guide's 2d6 + (57 + 4.7 a Level) × (1.10 + 0.05 × Level). */
function commonDamage(level) {
  if (level <= 10) return COMMON[Math.max(1, level)];
  return (7 + 57 + (4.7 * (level - 10))) * (1.10 + (0.05 * level));
}

/**
 * A damage at one Level carried to another, in the proportion of the common's: the dice stay, the fixed part changes (a
 * creature that hits less than the common keeps hitting less, by as much).
 * @returns {number}   The new fixed part
 */
export function scaleDamage(dice, mod, from, to) {
  const average = (3.5 * int(dice)) + int(mod);
  return Math.round((average * commonDamage(to) / commonDamage(from)) - (3.5 * int(dice)));
}

/** The effect data of a Mark's passive skill (transferred to the beast). */
function passive(id, name, img, { changes = [], flags = {} } = {}) {
  return {
    _id: id, name, img, type: "base", transfer: true, disabled: false, tint: "#ffffff", origin: null, statuses: [], sort: 0,
    duration: { value: null, units: "seconds", expiry: null, expired: false }, description: "", start: null, showIcon: 1,
    system: { changes: changes.map(c => ({ key: c.key, type: "add", value: String(c.value), phase: "initial", priority: null })) },
    flags: { eternia: flags }
  };
}

/** A skill of the beast. */
function skill(id, { name, img, timing, text, tags = [], range = "-", target = "-", limit = "-", check, damage, flags, effects = [] }) {
  return {
    _id: id, name, type: "skill", img,
    system: {
      description: text, tags, timing, checkType: "", range, target, subtype: "Monster", skillRank: { value: 1, max: 1 },
      cost: "-", limit, macroeffect: "",
      check: { stat: "", dice: check?.dice ?? 0, mod: check?.mod ?? 0, vs: check?.vs ?? "" },
      damage: { dice: damage?.dice ?? 0, mod: damage?.mod ?? 0, type: damage?.type ?? "", recovery: false, noPower: false }
    },
    effects, sort: 50000, ownership: { default: 0 }, flags: flags ? { eternia: flags } : {}
  };
}

/**
 * The Mark of the Weight of a named beast, as a skill (and its effects).
 * @param {string} mark   One of MARKS
 * @param {number} rank   The beast's new Level
 * @param {() => string} newId
 * @param {(key: string, data?: object) => string} t   The texts (pt-BR: the table's language)
 */
export function markSkill(mark, rank, newId, t) {
  const id = newId();
  switch (mark) {
    case "skin": return skill(id, {
      name: t("skin.name"), img: "icons/commodities/gems/gem-cluster-teal.webp", timing: "Constant", text: html(t("skin.text", { n: rank })),
      effects: [passive(newId(), t("skin.name"), "icons/commodities/gems/gem-cluster-teal.webp", { changes: [{ key: "eternia.passive.cancel", value: rank }] })]
    });
    case "eyes": return skill(id, {
      name: t("eyes.name"), img: "icons/magic/perception/eye-ringed-glow-angry-small-teal.webp", timing: "Constant", text: html(t("eyes.text")),
      effects: [passive(newId(), t("eyes.name"), "icons/magic/perception/eye-ringed-glow-angry-small-teal.webp", {
        changes: [{ key: "system.checks.evasion.dice", value: 1 }], flags: { immune: ["blinded", "frightened", "confused"] }
      })]
    });
    case "fury": return skill(id, {
      name: t("fury.name"), img: "icons/magic/control/fear-fright-monster-red.webp", timing: "Constant", text: html(t("fury.text", { n: rank })),
      flags: { monster: { rule: "threshold", below: 0.5, statuses: [{ statusId: "berserk", value: rank }, { statusId: "hasted" }] } }
    });
    case "sparks": return skill(id, {
      name: t("sparks.name"), img: "icons/magic/lightning/bolt-strike-blue.webp", timing: "Constant", text: html(t("sparks.text", { n: Math.max(2, Math.floor(rank / 2)) })),
      effects: [passive(newId(), t("sparks.name"), "icons/magic/lightning/bolt-strike-blue.webp", {
        flags: { struckStatus: { statusId: "shocked", value: Math.max(2, Math.floor(rank / 2)) } }
      })]
    });
    case "regen": return skill(id, {
      name: t("regen.name"), img: "icons/magic/life/heart-cross-strong-green.webp", timing: "Constant", text: html(t("regen.text", { n: rank * 2 })),
      flags: { monster: { rule: "struck", tags: ["Flame"], strip: ["regen"] } },
      effects: [passive(newId(), t("regen.name"), "icons/magic/life/heart-cross-strong-green.webp", { flags: { trait: { immortal: { regen: String(rank * 2) } } } })]
    });
    default: return skill(id, {
      name: t("breath.name"), img: "icons/magic/air/wind-vortex-swirl-purple.webp", timing: "Major", tags: ["Magic Attack"], range: "2Sq", target: "Area",
      check: { dice: 3, mod: Math.max(3, Math.floor(rank / 2) + 2), vs: "resistance" }, damage: { dice: 2, mod: rank * 6, type: "magical" },
      flags: { monster: { rule: "recharge", min: 5 } },
      text: html(t("breath.text", { n: rank * 6 }))
    });
  }
}

/**
 * The named beast made from a monster's data.
 * @param {object} data   The monster's data (an actor's toObject, or the compendium's JSON)
 * @param {object} options
 * @param {string} options.name          Its name
 * @param {boolean} [options.solo]       It comes alone (HP ×4) or with its pack (HP ×2)
 * @param {string} options.mark          One of MARKS
 * @param {() => string} options.newId   A new id for the documents it creates
 * @param {(level: number) => object|null} options.catalyst   The item data of the Anima-mundi of a level
 * @param {(key: string, data?: object) => string} options.t   The texts
 * @returns {object}   The new actor's data (no _id)
 */
export function nameBeast(data, { name, solo = false, mark, newId, catalyst, t }) {
  const out = structuredClone(data);
  for (const key of ["_id", "_key", "folder", "sort", "_stats"]) delete out[key];
  // The statuses it had on it stay behind (a new creature)
  out.effects = (out.effects ?? []).filter(e => !e.statuses?.length);
  const s = out.system;
  const from = data.name;
  const before = int(s.rank) || 1;
  const rank = before + 2;
  out.name = name;
  s.rank = rank;
  for (const key of ["str", "dex", "pow", "int"]) if (s.attributes?.[key]) s.attributes[key].mod = int(s.attributes[key].mod) + 1;
  const hp = Math.round(int(s.health?.max) * 1.25 * (solo ? 4 : 2));
  s.health = { ...s.health, value: hp, max: hp };
  s.fate = { ...s.fate, value: 3, max: 3 };
  s["battle-status"].defense.phys = int(s["battle-status"].defense.phys) + 3;
  s["battle-status"].defense.magic = int(s["battle-status"].defense.magic) + 3;
  s["battle-status"].initiative = int(s["battle-status"].initiative) + 1;
  for (const key of ["evasion", "resistance"]) if (s.checks?.[key]) s.checks[key].mod = int(s.checks[key].mod) + 1;
  s.tags = [...new Set([...(s.tags ?? []).filter(tag => tag !== "Mob"), "Boss"])];
  s.hateMultiplier = String((int(s.hateMultiplier) || 1) + 1);
  s.idendification = String((int(s.idendification) || 2) + 2);
  s.description = html(t("header", { from, before, rank, mark: t(`${mark}.name`) })) + (s.description ?? "");

  const items = [];
  let strongest = null;
  for (const item of out.items ?? []) {
    const copy = structuredClone(item);
    copy._id = newId();
    delete copy._key;
    for (const effect of copy.effects ?? []) { effect._id = newId(); delete effect._key; }
    if (copy.type === "skill") {
      const dmg = copy.system.damage ?? {};
      if ((int(dmg.dice) || int(dmg.mod)) && !dmg.recovery) {
        const mod = scaleDamage(dmg.dice, dmg.mod, before, rank);
        // The damage written in the text follows ("2d6 + 22" → "2d6 + 40")
        if (copy.system.description && int(dmg.dice)) {
          copy.system.description = copy.system.description.replace(new RegExp(`(${int(dmg.dice)}d6\\s*\\+\\s*)${int(dmg.mod)}\\b`, "g"), `$1${mod}`);
        }
        dmg.mod = mod;
        const average = (3.5 * int(dmg.dice)) + mod;
        if (["evasion", "resistance"].includes(copy.system.check?.vs) && (!strongest || (average > strongest.average))) strongest = { copy, average };
      }
      if (copy.system.check && ["evasion", "resistance"].includes(copy.system.check.vs)) copy.system.check.mod = int(copy.system.check.mod) + 1;
    }
    const drop = copy.flags?.eternia?.drop;
    if (drop) {
      if (drop.gold) drop.gold = `(${drop.gold})*4`;
      else drop.qty = (int(drop.qty) || 1) * 4;
    }
    items.push(copy);
  }
  // [Fate 1] on its strongest attack, as the Guide's bosses (unless it has one already)
  if (strongest && !/\[(Destino|Fate) 1\]/.test(strongest.copy.system.description ?? "")) {
    strongest.copy.system.description = (strongest.copy.system.description ?? "") + html(t("fate1"));
  }
  items.push(markSkill(mark, rank, newId, t));
  const anima = catalyst(Math.min(rank + 1, 10));
  if (anima) {
    const copy = structuredClone(anima);
    copy._id = newId();
    delete copy._key;
    copy.flags = { ...(copy.flags ?? {}), eternia: { ...(copy.flags?.eternia ?? {}), drop: { fixed: true, qty: 1 } } };
    items.push(copy);
  }
  items.push({
    _id: newId(), name: t("trophy.name", { name }), type: "gear", img: "icons/commodities/treasure/plaque-skull-blue-green.webp",
    system: { description: html(t("trophy.text", { name })), tags: ["Core Material"], rank, price: materialPrice(rank), equipped: false,
      skillText: "", linkedSkillUuid: "", timing: "", checkType: "", range: "", target: "" },
    effects: [], ownership: { default: 0 }, flags: { eternia: { drop: { fixed: true, qty: 1 } } }
  });
  out.items = items;
  // Its XP: a boss of its new Level, with its pack (4 commons) or alone (6), as its drops (experience/data.mjs)
  out.flags = { ...(out.flags ?? {}), eternia: { ...(out.flags?.eternia ?? {}), named: { from, mark, solo: !!solo, rank: before },
    xp: monsterXpValue(rank, { kind: solo ? "solo" : "boss" }) } };
  if (out.prototypeToken) {
    out.prototypeToken.name = name;
    if (out.prototypeToken.texture) {
      out.prototypeToken.texture.scaleX = 1.2;
      out.prototypeToken.texture.scaleY = 1.2;
    }
  }
  return out;
}
