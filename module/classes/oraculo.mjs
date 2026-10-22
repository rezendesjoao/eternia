/**
 * The Oracle's Motor: the Burden (Fardo). docs/classes.md has the class; AS REGRAS, page XI, the rules as the
 * player reads them.
 *
 * Every miracle of the class adds to the Burden (+1, the big ones +2), up to the cap (4, +1 every 5 CR). The Burden
 * adds to the miracles (+Burden × 2 to their healing or damage) and it is a curse: from 3 Burden on, the oracle is
 * [Weakness: Burden × 2]; at the cap, also [Cursed] (no healing). The Revelation spends it all at once. Each
 * Mystery (the Paths) changes the curse or how it fades.
 *
 * State in flags.eternia.motor.oraculo:
 *   value   Burden
 *   omen    Burden the next combat starts with (Visions, Touch the Dead), kept out of combat
 */
import { L } from "../settings.mjs";
import { takeDamage } from "../conditions/damage.mjs";
import { combatOf, toInt } from "../helpers/utils.mjs";
import {
  areEnemies, crOf, hasApex, identifierOf, motorData, pathOf, setMotor, skillMotor, talentOf, talentRank
} from "./motor.mjs";

export const ORACULO_ID = "oraculo";

/** Identifier of an Oracle skill. */
const T = name => `oraculo-${name}`;

const DEFAULTS = { state: "revelado", value: 0, omen: 0 };

/** The Path (Mystery) the actor follows (none with only the Lesser Burden). */
const path = (actor, lesser) => (lesser ? null : pathOf(actor, ORACULO_ID));

/** Whether a skill is a miracle of the Oracle (its Motor part says so). */
const isMiracle = item => (skillMotor(item)?.id === ORACULO_ID) && !!skillMotor(item)?.miracle;

/** Whether a skill heals. */
const heals = item => !!item?.system?.damage?.recovery;

/** The Burden the curse starts at: 3, later with Sacred Threshold. */
const threshold = actor => 3 + talentRank(actor, T("limiar-sagrado"));

/** The name of one of the actor's Oracle skills, for the lines of the statuses it gives. */
const nameOf = (actor, key) => talentOf(actor, T(key))?.name ?? "";

/** Give a status to an actor (through the GM when needed), with the oracle as its source. */
const give = (target, id, value, from) => game.eternia.applyStatus(target, id, { value: value || null, from });

/**
 * The curse of a Burden: the statuses it gives now (see statuses).
 * @returns {{key: string, statusId: string, value?: number}[]}
 */
function curseOf(actor, { lesser, data, max }) {
  const burden = toInt(data.value);
  const full = (max > 0) && (burden >= max);
  const followed = path(actor, lesser);
  const apex = !lesser && hasApex(actor, ORACULO_ID);
  const out = [];
  if (!lesser && (burden >= threshold(actor))) {
    if (followed === "chamas") {
      if (!apex) out.push({ key: "curse", statusId: "burning", value: burden });
    }
    else if (followed !== "vida") out.push({ key: "curse", statusId: "weakness", value: burden * 2 });
  }
  if (full && !apex) out.push({ key: "cursed", statusId: "cursed" });
  return out;
}

