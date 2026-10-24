/**
 * What some effects do besides their changes, read from their flags (the race skills use them):
 *   immune: ["frightened", …]    while the effect is on, those statuses don't take, and they end when it comes
 *   fatigueOnEnd: n              when the effect ends (or is removed), the actor takes [Fatigue: n]
 *   endsWith: "berserk"          the effect ends when the actor loses that status
 *   consumeOn: "negotiation"     the effect ends after the next roll of that kind (conditions/rolls.mjs):
 *                                a check ("negotiation", "accuracy"…, "check" for any), "dodge" (Evasion or
 *                                Resistance), "damage" (the next damage applied to the actor) or "attack" (the
 *                                next damage the actor rolls)
 * and, on a skill, `flags.eternia.useActions`: what using it does when its effects are applied
 * (item-use.mjs applyItemEffects), each to the targets (default), the user ("self") or both:
 *   { type: "fatigue", value: "-@cr*5" }        changes the Fatigue (never below 0)
 *   { type: "doubleStatus", status: "berserk" } doubles the Rating of a status the actor has
 *   { type: "removeStatus", statuses: ["burning", …] } ends those statuses (a purifying potion, professions/forge.mjs)
 *   { type: "switch" }                          the user and the (first) target trade places and Hate (the basic
 *                                               skill Switch); only between allies
 *   { type: "steal", statuses: ["empowered", …] } those statuses pass from the target to the user, with their
 *                                               Ratings (the Absorção's Roubar a Alma)
 *   { type: "pull" }                            the target's token comes to the user's square, engaged with it (the
 *                                               Nebulosa Sinistra's vortex)
 *   { type: "push", value: n }                  the target's token goes n squares away from the user, in a straight line
 * Pulls and pushes are forced moves (`eterniaForced`: what keeps a token in place doesn't stop them, and they break no
 * Decree of Truth). An action with `onUse: true` comes with the use itself, also on a skill whose targets resist the
 * rest (helpers/sustained.mjs): the vortex pulls them in before the check.
 */
import { L, SYSTEM_ID } from "../settings.mjs";
import { isLocalChange } from "../helpers/clients.mjs";
import { actorName, postSummary, toInt } from "../helpers/utils.mjs";
import { evaluateFormula, formulaData, isFormula } from "../helpers/effect-formulas.mjs";
import { registerHandler, request } from "../piles/pile-socket.mjs";
import { statusDefinition } from "../helpers/statuses.mjs";
import { has, rating, removeStatuses } from "./rules.mjs";
import { agonyPain, freed } from "./damage.mjs";

const label = id => game.i18n.localize(`ETERNIA.StatusEffect.${id}`);
const flag = (effect, key) => effect.getFlag?.(SYSTEM_ID, key) ?? effect.flags?.[SYSTEM_ID]?.[key];
const listOf = value => Array.isArray(value) ? value : (value ? Object.values(value) : []);

/** The statuses an actor is immune to, from its active effects. */
export function immunities(actor) {
  const out = new Set();
  // The actor's effects and the passive (transfer) effects of its items: a talent may make it immune.
  for (const effect of actor?.allApplicableEffects?.() ?? actor?.effects ?? []) {
    if (!effect.active) continue;
    for (const id of listOf(flag(effect, "immune"))) out.add(id);
  }
  return out;
}

/** The statuses an effect gives. */
const statusesOf = effect => [...(effect.statuses ?? []), flag(effect, "statusData")?.statusId].filter(Boolean);

/* -------------------------------------------- */
/*  Use actions                                 */
/* -------------------------------------------- */

/**
 * Run the use actions of an item on the actors its effects went to.
 * @param {Item} item
 * @param {{targets: Actor[], caster: Actor|null}} recipients
 * @returns {Promise<string[]>}   Names of the actors they changed
 */
