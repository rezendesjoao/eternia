/**
 * Transformations (the Sangue Demoníaco and the Forma Indura, docs/condicoes.md).
 *
 * - A Trait with `transform = { at, statuses: [{ statusId, value }] }`: the `at`-th spell of its Magia that its bearer
 *   uses in a scene transforms it, once per scene: the statuses come until the end of the scene (their values are
 *   formulas of the bearer: "floor(@cr/2)+2"). A spell with `transformNow` transforms it at once (and counts). The count
 *   lives in flags.eternia.spellCount.<magia> = { key, n, done }, key = "scene.<n>" (the actor's scenes, as the usage
 *   limits count them: automation/scenes.mjs).
 * - An effect with `fallOnEnd`: when it ends, its bearer falls (0 HP and Incapacitated). When it ends with the scene,
 *   the end of the scene doesn't lift the bearer (automation/scenes.mjs asks fallAtSceneEnd before its own recovery):
 *   a heal does, or the end of the next scene.
 * - The hearts (the Forma Indura's Seven Hearts are an Extra Breath, `revive`, of its Trait: conditions/damage.mjs):
 *   an effect with `reviveStatus = { statusId, per }` gives its bearer that status each time an Extra Breath of the
 *   same item is spent (the hook `eternia.revived`), its Rating the uses spent in the scene times `per` (the Tabu:
 *   [Berserk] growing with each heart lost); an effect with `surrender = { statusId, value }`, when it comes, spends
 *   the uses left of the Extra Breaths of its spell's Magia and gives that status (a count: it adds), `value` (a
 *   formula of the caster) + the uses given up (the Transformação Indura: [Impetus]).
 */
import { L, SYSTEM_ID, setting } from "../settings.mjs";
import { isLocalChange } from "../helpers/clients.mjs";
import { evaluateFormula, formulaData, isFormula } from "../helpers/effect-formulas.mjs";
import { itemMagia, traitsFor } from "../helpers/magic-traits.mjs";
import { actorName, combatActors, postSummary, toInt } from "../helpers/utils.mjs";
import { extraBreaths, giveUpBreaths } from "./damage.mjs";
import { addStatus, rulesOn } from "./rules.mjs";

const label = id => game.i18n.localize(`ETERNIA.StatusEffect.${id}`);
const flag = (doc, key) => doc?.getFlag?.(SYSTEM_ID, key) ?? doc?.flags?.[SYSTEM_ID]?.[key];

/**
 * The actors falling now, or whose `fallOnEnd` effects end with a combat being deleted (the end of the scene makes them
 * fall): the end of such an effect doesn't make them fall a second time.
 */
const FALLING = new Set();

/* -------------------------------------------- */
/*  The spells of a scene                       */
/* -------------------------------------------- */

/** The key of the actor's current scene, as the usage limits count it. */
const sceneKey = actor => `scene.${toInt(actor.getFlag(SYSTEM_ID, "scene"))}`;

/**
 * A spell was used: it counts for the Traits of its Magia that transform at the n-th spell of the scene, and a spell
 * with `transformNow` transforms at once. Called by conditions/turns.mjs afterAction, on the user's window.
 * @param {Actor} actor
 * @param {Item} item
 */
export async function countSpell(actor, item) {
  if (!rulesOn() || !actor?.isOwner || !flag(item, "magicSpell")) return;
  const magia = itemMagia(item);
  const trait = traitsFor(actor, item).find(e => flag(e, "trait")?.transform);
  if (!magia || !trait) return;
  const rule = flag(trait, "trait").transform;
  const key = sceneKey(actor);
  const saved = actor.getFlag(SYSTEM_ID, "spellCount")?.[magia];
  const count = (saved?.key === key) ? { ...saved } : { key, n: 0, done: false };
  count.n += 1;
  const now = !count.done && (!!flag(item, "transformNow") || (count.n >= Math.max(1, toInt(rule.at))));
  if (now) count.done = true;
  await actor.setFlag(SYSTEM_ID, `spellCount.${magia}`, count);
  if (now) await transform(actor, trait, rule);
}

/** The spells of a Magia the actor used in the current scene. */
export function spellsThisScene(actor, magia) {
  const saved = actor?.getFlag(SYSTEM_ID, "spellCount")?.[magia];
  return (saved?.key === sceneKey(actor)) ? toInt(saved.n) : 0;
}

/** The Trait's transformation: its statuses until the end of the scene, with a line in the chat. */
async function transform(actor, trait, rule) {
  const data = formulaData(actor, trait.parent);
  const parts = [];
  for (const s of rule.statuses ?? []) {
    if (!s?.statusId) continue;
    const value = isFormula(s.value) ? Math.max(1, evaluateFormula(s.value, data) ?? 1) : (toInt(s.value) || null);
    await game.eternia.applyStatus(actor, s.statusId, { value, from: actor, expires: "endOfScene" });
    parts.push(value ? `${label(s.statusId)} ${value}` : label(s.statusId));
  }
  await postSummary(trait.name, [L("Conditions.Transform", { name: actorName(actor), statuses: parts.join(", ") })]);
}

/* -------------------------------------------- */
/*  The hearts                                  */
/* -------------------------------------------- */

/** The Magia of an item ("forma-indura": the Magia skill or one of its spells), or null. */
const magiaOfItem = item => ((item instanceof Item) ? itemMagia(item) : null);

/**
 * An Extra Breath was spent (conditions/damage.mjs, on the window that applied the damage): each effect with
 * `reviveStatus` gives its status, its Rating the uses spent this scene of the Extra Breaths of its own item (the
 * hearts of the same Magia) times `per`.
 * @param {Actor} actor
 */