export const ORACULO = {
  id: ORACULO_ID,
  i18n: "Motor.Oraculo",
  states: ["revelado"],
  defaults: DEFAULTS,
  costKeyword: "Fardo",

  /** The cap of Burden. */
  max(actor, { lesser }) {
    const max = 4 + Math.floor(crOf(actor) / 5);
    return lesser ? Math.max(1, Math.floor(max / 2)) : max;
  },

  /** Visions and Touch the Dead out of combat: the next combat starts with 1 more Burden. Divine Wrath: no Dodge. */
  plan(actor, item, motor, { data, max, lesser, plan }) {
    const id = identifierOf(item);
    if ([T("visoes"), T("tocar-os-mortos")].includes(id) && !combatOf(actor)) plan.changes.omen = toInt(data.omen) + 1;
    if ((id === T("revelacao-ardente")) && !lesser && talentOf(actor, T("ira-divina")) && (max > 0)
      && (plan.spent >= max)) plan.autoHit = true;
    return plan;
  },

  /**
   * The Burden on the miracles: +Burden × 2 to their healing or damage (×3 for the healing on the Mystery of Life and
   * for the damage on the Mystery of Flames; ×1 with the Lesser Burden).
   */
  rollBonuses(actor, item, which, { lesser }) {
    if ((which !== "damage") || !isMiracle(item)) return [];
    const burden = toInt(motorData(actor, ORACULO_ID).value);
    if (!burden) return [];
    const followed = path(actor, lesser);
    const strong = ((followed === "vida") && heals(item)) || ((followed === "chamas") && !heals(item));
    const per = lesser ? 1 : (strong ? 3 : 2);
    return [{ dice: 0, mod: burden * per, label: L("Motor.Oraculo.Name") }];
  },

  /** Purifying Fire (Mystery of Flames): the damage miracles leave the target [Burning: Burden]. */
  onHit(actor, item, { lesser }) {
    if (!isMiracle(item) || heals(item) || (path(actor, lesser) !== "chamas") || !talentOf(actor, T("fogo-purificador"))) return [];
    const burden = toInt(motorData(actor, ORACULO_ID).value);
    return burden ? [{ statusId: "burning", value: burden, name: nameOf(actor, "fogo-purificador") }] : [];
  },

  /** The curse, and at the cap the Prophet's Mantle ([Cancel]) and the Crown of Flames ([Mirror]). */
  statuses(actor, { lesser, data, max }) {
    if (!combatOf(actor)) return [];
    const out = curseOf(actor, { lesser, data, max });
    const burden = toInt(data.value);
    const full = (max > 0) && (burden >= max);
    if (full && !lesser && talentOf(actor, T("manto-do-profeta"))) out.push({ key: "manto", statusId: "cancel", value: burden * 2 });
    if (full && (path(actor, lesser) === "chamas") && talentOf(actor, T("coroa-de-chamas"))) {
      out.push({ key: "coroa", statusId: "mirror", value: burden * 2 });
    }
    return out;
  },

  /** The class tab and the HUD: the curse the oracle is under now. */
  display(actor, ctx) {
    const curse = curseOf(actor, ctx);
    const parts = curse.map(c => L(`Motor.Oraculo.Curse.${c.statusId}`, { n: c.value ?? 0 }));
    return { note: parts.join(" · ") };
  },

  /* ------------------------------------------ */
  /*  Events                                    */
  /* ------------------------------------------ */

  /** Every combat starts with the omens' Burden (Visions, Touch the Dead). */
  async onCombatStart(actor) {
    const data = motorData(actor, ORACULO_ID);
    await setMotor(actor, ORACULO_ID, { ...DEFAULTS, value: toInt(data.omen) });
  },

  async onCombatEnd(actor) {
    await setMotor(actor, ORACULO_ID, { ...DEFAULTS });
  },

  /** Mystery of Life: each healing miracle costs the oracle Burden HP (half with the Prophet). */
  async onUse(actor, { lesser }, item) {
    if ((path(actor, lesser) !== "vida") || !isMiracle(item) || !heals(item) || !combatOf(actor)) return;
    let cost = toInt(motorData(actor, ORACULO_ID).value);
    if (hasApex(actor, ORACULO_ID)) cost = Math.floor(cost / 2);
    if (cost > 0) await takeDamage(actor, cost, { what: item.name, from: actor });
  },

  /**
   * A miracle of this oracle healed someone: Breath of Life ([Regen: Burden × 2]), Raise the Fallen (who rose from
   * 0 HP gets [Last Stand]) and Shared Miracle (Mystery of Life: the oracle gets [Regen: CR ÷ 2 + Burden]).
   */
  async onAnyHealed(actor, { lesser }, target, amount, healer, item) {
    if (!target || (healer?.uuid !== actor.uuid) || !isMiracle(item)) return;
    const burden = toInt(motorData(actor, ORACULO_ID).value);
    if (!lesser && talentOf(actor, T("sopro-de-vida")) && burden) await give(target, "regen", burden * 2, actor);
    const followed = path(actor, lesser);
    if ((followed === "ossos") && talentOf(actor, T("erguer-os-caidos")) && (toInt(target.system.health?.value) === toInt(amount))) {
      await give(target, "lastStand", null, actor);
    }
    if ((followed === "vida") && talentOf(actor, T("milagre-partilhado")) && (target.uuid !== actor.uuid)) {
      await give(actor, "regen", Math.floor(crOf(actor) / 2) + burden, actor);
    }
  },

  /** Mystery of Bones: each enemy that falls takes 1 Burden away (2 with the Prophet); Reaping gives [Barrier]. */
  async onAnyKill(actor, { lesser }, victim) {
    if ((path(actor, lesser) !== "ossos") || !areEnemies(actor, victim)) return;
    const data = motorData(actor, ORACULO_ID);
    const n = hasApex(actor, ORACULO_ID) ? 2 : 1;
    if (toInt(data.value) > 0) await setMotor(actor, ORACULO_ID, { ...data, value: toInt(data.value) - n });
    if (talentOf(actor, T("ceifa"))) await give(actor, "barrier", crOf(actor) + 5, actor);
  }
};
