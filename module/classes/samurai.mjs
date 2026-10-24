/**
 * The Samurai's Motor: the Sheath (Bainha). docs/classes.md has the class; AS REGRAS, page XI, the rules as the
 * player reads them.
 *
 * The blade is sheathed or drawn; sheathed, it gathers Cuts (Cortes) at each Setup Process, up to the cap
 * (2, +1 every 5 CR, +2 on the Full Moon Path, + the SR of Long Sheath). The Iai (Initiative, it spends the
 * round's Major Action) draws and spends every Cut: each adds 2D + CR to its damage, and with a full Sheath it
 * is a Perfect Cut (automatic hit, + [CR×2+10]). Any other weapon attack draws the blade and loses the Cuts.
 *
 * State in flags.eternia.motor.samurai:
 *   state   "sheathed" | "drawn"
 *   value   Cuts
 *   last    Cuts spent by the last draw (Echo of Steel)
 *   first   no Iai yet in this combat (First Blade)
 *   perfectLast  the last Iai was a Perfect Cut (Eclipse)
 *   attacked     "<combat>.<round>" of the last attack (Lunar Tide)
 */
import { L } from "../settings.mjs";
import { takeDamage } from "../conditions/damage.mjs";
import { combatOf, toInt } from "../helpers/utils.mjs";
import {
  areEnemies as enemies, crOf, hasApex, identifierOf, motorData, pathOf, roundKey, setMotor, skillMotor, talentOf,
  talentRank
} from "./motor.mjs";

export const SAMURAI_ID = "samurai";

/** Identifier of a Samurai skill. */
const T = name => `samurai-${name}`;

const DEFAULTS = { state: "sheathed", value: 0, last: 0, first: true, perfectLast: 0, attacked: null };

/** The Path the actor follows (none with only the Lesser Sheath). */
const path = (actor, lesser) => (lesser ? null : pathOf(actor, SAMURAI_ID));

/** Cuts a Perfect Cut needs: the cap, one less on the Full Moon with the Apex. */
function perfectNeed(actor, max) {
  return ((pathOf(actor, SAMURAI_ID) === "lua") && hasApex(actor, SAMURAI_ID)) ? Math.max(1, max - 1) : max;
}

