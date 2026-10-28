/**
 * Engulfing (a monster rule, docs/bestiario.md): a monster whose attack carries `flags.eternia.monster = { rule:
 * "engulf", acid, tag, escape, max, through, statuses, notMetal }` swallows whoever its damage card reaches (the
 * Gelatinous Cube going over whoever stands in the corridor, the Shambling Mound). With `notMetal`, it won't swallow
 * whoever wears metal (an armor or shield of metal, bestiary/rust.mjs: the Well-Mouth Toad spits it out).
 * - Swallowed: when the blow takes HP or Barrier from a creature no bigger than the monster (while it holds fewer than
 *   `max`; 0: no limit), the creature is [Grappled] by it, in an effect with `flags.eternia.engulfed = { by, item }` (the
 *   monster's token, the skill) and `flags.eternia.escape = escape` (`{ check, dc }`, conditions/escape.mjs); the
 *   `statuses` (`[{ statusId, value }]`) come too and end with the [Grappled]. Its token goes into the monster's squares
 *   and moves with it.
 * - In each Setup Process of the monster's combat, whoever is inside takes `acid` (a formula: "2d6+10") as direct
 *   damage, through [Barrier] ([Cancel] of the tag `tag`).
 * - Getting out: the Livrar-se of that [Grappled] (a Major Action) rolls the `escape` check (a character's Athletics,
 *   the Strength test) against its `dc`; only a success ends it. It also ends when the monster falls (the [Grappled]
 *   ends with its source) and with the scene. Out, the token steps to the nearest free square around the monster.
 * - A blow that hurts the monster (one that isn't an area: an area reaches whoever is inside by itself) hits one of
 *   those inside too, when a 1d6 gives `through` (2) or less: the HP the monster lost, as direct damage (0: never).
 * The swallowing runs on the window that applied the damage card; the rest, on the GM's.
 */
import { L, SYSTEM_ID } from "../settings.mjs";
import { isLocalChange } from "../helpers/clients.mjs";
import { actorName, postSummary, toInt, wrap } from "../helpers/utils.mjs";
import { giveEffects, statusEffectData } from "../chat/status-links.mjs";
import { isAreaAttack, takeDamage } from "../conditions/damage.mjs";
import { rulesOn, sameActor } from "../conditions/rules.mjs";
import { wornMetal } from "./rust.mjs";

/** The test to get out when the rule doesn't say: Athletics against 10. */
const ESCAPE = { check: "athletics", dc: 10 };

/** The engulf rule of a skill, or null. */
export function engulfRule(item) {
  const rule = item?.getFlag?.(SYSTEM_ID, "monster");
  return (rule?.rule === "engulf") ? rule : null;
}

/** An actor's skill that engulfs, or null. */
const engulfSkill = actor => (actor?.items ?? []).find(i => (i.type === "skill") && engulfRule(i)) ?? null;

/** The effect that keeps an actor inside a monster (its [Grappled]), or null. */
export const engulfedEffect = actor => [...(actor?.effects ?? [])].find(e => e.getFlag(SYSTEM_ID, "engulfed") && e.statuses?.has("grappled")) ?? null;

/** The token of an actor: a token actor's own, else its first active one (the viewed scene first). */
function tokenOf(actor) {
  if (actor?.token) return actor.token;
  const tokens = actor?.getActiveTokens?.(false, true) ?? [];
  return tokens.find(t => t.parent === canvas?.scene) ?? tokens[0] ?? null;
}

/** Where a token stands: its source position (TokenDocument#x keeps the old place while a move animates). */
const placeOf = token => ({ x: token._source?.x ?? token.x, y: token._source?.y ?? token.y });

/**
 * The tokens inside a monster: those of its scene whose actor it holds.
 * @param {TokenDocument} token   The monster's
 * @returns {TokenDocument[]}
 */
export function insideOf(token) {
  if (!token?.parent) return [];
  return token.parent.tokens.filter(t => (t !== token) && (engulfedEffect(t.actor)?.getFlag(SYSTEM_ID, "engulfed")?.by === token.uuid));
}

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

/** A place inside the monster for one more: the first of its squares no one inside stands on (else its first). */
function placeInside(monster, victim, inside) {
  const size = monster.parent.grid.size;
  const at = placeOf(monster);
  const taken = new Set(inside.map(t => `${placeOf(t).x},${placeOf(t).y}`));
  const across = Math.max(1, Math.max(1, toInt(monster.width)) - Math.max(1, toInt(victim.width)) + 1);
  const down = Math.max(1, Math.max(1, toInt(monster.height)) - Math.max(1, toInt(victim.height)) + 1);
  for (let j = 0; j < down; j++) {
    for (let i = 0; i < across; i++) {
      const spot = { x: at.x + (i * size), y: at.y + (j * size) };
      if (!taken.has(`${spot.x},${spot.y}`)) return spot;
    }
  }
  return at;
}

