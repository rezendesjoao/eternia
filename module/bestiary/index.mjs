/**
 * The bestiary (docs/bestiario.md): what the monsters do besides their skills.
 * - drop-table.mjs  the "Itens Deixados" table written in a description, read without Foundry (also by the tools);
 * - drops.mjs       the drops: the rows kept in the monster (or its description's table), rolled when it falls, given
 *                   to whoever felled it, with a card and the GM's Undo;
 * - drop-tab.mjs    the Itens Deixados tab of the monster sheet;
 * - pack.mjs        the pack: more damage for each ally engaged with the target (read by the damage cards);
 * - rules.mjs       the other monster rules carried by their skills (growing, thresholds, the fall, the boss that
 *                   clears itself, calling the wave, the recharge, the tag that strikes, the light hand, the offer,
 *                   the troop's losses, the retreat, the forgetting);
 * - recharge.mjs    which skills recharge and which are spent (read by automation/use.mjs);
 * - troop.mjs       the troop: a band in one token, hit double by areas, its area attacks one target less per loss;
 * - save.mjs        saving the Stray: the card with the Save button, Negotiation against its Resistance, the GM's
 *                   Connection;
 * - named-template.mjs, named.mjs  the named beast: the template (without Foundry) and the monster sheet's crown;
 * - spawn.mjs       bringing monsters next to a token, in its combat, leaving no drops;
 * - rifts.mjs       the Rifts: scene hazards with a clock of writings and a wave each Setup;
 * - rampage.mjs, rush.mjs, surprise.mjs, throw.mjs  the bloodlust (an action at once for each creature it fells), the
 *                   rush at a foe (a use action), the surprise blow (more dice against whoever hasn't acted) and the
 *                   throw (a body thrown at a creature, which takes the impact).
 * The API for macros is `game.eternia.bestiary`.
 */
import { convertTable, dropRows, parseDropTable, rollDrops, undoDrop, registerDrops } from "./drops.mjs";
import { registerMonsterRules } from "./rules.mjs";
import { isRift, registerRifts, riftState, writeRift } from "./rifts.mjs";
import { spawnNear } from "./spawn.mjs";
import { canBeSaved, registerSave, trySave } from "./save.mjs";
import { nameMonster } from "./named.mjs";
import { MARKS, nameBeast } from "./named-template.mjs";
import { registerRampage } from "./rampage.mjs";
import { registerRush } from "./rush.mjs";
import { registerThrow, throwCreature } from "./throw.mjs";

/** Call during the `init` hook. */
export function registerBestiary() {
  registerDrops();
  registerMonsterRules();
  registerRifts();
  registerSave();
  registerRampage();
  registerRush();
  registerThrow();
  game.eternia.bestiary = {
    rollDrops,
    undoDrop,
    dropRows,
    convertTable,
    parseDropTable,
    spawnNear,
    isRift,
    riftState,
    writeRift,
    trySave,
    canBeSaved,
    nameMonster,
    nameBeast,
    marks: MARKS,
    throwCreature
  };
}