async function onRevived(actor) {
  if (!rulesOn() || !actor?.isOwner) return;
  const givers = [...(actor.allApplicableEffects?.() ?? [])].filter(e => e.active && flag(e, "reviveStatus")?.statusId);
  if (!givers.length) return;
  const breaths = extraBreaths(actor);
  const lines = [];
  for (const giver of givers) {
    const source = (giver.parent instanceof Item) ? giver.parent : null;
    const lost = breaths.filter(b => !source || (b.effect.parent?.id === source.id)).reduce((n, b) => n + (b.uses - b.left), 0);
    if (lost <= 0) continue;
    const { statusId, per = 1 } = flag(giver, "reviveStatus");
    const value = lost * Math.max(1, toInt(per));
    await game.eternia.applyStatus(actor, statusId, { value, from: actor });
    lines.push(L("Conditions.ReviveStatus", { name: actorName(actor), n: lost, status: label(statusId), value }));
  }
  if (lines.length) await postSummary(givers[0].name, lines);
}

/**
 * An effect with `surrender` comes: the Extra Breaths of its spell's Magia give up the uses they have left (spent until
 * the end of the scene), and the status comes, `value` + the uses given up.
 * @param {ActiveEffect} effect
 */
async function surrender(effect) {
  const actor = effect.parent;
  const rule = flag(effect, "surrender");
  const uuid = flag(effect, "source")?.itemUuid;
  const spell = uuid ? fromUuidSync(uuid) : null;
  const magia = magiaOfItem(spell);
  const breaths = extraBreaths(actor).filter(b => (b.left > 0) && (!magia || (magiaOfItem(b.effect.parent) === magia)));
  let given = 0;
  for (const b of breaths) given += await giveUpBreaths(actor, Infinity, { effect: b.effect });
  const base = isFormula(rule.value) ? (evaluateFormula(rule.value, formulaData(actor, spell)) ?? 0) : toInt(rule.value);
  const value = Math.max(1, base + given);
  await addStatus(actor, rule.statusId, value);
  await postSummary(effect.name, [L("Conditions.Surrender", { name: actorName(actor), n: given, status: label(rule.statusId), value })]);
}

/** An effect comes: a surrender gives up the hearts left. */
async function onCreateEffect(effect, options, userId) {
  if (!isLocalChange(options, userId) || !rulesOn() || !(effect.parent instanceof Actor) || !flag(effect, "surrender")?.statusId) return;
  await surrender(effect);
}

/* -------------------------------------------- */
/*  Falling when it ends                        */
/* -------------------------------------------- */

/**
 * The bearer falls: Incapacitated and 0 HP, with a line in the chat. Incapacitated first: an HP drop alone would have
 * automation/round.mjs toggle it too, at the same time (a second effect with the same id).
 */
async function fall(actor, name) {
  if (actor.statuses.has("dead")) return;
  if (!actor.statuses.has("incapacitated")) await actor.toggleStatusEffect("incapacitated", { active: true }).catch(() => null);
  if (toInt(actor.system.health?.value) > 0) await actor.update({ "system.health.value": 0 });
  await postSummary(name, [L("Conditions.Falls", { name: actorName(actor), effect: name })]);
}

/**
 * The end of a scene for one actor (automation/scenes.mjs endOfSceneFor, before its own recovery): a `fallOnEnd`
 * effect that ends with it makes the actor fall. Returns whether it fell (the end of the scene then doesn't lift it).
 * @param {Actor} actor
 * @returns {Promise<boolean>}
 */
export async function fallAtSceneEnd(actor) {
  if (!rulesOn() || !actor) return false;
  const effects = actor.effects.filter(e => flag(e, "fallOnEnd"));
  if (!effects.length && !FALLING.has(actor.uuid)) return false;
  // Marked until it has fallen: the effect ended by the expiries at the same time doesn't make it fall twice
  FALLING.add(actor.uuid);
  try {
    if (effects.length) await actor.deleteEmbeddedDocuments("ActiveEffect", effects.map(e => e.id), { eterniaFall: true }).catch(() => null);
    await fall(actor, effects[0]?.name ?? L("Conditions.Transformation"));
  }
  finally {
    FALLING.delete(actor.uuid);
  }
  return true;
}

/**
 * A started combat is about to be deleted (the end of the scene, when the setting ends it): its actors with `fallOnEnd`
 * effects fall with it, after the effects end.
 */
function onPreDeleteCombat(combat) {
  if (!rulesOn() || !combat.started || !setting("endOfScene")) return;
  for (const actor of combatActors(combat)) {
    if (actor.effects.some(e => flag(e, "fallOnEnd"))) FALLING.add(actor.uuid);
  }
}

/** A `fallOnEnd` effect ends in the middle of a scene: its bearer falls now. */
async function onDeleteEffect(effect, options, userId) {
  if (!isLocalChange(options, userId) || options.eterniaFall || !rulesOn() || !flag(effect, "fallOnEnd")) return;
  const actor = effect.parent;
  if (!(actor instanceof Actor) || FALLING.has(actor.uuid)) return;
  FALLING.add(actor.uuid);
  try {
    await fall(actor, effect.name);
  }
  finally {
    FALLING.delete(actor.uuid);
  }
}

/** Call during the `init` hook. */
export function registerConditionTransformations() {
  Hooks.on("preDeleteCombat", onPreDeleteCombat);
  Hooks.on("deleteActiveEffect", (...args) => onDeleteEffect(...args).catch(err => console.error(`${SYSTEM_ID} | Fall failed`, err)));
  Hooks.on("createActiveEffect", (...args) => onCreateEffect(...args).catch(err => console.error(`${SYSTEM_ID} | Surrender failed`, err)));
  Hooks.on("eternia.revived", actor => onRevived(actor).catch(err => console.error(`${SYSTEM_ID} | Hearts failed`, err)));
}
