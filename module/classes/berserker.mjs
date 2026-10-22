/**
 * The Berserker's Motor: Rage (Ira). docs/classes.md has the class; AS REGRAS, its page in XI, the rules as the
 * player reads them.
 *
 * Every attack that takes HP from the berserker adds 1 Rage (2 when it leaves the berserker at half its HP or less),
 * up to the cap (3, +1 every 5 CR, + the SR of War Scars). While it has Rage its weapon attacks add +[Rage × 2] to the
 * damage (+1D every 2 Rage on the Giant's Path; +Rage for the Lesser Rage). Savage Strike spends all of it ((2 +
 * Rage)D + Rage × CR); Breath of Blood turns the Rage spent into HP; Bleed trades HP for Rage. A round in which the
 * berserker neither attacked nor lost HP costs 1 Rage at the Cleanup Process.
 *
 * Refuse to Fall (3 Rage) and the Apex (2 Rage) keep [Last Stand] on the berserker (statuses below): when it saves
 * the berserker from 0 HP, the damage event finds it gone and takes the Rage it costs.
 *
 * State in flags.eternia.motor.berserker:
 *   value    Rage
 *   active   "<combat>.<round>" of the last attack made or HP lost (the Cleanup decay)
 */
import { L, SYSTEM_ID } from "../settings.mjs";
import { canHeal } from "../conditions/damage.mjs";
import { getHands, isTwoHanded } from "../helpers/hands.mjs";
import { combatOf, toInt } from "../helpers/utils.mjs";
import {
  areAllies, areEnemies, crOf, hasApex, identifierOf, motorData, motorOf, pathOf, recentUse, roundKey, setMotor,
  STATUS_FLAG, talentOf, talentRank
} from "./motor.mjs";

export const BERSERKER_ID = "berserker";

/** Identifier of a Berserker skill. */
const T = name => `${BERSERKER_ID}-${name}`;

const DEFAULTS = { state: "acesa", value: 0, active: null };

/** The key of the [Last Stand] the Motor keeps (motor.mjs syncMotorStatuses). */
const LAST_STAND = `${BERSERKER_ID}:lastStand`;

/** The Path the actor follows (none with only the Lesser Rage). */
const path = (actor, lesser) => (lesser ? null : pathOf(actor, BERSERKER_ID));

const isWeaponAttack = item => (item?.system?.tags ?? []).includes("Weapon Attack");

/** HP of an actor: { hp, max }. */
const hpOf = actor => ({ hp: toInt(actor.system.health?.value), max: toInt(actor.system.health?.max) });

/** The Rage that keeps [Last Stand] on: 2 with the Apex, 3 with Refuse to Fall, none otherwise. */
function lastStandAt(actor, lesser) {
  if (lesser) return 0;
  if (hasApex(actor, BERSERKER_ID)) return 2;
  return talentOf(actor, T("recusar-a-queda")) ? 3 : 0;
}

/** HP back to the berserker (not when [Cursed]), with a line in the chat. */
async function heal(actor, amount, what) {
  if ((amount <= 0) || !canHeal(actor)) return;
  const { hp, max } = hpOf(actor);
  const next = Math.min(max, hp + amount);
  if (next <= hp) return;
  await actor.update({ "system.health.value": next });
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content: `<p><strong>${what}</strong>: +${next - hp} PV</p>`
  });
}

/** Add Rage (and mark the round as active). */
async function addRage(actor, n, { active = false } = {}) {
  const data = motorData(actor, BERSERKER_ID);
  const changes = active ? { active: roundKey(actor) } : {};
  await setMotor(actor, BERSERKER_ID, { ...data, ...changes, value: toInt(data.value) + n });
}

