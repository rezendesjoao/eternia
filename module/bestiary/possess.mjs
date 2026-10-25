/**
 * Possessing (docs/bestiario.md): a monster's attack whose skill carries `flags.eternia.possess = { expel, expelled }`
 * (the Ghost's Possession) takes the monster into whoever its damage card reaches.
 * - Inside: the creature is [Dominated] by the monster while it is in (an effect with `flags.eternia.possessedBy`, the
 *   monster's token, whose [Dominated] doesn't end with the creature's turn: `renew`); the monster's token hides on the
 *   creature's square and goes along with it, and the monster is [Absent] (its Main Processes pass: automation/round.mjs).
 *   The monster keeps `flags.eternia.possessing = { host, effect, absent }` (the creature's token, the two effects).
 * - Hurting the possessed hurts both: the HP a damage card takes from the creature, the monster loses too, as direct
 *   damage (the card's attacker felled it, when that is what takes it down).
 * - Out: a damage or healing card with a tag of `expel` (["Radiance"]) on the possessed burns the monster out, with the
 *   statuses of `expelled` ([Exposed]); at the end of each of its own Main Processes the possessed rolls Resistance
 *   against the monster's, both rolled (the rule of the Hit Check: the monster wins the ties), and winning throws it out;
 *   the possessed falling, the monster falling, or the [Dominated] going any other way (the end of the scene, a skill
 *   that frees) let it out too. Its token shows again on the nearest free square.
 * The cards run on the window that applied them; what they change goes to the GM (`bestiaryPossess`), one at a time.
 */
import { L, SYSTEM_ID } from "../settings.mjs";
import { isPrimaryGM } from "../helpers/clients.mjs";
import { actorName, postSummary, toInt } from "../helpers/utils.mjs";
import { diceFormula } from "../helpers/dice.mjs";
import { statusDefinition } from "../helpers/statuses.mjs";
import { registerHandler, request } from "../piles/pile-socket.mjs";
import { statusEffectData } from "../chat/status-links.mjs";
import { takeDamage } from "../conditions/damage.mjs";
import { applyModifier, checkModifier, consumeAfterRoll } from "../conditions/rolls.mjs";
import { rulesOn } from "../conditions/rules.mjs";

/** The tags that burn the monster out, when the skill doesn't say. */
const EXPEL = ["Radiance"];

const label = id => game.i18n.localize(`ETERNIA.StatusEffect.${id}`);

/** The possession of a skill (its blow takes the monster in), or null. */
export const possessOf = item => item?.getFlag?.(SYSTEM_ID, "possess") ?? null;

/** The effect that keeps a creature possessed, or null. */
export const possessionOf = actor => [...(actor?.effects ?? [])].find(e => e.getFlag(SYSTEM_ID, "possessedBy")) ?? null;

/** Whom a monster possesses (its state), or null. */
export const possessingOf = actor => actor?.getFlag?.(SYSTEM_ID, "possessing") ?? null;

/** The monster's token inside a creature, or null. */
function ghostIn(actor) {
  const effect = possessionOf(actor);
  const token = effect ? fromUuidSync(effect.getFlag(SYSTEM_ID, "possessedBy")) : null;
  return ((token instanceof TokenDocument) && possessingOf(token.actor)) ? token : null;
}

/** The skill a monster possesses with, the tags that burn it out and the statuses it leaves with. */
function possessSkill(actor) {
  const item = (actor?.items ?? []).find(i => (i.type === "skill") && possessOf(i)) ?? null;
  const data = possessOf(item) ?? {};
  return { item, expel: (data.expel ?? EXPEL).map(t => String(t).toLowerCase()), expelled: data.expelled ?? [] };
}

/** Whether a card burns the monster out (one of its tags). */
const expels = (monster, card) => (card?.tags ?? []).some(t => possessSkill(monster).expel.includes(String(t).toLowerCase()));

const down = actor => !!actor && (actor.statuses.has("dead") || actor.statuses.has("incapacitated"));

