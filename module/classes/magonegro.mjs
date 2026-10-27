/**
 * The Black Mage's Motor: the Pressure (Pressão). docs/classes.md has the class; AS REGRAS, its page in XI, the rules
 * as the player reads them. It is the Sorcerer's Heat made the engine of the Magias: the Black Mage chooses a Magia at
 * CR 1, 5 and 10 (skills with flags.eternia.magic), and the spells of the Magias feed and spend the class Motor
 * ("@class" in their flags.eternia.motor, see motor.mjs).
 *
 * Every Spell heats the pressure of the mage's magic power (+1, the big ones +2: their own motor.gain), up to the cap
 * (3, +1 every 5 CR, + the SR of Deep Reserve, +1 on the S-Class Path, +1 with the Apex). The Pressure adds to the
 * damage of the mage's Spells (+Pressure × 2). At the cap the mage is at the Critical Point, and at the Cleanup Process
 * takes Pressure × CR direct damage (Overload) unless it contains the magic first (Contain the Magic) or spends it all
 * on a Release (an area blast: 1D + CR per point) or on a Magia's supreme spell.
 *
 * State in flags.eternia.motor.magonegro:
 *   state     "estavel" | "critico" (at the cap)
 *   value     Pressure
 *   hotRound  "<combat>.<round>" when it reached the Critical Point (Proof of the S-Class)
 *   ember     Pressure the next combat starts with (Arcane Rest), kept out of combat
 *   emotion   { half, ally }: the combats the Emotional Resonance already fed in
 */
import { L } from "../settings.mjs";
import { takeDamage } from "../conditions/damage.mjs";
import { combatOf, toInt } from "../helpers/utils.mjs";
import {
  areAllies, areEnemies, chooseOption, crOf, hasApex, identifierOf, motorContext, motorData, motorMax, pathOf,
  recentUse, roundKey, setMotor, talentOf, talentRank
} from "./motor.mjs";

export const MAGONEGRO_ID = "magonegro";

/** Identifier of a Black Mage skill. */
const T = name => `${MAGONEGRO_ID}-${name}`;

const DEFAULTS = { state: "estavel", value: 0, hotRound: null, ember: 0, emotion: null };

/** The Path the actor follows (none with only the Lesser Pressure). */
const path = (actor, lesser) => (lesser ? null : pathOf(actor, MAGONEGRO_ID));

/** Whether a skill is a Spell (its tags): the class's and every Magia's. */
const isSpell = item => (item?.system?.tags ?? []).includes("Spell");

/** The name of one of the actor's Black Mage skills, for the lines of the statuses it gives. */
const nameOf = (actor, key) => talentOf(actor, T(key))?.name ?? "";

/** The data with the state its value gives: the Critical Point at the cap. */
function withState(data, max) {
  const value = Math.clamp(toInt(data.value), 0, Math.max(max, 0));
  return { ...data, value, state: ((max > 0) && (value >= max)) ? "critico" : "estavel" };
}

/** Whether a write takes the mage to the Critical Point. */
const ignites = (before, next) => (next.state === "critico") && (before.state !== "critico");

/** The token of an actor on its scene (a document), or null. */
const tokenOf = actor => actor?.getActiveTokens(false, true)?.[0] ?? null;

/** Squares between two token documents of the same scene (diagonals count 1). */
function squaresBetween(a, b) {
  const size = a.parent?.grid?.size || 100;
  return Math.round(Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y)) / size);
}

/** The enemies in the actor's combat whose token is at most n squares away (0: the same square, engaged). */
function enemiesWithin(actor, n) {
  const mine = tokenOf(actor);
  const combat = combatOf(actor);
  if (!mine || !combat) return [];
  const found = new Map();
  for (const combatant of combat.combatants) {
    const token = combatant.token;
    const other = token?.actor;
    if (!other || (token.parent !== mine.parent) || !areEnemies(actor, other)) continue;
    if (squaresBetween(mine, token) <= n) found.set(other.uuid, other);
  }
  return [...found.values()];
}

