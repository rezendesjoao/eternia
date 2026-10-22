/**
 * The Sorcerer's Motor: the Heat (Calor). docs/classes.md has the class; AS REGRAS, page XI, the rules as the
 * player reads them.
 *
 * Every Spell of the class heats the sorcerer (+1, the big ones +2), up to the cap (3, +1 every 5 CR, +2 on the
 * Volcano Path, + the SR of Deep Furnace). The Heat adds to the damage of the sorcerer's Spells (+Heat × 2). At the
 * cap the sorcerer is incandescent, and at the Cleanup Process takes Heat × CR direct damage (Overload) unless it
 * vents first (Breathe the Flame) or spends it all on an Eruption (an area blast: 1D + CR per point).
 *
 * State in flags.eternia.motor.feiticeiro:
 *   state     "estavel" | "incandescente" (at the cap)
 *   value     Heat
 *   hotRound  "<combat>.<round>" when it became incandescent (Magma Chamber)
 *   ember     Heat the next combat starts with (Campfire), kept out of combat
 */
import { L } from "../settings.mjs";
import { takeDamage } from "../conditions/damage.mjs";
import { combatOf, toInt } from "../helpers/utils.mjs";
import {
  areEnemies, chooseOption, crOf, hasApex, identifierOf, motorContext, motorData, motorMax, pathOf, recentUse,
  roundKey, setMotor, talentOf, talentRank
} from "./motor.mjs";

export const FEITICEIRO_ID = "feiticeiro";

/** Identifier of a Sorcerer skill. */
const T = name => `feiticeiro-${name}`;

const DEFAULTS = { state: "estavel", value: 0, hotRound: null, ember: 0 };

/** The Path the actor follows (none with only the Lesser Heat). */
const path = (actor, lesser) => (lesser ? null : pathOf(actor, FEITICEIRO_ID));

/** Whether a skill is a Spell (its tags). */
const isSpell = item => (item?.system?.tags ?? []).includes("Spell");

/** The name of one of the actor's Sorcerer skills, for the lines of the statuses it gives. */
const nameOf = (actor, key) => talentOf(actor, T(key))?.name ?? "";

/** The data with the state its value gives: incandescent at the cap. */
function withState(data, max) {
  const value = Math.clamp(toInt(data.value), 0, Math.max(max, 0));
  return { ...data, value, state: ((max > 0) && (value >= max)) ? "incandescente" : "estavel" };
}

/** Whether a write makes the sorcerer incandescent. */
const ignites = (before, next) => (next.state === "incandescente") && (before.state !== "incandescente");

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

/** Falling Glow (Star Path): becoming incandescent blinds the enemies within 2 squares. */
async function fallingGlow(actor) {
  if ((pathOf(actor, FEITICEIRO_ID) !== "estrela") || !talentOf(actor, T("brilho-cadente"))) return;
  for (const enemy of enemiesWithin(actor, 2)) await game.eternia.applyStatus(enemy, "blinded", { from: actor });
}

/** Write the Heat with its state; becoming incandescent marks the round and lights the Falling Glow. */
async function writeHeat(actor, data) {
  const before = motorData(actor, FEITICEIRO_ID);
  let next = withState(data, motorMax(actor, FEITICEIRO_ID));
  if (ignites(before, next)) next = { ...next, hotRound: roundKey(actor) };
  await setMotor(actor, FEITICEIRO_ID, next);
  if (ignites(before, next)) await fallingGlow(actor);
}

