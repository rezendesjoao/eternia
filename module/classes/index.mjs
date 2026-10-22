/**
 * Classes (docs/classes.md): the class Motors (motor.mjs, one file per class), how they follow the round (the
 * start and end of a combat, the Setup and Cleanup Processes, each Main Process), the tokens' movement and the
 * combat cards (attacks declared and their hits, Dodge Checks, damage and healing applied, checks rolled, enemies
 * brought to 0 HP), the buttons Motors put on attack cards, the class tab of the character sheet, the Path and
 * Apex given by Character Rank, and the macro API (game.eternia.motor).
 *
 * The round work runs once, on the GM window that changed the phase (EterniaCombat#_onPhaseStart, as in
 * automation/round.mjs); the card events on the window that rolled or applied them. A Motor written by
 * someone who doesn't own the actor goes through the GM (motor.mjs setMotor).
 */
import { L, SYSTEM_ID } from "../settings.mjs";
import { isLocalChange } from "../helpers/clients.mjs";
import { combatActors, combatOf, escape, wrap } from "../helpers/utils.mjs";
import {
  addToMotor, changeMotor, motorBroadcast, motorData, motorEvent, motorMax, motorsOf, registerMotor,
  registerMotorSocket, setMotor
} from "./motor.mjs";
import { ASSASSINO } from "./assassino.mjs";
import { BERSERKER } from "./berserker.mjs";
import { CACADOR } from "./cacador.mjs";
import { COMANDANTE } from "./comandante.mjs";
import { DRUIDA } from "./druida.mjs";
import { ESTRATEGISTA } from "./estrategista.mjs";
import { FEITICEIRO } from "./feiticeiro.mjs";
import { GUARDIAO } from "./guardiao.mjs";
import { INVOCADOR } from "./invocador.mjs";
import { MENESTREL } from "./menestrel.mjs";
import { MONGE } from "./monge.mjs";
import { ORACULO } from "./oraculo.mjs";
import { RESSONANTE } from "./ressonante.mjs";
import { SACERDOTE } from "./sacerdote.mjs";
import { SAMURAI } from "./samurai.mjs";
import { TECELAO } from "./tecelao.mjs";

/** Order of the Round Progression phases, to tell a step forward from a step back. */
const ORDER = { briefing: 0, setup: 1, main: 2, cleanup: 3 };

/** Call during the `init` hook. */
export function registerClasses() {
  registerMotor(ASSASSINO);
  registerMotor(BERSERKER);
  registerMotor(CACADOR);
  registerMotor(COMANDANTE);
  registerMotor(DRUIDA);
  registerMotor(ESTRATEGISTA);
  registerMotor(FEITICEIRO);
  registerMotor(GUARDIAO);
  registerMotor(INVOCADOR);
  registerMotor(MENESTREL);
  registerMotor(MONGE);
  registerMotor(ORACULO);
  registerMotor(RESSONANTE);
  registerMotor(SACERDOTE);
  registerMotor(SAMURAI);
  registerMotor(TECELAO);
  registerMotorSocket();

  wrap(CONFIG.Combat.documentClass.prototype, "_onPhaseStart", async function (original, phase, round, previous) {
    await original.call(this, phase, round, previous);
    await onPhase(this, phase, round, previous)
      .catch(err => console.error(`${SYSTEM_ID} | Class Motors: ${phase} of round ${round} failed`, err));
  });
  Hooks.on("preUpdateCombat", (combat, changes, options) => {
    options.eterniaTurn = { active: combat.progress?.active ?? null, acted: [...(combat.progress?.acted ?? [])] };
  });
  Hooks.on("updateCombat", onUpdateCombat);
  Hooks.on("deleteCombat", onDeleteCombat);
  Hooks.on("preUpdateToken", (token, changes, options) => {
    if (("x" in changes) || ("y" in changes)) options.eterniaFrom = { x: token.x, y: token.y };
  });
  Hooks.on("updateToken", onMoveToken);
  Hooks.on("eternia.attack", onAttack);
  Hooks.on("eternia.attackResult", onAttackResult);
  Hooks.on("eternia.dodge", onDodge);
  Hooks.on("eternia.damaged", onDamaged);
  Hooks.on("eternia.healed", onHealed);
  Hooks.on("eternia.check", onCheck);
  Hooks.on("eternia.defeated", onDefeated);
  Hooks.on("renderChatMessageHTML", addCardActions);
}

