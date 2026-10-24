/**
 * Use actions that change many statuses at once (`flags.eternia.useActions` of a skill, run by conditions/effects.mjs):
 *   { type: "promote", value }        every Bad Status with a Rating rises by `value` (a [Doom] counts down: it falls, to 1
 *                                     at least; the stacking ones stop at their top, and reaching it sets off their
 *                                     threshold), and those without a Rating are renewed: their next end by their own rule
 *                                     passes by (conditions/lasting.mjs). The Desastre's Promoção de Estado.
 *   { type: "doubleStatuses" }        the same, doubled (a [Doom] halves): the Floresta Desperta.
 *   { type: "demote", statuses }      the bonuses go at once: BONUSES, or the statuses listed. The Murchar.
 *   { type: "raise", status, value }  a status's Rating rises by `value` (up to its top when it stacks), given when the
 *                                     actor doesn't have it: the [Rhythm] of the Dança do Rei Gigante.
 *   { type: "cancelSpells" }          the effects spells gave go: the good ones from an enemy of the user, the bad ones
 *                                     (they give a Bad Status) from an ally or the user. The Cancelamento Absoluto.
 * A Rating set here goes to the status's field and to the effects that carry it (the highest, or the sum when it
 * stacks), so that one of them ending later leaves the right Rating.
 */
import { L, SYSTEM_ID } from "../settings.mjs";
import { LH_STATUSES, statusDefinition } from "../helpers/statuses.mjs";
import { ratedBadStatuses } from "../helpers/magic-traits.mjs";
import { actorName, toInt } from "../helpers/utils.mjs";
import { endsSoon, isSpell, renewStatuses } from "./lasting.mjs";
import { has, rating, removeStatuses, sameActor } from "./rules.mjs";

const label = id => game.i18n.localize(`ETERNIA.StatusEffect.${id}`);
const flag = (effect, key) => effect.getFlag?.(SYSTEM_ID, key) ?? effect.flags?.[SYSTEM_ID]?.[key];

/** The use actions of this file. */
export const STATUS_ACTIONS = ["promote", "doubleStatuses", "demote", "raise", "cancelSpells"];

/** The bonuses the Murchar takes away: the enchantments of the Desencanto, and [Untouchable]. */
export const BONUSES = ["empowered", "hasted", "focused", "cancel", "barrier", "regen", "mirror", "intangible", "awakened",
  "untouchable"];

/** Statuses whose Rating counts down: worse is lower. */
const COUNTDOWN = ["doom"];

/** The name an effect gets when a status is given with a Rating (chat/status-links.mjs statusEffectData). */
const autoName = (id, value, tag) => `${label(id)}${tag ? ` (${tag})` : ""}${value ? `: ${value}` : ""}`;

/**
 * Run one of these use actions on an actor.
 * @param {Actor} actor
 * @param {{type: string, value: number, status: string, statuses: string[], caster: Actor|null}} action
 * @returns {Promise<string|null>}   The chat line
 */
export async function statusAction(actor, { type, value = 0, status = "", statuses = [], caster = null }) {
  switch (type) {
    case "promote": return promote(actor, { add: Math.max(0, toInt(value)) });
    case "doubleStatuses": return promote(actor, { double: true });
    case "demote": return demote(actor, statuses);
    case "raise": return raise(actor, status, toInt(value));
    case "cancelSpells": return cancelSpells(actor, caster);
    default: return null;
  }
}

/**
 * Set a status's Rating: the field, and the Rating its effects carry.
 * @param {Actor} actor
 * @param {string} id
 * @param {number} next
 */
async function setRating(actor, id, next) {
  const def = statusDefinition(id);
  const current = rating(actor, id);
  if (!def?.path || (next === current)) return;
  const effects = actor.effects.filter(e => flag(e, "statusData")?.statusId === id);
  const updates = (def.stack ? effects.slice(0, 1) : effects).map(e => {
    const data = flag(e, "statusData");
    const value = def.stack ? Math.max(1, toInt(data.value) + next - current) : next;
    const update = { _id: e.id, [`flags.${SYSTEM_ID}.statusData.value`]: value };
    if (e.name === autoName(id, toInt(data.value), data.tag)) update.name = autoName(id, value, data.tag);
    return update;
  });
  if (updates.length) await actor.updateEmbeddedDocuments("ActiveEffect", updates);
  await actor.update({ [`system.${def.path}`]: next });
}

