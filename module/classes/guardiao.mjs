/**
 * The Guardian's Motor: the Bulwark (Baluarte). docs/classes.md has the class; AS REGRAS, its page in XI, the rules
 * as the player reads them.
 *
 * Every enemy attack declared against the guardian lays one more Layer (Camada) on the Bulwark, up to the cap (3, +1
 * every 5 CR, + the SR of High Wall, +2 on the Fortress with the Apex). In combat each Layer is [Cancel: 1] against
 * any damage ([Cancel: 2] with Cornerstone): the passive effect of the Bulwark skill, eternia.passive.cancel =
 * @motor.value × @motor.layer. The Bulwark Strike spends every Layer: (1 + Layers)d6 + Attack Power, and the target is
 * [Taunted]. A round in which no enemy attacked the guardian costs a Layer at the Cleanup Process (not on the Fortress
 * Path). The automatic hit of Bastion's Hammer and the bonus of Bastion's Wrath come once a combat; Retaliation, once a
 * round.
 *
 * State in flags.eternia.motor.guardiao:
 *   value           Layers
 *   attacked        "<combat>.<round>" of the last enemy attack against the guardian (the Cleanup decay)
 *   attackers       actor uuids of the enemies that attacked it in the round `attackersRound` (Bastion's Wrath)
 *   ward, wardName  the ally sworn by the Oath of Protection: enemy attacks against it feed the Bulwark too
 *   hammerUsed, wrathUsed  Bastion's Hammer and Bastion's Wrath were used in this combat
 *   retaliated      "<combat>.<round>" of the last Retaliation
 */
import { L } from "../settings.mjs";
import { takeDamage } from "../conditions/damage.mjs";
import { hateRank } from "../helpers/effect-conditions.mjs";
import { combatOf, toInt } from "../helpers/utils.mjs";
import {
  areAllies, areEnemies, crOf, hasApex, identifierOf, motorData, motorOf, pathOf, roundKey, setMotor, talentOf,
  talentRank
} from "./motor.mjs";

export const GUARDIAO_ID = "guardiao";

/** Identifier of a Guardian skill. */
const T = name => `${GUARDIAO_ID}-${name}`;

const DEFAULTS = {
  state: "erguido", value: 0, attacked: null, attackers: [], attackersRound: null, ward: null, wardName: "",
  hammerUsed: false, wrathUsed: false, retaliated: null
};

/** The Path the actor follows (none with only the Lesser Bulwark). */
const path = (actor, lesser) => (lesser ? null : pathOf(actor, GUARDIAO_ID));

/** [Cancel] of each Layer: 1, 2 with Cornerstone. */
const layerCancel = (actor, lesser) => ((!lesser && talentOf(actor, T("pedra-angular"))) ? 2 : 1);

/** The token of an actor on its scene (a synthetic actor's own). */
const tokenOf = actor => actor?.token ?? actor?.getActiveTokens?.(false, true)?.[0] ?? null;

/** Whether two actors stand in the same square (engaged). */
function sameSquare(a, b) {
  const ta = tokenOf(a);
  const tb = tokenOf(b);
  if (!ta || !tb || (ta.parent !== tb.parent)) return false;
  const size = ta.parent?.grid?.size || 100;
  return (Math.abs(ta.x - tb.x) < size) && (Math.abs(ta.y - tb.y) < size);
}

/** The actors the user targets now. */
const targetedActors = () => [...(game.user?.targets ?? [])].map(t => t.actor).filter(Boolean);

/** The actor's Path skill (its name goes in the chat lines of the Path's rules). */
const pathSkill = actor => actor?.items.find(i => (i.type === "skill") && (i.flags?.eternia?.path?.class === GUARDIAO_ID));

/**
 * An enemy attacked someone else in the guardian's combat (the attack's result is known): the sworn ward (Oath of
 * Protection) and, on the Raised Shield, an ally in the guardian's square feed the Bulwark.
 */
async function guardAlly(actor, lesser, attacker, target) {
  if (!target || (target.uuid === actor.uuid) || !areEnemies(actor, attacker) || !areAllies(actor, target)) return;
  const data = motorData(actor, GUARDIAO_ID);
  let n = 0;
  if (data.ward && (data.ward === target.uuid) && talentOf(actor, T("juramento"))) n += 1;
  if ((path(actor, lesser) === "escudo") && sameSquare(actor, target)) n += hasApex(actor, GUARDIAO_ID) ? 2 : 1;
  if (n) await setMotor(actor, GUARDIAO_ID, { ...data, value: toInt(data.value) + n });
}

