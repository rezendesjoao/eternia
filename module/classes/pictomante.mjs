/**
 * The Pictomancer's Motor: the Molds (Moldes). docs/classes.md has the class; AS REGRAS, its page in XI, the rules as
 * the player reads them. A magic class: the Pictomancer chooses a Magia at CR 1, 5 and 10 (skills with
 * flags.eternia.magic), and the spells of the Magias feed and spend the class Motor ("@class" in their
 * flags.eternia.motor, see motor.mjs).
 *
 * The Pictomancer gives shape to its magic: every Spell, the class's or a Magia's, raises Molds on the field (+1, the
 * big ones +2: their own motor.gain), constructs that stay standing from one round to the next until they are broken,
 * up to the cap (3, +1 every 5 CR, + the SR of Wide Studio). Breaking them turns into damage (Shatter: (1 + broken)d6
 * + broken × CR) or defense (Sculpted Shield: [Cancel: broken × (CR+5)] against one hit, an effect of the skill); the
 * supreme spells of the Magias need the cap and break them all. The Paths: the Weapon breaks Molds inside any damage
 * Spell (+1d6 + CR each), the Creature has the standing Molds hunt the nearest enemy at each Cleanup, the Landscape
 * turns the Shield into a wall for the allies for the whole round (its effects, by the Path's name). The Apex rebuilds
 * half of the Molds broken in the round before at the next Setup.
 *
 * State in flags.eternia.motor.pictomante:
 *   state      "erguido" (one state: no chip)
 *   value      Molds standing
 *   broken     { round, n }: the Molds broken in the round "<combat>.<round>" (the Apex)
 *   wall       "<combat>.<round>" when the Landscape's wall gave a Mold back (the Apex)
 *   guard      "<combat>.<round>" when Watchful Guard last raised a Mold
 *   hands      "<combat>.<round>" when Two Hands last added its Mold
 *   memory     the combat in which the Painter's Eye already gave its Mold
 *   ember      Molds the next combat starts with (Field Studio), kept out of combat
 */
import { L } from "../settings.mjs";
import { takeDamage } from "../conditions/damage.mjs";
import { combatOf, toInt } from "../helpers/utils.mjs";
import {
  areEnemies, chooseOption, crOf, hasApex, identifierOf, motorContext, motorData, pathOf, recentUse, roundKey,
  setMotor, talentOf, talentRank
} from "./motor.mjs";

export const PICTOMANTE_ID = "pictomante";

/** Identifier of a Pictomancer skill. */
const T = name => `${PICTOMANTE_ID}-${name}`;

const DEFAULTS = {
  state: "erguido", value: 0, broken: null, wall: null, guard: null, hands: null, memory: null, ember: 0
};

/** The skills that throw the shards: what Shrapnel, Pieces That Return and the closed work read. */
const SHATTERS = [T("estilhacar"), T("chuva-de-estilhacos")];

/** The Path the actor follows (none with only the Lesser Molds). */
const path = (actor, lesser) => (lesser ? null : pathOf(actor, PICTOMANTE_ID));

const tagsOf = item => item?.system?.tags ?? [];
const isSpell = item => tagsOf(item).includes("Spell");

/** Whether a skill rolls damage (not healing): what the Weapon Path can break Molds into. */
const dealsDamage = item => !!item?.system?.damage?.type && !item.system.damage.recovery;

/** Whether an attack is magical: a Spell, a [Magic Attack] or magical damage (the Painter's Eye). */
const isMagical = item => isSpell(item) || tagsOf(item).includes("Magic Attack")
  || (item?.system?.damage?.type === "magical");

/** The name of one of the actor's Pictomancer skills, for the lines of the statuses and damage it gives. */
const nameOf = (actor, key) => talentOf(actor, T(key))?.name ?? "";

/** The actors the user targets now. */
const targetActors = () => [...(game.user?.targets ?? [])].map(t => t.actor).filter(Boolean);

/** Whether an actor is held in place: [Rooted] or [Paralyzed] (Still Life, the closed work). */
const isHeld = actor => !!(actor?.statuses?.has("rooted") || actor?.statuses?.has("paralyzed"));

/** The token of an actor on its scene (a document), or null. */
const tokenOf = actor => actor?.getActiveTokens(false, true)?.[0] ?? null;

/** Squares between two token documents of the same scene (diagonals count 1). */
function squaresBetween(a, b) {
  const size = a.parent?.grid?.size || 100;
  return Math.round(Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y)) / size);
}

/** The enemy in the actor's combat nearest to it, at most n squares away and still standing, or null. */
function nearestEnemy(actor, n) {
  const mine = tokenOf(actor);
  const combat = combatOf(actor);
  if (!mine || !combat) return null;
  let best = null;
  for (const combatant of combat.combatants) {
    const token = combatant.token;
    const other = token?.actor;
    if (!other || (token.parent !== mine.parent) || !areEnemies(actor, other)) continue;
    if ((toInt(other.system.health?.value) <= 0) || other.statuses.has("dead")) continue;
    const squares = squaresBetween(mine, token);
    if ((squares <= n) && (!best || (squares < best.squares))) best = { actor: other, squares };
  }
  return best?.actor ?? null;
}