/** The nearest free square around a monster, ring by ring (where one who gets out steps), or null. */
function placeOutside(monster, leaving) {
  const scene = monster.parent;
  const size = scene.grid.size;
  const at = placeOf(monster);
  const w = Math.max(1, toInt(monster.width)), h = Math.max(1, toInt(monster.height));
  const taken = new Set(scene.tokens.filter(t => !t.hidden && (t !== leaving)).flatMap(squaresOf));
  const rect = scene.dimensions?.sceneRect ?? { x: 0, y: 0, width: scene.width, height: scene.height };
  for (let r = 1; r <= 4; r++) {
    for (let j = -r; j < h + r; j++) {
      for (let i = -r; i < w + r; i++) {
        // Only the ring r squares away from the monster's edges
        if ((i > -r) && (i < w + r - 1) && (j > -r) && (j < h + r - 1)) continue;
        const spot = { x: at.x + (i * size), y: at.y + (j * size) };
        const inScene = (spot.x >= rect.x) && (spot.y >= rect.y) && (spot.x + size <= rect.x + rect.width) && (spot.y + size <= rect.y + rect.height);
        if (inScene && !taken.has(`${spot.x},${spot.y}`)) return spot;
      }
    }
  }
  return null;
}

/* -------------------------------------------- */
/*  Swallowing and letting go                   */
/* -------------------------------------------- */

/**
 * A monster swallows a creature: [Grappled] by it (with the test to get out) and its token inside it.
 * @param {TokenDocument} monster
 * @param {TokenDocument} victim
 * @param {Item} [item]   The skill that swallows (its rule), else the monster's
 * @returns {Promise<boolean>}   Whether it was swallowed
 */
export async function engulf(monster, victim, item = engulfSkill(monster?.actor)) {
  const rule = engulfRule(item) ?? {};
  const actor = victim?.actor;
  if (!actor || !monster?.actor || (victim === monster) || (victim.parent !== monster.parent)) return false;
  if (actor.statuses.has("dead") || engulfedEffect(actor)) return false;
  // No bigger than the monster, and while it has room
  if ((toInt(victim.width) > toInt(monster.width)) || (toInt(victim.height) > toInt(monster.height))) return false;
  const inside = insideOf(monster);
  if ((toInt(rule.max) > 0) && (inside.length >= toInt(rule.max))) return false;
  // It spits out the taste of metal
  if (rule.notMetal && wornMetal(actor)) return false;
  const mark = { engulfed: { by: monster.uuid, item: item?.uuid ?? "" } };
  const held = statusEffectData("grappled", null, "", { caster: monster.actor, expires: "endOfScene" });
  Object.assign(held.flags[SYSTEM_ID], mark, { escape: { ...ESCAPE, ...(rule.escape ?? {}) } });
  // The other statuses of being inside last while it does (not ended by their own rule)
  const more = (rule.statuses ?? []).filter(s => s?.statusId).map(s => {
    const effect = statusEffectData(s.statusId, s.value ?? null, "", { caster: monster.actor, expires: "endOfScene" });
    Object.assign(effect.flags[SYSTEM_ID], mark, { endsWith: "grappled", infinite: true });
    return effect;
  });
  if (!(await giveEffects(actor, [held, ...more]))) return false;
  const spot = placeInside(monster, victim, inside);
  if (victim.isOwner) await victim.update({ x: spot.x, y: spot.y, elevation: monster._source.elevation }, { eterniaForced: true });
  await postSummary(item?.name ?? actorName(monster.actor), [L("Bestiary.Engulf.Swallowed", { name: actorName(actor), by: actorName(monster.actor) })]);
  return true;
}

/**
 * Let a creature out of whatever holds it inside (a macro): its [Grappled] ends, and it steps out.
 * @param {TokenDocument} victim
 */
export async function release(victim) {
  const effect = engulfedEffect(victim?.actor);
  if (effect) await victim.actor.deleteEmbeddedDocuments("ActiveEffect", [effect.id]);
}

/**
 * The [Grappled] that held a creature inside went (on the window that ended it): its token steps out of the monster
 * (the other statuses of being inside end with it: `endsWith`).
 */
async function onDeleteEffect(effect, options, userId) {
  const engulfed = effect.getFlag(SYSTEM_ID, "engulfed");
  const actor = effect.parent;
  if (!engulfed || !effect.statuses?.has("grappled") || !(actor instanceof Actor) || !isLocalChange(options, userId)) return;
  const monster = fromUuidSync(engulfed.by);
  const victim = monster?.parent ? monster.parent.tokens.find(t => sameActor(t.actor, actor)) : null;
  if (!victim?.isOwner || !squaresOf(victim).some(s => squaresOf(monster).includes(s))) return;
  const spot = placeOutside(monster, victim);
  if (spot) await victim.update({ x: spot.x, y: spot.y }, { eterniaForced: true });
}

