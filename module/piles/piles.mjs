/**
 * Piles: loot on the floor, chests and merchants, plus item/gold transfers
 * between players. Inspired by the Item Piles module, built into the system.
 */
import { PILE_TYPE, SETTINGS } from "./pile-config.mjs";
import { initSocket } from "./pile-socket.mjs";
import { registerOperations } from "./pile-operations.mjs";
import { PilesAPI, onDropCanvasData } from "./pile-api.mjs";
import { actorTokens, isMerchant, isPile } from "./pile-utils.mjs";
import { EterniaPileSheet } from "./pile-sheet.mjs";

/** Called from the system's init hook. */
export function registerPiles() {
  game.eternia.piles = PilesAPI;

  CONFIG.Actor.typeLabels ??= {};
  CONFIG.Actor.typeLabels[PILE_TYPE] = "TYPES.Actor.pile";

  foundry.documents.collections.Actors.registerSheet("eternia", EterniaPileSheet, {
    types: [PILE_TYPE],
    makeDefault: true,
    label: "ETERNIA.Piles.SheetLabel"
  });

  game.settings.register("eternia", SETTINGS.chatLog, {
    name: "ETERNIA.Piles.Settings.ChatLog.Name",
    hint: "ETERNIA.Piles.Settings.ChatLog.Hint",
    scope: "world",
    config: true,
    type: Boolean,
    default: true
  });

  // How each user sorts/filters pile contents (personal preference).
  game.settings.register("eternia", SETTINGS.view, {
    scope: "client",
    config: false,
    type: Object,
    default: { sort: "manual", type: "all" }
  });

  // Piles can't hold active effects of their own (statuses from the token HUD,
  // effects dropped on the sheet...). Effects on their items are left untouched.
  Hooks.on("preCreateActiveEffect", effect => {
    if (isPile(effect.parent)) return false;
  });

  registerOperations();
  Hooks.on("dropCanvasData", onDropCanvasData);

  // Pile windows show the interacting character's gold and items: keep them fresh when that character changes (a pile's
  // own changes render its sheet already), or any actor while an open shop's description has links or rolls.
  const refresh = doc => {
    const actor = (doc instanceof Actor) ? doc : doc.parent;
    if (!(actor instanceof Actor) || isPile(actor)) return;
    if (mayInteract(actor) || linkingShop()) refreshPileSheets();
  };
  Hooks.on("updateActor", refresh);
  Hooks.on("createItem", refresh);
  Hooks.on("updateItem", refresh);
  Hooks.on("deleteItem", refresh);
  Hooks.on("controlToken", () => refreshPileSheets());

  Hooks.once("ready", () => {
    initSocket();
    if (game.user.isGM && game.modules.get("item-piles")?.active) {
      ui.notifications.info(game.i18n.localize("ETERNIA.Piles.ItemPilesActive"));
    }
  });
}

/**
 * Whether an actor may be the one a pile window shows as interacting (pile-utils.mjs getInteractingActor: a controlled
 * token's actor, else the user's character), or the world actor behind it.
 * @param {Actor} actor
 */
function mayInteract(actor) {
  const candidates = canvas?.ready ? canvas.tokens.controlled.map(t => t.actor) : [];
  candidates.push(game.user.character);
  return candidates.some(a => a && ((a === actor) || (a.uuid === actor.uuid)
    || (a.isToken && (a.token?.baseActor === actor))));
}

/** Whether an open shop's description has links or rolls: their text may show other actors, and is enriched anew. */
function linkingShop() {
  return foundry.applications.instances.values().some(app => (app instanceof EterniaPileSheet) && isMerchant(app.actor)
    && /@|\[\[/.test(app.actor.system.description ?? ""));
}

let refreshTimeout = null;
function refreshPileSheets() {
  clearTimeout(refreshTimeout);
  refreshTimeout = setTimeout(() => {
    for (const app of foundry.applications.instances.values()) {
      if ((app instanceof EterniaPileSheet) && app.rendered) app.render();
    }
  }, 50);
}

/**
 * Update the image of a chest's tokens to match its open/closed state.
 * @param {Actor} pile
 * @param {object} [changes]  Pending system.chest changes. Synthetic (token)
 *                            actors call _onUpdate before refreshing their data.
 */
export async function syncChestImage(pile, changes = {}) {
  if (!isPile(pile) || (pile.system.mode !== "chest")) return;
  const chest = foundry.utils.mergeObject(pile.system.chest ?? {}, changes, { inplace: false });
  const src = chest.closed ? chest.imgClosed : (chest.imgOpen || pile.img);
  if (!src) return;
  for (const token of actorTokens(pile)) {
    if (token.texture.src !== src) await token.update({ "texture.src": src });
  }
}
