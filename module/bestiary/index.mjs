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
 * - nearest.mjs     the monster that attacks the nearest creature, ally or enemy (the Flesh Golem's fury);
 * - possess.mjs     the blow that possesses: the monster inside someone, hurt with it, burned out by the light;
 * - heads.mjs       the heads: a Major Action for each, cut by each fifth of the HP, grown back unless burned;
 * - use-checks.mjs  what those three say against using a skill (read by automation/use.mjs).
 * The API for macros is `game.eternia.bestiary`.
 */
import { convertTable, dropRows, parseDropTable, rollDrops, undoDrop, registerDrops } from "./drops.mjs";
import { registerMonsterRules } from "./rules.mjs";
import { isRift, registerRifts, riftState, writeRift } from "./rifts.mjs";
import { spawnNear } from "./spawn.mjs";
import { canBeSaved, registerSave, trySave } from "./save.mjs";
import { nameMonster } from "./named.mjs";
import { MARKS, nameBeast } from "./named-template.mjs";
import { nearestTo, registerNearest } from "./nearest.mjs";
import { possessingOf, registerPossess } from "./possess.mjs";
import { headsOf, registerHeads } from "./heads.mjs";

/** Call during the `init` hook. */
export function registerBestiary() {
  registerDrops();
  registerMonsterRules();
  registerRifts();
  registerSave();
  registerNearest();
  registerPossess();
  registerHeads();
  game.eternia.bestiary = {
    headsOf,
    nearestTo,
    possessingOf,
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
    marks: MARKS
  };
}