/** Spriggan's Glare: reaching the Critical Point blinds the enemies within 2 squares. */
async function spriggansGlare(actor) {
  if ((pathOf(actor, MAGONEGRO_ID) !== "spriggan") || !talentOf(actor, T("brilho-de-spriggan"))) return;
  for (const enemy of enemiesWithin(actor, 2)) await game.eternia.applyStatus(enemy, "blinded", { from: actor });
}

/** Write the Pressure with its state; reaching the Critical Point marks the round and lights Spriggan's Glare. */
async function writePressure(actor, data) {
  const before = motorData(actor, MAGONEGRO_ID);
  let next = withState(data, motorMax(actor, MAGONEGRO_ID));
  if (ignites(before, next)) next = { ...next, hotRound: roundKey(actor) };
  await setMotor(actor, MAGONEGRO_ID, next);
  if (ignites(before, next)) await spriggansGlare(actor);
}

/** Add Pressure (with the state it gives). */
async function addPressure(actor, n, changes = {}) {
  const data = motorData(actor, MAGONEGRO_ID);
  await writePressure(actor, { ...data, ...changes, value: toInt(data.value) + n });
}

export const MAGONEGRO = {
  id: MAGONEGRO_ID,
  i18n: "Motor.MagoNegro",
  states: ["estavel", "critico"],
  stateColors: { estavel: 0x8a6a25, critico: 0x6d28d9 },
  defaults: DEFAULTS,
  costKeyword: "Pressão",

  /** The cap of Pressure. */
  max(actor, { lesser }) {
    const max = 3 + Math.floor(crOf(actor) / 5);
    if (lesser) return Math.max(1, Math.floor(max / 2));
    let extra = talentRank(actor, T("reserva-profunda"));
    if (hasApex(actor, MAGONEGRO_ID)) extra += 1;
    if (pathOf(actor, MAGONEGRO_ID) === "classe-s") extra += 1;
    return max + extra;
  },

  /**
   * What a use spends and keeps: the Release with Controlled Release (how much), the S-Class's bonus at the cap,
   * Absolute Power's automatic hit, the Pressure a Spell is cast with (the Wizard Saint's Path), Arcane Rest's ember.
   */
  async plan(actor, item, motor, { data, max, lesser, plan }) {
    const id = identifierOf(item);
    const followed = path(actor, lesser);
    if (id === T("repouso-arcano")) plan.changes.ember = 1;
    if (id === T("liberacao")) {
      const have = toInt(data.value);
      if (!lesser && talentOf(actor, T("liberacao-controlada")) && (have > 2)) {
        const options = Array.from({ length: have - 1 }, (_, i) => ({ value: String(i + 2), label: String(i + 2) }));
        const chosen = await chooseOption(item.name, options, {
          hint: L("Motor.MagoNegro.ChooseRelease", { have }), selected: String(have)
        });
        if (chosen === null) return null;
        plan.spent = Math.min(have, toInt(chosen));
      }
      plan.vars.classeS = ((followed === "classe-s") && (max > 0) && (plan.spent >= max)) ? 1 : 0;
      if ((followed === "spriggan") && talentOf(actor, T("poder-absoluto")) && (data.state === "critico")) plan.autoHit = true;
    }
    if (isSpell(item)) plan.vars.pressure = Math.min(max, Math.max(0, toInt(data.value) + toInt(plan.gain)));
    return plan;
  },

  /** The state follows the Pressure; the Second Origin keeps half of what a Release spent. */
  async after(actor, item, plan, next) {
    const { lesser } = motorContext(actor, MAGONEGRO_ID);
    if ((identifierOf(item) === T("liberacao")) && !lesser && hasApex(actor, MAGONEGRO_ID)) {
      next.value = toInt(next.value) + Math.floor(toInt(plan.spent) / 2);
    }
    const before = motorData(actor, MAGONEGRO_ID);
    let final = withState(next, motorMax(actor, MAGONEGRO_ID));
    if (ignites(before, final)) {
      final = { ...final, hotRound: roundKey(actor) };
      await spriggansGlare(actor);
    }
    return final;
  },

  /** The Pressure on Spells: +Pressure × 2 to their damage (×1 Lesser, none on the Wizard Saint's Path); Overflow: +1D to hit. */
  rollBonuses(actor, item, which, { lesser }) {
    if (!isSpell(item)) return [];
    const data = motorData(actor, MAGONEGRO_ID);
    if (which === "check") {
      const hot = !lesser && (data.state === "critico") && talentOf(actor, T("transbordar"));
      return hot ? [{ dice: 1, mod: 0, label: nameOf(actor, "transbordar") }] : [];
    }
    const pressure = toInt(data.value);
    if ((which !== "damage") || item.system.damage?.recovery || !pressure || (path(actor, lesser) === "mago-santo")) return [];
    return [{ dice: 0, mod: pressure * (lesser ? 1 : 2), label: L("Motor.MagoNegro.Name") }];
  },

  /**
   * Statuses on whoever a Spell hits: the Wizard Saint's ([Slowed], with 3 Pressure also [Rooted], at the cap with
   * Judgment also [Dazed]), the Walking Disaster, the Collapse and the Holy Seal.
   */
  onHit(actor, item, { lesser }) {
    const id = identifierOf(item);
    const followed = path(actor, lesser);
    const use = recentUse(item);
    const out = [];
    if ((followed === "mago-santo") && isSpell(item)) {
      const pressure = toInt(use?.vars?.pressure ?? motorData(actor, MAGONEGRO_ID).value);
      const name = nameOf(actor, "mago-santo");
      out.push({ statusId: "slowed", value: null, name });
      if ((pressure >= 3) || (hasApex(actor, MAGONEGRO_ID) && (pressure >= 1))) out.push({ statusId: "rooted", value: null, name });
      const max = motorMax(actor, MAGONEGRO_ID);
      if (talentOf(actor, T("julgamento")) && (max > 0) && (pressure >= max)) {
        out.push({ statusId: "dazed", value: null, name: nameOf(actor, "julgamento") });
      }
    }
    if ((id === T("liberacao")) && (followed === "classe-s") && toInt(use?.vars?.classeS) && talentOf(actor, T("desastre-ambulante"))) {
      out.push({ statusId: "fissured", value: 2, name: nameOf(actor, "desastre-ambulante") });
    }
    if (id === T("colapso")) out.push({ statusId: "dazed", value: null, name: item.name });
    if (id === T("selo-sagrado")) out.push({ statusId: "paralyzed", value: null, name: item.name });
    return out;
  },

  /** At the Critical Point: the Aura of Pressure's [Mirror], Spriggan's [Awakened]. */
  statuses(actor, { lesser, data }) {
    if (lesser || !combatOf(actor) || (data.state !== "critico")) return [];
    const pressure = toInt(data.value);
    const out = [];
    if (talentOf(actor, T("aura-de-pressao"))) out.push({ key: "aura", statusId: "mirror", value: pressure * 2 });
    if (pathOf(actor, MAGONEGRO_ID) === "spriggan") {
      out.push({ key: "spriggan", statusId: "awakened", value: pressure * (hasApex(actor, MAGONEGRO_ID) ? 2 : 1) });
    }
    return out;
  },

  /** The class tab and the HUD: on the S-Class Path, the Release at the cap is ready. */
  display(actor, { lesser, data, max }) {
    if (lesser || (pathOf(actor, MAGONEGRO_ID) !== "classe-s")) return {};
    return { ready: (max > 0) && (toInt(data.value) >= max), readyLabel: L("Motor.MagoNegro.ReleaseReady") };
  },

  /* ------------------------------------------ */
  /*  Events                                    */
  /* ------------------------------------------ */

  /** Every combat starts stable, with the Pressure of the Ethernano Cycle and of the Arcane Rest. */
  async onCombatStart(actor) {
    const data = motorData(actor, MAGONEGRO_ID);
    await writePressure(actor, { ...DEFAULTS, value: talentRank(actor, T("ciclo-de-ethernano")) + toInt(data.ember) });
  },

  /**
   * Cleanup Process: Crushing Pressure (the engaged enemies take Pressure × CR ÷ 2 direct damage), then the Overload
   * at the Critical Point (Pressure × CR direct damage; halved by Fine Control; spared on Spriggan's Path, and in the
   * round it was reached with the Proof of the S-Class).
   */
  async onCleanup(actor, { lesser }, combat, round) {
    const data = motorData(actor, MAGONEGRO_ID);
    const pressure = toInt(data.value);
    const cr = crOf(actor);
    const crushing = !lesser && talentOf(actor, T("pressao-esmagadora"));
    if (crushing && (pressure >= 2)) {
      for (const enemy of enemiesWithin(actor, 0)) {
        await takeDamage(enemy, Math.floor((pressure * cr) / 2), { what: crushing.name, from: actor });
      }
    }
    if (data.state !== "critico") return;
    const followed = path(actor, lesser);
    if (followed === "spriggan") return;
    if ((followed === "classe-s") && talentOf(actor, T("prova-da-classe-s")) && (data.hotRound === `${combat.id}.${round}`)) return;
    let damage = pressure * cr;
    if (!lesser && talentOf(actor, T("controle-fino"))) damage = Math.floor(damage / 2);
    await takeDamage(actor, damage, { what: L("Motor.MagoNegro.Overload"), from: actor });
  },

  async onCombatEnd(actor) {
    await setMotor(actor, MAGONEGRO_ID, { ...DEFAULTS });
  },

  /** Magic Combustion: a Spell's Hit Check with two or more 6s gives 1 more Pressure. */
  async onCheck(actor, { lesser }, roll, context) {
    if (lesser || (context?.kind !== "attack") || !isSpell(context.item) || !talentOf(actor, T("combustao-magica"))) return;
    const sixes = roll.dice.flatMap(d => d.results.filter(r => r.active).map(r => r.result)).filter(r => r === 6).length;
    if (sixes >= 2) await addPressure(actor, 1);
  },

  /** Nothing Remains: each enemy a Release brings to 0 HP gives 1 Pressure back. */
  async onKill(actor, { lesser }, target, item) {
    if (lesser || (identifierOf(item) !== T("liberacao")) || !talentOf(actor, T("nada-sobra"))) return;
    if (areEnemies(actor, target)) await addPressure(actor, 1);
  },

  /** Emotional Resonance: an attack leaves the mage at half its HP or less (+1, once a combat). */
  async onDamaged(actor, { lesser }, amount) {
    const combat = combatOf(actor);
    if (lesser || !combat || !talentOf(actor, T("ressonancia-emocional"))) return;
    const data = motorData(actor, MAGONEGRO_ID);
    const emotion = data.emotion ?? {};
    const hp = toInt(actor.system.health?.value);
    const half = Math.floor(toInt(actor.system.health?.max) / 2);
    if ((emotion.half === combat.id) || (hp > half) || (hp + amount <= half)) return;
    await addPressure(actor, 1, { emotion: { ...emotion, half: combat.id } });
  },

  /** Emotional Resonance: an ally falls (+1, once a combat). */
  async onAnyKill(actor, { lesser }, victim) {
    const combat = combatOf(actor);
    if (lesser || !combat || !areAllies(actor, victim) || !talentOf(actor, T("ressonancia-emocional"))) return;
    const data = motorData(actor, MAGONEGRO_ID);
    const emotion = data.emotion ?? {};
    if (emotion.ally === combat.id) return;
    await addPressure(actor, 1, { emotion: { ...emotion, ally: combat.id } });
  }
};
