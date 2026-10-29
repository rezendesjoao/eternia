/**
 * What lets a blow pass by its target, read by the damage card before anything else of the defender
 * (conditions/damage.mjs beforeDamage): nothing of the blow reaches it, neither damage nor statuses.
 * - [Phasing] (`phasing`, the Magia Permeação): no attack reaches its bearer; each one that went through gives it 1 of
 *   [Anticipation] (helpers/combat-cards.mjs applyDamage), up to its stack. Its bearer attacks no one
 *   (conditions/actions.mjs): only the skills with `flags.eternia.whilePhasing` go on.
 * - An effect with `cutSpell` (the Santo da Espada's Cortar o Feitiço): a spell's blow (a spell of a Magia, a [Spell] or
 *   a [Magic Attack]) is cut.
 * - An effect with `spaceCut` (the Manto Devorador's Corte do Espaço): a blow from more than 1 square away doesn't
 *   cross the space the beast ate.
 * - An effect with `arrowWard` (the Portador de Bênçãos): a physical blow from more than 1 square away misses.
 * A blow whose card has `pierce.all` (the Santo da Espada's Corte Absoluto) passes through all of it, and through what
 * conditions/damage.mjs lets pass by ([The One], copies, [Counter], the immunities of [Intangible] and [Untouchable]).
 */
import { L, SYSTEM_ID } from "../settings.mjs";
import { has, rulesOn } from "./rules.mjs";
import { isSpell } from "./rolls.mjs";

/** The token an actor stands on in the scene on show (its first one). */
const tokenOf = actor => (canvas?.ready ? (actor?.token?.object ?? actor?.getActiveTokens?.(true)?.[0] ?? null) : null);

/** Where a token stands: its source position (TokenDocument#x keeps the old place while a move animates). */
const placeOf = doc => ({ x: doc._source?.x ?? doc.x, y: doc._source?.y ?? doc.y });

/**
 * Squares between two tokens (placeables or documents), as the attack cards count them (Manhattan between the
 * centers' squares), or 0.
 */
export function squaresBetween(a, b) {
  if (!a || !b || !canvas?.ready || (canvas.grid.type !== CONST.GRID_TYPES.SQUARE)) return 0;
  const size = canvas.grid.size;
  const center = token => {
    const doc = token.document ?? token;
    const at = placeOf(doc);
    return { x: at.x + ((Number(doc.width) || 1) * size) / 2, y: at.y + ((Number(doc.height) || 1) * size) / 2 };
  };
  const p = canvas.grid.getOffset(center(a));
  const q = canvas.grid.getOffset(center(b));
  return Math.abs(p.i - q.i) + Math.abs(p.j - q.j);
}

/** How far the attacker of a damage card stands from the defender, in squares (0 when unknown). */
export function cardDistance(actor, card) {
  const attacker = card.attackerUuid ? fromUuidSync(card.attackerUuid) : null;
  return squaresBetween(tokenOf(attacker), tokenOf(actor));
}

/** The active effects of an actor with a flag (its own and the passive ones of its items). */
const withFlag = (actor, key) => [...(actor?.allApplicableEffects?.() ?? [])].filter(e => e.active && e.getFlag(SYSTEM_ID, key));

/**
 * Whether a blow passes by its defender, and why.
 * @param {Actor} actor
 * @param {object} card       The damage card data
 * @param {boolean} direct    Direct damage (a [Phasing] still lets it by: it is no blow of an attack card)
 * @returns {{note: string, phasing?: boolean}|null}
 */
export function passageOf(actor, card, direct = false) {
  if (!rulesOn() || card.recovery || card.pierce?.all) return null;
  if (has(actor, "phasing")) return { note: L("Passage.Phasing"), phasing: true };
  const item = card.itemUuid ? fromUuidSync(card.itemUuid) : null;
  if (item && isSpell(item) && withFlag(actor, "cutSpell").length) return { note: L("Passage.CutSpell") };
  if (direct) return null;
  const spaced = withFlag(actor, "spaceCut").length > 0;
  const warded = (card.type === "physical") && (withFlag(actor, "arrowWard").length > 0);
  if ((spaced || warded) && (cardDistance(actor, card) > 1)) return { note: L(spaced ? "Passage.SpaceCut" : "Passage.ArrowWard") };
  return null;
}
