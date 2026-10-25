/**
 * The lure (Atrair, a monster rule, docs/bestiario.md): a monster with a skill that carries `flags.eternia.monster = {
 * rule: "lure" }` (the Harpy's voice) draws whoever it charms: every [Charmed] whose source it is becomes a lure.
 * - When the charmed one's Main Process starts, in a combat, it spends its Move Action and walks its Speed toward the
 *   monster, square by square (a forced move: it stops at a wall, at the edge of the scene, or on the monster's square).
 *   Without the Move Action ([Slowed], or spent) or with Speed 0 (held: [Rooted], [Grappled]…), it stays.
 * - Any damage ends it, from anyone (a damage card that takes HP or [Barrier], the damage of a condition): an ally wakes
 *   it up with a blow. It ends too when the monster falls, and as every [Charmed] does (a Major Action).
 * The walk and the fall run on the primary GM; the damage, on the window that dealt it (the actor's owner there).
 */
import { L, SYSTEM_ID } from "../settings.mjs";
import { isLocalChange, isPrimaryGM } from "../helpers/clients.mjs";
import { actorName, postSummary, toInt } from "../helpers/utils.mjs";
import { actionsLeft, spendAction } from "../automation/use.mjs";
import { NO_MOVEMENT } from "../conditions/catalog.mjs";
import { has, rulesOn, sameActor, statusEffects } from "../conditions/rules.mjs";

const down = actor => !actor || actor.statuses.has("incapacitated") || actor.statuses.has("dead");

/** Whether an actor lures: one of its skills carries the rule. */
const lures = actor => (actor?.items ?? []).some(i => (i.type === "skill") && (i.getFlag(SYSTEM_ID, "monster")?.rule === "lure"));

/** The source of a status effect (its caster), or null. */
function sourceOf(effect) {
  const uuid = effect.getFlag(SYSTEM_ID, "source")?.casterUuid;
  const caster = uuid ? fromUuidSync(uuid) : null;
  const actor = (caster instanceof TokenDocument) ? caster.actor : caster;
  return (actor instanceof Actor) ? actor : null;
}

/** The [Charmed] of an actor that lure it, with the monster each comes from. */
export function luresOn(actor) {
  return statusEffects(actor, "charmed").map(effect => ({ effect, source: sourceOf(effect) })).filter(e => lures(e.source));
}

/** The lures being ended on this window (a blow is seen by two hooks: the damage card's and the HP's). */
const ending = new Set();

/** End some lures (their [Charmed] effects), with a line. */
async function endLures(actor, list, key) {
  const ids = list.map(e => e.effect.id).filter(id => actor.effects.has(id) && !ending.has(id));
  if (!ids.length) return;
  for (const id of ids) ending.add(id);
  await actor.deleteEmbeddedDocuments("ActiveEffect", ids).catch(() => null);
  for (const id of ids) ending.delete(id);
  const source = list[0].source;
  await postSummary(game.i18n.localize("ETERNIA.StatusEffect.charmed"), [L(key, { name: actorName(actor), monster: source ? actorName(source) : "?" })]);
}

/* -------------------------------------------- */
/*  The walk                                    */
/* -------------------------------------------- */

/** The token of an actor on a scene (a token actor's own, else its first one there), or null. */
function tokenOn(actor, scene) {
  if (actor?.token) return (!scene || (actor.token.parent === scene)) ? actor.token : null;
  return actor?.getActiveTokens?.(false, true).find(t => !scene || (t.parent === scene)) ?? null;
}

/** An actor's Speed (squares a Move Action walks). */
function speedOf(actor) {
  const speed = actor.system["battle-status"]?.speed;
  return Math.max(0, toInt((speed && (typeof speed === "object")) ? (speed.total ?? speed.value) : speed));
}

/**
 * Where a token ends walking toward another: square by square along the axis it is farther on (counted like the attack
 * cards), up to `steps` squares, stopping on the other's squares, at a wall or at the edge of the scene.
 * @returns {{x: number, y: number, walked: number}}
 */
function walkToward(token, goal, steps) {
  const scene = token.parent;
  const size = scene.grid.size;
  const rect = scene.dimensions?.sceneRect ?? { x: 0, y: 0, width: scene.width, height: scene.height };
  const g = { x0: Math.round(goal._source.x / size), y0: Math.round(goal._source.y / size) };
  g.x1 = g.x0 + Math.max(1, toInt(goal.width)) - 1;
  g.y1 = g.y0 + Math.max(1, toInt(goal.height)) - 1;
  let x = token._source.x, y = token._source.y, walked = 0;
  const half = { x: (token.width * size) / 2, y: (token.height * size) / 2 };
  while (walked < steps) {
    const i = Math.round(x / size), j = Math.round(y / size);
    // Already on one of the monster's squares: engaged with it
    const dx = (i < g.x0) ? (g.x0 - i) : ((i > g.x1) ? (g.x1 - i) : 0);
    const dy = (j < g.y0) ? (g.y0 - j) : ((j > g.y1) ? (g.y1 - j) : 0);
    if (!dx && !dy) break;
    const alongX = Math.abs(dx) >= Math.abs(dy);
    const nx = x + (alongX ? Math.sign(dx) * size : 0);
    const ny = y + (alongX ? 0 : Math.sign(dy) * size);
    if ((nx < rect.x) || (ny < rect.y) || (nx + (token.width * size) > rect.x + rect.width) || (ny + (token.height * size) > rect.y + rect.height)) break;
    // A wall in the way (only when the scene is on show here)
    let blocked = false;
    try {
      blocked = !!token.object?.checkCollision?.({ x: nx + half.x, y: ny + half.y }, { origin: { x: x + half.x, y: y + half.y } });
    }
    catch {
      blocked = false;
    }
    if (blocked) break;
    x = nx;
    y = ny;
    walked++;
  }
  return { x, y, walked };
}