/** The macro API: game.eternia.motor. */
export const MOTOR_API = {
  get: motorData, set: setMotor, change: changeMotor, add: addToMotor, max: motorMax, of: motorsOf
};

/* -------------------------------------------- */
/*  The round                                   */
/* -------------------------------------------- */

/**
 * A Setup or Cleanup Process began: the start of the combat (round 1's Setup, from the Briefing), then the
 * Setup or Cleanup of every actor with a Motor. Steps back (the GM undoing a phase) do nothing.
 */
async function onPhase(combat, phase, round, previous) {
  if (!["setup", "cleanup"].includes(phase)) return;
  const before = previous ?? { round: 0, phase: "briefing" };
  const forward = (round > before.round) || ((round === before.round) && (ORDER[phase] > (ORDER[before.phase] ?? 0)));
  if (!forward) return;
  const starting = (phase === "setup") && (before.round === 0);
  for (const actor of combatActors(combat)) {
    if (!motorsOf(actor).length) continue;
    if (starting) await motorEvent(actor, "onCombatStart", combat);
    if (phase === "setup") await motorEvent(actor, "onSetup", combat, round);
    else await motorEvent(actor, "onCleanup", combat, round);
  }
}

/** A Main Process began (onTurnStart) or ended (onTurnEnd): on the window that moved the combat on. */
async function onUpdateCombat(combat, changes, options, userId) {
  if (!isLocalChange(options, userId) || !combat.started) return;
  const before = options.eterniaTurn;
  if (!before) return;
  const now = combat.progress ?? {};
  const actorOf = id => combat.combatants.get(id)?.actor ?? null;
  for (const id of (now.acted ?? []).filter(id => !before.acted.includes(id))) {
    const actor = actorOf(id);
    if (actor && motorsOf(actor).length) await motorEvent(actor, "onTurnEnd", combat);
  }
  if (now.active && (now.active !== before.active)) {
    const actor = actorOf(now.active);
    if (actor && motorsOf(actor).length) await motorEvent(actor, "onTurnStart", combat);
  }
}

/** A started combat was deleted: the Motors go back to how a combat starts. */
async function onDeleteCombat(combat, options, userId) {
  if (!isLocalChange(options, userId) || !combat.started) return;
  for (const actor of combatActors(combat)) {
    if (motorsOf(actor).length) await motorEvent(actor, "onCombatEnd", combat);
  }
}

/** A token moved in a started combat: its Motors hear how many squares (the Hunter's Aim). */
async function onMoveToken(token, changes, options, userId) {
  const from = options.eterniaFrom;
  if (!from || !isLocalChange(options, userId)) return;
  const actor = token.actor;
  if (!actor || !motorsOf(actor).length || !combatOf(actor)) return;
  const size = token.parent?.grid?.size || canvas.grid?.size || 100;
  const squares = Math.round(Math.max(Math.abs(token.x - from.x), Math.abs(token.y - from.y)) / size);
  if (squares > 0) await motorEvent(actor, "onMove", squares);
}

/* -------------------------------------------- */
/*  Combat cards                                */
/* -------------------------------------------- */

/** An attack was declared: its targets' Motors hear of it (the Samurai's Flowing Water). */
async function onAttack(message, { item, attacker, targets }) {
  for (const actor of targets ?? []) {
    if (motorsOf(actor).length) await motorEvent(actor, "onAttacked", attacker, item, message);
  }
}

/** An attack's result against one target is known (a monster's dodge, a character's, or an automatic hit). */
async function onAttackResult(message, { attacker, target, item, hit }) {
  if (!attacker || !target || (typeof hit !== "boolean")) return;
  if (motorsOf(attacker).length) {
    await motorEvent(attacker, hit ? "onHitTarget" : "onMissTarget", target, item, message);
  }
  await motorBroadcast([attacker, target], hit ? "onAnyHit" : "onAnyMiss", attacker, target, item, message);
}

/** A character dodged an attack (the Samurai's Waiting Blade and Water Mirror). */
async function onDodge(message, { actor, attacker, item, hit }) {
  if ((hit === false) && motorsOf(actor).length) await motorEvent(actor, "onDodged", attacker, item, message);
}

/** A damage card took HP from an actor (Barrier first): its Motors, then everyone's in its combat. */
async function onDamaged(actor, card, { amount, attacker, item }) {
  if (!(amount > 0)) return;
  if (motorsOf(actor).length) await motorEvent(actor, "onDamaged", amount, attacker, item, card);
  await motorBroadcast([actor, attacker], "onAnyDamaged", actor, amount, attacker, item);
}

