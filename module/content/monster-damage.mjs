/**
 * Read a monster attack's damage from its rules text (no Foundry dependency: also used by the tools).
 *
 * The bestiary writes damage in many ways, in English and, through the pt-BR translation, in Portuguese:
 *   "[2d6 + 20] de dano físico", "[20+2D] physical damage", "[2D +30] Magic Damage", "[40+2 D] inflicts physical damage",
 *   "Deal [[/gmr 2d6 + 12]]{[2D+12]} physical damage", "37+2D physical damage", "10 pts [piercing] damage",
 *   "[20+2D] de dano físico", "Causa [[/gmr 2d6 + 12]]{[2D+12]} de dano físico ao alvo".
 * The Hit Check is often written right before the damage ("[[/gmr 2d6 + 5]]{CHECK} [[/gmr 2d6 + 16]]…"):
 * the damage is the expression right before the first "damage" / "dano" word that has one.
 */

const ENTITIES = { "&nbsp;": " ", "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": "\"", "&#39;": "'", "&rsquo;": "'", "&ldquo;": "\"", "&rdquo;": "\"", "&times;": "x" };

/** Plain text of rules HTML. */
export function plainText(html) {
  return String(html ?? "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-z#0-9]+;/gi, entity => ENTITIES[entity.toLowerCase()] ?? " ")
    .replace(/\s+/g, " ")
    .trim();
}

const DAMAGE_WORD = /damage|dano/gi;
/** Damage type words: English before "damage", Portuguese after "dano". */
const TYPE_WORDS = [
  [/phys|f[ií]sic/i, "physical"],
  [/magic|m[áa]gic/i, "magical"],
  [/pierc|penetra|perfura/i, "penetrating"],
  [/direct|diret/i, "direct"]
];

/**
 * Dice expressions of a text, with their position: inline rolls, "[N+XD]", "XD+N", "N pts".
 * @param {string} text
 * @returns {{start: number, end: number, dice: number, mod: number}[]}
 */
function expressions(text) {
  const found = [];
  const add = (match, dice, mod) => found.push({ start: match.index, end: match.index + match[0].length, dice, mod });
  // Inline rolls: any sum of d6 and numbers ("2d6+18+5")
  for (const m of text.matchAll(/⟦([^⟧]*)⟧/g)) {
    const formula = m[1].replace(/\s+/g, "");
    if (!/^[+-]?\d+d6(?:[+-]\d+(?:d6)?)*$/i.test(formula)) continue;
    const terms = formula.match(/[+-]?\d+(?:d6)?/gi) ?? [];
    const dice = terms.filter(t => /d6/i.test(t)).reduce((sum, t) => sum + parseInt(t, 10), 0);
    const mod = terms.filter(t => !/d6/i.test(t)).reduce((sum, t) => sum + Number(t), 0);
    add(m, dice, mod);
  }
  for (const m of text.matchAll(/(\d+)\s*\+\s*(\d+)\s*D(?![a-z])/gi)) add(m, Number(m[2]), Number(m[1]));
  for (const m of text.matchAll(/(\d+)\s*D6?\s*\+\s*(\d+)/gi)) add(m, Number(m[1]), Number(m[2]));
  for (const m of text.matchAll(/(\d+)\s*(?:pts?|points|pontos)\b/gi)) add(m, 0, Number(m[1]));
  // Inside an inline roll token the plain patterns also match: keep the outer token only.
  return found
    .filter(e => !found.some(o => (o !== e) && (o.start <= e.start) && (o.end >= e.end) && ((o.end - o.start) > (e.end - e.start))))
    .sort((a, b) => a.start - b.start);
}

/** Inline rolls ("[[/gmr 2d6 + 15]]{[2D+15]}") become "⟦2d6+15⟧", keeping label words such as "Magic Damage". */
function flattenInlineRolls(text) {
  return text.replace(/\[\[\/(?:gm|b|s)?r(?:oll)?\s+([^\]]+?)\]\](?:\{([^{}]*)\}?)?/gi, (match, formula, label = "") => {
    const words = label.replace(/[[\]]/g, " ").replace(/\d+\s*D6?\s*[+-]?\s*\d*|\d+\s*\+\s*\d+\s*D6?/gi, " ").trim();
    const keep = /damage|dano/i.test(words) ? ` ${words}` : "";
    return ` ⟦${formula.replace(/\s+/g, "")}⟧${keep} `;
  });
}

/**
 * The damage of a monster attack.
 * @param {string} html          Rules text of the skill
 * @param {object} [options]
 * @param {string[]} [options.tags]   The skill's tags: [Magic Attack] means magical damage when the text
 *                                     names no type.
 * @returns {{dice: number, mod: number, type: string}|null}
 */
export function parseMonsterDamage(html, { tags = [] } = {}) {
  const text = flattenInlineRolls(plainText(html));
  const exprs = expressions(text);
  if (!exprs.length) return null;
  for (const word of text.matchAll(DAMAGE_WORD)) {
    const at = word.index;
    // The expression right before the word, with only a few words between them.
    const before = exprs.filter(e => (e.end <= at) && ((at - e.end) <= 40)).at(-1);
    if (!before) continue;
    const between = text.slice(before.end, at);
    // A rider ("Increase the damage by +5", "+[N] damage") or a check ("vs Evasion") in between: not this one.
    if (/[.;:]|vs\b|\bresult\b/i.test(between)) continue;
    const around = between + text.slice(at, at + 22);
    const type = TYPE_WORDS.find(([pattern]) => pattern.test(around))?.[1]
      ?? ((tags ?? []).some(t => /magic attack/i.test(String(t))) ? "magical" : "physical");
    return { dice: before.dice, mod: before.mod, type };
  }
  return null;
}
