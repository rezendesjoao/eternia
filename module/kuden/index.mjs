/**
 * Kuden (house rule), turned on by the `kuden` setting:
 * - pieces.mjs       pieces, PK paid with the system's skill picks, the Resource, the color gifts;
 * - conditions.mjs   new condition types (Resource, scene environment, Boss / Raid target, HP %);
 * - env.mjs          the environment of each scene (hour, open sky, darkness, miasma);
 * - item-sheet.mjs   the Kuden tab of the skill sheet.
 * The Kuden tab of the character sheet is in character-sheet.mjs (templates/character/kuden.hbs).
 */
import { setting } from "../settings.mjs";
import { isLocalChange } from "../helpers/clients.mjs";
import { registerKudenConditions } from "./conditions.mjs";
import { registerEnv } from "./env.mjs";
import { registerKudenItemSheet } from "./item-sheet.mjs";
import { announceSettle, isKuden, marksOf } from "./pieces.mjs";

/** Call during the `init` hook. */
export function registerKuden() {
  registerEnv();
  registerKudenConditions();
  registerKudenItemSheet();

  // A piece that comes from somewhere else (compendium, another character) doesn't bring the picks that paid for it.
  Hooks.on("preCreateItem", (item, data, options) => {
    if (!setting("kuden") || !isKuden(item) || !(item.parent instanceof Actor) || options.eterniaKudenNew) return;
    if (marksOf(item).length) item.updateSource({ flags: { eternia: { skillPicks: [] } } });
  });
  // ... and is paid here with the pending picks.
  Hooks.on("createItem", (item, options, userId) => {
    if (!setting("kuden") || !isKuden(item) || !(item.parent instanceof Actor) || options.eterniaKudenNew) return;
    if (isLocalChange(options, userId)) announceSettle(item.parent);
  });
}