export const BERSERKER = {
  id: BERSERKER_ID,
  i18n: "Motor.Berserker",
  states: ["acesa"],
  defaults: DEFAULTS,
  costKeyword: "Ira",

  /** The cap of Rage. */
  max(actor, { lesser }) {
    const max = 3 + Math.floor(crOf(actor) / 5);
    if (lesser) return Math.max(1, Math.floor(max / 2));
    return max + talentRank(actor, T("cicatrizes"));
  },

  /** Bleed needs more HP than it costs. */
  issues(actor, item) {
    if (identifierOf(item) !== T("sangrar")) return [];
    const cost = crOf(actor) + 5;
    return (hpOf(actor).hp <= cost) ? [L("Motor.Berserker.BleedIssue", { n: cost })] : [];
  },

  /** Boiling Blood: Bleed is a Move Action. */
  actionOf(actor, item, motor, action) {
    if ((identifierOf(item) === T("sangrar")) && talentOf(actor, T("sangue-fervente"))) return "move";
    return action;
  },

  /** Boiling Blood (+3 Rage from Bleed), Red Eyes (in [Berserk], the Savage Strike always hits), Bestial Breath. */
  plan(actor, item, motor, { lesser, plan }) {
    const id = identifierOf(item);
    if ((id === T("sangrar")) && talentOf(actor, T("sangue-fervente"))) plan.gain = 3;
    if ((id === T("golpe-selvagem")) && !lesser && talentOf(actor, T("olhos-vermelhos")) && actor.statuses.has("berserk")) {
      plan.autoHit = true;
    }
    if (id === T("folego")) plan.vars.bestial = talentOf(actor, T("folego-bestial")) ? 1 : 0;
    return plan;
  },

  /** Bleed costs [CR+5] HP; the Dragon's Savage Strike with the Apex keeps half the Rage spent. */
  async after(actor, item, plan, next) {
    const id = identifierOf(item);
    if (id === T("sangrar")) {
      const { hp } = hpOf(actor);
      await actor.update({ "system.health.value": Math.max(1, hp - (crOf(actor) + 5)) });
      next.active = roundKey(actor) ?? next.active;
    }
    if ((id === T("golpe-selvagem")) && !motorOf(actor, BERSERKER_ID)?.lesser && (pathOf(actor, BERSERKER_ID) === "dragao")
      && hasApex(actor, BERSERKER_ID)) {
      next.value = Math.floor(toInt(plan.spent) / 2);
    }
    return next;
  },

  /** The Rage in the damage of weapon attacks: +2 per Rage; +1D every 2 Rage on the Giant's Path (every Rage with the Apex). */
  rollBonuses(actor, item, which, { lesser }) {
    if ((which !== "damage") || !isWeaponAttack(item)) return [];
    const rage = toInt(motorData(actor, BERSERKER_ID).value);
    if (rage < 1) return [];
    const label = L("Motor.Berserker.Name");
    if (lesser) return [{ dice: 0, mod: rage, label }];
    if (pathOf(actor, BERSERKER_ID) === "gigante") {
      let dice = Math.floor(rage / (hasApex(actor, BERSERKER_ID) ? 1 : 2));
      if (isTwoHanded(getHands(actor).main)) dice += 1;
      return dice ? [{ dice, mod: 0, label }] : [];
    }
    return [{ dice: 0, mod: rage * 2, label }];
  },

  /** Statuses on whoever the Savage Strike hits: Earthquake (4 Rage: [Prone]), Dragon's Heart ([Burning: Rage spent]). */
  onHit(actor, item, { lesser }) {
    if (lesser) return [];
    const id = identifierOf(item);
    const spent = toInt(recentUse(item)?.spent);
    const followed = pathOf(actor, BERSERKER_ID);
    const out = [];
    if ((id === T("golpe-selvagem")) && (followed === "gigante") && talentOf(actor, T("terremoto")) && (spent >= 4)) {
      out.push({ statusId: "prone", value: null, name: talentOf(actor, T("terremoto")).name });
    }
    if ((id === T("golpe-selvagem")) && (followed === "dragao") && talentOf(actor, T("coracao-de-dragao")) && (spent > 0)) {
      out.push({ statusId: "burning", value: spent, name: talentOf(actor, T("coracao-de-dragao")).name });
    }
    if (id === T("arrancada")) out.push({ statusId: "prone", value: null, name: item.name });
    if (id === T("esmagar")) out.push({ statusId: "fissured", value: 1, name: item.name });
    return out;
  },

  /** [Last Stand] while the Rage keeps the berserker standing (Refuse to Fall, the Apex). */
  statuses(actor, { lesser, data }) {
    const at = lastStandAt(actor, lesser);
    if (!at || !combatOf(actor) || (toInt(data.value) < at)) return [];
    return [{ key: "lastStand", statusId: "lastStand" }];
  },

  /** The class tab and the HUD: whether the Rage keeps the berserker from falling. */
  display(actor, { lesser, data }) {
    const at = lastStandAt(actor, lesser);
    return { ready: !!at && (toInt(data.value) >= at), readyLabel: L("Motor.Berserker.Ready") };
  },

  /* ------------------------------------------ */
  /*  Events                                    */
  /* ------------------------------------------ */

  /** Every combat starts with the Rage of Hot Blood. */
  async onCombatStart(actor) {
    await setMotor(actor, BERSERKER_ID, { ...DEFAULTS, value: talentRank(actor, T("sangue-quente")) });
  },

  async onCombatEnd(actor) {
    await setMotor(actor, BERSERKER_ID, { ...DEFAULTS });
  },

  /** Setup Process: Open Wound (at half HP or less: +1 Rage). */
  async onSetup(actor, { lesser }) {
    if (lesser || !talentOf(actor, T("ferida-aberta"))) return;
    const { hp, max } = hpOf(actor);
    if (hp <= Math.floor(max / 2)) await addRage(actor, 1);
  },

  /** Cleanup Process: a round without attacking nor losing HP costs 1 Rage. */
  async onCleanup(actor, context, combat, round) {
    const data = motorData(actor, BERSERKER_ID);
    if ((data.active === `${combat.id}.${round}`) || (toInt(data.value) < 1)) return;
    await setMotor(actor, BERSERKER_ID, { ...data, value: toInt(data.value) - 1 });
  },

  /**
   * An enemy attack took HP: +1 Rage, +1 more at half HP or less. When the Motor's [Last Stand] just saved the
   * berserker from 0 HP, it costs its Rage: all of it (Refuse to Fall), or 2 (the Apex).
   */
  async onDamaged(actor, { lesser }, amount, attacker) {
    if (!combatOf(actor) || !(amount > 0) || !areEnemies(actor, attacker)) return;
    const data = motorData(actor, BERSERKER_ID);
    const { hp, max } = hpOf(actor);
    let value = toInt(data.value) + 1 + ((!lesser && (hp <= Math.floor(max / 2))) ? 1 : 0);
    const at = lastStandAt(actor, lesser);
    const saved = at && (hp === 1) && (toInt(data.value) >= at)
      && !actor.effects.some(e => e.flags?.[SYSTEM_ID]?.[STATUS_FLAG] === LAST_STAND);
    if (saved) value = hasApex(actor, BERSERKER_ID) ? Math.max(0, value - 2) : 0;
    await setMotor(actor, BERSERKER_ID, { ...data, value, active: roundKey(actor) });
  },

  /** Weapon attacks keep the Rage burning; Breath of Blood heals [Rage spent × (CR+5)] ((CR+10) with Bestial Breath). */
  async onUse(actor, context, item, plan) {
    if (isWeaponAttack(item) && combatOf(actor)) {
      const data = motorData(actor, BERSERKER_ID);
      await setMotor(actor, BERSERKER_ID, { ...data, active: roundKey(actor) });
    }
    if ((identifierOf(item) === T("folego")) && plan) {
      const per = crOf(actor) + (talentOf(actor, T("folego-bestial")) ? 10 : 5);
      await heal(actor, toInt(plan.spent) * per, item.name);
    }
  },

  /** Blind Fury: in [Berserk], every hit of the berserker's attacks gives +1 Rage. */
  async onHitTarget(actor, { lesser }, target) {
    if (lesser || !areEnemies(actor, target) || !actor.statuses.has("berserk") || !talentOf(actor, T("furia-cega"))) return;
    await addRage(actor, 1, { active: true });
  },

  /** An enemy brought to 0 HP by the berserker: Battle Thirst (a weapon attack: +1), Crimson Harvest (the spin: +1). */
  async onKill(actor, { lesser }, target, item) {
    if (lesser || !areEnemies(actor, target) || !item || (item.actor?.uuid !== actor.uuid)) return;
    let n = 0;
    if (isWeaponAttack(item) && talentOf(actor, T("sede-de-batalha"))) n += 1;
    if ((identifierOf(item) === T("giro-selvagem")) && talentOf(actor, T("colheita-rubra"))) n += 1;
    if (n) await addRage(actor, n, { active: true });
  },

  /** Ancestors' Path: an ally hurt by an enemy attack gives +1 Rage. */
  async onAnyDamaged(actor, { lesser }, victim, amount, attacker) {
    if ((path(actor, lesser) !== "ancestrais") || !combatOf(actor)) return;
    if (!areAllies(actor, victim) || !areEnemies(actor, attacker)) return;
    await addRage(actor, 1);
  },

  /**
   * Ancestors' Path: an ally falls: +2 Rage (+3 and [CR+5] HP with the Apex); Fury of the Ancestors puts the
   * berserker in [Berserk: Rage × 2].
   */
  async onAnyKill(actor, { lesser }, victim) {
    if ((path(actor, lesser) !== "ancestrais") || !combatOf(actor) || !areAllies(actor, victim)) return;
    const apex = hasApex(actor, BERSERKER_ID);
    await addRage(actor, apex ? 3 : 2);
    if (apex) await heal(actor, crOf(actor) + 5, L("Motor.Berserker.Ancestors"));
    const fury = talentOf(actor, T("furia-dos-ancestrais"));
    if (fury) {
      const rage = toInt(motorData(actor, BERSERKER_ID).value);
      await game.eternia.applyStatus(actor, "berserk", { value: Math.max(1, rage * 2), from: actor });
    }
  }
};
