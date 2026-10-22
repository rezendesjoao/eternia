/**
 * The Priest's Motor: Grace (Graça). docs/classes.md has the class; AS REGRAS, page XI, the rules as the player
 * reads them.
 *
 * Grace grows from the party's wounds: each time an enemy's attack takes HP from an ally of the priest, +1 (+1 more
 * when that ally is left at half HP or less), up to the cap (3, +1 every 5 CR, + the SR of Open Heart). The Healing
 * Prayer and the Shield of Faith spend as much as the priest chooses: heal after, or prevent before. Every combat
 * starts with 0 Grace (or the SR of First Prayer) and the end of the combat resets it.
 *
 * The Paths rewrite how Grace is gained (Mercy: also each use that gives HP back; Martyr: only the attacks that
 * hurt the priest, +2 each) or what the Prayer does (Dawn: an area, without the CR part). The Apex, Holiness, keeps
 * an ally from falling: when an attack would leave an ally at 0 HP, all the Grace goes into its HP instead.
 *
 * State in flags.eternia.motor.sacerdote:
 *   state     "vigilia" (the only one)
 *   value     Grace
 *   saved     "<combat>.<n>": the combat and how many times Holiness kept someone up in it
 *   mercy     "<item>.<use>" of the last use that gave Grace on the Path of Mercy (once per use)
 *   overflow  the same for Overflowing Grace
 *   mercyAt, overflowAt  when they were last seen (heals without a recorded use are one use within 5 s)
 */
import { L } from "../settings.mjs";
import { canHeal } from "../conditions/damage.mjs";
import { evaluateFormula, formulaData } from "../helpers/effect-formulas.mjs";
import { combatOf, toInt } from "../helpers/utils.mjs";
import {
  areAllies, areEnemies, chooseOption, combatPeers, crOf, hasApex, identifierOf, motorData, pathOf, recentUse,
  setMotor, talentOf, talentRank
} from "./motor.mjs";

export const SACERDOTE_ID = "sacerdote";

/** Identifier of a Priest skill. */
const T = name => `sacerdote-${name}`;

const DEFAULTS = { state: "vigilia", value: 0, saved: null, mercy: null, mercyAt: null, overflow: null, overflowAt: null };

/** The Path the actor follows (none with only the Lesser Grace). */
const path = (actor, lesser) => (lesser ? null : pathOf(actor, SACERDOTE_ID));

/** HP of an actor now, and whether it is at half its Max HP or less. */
const hpOf = actor => toInt(actor?.system?.health?.value);
function wounded(actor) {
  const max = toInt(actor?.system?.health?.max);
  return (max > 0) && (hpOf(actor) * 2 <= max);
}

/** Whether an ally of the priest (the priest left out) fights in its combat at half HP or less. */
const anyWoundedAlly = actor => combatPeers(actor).some(a => areAllies(actor, a) && wounded(a));

/** How long heals of a skill without a recorded use count as one use. */
const SAME_USE_MS = 5000;

/**
 * Whether a heal belongs to a use already counted (`stored` and `at`: the key and time kept on the Motor). A skill's
 * use is its last motorUse; a heal without one counts with the heals of the same skill in the 5 s before it.
 * @returns {{same: boolean, key: string}}
 */
function sameUse(item, stored, at) {
  const use = recentUse(item);
  const key = use ? `${item?.uuid ?? "?"}.${use.at}` : `${item?.uuid ?? "?"}`;
  const same = use ? (stored === key) : ((stored === key) && (Date.now() - toInt(at) < SAME_USE_MS));
  return { same, key };
}

/** Holiness: uses this scene ("<combat>.<n>"), and how many the Path allows. */
function holinessLeft(actor, data) {
  const combat = combatOf(actor);
  if (!combat) return 0;
  const [id, n] = String(data.saved ?? "").split(".");
  const used = (id === combat.id) ? toInt(n) : 0;
  const allowed = (pathOf(actor, SACERDOTE_ID) === "aurora") ? 2 : 1;
  return Math.max(0, allowed - used);
}

/**
 * Holiness (Apex): an attack left `victim` at 0 HP; all the Grace goes into its HP. Returns the Grace left, or null
 * when it didn't happen (no Grace, no uses left, a [Cursed] victim, or this window can't change the victim).
 */
