/**
 * What the windows read from the compendiums, prepared while the game is idle once it is ready: the class tab's index
 * of the class skills, the skill browser's index, the races, classes and professions of the option browser, the
 * Magia catalog with the Magias' texts, the creation wizard's catalog and shop and, for the GM, the Market's catalog.
 * The first window of each kind then opens at once instead of waiting for them. Each one is still built on demand if a
 * window asks before.
 */
import { SYSTEM_ID } from "../settings.mjs";
import { classSkills } from "../classes/sheet.mjs";
import { getSkillIndex } from "../apps/skill-browser.mjs";
import { getOptionIndex } from "../apps/option-browser.mjs";
import { prewarmMagicCatalog } from "../apps/magic-catalog.mjs";
import { creationCatalog } from "../apps/creation-catalog.mjs";
import { shopCatalog } from "../apps/starting-gear.mjs";
import { marketCatalog } from "../market/catalog.mjs";

/** Call during the `init` hook. */
export function registerPrewarm() {
  Hooks.once("ready", () => {
    const idle = window.requestIdleCallback ?? (fn => setTimeout(fn, 1500));
    idle(() => prewarm().catch(err => console.warn(`${SYSTEM_ID} | Could not prepare the compendium indexes`, err)),
      { timeout: 4000 });
  });
}

async function prewarm() {
  // One after the other: each one reads the same compendium indexes (the first fetches them, the others reuse them).
  await classSkills("");
  await getSkillIndex();
  for (const type of ["race", "class", "subclass"]) await getOptionIndex(type);
  await prewarmMagicCatalog();
  await creationCatalog();
  await shopCatalog();
  // The Market's catalog loads every item of the compendiums: only the GM's window, who opens it most
  if (game.user.isGM) await marketCatalog();
}
