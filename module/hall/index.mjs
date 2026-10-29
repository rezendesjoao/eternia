/**
 * The Hall of Fame (hall.mjs): the world setting with its entries, the "Hall da Fama" button of the token controls (after
 * the Market and the Grimório), the GM's "Put in the Hall of Fame" in the Actors list's menu, the windows drawn again
 * when the entries change, and the API for macros (`game.eternia.hall`).
 */
import { L, SYSTEM_ID } from "../settings.mjs";
import { HALL_SETTING, HallOfFame, addToHall, hallEntries, removeFromHall, updateHallEntry } from "./hall.mjs";

/** Call during the `init` hook (after the Market and the Grimório: the buttons keep that order). */
export function registerHall() {
  game.settings.register(SYSTEM_ID, HALL_SETTING, {
    scope: "world",
    config: false,
    type: Array,
    default: [],
    onChange: () => {
      for (const app of HallOfFame.instances) if (app.rendered) app.render();
    }
  });

  Hooks.on("getSceneControlButtons", controls => {
    const tokens = controls.tokens;
    if (!tokens?.tools) return;
    tokens.tools.eterniaHall = {
      name: "eterniaHall",
      title: "ETERNIA.Hall.Button",
      icon: "fa-solid fa-building-columns",
      order: Object.keys(tokens.tools).length,
      button: true,
      visible: true,
      onChange: () => HallOfFame.toggle()
    };
  });

  // The GM's menu of a character in the Actors list
  Hooks.on("getActorContextOptions", (app, options) => {
    const actorOf = li => game.actors.get(li?.dataset?.entryId);
    options.push({
      label: "ETERNIA.Hall.ContextAdd",
      icon: '<i class="fa-solid fa-building-columns"></i>',
      visible: li => game.user.isGM && (actorOf(li)?.type === "character") && !hallEntries().some(e => e.uuid === actorOf(li)?.uuid),
      onClick: async (event, li) => {
        const entry = await addToHall(actorOf(li ?? event?.currentTarget));
        if (entry) {
          ui.notifications.info(L("Hall.Added", { name: entry.name }));
          HallOfFame.open({ select: entry.id });
        }
      }
    });
  });

  game.eternia.hall = {
    open: () => HallOfFame.open(),
    entries: hallEntries,
    add: addToHall,
    update: updateHallEntry,
    remove: removeFromHall
  };
}
