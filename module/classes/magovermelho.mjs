/**
 * The Red Mage's Motor: the Arsenal. docs/classes.md has the class; AS REGRAS, its page in XI, the rules as the player
 * reads them. It is the Resonant's Spark made the engine of the Magias: the Red Mage chooses a Magia at CR 1, 5 and 10
 * (skills with flags.eternia.magic), and the spells of the Magias feed and spend the class Motor ("@class" in their
 * flags.eternia.motor, see motor.mjs).
 *
 * The mage keeps its pieces in a magic space and has one of them in hand: the Sword, the Armor or the Focus (a wand, a
 * deck of cards, a staff). Its Charge (Carga) grows by 1 at each Setup Process and with every Spell (+1, the big ones
 * +2: their own motor.gain), up to the cap (3, +1 every 5 CR, + the SR of Expanded Arsenal; +2 on the Sealed Weapon
 * Path). The piece in hand gives its power: the Sword, +[Charge×2] to the damage of weapon attacks; the Armor,
 * [Cancel: Charge×2]; the Focus, +[Charge×2] to Spells and heals. Requip swaps the piece: the old one releases its
 * Discharge (Sword: the next weapon attack adds +[Charge×CR]; Armor: [Barrier: Charge×(CR+5)]; Focus: the next Spell or
 * heal adds +[Charge×CR]) and the new one starts with half the Charge, rounded up. The Paths: the Sealed Weapon never
 * swaps in combat (+2 cap), the Panoply has the Charge in the three pieces (half power in hand, a third in the other
 * two), the Lightning Requip doubles the Discharge and starts the new piece at 0. Summoned Blade gives +1 Charge with
 * any piece in hand.
 *
 * State in flags.eternia.motor.magovermelho:
 *   state      "espada" | "armadura" | "foco": the piece in hand (it stays from one combat to the next)
 *   value      Charge
 *   release    { espada, foco }: Discharges waiting for the next weapon attack / Spell or heal
 *   bound      { itemUuid, value, slot }: the Discharge that use took, for its damage roll
 *   prev, prevRound   the piece left and "<combat>.<round>" of the swap (the Apex)
 *   recharge   a Lightning Requip with Charge happened: the next Setup gives +2 more (Quick Recharge)
 *   answered   the attack card that already gave Charge by a Critical (Answering Steel)
 *   ember      Charge the next combat starts with (Mind the Pieces), kept out of combat
 */
import { L } from "../settings.mjs";
import { combatOf, toInt } from "../helpers/utils.mjs";
import {
  areAllies, areEnemies, chooseOption, combatPeers, crOf, hasApex, identifierOf, motorData, pathOf, roundKey,
  setMotor, talentOf, talentRank
} from "./motor.mjs";

export const MAGOVERMELHO_ID = "magovermelho";

/** Identifier of a Red Mage skill. */
const T = name => `${MAGOVERMELHO_ID}-${name}`;

export const PIECES = ["espada", "armadura", "foco"];
const LESSER_PIECES = ["espada", "armadura"];

const DEFAULTS = {
  state: "espada", value: 0, release: { espada: 0, foco: 0 }, bound: null, prev: null, prevRound: null, recharge: false,
  answered: null, ember: 0
};

/** The Path the actor follows (none with only the Lesser Arsenal). */
const path = (actor, lesser) => (lesser ? null : pathOf(actor, MAGOVERMELHO_ID));

/** The pieces the mage can have in hand. */
const piecesOf = lesser => (lesser ? LESSER_PIECES : PIECES);

const tagsOf = item => item?.system?.tags ?? [];

/** Weapon attacks (the Sword's power) and Spells or heals (the Focus's). */
const isWeaponAttack = item => tagsOf(item).includes("Weapon Attack");
const isSpellOrHeal = item => tagsOf(item).includes("Spell") || tagsOf(item).includes("Magic Attack")
  || (item?.system?.damage?.type === "magical") || !!item?.system?.damage?.recovery;

/** Whether a skill rolls damage or healing: what a waiting Discharge is for. */
const rollsDamage = item => !!(item?.system?.damage?.type || item?.system?.damage?.recovery);