export async function runUseActions(item, { targets, caster, onUse }) {
  // `onUse`: true, only the actions that come with the use itself; false, only the others; undefined, all of them
  const actions = listOf(item.getFlag?.(SYSTEM_ID, "useActions"))
    .filter(a => (onUse === undefined) || (!!a?.onUse === onUse));
  if (!actions.length) return [];
  const values = formulaData(caster ?? item.actor, item);
  const lines = [];
  const names = [];
  for (const action of actions) {
    const to = action.recipients ?? "targets";
    let actors = [...new Set([...(to !== "self" ? targets : []), ...((to !== "targets") && caster ? [caster] : [])])];
    // A Switch is with one ally; nobody pulls or pushes itself
    if (action.type === "switch") actors = actors.filter(a => a !== caster).slice(0, 1);
    if (["pull", "push"].includes(action.type)) actors = actors.filter(a => a !== caster);
    const value = isFormula(action.value) ? (evaluateFormula(action.value, values) ?? 0) : toInt(action.value);
    for (const actor of actors) {
      const payload = {
        actorUuid: actor.uuid, type: action.type, value, status: action.status ?? "", statuses: listOf(action.statuses),
        casterUuid: caster?.uuid ?? "", sceneId: canvas?.scene?.id ?? ""
      };
      const line = actor.isOwner ? await doAction(actor, payload) : (await request("conditionAction", payload))?.line;
      if (line) {
        lines.push(line);
        names.push(actorName(actor));
      }
    }
  }
  if (lines.length) await postSummary(item.name, lines);
  return names;
}

/**
 * End statuses on an actor for a skill's user, through the GM when the user doesn't own it (the Dragon Slayer eats the
 * flames off a target). Returns the chat line, or null.
 * @param {Actor} actor
 * @param {string[]} statuses
 * @param {Actor} caster
 * @returns {Promise<string|null>}
 */
export async function endStatuses(actor, statuses, caster) {
  const payload = {
    actorUuid: actor.uuid, type: "removeStatus", value: 0, status: "", statuses, casterUuid: caster?.uuid ?? "",
    sceneId: canvas?.scene?.id ?? ""
  };
  return actor.isOwner ? doAction(actor, payload) : ((await request("conditionAction", payload))?.line ?? null);
}

/**
 * Statuses pass from an actor to a thief, with their Ratings, through the GM when the user doesn't own the actor (a
 * Magia's Trait that steals on a hit: the Roubo). Returns the chat line, or null.
 * @param {Actor} actor
 * @param {string[]} statuses
 * @param {Actor} thief
 * @returns {Promise<string|null>}
 */
export async function stealStatuses(actor, statuses, thief) {
  const payload = {
    actorUuid: actor.uuid, type: "steal", value: 0, status: "", statuses, casterUuid: thief?.uuid ?? "",
    sceneId: canvas?.scene?.id ?? ""
  };
  return actor.isOwner ? doAction(actor, payload) : ((await request("conditionAction", payload))?.line ?? null);
}