/** The actor of a uuid (an actor's, or a token's). */
function actorOf(uuid) {
  const doc = uuid ? fromUuidSync(uuid) : null;
  return (doc instanceof Actor) ? doc : (doc?.actor ?? null);
}

/** The token of an actor: a token actor's own, else its first active one (on a scene, else the viewed one first). */
function tokenOf(actor, scene = canvas?.scene) {
  if (actor?.token) return actor.token;
  const tokens = actor?.getActiveTokens?.(false, true) ?? [];
  return tokens.find(t => t.parent === scene) ?? tokens[0] ?? null;
}

/** Where a token stands: its source place (TokenDocument#x keeps the old place while a move animates). */
const placeOf = token => ({ x: token._source?.x ?? token.x, y: token._source?.y ?? token.y });

/** The squares (top-left points) a token covers, as "x,y". */
function squaresOf(token) {
  const size = token.parent.grid.size;
  const at = placeOf(token);
  const out = [];
  for (let i = 0; i < Math.max(1, toInt(token.width)); i++) {
    for (let j = 0; j < Math.max(1, toInt(token.height)); j++) out.push(`${at.x + (i * size)},${at.y + (j * size)}`);
  }
  return out;
}

/** The nearest free square around a token, ring by ring (where the monster shows again), or null. */
function freeSquareNear(token, mover) {
  const scene = token.parent;
  const size = scene.grid.size;
  const at = placeOf(token);
  const w = Math.max(1, toInt(token.width)), h = Math.max(1, toInt(token.height));
  const taken = new Set(scene.tokens.filter(t => !t.hidden && (t !== mover)).flatMap(squaresOf));
  const rect = scene.dimensions?.sceneRect ?? { x: 0, y: 0, width: scene.width, height: scene.height };
  for (let r = 1; r <= 3; r++) {
    for (let j = -r; j < h + r; j++) {
      for (let i = -r; i < w + r; i++) {
        if ((i > -r) && (i < w + r - 1) && (j > -r) && (j < h + r - 1)) continue;
        const spot = { x: at.x + (i * size), y: at.y + (j * size) };
        const inScene = (spot.x >= rect.x) && (spot.y >= rect.y) && (spot.x + size <= rect.x + rect.width) && (spot.y + size <= rect.y + rect.height);
        if (inScene && !taken.has(`${spot.x},${spot.y}`)) return spot;
      }
    }
  }
  return null;
}

/** A roll of Resistance (its conditions too), with its critical and fumble (two 6s or more; all 1s). */
async function resistanceRoll(actor) {
  const check = actor.system.checks?.resistance ?? {};
  const base = { dice: Math.max(1, toInt(check.dice) || 2), mod: toInt((actor.type === "monster") ? check.mod : check.total) };
  const condition = checkModifier(actor, { stat: "resistance" });
  const roll = await new Roll(diceFormula(applyModifier(base, condition))).evaluate();
  await consumeAfterRoll(actor, condition.consume);
  const results = roll.dice[0]?.results.map(r => r.result) ?? [];
  const fumble = results.length > 0 && results.every(r => r === 1);
  const critical = !fumble && (results.filter(r => r === 6).length >= 2);
  return { roll, total: roll.total, critical, fumble, text: condition.text };
}

/* -------------------------------------------- */
/*  In and out (the GM)                         */
/* -------------------------------------------- */

/** Whether the user may act for this creature (the GM, or its owner: who applied the card). */
const owns = (user, actor) => !!actor && (user.isGM || actor.testUserPermission(user, "OWNER"));

