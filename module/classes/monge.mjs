/**
 * The Monk's Motor: the Chain (Corrente). docs/classes.md has the class; AS REGRAS, page XI, the rules as the player
 * reads them.
 *
 * The monk's strikes link into a chain of Links (Elos): the Opening Strike and the Quick Link add one each, and the
 * Final Strike spends them all, 2D + CR each (with a full Chain, the target is [Dazed]). The chain breaks when one of
 * the monk's turns ends without a Chain skill, an enemy's attack that takes HP away loses one Link, and every combat
 * starts with none. The strikes need a [Martial Arts] weapon in the main hand, or both hands empty.
 *
 * State in flags.eternia.motor.monge:
 *   value   Links
 *   struck  "<combat>.<round>" of the last Chain skill (the turn-end break)
 *   hurt    "<combat>.<round>" of the last HP lost to an attack (River's Living Tide)
 */
import { L } from "../settings.mjs";
import { getHands } from "../helpers/hands.mjs";
import { toInt } from "../helpers/utils.mjs";
import { actionsLeft } from "../automation/use.mjs";
import { removeStatuses } from "../conditions/rules.mjs";
import {
  areEnemies, combatPeers, crOf, hasApex, identifierOf, mainWeaponTags, motorData, motorMax, pathOf, recentUse,
  roundKey, setMotor, talentOf, talentRank
} from "./motor.mjs";

export const MONGE_ID = "monge";

/** Identifier of a Monk skill. */
const T = name => `monge-${name}`;

const DEFAULTS = { state: "aberta", value: 0, struck: null, hurt: null };

/** What a full Chain frees the monk of, with Unmoving Heart. */
const CLEARED = ["dazed", "staggered", "confused", "slowed"];

/** The Path the actor follows (none with only the Lesser Chain). */
const path = (actor, lesser) => (lesser ? null : pathOf(actor, MONGE_ID));

/** Whether the actor can strike as a monk: a [Martial Arts] weapon in the main hand, or both hands empty. */
function canStrike(actor) {
  const { main, off } = getHands(actor);
  return (!main && !off) || mainWeaponTags(actor).includes("martial arts");
}

/** Write the Links; a full Chain frees the monk of [Dazed], [Staggered], [Confused] and [Slowed] (Unmoving Heart). */
async function writeChain(actor, data, value) {
  await setMotor(actor, MONGE_ID, { ...data, value });
  await unmovingHeart(actor);
}

async function unmovingHeart(actor) {
  if (!actor.isOwner || !talentOf(actor, T("coracao-imovel"))) return;
  const max = motorMax(actor, MONGE_ID);
  if (!max || (toInt(motorData(actor, MONGE_ID).value) < max)) return;
  const ending = CLEARED.filter(id => actor.statuses.has(id));
  if (ending.length) await removeStatuses(actor, ending);
}

