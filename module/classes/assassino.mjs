/**
 * The Assassin's Motor: the Contract (Contrato). docs/classes.md has the class; AS REGRAS, page XI, the rules as the
 * player reads them.
 *
 * The assassin swears a Contract on one enemy, the Target. Every hit anyone lands on the Target opens a Breach
 * (Brecha); the Execution spends them all on it, 1D + CR each, and a Target left with HP up to [Breaches × (CR+5)]
 * falls (not a [Boss]). A new Target loses the Breaches; the Target falling fulfills the Contract (free again).
 *
 * State in flags.eternia.motor.assassino:
 *   state       "livre" | "jurado"
 *   value       Breaches
 *   target      uuid of the Target's actor (a token's actor for unlinked tokens), targetName its name
 *   carry       Breaches the next Contract starts with (the Web, Second Execution)
 *   ambush      "<combat>.<round>" of the last weapon attack started while [Hidden] (Shadow Strike)
 *   opened      the first hit of the combat on the Target already counted (Ambush)
 *   firstExec   an Execution was already used in this combat (the Phantom's Apex)
 *   cursedDone  the Target already got [Cursed] from Wound That Won't Close
 *   poison      "next" after Poisoned Blade, then the uuid of the weapon attack that carries the poison
 *   studied     { uuid, name, n }: the Target of Study the Target, sworn when its next combat starts
 */
import { L } from "../settings.mjs";
import { combatActors, combatOf, toInt } from "../helpers/utils.mjs";
import {
  areEnemies, changeMotor, crOf, hasApex, identifierOf, motorData, motorMax, pathOf, recentUse, roundKey, setMotor,
  talentOf, talentRank
} from "./motor.mjs";

export const ASSASSINO_ID = "assassino";

/** Identifier of an Assassin skill. */
const T = name => `assassino-${name}`;

const DEFAULTS = {
  state: "livre", value: 0, target: null, targetName: "", carry: 0, ambush: null, opened: false, firstExec: false,
  cursedDone: false, poison: null, studied: null
};

/** The statuses that leave the Target open to Straight for the Throat, and the poisons of Slow Toxin. */
const OPEN = ["slowed", "prone", "dazed"];
const POISONS = ["poisoned", "decay", "burning"];

/** The Path the actor follows (none with only the Lesser Contract). */
const path = (actor, lesser) => (lesser ? null : pathOf(actor, ASSASSINO_ID));

/** The actors of the user's targeted tokens, with their token names. */
function targeted() {
  return [...(game.user?.targets ?? [])].filter(t => t.actor).map(t => ({ actor: t.actor, name: t.document.name }));
}

/** An actor from its uuid (a token's actor too), or null. */
const actorFrom = uuid => (uuid ? (fromUuidSync(uuid) ?? null) : null);

/** Give a status through the system (the GM writes it when the user doesn't own the actor). */
const giveStatus = (actor, id, value, from) => game.eternia?.applyStatus?.(actor, id, { value, from });

/** Whether two actors' tokens stand in the same square. */
function sameSquare(a, b) {
  const ta = a?.getActiveTokens?.()[0]?.document;
  const tb = b?.getActiveTokens?.()[0]?.document ?? b?.token;
  return !!ta && !!tb && (ta.x === tb.x) && (ta.y === tb.y);
}

/**
 * The Target falls to the Execution: 0 HP and Incapacitated, a line in the chat, and the defeat told to the Motors
 * (the Contract fulfilled, the Samurai's Chiburi…).
 */
async function execute(actor, victim, item, limit) {
  const name = victim.token?.name ?? victim.name;
  if (victim.isOwner) {
    await victim.update({ "system.health.value": 0 });
    if (!victim.statuses.has("incapacitated")) await victim.toggleStatusEffect("incapacitated", { active: true });
  }
  else {
    const { takeDamage } = await import("../conditions/damage.mjs");
    await takeDamage(victim, toInt(victim.system.health?.value), { what: item.name, from: actor, silent: true });
  }
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content: `<div class="eternia chat-card"><p><strong>${item.name}</strong>: ${L("Motor.Assassino.Executed", { name, n: limit })}</p></div>`
  });
  Hooks.callAll("eternia.defeated", victim, { attackerUuid: actor.uuid, itemUuid: item.uuid });
}

