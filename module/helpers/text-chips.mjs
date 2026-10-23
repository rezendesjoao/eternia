/**
 * Bracket chips: the "[...]" of the system's texts read at a glance (css/text-chips.css). Wherever a rich text is
 * shown (skill and item descriptions, chat cards, the rules journal), on the class Motor card and in the use
 * warnings, each one becomes a small label of its kind, with a tooltip that explains it:
 *   formula  [NP+3], [2d6 + Poder Mágico], [Cortes × NP]: green, with its value when the text belongs to a character
 *            ([NP+3] of a CR 10 character reads "NP+3 | 13"; [2d6 + Poder Mágico] "… | 2d6 + 12")
 *   status   [Atordoado], [Barreira: NP+5]: red, the status's rules as tooltip; in the chat a click applies it
 *            (chat/status-links.mjs)
 *   tag      [Chefe], [Chama], [Dedicação]: parchment, the tag's rules as tooltip
 *   stat     [FOR], [Esquiva], [Poder de Ataque]: blue
 *   time     [Momento: Ação Maior], [Pré-Ação]: gold
 *   term     anything else ([Movimento Normal], [M1]): plain
 * Inline rolls ([[/r 2d6]]), document links (@UUID[...]{...}) and links written as [text](...) are left alone, and so
 * is a bare number ([1]).
 *
 * Dice read "2d6", first in a formula. Texts written the old way show that way too: a chip "[Poder de Ataque + 2D]"
 * reads "2d6 + Poder de Ataque", and the dice of the prose ("+1D no teste") read "+1d6".
 */
import { L } from "../settings.mjs";
import { toInt } from "./utils.mjs";
import { statusDescription } from "./statuses.mjs";
import { SYNONYMS } from "./status-names.mjs";
import { findTag, tagDescription, tagKey } from "./tag-catalog.mjs";
import { FIELD_OPTIONS, TAGS } from "../i18n/pt-br.mjs";
import { formulaData } from "./effect-formulas.mjs";
import { allMotors, motorData, motorDef, motorMax, motorName, motorUnit, motorsOf } from "../classes/motor.mjs";