/** One use action on one actor. Returns the chat line. */
async function doAction(actor, { type, value, status, statuses = [], casterUuid = "", sceneId = "" }) {
  if (type === "switch") return switchPlaces(actor, await actorOf(casterUuid), sceneId);
  if (type === "pull") return pullTo(actor, await actorOf(casterUuid), sceneId);
  if (type === "push") return pushFrom(actor, await actorOf(casterUuid), sceneId, value);
  if (type === "fatigue") {
    const before = toInt(actor._source.system?.infos?.fatigue);
    const after = Math.max(0, before + toInt(value));
    if (after === before) return null;
    await actor.update({ "system.infos.fatigue": after });
    return L("Conditions.Actions.Fatigue", { name: actorName(actor), before, after });
  }
  if (type === "doubleStatus") {
    const def = statusDefinition(status);
    const current = rating(actor, status);
    if (!def?.path || !has(actor, status) || !current) return null;
    await actor.update({ [`system.${def.path}`]: current * 2 });
    return L("Conditions.Actions.Double", { name: actorName(actor), status: label(status), n: current * 2 });
  }
  if (type === "removeStatus") {
    const ids = listOf(statuses).filter(id => has(actor, id));
    if (!ids.length) return null;
    await removeStatuses(actor, ids);
    const line = L("Conditions.Actions.Remove", { name: actorName(actor), statuses: ids.map(label).join(", ") });
    freed(actor, ids);
    // [Agony]: getting rid of a Bad Status hurts (not when the Agony itself goes).
    const bad = ids.some(id => statusDefinition(id)?.group === "bad");
    const pain = (bad && !ids.includes("agony")) ? await agonyPain(actor, { silent: true }) : null;
    return pain ? `${line} · ${pain.line}` : line;
  }
  if (type === "steal") {
    const thief = await actorOf(casterUuid);
    const ids = listOf(statuses).filter(id => has(actor, id));
    if (!thief || (thief.uuid === actor.uuid) || !ids.length) return null;
    const taken = ids.map(id => ({ id, value: statusDefinition(id)?.rated ? rating(actor, id) : null }));
    await removeStatuses(actor, ids);
    for (const { id, value } of taken) await game.eternia.applyStatus(thief, id, { value, from: thief });
    return L("Conditions.Actions.Steal", { name: actorName(thief), from: actorName(actor), statuses: ids.map(label).join(", ") });
  }
  return null;
}

/** The actor of a uuid (a token's uuid gives its actor), or null. */
async function actorOf(uuid) {
  const doc = uuid ? await fromUuid(uuid).catch(() => null) : null;
  const actor = (doc instanceof TokenDocument) ? doc.actor : doc;
  return (actor instanceof Actor) ? actor : null;
}

/**
 * Switch: the user and an ally trade places (their tokens on the scene the user was looking at) and Hate. Returns the
 * chat line.
 * @param {Actor} ally
 * @param {Actor|null} user
 * @param {string} sceneId
 */
async function switchPlaces(ally, user, sceneId) {
  if (!user || (user.uuid === ally.uuid)) return null;
  const scene = game.scenes.get(sceneId) ?? canvas?.scene ?? null;
  const tokenOf = actor => ((actor.token?.parent === scene) ? actor.token
    : (scene?.tokens.find(t => t.actorLink && (t.actorId === actor.id)) ?? null));
  const mine = tokenOf(user);
  const theirs = tokenOf(ally);
  const allies = (mine && theirs) ? (mine.disposition === theirs.disposition) : (user.type === ally.type);
  if (!allies) return L("Conditions.Actions.SwitchFoe", { name: actorName(user), ally: actorName(ally) });
  if (mine && theirs) {
    // A forced move: no one left an engagement by itself (conditions/decree.mjs)
    await scene.updateEmbeddedDocuments("Token", [
      { _id: mine.id, x: theirs.x, y: theirs.y, elevation: theirs.elevation },
      { _id: theirs.id, x: mine.x, y: mine.y, elevation: mine.elevation }
    ], { eterniaForced: true });
  }
  const hateOf = actor => toInt(actor._source.system?.infos?.hate);
  const before = { mine: hateOf(user), theirs: hateOf(ally) };
  if (before.mine !== before.theirs) {
    await user.update({ "system.infos.hate": before.theirs });
    await ally.update({ "system.infos.hate": before.mine });
  }
  return L("Conditions.Actions.Switch", { name: actorName(user), ally: actorName(ally), mine: before.theirs, theirs: before.mine });
}

/** Where a token stands: its source position (TokenDocument#x keeps the old place while a move animates). */
const placeOf = token => ({ x: token._source.x, y: token._source.y });

/** The token of an actor on a scene (a token actor's own, else a linked token of it), or null. */
function sceneToken(scene, actor) {
  if (!scene || !actor) return null;
  if (actor.isToken) return (actor.token?.parent === scene) ? actor.token : null;
  return scene.tokens.find(t => t.actorLink && (t.actorId === actor.id)) ?? null;
}

