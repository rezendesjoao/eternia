/**
 * Effects that reach the creatures around their bearer: the falls nearby, the Cleanup and the allies in reach.
 * - Eating souls (a Magia's Trait, `flags.eternia.trait.soulEater = { reach, motor, heal }`, the Portão do Inferno):
 *   when a creature falls (Incapacitated) within `reach` squares of the bearer, in a combat, the bearer's class Motor
 *   gains `motor` and it recovers `heal` HP (a formula: "@cr"), once per round.
 * - Harvest (an effect's `flags.eternia.harvest = { value, max, tag }`, the Rito do Rancor dos Mortos): while it lasts,
 *   each enemy of the bearer that falls raises the bearer's [Servant] by `value`, up to `max`, with the tag.
 * - Feeding the source (an effect's `flags.eternia.feedSource = n`, the Casulo das Trevas): in each Cleanup, while the
 *   effect lasts on a creature, the class Motor of whoever gave it gains n (cleanupConditions calls cleanupFeeds).
 * - Cleansing (an effect's `flags.eternia.cleanse = { statuses, reach }`, the Arca Ômega): when it comes to its bearer,
 *   the bearer and its allies within `reach` squares lose those statuses, and the effect ends.
 * A fall is the Incapacitated status coming (damage cards, the conditions' damage, [Doom], an execution): the primary
 * GM does the work. Squares are counted like the attack cards (from the square of each token's center).
 */
import { L, SYSTEM_ID } from "../settings.mjs";
import { isLocalChange, isPrimaryGM } from "../helpers/clients.mjs";
import { actorName, combatOf, postSummary, toInt } from "../helpers/utils.mjs";
import { evaluateFormula, formulaData, isFormula } from "../helpers/effect-formulas.mjs";
import { addToMotor, classMotorId, motorData, motorDef, motorUnit, roundKey } from "../classes/motor.mjs";
import { opposed, sideOn } from "./blows.mjs";
import { takeHealing } from "./damage.mjs";
import { endStatuses } from "./effects.mjs";
import { has, rating, rulesOn, sameActor } from "./rules.mjs";

/** How far a soul is eaten when the Trait doesn't say. */
const SOUL_REACH = 4;

const amountOf = (value, data) => (isFormula(value) ? evaluateFormula(value, data) : toInt(value)) || 0;
const down = actor => !actor || actor.statuses.has("incapacitated") || actor.statuses.has("dead");

/** The document of a uuid, or null (none for an empty one). */
const fromUuidOrNull = uuid => (uuid ? fromUuidSync(uuid) : null);

/** The scene an actor fights in: its combat's, else the viewed one (not whatever scene the GM is looking at). */
const sceneOf = actor => combatOf(actor)?.scene ?? canvas?.scene ?? null;

/** The token (document) an actor stands on in a scene, or null. */
function tokenOf(actor, scene = sceneOf(actor)) {
  if (!actor || !scene) return null;
  if (actor.token && (actor.token.parent === scene)) return actor.token;
  return actor.getDependentTokens?.({ scenes: scene })?.[0] ?? null;
}

/** The grid square of a token's center. */
function squareOf(token) {
  const size = token.parent?.grid?.size || 100;
  return {
    i: Math.floor((token.y + ((token.height * size) / 2)) / size),
    j: Math.floor((token.x + ((token.width * size) / 2)) / size)
  };
}

/** Squares between two tokens of a scene, counted from the square of each center (a diagonal counts as 2), or null. */
function squares(a, b) {
  if (!a || !b || (a.parent !== b.parent) || (a.parent?.grid?.type !== CONST.GRID_TYPES.SQUARE)) return null;
  const p = squareOf(a);
  const q = squareOf(b);
  return Math.abs(p.i - q.i) + Math.abs(p.j - q.j);
}

/** The creatures standing in a scene, each once, with a token. */
function standing(scene) {
  const seen = new Map();
  for (const token of scene?.tokens ?? []) {
    const actor = token.actor;
    if (actor && !seen.has(actor.uuid)) seen.set(actor.uuid, { actor, token });
  }
  return [...seen.values()];
}

/** The class Motor of an actor and a line part for what it gained ("+1 Pressão"), or null without one. */
async function feedMotor(actor, n) {
  const id = classMotorId(actor);
  const def = id ? motorDef(id) : null;
  if (!def || (n <= 0)) return null;
  await addToMotor(actor, id, n);
  return { n, unit: motorUnit(def), value: toInt(motorData(actor, id).value) };
}

/* -------------------------------------------- */
/*  Falls                                       */
/* -------------------------------------------- */

/** The active Trait of an actor that eats souls, or null. */
function soulTrait(actor) {
  for (const effect of actor?.allApplicableEffects?.() ?? []) {
    const eater = effect.active ? effect.getFlag(SYSTEM_ID, "trait")?.soulEater : null;
    if (eater) return { effect, eater };
  }
  return null;
}

/**
 * A creature fell: whoever eats souls within reach eats its soul (once per round), and whoever reaps the fallen
 * enemies this round raises its [Servant].
 * @param {Actor} fallen
 */
async function onFall(fallen) {
  const at = tokenOf(fallen);
  for (const { actor, token } of standing(at?.parent ?? sceneOf(fallen))) {
    if (sameActor(actor, fallen) || down(actor)) continue;
    const soul = soulTrait(actor);
    if (soul) await eatSoul(actor, token, fallen, at, soul).catch(err => console.error(`${SYSTEM_ID} | Soul eating failed`, err));
    for (const effect of actor.effects.filter(e => e.active && e.getFlag(SYSTEM_ID, "harvest"))) {
      await reap(actor, effect, fallen).catch(err => console.error(`${SYSTEM_ID} | Harvest failed`, err));
    }
  }
}