export const GUARDIAO = {
  id: GUARDIAO_ID,
  i18n: "Motor.Guardiao",
  states: ["erguido"],
  defaults: DEFAULTS,
  costKeyword: "Camadas",

  /** The cap of Layers. */
  max(actor, { lesser }) {
    let max = 3 + Math.floor(crOf(actor) / 5);
    if (lesser) return Math.max(1, Math.floor(max / 2));
    if ((pathOf(actor, GUARDIAO_ID) === "fortaleza") && hasApex(actor, GUARDIAO_ID)) max += 2;
    return max + talentRank(actor, T("muralha-alta"));
  },

  /** @motor.layer: the [Cancel] of each Layer (the Bulwark's passive effect). */
  formulaData(actor, item, { lesser }) {
    return { layer: layerCancel(actor, lesser) };
  },

  /** The Oath of Protection needs one ally targeted. */
  issues(actor, item) {
    if (identifierOf(item) !== T("juramento")) return [];
    const targets = targetedActors();
    return ((targets.length === 1) && areAllies(actor, targets[0])) ? [] : [L("Motor.Guardiao.WardIssue")];
  },

  /** What a use spends and gains, with the Paths and the talents that bend the Bulwark Strike. */
  plan(actor, item, motor, { data, max, lesser, plan }) {
    const id = identifierOf(item);
    const followed = path(actor, lesser);
    if (id === T("golpe")) {
      // Fortress: the strike spends half the Layers (rounded up), and counts only those.
      if (followed === "fortaleza") plan.spent = Math.ceil(toInt(data.value) / 2);
      // Bastion's Hammer: once a combat, with the Bulwark at its cap, the strike hits without a Dodge Check.
      if (!lesser && talentOf(actor, T("martelo-do-bastiao")) && (toInt(data.value) >= max) && !data.hammerUsed) {
        plan.autoHit = true;
        plan.changes.hammerUsed = true;
      }
      // Bastion's Wrath: once a combat, + [CR+5] against an enemy that attacked the guardian this round.
      plan.vars.wrath = 0;
      if ((followed === "retaliacao") && talentOf(actor, T("ira-do-bastiao")) && !data.wrathUsed) {
        const attackers = (data.attackersRound === roundKey(actor)) ? (data.attackers ?? []) : [];
        plan.vars.wrath = targetedActors().some(a => attackers.includes(a.uuid)) ? 1 : 0;
        if (plan.vars.wrath) plan.changes.wrathUsed = true;
      }
    }
    // Living Wall: the Interception gives 2 Layers.
    if ((id === T("intercepcao")) && (followed === "escudo") && talentOf(actor, T("muro-vivo"))) plan.gain = 2;
    if (id === T("juramento")) {
      const ward = targetedActors()[0] ?? null;
      plan.changes.ward = ward?.uuid ?? null;
      plan.changes.wardName = ward ? (ward.token?.name ?? ward.name) : "";
    }
    return plan;
  },

  /** Eternal Bastion: after the Bulwark Strike the guardian keeps 2 Layers. */
  after(actor, item, plan, next) {
    if ((identifierOf(item) !== T("golpe")) || !hasApex(actor, GUARDIAO_ID) || motorOf(actor, GUARDIAO_ID)?.lesser) return next;
    if (toInt(motorData(actor, GUARDIAO_ID).value) >= 2) next.value = Math.max(toInt(next.value), 2);
    return next;
  },

  /** Bulwark Strike, Shield Charge and Shockwave: the statuses of their hits. */
  onHit(actor, item) {
    const id = identifierOf(item);
    if ((id === T("golpe")) || (id === T("onda-de-choque"))) return [{ statusId: "taunted", value: null, name: item.name }];
    if (id === T("investida")) return [{ statusId: "prone", value: null, name: item.name }];
    return [];
  },

  /** Iron Spikes (Retaliation): [Mirror: Layers] in combat. */
  statuses(actor, { lesser, data }) {
    const value = toInt(data.value);
    if (lesser || (value < 1) || !combatOf(actor)) return [];
    if ((path(actor, lesser) !== "retaliacao") || !talentOf(actor, T("espinhos"))) return [];
    return [{ key: "espinhos", statusId: "mirror", value }];
  },

  /** The class tab and the HUD: the sworn ward; a full Bulwark with Bastion's Hammer. */
  display(actor, { lesser, data, max }) {
    const note = (data.ward && data.wardName && talentOf(actor, T("juramento"))) ? L("Motor.Guardiao.Ward", { name: data.wardName }) : "";
    const ready = !lesser && !!talentOf(actor, T("martelo-do-bastiao")) && (max > 0) && (toInt(data.value) >= max);
    return { note, ready, readyLabel: L("Motor.Guardiao.Ready") };
  },

  /* ------------------------------------------ */
  /*  Events                                    */
  /* ------------------------------------------ */

  /** Every combat starts with the Layers of Sentinel (2 with the Apex). */
  async onCombatStart(actor, { lesser }) {
    let value = talentRank(actor, T("sentinela"));
    if (!lesser && hasApex(actor, GUARDIAO_ID)) value = Math.max(value, 2);
    await setMotor(actor, GUARDIAO_ID, { ...DEFAULTS, value });
  },

  async onCombatEnd(actor) {
    await setMotor(actor, GUARDIAO_ID, { ...DEFAULTS });
  },

  /** Setup Process: Eyes on Me (at the Hate Top: +1 Layer); Living Fortress (3 Layers: [Barrier: CR+5]). */
  async onSetup(actor, { lesser }) {
    let data = motorData(actor, GUARDIAO_ID);
    if (talentOf(actor, T("olhos-em-mim")) && (hateRank(actor) === "top")) {
      await setMotor(actor, GUARDIAO_ID, { ...data, value: toInt(data.value) + 1 });
      data = motorData(actor, GUARDIAO_ID);
    }
    if ((path(actor, lesser) === "fortaleza") && talentOf(actor, T("fortaleza-viva")) && (toInt(data.value) >= 3)) {
      await game.eternia.applyStatus(actor, "barrier", { value: crOf(actor) + 5, expires: "endOfRound", from: actor });
    }
  },

  /** Cleanup Process: a round without an enemy attack against the guardian costs a Layer (never below 2 with the Apex). */
  async onCleanup(actor, { lesser }, combat, round) {
    if (path(actor, lesser) === "fortaleza") return;
    const data = motorData(actor, GUARDIAO_ID);
    if (data.attacked === `${combat.id}.${round}`) return;
    const floor = (!lesser && hasApex(actor, GUARDIAO_ID)) ? 2 : 0;
    const value = toInt(data.value);
    if (value <= floor) return;
    await setMotor(actor, GUARDIAO_ID, { ...data, value: value - 1 });
  },

  /** An enemy attack declared against the guardian: +1 Layer, and who attacked this round (Bastion's Wrath). */
  async onAttacked(actor, context, attacker) {
    if (!combatOf(actor) || !areEnemies(actor, attacker)) return;
    const data = motorData(actor, GUARDIAO_ID);
    const key = roundKey(actor);
    const attackers = (data.attackersRound === key) ? [...(data.attackers ?? [])] : [];
    if (attacker?.uuid && !attackers.includes(attacker.uuid)) attackers.push(attacker.uuid);
    await setMotor(actor, GUARDIAO_ID, {
      ...data, value: toInt(data.value) + 1, attacked: key, attackers, attackersRound: key
    });
  },

  /** A dodged enemy attack: Stone on Stone (+1 Layer); Retaliation (once a round, the attacker takes CR + 2, −1 Layer). */
  async onDodged(actor, { lesser }, attacker) {
    if (!combatOf(actor) || !areEnemies(actor, attacker)) return;
    const followed = path(actor, lesser);
    let data = motorData(actor, GUARDIAO_ID);
    if ((followed === "fortaleza") && talentOf(actor, T("pedra-sobre-pedra"))) {
      await setMotor(actor, GUARDIAO_ID, { ...data, value: toInt(data.value) + 1 });
      data = motorData(actor, GUARDIAO_ID);
    }
    const layers = toInt(data.value);
    const key = roundKey(actor);
    if ((followed !== "retaliacao") || !attacker || (layers < 1) || (data.retaliated === key)) return;
    await takeDamage(attacker, crOf(actor) + 2, { what: pathSkill(actor)?.name ?? "", from: actor });
    const after = motorData(actor, GUARDIAO_ID);
    await setMotor(actor, GUARDIAO_ID, { ...after, value: hasApex(actor, GUARDIAO_ID) ? layers : layers - 1, retaliated: key });
  },

  /** Enemy attacks against the ward, or (Raised Shield) against an ally in the guardian's square. */
  async onAnyHit(actor, { lesser }, attacker, target) {
    await guardAlly(actor, lesser, attacker, target);
  },

  async onAnyMiss(actor, { lesser }, attacker, target) {
    await guardAlly(actor, lesser, attacker, target);
  }
};