export const FEITICEIRO = {
  id: FEITICEIRO_ID,
  i18n: "Motor.Feiticeiro",
  states: ["estavel", "incandescente"],
  stateColors: { estavel: 0x8a6a25, incandescente: 0xc2410c },
  defaults: DEFAULTS,
  costKeyword: "Calor",

  /** The cap of Heat. */
  max(actor, { lesser }) {
    const max = 3 + Math.floor(crOf(actor) / 5);
    if (lesser) return Math.max(1, Math.floor(max / 2));
    let extra = talentRank(actor, T("fornalha-profunda"));
    if (pathOf(actor, FEITICEIRO_ID) === "vulcao") extra += hasApex(actor, FEITICEIRO_ID) ? 3 : 2;
    return max + extra;
  },

  /**
   * What a use spends and keeps: the Eruption with Controlled Explosion (how much), the Volcano's bonus at the cap,
   * the Fixed Star's automatic hit, the Heat a Spell is cast with (the Frost Path), the Campfire's ember.
   */
  async plan(actor, item, motor, { data, max, lesser, plan }) {
    const id = identifierOf(item);
    const followed = path(actor, lesser);
    if (id === T("fogueira")) plan.changes.ember = 1;
    if (id === T("erupcao")) {
      const have = toInt(data.value);
      if (!lesser && talentOf(actor, T("explosao-controlada")) && (have > 2)) {
        const options = Array.from({ length: have - 1 }, (_, i) => ({ value: String(i + 2), label: String(i + 2) }));
        const chosen = await chooseOption(item.name, options, {
          hint: L("Motor.Feiticeiro.ChooseEruption", { have }), selected: String(have)
        });
        if (chosen === null) return null;
        plan.spent = Math.min(have, toInt(chosen));
      }
      plan.vars.vulcao = ((followed === "vulcao") && (max > 0) && (plan.spent >= max)) ? 1 : 0;
      if ((followed === "estrela") && talentOf(actor, T("estrela-fixa")) && (data.state === "incandescente")) {
        plan.autoHit = true;
      }
    }
    if (isSpell(item)) plan.vars.heat = Math.min(max, Math.max(0, toInt(data.value) + toInt(plan.gain)));
    return plan;
  },

  /** The state follows the Heat; the Magma Heart keeps half of what an Eruption spent. */
  async after(actor, item, plan, next) {
    const { lesser } = motorContext(actor, FEITICEIRO_ID);
    if ((identifierOf(item) === T("erupcao")) && !lesser && hasApex(actor, FEITICEIRO_ID)) {
      next.value = toInt(next.value) + Math.floor(toInt(plan.spent) / 2);
    }
    const before = motorData(actor, FEITICEIRO_ID);
    let final = withState(next, motorMax(actor, FEITICEIRO_ID));
    if (ignites(before, final)) {
      final = { ...final, hotRound: roundKey(actor) };
      await fallingGlow(actor);
    }
    return final;
  },

  /** The Heat on Spells: +Heat × 2 to their damage (×1 Lesser, none on the Frost Path); Arcane Fever: +1D to hit. */
  rollBonuses(actor, item, which, { lesser }) {
    if (!isSpell(item)) return [];
    const data = motorData(actor, FEITICEIRO_ID);
    if (which === "check") {
      const hot = !lesser && (data.state === "incandescente") && talentOf(actor, T("febre-arcana"));
      return hot ? [{ dice: 1, mod: 0, label: nameOf(actor, "febre-arcana") }] : [];
    }
    const heat = toInt(data.value);
    if ((which !== "damage") || item.system.damage?.recovery || !heat || (path(actor, lesser) === "geada")) return [];
    return [{ dice: 0, mod: heat * (lesser ? 1 : 2), label: L("Motor.Feiticeiro.Name") }];
  },

  /**
   * Statuses on whoever a Spell hits: Frost ([Slowed], with 3 Heat also [Rooted], at the cap with Early Winter also
   * [Dazed]), the Volcano's Cataclysm, the Pyre and Absolute Zero.
   */
  onHit(actor, item, { lesser }) {
    const id = identifierOf(item);
    const followed = path(actor, lesser);
    const use = recentUse(item);
    const out = [];
    if ((followed === "geada") && isSpell(item)) {
      const heat = toInt(use?.vars?.heat ?? motorData(actor, FEITICEIRO_ID).value);
      const name = nameOf(actor, "geada");
      out.push({ statusId: "slowed", value: null, name });
      if ((heat >= 3) || (hasApex(actor, FEITICEIRO_ID) && (heat >= 1))) out.push({ statusId: "rooted", value: null, name });
      const max = motorMax(actor, FEITICEIRO_ID);
      if (talentOf(actor, T("inverno-precoce")) && (max > 0) && (heat >= max)) {
        out.push({ statusId: "dazed", value: null, name: nameOf(actor, "inverno-precoce") });
      }
    }
    if ((id === T("erupcao")) && (followed === "vulcao") && toInt(use?.vars?.vulcao) && talentOf(actor, T("cataclismo"))) {
      out.push({ statusId: "burning", value: crOf(actor), name: nameOf(actor, "cataclismo") });
    }
    if ((id === T("pira")) && use) out.push({ statusId: "burning", value: toInt(use.spent) * 2, name: item.name });
    if (id === T("zero-absoluto")) out.push({ statusId: "paralyzed", value: null, name: item.name });
    return out;
  },

  /** Incandescent: Lava Skin's [Mirror], the Star's [Awakened]. */
  statuses(actor, { lesser, data }) {
    if (lesser || !combatOf(actor) || (data.state !== "incandescente")) return [];
    const heat = toInt(data.value);
    const out = [];
    if (talentOf(actor, T("pele-de-lava"))) out.push({ key: "pele", statusId: "mirror", value: heat * 2 });
    if (pathOf(actor, FEITICEIRO_ID) === "estrela") {
      out.push({ key: "estrela", statusId: "awakened", value: heat * (hasApex(actor, FEITICEIRO_ID) ? 2 : 1) });
    }
    return out;
  },

  /** The class tab and the HUD: on the Volcano Path, the Eruption at the cap is ready. */
  display(actor, { lesser, data, max }) {
    if (lesser || (pathOf(actor, FEITICEIRO_ID) !== "vulcao")) return {};
    return { ready: (max > 0) && (toInt(data.value) >= max), readyLabel: L("Motor.Feiticeiro.VolcanoReady") };
  },

  /* ------------------------------------------ */
  /*  Events                                    */
  /* ------------------------------------------ */

  /** Every combat starts stable, with the Heat of Live Ember and of the Campfire. */
  async onCombatStart(actor) {
    const data = motorData(actor, FEITICEIRO_ID);
    await writeHeat(actor, { ...DEFAULTS, value: talentRank(actor, T("brasa-acesa")) + toInt(data.ember) });
  },

  /**
   * Cleanup Process: Burning Aura (the engaged enemies take Heat × CR ÷ 2 [Flame] damage), then the Overload of an
   * incandescent sorcerer (Heat × CR direct damage; halved by Contained Flame; spared on the Star Path, and in the
   * round it ignited with the Magma Chamber).
   */
  async onCleanup(actor, { lesser }, combat, round) {
    const data = motorData(actor, FEITICEIRO_ID);
    const heat = toInt(data.value);
    const cr = crOf(actor);
    const aura = !lesser && talentOf(actor, T("aura-ardente"));
    if (aura && (heat >= 2)) {
      for (const enemy of enemiesWithin(actor, 0)) {
        await takeDamage(enemy, Math.floor((heat * cr) / 2), { what: aura.name, from: actor, tag: "Flame" });
      }
    }
    if (data.state !== "incandescente") return;
    const followed = path(actor, lesser);
    if (followed === "estrela") return;
    if ((followed === "vulcao") && talentOf(actor, T("camara-de-magma")) && (data.hotRound === `${combat.id}.${round}`)) return;
    let damage = heat * cr;
    if (!lesser && talentOf(actor, T("chama-contida"))) damage = Math.floor(damage / 2);
    await takeDamage(actor, damage, { what: L("Motor.Feiticeiro.Overload"), from: actor });
  },

  async onCombatEnd(actor) {
    await setMotor(actor, FEITICEIRO_ID, { ...DEFAULTS });
  },

  /** Combustion: a Spell's Hit Check with two or more 6s heats the sorcerer by 1 more. */
  async onCheck(actor, { lesser }, roll, context) {
    if (lesser || (context?.kind !== "attack") || !isSpell(context.item) || !talentOf(actor, T("combustao"))) return;
    const sixes = roll.dice.flatMap(d => d.results.filter(r => r.active).map(r => r.result)).filter(r => r === 6).length;
    if (sixes < 2) return;
    const data = motorData(actor, FEITICEIRO_ID);
    await writeHeat(actor, { ...data, value: toInt(data.value) + 1 });
  },

  /** Ashes on the Wind: each enemy an Eruption brings to 0 HP gives 1 Heat back. */
  async onKill(actor, { lesser }, target, item) {
    if (lesser || (identifierOf(item) !== T("erupcao")) || !talentOf(actor, T("cinzas-ao-vento"))) return;
    if (!areEnemies(actor, target)) return;
    const data = motorData(actor, FEITICEIRO_ID);
    await writeHeat(actor, { ...data, value: toInt(data.value) + 1 });
  }
};
