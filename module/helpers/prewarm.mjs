/**
 * What the windows read from the compendiums, prepared while the game is idle once it is ready: the indexes of the Item
 * compendiums, the class tab's index of the class skills, the skill browser's index, the races, classes and professions
 * of the option browser, the Magia catalog with the Magias' texts, the creation wizard's catalog and shop and, for the
 * GM, the Market's catalog. The first window of each kind then opens at once instead of waiting for them. Each one is
 * still built on demand if a window asks before.
 *
 * Each one starts once the game is idle again: the ones that load documents (the wizard's options and skills, its shop's
 * items) make them in one go, and on a row they would hold a weak PC; the Magias' texts come a slice at a time, each when
 * the game is idle again (apps/magic-catalog.mjs). A player prepares the wizard's catalog and shop (hundreds of
 * documents) only while one of their characters is still blank, the one the wizard opens for.
 */
import { SYSTEM_ID } from "../settings.mjs";
import { idle, packIndex } from "./pack-index.mjs";
import { classSkills } from "../classes/sheet.mjs";
import { getSkillIndex } from "../apps/skill-browser.mjs";
import { getOptionIndex } from "../apps/option-browser.mjs";
import { prewarmMagicCatalog } from "../apps/magic-catalog.mjs";
import { creationCatalog } from "../apps/creation-catalog.mjs";
import { CreationWizard } from "../apps/creation-wizard.mjs";
import { shopCatalog } from "../apps/starting-gear.mjs";
import { marketCatalog } from "../market/catalog.mjs";

/** Call during the `init` hook. */
export function registerPrewarm() {
  Hooks.once("ready", () => prewarm().catch(err => console.warn(`${SYSTEM_ID} | Could not prepare the compendium indexes`, err)));
}

/**
 * The indexes of the Item compendiums the windows read, one compendium after the other and through packIndex: one the
 * item icons are still fetching is not asked again (the class tab's index asks pack.getIndex itself, and would).
 */
async function itemIndexes() {
  for (const pack of game.packs) if ((pack.documentName === "Item") && pack.visible) await packIndex(pack);
}

async function prewarm() {
  // One after the other: each one reads the same compendium indexes (the first fetches them, the others reuse them).
  const steps = [
    () => itemIndexes(),
    () => classSkills(""),
    () => getSkillIndex(),
    ...["race", "class", "subclass"].map(type => () => getOptionIndex(type)),
    () => prewarmMagicCatalog()
  ];
  // The wizard's catalog and shop load hundreds of documents: a player's, only while a character of theirs is still blank
  // (no race nor class: the wizard opens for it); the GM's always
  const blank = actor => CreationWizard.canCreate(actor) && CreationWizard.isBlank(actor);
  if (game.user.isGM || game.actors.some(blank)) steps.push(() => creationCatalog(), () => shopCatalog());
  // The Market's catalog reads every item of the compendiums: only the GM's window, who opens it most
  if (game.user.isGM) steps.push(() => marketCatalog());
  for (const [i, step] of steps.entries()) {
    await (i ? idle(1000, 100) : idle(4000, 1500));
    await step();
  }
}