/** A Main Process starts (the primary GM): a lured creature spends its Move Action and walks toward the monster. */
async function onProcessStart(combatant) {
  const actor = combatant?.actor;
  const token = combatant?.token;
  if (!actor || !token || down(actor)) return;
  const lured = luresOn(actor);
  if (!lured.length) return;
  // The monster that fell lets go
  const gone = lured.filter(e => down(e.source) || !tokenOn(e.source, token.parent));
  if (gone.length) await endLures(actor, gone, "Lure.SourceGone");
  const lure = lured.find(e => !gone.includes(e));
  if (!lure) return;
  const goal = tokenOn(lure.source, token.parent);
  const name = actorName(actor);
  const monster = actorName(lure.source);
  // Held, or without the Move Action: the song pulls, the legs don't follow
  const held = NO_MOVEMENT.filter(id => has(actor, id));
  const left = actionsLeft(actor);
  const speed = speedOf(actor);
  if (held.length || (speed <= 0) || (left && !left.move)) {
    const why = held.length ? held.map(id => game.i18n.localize(`ETERNIA.StatusEffect.${id}`)).join(", ") : L("Lure.NoMove");
    return postSummary(lure.effect.name, [L("Lure.Stays", { name, monster, why })]);
  }
  // Already engaged with the monster (or a wall in the way): nothing to walk
  const to = walkToward(token, goal, speed);
  if (!to.walked) return;
  if (left) await spendAction(actor, "move");
  // Not the creature's own choice: a forced move (what keeps a token in place was checked above)
  await token.update({ x: to.x, y: to.y }, { eterniaForced: true });
  await postSummary(lure.effect.name, [L("Lure.Walks", { name, monster, n: to.walked })]);
}

/* -------------------------------------------- */
/*  What ends it                                */
/* -------------------------------------------- */

/** A damage card took HP or [Barrier] (on the window that applied it): the lures of the one it hurt end. */
function onDamaged(actor, card, { amount = 0, absorbed = 0 } = {}) {
  if (!rulesOn() || !actor?.isOwner || ((toInt(amount) <= 0) && (toInt(absorbed) <= 0))) return;
  // The ones there now: the [Charmed] this very blow gives comes after it
  const lured = luresOn(actor);
  if (lured.length) endLures(actor, lured, "Lure.Woke").catch(err => console.error(`${SYSTEM_ID} | Lure failed`, err));
}

/** The HP before an update, to see a loss that no damage card made (a condition's damage). */
function onPreUpdateActor(actor, changes, options) {
  if (foundry.utils.hasProperty(changes, "system.health.value")) options.eterniaLureHp = toInt(actor._source.system?.health?.value);
}

/** The HP went down (on the window that changed them): the lures of the actor end. */
function onUpdateActor(actor, changes, options, userId) {
  if (!rulesOn() || !isLocalChange(options, userId) || (options.eterniaLureHp === undefined)) return;
  if (toInt(actor.system.health?.value) >= options.eterniaLureHp) return;
  const lured = luresOn(actor);
  if (lured.length) endLures(actor, lured, "Lure.Woke").catch(err => console.error(`${SYSTEM_ID} | Lure failed`, err));
}

/** A monster that lures fell (the primary GM): whoever it charmed is free. */
async function onFall(source) {
  if (!lures(source)) return;
  const actors = new Set(game.actors);
  for (const scene of game.scenes) for (const token of scene.tokens) if (!token.actorLink && token.actor) actors.add(token.actor);
  for (const actor of actors) {
    const lured = luresOn(actor).filter(e => sameActor(e.source, source));
    if (lured.length) await endLures(actor, lured, "Lure.SourceGone");
  }
}

/** Call during the `init` hook. */
export function registerLure() {
  Hooks.on("updateCombat", (combat, changes) => {
    if (!rulesOn() || !isPrimaryGM()) return;
    const active = foundry.utils.getProperty(changes, "flags.eternia.active");
    if (!active || (combat.phase !== "main")) return;
    onProcessStart(combat.combatants.get(active)).catch(err => console.error(`${SYSTEM_ID} | Lure failed`, err));
  });
  Hooks.on("eternia.damaged", onDamaged);
  Hooks.on("preUpdateActor", onPreUpdateActor);
  Hooks.on("updateActor", onUpdateActor);
  Hooks.on("createActiveEffect", effect => {
    const actor = effect.parent;
    if (!(actor instanceof Actor) || !(effect.statuses?.has("incapacitated") || effect.statuses?.has("dead")) || !isPrimaryGM()) return;
    onFall(actor).catch(err => console.error(`${SYSTEM_ID} | Lure failed`, err));
  });
}
