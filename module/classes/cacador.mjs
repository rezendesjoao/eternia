/**
 * The Hunter's Motor: Aim (Mira). docs/classes.md has the class; AS REGRAS, page XI, the rules as the player
 * reads them.
 *
 * The hunter aims by standing still: +1 Aim at each Setup Process when its token didn't move in the round before
 * (+2 with Shooter's Focus), and +1 with Steady Aim (its Move Action spent without moving). Moving the token loses
 * all the Aim (the Falcon Path loses only 1 for up to 2 Sq; some talents give a free step). Sure Shot (Major, a
 * [Bow], [Crossbow] or [Throwing] weapon) spends it all: each point adds 1D + CR to the damage, and with a full Aim
 * the target is [Exposed]. Cap: 3, +1 every 5 CR (+2 on the Eagle Eye Path, + the SR of Hunter's Patience).
 *
 * State in flags.eternia.motor.cacador:
 *   value   Aim
 *   moved   the token moved since the last Setup Process
 *   free    { key, squares }: a step that keeps the Aim, good for the round "<combat>.<round>"
 *   step    "<combat>.<round>" of the last free step of Shooting on the Move
 *   dove    "<combat>.<round>" of a Falcon Dive: the next Shot that hits gains 1 Aim
 *   high    the High Ground taken in the Briefing: +1 Aim when the combat starts
 */
import { L } from "../settings.mjs";
import { combatOf, toInt } from "../helpers/utils.mjs";
import {
  addToMotor, areEnemies, crOf, hasApex, identifierOf, mainWeaponTags, motorData, pathOf, recentUse, roundKey, setMotor,
  skillMotor, talentOf, talentRank
} from "./motor.mjs";

export const CACADOR_ID = "cacador";

/** The weapons the hunter's shots ask for in the main hand. */
export const RANGED = ["Bow", "Crossbow", "Throwing"];

/** Identifier of a Hunter skill. */
const T = name => `cacador-${name}`;

const DEFAULTS = { state: "firme", value: 0, moved: false, free: null, step: null, dove: null, high: false };

/** The Path the actor follows (none with only the Lesser Aim). */
const path = (actor, lesser) => (lesser ? null : pathOf(actor, CACADOR_ID));

/** Whether the Aim is at its cap. */
const isFull = (data, max) => (max > 0) && (toInt(data.value) >= max);

/** Whether an actor has half its HP or less. */
function wounded(actor) {
  const hp = actor?.system?.health ?? {};
  return (toInt(hp.max) > 0) && ((toInt(hp.value) * 2) <= toInt(hp.max));
}

/** Whether a skill is the basic Identify Enemy (Tracker). */
const identifies = item => String(item?.name ?? "").trim().toLowerCase() === "identificar inimigo";

/**
 * A weapon attack with a [Bow], [Crossbow] or [Throwing] weapon in the main hand that spends no Aim (the Shot, the
 * Basic Weapon Attack…): what Held Breath and Shooting on the Move work with.
 */
function rangedShot(actor, item) {
  if (!(item?.system?.tags ?? []).includes("Weapon Attack") || skillMotor(item)?.spend) return false;
  const tags = mainWeaponTags(actor);
  return RANGED.some(t => tags.includes(t.toLowerCase()));
}