export const ASSASSINO = {
  id: ASSASSINO_ID,
  i18n: "Motor.Assassino",
  states: ["livre", "jurado"],
  stateColors: { livre: 0x6b6375, jurado: 0x8b1e2d },
  defaults: DEFAULTS,
  costKeyword: "Brechas",

  /** The cap of Breaches. */
  max(actor, { lesser }) {
    const max = 3 + Math.floor(crOf(actor) / 5);
    return lesser ? Math.max(1, Math.floor(max / 2)) : max;
  },

  /** Swear Contract: one enemy targeted. The Execution: only on the Target (the Executioner: a full Contract). */
  issues(actor, item, motor, { data, max, lesser }) {
    const id = identifierOf(item);
    if (id === T("firmar-contrato")) {
      const targets = targeted();
      if (targets.length !== 1) return [L("Motor.Assassino.OneTarget")];
      return areEnemies(actor, targets[0].actor) ? [] : [L("Motor.Assassino.EnemyTarget")];
    }
    if (!motor.execute) return [];
    const issues = [];
    if ((path(actor, lesser) === "carrasco") && (toInt(data.value) < max)) issues.push(L("Motor.Assassino.FullIssue", { n: max }));
    if (data.target && !targeted().some(t => t.actor.uuid === data.target)) {
      issues.push(L("Motor.Assassino.NotTarget", { name: data.targetName }));
    }
    return issues;
  },

  /** Chained Prey (the Web): Swear Contract is a Move Action. */
  actionOf(actor, item, motor, action) {
    if ((identifierOf(item) === T("firmar-contrato")) && (pathOf(actor, ASSASSINO_ID) === "teia")
      && talentOf(actor, T("presas-encadeadas"))) return "move";
    return action;
  },

  /** A new Target, a Target studied beforehand, and the Execution's limit and automatic hits. */
  plan(actor, item, motor, { data, max, lesser, plan }) {
    const id = identifierOf(item);
    const followed = path(actor, lesser);
    // The spells of the Magias open Breaches by their hits on the Target, as any hit does, not by being cast.
    if (item.flags?.eternia?.magicSpell) plan.gain = 0;
    if (id === T("firmar-contrato")) {
      const [chosen] = targeted();
      if (!chosen) return null;
      const same = chosen.actor.uuid === data.target;
      Object.assign(plan.changes, { target: chosen.actor.uuid, targetName: chosen.name, cursedDone: same && data.cursedDone });
      if (!same) {
        plan.spent = toInt(data.value);
        plan.gain = toInt(data.carry);
        plan.vars = { ...plan.vars, carried: toInt(data.carry) };
        plan.changes.carry = 0;
      }
    }
    if ((id === T("estudar-o-alvo")) && !combatOf(actor)) {
      const [chosen] = targeted();
      if (chosen) plan.changes.studied = { uuid: chosen.actor.uuid, name: chosen.name, n: talentRank(actor, T("estudar-o-alvo")) };
    }
    if (motor.execute) {
      const apex = !lesser && hasApex(actor, ASSASSINO_ID);
      // The Executioner: 2d6 + CR per Breach (@use.per), and the fall up to Breaches × (CR+10).
      plan.vars = { ...plan.vars, cut: (followed === "carrasco") ? (apex ? 15 : 10) : 5, per: (followed === "carrasco") ? 2 : 1 };
      const target = actorFrom(data.target);
      const full = toInt(data.value) >= max;
      // A full Contract: the Execution hits without a Dodge Check (not the Lesser Contract).
      if (!lesser && full) plan.autoHit = true;
      if (target && talentOf(actor, T("na-garganta")) && OPEN.some(s => target.statuses?.has(s))) plan.autoHit = true;
      if ((followed === "fantasma") && apex && !data.firstExec) plan.autoHit = true;
      plan.changes.firstExec = true;
    }
    // Invisible Blade (the Phantom): the class's attacks made while [Hidden] hit without a Dodge Check
    if ((followed === "fantasma") && talentOf(actor, T("lamina-invisivel")) && actor.statuses.has("hidden")
      && (item.system.tags ?? []).includes("Weapon Attack")) plan.autoHit = true;
    // Poisoned Blade: the next weapon attack carries the poison
    if (id === T("lamina-envenenada")) plan.changes.poison = "next";
    return plan;
  },

  /** Poisoned Blade's hit and Hamstring Cut's. */
  onHit(actor, item, { lesser }) {
    const out = [];
    const data = motorData(actor, ASSASSINO_ID);
    if (data.poison && (data.poison === item.uuid)) {
      out.push({ statusId: "poisoned", value: Math.floor(crOf(actor) / 2) + 2, name: L("Motor.Assassino.Poison") });
    }
    if (identifierOf(item) === T("corte-de-tendao")) out.push({ statusId: "slowed", value: null, name: item.name });
    // Raised Axe (the Executioner): the Execution leaves the Target [Exposed].
    const axe = talentOf(actor, T("machado-erguido"));
    if (axe && !lesser && (identifierOf(item) === T("execucao")) && (path(actor, lesser) === "carrasco")) {
      out.push({ statusId: "exposed", value: null, name: axe.name });
    }
    return out;
  },

  /** Right Dose: the Execution on a [Poisoned] Target, +1D per Breach spent. */
  rollBonuses(actor, item, which, { lesser }) {
    if ((which !== "damage") || (identifierOf(item) !== T("execucao"))) return [];
    const dose = talentOf(actor, T("dose-certa"));
    const target = actorFrom(motorData(actor, ASSASSINO_ID).target);
    const spent = toInt(recentUse(item)?.spent);
    return (dose && spent && target?.statuses?.has("poisoned")) ? [{ dice: spent, mod: 0, label: dose.name }] : [];
  },

  /** The class tab and the HUD: the Target, and a full Contract. */
  display(actor, { data, max }) {
    const sworn = data.state === "jurado";
    return {
      ready: sworn && (max > 0) && (toInt(data.value) >= max),
      readyLabel: L("Motor.Assassino.ReadyLabel"),
      note: sworn && data.targetName ? L("Motor.Assassino.Note", { name: data.targetName }) : ""
    };
  },

  /* ------------------------------------------ */
  /*  Events                                    */
  /* ------------------------------------------ */

  /** Every combat starts free; a Target studied beforehand is sworn at once; the Phantom starts [Hidden]. */
  async onCombatStart(actor, { lesser }, combat) {
    const data = motorData(actor, ASSASSINO_ID);
    const next = { ...DEFAULTS };
    const studied = data.studied;
    const present = studied && combatActors(combat).find(a => a.uuid === studied.uuid);
    if (present) Object.assign(next, { state: "jurado", target: studied.uuid, targetName: studied.name, value: toInt(studied.n) });
    else next.studied = studied ?? null;
    await setMotor(actor, ASSASSINO_ID, next);
    if ((path(actor, lesser) === "fantasma") && talentOf(actor, T("passo-fantasma"))) await giveStatus(actor, "hidden", null, actor);
  },

  /** The Contract ends with the combat (a studied Target still waits). */
  async onCombatEnd(actor) {
    const data = motorData(actor, ASSASSINO_ID);
    await setMotor(actor, ASSASSINO_ID, { ...DEFAULTS, studied: data.studied ?? null });
  },

  /**
   * A skill used: a weapon attack started while [Hidden] (Shadow Strike), Poisoned Blade arming the next weapon
   * attack, and the marks of a new Contract (Mark the Prey, Closed Net).
   */
  async onUse(actor, { lesser }, item, plan) {
    const data = motorData(actor, ASSASSINO_ID);
    const changes = {};
    const weapon = (item.system.tags ?? []).includes("Weapon Attack");
    if (weapon && actor.statuses.has("hidden")) changes.ambush = roundKey(actor);
    if (weapon && (data.poison === "next")) changes.poison = item.uuid;
    else if (weapon && data.poison) changes.poison = null;
    if (Object.keys(changes).length) await changeMotor(actor, ASSASSINO_ID, changes);
    if (identifierOf(item) !== T("firmar-contrato")) return;
    const target = actorFrom(motorData(actor, ASSASSINO_ID).target);
    if (!target) return;
    if (talentOf(actor, T("marcar-a-presa"))) await giveStatus(target, "marked", crOf(actor), actor);
    if (toInt(plan?.vars?.carried) && talentOf(actor, T("rede-fechada"))) await giveStatus(target, "marked", crOf(actor) * 2, actor);
  },

  /** Poisoned Blade: an attack that hit no one keeps the poison for the next one. */
  async onMissTarget(actor, ctx, target, item, message) {
    const data = motorData(actor, ASSASSINO_ID);
    if (!data.poison || (data.poison !== item?.uuid)) return;
    const targets = message?.getFlag?.("eternia", "attack")?.targets ?? [];
    if (!targets.some(t => t.hit === true)) await changeMotor(actor, ASSASSINO_ID, { poison: "next" });
  },

  /** Anyone hits the Target: +1 Breach (the Phantom: only the assassin's hits, +2), and the talents' extras. */
  async onAnyHit(actor, { lesser }, attacker, target, item) {
    const data = motorData(actor, ASSASSINO_ID);
    if ((data.state !== "jurado") || !target || (target.uuid !== data.target)) return;
    const mine = attacker?.uuid === actor.uuid;
    const followed = path(actor, lesser);
    if ((followed === "fantasma") && !mine) return;
    let n = (followed === "fantasma") ? 2 : 1;
    const next = { ...data };
    if (mine) {
      if (identifierOf(item) === T("punhalada")) n += 1;
      if (talentOf(actor, T("golpe-das-sombras")) && (data.ambush === roundKey(actor))) n += 1;
      if (talentOf(actor, T("emboscada")) && !data.opened && (combatOf(actor)?.round === 1)) {
        n += 2;
        next.opened = true;
      }
    }
    else if (talentOf(actor, T("cerco")) && sameSquare(actor, target)) n += 1;
    const before = toInt(data.value);
    next.value = before + n;
    const wound = talentOf(actor, T("ferida-que-nao-fecha")) && !data.cursedDone
      && (Math.min(next.value, motorMax(actor, ASSASSINO_ID)) >= 3);
    if (wound) next.cursedDone = true;
    await setMotor(actor, ASSASSINO_ID, next);
    if (wound) await giveStatus(target, "cursed", null, actor);
  },

  /** The Execution's hit leaves the Target at or under [Breaches × (CR+5)]: it falls ([Boss]: only with the Apex). */
  async onAnyDamaged(actor, { lesser }, victim, amount, attacker, item) {
    if (lesser || !victim || (attacker?.uuid !== actor.uuid) || (identifierOf(item) !== T("execucao"))) return;
    const data = motorData(actor, ASSASSINO_ID);
    if (victim.uuid !== data.target) return;
    const hp = toInt(victim.system.health?.value);
    const use = recentUse(item);
    const spent = toInt(use?.spent);
    if ((hp <= 0) || !spent) return;
    const boss = (victim.system.tags ?? []).includes("Boss");
    if (boss && !hasApex(actor, ASSASSINO_ID)) return;
    let limit = spent * (crOf(actor) + (toInt(use?.vars?.cut) || 5));
    if (boss) limit = Math.floor(limit / 2);
    if (hp <= limit) await execute(actor, victim, item, limit);
  },

  /** The Target fell: the Contract is fulfilled (free), and what the Path and talents give for it. */
  async onAnyKill(actor, { lesser }, victim, attacker, item) {
    const data = motorData(actor, ASSASSINO_ID);
    if (!victim || (victim.uuid !== data.target)) return;
    const executed = (attacker?.uuid === actor.uuid) && (identifierOf(item) === T("execucao"));
    const followed = path(actor, lesser);
    let carry = 0;
    if (followed === "teia") carry = hasApex(actor, ASSASSINO_ID) ? toInt(data.value) : Math.ceil(toInt(data.value) / 2);
    if (executed && talentOf(actor, T("segunda-execucao"))) carry = Math.max(carry, 2);
    await setMotor(actor, ASSASSINO_ID, {
      ...data, state: "livre", value: 0, target: null, targetName: "", carry, cursedDone: false
    });
    if (executed && talentOf(actor, T("sombra-viva"))) await giveStatus(actor, "hidden", null, actor);
    if (!actor.isOwner) return;
    let hate = toInt(actor._source.system.infos?.hate);
    const before = hate;
    if (executed && (followed === "carrasco") && talentOf(actor, T("ultima-palavra"))) hate -= 1 + toInt(recentUse(item)?.spent);
    if (talentOf(actor, T("contrato-cumprido"))) hate = Math.floor(hate / 2);
    if (hate !== before) await actor.update({ "system.infos.hate": Math.max(0, hate) });
  },

  /** Slow Toxin: the Cleanup with the Target [Poisoned], in [Decay] or [Burning], +1 Breach. */
  async onCleanup(actor) {
    if (!talentOf(actor, T("toxina-lenta"))) return;
    const data = motorData(actor, ASSASSINO_ID);
    const target = (data.state === "jurado") ? actorFrom(data.target) : null;
    if (target && POISONS.some(s => target.statuses?.has(s))) await setMotor(actor, ASSASSINO_ID, { ...data, value: toInt(data.value) + 1 });
  }
};