/** The monster goes in: the creature [Dominated] while it is there, the monster's token hidden on it, [Absent]. */
async function enter({ ghostUuid, hostUuid, itemUuid }, user) {
  const ghost = fromUuidSync(ghostUuid);
  const host = fromUuidSync(hostUuid);
  const item = fromUuidSync(itemUuid);
  if (!(ghost instanceof TokenDocument) || !(host instanceof TokenDocument) || !ghost.actor || !host.actor) return { ok: false };
  const monster = ghost.actor;
  const body = host.actor;
  if (!owns(user, body) || !possessOf(item) || (item.actor?.uuid !== monster.uuid)) return { ok: false };
  if (possessingOf(monster) || possessionOf(body) || down(monster) || down(body) || (ghost.parent !== host.parent)) return { ok: true };
  // The [Dominated] of the possession: the end of the creature's turns passes it by (conditions/lasting.mjs)
  const data = statusEffectData("dominated", null, "", { item, caster: monster, expires: "endOfScene" });
  data.name = L("Bestiary.PossessedName", { name: actorName(monster) });
  Object.assign(data.flags[SYSTEM_ID], { possessedBy: ghost.uuid, renew: 999 });
  const [effect] = await body.createEmbeddedDocuments("ActiveEffect", [data]);
  // Immune to [Dominated] (the Revenant): it doesn't get in
  if (!effect) {
    await postSummary(item.name, [L("Bestiary.PossessResists", { name: actorName(monster), host: actorName(body) })]);
    return { ok: true };
  }
  const away = statusEffectData("absent", null, "", { item, caster: monster, expires: "endOfScene" });
  away.flags[SYSTEM_ID].possessAbsent = true;
  const [absent] = await monster.createEmbeddedDocuments("ActiveEffect", [away]);
  await monster.setFlag(SYSTEM_ID, "possessing", { host: host.uuid, effect: effect.id, absent: absent?.id ?? null });
  await ghost.update({ hidden: true, ...placeOf(host) }, { animate: false, eterniaForced: true });
  await postSummary(item.name, [L("Bestiary.PossessIn", { name: actorName(monster), host: actorName(body) })]);
  return { ok: true };
}

/** The possessed was hurt: the monster inside loses the same HP. */
async function share({ actorUuid, amount, attackerUuid }, user) {
  const body = actorOf(actorUuid);
  const ghost = ghostIn(body);
  if (!ghost || !owns(user, body)) return { ok: false };
  const monster = ghost.actor;
  const n = Math.min(toInt(amount), 9999);
  if ((n <= 0) || down(monster)) return { ok: true };
  // The attacker takes it down, when this does (bestiary/drops.mjs: whoever felled it)
  if (attackerUuid && (n >= toInt(monster.system.health?.value))) await monster.setFlag(SYSTEM_ID, "felledBy", attackerUuid);
  const skill = possessSkill(monster).item;
  await takeDamage(monster, n, { what: skill?.name ?? "", from: body });
  await postSummary(skill?.name ?? actorName(monster), [L("Bestiary.PossessShare", { name: actorName(monster), host: actorName(body) })]);
  return { ok: true };
}

/** Give the statuses of the way out (burned out). Returns their names. */
async function giveStatuses(actor, list, from) {
  const names = [];
  for (const { statusId, value = null } of list ?? []) {
    if (!statusId) continue;
    const rated = !!statusDefinition(statusId)?.rated;
    await actor.createEmbeddedDocuments("ActiveEffect", [statusEffectData(statusId, rated ? (toInt(value) || 1) : null, "", { caster: from ?? actor })]);
    names.push(rated ? `${label(statusId)} ${toInt(value) || 1}` : label(statusId));
  }
  return names;
}

/**
 * The monster comes out: the creature free, the monster no longer [Absent], its token on the nearest free square; burned
 * out, the statuses of the way out.
 * @param {TokenDocument} ghost
 * @param {{reason: string, total?: number, vs?: number}} why   "expel", "escape", "fall" (the creature fell), "ghostFell"
 *   (the monster fell inside), "freed" (the [Dominated] went another way)
 */
