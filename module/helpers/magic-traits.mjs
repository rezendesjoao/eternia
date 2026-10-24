/**
 * The Traits of the Magias (docs/classes.md, "As Magias"): each Magia skill has a passive effect with
 * `flags.eternia.trait` that changes how the spells of that Magia hit, and a spell can carry the same keys in its own
 * flags. Read when a damage card is made and applied (helpers/combat-cards.mjs), and by the conditions a skill may
 * keep ([Hidden]: conditions/turns.mjs, conditions/damage.mjs).
 *
 * The keys (all optional), on a trait (with `magia`: the id of the Magia whose spells it changes) or on a spell:
 *   bonusVs     [{ statusId | statuses | targetTags | decreeOf, value, perValue, consume }]: more damage against a
 *               target with that status (any of `statuses`), with one of the skill or monster tags
 *               (`targetTags: ["Curse"]`), or under a curse of the caster's Decree (`decreeOf: true`,
 *               conditions/decree.mjs); `perValue`: the bonus times the status Rating; `consume`: the status ends with
 *               the hit.
 *   onHit       [{ statusId, value }] (traits): statuses the damage gives, like a spell's own hitStatuses.
 *   escalate    [{ if, add: [{ statusId, value }] }]: when the target already has `if`, the hit also gives `add`.
 *   strip       [statusId]: the hit ends these statuses on the target.
 *   pierce      { cancel, barrier, defense: "half" }: the damage ignores [Cancel], ignores and breaks [Barrier],
 *               counts half the Defense.
 *   keepHidden  true: the spell, and its damage, don't end the user's [Hidden].
 *   bonus       formula: damage added to the spells; `healBonus`: healing added to the spells that heal.
 *   randomHit   [{ statusId, value }] (spells): one of them, drawn when the damage is rolled, on a hit.
 *   drain       a fraction (0.5): the caster gets back that part of the HP its damage takes.
 *   steal       [statusId]: the first of them the target has passes to the caster, with its Rating, on a hit.
 *   selfBonus   [{ statusId, per, spend }] (spells): damage added for the caster's own status, its Rating times
 *               `per` (1 by default); `spend`: the status ends when the damage is rolled (the [Grudge] let out).
 *   decreeCurse true (spells): a hit gives the curses of the caster's own Decrees, as if the target had broken them
 *               (Mandamento Materializado; with the Decree of Detachment the hit also strips its bonuses).
 * Read elsewhere, on a Trait only: `counterBonus` (formula, added to what a [Counter] sends back: conditions/damage.mjs)
 * and `sunClock` (true: the [Sun] rises for the caster, and with each spell of that Magia: conditions/turns.mjs).
 * Values are formulas of the caster ("floor(@cr/2)"), worked out when the card is made.
 */
import { evaluateFormula, formulaData, isFormula } from "./effect-formulas.mjs";
import { canonicalTag } from "./tag-catalog.mjs";
import { toInt } from "./utils.mjs";
import { rating } from "../conditions/rules.mjs";
import { decreeHitStatuses, decreeStrip } from "../conditions/decree.mjs";

/** The Magia a skill belongs to: a spell's Magia, or the Magia skill itself. */
export function itemMagia(item) {
  const flags = item?.flags?.eternia ?? {};
  return flags.magicSpell?.id ?? flags.magic?.id ?? null;
}

/** The active Traits of an actor that change the spells of this item's Magia. */
export function traitsFor(actor, item) {
  const magia = itemMagia(item);
  if (!actor || !magia) return [];
  return [...(actor.allApplicableEffects?.() ?? actor.effects ?? [])]
    .filter(e => e.active && (e.getFlag("eternia", "trait")?.magia === magia));
}

/** Whether using this skill (or its damage) leaves the user's [Hidden] on: the skill's flag or a Trait. */
export function keepsHidden(item, actor = item?.actor) {
  if (item?.flags?.eternia?.keepHidden) return true;
  return traitsFor(actor, item).some(e => e.getFlag("eternia", "trait")?.keepHidden);
}

/** Whether an actor has a tag: its own (monsters) or one of its skills' ("Curse": it uses a Curse). */
export function actorHasTag(actor, tag) {
  const key = canonicalTag(tag).toLowerCase();
  const tags = list => (list ?? []).some(t => canonicalTag(String(t)).toLowerCase() === key);
  if (tags(actor?.system?.tags)) return true;
  return (actor?.items ?? []).some(i => (i.type === "skill") && tags(i.system?.tags));
}