/** The piece in hand of a state, for the Motor of the actor (the Lesser one has no Focus). */
const pieceOf = (state, lesser) => (piecesOf(lesser).includes(state) ? state : "espada");

/**
 * How much of the Charge a piece has now: 1 in hand (2 on the Sealed Weapon with the Apex), 1 in the piece just left
 * until the end of that round (the Apex); on the Panoply ½ in hand (1 with Master Piece) and ⅓ in the other two (1 in
 * all of them with the Apex); else 0.
 * @param {Actor} actor
 * @param {object} data     The Motor's state
 * @param {string} piece
 * @param {boolean} lesser
 * @returns {number}
 */
export function shareOf(actor, data, piece, lesser) {
  const followed = path(actor, lesser);
  const apex = !lesser && hasApex(actor, MAGOVERMELHO_ID);
  const here = data.state === piece;
  if (followed === "panoplia") {
    if (apex) return 1;
    if (here) return talentOf(actor, T("peca-mestra")) ? 1 : 0.5;
    return 1 / 3;
  }
  if (here) return (apex && (followed === "arma-selada")) ? 2 : 1;
  const echo = apex && (data.prev === piece) && !!data.prevRound && (data.prevRound === roundKey(actor));
  return echo ? 1 : 0;
}

/** The Sword's or the Focus's bonus to damage and healing now: [Charge × 2] × its share. */
function pieceBonus(actor, data, piece, lesser) {
  return Math.floor(toInt(data.value) * 2 * shareOf(actor, data, piece, lesser));
}

