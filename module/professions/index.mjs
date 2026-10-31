/**
 * Professions: the Eternia subclasses (docs/profissoes.md).
 *   data.mjs       the ten professions, the Rank ladder, the quality table and the enhancements
 *   state.mjs      a character's profession, EXP, Rank, attempts per scenario and materials
 *   forge.mjs      the items they make (crafted items rebuilt from their base), scrolls and banquets
 *   actions.mjs    Workshop, Fusion, Retouch, sales, Gathering and the talents, with their chat cards
 *   skills.mjs     the skills a profession gives (the Sealer's Seal), their attempts and EXP
 *   bench.mjs      the window of the profession's actions
 *   sheet.mjs      the profession tab of the character sheet
 *   migration.mjs  the Bard and the Engineer of before 1.0.1 become the Tamer and the Sealer
 */
import { SYSTEM_ID } from "../settings.mjs";
import { counter } from "../automation/scenes.mjs";
import { registerHandler } from "../piles/pile-socket.mjs";
import { isLocalChange } from "../helpers/clients.mjs";
import { toInt } from "../helpers/utils.mjs";
import { PROFESSION_TEMPLATES, ProfessionBench } from "./bench.mjs";
import { onSharpenRequest, onTrainRequest } from "./actions.mjs";
import { registerProfessionSkills } from "./skills.mjs";
import { professionOf, record } from "./state.mjs";

/** A Sharpen (and a Tamer's training) lasts until the scenario of the item's owner ends. */
async function endSharpen(actor) {
  const now = counter(actor, "scenario");
  for (const item of actor.items) {
    const ids = item.effects.filter(e => {
      const until = e.getFlag(SYSTEM_ID, "sharpen") ?? e.getFlag(SYSTEM_ID, "trained");
      return until && (toInt(until.scenario) < now);
    }).map(e => e.id);
    if (ids.length) await item.deleteEmbeddedDocuments("ActiveEffect", ids);
  }
}

/** Call during the `init` hook. */
export function registerProfessions() {
  foundry.applications.handlebars.loadTemplates(PROFESSION_TEMPLATES);
  registerHandler("professionSharpen", onSharpenRequest);
  registerHandler("professionTrain", onTrainRequest);
  registerProfessionSkills();
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
