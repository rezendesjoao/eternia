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
 *   needs   { state, min, max, full, weapon: [tags] }  checked before the use, like a usage limit; `state` may be
 *           a list (any of them)
 *   spend   "all" | "choose" | n                   "choose": up to `max` (a formula, "@sr+1")
 *   gain    n
 *   set     a state ("drawn")
 *   action  "major" | "minor" | "move" | "none"     the action it spends instead of its Timing's
 *   alsoSpends  more actions it takes ("move")
 *   draw    true for the class's own strikes (the Samurai's Iai and the like), read by its rules
 *   perfect true when the strike can be a Perfect Cut (the class decides what that takes)
 *   inCombat true: the Motor part only applies in a started combat
 *   (a class may read more keys of its own: role in a chain, a form, a song…)
 * Before the card is posted, what the use will spend is kept on the skill (flags.eternia.motorUse): its
 * formulas read it as @spent and @perfect (and @per, the dice per point, and @use.<key>, the class's own values),
 * also when the damage is rolled later from the card. After the card, the change is written and noted on the use
 * record, so Undo gives it back.
 *
 * A Motor definition (see samurai.mjs and the other class files):
 *   id, i18n            the key prefix of its Name, Unit, State.<state> and Card texts
 *   states, defaults    its states (one alone: no state chip) and the data a new actor starts with
 *   costKeyword         the word a skill's cost reads ("Hate 1+Cortes")
 *   stateColors         token disc color of each state (0xRRGGBB), optional
 *   max(actor, ctx)     its cap
 *   normalize?(actor, data)  keeps the class's own data coherent with the value whenever the Motor is written (the
 *                       Strategist's Readings when a pip is clicked); returns the data to write
 *   issues?(actor, item, motor, ctx), actionOf?(actor, item, motor, action), plan?(actor, item, motor, ctx) (may be
 *   async; may set plan.vars, plan.autoHit, plan.changes), after?(actor, item, plan, next), rollBonuses?(actor, item,
 *   which, ctx), onHit?(actor, item, ctx), display?(actor, ctx) → { ready, readyLabel, note }, formulaData?(actor,
 *   item, ctx) → more @motor.* values, statuses?(actor, ctx) → passive statuses kept on the actor
 *   ([{ key, statusId, value, tag }], see syncMotorStatuses), cardActions?(actor, ctx, card) and onCardAction?(actor,
 *   ctx, action, card): buttons on attack cards (index.mjs)
 *   and the events, each called as fn(actor, { lesser }, ...args) on the window where it happened:
 *     onCombatStart(combat), onSetup(combat, round), onCleanup(combat, round), onCombatEnd(combat),
 *     onTurnStart(combat), onTurnEnd(combat)          the actor's own Main Process
 *     onUse(item, plan)                               any skill the actor used, after its card
 *     onWeaponAttack(item)                            a weapon attack without a Motor part of its own
 *     onAttacked(attacker, item, message), onDodged(attacker, item, message)
 *     onHitTarget(target, item, message), onMissTarget(target, item, message)
 *     onDamaged(amount, attacker, item, card), onHealed(amount, healer, item, card)
 *     onKill(target, item, card), onMove(squares), onCheck(roll, context)
 *   and the same seen by everyone with a Motor in the actor's combat (allies and enemies alike):
 *     onAnyHit(attacker, target, item, message), onAnyMiss(attacker, target, item, message),
 *     onAnyDamaged(victim, amount, attacker, item), onAnyHealed(target, amount, healer, item),
 *     onAnyCheck(roller, roll, context), onAnyKill(victim, attacker, item)
 */
import { L, SYSTEM_ID } from "../settings.mjs";
import { getHands } from "../helpers/hands.mjs";
import { request, registerHandler } from "../piles/pile-socket.mjs";
import { evaluateFormula, formulaData } from "../helpers/effect-formulas.mjs";
import { combatActors, combatOf, escape, toInt } from "../helpers/utils.mjs";
import { tagLabel } from "../i18n/terms.mjs";

export const MOTOR_FLAG = "motor";
export const USE_FLAG = "motorUse";
/** Flag of the passive statuses a Motor keeps on its actor: "<motor>:<key>". */
export const STATUS_FLAG = "motorStatus";

/** How long a use's values stay valid for its later rolls (the damage rolled from the card). */
const USE_TTL = 10 * 60 * 1000;

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
export const motorStateLabel = (def, state) => ((def.states?.length ?? 0) > 1 ? L(`${def.i18n}.State.${state}`) : "");

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
 * The side of an actor: its token's disposition, else monsters against characters (−1 / 1).
 * @param {Actor} actor
 * @returns {number}
 */
export function sideOf(actor) {
  const disposition = actor?.token?.disposition ?? actor?.prototypeToken?.disposition;
  if (Number.isFinite(disposition) && (disposition !== 0)) return Math.sign(disposition);
  return (actor?.type === "monster") ? -1 : 1;
}

/** Whether two actors are on opposite sides. */
export function areEnemies(a, b) {
  return !!a && !!b && (sideOf(a) !== sideOf(b));
}

/** Whether two different actors are on the same side. */
export function areAllies(a, b) {
  return !!a && !!b && (a.uuid !== b.uuid) && (sideOf(a) === sideOf(b));
}

/** The actors fighting in the actor's started combat (the actor included), or []. */
export function combatPeers(actor) {
  const combat = combatOf(actor);
  return combat ? [...new Set(combatActors(combat))] : [];
}

/** "<combat>.<round>" of the combat the actor fights in, or null. */
export function roundKey(actor) {
  const combat = combatOf(actor);
  return combat ? `${combat.id}.${combat.round}` : null;
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

/** The context a definition's functions get: whether it is the Lesser Motor, its data and cap. */
export function motorContext(actor, id) {
  const motor = motorOf(actor, id);
  return { lesser: !!motor?.lesser, data: motorData(actor, id), max: motorMax(actor, id) };
}

/**
 * Write a Motor's state: by the owner, else by the GM (socket). Then the passive statuses it gives follow.
 * @param {Actor} actor
 * @param {string} id
 * @param {object} data    The whole new state (the value is kept between 0 and the cap)
 */
export async function setMotor(actor, id, data) {
  const max = motorMax(actor, id);
  const value = Math.clamp(toInt(data.value), 0, Math.max(max, 0));
  const def = MOTORS.get(id);
  let state = { ...data, value };
  if (def?.normalize) state = def.normalize(actor, state) ?? state;
  if (actor.isOwner) {
    await actor.update({ [`flags.${SYSTEM_ID}.${MOTOR_FLAG}.${id}`]: state });
    return syncMotorStatuses(actor);
  }
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
  await syncMotorStatuses(actor);
  return { ok: true };
}

/**
 * Keep on the actor the passive statuses its Motors give now (def.statuses: a Guardian's Cancel by its Layers, a
 * Druid's form…): missing ones are created, changed ones replaced, the others removed. Run by whoever wrote the
 * Motor (its owner or the GM).
 * @param {Actor} actor
 */
export async function syncMotorStatuses(actor) {
  if (!actor?.isOwner) return;
  const wanted = new Map();
  for (const { def, lesser } of motorsOf(actor)) {
    if (!def.statuses) continue;
    let list = [];
    try {
      list = def.statuses(actor, { lesser, data: motorData(actor, def.id), max: motorMax(actor, def.id) }) ?? [];
    }
    catch (err) {
      console.error(`${SYSTEM_ID} | Motor ${def.id}: statuses failed for ${actor.uuid}`, err);
    }
    for (const s of list) wanted.set(`${def.id}:${s.key ?? s.statusId}`, s);
  }
  const current = actor.effects.filter(e => e.flags?.[SYSTEM_ID]?.[STATUS_FLAG]);
  const remove = [];
  const keep = new Set();
  for (const effect of current) {
    const key = effect.flags[SYSTEM_ID][STATUS_FLAG];
    const want = wanted.get(key);
    const has = effect.flags[SYSTEM_ID].statusData ?? {};
    const same = want && (has.statusId === want.statusId) && (toInt(has.value) === toInt(want.value))
      && ((has.tag ?? "") === (want.tag ?? ""));
    if (same && !keep.has(key)) keep.add(key);
    else remove.push(effect.id);
  }
  // Loaded here: chat/status-links.mjs reaches this module back through automation/use.mjs.
  const { statusEffectData } = await import("../chat/status-links.mjs");
  const create = [...wanted.entries()].filter(([key]) => !keep.has(key)).map(([key, s]) => {
    const data = statusEffectData(s.statusId, toInt(s.value) || null, s.tag ?? "", { caster: actor, expires: "endOfScene" });
    data.flags[SYSTEM_ID][STATUS_FLAG] = key;
    if (s.name) data.name = s.name;
    return data;
  });
  if (remove.length) await actor.deleteEmbeddedDocuments("ActiveEffect", remove).catch(() => null);
  if (create.length) await actor.createEmbeddedDocuments("ActiveEffect", create);
}

/* -------------------------------------------- */
/*  Values for formulas and costs               */
/* -------------------------------------------- */

/**
 * What a formula reads from the Motors: @spent, @perfect, @per and @use.<key> of the skill's last use, and
 * @motor.value / @motor.max / @motor.last (and the class's own @motor.<key>) of the skill's Motor (or the actor's
 * first one).
 * @param {Actor} actor
 * @param {Item|null} item
 * @returns {object}
 */
export function motorFormulaData(actor, item) {
  const use = item?.flags?.[SYSTEM_ID]?.[USE_FLAG] ?? {};
  const owned = motorsOf(actor);
  const id = skillMotor(item)?.id ?? owned[0]?.def.id ?? null;
  const def = id ? MOTORS.get(id) : null;
  const data = id ? motorData(actor, id) : {};
  const max = id ? motorMax(actor, id) : 0;
  const lesser = !!owned.find(m => m.def.id === id)?.lesser;
  let extra = {};
  if (def?.formulaData) {
    try {
      extra = def.formulaData(actor, item, { lesser, data, max }) ?? {};
    }
    catch (err) {
      console.error(`${SYSTEM_ID} | Motor ${id}: formulaData failed`, err);
    }
  }
  return {
    spent: toInt(use.spent),
    perfect: toInt(use.perfect),
    per: toInt(use.per),
    use: { ...(use.vars ?? {}) },
    motor: { ...extra, value: toInt(data.value), max, last: toInt(data.last) }
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
export function mainWeaponTags(actor) {
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
  const states = [needs.state].flat().filter(Boolean);
  if (states.length && !states.includes(data.state)) {
    issues.push(L("Motor.Issue.State", { state: states.map(s => L(`${def.i18n}.State.${s}`)).join(" / ") }));
  }
  if (needs.min && (toInt(data.value) < needs.min)) {
    issues.push(L("Motor.Issue.Min", { n: needs.min, unit: motorUnit(def), have: toInt(data.value) }));
  }
  if (Number.isFinite(needs.max) && (toInt(data.value) > needs.max)) {
    issues.push(L("Motor.Issue.Max", { n: needs.max, unit: motorUnit(def), have: toInt(data.value) }));
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
 * Ask the user to pick one of several options (a form, a song, a slot…), for a class's plan.
 * @param {string} title
 * @param {{value: string, label: string}[]} options
 * @param {object} [settings]
 * @param {string} [settings.hint]       Text above the list
 * @param {string} [settings.selected]   The option selected at first
 * @returns {Promise<string|null>}       The value, or null when cancelled
 */
export async function chooseOption(title, options, { hint = "", selected = null } = {}) {
  if (!options.length) return null;
  if (options.length === 1) return options[0].value;
  const list = options.map(o => `<option value="${escape(o.value)}"${o.value === selected ? " selected" : ""}>${escape(o.label)}</option>`).join("");
  const result = await foundry.applications.api.DialogV2.prompt({
    window: { title, icon: "fa-solid fa-list-check" },
    classes: ["eternia", "motor-choose"],
    content: `${hint ? `<p>${escape(hint)}</p>` : ""}<div class="form-group"><select name="choice">${list}</select></div>`,
    ok: { label: L("Motor.ChooseOk"), callback: (event, button) => button.form.elements.choice.value },
    rejectClose: false
  });
  return result ?? null;
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

  let plan = {
    id: motor.id, spent, gain: toInt(motor.gain), set: motor.set ?? null, perfect: 0, per: 2, autoHit: false,
    vars: {}, changes: {}
  };
  if (def.plan) {
    const planned = await def.plan(actor, item, motor, { data, max, lesser: owned.lesser, plan });
    if (planned === null) return null;
    plan = planned ?? plan;
  }
  // What the formulas and the later rolls of this use read: the amounts, and the state it was used in.
  await item.setFlag(SYSTEM_ID, USE_FLAG, {
    spent: plan.spent, perfect: plan.perfect, per: plan.per, autoHit: !!plan.autoHit, vars: plan.vars ?? {},
    state: data.state ?? null, last: toInt(data.last), at: Date.now()
  });
  return plan;
}

/**
 * After the card: write the Motor change and the class's own reactions. Skills without a Motor part that are
 * weapon attacks go to the class rules too (the Samurai's blade leaves the sheath); every Motor of the actor then
 * hears of the use (onUse).
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
    const final = def.after ? ((await def.after(actor, item, plan, next)) ?? next) : next;
    await setMotor(actor, plan.id, final);
  }
  else if ((item.system.tags ?? []).includes("Weapon Attack")) {
    for (const { def } of motorsOf(actor)) {
      if (!def.onWeaponAttack) continue;
      remember(def.id);
      await def.onWeaponAttack(actor, item);
    }
  }
  for (const { def, lesser } of motorsOf(actor)) {
    if (typeof def.onUse !== "function") continue;
    remember(def.id);
    try {
      await def.onUse(actor, { lesser }, item, plan?.id === def.id ? plan : null);
    }
    catch (err) {
      console.error(`${SYSTEM_ID} | Motor ${def.id}: onUse failed for ${actor.uuid}`, err);
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

/** The values of a skill's last use (motorUse), while still fresh, or null. */
export function recentUse(item) {
  const use = item?.flags?.[SYSTEM_ID]?.[USE_FLAG];
  return (use && (Date.now() - toInt(use.at) < USE_TTL)) ? use : null;
}

/* -------------------------------------------- */
/*  Events                                      */
/* -------------------------------------------- */

/** The events of each actor, one after the other: an attack card's checks arrive together, and each event reads the
 * Motor the previous one wrote. A class must not await an event of its own actor inside an event. */
const QUEUES = new Map();

function queued(actor, fn) {
  const key = actor?.uuid ?? "";
  const run = (QUEUES.get(key) ?? Promise.resolve()).then(fn, fn);
  const tail = run.catch(() => null);
  QUEUES.set(key, tail);
  tail.then(() => {
    if (QUEUES.get(key) === tail) QUEUES.delete(key);
  });
  return run;
}

/**
 * Tell an actor's Motors that something happened (onSetup, onDodged…). Errors are logged, never thrown.
 * @param {Actor} actor
 * @param {string} event
 * @param {...*} args
 */
export function motorEvent(actor, event, ...args) {
  return queued(actor, async () => {
    for (const { def, lesser } of motorsOf(actor)) {
      if (typeof def[event] !== "function") continue;
      try {
        await def[event](actor, { lesser }, ...args);
      }
      catch (err) {
        console.error(`${SYSTEM_ID} | Motor ${def.id}: ${event} failed for ${actor.uuid}`, err);
      }
    }
  });
}

/**
 * Tell everyone with a Motor in these actors' combat (an onAny… event).
 * @param {Actor[]} actors     Whoever the event is about: their combat is the one told
 * @param {string} event
 * @param {...*} args
 */
export async function motorBroadcast(actors, event, ...args) {
  const peers = new Set();
  for (const actor of actors.filter(Boolean)) for (const peer of combatPeers(actor)) peers.add(peer);
  for (const peer of peers) {
    if (motorsOf(peer).some(m => typeof m.def[event] === "function")) await motorEvent(peer, event, ...args);
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
    if (!def.rollBonuses) continue;
    try {
      bonuses.push(...(def.rollBonuses(actor, item, which, { lesser }) ?? []));
    }
    catch (err) {
      console.error(`${SYSTEM_ID} | Motor ${def.id}: rollBonuses failed`, err);
    }
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
 * Whether the skill's last use hits without a Dodge Check: a Perfect Cut, or a class's plan that said so.
 * @param {Item} item
 * @returns {boolean}
 */
export function motorAutoHit(item) {
  const use = recentUse(item);
  if (!use) return false;
  return !!use.autoHit || (!!skillMotor(item)?.perfect && (toInt(use.perfect) > 0));
}

/** Call during the `init` hook. */
export function registerMotorSocket() {
  registerHandler("eterniaMotor", onMotorRequest);
}