export const SAMURAI = {
  id: SAMURAI_ID,
  i18n: "Motor.Samurai",
  states: ["sheathed", "drawn"],
  defaults: DEFAULTS,
  costKeyword: "Cortes",

  /** The cap of Cuts. */
  max(actor, { lesser }) {
    let max = 2 + Math.floor(crOf(actor) / 5);
    if (lesser) max = Math.max(1, Math.floor(max / 2));
    else if (pathOf(actor, SAMURAI_ID) === "lua") max += 2;
    return max + talentRank(actor, T("bainha-longa"));
  },

  /** Full Moon: the Iai only with a full Sheath. */
  issues(actor, item, motor, { data, max, lesser }) {
    if ((identifierOf(item) !== T("iai")) || (path(actor, lesser) !== "lua")) return [];
    const need = perfectNeed(actor, max);
    return (toInt(data.value) < need) ? [L("Motor.Samurai.FullMoonIssue", { n: need })] : [];
  },

  /** Empty Mind: the Iai spends no action. Hand on the Hilt: Sheathe is a Move Action. */
  actionOf(actor, item, motor, action) {
    const id = identifierOf(item);
    if ((id === T("iai")) && hasApex(actor, SAMURAI_ID)) return "none";
    if ((id === T("embainhar")) && talentOf(actor, T("mao-no-cabo"))) return "move";
    return action;
  },

  /** What a use spends and sets, with the Perfect Cut and the Paths. */
  plan(actor, item, motor, { data, max, lesser, plan }) {
    const id = identifierOf(item);
    const followed = path(actor, lesser);
    if ((id === T("respiracao")) && talentOf(actor, T("respiracao-profunda"))) plan.gain = 2;
    // The spells of the Magias only gather Cuts with the blade sheathed.
    if (item.flags?.eternia?.magicSpell && (data.state !== "sheathed")) plan.gain = 0;
    if (motor.draw) {
      plan.changes.last = plan.spent;
      plan.changes.perfectLast = 0;
    }
    // Any attack of the round (a draw, Kesagiri…): Lunar Tide only gains in rounds without one.
    if (motor.draw || (item.system.tags ?? []).includes("Weapon Attack")) plan.changes.attacked = roundKey(actor);
    if (motor.perfect && !lesser) {
      const first = data.first && !!talentOf(actor, T("primeira-lamina"));
      const full = toInt(data.value) >= perfectNeed(actor, max);
      if (first || full) plan.perfect = (followed === "lua") ? 2 : 1;
      plan.changes.first = false;
      plan.changes.perfectLast = plan.perfect;
    }
    if (id === T("iai") && (followed === "relampago")) {
      plan.per = 1;
      if (talentOf(actor, T("raio"))) plan.set = "sheathed";
    }
    if (plan.set === "sheathed" && (data.state !== "sheathed")) plan.changes.last = plan.changes.last ?? 0;
    return plan;
  },

  /** Delayed Thunder (Lightning Path): who the Iai hits is [Staggered]. */
  onHit(actor, item, { lesser }) {
    const thunder = talentOf(actor, T("trovao"));
    if (!thunder || (identifierOf(item) !== T("iai")) || (path(actor, lesser) !== "relampago")) return [];
    return [{ statusId: "staggered", value: null, name: thunder.name }];
  },

  /** The class tab and the HUD: whether the next Iai is a Perfect Cut. */
  display(actor, { lesser, data, max }) {
    if (lesser) return {};
    const first = data.first && !!talentOf(actor, T("primeira-lamina")) && !!combatOf(actor);
    const ready = first || ((max > 0) && (toInt(data.value) >= perfectNeed(actor, max)));
    return { ready, readyLabel: L("Motor.Samurai.PerfectReady") };
  },

  /** Echo of Steel: drawn, weapon attacks (not the draws themselves) add the Cuts of the last draw as dice. */
  rollBonuses(actor, item, which) {
    if (which !== "damage") return [];
    const echo = talentOf(actor, T("eco-do-aco"));
    if (!echo || skillMotor(item)?.draw || !(item.system.tags ?? []).includes("Weapon Attack")) return [];
    // The state before the use (a skill that sheathes the blade still had it drawn when it struck).
    const use = item.flags?.eternia?.motorUse;
    const recent = use && (Date.now() - toInt(use.at) < 10 * 60 * 1000) && use.state;
    const data = motorData(actor, SAMURAI_ID);
    const state = recent ? use.state : data.state;
    const last = recent ? toInt(use.last) : toInt(data.last);
    return ((state === "drawn") && (last > 0)) ? [{ dice: last, mod: 0, label: echo.name }] : [];
  },

  /* ------------------------------------------ */
  /*  Events                                    */
  /* ------------------------------------------ */

  /** Every combat starts sheathed, with the Cuts of Quickest Draw. */
  async onCombatStart(actor) {
    await setMotor(actor, SAMURAI_ID, { ...DEFAULTS, value: talentRank(actor, T("primeiro-a-sacar")) });
  },

  /** Setup Process: +1 Cut while sheathed (not on the Flowing Water Path, which gains when attacked). */
  async onSetup(actor, { lesser }) {
    const data = motorData(actor, SAMURAI_ID);
    if ((data.state !== "sheathed") || (path(actor, lesser) === "agua")) return;
    await setMotor(actor, SAMURAI_ID, { ...data, value: toInt(data.value) + 1 });
  },

  /** Lunar Tide: Cleanup Process of a round without attacking, sheathed: +1 Cut. */
  async onCleanup(actor, { lesser }, combat, round) {
    if ((path(actor, lesser) !== "lua") || !talentOf(actor, T("mare-lunar"))) return;
    const data = motorData(actor, SAMURAI_ID);
    if ((data.state !== "sheathed") || (data.attacked === `${combat.id}.${round}`)) return;
    await setMotor(actor, SAMURAI_ID, { ...data, value: toInt(data.value) + 1 });
  },

  async onCombatEnd(actor) {
    await setMotor(actor, SAMURAI_ID, { ...DEFAULTS });
  },

  /** Any other weapon attack draws the blade: the Cuts are lost. */
  async onWeaponAttack(actor, item) {
    const data = motorData(actor, SAMURAI_ID);
    const fromSheath = data.state === "sheathed";
    await setMotor(actor, SAMURAI_ID, {
      ...data, state: "drawn", value: 0, last: fromSheath ? 0 : toInt(data.last), attacked: roundKey(actor)
    });
  },

  /** Flowing Water: an enemy attacks the samurai: +1 Cut (+2 with Empty Mind). */
  async onAttacked(actor, { lesser }, attacker) {
    if ((path(actor, lesser) !== "agua") || !enemies(actor, attacker)) return;
    const data = motorData(actor, SAMURAI_ID);
    const n = hasApex(actor, SAMURAI_ID) ? 2 : 1;
    await setMotor(actor, SAMURAI_ID, { ...data, value: toInt(data.value) + n });
  },

  /** A dodged enemy attack, sheathed: Waiting Blade (+1 Cut), Water Mirror (the attacker takes Cuts × CR). */
  async onDodged(actor, { lesser }, attacker) {
    if (!enemies(actor, attacker)) return;
    let data = motorData(actor, SAMURAI_ID);
    if (data.state !== "sheathed") return;
    if (talentOf(actor, T("lamina-que-espera"))) {
      await setMotor(actor, SAMURAI_ID, { ...data, value: toInt(data.value) + 1 });
      data = motorData(actor, SAMURAI_ID);
    }
    const mirror = (path(actor, lesser) === "agua") && talentOf(actor, T("espelho"));
    const cuts = toInt(data.value);
    if (mirror && attacker && (cuts > 0)) {
      await takeDamage(attacker, cuts * crOf(actor), { what: mirror.name, from: actor });
    }
  },

  /**
   * An attack of the samurai left an enemy at 0 HP: Eclipse (a Perfect Cut: sheathed again with half the Cuts
   * spent) or Chiburi (sheathe for free, +1 Cut).
   */
  async onKill(actor, { lesser }, target, item) {
    if (!enemies(actor, target) || !item || (item.actor?.uuid !== actor.uuid)) return;
    const data = motorData(actor, SAMURAI_ID);
    const weapon = (item.system?.tags ?? []).includes("Weapon Attack");
    if ((identifierOf(item) === T("iai")) && toInt(data.perfectLast) && (path(actor, lesser) === "lua")
      && talentOf(actor, T("eclipse"))) {
      await setMotor(actor, SAMURAI_ID, { ...data, state: "sheathed", value: Math.floor(toInt(data.last) / 2) });
      return;
    }
    if (weapon && talentOf(actor, T("chiburi"))) {
      const kept = (data.state === "sheathed") ? toInt(data.value) : 0;
      await setMotor(actor, SAMURAI_ID, { ...data, state: "sheathed", value: kept + 1 });
    }
  }
};