async function keepStanding(actor, victim, grace, data) {
  if ((grace < 1) || !holinessLeft(actor, data) || !canHeal(victim) || !victim.isOwner) return null;
  const hp = Math.min(grace * (crOf(actor) + 5), toInt(victim.system.health.max));
  await victim.update({ "system.health.value": hp });
  if (victim.statuses.has("incapacitated")) await victim.toggleStatusEffect("incapacitated", { active: false });
  const combat = combatOf(actor);
  const [id, n] = String(data.saved ?? "").split(".");
  data.saved = `${combat.id}.${(id === combat.id ? toInt(n) : 0) + 1}`;
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content: `<div class="eternia chat-card"><p>${L("Motor.Sacerdote.Holiness", { name: victim.token?.name ?? victim.name, hp })}</p></div>`
  });
  return (pathOf(actor, SACERDOTE_ID) === "misericordia") ? Math.floor(grace / 2) : 0;
}

export const SACERDOTE = {
  id: SACERDOTE_ID,
  i18n: "Motor.Sacerdote",
  states: ["vigilia"],
  defaults: DEFAULTS,
  costKeyword: "Graça",

  /** The cap of Grace. */
  max(actor, { lesser }) {
    let max = 3 + Math.floor(crOf(actor) / 5);
    if (lesser) max = Math.max(1, Math.floor(max / 2));
    return max + talentRank(actor, T("coracao-aberto"));
  },

  /**
   * How much Grace a use spends: the skills with `pick` ask, from 0 up to their `max` (a formula; all the Grace without
   * one). The Healing Prayer on the Dawn Path heals an area without the CR part (@use.area), unless High Sun.
   */
  async plan(actor, item, motor, { data, lesser, plan }) {
    const id = identifierOf(item);
    if (motor.pick) {
      const have = toInt(data.value);
      const limit = motor.max ? (evaluateFormula(String(motor.max), formulaData(actor, item)) ?? have) : have;
      const top = Math.max(0, Math.min(limit, have));
      if (top > 0) {
        const options = Array.from({ length: top + 1 }, (_, n) => ({ value: String(n), label: L("Motor.Sacerdote.PickOption", { n }) }));
        const choice = await chooseOption(item.name, options, { hint: L("Motor.Sacerdote.Pick", { have }), selected: String(top) });
        if (choice === null) return null;
        plan.spent = toInt(choice);
      }
    }
    if (id === T("oracao")) {
      plan.vars.area = ((path(actor, lesser) === "aurora") && !talentOf(actor, T("sol-a-pino"))) ? 1 : 0;
    }
    // Deep Prayer: +1 more with a wounded ally in the combat.
    if ((id === T("prece-profunda")) && anyWoundedAlly(actor)) plan.gain += 1;
    return plan;
  },

  /** The class tab and the HUD: Grace at the cap, and the Holiness left in this combat. */
  display(actor, { lesser, data, max }) {
    const ready = (max > 0) && (toInt(data.value) >= max);
    const note = (!lesser && hasApex(actor, SACERDOTE_ID) && combatOf(actor))
      ? L("Motor.Sacerdote.HolinessNote", { n: holinessLeft(actor, data) }) : "";
    return { ready, readyLabel: L("Motor.Sacerdote.ReadyLabel"), note };
  },

  /** Burning Faith: [Holy] attacks add the Grace the priest has when the damage is rolled. */
  rollBonuses(actor, item, which) {
    if (which !== "damage") return [];
    const faith = talentOf(actor, T("fe-ardente"));
    if (!faith || item.system?.damage?.recovery || !(item.system?.tags ?? []).includes("Holy")) return [];
    const grace = toInt(motorData(actor, SACERDOTE_ID).value);
    return grace ? [{ dice: 0, mod: grace, label: faith.name }] : [];
  },

  /* ------------------------------------------ */
  /*  Events                                    */
  /* ------------------------------------------ */

  /** Every combat starts with the Grace of First Prayer. */
  async onCombatStart(actor) {
    await setMotor(actor, SACERDOTE_ID, { ...DEFAULTS, value: talentRank(actor, T("primeira-prece")) });
  },

  async onCombatEnd(actor) {
    await setMotor(actor, SACERDOTE_ID, { ...DEFAULTS });
  },

  /** Constant Vigil: Setup Process with a wounded ally: +1 Grace. */
  async onSetup(actor) {
    if (!talentOf(actor, T("vigilia-constante")) || !anyWoundedAlly(actor)) return;
    const data = motorData(actor, SACERDOTE_ID);
    await setMotor(actor, SACERDOTE_ID, { ...data, value: toInt(data.value) + 1 });
  },

  /**
   * An attack took HP from someone in the combat. An ally hurt by an enemy: +1 Grace (+1 at half HP or less; the
   * Martyr gains only from its own wounds, +2). An ally down to 0 HP: Shepherd's Watch (+2), then Holiness may keep
   * it standing with all the Grace.
   */
  async onAnyDamaged(actor, { lesser }, victim, amount, attacker) {
    if (!victim || !(amount > 0)) return;
    const followed = path(actor, lesser);
    const self = victim.uuid === actor.uuid;
    const hostile = !!attacker && areEnemies(attacker, victim);
    const ally = areAllies(actor, victim);
    const data = motorData(actor, SACERDOTE_ID);
    let grace = toInt(data.value);
    if (followed === "martir") {
      if (self && hostile) grace += 2;
    }
    else if (ally && hostile) grace += 1 + ((!lesser && wounded(victim)) ? 1 : 0);

    const fell = hpOf(victim) <= 0;
    if (fell && ally && talentOf(actor, T("olhar-do-pastor"))) grace += 2;
    // Holiness spends what the gains above brought too: write the cap first, as setMotor would.
    const max = this.max(actor, { lesser });
    grace = Math.min(grace, max);
    if (fell && !lesser && hasApex(actor, SACERDOTE_ID) && (ally || (self && (followed === "martir")))) {
      const left = await keepStanding(actor, victim, grace, data);
      if (left !== null) grace = left;
    }
    if ((grace !== toInt(data.value)) || (data.saved !== motorData(actor, SACERDOTE_ID).saved)) {
      await setMotor(actor, SACERDOTE_ID, { ...data, value: grace });
    }
  },

  /**
   * A heal gave HP back. Path of Mercy: each use of the priest's that heals, +1 Grace (once per use); Overflowing
   * Grace: a heal of the priest's that leaves someone at full HP, +1 more (once per use).
   */
  async onAnyHealed(actor, { lesser }, target, amount, healer, item) {
    if (!target || !(amount > 0) || (healer?.uuid !== actor.uuid) || (path(actor, lesser) !== "misericordia")) return;
    if (!(areAllies(actor, target) || (target.uuid === actor.uuid))) return;
    const data = motorData(actor, SACERDOTE_ID);
    const now = Date.now();
    let grace = toInt(data.value);
    const mercy = sameUse(item, data.mercy, data.mercyAt);
    if (!mercy.same) {
      data.mercy = mercy.key;
      grace += 1;
    }
    data.mercyAt = now;
    const full = hpOf(target) >= toInt(target.system?.health?.max);
    const overflow = sameUse(item, data.overflow, data.overflowAt);
    if (full && !overflow.same && talentOf(actor, T("graca-transbordante"))) {
      data.overflow = overflow.key;
      data.overflowAt = now;
      grace += 1;
    }
    await setMotor(actor, SACERDOTE_ID, { ...data, value: grace });
  },

  /**
   * After a use: Light of Dawn (a Prayer on 3 or more allies: +1 Grace) and Holy Blood (a Prayer that spent Grace
   * gives the Martyr [Regen]).
   */
  async onUse(actor, { lesser }, item, plan) {
    if (identifierOf(item) !== T("oracao")) return;
    const followed = path(actor, lesser);
    if ((followed === "aurora") && talentOf(actor, T("luz-da-aurora")) && (game.user.targets.size >= 3)) {
      const data = motorData(actor, SACERDOTE_ID);
      await setMotor(actor, SACERDOTE_ID, { ...data, value: toInt(data.value) + 1 });
    }
    const spent = toInt(plan?.spent);
    const blood = talentOf(actor, T("sangue-sagrado"));
    if ((followed === "martir") && blood && (spent > 0)) {
      // Loaded here: chat/status-links.mjs reaches motor.mjs back through automation/use.mjs.
      const { giveEffects, statusEffectData } = await import("../chat/status-links.mjs");
      const value = spent * (Math.floor(crOf(actor) / 2) + 2);
      await giveEffects(actor, [statusEffectData("regen", value, "", { item: blood, caster: actor, expires: "endOfScene" })]);
    }
  }
};
