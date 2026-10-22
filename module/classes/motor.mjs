/**
 * Class Motors (docs/classes.md): the rule or resource only one class has.
 *
 * A Motor is defined in code (one file per class in module/classes/, registered with registerMotor) and its
 * state lives on the actor, in flags.eternia.motor.<id> = { state, value, last, ... }: whatever that class's
 * rules need. A character has a Motor through its Motor skill (a Constant skill whose flags.eternia.motor.role
 * is "core") or, by a Dedication, through the Lesser Motor skill (role "lesser"): half the cap and none of the
 * class's peak rules.
 *
 * The skills that touch a Motor say how in flags.eternia.motor:
 *   id      the Motor ("samurai")
 *   role    "core" | "lesser" (the Motor skills themselves)
 *   needs   { state, min, full, weapon: [tags] }  checked before the use, like a usage limit
 *   spend   "all" | "choose" | n                   "choose": up to `max` (a formula, "@sr+1")
 *   gain    n
 *   set     a state ("drawn")
 *   action  "major" | "minor" | "move" | "none"     the action it spends instead of its Timing's
 *   draw    true for the class's own strikes (the Samurai's Iai and the like), read by its rules
 *   perfect true when the strike can be a Perfect Cut (the class decides what that takes)
 *   inCombat true: the Motor part only applies in a started combat
 * Before the card is posted, what the use will spend is kept on the skill (flags.eternia.motorUse): its
 * formulas read it as @spent and @perfect (and @per, the dice per point), also when the damage is rolled
 * later from the card. The class's plan may add more; after the card, the change is written and noted on
 * the use record, so Undo gives it back.
 *
 * A Motor definition (see samurai.mjs): { id, i18n (the key prefix of its Name, Unit and State.<state>), states,
 * defaults, costKeyword, icon, max(actor, ctx), issues?, actionOf?, plan?, after?, rollBonuses?, onHit?, display?,
 * and the events onCombatStart, onSetup, onCleanup, onCombatEnd, onWeaponAttack, onAttacked, onDodged, onKill }.
 */
import { L, SYSTEM_ID } from "../settings.mjs";
import { getHands } from "../helpers/hands.mjs";
import { request, registerHandler } from "../piles/pile-socket.mjs";
import { evaluateFormula, formulaData } from "../helpers/effect-formulas.mjs";
import { combatOf, escape, toInt } from "../helpers/utils.mjs";
import { tagLabel } from "../i18n/terms.mjs";

export const MOTOR_FLAG = "motor";
export const USE_FLAG = "motorUse";

/** Motor definitions by id. */
const MOTORS = new Map();

/** Register a Motor definition (see the header). */
export function registerMotor(def) {
  MOTORS.set(def.id, def);
}

/** A Motor definition, or null. */
export const motorDef = id => MOTORS.get(id) ?? null;

/** A Motor's name, unit ("Cortes") and state labels. */
export const motorName = def => L(`${def.i18n}.Name`);
export const motorUnit = def => L(`${def.i18n}.Unit`);
export const motorStateLabel = (def, state) => L(`${def.i18n}.State.${state}`);

/** Every registered Motor. */
export const allMotors = () => [...MOTORS.values()];

/** The Motor part of a skill (flags.eternia.motor), or null. */
export function skillMotor(item) {
  const motor = item?.flags?.[SYSTEM_ID]?.[MOTOR_FLAG];
  return (motor?.id && MOTORS.has(motor.id)) ? motor : null;
}

/** The identifier of a class skill (flags.eternia.identifier), or "". */
export const identifierOf = item => item?.flags?.[SYSTEM_ID]?.identifier ?? "";

/** The skill of an actor with this identifier, or null. */
export function talentOf(actor, identifier) {
  return actor?.items.find(i => (i.type === "skill") && (identifierOf(i) === identifier)) ?? null;
}

/** The Skill Rank of an actor's skill with this identifier, 0 without it. */
export function talentRank(actor, identifier) {
  const item = talentOf(actor, identifier);
  return item ? Math.max(1, toInt(item.system.skillRank?.value)) : 0;
}

/** The Character Rank of an actor. */
export const crOf = actor => Math.max(1, toInt(actor?.system?.infos?.crank ?? actor?.system?.rank));

/**
 * The Path (Caminho) an actor follows in a class: the id of its Path skill (flags.eternia.path
 * = { class, id }), or null.
 * @param {Actor} actor
 * @param {string} classId
 * @returns {string|null}
 */
export function pathOf(actor, classId) {
  const item = actor?.items.find(i => (i.type === "skill") && (i.flags?.[SYSTEM_ID]?.path?.class === classId));
  return item?.flags[SYSTEM_ID].path.id ?? null;
}