/**
 * Pull: the target's token comes to the user's square (engaged with it), on the scene the user was looking at. A forced
 * move. Returns the chat line, or null (already engaged, or a token missing).
 * @param {Actor} target
 * @param {Actor|null} user
 * @param {string} sceneId
 */
async function pullTo(target, user, sceneId) {
  if (!user || (user.uuid === target.uuid)) return null;
  const scene = game.scenes.get(sceneId) ?? canvas?.scene ?? null;
  const theirs = sceneToken(scene, target);
  const mine = sceneToken(scene, user);
  if (!theirs || !mine) return null;
  const to = placeOf(mine);
  const from = placeOf(theirs);
  if ((from.x === to.x) && (from.y === to.y)) return null;
  await theirs.update({ x: to.x, y: to.y, elevation: mine._source.elevation }, { eterniaForced: true });
  return L("Conditions.Actions.Pull", { name: actorName(target), to: actorName(user) });
}

/**
 * Push: the target's token goes n squares away from the user, in a straight line along the axis it is farther on (out
 * of the user's square: to the right), kept inside the scene. A forced move. Returns the chat line, or null.
 * @param {Actor} target
 * @param {Actor|null} user
 * @param {string} sceneId
 * @param {number} n
 */
async function pushFrom(target, user, sceneId, n) {
  const steps = Math.max(1, toInt(n));
  if (!user || (user.uuid === target.uuid)) return null;
  const scene = game.scenes.get(sceneId) ?? canvas?.scene ?? null;
  const theirs = sceneToken(scene, target);
  const mine = sceneToken(scene, user);
  if (!theirs || !mine) return null;
  const size = scene.grid.size;
  const from = placeOf(theirs);
  const dx = from.x - placeOf(mine).x;
  const dy = from.y - placeOf(mine).y;
  const alongX = (Math.abs(dx) >= Math.abs(dy));
  const sign = d => Math.sign(d) || 1;
  const rect = scene.dimensions?.sceneRect ?? { x: 0, y: 0, width: scene.width, height: scene.height };
  const x = Math.clamp(from.x + (alongX ? sign(dx) * steps * size : 0), rect.x, rect.x + rect.width - (theirs.width * size));
  const y = Math.clamp(from.y + (alongX ? 0 : sign(dy) * steps * size), rect.y, rect.y + rect.height - (theirs.height * size));
  const moved = Math.round((Math.abs(x - from.x) + Math.abs(y - from.y)) / size);
  if (!moved) return null;
  await theirs.update({ x, y }, { eterniaForced: true });
  return L("Conditions.Actions.Push", { name: actorName(target), from: actorName(user), n: moved });
}

/** GM side of a use action on an actor the user doesn't own: only from the owner of the user. */
async function onActionRequest({ actorUuid, casterUuid, sceneId, type, value, status, statuses }, user) {
  const actor = await actorOf(actorUuid);
  const owner = await actorOf(casterUuid);
  if (!actor || !owner?.testUserPermission(user, "OWNER")) return { ok: false };
  const ids = listOf(statuses).filter(id => (typeof id === "string") && statusDefinition(id));
  return {
    ok: true,
    line: await doAction(actor, { type, value: Math.max(-999, Math.min(999, toInt(value))), status, statuses: ids, casterUuid, sceneId })
  };
}

/* -------------------------------------------- */
/*  Effect flags                                */
/* -------------------------------------------- */

/** A status coming to an actor immune to it doesn't take. */
function onPreCreateEffect(effect, data, options, userId) {
  if (userId !== game.user.id) return;
  const actor = effect.parent;
  if (!(actor instanceof Actor)) return;
  const immune = immunities(actor);
  if (!immune.size) return;
  const blocked = statusesOf(effect).filter(id => immune.has(id));
  if (!blocked.length) return;
  ui.notifications.info(L("Conditions.Immune", { name: actorName(actor), status: blocked.map(label).join(", ") }));
  return false;
}