async function release(ghost, { reason = "freed", total = 0, vs = 0 } = {}) {
  const monster = ghost?.actor;
  const state = possessingOf(monster);
  if (!state) return;
  await monster.unsetFlag(SYSTEM_ID, "possessing");
  const host = fromUuidSync(state.host);
  const body = host?.actor ?? null;
  const effect = possessionOf(body);
  if (effect) await body.deleteEmbeddedDocuments("ActiveEffect", [effect.id], { eterniaPossess: true }).catch(() => null);
  const away = monster.effects.filter(e => e.getFlag(SYSTEM_ID, "possessAbsent")).map(e => e.id);
  if (away.length) await monster.deleteEmbeddedDocuments("ActiveEffect", away, { eterniaPossess: true }).catch(() => null);
  const spot = (host && freeSquareNear(host, ghost)) || placeOf(host ?? ghost);
  await ghost.update({ hidden: false, ...spot }, { animate: false, eterniaForced: true });
  const skill = possessSkill(monster);
  const names = ((reason === "expel") && !down(monster)) ? await giveStatuses(monster, skill.expelled, body) : [];
  const key = { expel: "PossessExpelled", escape: "PossessEscaped", fall: "PossessHostFell", ghostFell: "PossessGhostFell" }[reason] ?? "PossessFreed";
  const lines = [L(`Bestiary.${key}`, { name: actorName(monster), host: body ? actorName(body) : host?.name ?? "?", total, vs })];
  if (names.length) lines.push(L("Bestiary.PossessStatuses", { name: actorName(monster), statuses: names.join(", ") }));
  await postSummary(skill.item?.name ?? actorName(monster), lines);
}

/** The GM's side of what a window saw: in, the shared HP, out. */
async function onRequest(payload, user) {
  const { action } = payload ?? {};
  if (action === "enter") return enter(payload, user);
  if (action === "share") return share(payload, user);
  if (action === "expel") {
    const body = actorOf(payload.actorUuid);
    const ghost = ghostIn(body);
    if (!ghost || !owns(user, body)) return { ok: false };
    await release(ghost, { reason: payload.reason, total: toInt(payload.total), vs: toInt(payload.vs) });
    return { ok: true };
  }
  // The GM's own hooks (a fall, an effect gone): the monster comes out
  if ((action === "release") && user.isGM) {
    const ghost = fromUuidSync(payload.ghostUuid);
    if (ghost instanceof TokenDocument) await release(ghost, { reason: payload.reason });
    return { ok: true };
  }
  return { ok: false };
}

/* -------------------------------------------- */
/*  What the windows see                        */
/* -------------------------------------------- */

/** A damage card hurt someone (on the window that applied it): the blow that possesses, the shared HP, the way out. */
async function onDamaged(actor, card, { amount = 0, attacker = null, item = null } = {}) {
  if (!rulesOn() || !actor) return;
  if (possessOf(item) && attacker && (attacker.uuid !== actor.uuid) && !possessionOf(actor)) {
    const ghost = tokenOf(attacker);
    const host = ghost ? tokenOf(actor, ghost.parent) : null;
    if (host) await request("bestiaryPossess", { action: "enter", ghostUuid: ghost.uuid, hostUuid: host.uuid, itemUuid: item.uuid });
    return;
  }
  const ghost = ghostIn(actor);
  if (!ghost) return;
  if ((toInt(amount) > 0) && (attacker?.uuid !== ghost.actor.uuid)) {
    await request("bestiaryPossess", { action: "share", actorUuid: actor.uuid, amount: toInt(amount), attackerUuid: attacker?.uuid ?? "" });
  }
  if (expels(ghost.actor, card)) await request("bestiaryPossess", { action: "expel", actorUuid: actor.uuid, reason: "expel" });
}

/** A healing card on the possessed: one of the tags that burn the monster out does it too. */
async function onHealed(actor, card) {
  const ghost = rulesOn() ? ghostIn(actor) : null;
  if (ghost && expels(ghost.actor, card)) await request("bestiaryPossess", { action: "expel", actorUuid: actor.uuid, reason: "expel" });
}

