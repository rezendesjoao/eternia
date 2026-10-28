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
 * - disguise.mjs    the disguise: a token that looks like something else until it acts or is touched;
 * - engulf.mjs      engulfing: the creatures swallowed, the acid of each Setup, the test to get out;
 * - split.mjs       splitting: the blow that cuts a monster in two pieces of the same family;
 * - rust.mjs        rust: the hits that rust the metal worn, and what is metal;
 * - contact.mjs     contact: the statuses of whoever hurts it, by a close blow or a metal weapon;
 * - save.mjs        saving the Stray: the card with the Save button, Negotiation against its Resistance, the GM's
 *                   Connection;
 * - named-template.mjs, named.mjs  the named beast: the template (without Foundry) and the monster sheet's crown;
 * - spawn.mjs       bringing monsters next to a token, in its combat, leaving no drops;
 * - rifts.mjs       the Rifts: scene hazards with a clock of writings and a wave each Setup;
 * - latch.mjs       the latch: a monster stuck to whoever it hurt, draining it each Setup, going where it goes;
 * - gaze.mjs        the gaze: at the start of a turn near the monster, meet it (Resistance) or look away (−1d6);
 * - lure.mjs        the lure: whoever the monster charms walks toward it each turn, until any damage.
 * - rise.mjs        the dead that rise: who falls by a Shadow rises as one, a Necromancer raises the fallen;
 * - stack.mjs       the statuses a monster gives that add up (the Shadow's [Weakened]).
 * - rampage.mjs, rush.mjs, surprise.mjs, throw.mjs  the bloodlust (an action at once for each creature it fells), the
 *                   rush at a foe (a use action), the surprise blow (more dice against whoever hasn't acted) and the
 *                   throw (a body thrown at a creature, which takes the impact).
 * - blink.mjs, likeness.mjs, phase.mjs, halve.mjs  the blink to someone's back, taking a face, the phase out of the
 *                   writing between its turns, the hide that takes half of the physical damage.
 * - nearest.mjs     the monster that attacks the nearest creature, ally or enemy (the Flesh Golem's fury);
 * - possess.mjs     the blow that possesses: the monster inside someone, hurt with it, burned out by the light;
 * - heads.mjs       the heads: a Major Action for each, cut by each fifth of the HP, grown back unless burned;
 * - use-checks.mjs  what those three say against using a skill (read by automation/use.mjs).
 * - breed.mjs, curse.mjs, shuffle.mjs, devour.mjs, spill.mjs, thirst.mjs, bow.mjs  the hares that multiply while
 *                   unhurt, the bite whose curse ends with the one that bit, the badly written creature that changes every
 *                   round, the maw that swallows a shield, the status that spills a creature's strength, the cap that dies
 *                   dry without blood, and the ones that spare whoever bows (the bestiary of 0.47).
 * The API for macros is `game.eternia.bestiary`.
 */
import { convertTable, dropRows, parseDropTable, rollDrops, undoDrop, registerDrops } from "./drops.mjs";
import { registerMonsterRules } from "./rules.mjs";
import { isRift, registerRifts, riftState, writeRift } from "./rifts.mjs";
import { spawnNear } from "./spawn.mjs";
import { canBeSaved, registerSave, trySave } from "./save.mjs";
import { nameMonster } from "./named.mjs";
import { MARKS, nameBeast } from "./named-template.mjs";
import { disguise, isDisguised, registerDisguise, reveal } from "./disguise.mjs";
import { engulf, insideOf, registerEngulf, release } from "./engulf.mjs";
import { registerSplit } from "./split.mjs";
import { isMetal, registerRust } from "./rust.mjs";
import { registerContact } from "./contact.mjs";
import { registerLatch, ripOff } from "./latch.mjs";
import { answerGaze, registerGaze } from "./gaze.mjs";
import { registerLure } from "./lure.mjs";
import { registerRise, riseAs } from "./rise.mjs";
import { registerStack } from "./stack.mjs";
import { registerRampage } from "./rampage.mjs";
import { registerRush } from "./rush.mjs";
import { registerThrow, throwCreature } from "./throw.mjs";
import { registerBlink } from "./blink.mjs";
import { copyLook, registerLikeness, restoreLook } from "./likeness.mjs";
import { isPhased, registerPhase } from "./phase.mjs";
import { nearestTo, registerNearest } from "./nearest.mjs";
import { possessingOf, registerPossess } from "./possess.mjs";
import { headsOf, registerHeads } from "./heads.mjs";
import { registerBreed } from "./breed.mjs";
import { registerCurse } from "./curse.mjs";
import { registerShuffle } from "./shuffle.mjs";
import { giveBack, registerDevour } from "./devour.mjs";
import { registerSpill } from "./spill.mjs";
import { registerThirst } from "./thirst.mjs";
import { registerBow } from "./bow.mjs";

/** Call during the `init` hook. */
export function registerBestiary() {
  registerDrops();
  registerMonsterRules();
  registerRifts();
  registerSave();
  registerDisguise();
  registerEngulf();
  registerSplit();
  registerRust();
  registerContact();
  registerLatch();
  registerGaze();
  registerLure();
  registerRise();
  registerStack();
  registerRampage();
  registerRush();
  registerThrow();
  registerBlink();
  registerLikeness();
  registerPhase();
  registerNearest();
  registerPossess();
  registerHeads();
  registerBreed();
  registerCurse();
  registerShuffle();
  registerDevour();
  registerSpill();
  registerThirst();
  registerBow();
  game.eternia.bestiary = {
    disguise,
    reveal,
    isDisguised,
    engulf,
    release,
    insideOf,
    isMetal,
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
    marks: MARKS,
    ripOff,
    answerGaze,
    riseAs,
    throwCreature,
    copyLook,
    restoreLook,
    isPhased,
    giveBack
  };
}