/* -------------------------------------------- */
/*  The hooks                                   */
/* -------------------------------------------- */

/**
 * A damage card was applied (on the window that applied it): the blow of a skill that swallows, and the blows on a
 * monster with someone inside.
 */
async function onDamaged(actor, card, { amount = 0, absorbed = 0, attacker = null, item = null } = {}) {
  if (!rulesOn() || card?.recovery || !actor?.isOwner) return;
  const reached = (toInt(amount) > 0) || (toInt(absorbed) > 0);
  if (engulfRule(item) && attacker && !sameActor(attacker, actor) && reached) {
    const monster = tokenOf(attacker);
    const victim = tokenOf(actor);
    if (monster && victim) await engulf(monster, victim, item);
    return;
  }
  // The blow goes through the monster and hits one inside
  if ((toInt(amount) <= 0) || !attacker || sameActor(attacker, actor) || isAreaAttack(item)) return;
  const rule = engulfRule(engulfSkill(actor));
  const token = rule ? tokenOf(actor) : null;
  const inside = token ? insideOf(token).filter(t => !sameActor(t.actor, attacker)) : [];
  const faces = (rule?.through === undefined) ? 2 : toInt(rule.through);
  if (!inside.length || (faces <= 0)) return;
  const roll = await new Roll("1d6").evaluate();
  if (roll.total > faces) return;
  const victim = inside[Math.floor(Math.random() * inside.length)];
  const hurt = await takeDamage(victim.actor, toInt(amount), { what: card.skillName, from: attacker, silent: true });
  await postSummary(card.skillName, [L("Bestiary.Engulf.Through", { name: actorName(victim.actor), by: actorName(actor), n: roll.total }), hurt?.line].filter(Boolean));
}

/** A monster with someone inside moved (on the window that moved it): they move with it. */
async function onUpdateToken(token, changes, options, userId) {
  if (!(("x" in changes) || ("y" in changes)) || !isLocalChange(options, userId) || !options.eterniaEngulfFrom) return;
  const from = options.eterniaEngulfFrom;
  const to = placeOf(token);
  const dx = to.x - from.x, dy = to.y - from.y;
  if (!dx && !dy) return;
  const updates = insideOf(token).map(t => ({ _id: t.id, x: placeOf(t).x + dx, y: placeOf(t).y + dy, elevation: token._source.elevation }));
  if (updates.length) await token.parent.updateEmbeddedDocuments("Token", updates, { eterniaForced: true });
}

/** The Setup Process of a combat: whoever is inside its monsters takes their acid. */
async function setupAcid(combat) {
  const seen = new Set();
  for (const combatant of combat.combatants) {
    const token = combatant.token;
    const actor = combatant.actor;
    if (!token || !actor || combatant.isDefeated || seen.has(token.uuid) || actor.statuses.has("incapacitated") || actor.statuses.has("dead")) continue;
    seen.add(token.uuid);
    const item = engulfSkill(actor);
    const rule = engulfRule(item);
    if (!rule?.acid) continue;
    for (const victim of insideOf(token)) {
      const roll = await new Roll(String(rule.acid).replace(/×/g, "*"), actor.getRollData?.() ?? {}).evaluate();
      await takeDamage(victim.actor, roll.total, { what: item.name, from: actor, tag: rule.tag ?? "" });
    }
  }
}

/** Call during the `init` hook. */
export function registerEngulf() {
  Hooks.on("eternia.damaged", (actor, card, context) => onDamaged(actor, card, context ?? {}).catch(err => console.error(`${SYSTEM_ID} | Engulf failed`, err)));
  Hooks.on("preUpdateToken", (token, changes, options) => {
    if ((("x" in changes) || ("y" in changes)) && insideOf(token).length) options.eterniaEngulfFrom = placeOf(token);
  });
  Hooks.on("updateToken", (...args) => onUpdateToken(...args).catch(err => console.error(`${SYSTEM_ID} | Engulf move failed`, err)));
  Hooks.on("deleteActiveEffect", (...args) => onDeleteEffect(...args).catch(err => console.error(`${SYSTEM_ID} | Engulf release failed`, err)));
  // A monster that leaves the scene lets go of whoever it holds
  Hooks.on("deleteToken", (token, options, userId) => {
    if (!isLocalChange(options, userId)) return;
    for (const t of token.parent?.tokens ?? []) {
      if (engulfedEffect(t.actor)?.getFlag(SYSTEM_ID, "engulfed")?.by === token.uuid) release(t).catch(() => null);
    }
  });
  wrap(CONFIG.Combat.documentClass.prototype, "_onPhaseStart", async function (original, phase, round, previous) {
    await original.call(this, phase, round, previous);
    const backwards = !!previous && (round < previous.round);
    if ((phase === "setup") && !backwards && rulesOn()) await setupAcid(this).catch(err => console.error(`${SYSTEM_ID} | Engulf acid failed`, err));
  });
}