/** The Armor's [Cancel] now: [Charge × 2] (× 3 with Enchanted Cuirass) × its share. */
function armorCancel(actor, data, lesser) {
  const per = talentOf(actor, T("couraca-encantada")) ? 3 : 2;
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
 * The Discharge a piece releases with this much Charge, ×2 on the Lightning Requip: the Sword's and the Focus's wait for
 * the next attack ({ espada, foco }), the Armor's is a [Barrier] (barrier).
 */
function discharge(actor, piece, charge, lesser) {
  const mult = (path(actor, lesser) === "troca-relampago") ? 2 : 1;
  const cr = crOf(actor);
  const out = { espada: 0, foco: 0, barrier: 0 };
  if (charge <= 0) return out;
  if (piece === "armadura") out.barrier = charge * (cr + 5) * mult;
  else out[piece] = charge * cr * mult;
  return out;
}

export const MAGOVERMELHO = {
  id: MAGOVERMELHO_ID,
  i18n: "Motor.MagoVermelho",
  states: PIECES,
  stateColors: { espada: 0xb8261b, armadura: 0x6b7480, foco: 0x7b3fa0 },
  defaults: DEFAULTS,
  costKeyword: "Carga",

  /** The cap of Charge. */
  max(actor, { lesser }) {
    let max = 3 + Math.floor(crOf(actor) / 5);
    if (lesser) max = Math.max(1, Math.floor(max / 2));
    else if (pathOf(actor, MAGOVERMELHO_ID) === "arma-selada") max += 2;
    return max + talentRank(actor, T("arsenal-ampliado"));
  },

  /** The Sealed Weapon: no Requip in combat. */
  issues(actor, item, motor, { lesser }) {
    if ((identifierOf(item) === T("reequipar")) && (path(actor, lesser) === "arma-selada") && combatOf(actor)) {
      return [L("Motor.MagoVermelho.SealedLocked")];
    }
    return [];
  },

  /** Swift Requip: Requip is a Move Action; with the Apex it spends none. */
  actionOf(actor, item, motor, action) {
    if (identifierOf(item) !== T("reequipar")) return action;
    if (hasApex(actor, MAGOVERMELHO_ID)) return "none";
    return talentOf(actor, T("reequipar-veloz")) ? "move" : action;
  },

  /** Requip asks the piece; Requip and the releases set the Charge that stays (after) and the Discharges. */
  async plan(actor, item, motor, { data, lesser, plan }) {
    const id = identifierOf(item);
    const charge = toInt(data.value);
    const followed = path(actor, lesser);
    const release = { espada: toInt(data.release?.espada), foco: toInt(data.release?.foco) };
    if (id === T("reequipar")) {
      const options = piecesOf(lesser).filter(s => s !== data.state);
      const choice = await chooseOption(item.name, options.map(s => ({ value: s, label: L(`Motor.MagoVermelho.State.${s}`) })), {
        hint: L("Motor.MagoVermelho.ChooseSlot", { n: charge })
      });
      if (!choice) return null;
      const freed = discharge(actor, data.state, charge, lesser);
      let kept = Math.ceil(charge / 2);
      if (talentOf(actor, T("carga-continua"))) kept = Math.max(0, charge - 1);
      if (followed === "troca-relampago") kept = hasApex(actor, MAGOVERMELHO_ID) ? Math.ceil(charge / 2) : 0;
      if (talentOf(actor, T("peca-renovada"))) kept += 1;
      plan.set = choice;
      plan.vars = { newValue: kept, barrier: freed.barrier };
      plan.changes = {
        release: { espada: freed.espada || release.espada, foco: freed.foco || release.foco },
        prev: data.state, prevRound: roundKey(actor),
        recharge: (followed === "troca-relampago") && (charge > 0) && !!talentOf(actor, T("recarga-veloz"))
      };
    }
    else if (id === T("selo-rompido")) {
      const freed = discharge(actor, data.state, charge, lesser);
      plan.vars = { newValue: 1, barrier: freed.barrier };
      plan.changes = { release: { espada: freed.espada || release.espada, foco: freed.foco || release.foco } };
    }
    else if (id === T("arsenal-desperto")) {
      const half = Math.floor(charge / 2);
      const cr = crOf(actor);
      plan.vars = { newValue: 0, barrier: half * (cr + 5) };
      plan.changes = { release: { espada: half * cr, foco: half * cr } };
    }
    else if (id === T("cuidar-das-pecas")) plan.changes.ember = 1;
    return plan;
  },

  /** The Charge a Requip or a release leaves. */
  after(actor, item, plan, next) {
    if (Number.isFinite(plan.vars?.newValue)) next.value = plan.vars.newValue;
    return next;
  },

  /**
   * After any use: the Armor's Discharge ([Barrier], on the allies of your square too with Companions' Shield), and the
   * waiting Discharges taken by the next weapon attack or Spell / heal that rolls damage or healing.
   */
  async onUse(actor, { lesser }, item, plan) {
    const barrier = toInt(plan?.vars?.barrier);
    if (barrier > 0) {
      await giveStatus(actor, "barrier", barrier, { caster: actor });
      if ((path(actor, lesser) === "troca-relampago") && talentOf(actor, T("escudo-dos-companheiros"))) {
        for (const ally of combatPeers(actor).filter(a => areAllies(actor, a) && (squaresBetween(actor, a) === 0))) {
          await giveStatus(ally, "barrier", barrier, { caster: actor });
        }
      }
    }
    const data = motorData(actor, MAGOVERMELHO_ID);
    const release = { espada: toInt(data.release?.espada), foco: toInt(data.release?.foco) };
    let bound = null;
    if (rollsDamage(item) && isWeaponAttack(item) && (release.espada > 0)) {
      bound = { itemUuid: item.uuid, value: release.espada, slot: "espada" };
      release.espada = 0;
    }
    else if (rollsDamage(item) && isSpellOrHeal(item) && !isWeaponAttack(item) && (release.foco > 0)) {
      bound = { itemUuid: item.uuid, value: release.foco, slot: "foco" };
      release.foco = 0;
    }
    if (!bound && !data.bound) return;
    await setMotor(actor, MAGOVERMELHO_ID, { ...data, release, bound });
  },

  /** The Armor's [Cancel], in combat. */
  statuses(actor, { lesser, data }) {
    if (!combatOf(actor)) return [];
    const cancel = armorCancel(actor, data, lesser);
    return (cancel > 0) ? [{ key: "armadura", statusId: "cancel", value: cancel }] : [];
  },

  /** The Sword's and the Focus's power, and the Discharge a use took. */
  rollBonuses(actor, item, which, { lesser }) {
    if (which !== "damage") return [];
    const data = motorData(actor, MAGOVERMELHO_ID);
    const out = [];
    const motorName = L("Motor.MagoVermelho.Name");
    if (isWeaponAttack(item)) {
      const bonus = pieceBonus(actor, data, "espada", lesser);
      if (bonus > 0) out.push({ dice: 0, mod: bonus, label: `${motorName}: ${L("Motor.MagoVermelho.State.espada")}` });
    }
    else if (isSpellOrHeal(item)) {
      const bonus = pieceBonus(actor, data, "foco", lesser);
      if (bonus > 0) out.push({ dice: 0, mod: bonus, label: `${motorName}: ${L("Motor.MagoVermelho.State.foco")}` });
    }
    if (data.bound?.itemUuid === item.uuid) out.push({ dice: 0, mod: toInt(data.bound.value), label: L("Motor.MagoVermelho.Discharge") });
    return out;
  },

  /** Discharge Strike: the Sword's Discharge leaves the target [Fissured]. */
  onHit(actor, item) {
    const strike = talentOf(actor, T("golpe-da-descarga"));
    const data = motorData(actor, MAGOVERMELHO_ID);
    if (!strike || (data.bound?.itemUuid !== item?.uuid) || (data.bound?.slot !== "espada")) return [];
    return [{ statusId: "fissured", value: 1, name: strike.name }];
  },

  /** The class tab and the HUD: the Discharges waiting for an attack. */
  display(actor, { data }) {
    const parts = [];
    if (toInt(data.release?.espada) > 0) parts.push(`${L("Motor.MagoVermelho.State.espada")} +${toInt(data.release.espada)}`);
    if (toInt(data.release?.foco) > 0) parts.push(`${L("Motor.MagoVermelho.State.foco")} +${toInt(data.release.foco)}`);
    return parts.length ? { note: L("Motor.MagoVermelho.Waiting", { list: parts.join(", ") }) } : {};
  },

  /* ------------------------------------------ */
  /*  Events                                    */
  /* ------------------------------------------ */

  /** Every combat starts with the piece in hand and the Charge kept by Mind the Pieces. */
  async onCombatStart(actor, { lesser }) {
    const data = motorData(actor, MAGOVERMELHO_ID);
    await setMotor(actor, MAGOVERMELHO_ID, { ...DEFAULTS, state: pieceOf(data.state, lesser), value: toInt(data.ember) });
  },

  /** Setup Process: +1 Charge (+2 with Sworn Piece on the Sealed Weapon; +2 more after a Lightning Requip with Quick Recharge). */
  async onSetup(actor, { lesser }) {
    const data = motorData(actor, MAGOVERMELHO_ID);
    let gain = ((path(actor, lesser) === "arma-selada") && talentOf(actor, T("peca-jurada"))) ? 2 : 1;
    if (data.recharge) gain += 2;
    await setMotor(actor, MAGOVERMELHO_ID, { ...data, value: toInt(data.value) + gain, recharge: false });
  },

  async onCombatEnd(actor, { lesser }) {
    const data = motorData(actor, MAGOVERMELHO_ID);
    await setMotor(actor, MAGOVERMELHO_ID, { ...DEFAULTS, state: pieceOf(data.state, lesser) });
  },

  /** Answering Steel: with the Sword in hand, a weapon attack with a Critical hits: +1 Charge (once per card). */
  async onHitTarget(actor, { lesser }, target, item, message) {
    if (!talentOf(actor, T("aco-que-responde")) || !isWeaponAttack(item) || !areEnemies(actor, target)) return;
    const data = motorData(actor, MAGOVERMELHO_ID);
    const attack = message?.flags?.eternia?.attack?.attack;
    if ((data.state !== "espada") || !attack?.critical || (data.answered === message.id)) return;
    await setMotor(actor, MAGOVERMELHO_ID, { ...data, value: toInt(data.value) + 1, answered: message.id });
  },

  /** Parried Blow: with the Armor in hand, an enemy attack takes HP from you: +1 Charge. */
  async onDamaged(actor, { lesser }, amount, attacker) {
    if (!talentOf(actor, T("golpe-aparado")) || (attacker && !areEnemies(actor, attacker))) return;
    const data = motorData(actor, MAGOVERMELHO_ID);
    if (data.state !== "armadura") return;
    await setMotor(actor, MAGOVERMELHO_ID, { ...data, value: toInt(data.value) + 1 });
  }
};