/** The possessed's Main Process ended (on the window that ended it): its Resistance against the monster's. */
async function onProcessEnd(actor) {
  const ghost = rulesOn() ? ghostIn(actor) : null;
  if (!ghost) return;
  const mine = await resistanceRoll(actor);
  const theirs = await resistanceRoll(ghost.actor);
  await mine.roll.toMessage({
    speaker: ChatMessage.getSpeaker({ actor }),
    flavor: L("Bestiary.PossessFlavor", { name: actorName(ghost.actor), vs: theirs.total }) + (mine.text ? ` (${mine.text})` : "")
  });
  // The rule of the Hit Check: the fumbles fail, the criticals win, the monster wins ties and critical against critical
  const success = !mine.fumble && (theirs.fumble || (!theirs.critical && (mine.critical || (mine.total > theirs.total))));
  if (success) {
    await request("bestiaryPossess", { action: "expel", actorUuid: actor.uuid, reason: "escape", total: mine.total, vs: theirs.total });
    return;
  }
  await postSummary(possessSkill(ghost.actor).item?.name ?? actorName(ghost.actor), [L("Bestiary.PossessHolds", {
    name: actorName(ghost.actor), host: actorName(actor), total: mine.total, vs: theirs.total
  })]);
}

/** What possession says against using a skill: the monster inside someone doesn't act. */
export function possessIssues(actor) {
  const state = possessingOf(actor);
  if (!state) return [];
  return [L("Bestiary.PossessInside", { name: actorName(actor), host: fromUuidSync(state.host)?.name ?? "?" })];
}

/** Call during the `init` hook. */
export function registerPossess() {
  registerHandler("bestiaryPossess", (payload, user) => onRequest(payload, user));
  Hooks.on("eternia.damaged", (actor, card, context) => onDamaged(actor, card, context ?? {}).catch(err => console.error(`${SYSTEM_ID} | Possession failed`, err)));
  Hooks.on("eternia.healed", (actor, card) => onHealed(actor, card).catch(err => console.error(`${SYSTEM_ID} | Possession failed`, err)));
  Hooks.on("eternia.processEnd", actor => onProcessEnd(actor).catch(err => console.error(`${SYSTEM_ID} | Possession failed`, err)));
  // On the primary GM: a fall lets the monster out; so does its [Dominated] or [Absent] going any other way
  const out = (ghost, reason) => request("bestiaryPossess", { action: "release", ghostUuid: ghost.uuid, reason });
  Hooks.on("createActiveEffect", effect => {
    const actor = effect.parent;
    if (!(actor instanceof Actor) || !effect.statuses?.has("incapacitated") || !isPrimaryGM()) return;
    const ghost = ghostIn(actor);
    if (ghost) out(ghost, "fall");
    if (possessingOf(actor)) {
      const own = tokenOf(actor);
      if (own) out(own, "ghostFell");
    }
  });
  Hooks.on("deleteActiveEffect", (effect, options) => {
    if (options?.eterniaPossess || !isPrimaryGM()) return;
    const actor = effect.parent;
    const by = effect.getFlag(SYSTEM_ID, "possessedBy");
    const ghost = by ? fromUuidSync(by) : (effect.getFlag(SYSTEM_ID, "possessAbsent") && (actor instanceof Actor) ? tokenOf(actor) : null);
    if ((ghost instanceof TokenDocument) && possessingOf(ghost.actor)) out(ghost, "freed");
  });
  // The monster inside goes where the creature goes
  Hooks.on("updateToken", (token, changes) => {
    if (!isPrimaryGM() || !(("x" in changes) || ("y" in changes))) return;
    for (const other of token.parent?.tokens ?? []) {
      if ((other === token) || (possessingOf(other.actor)?.host !== token.uuid)) continue;
      other.update(placeOf(token), { animate: false, eterniaForced: true }).catch(() => null);
    }
  });
  Hooks.on("deleteToken", token => {
    if (!isPrimaryGM()) return;
    for (const other of token.parent?.tokens ?? []) if (possessingOf(other.actor)?.host === token.uuid) out(other, "freed");
  });
}
