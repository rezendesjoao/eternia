/**
 * The Resonant's Motor: the Spark (Centelha). docs/classes.md has the class; AS REGRAS, page XI, the rules as the
 * player reads them.
 *
 * The spark lives in one of the resonant's pieces (the weapon, the armor or the jewel, an accessory) and its Glow
 * (Brilho) grows by 1 at each Setup Process, up to the cap (3, +1 every 5 CR, + the SR of Growing Resonance; +2 on
 * the Single Icon Path). Where it is, it gives its power: in the weapon, the weapon attacks add +[Glow×2] to their
 * damage; in the armor, [Cancel: Glow×2]; in the jewel, the magic attacks and the heals add +[Glow×2]. Leap the
 * Spark moves it to another piece: the old one releases its Awakening (weapon: the next weapon attack adds
 * +[Glow×CR]; armor: [Barrier: Glow×(CR+5)]; jewel: the next magic attack or heal adds +[Glow×CR]) and the new one
 * starts with half the Glow, rounded up. The Paths: the Single Icon never leaps in combat (+2 cap), the Triad has
 * the spark in the three pieces at half power, the Supernova doubles the Awakening and starts the new piece at 0.
 *
 * State in flags.eternia.motor.ressonante:
 *   state      "arma" | "armadura" | "joia"
 *   value      Glow
 *   release    { arma, joia }: Awakenings waiting for the next weapon attack / magic attack or heal
 *   bound      { itemUuid, value, slot }: the Awakening that use took, for its damage roll
 *   prev, prevRound   the piece the spark left and "<combat>.<round>" of the leap (the Apex)
 *   collapse   a Supernova Awakening happened: the next Setup gives +2 more (Stellar Collapse)
 *   sang       the attack card that already gave Glow by a Critical (Singing Blade)
 */
import { L } from "../settings.mjs";
import { combatOf, toInt } from "../helpers/utils.mjs";
import {
  areAllies, areEnemies, chooseOption, combatPeers, crOf, hasApex, identifierOf, motorData, pathOf, roundKey,
  setMotor, talentOf, talentRank
} from "./motor.mjs";

export const RESSONANTE_ID = "ressonante";

/** Identifier of a Resonant skill. */
const T = name => `ressonante-${name}`;

export const SLOTS = ["arma", "armadura", "joia"];
const LESSER_SLOTS = ["arma", "armadura"];

const DEFAULTS = { state: "arma", value: 0, release: { arma: 0, joia: 0 }, bound: null, prev: null, prevRound: null, collapse: false, sang: null };

/** The Path the actor follows (none with only the Lesser Spark). */
const path = (actor, lesser) => (lesser ? null : pathOf(actor, RESSONANTE_ID));

/** The pieces the spark can be in. */
const slotsOf = lesser => (lesser ? LESSER_SLOTS : SLOTS);

/** Weapon attacks (the weapon's power) and magic attacks or heals (the jewel's). */
const isWeaponAttack = item => (item?.system?.tags ?? []).includes("Weapon Attack");
const isMagicOrHeal = item => (item?.system?.tags ?? []).includes("Magic Attack")
  || (item?.system?.damage?.type === "magical") || !!item?.system?.damage?.recovery;

/**
 * How much of the spark a piece has now: 1 where it is (2 on the Single Icon with the Apex), 1 in the piece it just
 * left until the end of that round (the Apex), ½ in the others on the Triad (1 with Harmony where it is, and in all
 * of them with the Apex), else 0.
 * @param {Actor} actor
 * @param {object} data     The Motor's state
 * @param {string} slot
 * @param {boolean} lesser
 * @returns {number}
 */
export function shareOf(actor, data, slot, lesser) {
  const followed = path(actor, lesser);
  const apex = !lesser && hasApex(actor, RESSONANTE_ID);
  const here = data.state === slot;
  if (followed === "triade") {
    if (apex || (here && talentOf(actor, T("harmonia")))) return 1;
    return 0.5;
  }
  if (here) return (apex && (followed === "icone")) ? 2 : 1;
  const echo = apex && (data.prev === slot) && !!data.prevRound && (data.prevRound === roundKey(actor));
  return echo ? 1 : 0;
}

