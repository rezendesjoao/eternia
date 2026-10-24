/**
 * The Forms of a weapon (the Lança Espiritual, docs/condicoes.md): stances of one group, one at a time.
 *
 * - An effect with `flags.eternia.form = "<group>"` is a form of that group ("lanca"). When one comes to an actor, the
 *   other forms of the same group on it end: the new form replaces the old one. Its changes and its status are what the
 *   form gives while it lasts (the spell that gave it did the form's own action); it ends with the scene like any spell
 *   effect, or when another form of the group comes.
 * - An effect with `flags.eternia.struckStatus = { statusId, value }`: whoever deals damage to its bearer with a damage
 *   card gets that status, the bearer as its source (the bear of the Guardian form taunts whoever hits it).
 */
import { L, SYSTEM_ID } from "../settings.mjs";
import { isLocalChange } from "../helpers/clients.mjs";
import { actorName, postSummary, toInt } from "../helpers/utils.mjs";
import { sameActor } from "./rules.mjs";

const label = id => game.i18n.localize(`ETERNIA.StatusEffect.${id}`);
const flag = (effect, key) => effect.getFlag?.(SYSTEM_ID, key) ?? effect.flags?.[SYSTEM_ID]?.[key];

/** The form group of an effect ("lanca"), or "". */
export const formOf = effect => String(flag(effect, "form") ?? "");

/**
 * The form an actor is in, in a group: its effect, or null.
 * @param {Actor} actor
 * @param {string} group
 * @returns {ActiveEffect|null}
 */
export function activeForm(actor, group) {
  return [...(actor?.effects ?? [])].find(e => e.active && (formOf(e) === group)) ?? null;
}

/** A form comes: the other forms of its group on the actor end. */
async function onCreateEffect(effect, options, userId) {
  if (!isLocalChange(options, userId)) return;
  const actor = effect.parent;
  const group = formOf(effect);
  if (!(actor instanceof Actor) || !group) return;
  const others = actor.effects.filter(e => (e.id !== effect.id) && (formOf(e) === group)).map(e => e.id);
  if (others.length) await actor.deleteEmbeddedDocuments("ActiveEffect", others).catch(() => null);
}

/**
 * A damage card took HP (or Barrier) from an actor: its effects with `struckStatus` give that status to the attacker.
 * Runs on the window that applied the damage.
 */
async function onDamaged(actor, card, { amount = 0, absorbed = 0, attacker = null } = {}) {
  if (!attacker || sameActor(attacker, actor) || ((toInt(amount) <= 0) && (toInt(absorbed) <= 0))) return;
  const given = [...actor.effects].filter(e => e.active && flag(e, "struckStatus")?.statusId);
  if (!given.length) return;
  const lines = [];
  for (const effect of given) {
    const { statusId, value = null } = flag(effect, "struckStatus");
    await game.eternia.applyStatus(attacker, statusId, { value: toInt(value) || null, from: actor });
    lines.push(L("Conditions.StruckStatus", { name: actorName(attacker), status: label(statusId), source: actorName(actor), effect: effect.name }));
  }
  await postSummary(given[0].name, lines);
}

/** Call during the `init` hook. */
export function registerConditionForms() {
  Hooks.on("createActiveEffect", (...args) => onCreateEffect(...args).catch(err => console.error(`${SYSTEM_ID} | Form change failed`, err)));
  Hooks.on("eternia.damaged", (...args) => onDamaged(...args).catch(err => console.error(`${SYSTEM_ID} | Struck status failed`, err)));
}