/** A "[...]" that is not part of an inline roll, a document link or a [text](link), and the "D" of "[NH]D" after it. */
export const BRACKETS = /(?<![@\w\[])\[([^\[\]\n]{1,90})\](?![\]{(])(D6?(?![\p{L}\d]))?/gu;

/** Dice in the prose written the old way: "+1D", "2D". */
const PROSE_DICE = /(?<![\p{L}\d\[@/])(\d+)D6?(?![\p{L}\d])/gu;

/** Names of the character's values (both languages), by the formula variable that holds them ("" = none). */
const STATS = {
  "str.mod": ["FOR", "STR"], "dex.mod": ["DES", "DEX"], "pow.mod": ["POD", "POW"], "int.mod": ["INT"],
  attack: ["Poder de Ataque", "Attack Power"], magic: ["Poder Mágico", "Magic Power"], recovery: ["Recuperação", "Recovery"],
  "": ["Esquiva", "Evasion", "Resistência", "Resistance", "Precisão", "Accuracy", "Análise", "Analysis", "Atletismo",
    "Athletics", "Desarme", "Disable", "Vigor", "Endurance", "Conhecimento", "Knowledge", "Negociação", "Negotiation",
    "Operação", "Operation", "Percepção", "Perception", "Iniciativa", "Initiative", "Velocidade", "Speed",
    "Defesa Física", "Physical Defense", "Defesa Mágica", "Magic Defense", "PV", "HP", "PV Máx.", "PV Máx", "Max HP",
    "Multiplicador de Ódio", "Hate Multiplier", "Ódio", "Hate", "Destino", "Fate", "Pontos de Destino", "Fate Points"]
};

/** The attributes, as the formulas write them. */
const ATTRIBUTES = { str: ["FOR", "STR"], dex: ["DES", "DEX"], pow: ["POD", "POW"], int: ["INT"] };

/** Chips longer than this wrap with the text; shorter ones stay on one line. */
const LONG = 26;

const OPERATORS = { "+": "+", "-": "-", "−": "-", "–": "-", "×": "×", "*": "×", "÷": "÷", "/": "÷", "(": "(", ")": ")" };

const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" })[c]);
const tidy = value => String(value ?? "").normalize("NFC").replace(/\s+/g, " ").trim();
const norm = value => tidy(value).toLowerCase();

/* -------------------------------------------- */
/*  Dice notation                               */
/* -------------------------------------------- */

/**
 * Dice written the old way read as d6: "2D" → "2d6", "(1 + Cortes)D" → "(1 + Cortes)d6", "[NH]D" → "[NH]d6", and with
 * `words`, "Fardo D" → "(Fardo)d6".
 * @param {string} text
 * @param {{words?: boolean}} [options]
 * @returns {string}
 */
export function dice6(text, { words = false } = {}) {
  let out = String(text ?? "")
    .replace(/(\d+)D[x×](?=\d)/g, "$1d6×")
    .replace(/(\d+)\s?D6?(?![\p{L}\d])/gu, "$1d6")
    .replace(/([)\]])D6?(?![\p{L}\d])/gu, "$1d6");
  if (words) out = out.replace(/(?<!\p{L})(\p{L}+(?: gast[oa]s?)?) D6?(?![\p{L}\d])/gu, "($1)d6");
  return out;
}

/** Whether the + or − at i joins two terms (not a hyphen inside a word). */
function joinsTerms(expr, i) {
  if (expr[i] === "+") return true;
  const before = expr[i - 1] ?? " ";
  const after = expr[i + 1] ?? " ";
  return /[\s\d)\]]/.test(before) && /[\s\d([]/.test(after);
}

/** The top-level terms of a sum and their signs: "Poder + (1 + Ira)d6 − 1" → [["+", "Poder"], ["+", "(1 + Ira)d6"], ["−", "1"]]. */
function termsOf(expr) {
  const terms = [];
  let depth = 0;
  let current = "";
  let sign = "+";
  for (let i = 0; i < expr.length; i++) {
    const ch = expr[i];
    if ("([".includes(ch)) depth += 1;
    else if (")]".includes(ch)) depth -= 1;
    if (!depth && "+−-".includes(ch) && current.trim() && joinsTerms(expr, i)) {
      terms.push([sign, current.trim()]);
      sign = ch;
      current = "";
    }
    else current += ch;
  }
  terms.push([sign, current.trim()]);
  return terms;
}

/**
 * A sum with dice, the dice first and " + " between the terms: "Poder de Ataque + 2d6" → "2d6 + Poder de Ataque",
 * "65+2d6" → "2d6 + 65". Anything else stays as it is.
 * @param {string} expr
 * @returns {string}
 */
export function diceFirst(expr) {
  const terms = termsOf(expr);
  const isDice = term => /d6/.test(term);
  if ((terms.length < 2) || !terms.some(([, t]) => isDice(t)) || terms.some(([, t]) => !t)) return expr;
  const dice = terms.filter(([, t]) => isDice(t));
  if (dice.some(([s]) => s !== "+")) return expr;
  return [...dice, ...terms.filter(([, t]) => !isDice(t))]
    .map(([s, t], i) => (i ? ` ${s} ${t}` : t)).join("");
}

/** The text a chip shows: the dice as d6 and, in a formula, first. */
function shownText(info, text) {
  if (info.kind === "formula") return diceFirst(dice6(text, { words: true }));
  if ((info.kind === "status") && info.value) {
    const head = text.slice(0, text.indexOf(":") + 1);
    return `${head} ${diceFirst(dice6(info.value, { words: true }))}`;
  }
  return dice6(text);
}

/* -------------------------------------------- */
/*  Names                                       */
/* -------------------------------------------- */

let names = null;

/** The names the chips know, in the current language and in English (built once per language). */
function lookups() {
  if (names?.lang === game.i18n.lang) return names;
  const statuses = new Map();
  const labels = foundry.utils.getProperty(game.i18n.translations ?? {}, "ETERNIA.StatusEffect") ?? {};
  const english = foundry.utils.getProperty(game.i18n._fallback ?? {}, "ETERNIA.StatusEffect") ?? {};
  for (const id of new Set([...Object.keys(labels), ...Object.keys(english)])) {
    for (const label of [labels[id], english[id], id]) {
      if ((typeof label === "string") && label) statuses.set(norm(label), id);
    }
  }
  const synonyms = new Map(Object.entries(SYNONYMS).map(([name, id]) => [norm(name), id]));

  const stats = new Map();
  for (const [key, list] of Object.entries(STATS)) for (const name of list) stats.set(norm(name), key);

  const tags = new Map();
  for (const [en, pt] of Object.entries(TAGS)) {
    tags.set(tagKey(en), en);
    tags.set(tagKey(pt), en);
  }

  const timings = new Set();
  for (const [en, pt] of Object.entries(FIELD_OPTIONS.timing ?? {})) {
    timings.add(norm(en));
    timings.add(norm(pt));
  }

  // The words of a formula, longest first (the tokenizer takes the first that fits)
  const vars = [];
  const add = (list, descriptor) => { for (const name of list) vars.push({ name: norm(name), ...descriptor }); };
  add(["NP", "CR"], { key: "cr" });
  add(["NH máx.", "NH máx", "SR max"], { key: "srMax" });
  add(["NH", "SR"], { key: "sr" });
  add(["Poder de Ataque da Arma", "Weapon Attack Power"], { key: "weapon.attack" });
  add(["Poder Mágico da Arma", "Weapon Magic Power"], { key: "weapon.magic" });
  add(["Poder de Ataque", "Attack Power"], { key: "attack" });
  add(["Poder Mágico", "Magic Power"], { key: "magic" });
  add(["Recuperação", "Recovery"], { key: "recovery" });
  for (const [attr, words] of Object.entries(ATTRIBUTES)) {
    for (const word of words) {
      add([`valor de ${word}`, `${word} base`], { key: `${attr}.base`, attr: words[0], part: "base" });
      add([`mod. de ${word}`, `modificador de ${word}`, `${word} mod`, word], { key: `${attr}.mod`, attr: words[0], part: "mod" });
    }
  }
  add(["soma de todas as Leituras", "soma das Leituras", "soma da Leitura"], { unknown: true });
  add(["NP do alvo", "CR of the target", "target's CR"], { unknown: true, meaning: "targetCr" });
  add(["Ataque", "Attack"], { unknown: true, meaning: "enemyAttack" });
  for (const def of allMotors()) {
    const unit = motorUnit(def);
    const name = motorName(def);
    add(["gastos", "gastas", "gasto", "gasta"].map(word => `${unit} ${word}`), { motor: def.id, spent: true });
    add(["da", "do", "de", "das", "dos"].map(word => `Teto ${word} ${name}`), { motor: def.id, max: true });
    add([unit], { motor: def.id });
    for (const chip of def.chips ?? []) add(chip.words, { motor: def.id, field: chip.key });
  }
  vars.sort((a, b) => b.name.length - a.name.length);

  names = { lang: game.i18n.lang, statuses, synonyms, stats, tags, timings, vars };
  return names;
}

/** "Barreira: NP+5", "Fraqueza (Chama): 5" → the status, its tag and its value; null when the name is no status's. */
function parseStatus(text, known) {
  const colon = text.indexOf(":");
  let head = (colon >= 0) ? text.slice(0, colon) : text;
  const value = (colon >= 0) ? tidy(text.slice(colon + 1)) : "";
  let tag = "";
  const paren = head.match(/^(.*?)\s*\(([^()]*)\)\s*$/);
  if (paren) {
    head = paren[1];
    tag = tidy(paren[2]);
  }
  const id = known.get(norm(head));
  return id ? { id, tag, value } : null;
}

/** A word in the singular ("Poções" → "Poção", "Consumíveis" → "Consumível", "Ataques" → "Ataque"). */
function singular(word) {
  for (const [end, to] of [["ões", "ão"], ["ães", "ão"], ["eis", "el"], ["ais", "al"], ["ns", "m"]]) {
    if (word.toLowerCase().endsWith(end)) return word.slice(0, -end.length) + to;
  }
  return word.replace(/(?<!s)s$/i, "");
}

/** The tag a text names (its English label), or null: "Chefe", "Ataques com Arma", "Catalisador Mágico 3", "NP17". */
function tagOf(text, known) {
  const exact = known.tags.get(tagKey(text)) ?? findTag(text)?.label;
  if (exact) return exact;
  const plural = known.tags.get(tagKey(text.split(" ").map(singular).join(" ")));
  if (plural) return plural;
  if (/^\s*(?:Catalisador Mágico|Magic Catalyst)(?:\s*\d+)?\s*$/i.test(text)) return "Magic Catalyst";
  if (/^\s*(?:NP|CR)\s?\d+\s*$/i.test(text)) return "Rank";
  return null;
}

/* -------------------------------------------- */
/*  Formulas                                    */
/* -------------------------------------------- */

/** The tokens of a formula ("NP×2+10", "(1 + Cortes)d6 + Poder de Ataque"), or null when it holds something else.
 * Dice read as "d6" or, in older texts, "D". */
function tokenize(text, vars) {
  const shown = tidy(text);
  const source = shown.toLowerCase();
  if (source.length !== shown.length) return null;
  const tokens = [];
  let i = 0;
  while (i < source.length) {
    const rest = source.slice(i);
    if (rest[0] === " ") {
      i += 1;
      continue;
    }
    const number = /^\d+/.exec(rest);
    if (number) {
      tokens.push({ type: "num", value: Number(number[0]) });
      i += number[0].length;
      continue;
    }
    if (OPERATORS[rest[0]]) {
      tokens.push({ type: "op", value: OPERATORS[rest[0]] });
      i += 1;
      continue;
    }
    const word = vars.find(v => rest.startsWith(v.name) && !/^\p{L}/u.test(rest.slice(v.name.length)));
    if (word) {
      tokens.push({ type: "var", value: word, text: shown.slice(i, i + word.name.length) });
      i += word.name.length;
      continue;
    }
    const dice = /^d6?(?![\p{L}\d])/u.exec(rest);
    if (dice) {
      tokens.push({ type: "dice" });
      i += dice[0].length;
      continue;
    }
    if (/^x(?!\p{L})/u.test(rest)) {
      tokens.push({ type: "op", value: "×" });
      i += 1;
      continue;
    }
    return null;
  }
  return tokens;
}

/** The tree of a formula: + and − over × and ÷, a "d6" after a value makes it dice; null when it doesn't parse. */
function parse(tokens) {
  let pos = 0;
  const peek = () => tokens[pos];
  const isOp = (token, ...ops) => (token?.type === "op") && ops.includes(token.value);
  const primary = () => {
    const token = tokens[pos++];
    if (!token) return null;
    if (token.type === "num") return { num: token.value };
    if (token.type === "var") return { variable: token.value, text: token.text };
    if (token.type === "dice") return { op: "dice", a: { num: 1 } };
    if (!isOp(token, "(")) return null;
    const inner = sum();
    return (inner && isOp(tokens[pos++], ")")) ? inner : null;
  };
  const factor = () => {
    if (isOp(peek(), "-")) {
      pos += 1;
      const a = factor();
      return a ? { op: "neg", a } : null;
    }
    let node = primary();
    if (node && (peek()?.type === "dice")) {
      pos += 1;
      node = { op: "dice", a: node };
    }
    return node;
  };
  const chain = (next, ...ops) => () => {
    let node = next();
    while (node && isOp(peek(), ...ops)) {
      const op = tokens[pos++].value;
      const b = next();
      if (!b) return null;
      node = { op, a: node, b };
    }
    return node;
  };
  const product = chain(factor, "×", "÷");
  const sum = chain(product, "+", "-");
  const tree = sum();
  return (tree && (pos === tokens.length)) ? tree : null;
}

/** A formula of a text, or null: its tree, the words it reads (once each) and whether it rolls dice. */
function parseFormula(text, known) {
  const tokens = tokenize(text, known.vars);
  if (!tokens?.length || tokens.every(t => t.type === "num")) return null;
  const tree = parse(tokens);
  if (!tree) return null;
  const words = new Map();
  for (const token of tokens) if (token.type === "var") words.set(token.value.name, token);
  return { tree, words: [...words.values()], dice: tokens.some(t => t.type === "dice") };
}

/** The value of a word of a formula for this text's character, or null when it has none. */
function wordValue(word, context) {
  const { actor, item } = context;
  if (!actor || word.unknown || word.spent) return null;
  if (word.motor) {
    const owned = motorsOf(actor).find(m => m.def.id === word.motor);
    if (!owned) return null;
    if (word.field) {
      const ctx = { lesser: owned.lesser, data: motorData(actor, word.motor), max: motorMax(actor, word.motor) };
      const value = owned.def.formulaData?.(actor, item ?? null, ctx)?.[word.field];
      return Number.isFinite(value) ? value : null;
    }
    return word.max ? motorMax(actor, word.motor) : toInt(motorData(actor, word.motor).value);
  }
  context.data ??= formulaData(actor, item);
  if (word.key === "cr") return toInt(context.data.cr) || null;
  if ((word.key === "sr") || (word.key === "srMax")) return ((item?.type === "skill") && item.actor) ? (toInt(context.data[word.key]) || null) : null;
  if (actor.type !== "character") return null;
  const value = foundry.utils.getProperty(context.data, word.key);
  return Number.isFinite(value) ? value : null;
}

/** Work out a formula tree: a constant and a number of dice, or null. Divisions round down. */
function evaluate(node, value) {
  if ("num" in node) return { c: node.num, d: 0 };
  if (node.variable) {
    const n = value(node.variable);
    return (n === null) ? null : { c: n, d: 0 };
  }
  const a = evaluate(node.a, value);
  if (!a) return null;
  if (node.op === "neg") return { c: -a.c, d: -a.d };
  if (node.op === "dice") return a.d ? null : { c: 0, d: a.c };
  const b = evaluate(node.b, value);
  if (!b) return null;
  if (node.op === "+") return { c: a.c + b.c, d: a.d + b.d };
  if (node.op === "-") return { c: a.c - b.c, d: a.d - b.d };
  if (node.op === "×") return (a.d && b.d) ? null : { c: a.c * b.c, d: (a.d * b.c) + (b.d * a.c) };
  if (node.op === "÷") return (a.d || b.d || !b.c) ? null : { c: Math.floor(a.c / b.c), d: 0 };
  return null;
}

/** "2d6 + 12", "3d6", "13". */
function showValue({ c, d }) {
  if (!d) return String(c);
  if (!c) return `${d}d6`;
  return `${d}d6 ${c > 0 ? "+" : "−"} ${Math.abs(c)}`;
}

/** What a word of a formula means. */
function wordMeaning(word) {
  if (word.meaning) return L(`Chips.Var.${word.meaning}`);
  if (word.unknown) return L("Chips.Var.unknown");
  if (word.motor) {
    const def = motorDef(word.motor);
    if (word.field && def) return L(`${def.i18n}.Chips.${word.field}`);
    const motor = def ? motorName(def) : word.motor;
    return L(`Chips.Var.${word.spent ? "spent" : (word.max ? "max" : "motor")}`, { motor });
  }
  if (word.attr) return L(`Chips.Var.${word.part}`, { attr: word.attr });
  return L(`Chips.Var.${word.key.replace(".", "_")}`);
}

/** The value of a formula (null without one) and the lines of its tooltip. */
function formulaParts(formula, context) {
  const values = new Map(formula.words.map(token => [token.value, wordValue(token.value, context)]));
  const result = evaluate(formula.tree, word => values.get(word) ?? wordValue(word, context));
  const lines = formula.words.map(token => {
    const value = values.get(token.value);
    return `<span class="lhb-tip-line"><b>${esc(token.text)}</b><span>${esc(wordMeaning(token.value))}</span>${(value === null) ? "" : `<em>${esc(value)}</em>`}</span>`;
  });
  if (formula.dice) lines.push(`<span class="lhb-tip-line"><b>d6</b><span>${esc(L("Chips.Var.dice"))}</span></span>`);
  let foot = "";
  if (result && formula.words.length) foot = `<span class="lhb-tip-total">${esc(L("Chips.Total", { value: showValue(result) }))}</span>`;
  else if (formula.words.some(token => token.value.spent || (token.value.unknown && !token.value.meaning))) foot = `<span class="lhb-tip-note">${esc(L("Chips.Pending"))}</span>`;
  else if (formula.words.length) foot = `<span class="lhb-tip-note">${esc(L("Chips.NoValue"))}</span>`;
  return { value: (result && formula.words.length) ? showValue(result) : null, tip: lines.join("") + foot };
}

/* -------------------------------------------- */
/*  Chips                                       */
/* -------------------------------------------- */

/** What a bracket holds: { kind, … }, or null to leave it as it is. */
function classify(text) {
  const key = norm(text);
  if (!key || /^[\d\s.,]+$/.test(key)) return null;
  const known = lookups();
  if (/^(momento|trigger|timing)\s*:/.test(key)) return { kind: "time" };
  const status = parseStatus(text, known.statuses);
  if (status) return { kind: "status", ...status };
  if (known.stats.has(key)) return { kind: "stat", key: known.stats.get(key) };
  if (/^testes? de /.test(key)) return { kind: "stat", key: "" };
  const tag = tagOf(text, known);
  if (tag) return { kind: "tag", tag };
  if (known.timings.has(key)) return { kind: "time" };
  const formula = parseFormula(text, known);
  if (formula) return { kind: "formula", formula };
  const synonym = parseStatus(text, known.synonyms);
  if (synonym) return { kind: "status", ...synonym };
  return { kind: "term" };
}

const tipHead = (kind, title) => `<span class="lhb-tip-kind">${esc(L(`Chips.Kind.${kind}`))}</span>${title ? `<strong class="lhb-tip-title">${esc(title)}</strong>` : ""}`;
const tipText = text => (text ? `<span class="lhb-tip-desc">${esc(text)}</span>` : "");

/**
 * The chip of one bracket, as HTML; null to leave the bracket as it is.
 * @param {string} inner              The text between the brackets
 * @param {{actor?: Actor, item?: Item}} [context]   Whose text it is (for the values)
 * @returns {string|null}
 */
export function chipHTML(inner, context = {}) {
  const info = classify(inner);
  if (!info) return null;
  const text = tidy(inner);
  let value = null;
  let tip = "";
  const data = {};
  if (info.kind === "formula") {
    const parts = formulaParts(info.formula, context);
    value = parts.value;
    tip = tipHead("formula") + parts.tip;
  }
  else if (info.kind === "status") {
    Object.assign(data, { status: info.id, value: info.value, tag: info.tag });
    const label = game.i18n.localize(`ETERNIA.StatusEffect.${info.id}`);
    let lines = "";
    if (info.value) {
      const formula = parseFormula(info.value, lookups());
      if (formula) {
        const parts = formulaParts(formula, context);
        value = parts.value;
        lines = parts.tip;
      }
    }
    tip = tipHead("status", label) + tipText(statusDescription(info.id)) + lines;
  }
  else if (info.kind === "tag") {
    const description = (info.tag === "Rank") ? "" : tagDescription(info.tag);
    if (description) tip = tipHead("tag", text) + tipText(description);
  }
  else if (info.kind === "stat" && info.key && context.actor) {
    // An attribute tells its score and modifier; a power shows its value
    const n = wordValue({ key: info.key }, context);
    if ((n !== null) && /\.mod$/.test(info.key)) {
      const base = wordValue({ key: info.key.replace(/mod$/, "base") }, context);
      tip = tipHead("stat", text) + tipText(L("Chips.Attribute", { base: base ?? "—", mod: n }));
    }
    else if (n !== null) value = String(n);
  }
  const attrs = Object.entries(data).filter(([, v]) => v).map(([k, v]) => ` data-${k}="${esc(v)}"`).join("");
  const tooltip = tip ? ` data-tooltip-html="${esc(`<div class="lhb-tip">${tip}</div>`)}" data-tooltip-class="lhb-tooltip"` : "";
  const shown = shownText(info, text);
  const long = (shown.length > LONG) ? " lhb-long" : "";
  return `<span class="lhb lhb-${info.kind}${long}"${attrs}${tooltip}><span class="lhb-text">${esc(shown)}</span>`
    + `${(value === null) ? "" : `<span class="lhb-value">${esc(value)}</span>`}</span>`;
}

/**
 * A plain text with its brackets as chips and its dice as d6: the rest is escaped.
 * @param {string} text
 * @param {{actor?: Actor, item?: Item}} [context]
 * @returns {string}  HTML
 */
export function chipText(text, context = {}) {
  const source = String(text ?? "");
  const plain = part => esc(dice6(part));
  let html = "";
  let last = 0;
  for (const match of source.matchAll(BRACKETS)) {
    const chip = chipHTML(match[1], context);
    html += plain(source.slice(last, match.index)) + (chip ? chip + (match[2] ? "d6" : "") : plain(match[0]));
    last = match.index + match[0].length;
  }
  return html + plain(source.slice(last));
}

/** Whose text a rich text is (the `relativeTo` of the enrichment). */
function contextOf(options) {
  const doc = options?.relativeTo;
  if (doc?.documentName === "Item") return { item: doc, actor: doc.actor ?? null };
  if (doc?.documentName === "Actor") return { actor: doc };
  return {};
}

/** Call during the `init` hook: the chips in every rich text the system shows, and its dice as d6. */
export function registerTextChips() {
  CONFIG.TextEditor.enrichers.push({
    pattern: BRACKETS,
    enricher: async (match, options) => {
      const html = chipHTML(match[1], contextOf(options));
      if (!html) return null;
      const template = document.createElement("template");
      template.innerHTML = html;
      const chip = template.content.firstElementChild;
      if (!match[2]) return chip;
      // "[NH]D": the chip and its dice
      const wrap = document.createElement("span");
      wrap.append(chip, "d6");
      return wrap;
    }
  }, {
    pattern: PROSE_DICE,
    enricher: async match => {
      const span = document.createElement("span");
      span.className = "lhb-dice";
      span.textContent = `${match[1]}d6`;
      return span;
    }
  });
}
