/**
 * The Dragon Slayer's Motor: the Scales (Escamas). docs/classes.md has the class; AS REGRAS, its page in XI, the rules
 * as the player reads them.
 *
 * The slayer chooses an element at CR 1 (an element skill, flags.eternia.element = { class: "matador", id }): it gives
 * the dragon moves (the class's [Magic Attack] skills) its damage tag and the status they leave on a hit, a passive
 * [Cancel] of that tag, and the status the slayer can eat. Eating its element gives Scales: Devour (+1, +2 with a source:
 * the element's status on the target, which goes away, a source in the scene the GM allows, or the air for the Sky),
 * being struck by its element (+1; an ally's attack of it does no damage: the slayer eats it), the Iron Fist (+1).
 * The dragon moves spend them.
 *
 * At the cap the slayer enters the Dragon Force: [Awakened: CR + 2 × Seed] (kept by statuses below), −1 Scale at each
 * Cleanup Process, until the Scales reach 0. When it ends the [Awakened] leaves its [Fatigue] (conditions/turns.mjs)
 * and the Dragon Seed grows by 1: the Tabu, a counter of the scenario (it reads 0 once the actor's scenario counter,
 * flags.eternia.scenario, moves on).
 *
 * The Paths are the generations: the First eats the other elements too (the Dual Dragon Mode: their tag and status
 * join the dragon moves for the combat); the Second's lacrima gives +1 Scale at each Setup Process (and being struck
 * by the element gives none); the Third enters the Force at will (its Path skill, a Minor Action with half the cap).
 * The Apex, the Dragon King Mode, doubles the CR of the Force, keeps half of what a Secret Art spent, and gives each
 * generation a little more (another element: +1; the lacrima: +2; the Force without an action).
 *
 * State in flags.eternia.motor.matador:
 *   state    "humano" | "forca" (the Dragon Force)
 *   value    Scales
 *   dual     the element of the Dual Dragon Mode (First Generation), or null
 *   seed     { n, scenario }: the Dragon Seed and the scenario it counts in
 *   awoken   the scenario the Inner Dragon already woke in (First Generation, CR 7)
 *   stored   Scales the next combat starts with (Charged Lacrima), kept out of combat
 *   twins    { round, targets, paid }: the enemies the slayer hit this round (Twin Dragons)
 *   emotion  { ally, half }: the combats the Flames of Emotion already fed in
 */
import { L, SYSTEM_ID } from "../settings.mjs";
import { canHeal } from "../conditions/damage.mjs";
import { endStatuses } from "../conditions/effects.mjs";
import { formulaData } from "../helpers/effect-formulas.mjs";
import { combatOf, postSummary, toInt } from "../helpers/utils.mjs";
import {
  areAllies, areEnemies, chooseOption, crOf, hasApex, identifierOf, motorContext, motorData, motorMax, pathOf,
  recentUse, roundKey, setMotor, STATUS_FLAG, talentOf, talentRank
} from "./motor.mjs";

export const MATADOR_ID = "matador";

/** Identifier of a Dragon Slayer skill. */
const T = name => `${MATADOR_ID}-${name}`;

/**
 * The elements: the tag of the dragon moves, the status they leave on a hit (its value from the CR), and the status
 * the slayer eats (the Sky eats the air: always a source).
 */
export const ELEMENTS = {
  fogo: { tag: "Flame", status: "burning", value: cr => Math.floor(cr / 2) + 2 },
  ferro: { tag: "Iron", status: "fissured", value: () => 1 },
  ceu: { tag: "Wind", status: "slowed", value: () => null, air: true },
  raio: { tag: "Shock", status: "shocked", value: cr => Math.floor(cr / 2) + 2 }
};

/** Each element's Secret Art and the status it leaves (besides the element's). */
const SECRET_ARTS = {
  "lotus-carmesim": { statusId: "burning", value: spent => spent * 2 },
  "carma-demoniaco": { statusId: "exposed" },
  "luz-despedacadora": { statusId: "prone" },
  "trovao-rugente": { statusId: "dazed" }
};

const DEFAULTS = { state: "humano", value: 0, dual: null, seed: null, awoken: null, stored: 0, twins: null, emotion: null };

/** The Path the actor follows (none with only the Lesser Scales). */
const path = (actor, lesser) => (lesser ? null : pathOf(actor, MATADOR_ID));

