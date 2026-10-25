/**
 * The "Itens Deixados" table as the books write it in a monster's description, read without Foundry (also used by
 * tools/convert-drops.mjs): a row per line, with the faces of the 1d6 ("1~5", "1-4", "6", "Fixo") and the entry
 * ("Mandíbula Negra [Valioso] (30G)", "Pedra de Cores Vivas [Catalisador Mágico 1](15G)x2", "2d6×3 de ouro",
 * "Cota de Anéis (conforme a Lista de Itens)", "Olho Dourado Radiante (Catalisador Mágico 6)").
 */

const ENTITIES = { "&nbsp;": " ", "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": "\"", "&#39;": "'" };
const plain = html => String(html ?? "").replace(/<[^>]+>/g, " ").replace(/&[a-z#0-9]+;/gi, e => ENTITIES[e.toLowerCase()] ?? " ")
  .replace(/\s+/g, " ").trim();
const int = value => Math.trunc(Number(value) || 0);

/** "1-3", "1~3", "6", "Fixo" → the faces of a row: { fixed } or { min, max } (null for anything else). */
export function parseRange(text) {
  const t = String(text ?? "").trim();
  if (/^(fixo|fixed|f)$/i.test(t)) return { fixed: true };
  const m = t.match(/^([1-6])\s*(?:[~\-–a]\s*([1-6]))?$/i);
  if (!m) return null;
  const a = int(m[1]), b = int(m[2] ?? m[1]);
  return { fixed: false, min: Math.min(a, b), max: Math.max(a, b) };
}

/** A tag written in the brackets or parentheses of the books' tables ("Valioso", "Catalisador Mágico 3"…), as the
 *  system keeps it. */
function bookTag(text) {
  const s = String(text ?? "").trim();
  const k = s.match(/catalisador m[áa]gico\s*(\d+)/i);
  if (k) return `Magic Catalyst ${k[1]}`;
  if (/\bvalios/i.test(s)) return "Valuable";
  if (/\bmaterial/i.test(s)) return "Core Material";
  if (/\bconsum/i.test(s)) return "Consumable";
  return null;
}

/**
 * One entry of a table ("Teia Sombria [Material-Base] (50G) x2").
 * @returns {{name: string, tags: string[], price: number|null, qty: number, gold: string, listed: boolean}}
 *   `gold`: a formula when the entry is gold ("2d6*3"); `listed`: the item is the one of the item list (the compendium)
 */
export function parseEntry(text) {
  let c = String(text ?? "").replace(/^fix[oe]d?\s*:\s*/i, "").trim();
  const out = { name: "", tags: [], price: null, qty: 1, gold: "", listed: false };
  let m = c.match(/^(\d+)\s*d\s*6\s*[×x*]\s*(\d+)\s*(?:de ouro|g)?$/i);
  if (m) return { ...out, gold: `${m[1]}d6*${m[2]}` };
  m = c.match(/^dinheiro ca[ií]do\s*\((\d+)\s*G\)$/i);
  if (m) return { ...out, gold: m[1] };
  // "x3" may come before a note in parentheses ("Hambúrguer Crescente x3 (conforme a Lista de Itens)")
  m = c.match(/(?:\s|\))[x×]\s*(\d+)\b/i);
  if (m) {
    out.qty = int(m[1]);
    c = (c.slice(0, m.index + (m[0].startsWith(")") ? 1 : 0)) + " " + c.slice(m.index + m[0].length)).trim();
  }
  if (/\((?:conforme|p\s*\d)/i.test(c)) {
    out.listed = true;
    c = c.replace(/\((?:conforme[^)]*|p\s*\d+[^)]*)\)/gi, " ");
  }
  for (const b of c.matchAll(/\[([^\]]+)\]/g)) {
    const tag = bookTag(b[1]);
    if (tag) out.tags.push(tag);
    const g = b[1].match(/(\d+)\s*G\b/i);
    if (g) out.price = int(g[1]);
  }
  c = c.replace(/\[[^\]]*\]/g, " ");
  for (const p of c.matchAll(/\(([^)]*)\)/g)) {
    for (const part of p[1].split(/[,;]/)) {
      const tag = bookTag(part);
      if (tag) out.tags.push(tag);
      const g = part.match(/(\d+)\s*G\b/i);
      if (g) out.price = int(g[1]);
    }
  }
  c = c.replace(/\([^)]*\)/g, " ");
  const g = c.match(/(\d+)\s*G\b/i);
  if (g && (out.price === null)) { out.price = int(g[1]); c = c.replace(g[0], " "); }
  out.tags = [...new Set(out.tags)];
  out.name = c.replace(/\s+/g, " ").trim();
  return out;
}

/**
 * The "Itens Deixados" table of a description, or null without one.
 * @param {string} html
 * @returns {{rule: {fixed: boolean, min: number, max: number, qty: number, gold: string, growth: boolean},
 *   entry: object}[]|null}
 */