/** Whether an actor has the Apex skill of a class (flags.eternia.apex = class id). */
export function hasApex(actor, classId) {
  return !!actor?.items.some(i => (i.type === "skill") && (i.flags?.[SYSTEM_ID]?.apex === classId));
}

/**
 * The Motors an actor has: by its Motor skill, or by the Lesser Motor of a Dedication.
 * @param {Actor} actor
 * @returns {{def: object, lesser: boolean, item: Item}[]}
 */
export function motorsOf(actor) {
  const found = new Map();
  for (const item of actor?.items ?? []) {
    if (item.type !== "skill") continue;
    const motor = skillMotor(item);
    if (!["core", "lesser"].includes(motor?.role)) continue;
    const lesser = motor.role === "lesser";
    // The full Motor wins over a Lesser one of the same class.
    if (found.has(motor.id) && lesser) continue;
    found.set(motor.id, { def: MOTORS.get(motor.id), lesser, item });
  }
  return [...found.values()];
}

/** The Motor of this id an actor has, or null. */
export const motorOf = (actor, id) => motorsOf(actor).find(m => m.def.id === id) ?? null;

/** The stored state of a Motor, over its defaults. */
export function motorData(actor, id) {
  const def = MOTORS.get(id);
  const stored = actor?.flags?.[SYSTEM_ID]?.[MOTOR_FLAG]?.[id] ?? {};
  return { ...foundry.utils.deepClone(def?.defaults ?? {}), ...foundry.utils.deepClone(stored) };
}

/** The cap of an actor's Motor (its definition's formula). */
export function motorMax(actor, id) {
  const def = MOTORS.get(id);
  const motor = motorOf(actor, id);
  if (!def || !motor) return 0;
  return Math.max(0, toInt(def.max(actor, { lesser: motor.lesser })));
}

/**
 * Write a Motor's state: by the owner, else by the GM (socket).
 * @param {Actor} actor
 * @param {string} id
 * @param {object} data    The whole new state (the value is kept between 0 and the cap)
 */
export async function setMotor(actor, id, data) {
  const max = motorMax(actor, id);
  const value = Math.clamp(toInt(data.value), 0, Math.max(max, 0));
  const state = { ...data, value };
  if (actor.isOwner) return actor.update({ [`flags.${SYSTEM_ID}.${MOTOR_FLAG}.${id}`]: state });
  const result = await request("eterniaMotor", { actorUuid: actor.uuid, id, state });
  if (!result?.ok) console.warn(`${SYSTEM_ID} | Could not change the Motor of ${actor.uuid}`, result?.error);
}

/** Change a Motor's state from its current one. */
export function changeMotor(actor, id, changes) {
  return setMotor(actor, id, { ...motorData(actor, id), ...changes });
}

/** Add to (or take from) a Motor's value, within its cap. */
export function addToMotor(actor, id, n) {
  const data = motorData(actor, id);
  return setMotor(actor, id, { ...data, value: toInt(data.value) + toInt(n) });
}

/** GM side of setMotor. */
async function onMotorRequest({ actorUuid, id, state }) {
  const actor = fromUuidSync(actorUuid);
  if (!(actor instanceof Actor) || !MOTORS.has(id)) return { ok: false, error: "ETERNIA.Piles.Error.NoActor" };
  await actor.update({ [`flags.${SYSTEM_ID}.${MOTOR_FLAG}.${id}`]: state });
  return { ok: true };
}

/* -------------------------------------------- */
/*  Values for formulas and costs               */
/* -------------------------------------------- */

/**
 * What a formula reads from the Motors: @spent, @perfect and @per of the skill's last use, and
 * @motor.value / @motor.max / @motor.last of the skill's Motor (or the actor's first one).
 * @param {Actor} actor
 * @param {Item|null} item
 * @returns {object}
 */
export function motorFormulaData(actor, item) {
  const use = item?.flags?.[SYSTEM_ID]?.[USE_FLAG] ?? {};
  const id = skillMotor(item)?.id ?? motorsOf(actor)[0]?.def.id ?? null;
  const data = id ? motorData(actor, id) : {};
  return {
    spent: toInt(use.spent),
    perfect: toInt(use.perfect),
    per: toInt(use.per),
    motor: { value: toInt(data.value), max: id ? motorMax(actor, id) : 0, last: toInt(data.last) }
  };
}

/**
 * The Motor values a skill's cost reads ("Hate 1+Cortes"): the keyword of each Motor the actor has, upper case,
 * with its current value.
 * @param {Item} item
 * @returns {Object<string, number>}
 */
export function motorCostValues(item) {
  const actor = item?.actor;
  const values = {};
  for (const { def } of motorsOf(actor)) {
    if (def.costKeyword) values[def.costKeyword.toUpperCase()] = toInt(motorData(actor, def.id).value);
  }
  return values;
}

