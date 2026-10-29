/**
 * The experience (data.mjs: the table and the shares; award.mjs: the monsters' XP; level.mjs: the XP of a character
 * and the NP that follows it; boosts.mjs: the potions and the food; tickets.mjs: the Evolution Ticket): the hooks of a
 * Rift closed and a Stray saved, and the API for macros (`game.eternia.xp`).
 */
import { SYSTEM_ID } from "../settings.mjs";
import { isPrimaryGM } from "../helpers/clients.mjs";
import { XP_TABLE, commonXp, monsterXpValue, rankForXp, shareXp, xpForRank, xpProgress, xpToNext } from "./data.mjs";
import { awardMonster, monsterXp, registerAward, undoXp } from "./award.mjs";
import { addXp, openChoices, registerLevel, setXp, showBanner, xpOf, xpView } from "./level.mjs";
import { boostPct, boostsOf, giveBoost, registerBoosts } from "./boosts.mjs";
import { giveTickets, registerTickets, ticketCount, useTickets, useTicketsDialog } from "./tickets.mjs";

/** Call during the `init` hook. */
export function registerExperience() {
  registerAward();
  registerLevel();
  registerBoosts();
  registerTickets();

  // A Rift closed gives its scene to whoever closed it (bestiary/rifts.mjs); a Stray saved, to whoever saved it
  // (bestiary/save.mjs): both on the GM's window that applied it
  Hooks.on("eternia.riftClosed", (actor, writer) => {
    if (game.user.isGM) awardMonster(actor, { feller: writer ?? null, force: true, reason: "rift" }).catch(err => console.error(`${SYSTEM_ID} | XP failed`, err));
  });
  Hooks.on("eternia.saved", (actor, saver) => {
    if (game.user.isGM) awardMonster(actor, { feller: saver ?? null, force: true, reason: "save" }).catch(err => console.error(`${SYSTEM_ID} | XP failed`, err));
  });

  game.eternia.xp = {
    table: XP_TABLE,
    forRank: xpForRank,
    rankFor: rankForXp,
    toNext: xpToNext,
    progress: xpProgress,
    common: commonXp,
    value: monsterXpValue,
    share: shareXp,
    of: xpOf,
    view: xpView,
    add: addXp,
    set: setXp,
    monster: monsterXp,
    award: (monster, options) => (isPrimaryGM() || game.user.isGM) ? awardMonster(monster, options) : null,
    undo: undoXp,
    boosts: boostsOf,
    boostPct,
    giveBoost,
    giveTickets,
    tickets: ticketCount,
    useTickets,
    useTicketsDialog,
    banner: showBanner,
    choices: openChoices
  };
}