export function parseDropTable(html) {
  const m = String(html ?? "").match(/Itens Deixados([\s\S]*?)<\/table>/i);
  if (!m) return null;
  const rows = [];
  for (const r of m[1].matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)) {
    const cells = [...r[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map(c => plain(c[1])).filter(Boolean);
    if (!cells.length) continue;
    let range = parseRange(cells[0].replace(/^fixo.*$/i, "Fixo"));
    let rest = cells.slice(1).join(" ");
    if (!range) {
      const one = cells.join(" ").match(/^(fixo|[1-6](?:\s*[~\-–]\s*[1-6])?)\s+(.*)$/i);
      if (!one) continue;
      range = parseRange(one[1]);
      rest = one[2];
    }
    const entry = parseEntry(rest);
    if (!entry.name && !entry.gold) continue;
    rows.push({ rule: { fixed: false, min: 1, max: 6, qty: entry.qty, gold: entry.gold, growth: false, ...range }, entry });
  }
  return rows;
}

/** The description without its "Itens Deixados" table (once the table became rows). */
export function withoutDropTable(html) {
  return String(html ?? "").replace(/<table[^>]*>(?:(?!<\/table>)[\s\S])*?Itens Deixados[\s\S]*?<\/table>\s*/i, "");
}

/** Icons of the parts a monster leaves, by the words of the name (the table only gives a name). */
const PART_ICONS = [
  [/presa|dente|incisivo|mand[íi]bula|ferr[ãa]o/i, "icons/commodities/bones/bone-jaw-teeth-white.webp"],
  [/cr[âa]nio|osso|carapa[çc]a/i, "icons/commodities/bones/bone-broken-grey.webp"],
  [/garra|pata|unha|punho/i, "icons/commodities/claws/claw-bear-brown.webp"],
  [/pele|pelagem|couro|pelo/i, "icons/commodities/leather/fur-pelt-brown.webp"],
  [/escama/i, "icons/commodities/leather/scales-green.webp"],
  [/pena|asa/i, "icons/commodities/materials/feather-blue-grey.webp"],
  [/olho/i, "icons/commodities/biological/eye-blue.webp"],
  [/cristal|joia|gema|pedra|anima|esmeralda|rubi|nefrita|pepita|n[úu]cleo|fragmento|lasca/i, "icons/commodities/gems/gem-raw-rough-teal.webp"],
  [/teia|fio|corda|filamento|vinha|uniforme|top\b/i, "icons/commodities/cloth/cloth-roll-tan.webp"],
  [/moeda|dinheiro|folha/i, "icons/commodities/currency/coin-embossed-crown-gold.webp"],
  [/p[óo]\b|cinza|esporo|incenso|breu/i, "icons/commodities/materials/bowl-powder-grey.webp"],
  [/mel\b|seiva|muco|hidromel|amostra|b[áa]lsamo/i, "icons/consumables/potions/bottle-bulb-corked-green.webp"],
  [/carne/i, "icons/consumables/meat/drumstick-bone-pink.webp"],
  [/cogumelo/i, "icons/consumables/mushrooms/bell-shiitake-brown.webp"],
  [/queijo|broto/i, "icons/consumables/food/cheese-wedge-swiss-yellow.webp"],
  [/trigo|palha/i, "icons/commodities/flowers/wheat-bundle.webp"],
  [/estatu|est[áa]tua|amuleto|colar|talism[ãa]|[íi]dolo/i, "icons/commodities/treasure/figurine-idol.webp"],
  [/espada|l[âa]mina|machad|cajado|lan[çc]a|flecha|gancho|vassoura|parafuso|fecho|elmo|munhequeira|armadura|mira|luneta|[óo]culos|circuito|carro[çc]a|trompa|a[çc]o/i, "icons/commodities/metal/barstock-broken-steel.webp"]
];
export const PART_ICON = "icons/commodities/treasure/brooch-gold-green.webp";
export const GOLD_ICON = "icons/commodities/currency/coins-assorted-mix-copper-silver-gold.webp";
export const partIcon = name => PART_ICONS.find(([re]) => re.test(name))?.[1] ?? PART_ICON;

/** Anima-mundi 1 to 10 ([Magic Catalyst N]): its price (professions/data.mjs keeps the same numbers). */
const CATALYST_PRICES = [15, 20, 25, 30, 40, 50, 60, 70, 90, 110];

/** The price of an item's data, or the Anima-mundi's when it is a catalyst with no price. */
export function priceOf(data) {
  const price = int(data?.system?.price);
  if (price) return price;
  const tag = (data?.system?.tags ?? []).find(t => /^magic catalyst \d+$/i.test(String(t)));
  return tag ? (CATALYST_PRICES[Math.min(Math.max(int(String(tag).match(/\d+/)[0]), 1), 10) - 1] ?? 0) : 0;
}

/** The compendium's name of an item without the "(NP1) " the food carries, for matching. */
export const nameKey = name => String(name ?? "").replace(/^\(np\s*\d+\)\s*/i, "").trim().toLowerCase();

/** The keys a table's name may match, in order: the name, then its first grade ("Poção de Visão no Escuro" → "… I"). */
export const nameKeys = name => [nameKey(name), `${nameKey(name)} i`];