/** The weapon's or the jewel's bonus to damage and healing now: [Glow × 2] × its share. */
function pieceBonus(actor, data, slot, lesser) {
  return Math.floor(toInt(data.value) * 2 * shareOf(actor, data, slot, lesser));
}

/** The armor's [Cancel] now: [Glow × 2] (× 3 with Living Cuirass) × its share. */
function armorCancel(actor, data, lesser) {
  const per = talentOf(actor, T("couraca-viva")) ? 3 : 2;
  return Math.floor(toInt(data.value) * per * shareOf(actor, data, "armadura", lesser));
}

/** Give a status to an actor, as a skill's effect would (status-links.mjs: loaded here, it reaches back to motor.mjs). */
async function giveStatus(actor, id, value, { caster = null, expires = "endOfScene" } = {}) {
  const { giveEffects, statusEffectData } = await import("../chat/status-links.mjs");
  return giveEffects(actor, [statusEffectData(id, value, "", { caster, expires })]);
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
 * The Awakenings a piece releases with this much Glow, ×2 on the Supernova: the weapon's and the jewel's wait for
 * the next attack ({ arma, joia }), the armor's is a [Barrier] (barrier).
 */
function awakening(actor, slot, glow, lesser) {
  const mult = (path(actor, lesser) === "supernova") ? 2 : 1;
  const cr = crOf(actor);
  const out = { arma: 0, joia: 0, barrier: 0 };
  if (glow <= 0) return out;
  if (slot === "armadura") out.barrier = glow * (cr + 5) * mult;
  else out[slot] = glow * cr * mult;
  return out;
}

export const RESSONANTE = {
  id: RESSONANTE_ID,
  i18n: "Motor.Ressonante",
  states: SLOTS,
  stateColors: { arma: 0xb8261b, armadura: 0x6b7480, joia: 0x2f8f8f },
  defaults: DEFAULTS,
  costKeyword: "Brilho",

  /** The cap of Glow. */
  max(actor, { lesser }) {
    let max = 3 + Math.floor(crOf(actor) / 5);
    if (lesser) max = Math.max(1, Math.floor(max / 2));
    else if (pathOf(actor, RESSONANTE_ID) === "icone") max += 2;
    return max + talentRank(actor, T("ressonancia-crescente"));
  },

  /** The Single Icon: the spark doesn't leap in combat. */
  issues(actor, item, motor, { lesser }) {
    if ((identifierOf(item) === T("saltar-a-centelha")) && (path(actor, lesser) === "icone") && combatOf(actor)) {
      return [L("Motor.Ressonante.IconLocked")];
    }
    return [];
  },

  /** Light Leap: Leap the Spark is a Move Action; with the Apex it spends none. */
  actionOf(actor, item, motor, action) {
    if (identifierOf(item) !== T("saltar-a-centelha")) return action;
    if (hasApex(actor, RESSONANTE_ID)) return "none";
    return talentOf(actor, T("salto-leve")) ? "move" : action;
  },

  /** The leap asks the piece; the leap and the releases set the Glow that stays (after) and the Awakenings. */
  async plan(actor, item, motor, { data, lesser, plan }) {
    const id = identifierOf(item);
    const glow = toInt(data.value);
    const followed = path(actor, lesser);
    const release = { arma: toInt(data.release?.arma), joia: toInt(data.release?.joia) };
    if (id === T("saltar-a-centelha")) {
      const options = slotsOf(lesser).filter(s => s !== data.state);
      const choice = await chooseOption(item.name, options.map(s => ({ value: s, label: L(`Motor.Ressonante.State.${s}`) })), {
        hint: L("Motor.Ressonante.ChooseSlot", { n: glow })
      });
      if (!choice) return null;
      const freed = awakening(actor, data.state, glow, lesser);
      let kept = Math.ceil(glow / 2);
      if (talentOf(actor, T("eco-duradouro"))) kept = Math.max(0, glow - 1);
      if (followed === "supernova") kept = hasApex(actor, RESSONANTE_ID) ? Math.ceil(glow / 2) : 0;
      if (talentOf(actor, T("faisca-residual"))) kept += 1;
      plan.set = choice;
      plan.vars = { newValue: kept, barrier: freed.barrier };
      plan.changes = {
        release: { arma: freed.arma || release.arma, joia: freed.joia || release.joia },
        prev: data.state, prevRound: roundKey(actor),
        collapse: (followed === "supernova") && (glow > 0) && !!talentOf(actor, T("colapso-estelar"))
      };
    }
    else if (id === T("avatar-da-peca")) {
      const freed = awakening(actor, data.state, glow, lesser);
      plan.vars = { newValue: 1, barrier: freed.barrier };
      plan.changes = { release: { arma: freed.arma || release.arma, joia: freed.joia || release.joia } };
    }
    else if (id === T("acorde-final")) {
      const half = Math.floor(glow / 2);
      const cr = crOf(actor);
      plan.vars = { newValue: 0, barrier: half * (cr + 5) };
      plan.changes = { release: { arma: half * cr, joia: half * cr } };
    }
    else if (id === T("golpe-ressonante") && (data.state !== "arma")) plan.gain = 0;
    return plan;
  },

  /** The Glow a leap or a release leaves. */
  after(actor, item, plan, next) {
    if (Number.isFinite(plan.vars?.newValue)) next.value = plan.vars.newValue;
    return next;
  },

  /**
   * After any use: the armor's Awakening ([Barrier], on the allies of your square too with Shard of Light), and the
   * waiting Awakenings taken by the next weapon attack or magic attack / heal.
   */
  async onUse(actor, { lesser }, item, plan) {
    const barrier = toInt(plan?.vars?.barrier);
    if (barrier > 0) {
      await giveStatus(actor, "barrier", barrier, { caster: actor });
      if ((path(actor, lesser) === "supernova") && talentOf(actor, T("estilhaco-de-luz"))) {
        for (const ally of combatPeers(actor).filter(a => areAllies(actor, a) && (squaresBetween(actor, a) === 0))) {
          await giveStatus(ally, "barrier", barrier, { caster: actor });
        }
      }
    }
    const data = motorData(actor, RESSONANTE_ID);
    const release = { arma: toInt(data.release?.arma), joia: toInt(data.release?.joia) };
    let bound = null;
    if (isWeaponAttack(item) && (release.arma > 0)) {
      bound = { itemUuid: item.uuid, value: release.arma, slot: "arma" };
      release.arma = 0;
    }
    else if (isMagicOrHeal(item) && (release.joia > 0) && !isWeaponAttack(item)) {
      bound = { itemUuid: item.uuid, value: release.joia, slot: "joia" };
      release.joia = 0;
    }
    if (!bound && !data.bound) return;
    await setMotor(actor, RESSONANTE_ID, { ...data, release, bound });
  },

  /** The armor's [Cancel], in combat. */
  statuses(actor, { lesser, data }) {
    if (!combatOf(actor)) return [];
    const cancel = armorCancel(actor, data, lesser);
    return (cancel > 0) ? [{ key: "egide", statusId: "cancel", value: cancel }] : [];
  },

  /** The weapon's and the jewel's power, and the Awakening a use took. */
  rollBonuses(actor, item, which, { lesser }) {
    if (which !== "damage") return [];
    const data = motorData(actor, RESSONANTE_ID);
    const out = [];
    const motorName = L("Motor.Ressonante.Name");
    if (isWeaponAttack(item)) {
      const bonus = pieceBonus(actor, data, "arma", lesser);
      if (bonus > 0) out.push({ dice: 0, mod: bonus, label: `${motorName}: ${L("Motor.Ressonante.State.arma")}` });
    }
    else if (isMagicOrHeal(item)) {
      const bonus = pieceBonus(actor, data, "joia", lesser);
      if (bonus > 0) out.push({ dice: 0, mod: bonus, label: `${motorName}: ${L("Motor.Ressonante.State.joia")}` });
    }
    if (data.bound?.itemUuid === item.uuid) out.push({ dice: 0, mod: toInt(data.bound.value), label: L("Motor.Ressonante.Awakening") });
    return out;
  },

  /** Resonant Cut: the weapon's Awakening leaves the target [Fissured]. */
  onHit(actor, item) {
    const cut = talentOf(actor, T("corte-ressoante"));
    const data = motorData(actor, RESSONANTE_ID);
    if (!cut || (data.bound?.itemUuid !== item?.uuid) || (data.bound?.slot !== "arma")) return [];
    return [{ statusId: "fissured", value: 1, name: cut.name }];
  },

  /** The class tab and the HUD: the Awakenings waiting for an attack. */
  display(actor, { data }) {
    const parts = [];
    if (toInt(data.release?.arma) > 0) parts.push(`${L("Motor.Ressonante.State.arma")} +${toInt(data.release.arma)}`);
    if (toInt(data.release?.joia) > 0) parts.push(`${L("Motor.Ressonante.State.joia")} +${toInt(data.release.joia)}`);
    return parts.length ? { note: L("Motor.Ressonante.Waiting", { list: parts.join(", ") }) } : {};
  },

  /* ------------------------------------------ */
  /*  Events                                    */
  /* ------------------------------------------ */

  /** Every combat starts with the spark in the weapon (the Single Icon keeps its piece) and no Glow. */
  async onCombatStart(actor, { lesser }) {
    const data = motorData(actor, RESSONANTE_ID);
    const state = ((path(actor, lesser) === "icone") && SLOTS.includes(data.state)) ? data.state : "arma";
    await setMotor(actor, RESSONANTE_ID, { ...DEFAULTS, state });
  },

  /** Setup Process: +1 Glow (+2 with Relic on the Single Icon; +2 more after a Supernova with Stellar Collapse). */
  async onSetup(actor, { lesser }) {
    const data = motorData(actor, RESSONANTE_ID);
    let gain = ((path(actor, lesser) === "icone") && talentOf(actor, T("reliquia"))) ? 2 : 1;
    if (data.collapse) gain += 2;
    await setMotor(actor, RESSONANTE_ID, { ...data, value: toInt(data.value) + gain, collapse: false });
  },

  async onCombatEnd(actor, { lesser }) {
    const data = motorData(actor, RESSONANTE_ID);
    const state = ((path(actor, lesser) === "icone") && SLOTS.includes(data.state)) ? data.state : "arma";
    await setMotor(actor, RESSONANTE_ID, { ...DEFAULTS, state });
  },

  /** Singing Blade: with the spark in the weapon, a weapon attack with a Critical hits: +1 Glow (once per card). */
  async onHitTarget(actor, { lesser }, target, item, message) {
    if (!talentOf(actor, T("lamina-que-canta")) || !isWeaponAttack(item) || !areEnemies(actor, target)) return;
    const data = motorData(actor, RESSONANTE_ID);
    const attack = message?.flags?.eternia?.attack?.attack;
    if ((data.state !== "arma") || !attack?.critical || (data.sang === message.id)) return;
    await setMotor(actor, RESSONANTE_ID, { ...data, value: toInt(data.value) + 1, sang: message.id });
  },

  /** Aegis Retort: with the spark in the armor, an enemy attack takes HP from you: +1 Glow. */
  async onDamaged(actor, { lesser }, amount, attacker) {
    if (!talentOf(actor, T("revide-da-egide")) || (attacker && !areEnemies(actor, attacker))) return;
    const data = motorData(actor, RESSONANTE_ID);
    if (data.state !== "armadura") return;
    await setMotor(actor, RESSONANTE_ID, { ...data, value: toInt(data.value) + 1 });
  }
};