/** A damage card's healing gave HP back. */
async function onHealed(actor, card, { amount, healer, item }) {
  if (!(amount > 0)) return;
  if (motorsOf(actor).length) await motorEvent(actor, "onHealed", amount, healer, item, card);
  await motorBroadcast([actor, healer], "onAnyHealed", actor, amount, healer, item);
}

/** A check was rolled (a skill's, an attack's Hit Check, a Dodge Check): the Weaver's Pattern looks at it. */
async function onCheck(actor, roll, context) {
  if (!actor || !roll) return;
  if (motorsOf(actor).length) await motorEvent(actor, "onCheck", roll, context);
  await motorBroadcast([actor], "onAnyCheck", actor, roll, context);
}

/** A damage card brought an actor to 0 HP: the attacker's Motors hear of it (Chiburi, Eclipse), then everyone. */
async function onDefeated(actor, card) {
  const attacker = card?.attackerUuid ? fromUuidSync(card.attackerUuid) : null;
  const item = card?.itemUuid ? fromUuidSync(card.itemUuid) : null;
  if ((attacker instanceof Actor) && motorsOf(attacker).length) await motorEvent(attacker, "onKill", actor, item, card);
  await motorBroadcast([actor], "onAnyKill", actor, (attacker instanceof Actor) ? attacker : null, item);
}

/* -------------------------------------------- */
/*  Buttons on attack cards                     */
/* -------------------------------------------- */

/** The characters whose Motors may act on cards from this window: the user's own, or the GM's controlled ones. */
function cardActors() {
  const actors = game.user.isGM ? (canvas.tokens?.controlled ?? []).map(t => t.actor) : [game.user.character];
  return [...new Set(actors.filter(a => a?.isOwner && motorsOf(a).some(m => m.def.cardActions)))];
}

/**
 * Attack cards: the buttons the user's Motors offer on the Hit Check and on each Dodge Check (the Weaver pulls a
 * Thread, the Strategist plays a Reading). def.cardActions(actor, ctx, card) → [{ action, label, icon }], card =
 * { message, kind: "attack" | "dodge", index, roll } ; a click calls def.onCardAction(actor, ctx, action, card).
 */
function addCardActions(message, html) {
  const data = message.getFlag(SYSTEM_ID, "attack");
  if (!data || data.auto) return;
  const actors = cardActors();
  if (!actors.length) return;
  const spots = [{ kind: "attack", index: null, roll: data.attack, el: html.querySelector(".dice-roll") ?? html.querySelector(".lh-attack-card") }];
  html.querySelectorAll(".lh-target[data-index]").forEach(row => {
    const index = Number(row.dataset.index);
    const target = data.targets?.[index];
    if (target?.dodge) spots.push({ kind: "dodge", index, roll: target.dodge, el: row });
  });
  for (const spot of spots) {
    if (!spot.el || !spot.roll) continue;
    const buttons = [];
    for (const actor of actors) {
      for (const { def, lesser } of motorsOf(actor)) {
        if (!def.cardActions) continue;
        const card = { message, kind: spot.kind, index: spot.index, roll: spot.roll };
        let list = [];
        try {
          list = def.cardActions(actor, { lesser, data: motorData(actor, def.id), max: motorMax(actor, def.id) }, card) ?? [];
        }
        catch (err) {
          console.error(`${SYSTEM_ID} | Motor ${def.id}: cardActions failed`, err);
        }
        for (const b of list) {
          const button = document.createElement("a");
          button.className = "lhm-card-action";
          button.dataset.tooltip = b.tooltip ?? b.label;
          button.innerHTML = `${b.icon ? `<i class="${escape(b.icon)}"></i> ` : ""}${escape(b.label)}`;
          button.addEventListener("click", async event => {
            event.preventDefault();
            event.stopPropagation();
            const ctx = { lesser, data: motorData(actor, def.id), max: motorMax(actor, def.id) };
            try {
              await def.onCardAction?.(actor, ctx, b.action, card);
            }
            catch (err) {
              console.error(`${SYSTEM_ID} | Motor ${def.id}: onCardAction failed`, err);
              ui.notifications.error(L("Motor.CardActionFailed"));
            }
          });
          buttons.push(button);
        }
      }
    }
    if (!buttons.length) continue;
    const bar = document.createElement("div");
    bar.className = `lhm-card-actions ${spot.kind}`;
    bar.append(...buttons);
    if (spot.kind === "attack") spot.el.after(bar);
    else spot.el.append(bar);
  }
}