export const CACADOR = {
  id: CACADOR_ID,
  i18n: "Motor.Cacador",
  states: ["firme"],
  defaults: DEFAULTS,
  costKeyword: "Mira",

  /** The cap of Aim. */
  max(actor, { lesser }) {
    let max = 3 + Math.floor(crOf(actor) / 5);
    if (lesser) max = Math.max(1, Math.floor(max / 2));
    else if (pathOf(actor, CACADOR_ID) === "aguia") max += 2;
    return max + talentRank(actor, T("paciencia"));
  },

  /** Sky Eye (the Apex): Steady Aim is a Minor Action. */
  actionOf(actor, item, motor, action) {
    if ((identifierOf(item) === T("firmar")) && hasApex(actor, CACADOR_ID)) return "minor";
    return action;
  },

  /** What a use gains and spends: Steady Aim, the Sure Shot (full Aim, Paths, autoHit), the free steps. */
  plan(actor, item, motor, { data, max, lesser, plan }) {
    const id = identifierOf(item);
    const followed = path(actor, lesser);
    const apex = !lesser && hasApex(actor, CACADOR_ID);
    if (id === T("firmar")) {
      plan.gain = apex ? 2 : 1;
      // Shooter's Breath (Eagle Eye): +1 more without having moved this round
      if ((followed === "aguia") && !data.moved && talentOf(actor, T("respiracao-do-atirador"))) plan.gain += 1;
    }
    if (id === T("tiro-certeiro")) {
      const full = !lesser && isFull(data, max);
      plan.vars.full = full ? 1 : 0;
      // Rain of Arrows: each point adds CR÷2 instead of CR (the whole CR again with the Apex)
      plan.vars.flat = ((followed === "chuva") && !apex) ? Math.floor(crOf(actor) / 2) : crOf(actor);
      plan.vars.cold = (full && talentOf(actor, T("olhar-frio"))) ? 1 : 0;
      if (full && (followed === "aguia") && talentOf(actor, T("tiro-impossivel"))) plan.autoHit = true;
      const targets = [...(game.user?.targets ?? [])].map(t => t.actor).filter(Boolean);
      if (talentOf(actor, T("presa-ferida")) && targets.length && targets.every(wounded)) plan.autoHit = true;
    }
    if (id === T("recuar")) plan.changes.free = { key: roundKey(actor), squares: 2 };
    if (id === T("posto-alto")) plan.changes.high = true;
    return plan;
  },

  /** Held Breath: ranged weapon attacks that spend no Aim add 1D per point of Aim (kept), up to its SR. */
  rollBonuses(actor, item, which) {
    if ((which !== "damage") || !rangedShot(actor, item)) return [];
    const breath = talentOf(actor, T("respiracao-contida"));
    if (!breath) return [];
    const dice = Math.min(toInt(motorData(actor, CACADOR_ID).value), talentRank(actor, T("respiracao-contida")));
    return (dice > 0) ? [{ dice, mod: 0, label: breath.name }] : [];
  },

  /**
   * Statuses on whoever the hunter's arrows hit: the Sure Shot with a full Aim ([Exposed]; [Prone] with Broken
   * Wing), Closed Sky ([Slowed]), the Net Arrow ([Rooted]) and the Fire Arrow ([Burning]).
   */
  onHit(actor, item, { lesser }) {
    const id = identifierOf(item);
    const use = recentUse(item);
    const followed = path(actor, lesser);
    const hits = [];
    if (id === T("tiro-certeiro")) {
      if (toInt(use?.vars?.full)) {
        hits.push({ statusId: "exposed", value: null, name: item.name });
        const wing = (followed === "falcao") && talentOf(actor, T("asa-quebrada"));
        if (wing) hits.push({ statusId: "prone", value: null, name: wing.name });
      }
      const sky = (followed === "chuva") && talentOf(actor, T("ceu-fechado"));
      if (sky) hits.push({ statusId: "slowed", value: null, name: sky.name });
    }
    if (id === T("flecha-rede")) hits.push({ statusId: "rooted", value: null, name: item.name });
    if ((id === T("flecha-incendiaria")) && toInt(use?.spent)) {
      hits.push({ statusId: "burning", value: toInt(use.spent) * (Math.floor(crOf(actor) / 2) + 2), name: item.name });
    }
    return hits;
  },

  /** The class tab and the HUD: a full Aim, whether the token moved this round, a free step. */
  display(actor, { lesser, data, max }) {
    const notes = [];
    if (data.moved && combatOf(actor)) notes.push(L("Motor.Cacador.Moved"));
    if (data.free?.key && (data.free.key === roundKey(actor))) notes.push(L("Motor.Cacador.FreeStep", { n: toInt(data.free.squares) }));
    return { ready: !lesser && isFull(data, max), readyLabel: L("Motor.Cacador.Ready"), note: notes.join(" · ") };
  },

  /* ------------------------------------------ */
  /*  Events                                    */
  /* ------------------------------------------ */

  /** Every combat starts with the Aim of First Arrow and of the High Ground. */
  async onCombatStart(actor) {
    const data = motorData(actor, CACADOR_ID);
    const start = talentRank(actor, T("primeira-flecha")) + (data.high ? 1 : 0);
    await setMotor(actor, CACADOR_ID, { ...DEFAULTS, value: start });
  },

  /**
   * Setup Process: +1 Aim when the token didn't move in the round before (+2 with Shooter's Focus), +1 hidden with
   * Patient Ambush; never on the Eagle Eye Path, nor with the Lesser Aim. The round starts unmoved.
   */
  async onSetup(actor, { lesser }) {
    const data = motorData(actor, CACADOR_ID);
    let gain = 0;
    if (!lesser && (path(actor, lesser) !== "aguia")) {
      if (!data.moved) gain += talentOf(actor, T("concentracao")) ? 2 : 1;
      if (actor.statuses?.has("hidden") && talentOf(actor, T("tocaia"))) gain += 1;
    }
    await setMotor(actor, CACADOR_ID, { ...data, value: toInt(data.value) + gain, moved: false });
  },

  async onCombatEnd(actor) {
    await setMotor(actor, CACADOR_ID, { ...DEFAULTS });
  },

  /**
   * The token moved: the Aim is lost, unless a free step covers it (Shooting on the Move, Fall Back and Shoot); on
   * the Falcon Path up to 2 Sq (4 with the Apex) only take 1, and a move of 2 Sq or more readies the Falcon Dive.
   */
  async onMove(actor, { lesser }, squares) {
    const data = motorData(actor, CACADOR_ID);
    const key = roundKey(actor);
    const next = { ...data, moved: true };
    if (data.free && (data.free.key === key) && (squares <= toInt(data.free.squares))) next.free = null;
    else {
      const followed = path(actor, lesser);
      const reach = hasApex(actor, CACADOR_ID) ? 4 : 2;
      next.value = ((followed === "falcao") && (squares <= reach)) ? Math.max(0, toInt(data.value) - 1) : 0;
      if ((followed === "falcao") && (squares >= 2) && talentOf(actor, T("mergulho"))) next.dove = key;
    }
    await setMotor(actor, CACADOR_ID, next);
  },

  /**
   * Shooting on the Move: after a ranged weapon attack that spends no Aim, once a round, a free step of 1 Sq.
   * Tracker: Identify Enemy gives 1 Aim.
   */
  async onUse(actor, { lesser }, item) {
    const key = roundKey(actor);
    if (!key) return;
    if (identifies(item) && talentOf(actor, T("rastreador"))) {
      await addToMotor(actor, CACADOR_ID, 1);
      return;
    }
    if (!rangedShot(actor, item) || !talentOf(actor, T("tiro-em-movimento"))) return;
    const data = motorData(actor, CACADOR_ID);
    if (data.step === key) return;
    await setMotor(actor, CACADOR_ID, { ...data, step: key, free: { key, squares: 1 } });
  },

  /** Falcon Dive: the first Shot that hits after the dive gains 1 Aim. */
  async onHitTarget(actor, { lesser }, target, item) {
    if (identifierOf(item) !== T("disparo")) return;
    const data = motorData(actor, CACADOR_ID);
    if (!data.dove || (data.dove !== roundKey(actor))) return;
    await setMotor(actor, CACADOR_ID, { ...data, value: toInt(data.value) + 1, dove: null });
  },

  /** Clean Kill: an attack of the hunter leaves an enemy at 0 HP: +1 Aim. */
  async onKill(actor, { lesser }, target, item) {
    if (!talentOf(actor, T("abate-limpo")) || !item || (item.actor?.uuid !== actor.uuid) || !areEnemies(actor, target)) return;
    await addToMotor(actor, CACADOR_ID, 1);
  }
};
