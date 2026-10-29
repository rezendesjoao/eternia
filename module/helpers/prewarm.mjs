/**
 * What the windows read from the compendiums, prepared while the game is idle once it is ready: the class tab's index
 * of the class skills, the skill browser's index, the races, classes and professions of the option browser, the
 * Magia catalog with the Magias' texts, the creation wizard's catalog and shop and, for the GM, the Market's catalog.
 * The first window of each kind then opens at once instead of waiting for them. Each one is still built on demand if a
 * window asks before.
 *
 * Each one starts once the game is idle again: the ones that load documents (the Magias' texts, the wizard's options and
 * skills, its shop's items) make them in one go, and on a row they would hold a weak PC. A player prepares the wizard's
 * catalog and shop (hundreds of documents) only while the wizard can still make one of their characters (CR 1).
 */
import { SYSTEM_ID } from "../settings.mjs";
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
 * Until the game is idle.
 * @param {number} timeout   At most so long (ms)
 * @param {number} wait      So long, where the browser can't tell when it is idle (ms)
 */
const idle = (timeout, wait) => new Promise(resolve => {
  if (window.requestIdleCallback) window.requestIdleCallback(() => resolve(), { timeout });
  else setTimeout(resolve, wait);
});

async function prewarm() {
  // One after the other: each one reads the same compendium indexes (the first fetches them, the others reuse them).
  const steps = [
    () => classSkills(""),
    () => getSkillIndex(),
    ...["race", "class", "subclass"].map(type => () => getOptionIndex(type)),
    () => prewarmMagicCatalog()
  ];
  // The wizard's catalog and shop load hundreds of documents: a player's, only while the wizard can make their character
  if (game.user.isGM || game.actors.some(actor => CreationWizard.canCreate(actor))) steps.push(() => creationCatalog(), () => shopCatalog());
  // The Market's catalog reads every item of the compendiums: only the GM's window, who opens it most
  if (game.user.isGM) steps.push(() => marketCatalog());
  for (const [i, step] of steps.entries()) {
    await (i ? idle(1000, 100) : idle(4000, 1500));
    await step();
  }
}