export const MONGE = {
  id: MONGE_ID,
  i18n: "Motor.Monge",
  states: ["aberta"],
  defaults: DEFAULTS,
  costKeyword: "Elos",

  /** The cap of Links. */
  max(actor, { lesser }) {
    let max = 3 + Math.floor(crOf(actor) / 5);
    if (lesser) max = Math.max(1, Math.floor(max / 2));
    return max + talentRank(actor, T("corrente-longa"));
  },

  /** The strikes need a [Martial Arts] weapon or both hands empty. */
  issues(actor, item, motor) {
    return (motor.strike && !canStrike(actor)) ? [L("Motor.Monge.WeaponIssue")] : [];
  },

  /** Unbroken Flow: a second Quick Link in a turn spends the Move Action. */
  actionOf(actor, item, motor, action) {
    if ((identifierOf(item) === T("elo-rapido")) && talentOf(actor, T("fluxo-ininterrupto"))
      && (actionsLeft(actor)?.minor === false)) return "move";
    return action;
  },

  /** The turn's Chain skill, and the Final Strike: full Chain, the Paths, Piercing Fist and the Apex. */
  plan(actor, item, motor, { data, max, lesser, plan }) {
    const id = identifierOf(item);
    const followed = path(actor, lesser);
    // The spells of the Magias count as Chain skills: they keep the Chain whole at the end of the turn.
    if (motor.chain || motor.keep || item.flags?.eternia?.magicSpell) plan.changes.struck = roundKey(actor);
    if (id === T("golpe-final")) {
      const full = !lesser && (max > 0) && (toInt(data.value) >= max);
      plan.vars = { ...plan.vars, full: full ? 1 : 0, flat: (followed === "tempestade") ? 1 : 2 };
      plan.per = ((followed === "montanha") || (followed === "tempestade")) ? 1 : 2;
      const apex = !lesser && hasApex(actor, MONGE_ID);
      if (full && (talentOf(actor, T("punho-que-atravessa")) || (apex && (followed === "montanha")))) plan.autoHit = true;
      let keep = apex ? Math.floor(plan.spent / 2) : 0;
      if ((followed === "tempestade") && talentOf(actor, T("ciclone"))) keep = Math.max(keep, 1);
      plan.gain += keep;
    }
    if ((id === T("chute-giratorio")) && !lesser && hasApex(actor, MONGE_ID) && (followed === "tempestade")) {
      plan.gain += Math.floor(plan.spent / 2);
    }
    return plan;
  },

  /** The statuses a hit gives: Stunning Palm, the full Chain, the Mountain, Thunderclap. */
  onHit(actor, item, { lesser }) {
    const id = identifierOf(item);
    const out = [];
    const status = statusId => out.push({ statusId, value: null, name: item.name });
    if (id === T("palma-atordoante")) status("dazed");
    if (id !== T("golpe-final")) return out;
    const followed = path(actor, lesser);
    if (followed === "montanha") {
      status("prone");
      status("dazed");
      if (talentOf(actor, T("avalanche"))) status("slowed");
    }
    else if (toInt(recentUse(item)?.vars?.full)) status("dazed");
    if ((followed === "tempestade") && talentOf(actor, T("trovoada"))) status("staggered");
    return out;
  },

  /** The class tab and the HUD: a full Chain. */
  display(actor, { lesser, data, max }) {
    return { ready: (max > 0) && (toInt(data.value) >= max), readyLabel: L("Motor.Monge.ReadyLabel") };
  },

  /** Iron Skin: with 3 Links or more, in combat, [Cancel: CR÷2+2]. */
  statuses(actor, { data }) {
    if (!combatPeers(actor).length || (toInt(data.value) < 3) || !talentOf(actor, T("pele-de-ferro"))) return [];
    return [{ key: "pele", statusId: "cancel", value: Math.floor(crOf(actor) / 2) + 2 }];
  },

  /* ------------------------------------------ */
  /*  Events                                    */
  /* ------------------------------------------ */

  /** Every combat starts with no Links, or those of First Link. */
  async onCombatStart(actor) {
    await setMotor(actor, MONGE_ID, { ...DEFAULTS, value: talentRank(actor, T("primeiro-elo")) });
  },

  async onCombatEnd(actor) {
    await setMotor(actor, MONGE_ID, { ...DEFAULTS });
  },

  /** A Chain skill used: a full Chain frees the monk (Unmoving Heart). */
  async onUse(actor, ctx, item, plan) {
    if (plan) await unmovingHeart(actor);
  },

  /** A turn ends without a Chain skill: the Chain breaks (River: loses 1; River with the Apex: nothing). */
  async onTurnEnd(actor, { lesser }, combat) {
    const data = motorData(actor, MONGE_ID);
    if (!toInt(data.value) || (data.struck === `${combat.id}.${combat.round}`)) return;
    let value = 0;
    if (path(actor, lesser) === "rio") value = hasApex(actor, MONGE_ID) ? toInt(data.value) : toInt(data.value) - 1;
    await setMotor(actor, MONGE_ID, { ...data, value });
  },

  /** An enemy's attack took HP: −1 Link (not on the River). */
  async onDamaged(actor, { lesser }, amount, attacker) {
    const data = motorData(actor, MONGE_ID);
    const next = { ...data, hurt: roundKey(actor) };
    if (toInt(data.value) && areEnemies(actor, attacker) && (path(actor, lesser) !== "rio")) next.value = toInt(data.value) - 1;
    await setMotor(actor, MONGE_ID, next);
  },

  /** Dodge and Follow: dodging an enemy's attack, +1 Link. */
  async onDodged(actor, ctx, attacker) {
    if (!areEnemies(actor, attacker) || !talentOf(actor, T("desviar-e-seguir"))) return;
    const data = motorData(actor, MONGE_ID);
    await writeChain(actor, data, toInt(data.value) + 1);
  },

  /** Last Link: a Final Strike that brings an enemy to 0 HP starts a new Chain with 2 Links. */
  async onKill(actor, ctx, target, item) {
    if (!areEnemies(actor, target) || (identifierOf(item) !== T("golpe-final")) || !talentOf(actor, T("ultimo-elo"))) return;
    const data = motorData(actor, MONGE_ID);
    await writeChain(actor, data, Math.max(toInt(data.value), 2));
  },

  /** Living Tide (River): the Cleanup of a round without HP lost, +1 Link. */
  async onCleanup(actor, { lesser }, combat, round) {
    if ((path(actor, lesser) !== "rio") || !talentOf(actor, T("mare-viva"))) return;
    const data = motorData(actor, MONGE_ID);
    if (data.hurt === `${combat.id}.${round}`) return;
    await writeChain(actor, data, toInt(data.value) + 1);
  }
};