/** The Creature's beasts hunt: the nearest enemy within 3 squares takes [count × (CR÷2 + 1)] direct damage. */
async function hunt(actor, count) {
  if (count <= 0) return;
  const prey = nearestEnemy(actor, 3);
  if (!prey) return;
  const damage = count * (Math.floor(crOf(actor) / 2) + 1);
  await takeDamage(prey, damage, { what: nameOf(actor, "criatura") || L("Motor.Pictomante.Hunt"), from: actor });
}

/** How many of the Molds broken in a round the Apex rebuilds: half, rounded up. */
const rebuilt = n => Math.ceil(toInt(n) / 2);

export const PICTOMANTE = {
  id: PICTOMANTE_ID,
  i18n: "Motor.Pictomante",
  states: ["erguido"],
  stateColors: { erguido: 0x3d6fa8 },
  defaults: DEFAULTS,
  costKeyword: "Moldes",
  // "Moldes quebrados" in the texts: the Molds a use breaks
  spentWords: ["quebrados", "quebrado", "broken"],

  /** The cap of Molds. */
  max(actor, { lesser }) {
    let max = 3 + Math.floor(crOf(actor) / 5);
    if (lesser) max = Math.max(1, Math.floor(max / 2));
    return max + talentRank(actor, T("atelie-amplo"));
  },

  /** Still Life: only against a [Rooted] enemy (the target). */
  issues(actor, item) {
    if (identifierOf(item) !== T("natureza-morta")) return [];
    return targetActors().some(isHeld) ? [] : [L("Motor.Pictomante.NeedsRooted")];
  },

  /**
   * What a use breaks and raises: the Weapon Path asks how many Molds a damage Spell breaks (and then it raises none,
   * unless the Apex), the Shards' Rain breaks at least 2, the closed work hits held targets without a Dodge Check, Two
   * Hands adds a Mold to the first Spell of the round that raises some, the Field Studio keeps one for the next combat.
   */
  async plan(actor, item, motor, { data, lesser, plan }) {
    const id = identifierOf(item);
    const have = toInt(data.value);
    const followed = path(actor, lesser);
    if (id === T("atelie-de-campo")) plan.changes.ember = 1;
    if ((id === T("chuva-de-estilhacos")) && (have >= 2)) plan.spent = Math.max(2, toInt(plan.spent));
    if ((followed === "arma") && isSpell(item) && dealsDamage(item) && !motor.spend && (have > 0)) {
      const options = Array.from({ length: have + 1 }, (_, i) => ({ value: String(i), label: String(i) }));
      const hint = L("Motor.Pictomante.ChooseBreak", { n: have });
      const chosen = await chooseOption(item.name, options, { hint, selected: "0" });
      if (chosen === null) return null;
      const broken = Math.min(have, toInt(chosen));
      if (broken > 0) {
        plan.spent = broken;
        plan.vars.broken = broken;
        if (!hasApex(actor, PICTOMANTE_ID)) plan.gain = 0;
      }
    }
    if (SHATTERS.includes(id) && talentOf(actor, T("obra-fechada"))) {
      const targets = targetActors();
      if (targets.length && targets.every(isHeld)) plan.autoHit = true;
    }
    const round = roundKey(actor);
    const twoHands = round && (data.hands !== round) && talentOf(actor, T("duas-maos"));
    if (twoHands && isSpell(item) && (toInt(plan.gain) > 0)) {
      plan.gain = toInt(plan.gain) + 1;
      plan.changes.hands = round;
    }
    return plan;
  },

  /** The Molds broken in the round (the Apex); the Landscape's wall gives one back once a round (the Apex). */
  after(actor, item, plan, next) {
    const spent = toInt(plan.spent);
    const round = roundKey(actor);
    if ((spent <= 0) || !round) return next;
    const before = next.broken ?? {};
    next.broken = { round, n: ((before.round === round) ? toInt(before.n) : 0) + spent };
    const { lesser } = motorContext(actor, PICTOMANTE_ID);
    if ((identifierOf(item) === T("escudo-esculpido")) && (path(actor, lesser) === "paisagem")
      && hasApex(actor, PICTOMANTE_ID) && (next.wall !== round)) {
      next.value = toInt(next.value) + 1;
      next.wall = round;
    }
    return next;
  },

  /** The Weapon Path: each Mold a Spell broke adds 1d6 + CR to its damage. */
  rollBonuses(actor, item, which, { lesser }) {
    if ((which !== "damage") || (path(actor, lesser) !== "arma")) return [];
    const broken = toInt(recentUse(item)?.vars?.broken);
    if (!broken) return [];
    return [{ dice: broken, mod: broken * crOf(actor), label: L("Motor.Pictomante.Broken", { n: broken }) }];
  },

  /** Shrapnel ([Fissured] from the shards) and the Weight of the Work ([Prone] when 2 Molds or more were broken). */
  onHit(actor, item, { lesser }) {
    const id = identifierOf(item);
    const spent = toInt(recentUse(item)?.spent);
    const out = [];
    const shrapnel = talentOf(actor, T("estilhacos-cravados"));
    if (shrapnel && SHATTERS.includes(id)) {
      out.push({ statusId: "fissured", value: (spent >= 3) ? 2 : 1, name: shrapnel.name });
    }
    if ((path(actor, lesser) === "arma") && isSpell(item) && (spent >= 2) && talentOf(actor, T("peso-da-obra"))) {
      out.push({ statusId: "prone", value: null, name: nameOf(actor, "peso-da-obra") });
    }
    return out;
  },

  /** Molded Cuirass: with 3 Molds or more standing, [Cancel: Molds], in combat. */
  statuses(actor, { data }) {
    if (!combatOf(actor) || !talentOf(actor, T("couraca-moldada"))) return [];
    const value = toInt(data.value);
    return (value >= 3) ? [{ key: "couraca", statusId: "cancel", value }] : [];
  },

  /** The class tab and the HUD: with the Apex, how many Molds come back at the next Setup. */
  display(actor, { lesser, data }) {
    if (lesser || !hasApex(actor, PICTOMANTE_ID)) return {};
    const round = roundKey(actor);
    const n = (round && (data.broken?.round === round)) ? rebuilt(data.broken.n) : 0;
    return n ? { note: L("Motor.Pictomante.Return", { n }) } : {};
  },

  /* ------------------------------------------ */
  /*  Events                                    */
  /* ------------------------------------------ */

  /** Every combat starts with the Molds of the Prior Sketch and of the Field Studio. */
  async onCombatStart(actor) {
    const value = talentRank(actor, T("esboco-previo")) + toInt(motorData(actor, PICTOMANTE_ID).ember);
    await setMotor(actor, PICTOMANTE_ID, { ...DEFAULTS, value });
  },

  /**
   * Setup Process: the Hunting Instinct (+1 with a Mold standing, on the Creature Path), then the Apex: half the Molds
   * broken in the round before stand again, and on the Creature Path the beasts that came back hunt at once.
   */
  async onSetup(actor, { lesser }, combat, round) {
    const data = motorData(actor, PICTOMANTE_ID);
    const followed = path(actor, lesser);
    const start = toInt(data.value);
    let value = start;
    if ((followed === "criatura") && talentOf(actor, T("instinto-de-caca")) && (value >= 1)) value += 1;
    let back = 0;
    if (!lesser && hasApex(actor, PICTOMANTE_ID) && (data.broken?.round === `${combat.id}.${round - 1}`)) {
      back = rebuilt(data.broken.n);
    }
    if (value + back === start) return;
    await setMotor(actor, PICTOMANTE_ID, { ...data, value: value + back });
    if ((followed === "criatura") && (back > 0)) {
      const stood = toInt(motorData(actor, PICTOMANTE_ID).value) - value;
      await hunt(actor, Math.max(0, Math.min(back, stood)));
    }
  },

  /** Cleanup Process: on the Creature Path, the standing Molds hunt. */
  async onCleanup(actor, { lesser }) {
    if (path(actor, lesser) !== "criatura") return;
    await hunt(actor, toInt(motorData(actor, PICTOMANTE_ID).value));
  },

  async onCombatEnd(actor) {
    await setMotor(actor, PICTOMANTE_ID, { ...DEFAULTS });
  },

  /** Watchful Guard: an enemy attack takes HP from you: +1 Mold, once a round. */
  async onDamaged(actor, ctx, amount, attacker) {
    const round = roundKey(actor);
    if (!round || !talentOf(actor, T("guarda-atenta")) || (attacker && !areEnemies(actor, attacker))) return;
    const data = motorData(actor, PICTOMANTE_ID);
    if (data.guard === round) return;
    await setMotor(actor, PICTOMANTE_ID, { ...data, value: toInt(data.value) + 1, guard: round });
  },

  /** The Painter's Eye: an enemy's magic attack chooses you as a target: +1 Mold, once a combat. */
  async onAttacked(actor, ctx, attacker, item) {
    const combat = combatOf(actor);
    if (!combat || !isMagical(item) || !areEnemies(actor, attacker) || !talentOf(actor, T("olho-de-pintor"))) return;
    const data = motorData(actor, PICTOMANTE_ID);
    if (data.memory === combat.id) return;
    await setMotor(actor, PICTOMANTE_ID, { ...data, value: toInt(data.value) + 1, memory: combat.id });
  },

  /** Pieces That Return: the shards bring an enemy to 0 HP: +1 Mold. */
  async onKill(actor, ctx, target, item) {
    if (!SHATTERS.includes(identifierOf(item)) || !areEnemies(actor, target)) return;
    if (!talentOf(actor, T("pedacos-que-voltam"))) return;
    const data = motorData(actor, PICTOMANTE_ID);
    await setMotor(actor, PICTOMANTE_ID, { ...data, value: toInt(data.value) + 1 });
  }
};
