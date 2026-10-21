/**
 * Parchment windows (css/windows.css): the system's item sheets, the monster sheet, the effect
 * editor, the skill and class browsers, the pile window and the dialogs take the look of the
 * character sheet. Only classes are added, before a window is first drawn: the system's templates
 * and listeners stay as they are.
 */
import { setting } from "../settings.mjs";

/** Windows with one of these classes take the parchment look. */
const THEMED = new Set(["eternia", "eternia-effect-config", "lhauto-dialog", "lhauto-tools"]);

/** Dialogs of the system without a class of their own, known by a mark in their content. */
const MARKS = ["lh-check-mod", "sustained-dialog-form", "eternia-convert-summary"];

/** A dialog opened this soon after a click in a parchment window belongs to it (a confirmation). */
const FOLLOW_MS = 2000;
let lastClick = { time: 0, themed: false };

/** Does this window take the parchment look? */
function wanted(app) {
  const classes = app.options.classes;
  if (classes.includes("lhwin") || classes.includes("lhpf")) return false;
  // The system's own character sheet keeps its art (a transparent frame over the canvas).
  const doc = app.document;
  if (doc?.documentName === "Actor" && doc.type === "character") return false;
  if (classes.some(c => THEMED.has(c))) return true;
  if (!(app instanceof foundry.applications.api.DialogV2)) return false;
  const content = String(app.options.content ?? "");
  if (MARKS.some(mark => content.includes(mark))) return true;
  return lastClick.themed && (Date.now() - lastClick.time < FOLLOW_MS);
}

/** Call during the `init` hook. */
export function registerWindows() {
  Hooks.on("preRenderApplicationV2", (app, context, options) => {
    if (!options.isFirstRender || !setting("windowTheme") || !wanted(app)) return;
    const classes = app.options.classes;
    const dark = classes.indexOf("theme-dark");
    if (dark !== -1) classes.splice(dark, 1);
    if (!classes.includes("themed")) classes.push("themed");
    if (!classes.includes("theme-light")) classes.push("theme-light");
    classes.push("lhwin");
  });

  // Sheets the user can only read (a locked compendium, someone else's item): their values read as text.
  Hooks.on("renderApplicationV2", (app, element) => {
    if (!element?.classList?.contains("lhwin") || !("isEditable" in app)) return;
    element.classList.toggle("lhwin-locked", !app.isEditable);
  });

  document.addEventListener("pointerdown", event => {
    lastClick = { time: Date.now(), themed: !!event.target.closest?.(".lhwin, .lhpf") };
  }, { capture: true });
}
