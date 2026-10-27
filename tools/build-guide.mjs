/**
 * The Player's Guide: the chapters in src/guide/*.html become the journal entry of the `guide` compendium
 * (src/packs/guide). Run after editing a chapter, then `npm run packs:build`:
 *   node tools/build-guide.mjs
 *
 * Each chapter starts with a line naming its page:
 *   <!-- id: EtGuiaPagina0012 | slug: odio | titulo: Ódio -->
 * The id is the page's id forever (links to the page use it): a new chapter takes a new id, never an old one.
 * In the text:
 *   @Guia[odio]{o Ódio}          a link to another chapter (also @Guia[odio#anchor]{...})
 *   @Regras[XI]{XI. CLASSES}     a link to a page of AS REGRAS (IX, X, XI, XII, XIII, XIV)
 *   {{versao}}                   the system's version
 * The entry's `flags.eternia.guide.version` is a hash of the pages: when it changes, the copy in each world's Journal
 * is rewritten (module/journal/index.mjs).
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SRC = path.join(ROOT, "src/guide");
const OUT = path.join(ROOT, "src/packs/guide");
const ENTRY_ID = "EterniaGuiaJogad";
const ENTRY_NAME = "Guia do Jogador";
const RULES = "Compendium.eternia.rules.JournalEntry.n6euoAzKnihoeO0K.JournalEntryPage";
const RULES_PAGES = {
  IX: "EtrnCondicoes026", X: "EtrnProfissoes27", XI: "EtrnClasses0000a", XII: "EtrnMagias0000aa",
  XIII: "aFdNjxxYCx9phdnB", XIV: "eCc8wGsuRMIK8vbi"
};

const system = JSON.parse(fs.readFileSync(path.join(ROOT, "system.json"), "utf8"));
const stats = () => ({
  coreVersion: system.compatibility.verified, systemId: system.id, systemVersion: system.version,
  createdTime: null, modifiedTime: null, lastModifiedBy: null, compendiumSource: null, duplicateSource: null,
  exportSource: null
});

const files = fs.readdirSync(SRC).filter(f => f.endsWith(".html")).sort();
const chapters = files.map(file => {
  const raw = fs.readFileSync(path.join(SRC, file), "utf8");
  const head = raw.match(/^<!--([\s\S]*?)-->/);
  if (!head) throw new Error(`${file}: the first line must name the page (<!-- id: … | slug: … | titulo: … -->)`);
  const meta = Object.fromEntries(head[1].split("|").map(part => {
    const i = part.indexOf(":");
    return [part.slice(0, i).trim(), part.slice(i + 1).trim()];
  }));
  for (const key of ["id", "slug", "titulo"]) if (!meta[key]) throw new Error(`${file}: "${key}" is missing`);
  if (!/^[A-Za-z0-9]{16}$/.test(meta.id)) throw new Error(`${file}: the id must have 16 letters or digits`);
  return { file, ...meta, body: raw.slice(head[0].length) };
});

const bySlug = new Map(chapters.map(c => [c.slug, c]));
const seen = new Set();
for (const c of chapters) {
  if (seen.has(c.id)) throw new Error(`${c.file}: the id ${c.id} is repeated`);
  seen.add(c.id);
}

const render = chapter => chapter.body
  .replace(/<!--[\s\S]*?-->/g, "")
  .replace(/@Guia\[([a-z0-9-]+)(#[^\]]+)?\]\{([^}]*)\}/g, (match, slug, hash, text) => {
    const target = bySlug.get(slug);
    if (!target) throw new Error(`${chapter.file}: no chapter "${slug}" (${match})`);
    return `@UUID[.${target.id}${hash ?? ""}]{${text}}`;
  })
  .replace(/@Regras\[([IVX]+)\]\{([^}]*)\}/g, (match, page, text) => {
    if (!RULES_PAGES[page]) throw new Error(`${chapter.file}: no page ${page} of AS REGRAS (${match})`);
    return `@UUID[${RULES}.${RULES_PAGES[page]}]{${text}}`;
  })
  .replaceAll("{{versao}}", system.version)
  .replace(/\n\s*\n/g, "\n")
  .trim()
  // Typographic quotes in the text (never inside a tag)
  .split(/(<[^>]+>)/)
  .map(part => part.startsWith("<") ? part : part.replace(/"([^"]*)"/g, "“$1”"))
  .join("");

const pages = chapters.map((chapter, index) => ({
  sort: (index + 1) * 100000,
  name: chapter.titulo,
  type: "text",
  _id: chapter.id,
  title: { show: false, level: 1 },
  image: {},
  text: { format: 1, content: render(chapter) },
  video: { controls: true, volume: 0.5 },
  src: null,
  system: {},
  ownership: { default: -1 },
  flags: { eternia: { guidePage: chapter.slug } },
  _stats: stats(),
  category: null,
  _key: `!journal.pages!${ENTRY_ID}.${chapter.id}`
}));

const hash = crypto.createHash("sha1").update(JSON.stringify(pages.map(p => [p._id, p.name, p.text.content]))).digest("hex").slice(0, 12);
const entry = {
  name: ENTRY_NAME,
  pages,
  flags: { eternia: { guide: { version: hash, system: system.version } } },
  _stats: stats(),
  _id: ENTRY_ID,
  sort: 100000,
  ownership: { default: 0 },
  categories: [],
  folder: null,
  _key: `!journal!${ENTRY_ID}`
};

fs.mkdirSync(OUT, { recursive: true });
for (const old of fs.readdirSync(OUT)) if (old.endsWith(".json")) fs.rmSync(path.join(OUT, old));
fs.writeFileSync(path.join(OUT, `Guia_do_Jogador_${ENTRY_ID}.json`), `${JSON.stringify(entry, null, 2)}\n`);
console.log(`Guia do Jogador: ${pages.length} páginas, versão ${hash}`);