/** Whether a skill is one of the slayer's dragon moves (its [Magic Attack] skills). */
const isDragonMove = item => identifierOf(item).startsWith(`${MATADOR_ID}-`)
  && (item?.system?.tags ?? []).includes("Magic Attack");

/** The name of one of the actor's Dragon Slayer skills, for the chat lines and the statuses it gives. */
const nameOf = (actor, key) => talentOf(actor, T(key))?.name ?? "";

/** The element an actor chose (its element skill), or null. */
export function elementOf(actor) {
  const item = actor?.items.find(i => (i.type === "skill") && (i.flags?.[SYSTEM_ID]?.element?.class === MATADOR_ID));
  return item?.flags[SYSTEM_ID].element.id ?? null;
}

/** The element whose tag a damage card carries, other than `except`, or null. */
function elementOfTags(tags, except = null) {
  const keys = new Set((tags ?? []).map(t => String(t).toLowerCase()));
  return Object.keys(ELEMENTS).find(id => (id !== except) && keys.has(ELEMENTS[id].tag.toLowerCase())) ?? null;
}

/** How many scenarios the actor has finished (automation/scenes.mjs). */
const scenarioOf = actor => toInt(actor?.getFlag(SYSTEM_ID, "scenario"));

/** The Dragon Seed of this scenario. */
function seedOf(actor, data) {
  const seed = data?.seed;
  return (seed && (toInt(seed.scenario) === scenarioOf(actor))) ? toInt(seed.n) : 0;
}

/** The Seed after one more Dragon Force (The Inner Dragon stops it at 2). */
function grownSeed(actor, data) {
  let n = seedOf(actor, data) + 1;
  if ((pathOf(actor, MATADOR_ID) === "primeira") && talentOf(actor, T("dragao-interior"))) n = Math.min(n, 2);
  return { n, scenario: scenarioOf(actor) };
}

/** What the Dragon Force adds to the damage (and leaves as [Fatigue]): CR + 2 × Seed; CR × 2 + 2 × Seed with the Apex. */
function forceValue(actor, data) {
  const cr = crOf(actor);
  return (hasApex(actor, MATADOR_ID) ? cr * 2 : cr) + (2 * seedOf(actor, data));
}

/** The [Awakened] part of the Force and the part rolled as a bonus (Contained Seed halves the [Fatigue]). */
function forceParts(actor, data) {
  const n = forceValue(actor, data);
  if (!talentOf(actor, T("semente-contida"))) return { awakened: n, bonus: 0 };
  return { awakened: Math.ceil(n / 2), bonus: Math.floor(n / 2) };
}

/** Whether the Inner Dragon still watches over the slayer this scenario (First Generation, CR 7). */
function innerDragon(actor, data, lesser) {
  return !!combatOf(actor) && (path(actor, lesser) === "primeira") && !!talentOf(actor, T("despertar-interior"))
    && (data.awoken !== scenarioOf(actor));
}

/** Add Scales (or take them, with a negative n). */
async function addScales(actor, n, changes = {}) {
  const data = motorData(actor, MATADOR_ID);
  await setMotor(actor, MATADOR_ID, { ...data, ...changes, value: toInt(data.value) + n });
}

/** HP back to the slayer from a roll (not when [Cursed]), with the roll in the chat. */
async function healRoll(actor, formula, flavor) {
  if (!canHeal(actor)) return;
  const roll = await new Roll(formula).evaluate();
  await roll.toMessage({ speaker: ChatMessage.getSpeaker({ actor }), flavor });
  const hp = toInt(actor.system.health?.value);
  const max = toInt(actor.system.health?.max);
  const next = Math.min(max, hp + roll.total);
  if (next > hp) await actor.update({ "system.health.value": next });
}

/** The statuses of the elements a dragon move carries: the slayer's and the Dual Dragon Mode's. */
function elementStatuses(actor, data, lesser) {
  const cr = crOf(actor);
  const ids = [elementOf(actor), path(actor, lesser) === "primeira" ? data.dual : null].filter(Boolean);
  return [...new Set(ids)].map(id => ({ id, statusId: ELEMENTS[id].status, value: ELEMENTS[id].value(cr) }));
}