/**
 * What the spell and the Traits add to a damage card, with the formulas worked out for the caster.
 * @param {Item} item
 * @param {Actor|null} attacker
 * @returns {{vs: object[], onHit: object[], escalate: object[], strip: string[], pierce: object, keepHidden: boolean,
 *   bonus: number, healBonus: number, drain: number, steal: string[], spend: string[]}}
 */
export function magicExtras(item, attacker = null) {
  const out = { vs: [], onHit: [], escalate: [], strip: [], pierce: {}, keepHidden: false, bonus: 0, healBonus: 0, drain: 0,
    steal: [], spend: [] };
  const actor = attacker ?? item?.actor ?? null;
  if (!item) return out;
  const traits = traitsFor(actor, item);
  const sources = [{ data: item.flags?.eternia ?? {}, name: item.name, own: true },
    ...traits.map(e => ({ data: e.getFlag("eternia", "trait") ?? {}, name: e.name, own: false }))];
  if (!sources.some(s => s.data.bonusVs || s.data.onHit || s.data.escalate || s.data.strip || s.data.pierce
    || s.data.keepHidden || s.data.bonus || s.data.healBonus || s.data.drain || s.data.steal || s.data.selfBonus
    || s.data.decreeCurse)) return out;
  const data = formulaData(actor, item);
  const num = value => (isFormula(value) ? evaluateFormula(value, data) : toInt(value)) || 0;
  for (const { data: s, name, own } of sources) {
    for (const v of s.bonusVs ?? []) {
      const statuses = v.statuses ?? (v.statusId ? [v.statusId] : []);
      const targetTags = v.targetTags ?? (v.targetTag ? [v.targetTag] : []);
      out.vs.push({ statuses, targetTags, value: num(v.value), perValue: !!v.perValue, consume: !!v.consume, name,
        ...(v.decreeOf ? { decreeOf: actor?.uuid ?? "" } : {}) });
    }
    // A spell's own on-hit statuses are its hitStatuses: here only the Traits' (none when its formula gives 0: the
    // [Burning] of a [Sun] that hasn't risen)
    if (!own) for (const h of s.onHit ?? []) {
      if (!h?.statusId || (isFormula(h.value) && !(num(h.value) > 0))) continue;
      out.onHit.push({ statusId: h.statusId, value: num(h.value) || null, name });
    }
    // The curses of the caster's Decrees, as if the target had broken them (the effects carry the mark of the curse)
    if (own && s.decreeCurse) {
      out.onHit.push(...decreeHitStatuses(actor));
      out.strip.push(...decreeStrip(actor));
    }
    for (const e of s.escalate ?? []) {
      if (e?.if) out.escalate.push({ if: e.if, add: (e.add ?? []).map(a => ({ statusId: a.statusId, value: num(a.value) || null })), name });
    }
    out.strip.push(...(s.strip ?? []));
    Object.assign(out.pierce, s.pierce ?? {});
    if (s.keepHidden) out.keepHidden = true;
    if (s.bonus) out.bonus += num(s.bonus);
    if (s.healBonus) out.healBonus += num(s.healBonus);
    if (s.drain) out.drain = Math.max(out.drain, Number(s.drain) || 0);
    out.steal.push(...(s.steal ?? []));
    // The caster's own status adds to the damage (and may be spent by it)
    for (const b of s.selfBonus ?? []) {
      const value = rating(actor, b.statusId);
      if (value > 0) out.bonus += value * (b.per ? (num(b.per) || 1) : 1);
      if (b.spend && (value > 0)) out.spend.push(b.statusId);
    }
  }
  out.strip = [...new Set(out.strip)];
  out.steal = [...new Set(out.steal)];
  out.spend = [...new Set(out.spend)];
  return out;
}

/** One of a spell's `randomHit` statuses, drawn now, with its value worked out (or null). */
export function drawRandomHit(item, attacker = null) {
  const list = (item?.flags?.eternia?.randomHit ?? []).filter(h => h?.statusId);
  if (!list.length) return null;
  const pick = list[Math.floor(Math.random() * list.length)];
  const actor = attacker ?? item.actor;
  const value = isFormula(pick.value) ? evaluateFormula(pick.value, formulaData(actor, item)) : toInt(pick.value);
  return { statusId: pick.statusId, value: value || null, name: item.name };
}
