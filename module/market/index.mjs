/**
 * The Market (market.mjs, catalog.mjs, shops.mjs): the "Mercado" button of the token controls, the world setting of
 * what the players see in it, the counters drawn again when a shop or a buyer changes, and the API for macros
 * (`game.eternia.market`).
 */
import { SYSTEM_ID, setting } from "../settings.mjs";
import { isMerchant } from "../piles/pile-utils.mjs";
import { clearMarketCatalog, marketCatalog, registerMarketCatalog } from "./catalog.mjs";
import { EterniaMarket, openMarkets } from "./market.mjs";
import { addToShop, buyFromShop, createShop, createShopDialog, marketPurchase, placeShop } from "./shops.mjs";

/** Call during the `init` hook. */
export function registerMarket() {
  game.settings.register(SYSTEM_ID, "marketPlayers", {
    name: "ETERNIA.Settings.marketPlayers.Name",
    hint: "ETERNIA.Settings.marketPlayers.Hint",
    scope: "world",
    config: true,
    type: String,
    choices: {
      all: "ETERNIA.Settings.marketPlayers.all",
      sale: "ETERNIA.Settings.marketPlayers.sale",
      none: "ETERNIA.Settings.marketPlayers.none"
    },
    default: "all",
    onChange: () => {
      ui.controls?.render({ reset: true });
      if (!game.user.isGM) for (const app of openMarkets()) if (!app.isShop) app.close();
    }
  });

  registerMarketCatalog();

  // The button: the last tool of the token controls
  Hooks.on("getSceneControlButtons", controls => {
    const tokens = controls.tokens;
    if (!tokens?.tools) return;
    tokens.tools.eterniaMarket = {
      name: "eterniaMarket",
      title: "ETERNIA.Market.Button",
      icon: "fa-solid fa-store",
      order: Object.keys(tokens.tools).length,
      button: true,
      visible: EterniaMarket.canOpen(),
      onChange: () => EterniaMarket.toggle()
    };
  });

  // A shop that changes (its wares, its stock, open or closed) or a buyer that does (gold, items): their windows
  const touched = actor => {
    if (!(actor instanceof Actor)) return;
    for (const app of openMarkets()) {
      const kind = app.touches(actor);
      if (!kind) continue;
      if ((kind === "shop") && !isMerchant(actor)) app.close();
      else app.refresh(kind);
    }
  };
  Hooks.on("updateActor", actor => touched(actor));
  Hooks.on("updateToken", token => touched(token.actor));
  for (const hook of ["createItem", "updateItem", "deleteItem"]) Hooks.on(hook, item => touched(item.parent));
  Hooks.on("deleteActor", actor => {
    for (const app of openMarkets()) if (app.merchant?.uuid === actor.uuid) app.close();
  });
  // The token selected is who buys
  Hooks.on("controlToken", () => {
    for (const app of openMarkets()) app.refresh("buyer");
  });
  // An item of a compendium or of the world changed: an open Market reads its catalog again
  let stale = null;
  const reread = () => {
    clearTimeout(stale);
    stale = setTimeout(() => {
      for (const app of openMarkets()) if (!app.isShop && app.rendered) app.render();
    }, 400);
  };
  for (const hook of ["createItem", "updateItem", "deleteItem"]) {
    Hooks.on(hook, item => {
      if (!item.parent && (item.pack || item.collection === game.items)) reread();
    });
  }

  game.eternia.market = {
    open: () => EterniaMarket.open(),
    openShop: merchant => EterniaMarket.open({ merchant }),
    catalog: marketCatalog,
    clearCatalog: clearMarketCatalog,
    purchase: marketPurchase,
    buy: buyFromShop,
    createShop,
    createShopDialog,
    addToShop,
    placeShop,
    playersSee: () => setting("marketPlayers")
  };
}
