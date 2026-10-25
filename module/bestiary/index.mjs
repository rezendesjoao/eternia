/**
 * The bestiary (docs/bestiario.md): what the monsters do besides their skills.
 * - drop-table.mjs  the "Itens Deixados" table written in a description, read without Foundry (also by the tools);
 * - drops.mjs       the drops: the rows kept in the monster (or its description's table), rolled when it falls, given
 *                   to whoever felled it, with a card and the GM's Undo;
 * - drop-tab.mjs    the Itens Deixados tab of the monster sheet;
 * - pack.mjs        the pack: more damage for each ally engaged with the target (read by the damage cards);
 * - rules.mjs       the other monster rules carried by their skills (growing, thresholds, the fall, the boss that
 *                   clears itself, calling the wave);
 * - spawn.mjs       bringing monsters next to a token, in its combat, leaving no drops;
 * - rifts.mjs       the Rifts: scene hazards with a clock of writings and a wave each Setup.
 * The API for macros is `game.eternia.bestiary`.
 */
import { convertTable, dropRows, parseDropTable, rollDrops, undoDrop, registerDrops } from "./drops.mjs";
import { registerMonsterRules } from "./rules.mjs";
import { isRift, registerRifts, riftState, writeRift } from "./rifts.mjs";
import { spawnNear } from "./spawn.mjs";

/** Call during the `init` hook. */
export function registerBestiary() {
  registerDrops();
  registerMonsterRules();
  registerRifts();
  game.eternia.bestiary = {
    rollDrops,
    undoDrop,
    dropRows,
    convertTable,
    parseDropTable,
    spawnNear,
    isRift,
    riftState,
    writeRift
  };
}