/** The bearer of a Trait that eats souls eats the soul of a creature that fell within reach. */
async function eatSoul(actor, token, fallen, at, { effect, eater }) {
  const key = roundKey(actor);
  if (!key || (actor.getFlag(SYSTEM_ID, "soulEaten") === key)) return;
  const distance = squares(token, at);
  if ((distance === null) || (distance > (toInt(eater.reach) || SOUL_REACH))) return;
  await actor.setFlag(SYSTEM_ID, "soulEaten", key);
  const data = formulaData(actor, effect.parent);
  const motor = await feedMotor(actor, toInt(eater.motor ?? 1));
  const healed = await takeHealing(actor, amountOf(eater.heal ?? 0, data), { what: effect.name, from: fallen, silent: true });
  const lines = [L("Conditions.Souls.Eaten", {
    name: actorName(actor), victim: actorName(fallen), motor: motor ? `+${motor.n} ${motor.unit} (${motor.value})` : "—"
  })];
  if (healed?.line) lines.push(healed.line);
  await postSummary(effect.name, actor.hasPlayerOwner ? lines : [], actor.hasPlayerOwner ? [] : lines);
}

/** An enemy fell while the bearer reaps: its soul joins the bearer's [Servant]. */
async function reap(actor, effect, fallen) {
  if (!opposed(actor, fallen)) return;
  const harvest = effect.getFlag(SYSTEM_ID, "harvest");
  const item = fromUuidOrNull(effect.getFlag(SYSTEM_ID, "source")?.itemUuid);
  const data = formulaData(actor, (item instanceof Item) ? item : null);
  const current = rating(actor, "servant");
  const max = amountOf(harvest.max, data) || Infinity;
  const next = Math.min(current + Math.max(1, amountOf(harvest.value, data)), max);
  if (next <= current) return;
  // Loaded here: chat/status-links.mjs reaches the conditions back through automation/use.mjs.
  const { statusEffectData } = await import("../chat/status-links.mjs");
  const servant = statusEffectData("servant", next, harvest.tag ?? "", { caster: actor, expires: "endOfScene" });
  await actor.createEmbeddedDocuments("ActiveEffect", [servant]);
  await postSummary(effect.name, [L("Conditions.Souls.Harvest", { name: actorName(actor), victim: actorName(fallen), n: next })]);
}

/* -------------------------------------------- */
/*  Cleanup                                     */
/* -------------------------------------------- */

/**
 * The effects on an actor that feed whoever gave them (the Casulo das Trevas): in each Cleanup, the giver's class
 * Motor gains their `feedSource`. Called by conditions/turns.mjs cleanupConditions for everyone in the combat.
 * @param {Actor} actor
 * @returns {Promise<string[]>}   Lines for the Cleanup summary
 */
export async function cleanupFeeds(actor) {
  if (!rulesOn()) return [];
  const lines = [];
  for (const effect of actor.effects) {
    const n = effect.active ? toInt(effect.getFlag(SYSTEM_ID, "feedSource")) : 0;
    if (n <= 0) continue;
    const doc = fromUuidOrNull(effect.getFlag(SYSTEM_ID, "source")?.casterUuid);
    const source = (doc instanceof TokenDocument) ? doc.actor : doc;
    if (!(source instanceof Actor) || sameActor(source, actor) || down(source) || !roundKey(source)) continue;
    const motor = await feedMotor(source, n);
    if (motor) lines.push(L("Conditions.Souls.Fed", { what: effect.name, name: actorName(source), motor: `+${motor.n} ${motor.unit} (${motor.value})`, from: actorName(actor) }));
  }
  return lines;
}

/* -------------------------------------------- */
/*  Cleansing                                   */
/* -------------------------------------------- */

/** An effect that cleanses came to its bearer: the bearer and its allies within reach lose the statuses. */
async function cleanse(effect) {
  const bearer = effect.parent;
  const data = effect.getFlag(SYSTEM_ID, "cleanse");
  const statuses = [].concat(data?.statuses ?? []);
  const from = tokenOf(bearer);
  const reach = toInt(data?.reach);
  const lines = [];
  const near = standing(from?.parent ?? sceneOf(bearer)).filter(({ actor, token }) => !sameActor(actor, bearer) && (sideOn(actor) === sideOn(bearer))
    && (squares(from, token) !== null) && (squares(from, token) <= reach)).map(e => e.actor);
  for (const actor of [bearer, ...near]) {
    const ids = statuses.filter(id => has(actor, id));
    if (!ids.length) continue;
    const line = await endStatuses(actor, ids, bearer);
    if (line) lines.push(line);
  }
  if (bearer.effects.has(effect.id)) await bearer.deleteEmbeddedDocuments("ActiveEffect", [effect.id]).catch(() => null);
  if (lines.length) await postSummary(effect.name, lines);
}

/** Call during the `init` hook. */
export function registerSouls() {
  Hooks.on("createActiveEffect", (effect, options, userId) => {
    const actor = effect.parent;
    if (!rulesOn() || !(actor instanceof Actor)) return;
    if (effect.statuses?.has("incapacitated") && isPrimaryGM()) onFall(actor).catch(err => console.error(`${SYSTEM_ID} | Fall failed`, err));
    if (effect.getFlag(SYSTEM_ID, "cleanse") && isLocalChange(options, userId)) cleanse(effect).catch(err => console.error(`${SYSTEM_ID} | Cleansing failed`, err));
  });
}