/** Promote the Bad Statuses of an actor: their Ratings rise by `add` (or double), the others are renewed. */
async function promote(actor, { add = 0, double = false }) {
  const risen = [];
  for (const id of ratedBadStatuses()) {
    const current = rating(actor, id);
    if (current <= 0) continue;
    const def = statusDefinition(id);
    let next = COUNTDOWN.includes(id)
      ? Math.max(1, double ? Math.floor(current / 2) : current - add)
      : (double ? current * 2 : current + add);
    if (def.stack) next = Math.min(next, def.stack);
    if (next === current) continue;
    await setRating(actor, id, next);
    risen.push(`${label(id)} ${current} → ${next}`);
  }
  const plain = LH_STATUSES.filter(s => (s.group === "bad") && !s.rated && !s.list && has(actor, s.id) && endsSoon(actor, s.id))
    .map(s => s.id);
  const renewed = plain.length ? await renewStatuses(actor, plain) : [];
  const lines = [];
  if (risen.length) lines.push(L("Conditions.Actions.Promote", { name: actorName(actor), statuses: risen.join(", ") }));
  if (renewed.length) lines.push(L("Conditions.Actions.Renew", { name: actorName(actor), statuses: renewed.map(label).join(", ") }));
  return lines.length ? lines.join(" ") : null;
}

/** Take away the bonuses of an actor (BONUSES, or the ones listed). */
async function demote(actor, statuses) {
  const ids = (statuses?.length ? statuses : BONUSES).filter(id => statusDefinition(id) && has(actor, id));
  if (!ids.length) return null;
  await removeStatuses(actor, ids);
  return L("Conditions.Actions.Demote", { name: actorName(actor), statuses: ids.map(label).join(", ") });
}

/** Raise a status's Rating by `value` (up to its top when it stacks). */
async function raise(actor, id, value) {
  const def = statusDefinition(id);
  if (!def?.path || !def.rated || (value <= 0)) return null;
  const current = rating(actor, id);
  const next = def.stack ? Math.min(current + value, def.stack) : current + value;
  if (next === current) return L("Conditions.Actions.RaiseTop", { name: actorName(actor), status: label(id), n: current });
  await setRating(actor, id, next);
  return L("Conditions.Actions.Raise", { name: actorName(actor), status: label(id), n: next });
}

/** The side of an actor: the disposition of its token on the scene (or of its prototype). */
const side = actor => (actor?.token ?? actor?.getActiveTokens?.()[0]?.document ?? actor?.prototypeToken)?.disposition;

/** Whether an effect gives a Bad Status. */
const givesBad = effect => [...(effect.statuses ?? []), flag(effect, "statusData")?.statusId]
  .some(id => id && (statusDefinition(id)?.group === "bad"));

/** Whether a spell gave an effect: its item of origin is a spell, or a spell's hit gave it. */
function fromSpell(effect) {
  if (flag(effect, "fromSpell")) return true;
  const uuid = flag(effect, "source")?.itemUuid || effect.origin;
  const item = uuid ? fromUuidSync(uuid, { strict: false }) : null;
  return (item instanceof Item) && isSpell(item);
}

/** Undo the spells on an actor: the good effects on an enemy of the caster, the bad ones on an ally (or the caster). */
async function cancelSpells(actor, caster) {
  const ally = !caster || sameActor(actor, caster) || (side(actor) === side(caster));
  const gone = actor.effects.filter(e => fromSpell(e) && (givesBad(e) === ally));
  if (!gone.length) return null;
  const names = [...new Set(gone.map(e => e.name))];
  await actor.deleteEmbeddedDocuments("ActiveEffect", gone.map(e => e.id));
  return L("Conditions.Actions.Cancel", { name: actorName(actor), effects: names.join(", ") });
}