/* -------------------------------------------- */
/*  Using a skill                               */
/* -------------------------------------------- */

/** Whether the Motor part of a skill applies now (`inCombat` ones only in a started combat). */
function applies(motor, actor) {
  return !motor.inCombat || !!combatOf(actor);
}

/** The tags of the weapon in the main hand. */
function mainWeaponTags(actor) {
  return (getHands(actor).main?.system.tags ?? []).map(t => String(t).toLowerCase());
}

/**
 * What stops a skill's Motor part now: the Motor missing, its state, too few points, a full Motor needed, the
 * weapon in hand, and the class's own rules.
 * @param {Item} item
 * @param {Actor} actor
 * @returns {string[]}
 */
export function motorUseIssues(item, actor) {
  const motor = skillMotor(item);
  if (!motor || ["core", "lesser"].includes(motor.role) || !applies(motor, actor)) return [];
  const def = MOTORS.get(motor.id);
  const owned = motorOf(actor, motor.id);
  if (!owned) return [L("Motor.Issue.NoMotor", { motor: motorName(def) })];
  const data = motorData(actor, motor.id);
  const max = motorMax(actor, motor.id);
  const needs = motor.needs ?? {};
  const issues = [];
  if (needs.state && (data.state !== needs.state)) {
    issues.push(L("Motor.Issue.State", { state: motorStateLabel(def, needs.state) }));
  }
  if (needs.min && (toInt(data.value) < needs.min)) {
    issues.push(L("Motor.Issue.Min", { n: needs.min, unit: motorUnit(def), have: toInt(data.value) }));
  }
  if (needs.full && (toInt(data.value) < max)) issues.push(L("Motor.Issue.Full", { unit: motorUnit(def), max }));
  if (needs.weapon?.length) {
    const tags = mainWeaponTags(actor);
    if (!needs.weapon.some(t => tags.includes(t.toLowerCase()))) {
      issues.push(L("Motor.Issue.Weapon", { tags: needs.weapon.map(t => `[${tagLabel(t)}]`).join(" / ") }));
    }
  }
  if (def.issues) issues.push(...def.issues(actor, item, motor, { data, max, lesser: owned.lesser }));
  return issues;
}

/**
 * The action a skill spends because of its Motor part ("major" for the Iai, at Initiative), null when it spends
 * none, undefined when its Timing decides.
 * @param {Item} item
 * @param {Actor} actor
 * @returns {string|null|undefined}
 */
export function motorActionOf(item, actor) {
  const motor = skillMotor(item);
  if (!motor || !applies(motor, actor)) return undefined;
  const def = MOTORS.get(motor.id);
  let action = motor.action;
  if (def.actionOf) action = def.actionOf(actor, item, motor, action);
  if (action === undefined) return undefined;
  return (action === "none") ? null : action;
}

/** Ask how many points to spend ("choose"), or null when cancelled. */
async function chooseAmount(item, def, max, have) {
  const top = Math.max(0, Math.min(max, have));
  if (top <= 1) return top;
  const options = Array.from({ length: top }, (_, i) => i + 1)
    .map(n => `<option value="${n}"${n === top ? " selected" : ""}>${n}</option>`).join("");
  const result = await foundry.applications.api.DialogV2.prompt({
    window: { title: item.name, icon: "fa-solid fa-coins" },
    classes: ["eternia", "motor-choose"],
    content: `<p>${escape(L("Motor.Choose", { unit: motorUnit(def), have }))}</p>
      <div class="form-group"><label>${escape(motorUnit(def))}</label><select name="amount">${options}</select></div>`,
    ok: { label: L("Motor.ChooseOk"), callback: (event, button) => toInt(button.form.elements.amount.value) },
    rejectClose: false
  });
  return (result === null || result === undefined) ? null : toInt(result);
}

/**
 * Before the card: what the use will spend, gain and set, kept on the skill for its formulas. Null when the user
 * cancelled a choice; {} when the skill has no Motor part (or it doesn't apply now).
 * @param {Item} item
 * @param {Actor} actor
 * @returns {Promise<object|null>}
 */
