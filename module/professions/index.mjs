/**
 * Professions: the Eternia subclasses (docs/profissoes.md).
 *   data.mjs     the ten professions, the Rank ladder, the quality table and the enhancements
 *   state.mjs    a character's profession, EXP, Rank, attempts per scenario and materials
 *   forge.mjs    the items they make (crafted items rebuilt from their base), scrolls and banquets
 *   actions.mjs  Workshop, Fusion, Retouch, sales, Gathering and the talents, with their chat cards
 *   traps.mjs    the Engineer's traps (Regions that go off on an enemy)
 *   bench.mjs    the window of the profession's actions
 *   sheet.mjs    the profession tab of the character sheet
 */
import { SYSTEM_ID } from "../settings.mjs";
import { counter } from "../automation/scenes.mjs";
import { registerHandler } from "../piles/pile-socket.mjs";
import { isLocalChange } from "../helpers/clients.mjs";
import { toInt } from "../helpers/utils.mjs";
import { PROFESSION_TEMPLATES, ProfessionBench } from "./bench.mjs";
import { onSharpenRequest } from "./actions.mjs";
import { onTrapRequest, registerTraps } from "./traps.mjs";
import { professionOf, record } from "./state.mjs";

/** A Sharpen lasts until the scenario of the weapon's owner ends. */
async function endSharpen(actor) {
  const now = counter(actor, "scenario");
  for (const item of actor.items) {
    const ids = item.effects.filter(e => {
      const sharpen = e.getFlag(SYSTEM_ID, "sharpen");
      return sharpen && (toInt(sharpen.scenario) < now);
    }).map(e => e.id);
    if (ids.length) await item.deleteEmbeddedDocuments("ActiveEffect", ids);
  }
}

/** Call during the `init` hook. */
export function registerProfessions() {
  foundry.applications.handlebars.loadTemplates(PROFESSION_TEMPLATES);
  registerHandler("professionSharpen", onSharpenRequest);
  registerHandler("professionTrap", onTrapRequest);
  registerTraps();
  Hooks.on("updateActor", (actor, changed, options, userId) => {
    if (!isLocalChange(options, userId) || !foundry.utils.hasProperty(changed, `flags.${SYSTEM_ID}.scenario`)) return;
    endSharpen(actor).catch(err => console.error(`${SYSTEM_ID} | Could not end the Sharpen of ${actor.uuid}`, err));
  });
}

/** For macros: game.eternia.professions. */
export const professionsApi = {
  open: (actor, mode) => ProfessionBench.open(actor, mode),
  of: professionOf,
  addExp: (actor, exp) => record(actor, { exp })
};