async function onCreateEffect(effect, options, userId) {
  if (!isLocalChange(options, userId)) return;
  const actor = effect.parent;
  if (!(actor instanceof Actor)) return;
  // An immunity ends the statuses it covers.
  const immune = listOf(flag(effect, "immune")).filter(id => has(actor, id));
  if (immune.length) await removeStatuses(actor, immune);
}

async function onDeleteEffect(effect, options, userId) {
  if (!isLocalChange(options, userId)) return;
  const actor = effect.parent;
  if (!(actor instanceof Actor)) return;
  // The price of a transformation, when it ends.
  const fatigue = toInt(flag(effect, "fatigueOnEnd"));
  if ((fatigue > 0) && (actor.type === "character")) {
    const total = toInt(actor._source.system?.infos?.fatigue) + fatigue;
    await actor.update({ "system.infos.fatigue": total });
    await postSummary(effect.name, [L("Conditions.FatigueOnEnd", { name: actorName(actor), effect: effect.name, n: fatigue })]);
  }
  // Effects that last only while a status does.
  const gone = statusesOf(effect).filter(id => !has(actor, id));
  if (gone.length) {
    const ids = actor.effects.filter(e => gone.includes(flag(e, "endsWith"))).map(e => e.id);
    if (ids.length) await actor.deleteEmbeddedDocuments("ActiveEffect", ids).catch(() => null);
  }
}

/**
 * The passive [Cancel] of an actor's effects (`eternia.passive.cancel`, tag in `flags.eternia.cancelTag`), as
 * entries like those of its status.
 * @param {Actor} actor
 * @returns {{value: number, tag: string}[]}
 */
export function passiveCancels(actor) {
  return (actor?.passiveBonuses ?? []).filter(b => b.key === "eternia.passive.cancel").map(b => ({
    value: isFormula(b.value) ? (evaluateFormula(b.value, formulaData(actor, b.effect.sourceItem)) ?? 0) : toInt(b.value),
    tag: flag(b.effect, "cancelTag") ?? ""
  })).filter(e => e.value > 0);
}

/**
 * The passive [Weakness] of an actor's effects (`eternia.passive.weakness`, tag in `flags.eternia.weaknessTag`: a
 * Magia's Tabu, weak to the light), as entries like those of its status.
 * @param {Actor} actor
 * @returns {{value: number, tag: string}[]}
 */
export function passiveWeaknesses(actor) {
  return (actor?.passiveBonuses ?? []).filter(b => b.key === "eternia.passive.weakness").map(b => ({
    value: isFormula(b.value) ? (evaluateFormula(b.value, formulaData(actor, b.effect.sourceItem)) ?? 0) : toInt(b.value),
    tag: flag(b.effect, "weaknessTag") ?? ""
  })).filter(e => e.value > 0);
}

/**
 * The effects of an actor that end after a roll of this kind.
 * @param {Actor} actor
 * @param {string[]} kinds   "negotiation", "check", "dodge", "evasion"…
 * @returns {string[]}       Effect ids
 */
export function consumedBy(actor, kinds) {
  return (actor?.effects ?? []).filter(e => e.active && kinds.includes(flag(e, "consumeOn"))).map(e => e.id);
}

/** Call during the `init` hook. */
export function registerConditionEffects() {
  registerHandler("conditionAction", onActionRequest);
  Hooks.on("preCreateActiveEffect", onPreCreateEffect);
  Hooks.on("createActiveEffect", (...args) => onCreateEffect(...args).catch(err => console.error(`${SYSTEM_ID} | Immunity failed`, err)));
  Hooks.on("deleteActiveEffect", (...args) => onDeleteEffect(...args).catch(err => console.error(`${SYSTEM_ID} | Effect end failed`, err)));
}