export async function planMotorUse(item, actor) {
  const motor = skillMotor(item);
  if (!motor || ["core", "lesser"].includes(motor.role) || !applies(motor, actor)) return {};
  const owned = motorOf(actor, motor.id);
  if (!owned) return {};
  const def = owned.def;
  const data = motorData(actor, motor.id);
  const max = motorMax(actor, motor.id);
  const have = toInt(data.value);

  let spent = 0;
  if (motor.spend === "all") spent = have;
  else if (motor.spend === "choose") {
    const limit = evaluateFormula(String(motor.max ?? have), formulaData(actor, item)) ?? have;
    spent = await chooseAmount(item, def, limit, have);
    if (spent === null) return null;
  }
  else if (motor.spend) spent = Math.min(have, toInt(motor.spend));

  let plan = { id: motor.id, spent, gain: toInt(motor.gain), set: motor.set ?? null, perfect: 0, per: 2, changes: {} };
  if (def.plan) plan = def.plan(actor, item, motor, { data, max, lesser: owned.lesser, plan }) ?? plan;
  // What the formulas and the later rolls of this use read: the amounts, and the state it was used in.
  await item.setFlag(SYSTEM_ID, USE_FLAG, {
    spent: plan.spent, perfect: plan.perfect, per: plan.per, state: data.state ?? null, last: toInt(data.last), at: Date.now()
  });
  return plan;
}

/**
 * After the card: write the Motor change and the class's own reactions. Skills without a Motor part that are
 * weapon attacks go to the class rules too (the Samurai's blade leaves the sheath).
 * @param {Item} item
 * @param {Actor} actor
 * @param {object} plan     See planMotorUse
 * @returns {Promise<object|null>}  What Undo needs: the states before
 */
export async function commitMotorUse(item, actor, plan) {
  const before = {};
  const remember = id => { before[id] ??= motorData(actor, id); };

  if (plan?.id) {
    const def = MOTORS.get(plan.id);
    remember(plan.id);
    const data = motorData(actor, plan.id);
    const next = { ...data, ...plan.changes };
    next.value = toInt(data.value) - toInt(plan.spent) + toInt(plan.gain);
    if (plan.set) next.state = plan.set;
    const final = def.after ? (def.after(actor, item, plan, next) ?? next) : next;
    await setMotor(actor, plan.id, final);
  }
  else if ((item.system.tags ?? []).includes("Weapon Attack")) {
    for (const { def } of motorsOf(actor)) {
      if (!def.onWeaponAttack) continue;
      remember(def.id);
      await def.onWeaponAttack(actor, item);
    }
  }
  return Object.keys(before).length ? { actorUuid: actor.uuid, before } : null;
}

/** Undo: the Motor states from before the use. */
export async function undoMotorUse(record) {
  const actor = record?.actorUuid ? fromUuidSync(record.actorUuid) : null;
  if (!(actor instanceof Actor)) return;
  for (const [id, state] of Object.entries(record.before ?? {})) {
    if (MOTORS.has(id)) await setMotor(actor, id, state);
  }
}

/* -------------------------------------------- */
/*  Events                                      */
/* -------------------------------------------- */

/**
 * Tell an actor's Motors that something happened (onSetup, onDodged…). Errors are logged, never thrown.
 * @param {Actor} actor
 * @param {string} event
 * @param {...*} args
 */
export async function motorEvent(actor, event, ...args) {
  for (const { def, lesser } of motorsOf(actor)) {
    if (typeof def[event] !== "function") continue;
    try {
      await def[event](actor, { lesser }, ...args);
    }
    catch (err) {
      console.error(`${SYSTEM_ID} | Motor ${def.id}: ${event} failed for ${actor.uuid}`, err);
    }
  }
}

/**
 * Roll bonuses the actor's Motors add to a skill roll (the Samurai's Echo of Steel).
 * @param {Actor} actor
 * @param {Item} item
 * @param {"check"|"damage"} which
 * @returns {{dice: number, mod: number, label: string}[]}
 */
export function motorRollBonuses(actor, item, which) {
  const bonuses = [];
  for (const { def, lesser } of motorsOf(actor)) {
    if (def.rollBonuses) bonuses.push(...(def.rollBonuses(actor, item, which, { lesser }) ?? []));
  }
  return bonuses;
}

/**
 * Statuses the actor's Motors give to whoever a damage card of this skill hits (the Samurai's Delayed Thunder),
 * as the attacker's "on hit" effects: { statusId, value, name }.
 * @param {Actor} actor
 * @param {Item} item
 * @returns {object[]}
 */
export function motorOnHit(actor, item) {
  const statuses = [];
  for (const { def, lesser } of motorsOf(actor)) {
    if (def.onHit) statuses.push(...(def.onHit(actor, item, { lesser }) ?? []));
  }
  return statuses;
}

/**
 * Whether the skill's last use was a Perfect Cut that hits without a Dodge Check.
 * @param {Item} item
 * @returns {boolean}
 */
export function motorAutoHit(item) {
  return !!skillMotor(item)?.perfect && (toInt(item?.flags?.[SYSTEM_ID]?.[USE_FLAG]?.perfect) > 0);
}

/** Call during the `init` hook. */
export function registerMotorSocket() {
  registerHandler("eterniaMotor", onMotorRequest);
}