export const MATADOR = {
  id: MATADOR_ID,
  i18n: "Motor.Matador",
  states: ["humano", "forca"],
  stateColors: { humano: 0x8a6a25, forca: 0xb91c1c },
  defaults: DEFAULTS,
  costKeyword: "Escamas",
  chips: [{ key: "seed", words: ["Semente do Dragão", "Semente"] }],

  /** The cap of Scales: 3, +1 every 5 CR, + the SR of Dragon's Stomach. */
  max(actor, { lesser }) {
    const max = 3 + Math.floor(crOf(actor) / 5);
    if (lesser) return Math.max(1, Math.floor(max / 2));
    return max + talentRank(actor, T("estomago-de-dragao"));
  },

  /**
   * The state follows the Scales: the Dragon Force at the cap (in a started combat, not for the Lesser Scales), until
   * they reach 0; when it ends, the Seed grows.
   */
  normalize(actor, data) {
    const { lesser } = motorContext(actor, MATADOR_ID);
    const before = motorData(actor, MATADOR_ID);
    const max = motorMax(actor, MATADOR_ID);
    const next = { ...data };
    const value = toInt(next.value);
    if (lesser) next.state = "humano";
    else if ((next.state !== "forca") && (max > 0) && (value >= max) && combatOf(actor)) next.state = "forca";
    else if ((next.state === "forca") && (value <= 0)) next.state = "humano";
    if ((before.state === "forca") && (next.state !== "forca")) next.seed = grownSeed(actor, before);
    return next;
  },

  /** The Third Generation's Path skill enters the Force: in combat, out of it, with half the cap. */
  issues(actor, item, motor, { data, max, lesser }) {
    if ((identifierOf(item) !== T("terceira")) || lesser) return [];
    const out = [];
    if (!combatOf(actor)) out.push(L("Motor.Matador.Issue.Combat"));
    if (data.state === "forca") out.push(L("Motor.Matador.Issue.InForce"));
    const need = Math.ceil(max / 2);
    if (toInt(data.value) < need) out.push(L("Motor.Matador.Issue.Half", { n: need, have: toInt(data.value) }));
    return out;
  },

  /** With the Apex, the Third Generation enters the Force without an action. */
  actionOf(actor, item, motor, action) {
    if ((identifierOf(item) === T("terceira")) && hasApex(actor, MATADOR_ID)) return "none";
    return action;
  },

  /**
   * Devour: the source (the element's status on the target, which it eats; the air; or one the GM allows, asked),
   * Insatiable Hunger in the Force, the Dual Dragon Mode of the First Generation. The Absolute Roar.
   */
  async plan(actor, item, motor, { data, lesser, plan }) {
    const id = identifierOf(item);
    if (id === T("devorar")) {
      const element = elementOf(actor);
      const target = [...game.user.targets][0]?.actor ?? actor;
      const has = statusId => target.statuses?.has(statusId);
      let source = false;
      if (element && ELEMENTS[element].air) source = true;
      else if (element && has(ELEMENTS[element].status)) {
        source = true;
        plan.eat = { uuid: target.uuid, statusId: ELEMENTS[element].status };
      }
      else if (path(actor, lesser) === "primeira") {
        const other = Object.keys(ELEMENTS).find(e => (e !== element) && !ELEMENTS[e].air && has(ELEMENTS[e].status));
        if (other) {
          source = true;
          plan.eat = { uuid: target.uuid, statusId: ELEMENTS[other].status };
          plan.dual = other;
        }
      }
      if (!source && element) {
        const answer = await chooseOption(item.name, [
          { value: "yes", label: L("Motor.Matador.Source.Yes") },
          { value: "no", label: L("Motor.Matador.Source.No") }
        ], { hint: L(`Motor.Matador.Source.Hint.${element}`), selected: "no" });
        if (answer === null) return null;
        source = answer === "yes";
      }
      plan.source = source;
      plan.gain = 1 + (source ? 1 : 0)
        + ((!lesser && (data.state === "forca") && talentOf(actor, T("fome-insaciavel"))) ? 1 : 0)
        + ((plan.dual && hasApex(actor, MATADOR_ID)) ? 1 : 0);
    }
    if ((id === T("rugido")) && !lesser && (data.state === "forca") && talentOf(actor, T("rugido-absoluto"))
      && (plan.spent > 0) && (plan.spent >= toInt(data.value))) {
      plan.autoHit = true;
    }
    plan.vars.force = (data.state === "forca") ? 1 : 0;
    return plan;
  },

  /** Unbridled Lacrima gives 1 back to a dragon move in the Force; the Apex keeps half of what a Secret Art spent. */
  async after(actor, item, plan, next) {
    const { lesser, data } = motorContext(actor, MATADOR_ID);
    if (lesser) return next;
    const art = !!item.flags?.[SYSTEM_ID]?.motor?.art;
    if (art && hasApex(actor, MATADOR_ID)) next.value = toInt(next.value) + Math.floor(toInt(plan.spent) / 2);
    else if (!art && isDragonMove(item) && (data.state === "forca") && (toInt(plan.spent) >= 2)
      && (pathOf(actor, MATADOR_ID) === "segunda") && talentOf(actor, T("lacrima-sem-freio"))) {
      next.value = toInt(next.value) + 1;
    }
    return next;
  },

  /** Contained Seed: the half of the Force that is no [Awakened] is rolled with the damage. */
  rollBonuses(actor, item, which, { lesser }) {
    if (lesser || (which !== "damage") || item?.system?.damage?.recovery) return [];
    const data = motorData(actor, MATADOR_ID);
    const used = recentUse(item);
    const inForce = used ? (used.state === "forca") : (data.state === "forca");
    if (!inForce) return [];
    const { bonus } = forceParts(actor, data);
    return bonus ? [{ dice: 0, mod: bonus, label: L("Motor.Matador.Force") }] : [];
  },

  /** The dragon moves carry the element's tag (and the Dual Dragon Mode's). */
  damageTags(actor, item, { lesser }) {
    if (!isDragonMove(item)) return [];
    const data = motorData(actor, MATADOR_ID);
    return elementStatuses(actor, data, lesser).map(e => ELEMENTS[e.id].tag);
  },

  /** An ally's attack of the slayer's element does no damage: the slayer eats it. */
  absorbs(actor, card, { lesser }) {
    const element = elementOf(actor);
    if (!element || !card?.tags?.length || card.recovery) return "";
    const attacker = card.attackerUuid ? fromUuidSync(card.attackerUuid) : null;
    if (!(attacker instanceof Actor) || !areAllies(actor, attacker)) return "";
    if (!(card.tags ?? []).some(t => String(t).toLowerCase() === ELEMENTS[element].tag.toLowerCase())) return "";
    return L("Motor.Matador.Eats");
  },

  /**
   * Statuses on whoever a dragon move hits: the element's (and the Dual Dragon Mode's), the Claw's [Prone], the Echoing
   * Roar's [Dazed], the Iron Dragon's Sword's [Fissured], each Secret Art's.
   */
  onHit(actor, item, { lesser }) {
    if (!isDragonMove(item)) return [];
    const id = identifierOf(item);
    const data = motorData(actor, MATADOR_ID);
    const use = recentUse(item);
    const spent = toInt(use?.spent);
    const out = elementStatuses(actor, data, lesser).map(e => ({ statusId: e.statusId, value: e.value, name: item.name }));
    if (id === T("garra")) out.push({ statusId: "prone", value: null, name: item.name });
    if ((id === T("rugido")) && !lesser && (spent >= 3) && talentOf(actor, T("rugido-que-ecoa"))) {
      out.push({ statusId: "dazed", value: null, name: nameOf(actor, "rugido-que-ecoa") });
    }
    if (id === T("espada-de-ferro")) out.push({ statusId: "fissured", value: 1, name: item.name });
    const art = SECRET_ARTS[id.slice(MATADOR_ID.length + 1)];
    if (art) out.push({ statusId: art.statusId, value: art.value ? art.value(spent) : null, name: item.name });
    return out;
  },

  /**
   * In combat: the Dragon Force's [Awakened], Scale Skin's [Cancel: Scales], the Inner Dragon's [Last Stand] (once a
   * scenario).
   */
  statuses(actor, { lesser, data }) {
    if (!combatOf(actor)) return [];
    const out = [];
    if (!lesser && (data.state === "forca")) {
      out.push({ key: "forca", statusId: "awakened", value: forceParts(actor, data).awakened, name: L("Motor.Matador.Force") });
    }
    const scales = toInt(data.value);
    if ((scales > 0) && talentOf(actor, T("pele-de-escamas"))) {
      out.push({ key: "pele", statusId: "cancel", value: scales, name: nameOf(actor, "pele-de-escamas") });
    }
    if (innerDragon(actor, data, lesser)) {
      out.push({ key: "interior", statusId: "lastStand", name: nameOf(actor, "despertar-interior") });
    }
    return out;
  },

  /** The class tab and the HUD: the element (and the Dual Dragon Mode), the Seed; the Third Generation's Force ready. */
  display(actor, { lesser, data, max }) {
    const element = elementOf(actor);
    const parts = [];
    if (element) {
      const dual = (path(actor, lesser) === "primeira") && data.dual && (data.dual !== element) ? data.dual : null;
      parts.push(dual ? L("Motor.Matador.Dual", {
        element: L(`Motor.Matador.Element.${element}`), dual: L(`Motor.Matador.Element.${dual}`)
      }) : L(`Motor.Matador.Element.${element}`));
    }
    if (!lesser) parts.push(L("Motor.Matador.SeedNote", { n: seedOf(actor, data) }));
    const third = !lesser && (pathOf(actor, MATADOR_ID) === "terceira") && (data.state !== "forca")
      && (toInt(data.value) >= Math.ceil(max / 2)) && !!combatOf(actor);
    return { note: parts.join(" · "), ready: third, readyLabel: L("Motor.Matador.ForceReady") };
  },

  /** @motor.seed in the formulas. */
  formulaData(actor, item, { data }) {
    return { seed: seedOf(actor, data) };
  },

  /* ------------------------------------------ */
  /*  Events                                    */
  /* ------------------------------------------ */

  /** Every combat starts out of the Force, with the Scales of Full Belly and of the Charged Lacrima. */
  async onCombatStart(actor, { lesser }) {
    const data = motorData(actor, MATADOR_ID);
    const stored = ((path(actor, lesser) === "segunda") && talentOf(actor, T("lacrima-carregada"))) ? toInt(data.stored) : 0;
    await setMotor(actor, MATADOR_ID, {
      ...DEFAULTS, seed: data.seed, awoken: data.awoken, value: talentRank(actor, T("barriga-cheia")) + stored
    });
  },

  /** The end of the combat ends the Force; the Charged Lacrima keeps half the Scales for the next one. */
  async onCombatEnd(actor, { lesser }) {
    const data = motorData(actor, MATADOR_ID);
    const keep = (path(actor, lesser) === "segunda") && talentOf(actor, T("lacrima-carregada"));
    await setMotor(actor, MATADOR_ID, {
      ...DEFAULTS, seed: data.seed, awoken: data.awoken, stored: keep ? Math.floor(toInt(data.value) / 2) : 0
    });
  },

  /** Setup Process: the Second Generation's lacrima (+1, +2 with the Apex). */
  async onSetup(actor, { lesser }) {
    if (path(actor, lesser) !== "segunda") return;
    await addScales(actor, hasApex(actor, MATADOR_ID) ? 2 : 1);
  },

  /** Cleanup Process: the Force burns 1 Scale (not with Limitless Force). */
  async onCleanup(actor, { lesser }) {
    const data = motorData(actor, MATADOR_ID);
    if (lesser || (data.state !== "forca")) return;
    if ((path(actor, lesser) === "terceira") && talentOf(actor, T("forca-sem-limite"))) return;
    await addScales(actor, -1);
  },

  /** Devour eats the status of the source (and may start the Dual Dragon Mode); Dragon's Meal heals with a source. */
  async onUse(actor, { lesser }, item, plan) {
    if ((identifierOf(item) !== T("devorar")) || !plan) return;
    if (plan.eat) {
      const target = fromUuidSync(plan.eat.uuid);
      const line = (target instanceof Actor) ? await endStatuses(target, [plan.eat.statusId], actor) : null;
      if (line) await postSummary(item.name, [line]);
    }
    if (plan.dual && (path(actor, lesser) === "primeira")) {
      const data = motorData(actor, MATADOR_ID);
      await setMotor(actor, MATADOR_ID, { ...data, dual: plan.dual });
    }
    const meal = !lesser && plan.source && talentOf(actor, T("alimento-do-dragao"));
    if (meal) await healRoll(actor, `2d6 + ${toInt(formulaData(actor, item).recovery)}`, meal.name);
  },

  /**
   * A damage card reached the slayer: its element gives 1 Scale (not to the Second Generation); for the First, another
   * dragon element gives 1 and starts the Dual Dragon Mode.
   */
  async onStruck(actor, { lesser }, card, amount, attacker) {
    if (!combatOf(actor) || !(attacker instanceof Actor) || (attacker.uuid === actor.uuid) || card?.recovery) return;
    const element = elementOf(actor);
    const tags = card?.tags ?? [];
    const followed = path(actor, lesser);
    if (element && tags.some(t => String(t).toLowerCase() === ELEMENTS[element].tag.toLowerCase())) {
      if (followed !== "segunda") await addScales(actor, 1);
      return;
    }
    const other = (followed === "primeira") ? elementOfTags(tags, element) : null;
    if (other) await addScales(actor, hasApex(actor, MATADOR_ID) ? 2 : 1, { dual: other });
  },

  /** HP lost: the Inner Dragon wakes (it kept the slayer at 1 HP); the Flames of Emotion at half the HP. */
  async onDamaged(actor, { lesser }, amount) {
    const combat = combatOf(actor);
    if (!combat) return;
    const data = motorData(actor, MATADOR_ID);
    const hp = toInt(actor.system.health?.value);
    const max = toInt(actor.system.health?.max);
    const kept = actor.effects.some(e => e.flags?.[SYSTEM_ID]?.[STATUS_FLAG] === `${MATADOR_ID}:interior`);
    if (innerDragon(actor, data, lesser) && (hp === 1) && !kept) {
      await setMotor(actor, MATADOR_ID, { ...data, value: motorMax(actor, MATADOR_ID), awoken: scenarioOf(actor) });
      await postSummary(nameOf(actor, "despertar-interior"), [L("Motor.Matador.InnerDragon", { name: actor.name })]);
      return;
    }
    const emotion = data.emotion ?? {};
    if (!lesser && talentOf(actor, T("chama-das-emocoes")) && (emotion.half !== combat.id)
      && (hp <= Math.floor(max / 2)) && (hp + amount > Math.floor(max / 2))) {
      await addScales(actor, 2, { emotion: { ...emotion, half: combat.id } });
    }
  },

  /** Twin Dragons: the enemies the slayer hits this round. */
  async onHitTarget(actor, { lesser }, target) {
    if ((path(actor, lesser) !== "terceira") || !talentOf(actor, T("dragoes-gemeos")) || !areEnemies(actor, target)) return;
    const data = motorData(actor, MATADOR_ID);
    const round = roundKey(actor);
    const twins = (data.twins?.round === round) ? data.twins : { round, targets: [], paid: false };
    if (twins.targets.includes(target.uuid)) return;
    await setMotor(actor, MATADOR_ID, { ...data, twins: { ...twins, targets: [...twins.targets, target.uuid] } });
  },

  /** Twin Dragons: an ally hits an enemy the slayer hit this round (+1, once a round). */
  async onAnyHit(actor, { lesser }, attacker, target) {
    if ((path(actor, lesser) !== "terceira") || !talentOf(actor, T("dragoes-gemeos")) || !areAllies(actor, attacker)) return;
    const data = motorData(actor, MATADOR_ID);
    const twins = data.twins;
    if (!twins || (twins.round !== roundKey(actor)) || twins.paid || !twins.targets.includes(target?.uuid)) return;
    await addScales(actor, 1, { twins: { ...twins, paid: true } });
  },

  /** Taste of Victory: an enemy a dragon move of the slayer brings to 0 HP (+1). */
  async onKill(actor, { lesser }, target, item) {
    if (lesser || !areEnemies(actor, target) || !isDragonMove(item) || (item.actor?.uuid !== actor.uuid)) return;
    if (talentOf(actor, T("sabor-da-vitoria"))) await addScales(actor, 1);
  },

  /** Flames of Emotion: an ally falls (+2, once a combat). */
  async onAnyKill(actor, { lesser }, victim) {
    const combat = combatOf(actor);
    if (lesser || !combat || !areAllies(actor, victim) || !talentOf(actor, T("chama-das-emocoes"))) return;
    const data = motorData(actor, MATADOR_ID);
    const emotion = data.emotion ?? {};
    if (emotion.ally === combat.id) return;
    await addScales(actor, 2, { emotion: { ...emotion, ally: combat.id } });
  }
};
