/**
 * The journal as an Eternia book and Foundry's interface in the look of Eternia.
 * - Two settings of each player turn on the looks: body.et-ui (css/interface.css) and body.et-journal
 *   (css/journal.css).
 * - The text editor of a journal page gets an "Eternia" menu that inserts the book's blocks (the boxes, the opening
 *   paragraph, the one-line rule), so anyone writes pages like the Player's Guide.
 * - The Player's Guide (compendium `guide`) is kept in the world's Journal for everyone to read: the first GM puts it
 *   there and, when the system brings a new version of it, rewrites its pages (world setting `guideJournal`).
 */
import { setting, SYSTEM_ID } from "../settings.mjs";

/** The compendium of the guide. */
const GUIDE_PACK = `${SYSTEM_ID}.guide`;

/** The book's blocks offered by the editor: wrapping boxes and paragraph styles. */
const BOXES = [
  ["regra", "Regra"],
  ["exemplo", "Exemplo"],
  ["dica", "Dica"],
  ["atencao", "Atenção"],
  ["foundry", "Na mesa virtual"],
  ["resumo", "Em resumo"],
  ["mestre", "Com o Mestre"]
];
const PARAGRAPHS = [
  ["et-abre", "Parágrafo de abertura (capitular)"],
  ["et-formula", "Regra em uma linha"]
];

/** Call during the `init` hook, after the settings. */
export function registerJournal() {
  syncLook();
  Hooks.on("eterniaLook", syncLook);
  Hooks.on("getProseMirrorMenuDropDowns", addBookMenu);
  Hooks.once("ready", () => {
    if (game.users.activeGM?.isSelf && setting("guideJournal")) syncGuide().catch(err => console.error("Eternia | Guia do Jogador", err));
  });
}

/** The body classes of the looks, from each player's settings. */
function syncLook() {
  document.body.classList.toggle("et-ui", setting("uiTheme") !== false);
  document.body.classList.toggle("et-journal", setting("journalTheme") !== false);
}

/* -------------------------------------------- */
/*  The editor's Eternia menu                   */
/* -------------------------------------------- */

/** Add the book's blocks to the editor of a journal page. */
function addBookMenu(menu, dropdowns) {
  const dom = menu.view?.dom;
  if (!dom?.closest?.(".journal-entry-page, .journal-sheet")) return;
  const { nodes } = menu.schema;
  const { setBlockType, wrapIn } = foundry.prosemirror.commands;
  const paragraph = classes => () => {
    const { state, dispatch } = menu.view;
    const current = state.selection.$from.parent;
    const on = (current.type === nodes.paragraph) && (current.attrs.classes === classes);
    setBlockType(nodes.paragraph, { classes: on ? "" : classes })(state, dispatch);
  };
  dropdowns.eternia = {
    title: "Eternia",
    cssClass: "eternia-book",
    entries: [
      {
        action: "et-boxes",
        title: "Caixas",
        children: BOXES.map(([key, label]) => ({
          action: `et-box-${key}`,
          title: label,
          node: nodes.aside,
          cmd: () => menu._toggleBlock(nodes.aside, wrapIn, { attrs: { classes: `et-box et-${key}` } })
        }))
      },
      ...PARAGRAPHS.map(([classes, label]) => ({ action: classes, title: label, cmd: paragraph(classes) }))
    ]
  };
}

/* -------------------------------------------- */
/*  The Player's Guide in the world's Journal   */
/* -------------------------------------------- */

/**
 * Put the guide's journal entries in the world's Journal and keep them as the compendium has them: a missing entry is
 * created (readable by everyone), and one whose `flags.eternia.guide.version` differs from the compendium's gets the
 * compendium's name and pages back, keeping its folder, ownership and sort. Page ids are kept, so links between the
 * guide's pages work in both copies.
 * @returns {Promise<JournalEntry[]>} the entries created or rewritten
 */
export async function syncGuide() {
  const pack = game.packs.get(GUIDE_PACK);
  if (!pack) return [];
  const changed = [];
  for (const source of await pack.getDocuments()) {
    const version = source.getFlag(SYSTEM_ID, "guide")?.version;
    if (!version) continue;
    const data = source.toObject();
    const local = game.journal.find(entry => entry.getFlag(SYSTEM_ID, "guide")?.id === source.id) ?? game.journal.get(source.id);
    const flags = foundry.utils.mergeObject(data.flags ?? {}, { [SYSTEM_ID]: { guide: { id: source.id, version } } });
    if (!local) {
      delete data.folder;
      const created = await JournalEntry.implementation.create({
        ...data, flags, ownership: { default: CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER }
      }, { keepId: true, keepEmbeddedIds: true });
      if (created) changed.push(created);
      continue;
    }
    if (local.getFlag(SYSTEM_ID, "guide")?.version === version) continue;
    await local.deleteEmbeddedDocuments("JournalEntryPage", local.pages.map(page => page.id), { render: false });
    await local.createEmbeddedDocuments("JournalEntryPage", data.pages, { keepId: true, render: false });
    await local.update({ name: data.name, flags });
    changed.push(local);
  }
  if (changed.length) {
    const names = changed.map(entry => entry.name).join(", ");
    ui.notifications.info(game.i18n.format("ETERNIA.Guide.Synced", { names }));
  }
  return changed;
}
