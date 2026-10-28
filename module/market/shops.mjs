/**
 * Shops and what is bought (module/market/market.mjs):
 *   - the GM buys or gives the Market's items to a character (marketPurchase), the gold paid from the character;
 *   - a shop is a merchant pile (module/piles/): the GM makes one from the items marked in the Market (createShopDialog:
 *     the name, the shopkeeper's picture and greeting, the prices, the stock and the reach, and its token on the scene
 *     being viewed) or puts more items in one (addToShop);
 *   - a player buys in a shop through the GM (buyFromShop: the piles' buyItem, which checks the reach, the stock, the
 *     gold and the inventory's space).
 */
import { L, SYSTEM_ID } from "../settings.mjs";
import { escape, toInt } from "../helpers/utils.mjs";
import { boxContent } from "../helpers/dialogs.mjs";
import { DEFAULT_IMAGES, MAX_TICKETS, MAX_UNITS, SETTINGS, SOUNDS, STOCK_FLAG } from "../piles/pile-config.mjs";
import { freeSpace, getGold, getStock, goldPath, isMerchant, isPile } from "../piles/pile-utils.mjs";
import { request } from "../piles/pile-socket.mjs";

/** The flag of the Actor folder the shops made in the Market go to. */
const FOLDER_FLAG = "shops";

/* -------------------------------------------- */
/*  Who buys, and the shops                     */
/* -------------------------------------------- */

const byName = (a, b) => a.name.localeCompare(b.name, game.i18n.lang);

/**
 * The characters the GM buys for and gives to: the selected tokens' characters first, then the players' characters.
 * @returns {Actor[]}
 */
export function buyerOptions() {
  const controlled = (canvas.ready ? canvas.tokens.controlled : []).map(t => t.actor)
    .filter(a => a && (a.type === "character"));
  const players = game.actors.filter(a => (a.type === "character") && a.hasPlayerOwner).sort(byName);
  return [...new Set([...controlled, ...players])];
}

/** The shops of the world (merchant piles), by name. */
export function worldShops() {
  return game.actors.filter(a => isMerchant(a)).sort(byName);
}

/* -------------------------------------------- */
/*  Feedback                                    */
/* -------------------------------------------- */

const playCoins = () => foundry.audio.AudioHelper.play({ src: SOUNDS.coins, volume: 0.6, autoplay: true, loop: false }, false);

/** A line in the chat, as the piles write theirs (their setting turns both off). */
async function log(text, icon = "fa-coins") {
  if (!game.settings.get(SYSTEM_ID, SETTINGS.chatLog)) return;
  await ChatMessage.create({
    content: `<div class="eternia-pile-log"><i class="fas ${icon}"></i> ${text}</div>`,
    speaker: { alias: game.i18n.localize("ETERNIA.Piles.ChatAlias") }
  });
}

const unitsLabel = (name, quantity) => ((quantity > 1) ? `${name} ×${quantity}` : name);

/* -------------------------------------------- */
/*  Item data                                   */
/* -------------------------------------------- */

/**
 * The data of an item to create on a character or a shop: a compendium item keeps its source; never equipped.
 * @param {Item} doc
 */
function itemData(doc) {
  const data = doc.pack ? game.items.fromCompendium(doc, { clearFolder: true }) : doc.toObject();
  delete data._id;
  delete data.folder;
  delete data.ownership;
  if (data.system && ("equipped" in data.system)) data.system.equipped = false;
  if (data.flags?.[SYSTEM_ID]) delete data.flags[SYSTEM_ID][STOCK_FLAG];
  return data;
}

/* -------------------------------------------- */
/*  The GM buys or gives                        */
/* -------------------------------------------- */

/**
 * The GM buys an item of the Market for a character (its gold pays), or gives it.
 * @param {Actor} buyer
 * @param {object} entry          A catalog entry (catalog.mjs)
 * @param {object} [options]
 * @param {number} [options.quantity=1]
 * @param {boolean} [options.free=false]   A gift: nothing is paid
 * @returns {Promise<boolean>}
 */
export async function marketPurchase(buyer, entry, { quantity = 1, free = false } = {}) {
  if (!game.user.isGM || !buyer || !entry) return false;
  const doc = await fromUuid(entry.uuid);
  if (!doc) return false;
  const ticket = doc.type === "ticket";
  const qty = Math.clamp(Math.floor(Number(quantity) || 1), 1, ticket ? MAX_TICKETS : MAX_UNITS);
  const units = ticket ? 1 : qty;
  if (!ticket && (freeSpace(buyer) < units)) {
    ui.notifications.warn(game.i18n.format("ETERNIA.Piles.Error.InventoryFull", { actor: buyer.name, item: doc.name }));
    return false;
  }
  const cost = free ? 0 : Math.max(0, toInt(doc.system.price)) * qty;
  if (cost > getGold(buyer)) {
    ui.notifications.warn(game.i18n.format("ETERNIA.Piles.Error.NotEnoughGold", { actor: buyer.name }));
    return false;
  }
  // A ticket the buyer already has gets the new ones on its stack
  const stack = ticket ? buyer.items.find(i => (i.type === "ticket") && (i.name === doc.name)) : null;
  if (stack) await stack.update({ "system.quantity": Math.max(0, toInt(stack.system.quantity)) + qty });
  else {
    const data = itemData(doc);
    if (ticket) data.system.quantity = qty;
    await buyer.createEmbeddedDocuments("Item", Array.from({ length: units }, () => foundry.utils.deepClone(data)));
  }
  if (cost) await buyer.update({ [goldPath(buyer)]: getGold(buyer) - cost });
  const item = escape(unitsLabel(doc.name, qty));
  await log(free ? L("Market.Log.Give", { actor: escape(buyer.name), item }) : L("Market.Log.Buy", { actor: escape(buyer.name), item, gold: cost }),
    free ? "fa-gift" : "fa-coins");
  playCoins();
  return true;
}

/* -------------------------------------------- */
/*  Buying in a shop                            */
/* -------------------------------------------- */

/**
 * Buy units of a shop's item, through the GM (module/piles/pile-operations.mjs, buyItem).
 * @param {Actor} merchant
 * @param {Item} item       The shop's item
 * @param {Actor} buyer
 * @param {number} [quantity=1]
 * @returns {Promise<boolean>}
 */
export async function buyFromShop(merchant, item, buyer, quantity = 1) {
  if (!merchant || !item || !buyer) return false;
  const result = await request("buyItem", { merchantUuid: merchant.uuid, itemId: item.id, buyerUuid: buyer.uuid, quantity });
  if (!result?.ok) {
    ui.notifications.warn(game.i18n.format(result?.error ?? "ETERNIA.Piles.Error.Generic", result?.errorData ?? {}));
    return false;
  }
  playCoins();
  return true;
}

/* -------------------------------------------- */
/*  Stocking a shop                             */
/* -------------------------------------------- */

/** The item of a shop that is the same as an entry (its source, else its name and type). */
function sameWare(merchant, doc) {
  return merchant.items.find(i => (doc.pack && (i._stats?.compendiumSource === doc.uuid))
    || ((i.name === doc.name) && (i.type === doc.type)));
}

/**
 * Put items of the Market in a shop. One it sells already gets the new stock on top (an infinite stock stays so).
 * @param {Actor} merchant
 * @param {object[]} entries   Catalog entries (or {uuid})
 * @param {object} [options]
 * @param {number} [options.stock=-1]  The stock of each one (-1: infinite)
 * @returns {Promise<{added: number, more: number}>}
 */
export async function addToShop(merchant, entries, { stock = -1 } = {}) {
  if (!game.user.isGM || !isMerchant(merchant)) return { added: 0, more: 0 };
  const docs = await Promise.all(entries.map(e => fromUuid(e.uuid)));
  const create = [];
  const updates = [];
  for (const doc of docs.filter(Boolean)) {
    const ware = sameWare(merchant, doc) ?? create.find(d => (d.name === doc.name) && (d.type === doc.type));
    if (ware) {
      const current = (ware instanceof Item) ? getStock(ware) : ware.flags[SYSTEM_ID][STOCK_FLAG];
      if ((current === -1) || (stock === -1)) continue;
      if (ware instanceof Item) updates.push({ _id: ware.id, [`flags.${SYSTEM_ID}.${STOCK_FLAG}`]: current + stock });
      else ware.flags[SYSTEM_ID][STOCK_FLAG] = current + stock;
      continue;
    }
    const data = itemData(doc);
    foundry.utils.setProperty(data, `flags.${SYSTEM_ID}.${STOCK_FLAG}`, stock);
    create.push(data);
  }
  if (create.length) await merchant.createEmbeddedDocuments("Item", create);
  if (updates.length) await merchant.updateEmbeddedDocuments("Item", updates);
  return { added: create.length, more: updates.length };
}

/* -------------------------------------------- */
/*  A new shop                                  */
/* -------------------------------------------- */

/** The folder of the shops made in the Market (made the first time). */
async function shopFolder() {
  const found = game.folders.find(f => (f.type === "Actor") && f.getFlag(SYSTEM_ID, FOLDER_FLAG));
  if (found) return found;
  return Folder.implementation.create({
    name: L("Market.Shop.Folder"), type: "Actor", color: "#7a5a14", flags: { [SYSTEM_ID]: { [FOLDER_FLAG]: true } }
  });
}

/**
 * Make a shop: a merchant pile with the items, players may open it (Limited), and its token on the scene.
 * @param {object} options
 * @param {string} options.name
 * @param {string} [options.img]
 * @param {string} [options.description]   The shopkeeper's greeting (HTML)
 * @param {object[]} [options.entries]     Catalog entries
 * @param {number} [options.stock=-1]
 * @param {number} [options.buyPercent=100]   What the shop asks, in % of the price
 * @param {boolean} [options.acceptsSales=true]
 * @param {number} [options.sellPercent=10]   What it pays for what it buys (the used gear: treasures and magic items have their own share, economy/data.mjs)
 * @param {number} [options.distance=-1]      How near a character must be (-1: anywhere on the scene)
 * @param {boolean} [options.place=true]      Put its token in the middle of the scene being viewed
 * @returns {Promise<Actor|null>}
 */
export async function createShop({
  name, img, description = "", entries = [], stock = -1, buyPercent = 100, acceptsSales = true, sellPercent = 10,
  distance = -1, place = true
} = {}) {
  if (!game.user.isGM) return null;
  img ||= DEFAULT_IMAGES.merchant;
  name = String(name ?? "").trim() || L("Market.Shop.DefaultName");
  const folder = await shopFolder();
  const actor = await Actor.implementation.create({
    name,
    type: "pile",
    img,
    folder: folder?.id ?? null,
    system: {
      mode: "merchant",
      description,
      distance,
      merchant: {
        open: true,
        acceptsSales,
        resellSold: false,
        infiniteGold: true,
        buyMultiplier: Math.max(0, toInt(buyPercent)) / 100,
        sellMultiplier: Math.max(0, toInt(sellPercent)) / 100
      }
    },
    ownership: { default: CONST.DOCUMENT_OWNERSHIP_LEVELS.LIMITED },
    prototypeToken: {
      name,
      actorLink: true,
      texture: { src: img },
      disposition: CONST.TOKEN_DISPOSITIONS.NEUTRAL,
      displayName: CONST.TOKEN_DISPLAY_MODES.ALWAYS
    }
  });
  if (!actor) return null;
  if (entries.length) await addToShop(actor, entries, { stock });
  if (place) await placeShop(actor);
  return actor;
}

/** Put a shop's token in the middle of the scene being viewed (on the level being viewed). */
export async function placeShop(actor) {
  const scene = canvas.ready ? canvas.scene : null;
  if (!scene || !actor) return null;
  const { x, y } = canvas.stage.pivot;
  const point = scene.grid.getTopLeftPoint({ x, y });
  const level = canvas.level;
  const data = (await actor.getTokenDocument({ x: point.x, y: point.y, level: level?.id, elevation: level?.elevation?.base ?? 0 })).toObject();
  const [token] = await scene.createEmbeddedDocuments("Token", [data]);
  return token ?? null;
}

/**
 * The box of a new shop: its name, the shopkeeper's picture (or an actor dropped on the box, whose name and picture
 * it takes) and greeting, the prices, whether it buys from the players, the stock of each item, the reach and whether
 * its token goes on the scene.
 * @param {object[]} entries   The items it will sell
 * @returns {Promise<Actor|null>}
 */
export async function createShopDialog(entries = []) {
  if (!game.user.isGM) return null;
  const reach = [-1, 1, 3].map(n => `<option value="${n}"${n === -1 ? " selected" : ""}>${escape(L(`Market.Shop.Reach.${n < 0 ? "any" : n}`))}</option>`).join("");
  const field = (label, input, hint = "") => `<div class="form-group lhd-field"><label>${escape(label)}</label>`
    + `<div class="form-fields">${input}</div>${hint ? `<p class="hint">${escape(hint)}</p>` : ""}</div>`;
  const body = `<div class="mk-new-shop">
    <div class="mk-new-shop-who" data-drop="actor">
      <img class="mk-new-shop-img" src="${DEFAULT_IMAGES.merchant}" alt="">
      <p>${escape(L("Market.Shop.DropActor"))}</p>
    </div>
    ${field(L("Market.Shop.Name"), `<input type="text" name="name" value="${escape(L("Market.Shop.DefaultName"))}" autofocus>`)}
    ${field(L("Market.Shop.Img"), `<file-picker name="img" type="image" value="${DEFAULT_IMAGES.merchant}"></file-picker>`)}
    ${field(L("Market.Shop.Greeting"), `<textarea name="greeting" rows="2" placeholder="${escape(L("Market.Shop.GreetingHint"))}"></textarea>`)}
    ${field(L("Market.Shop.BuyPercent"), `<input type="number" name="buyPercent" value="100" min="0" step="5">`)}
    ${field(L("Market.Shop.Buys"), `<input type="checkbox" name="acceptsSales" checked><input type="number" name="sellPercent" value="10" min="0" step="5" data-tooltip="${escape(L("Market.Shop.SellPercent"))}">`, L("Market.Shop.BuysHint"))}
    ${field(L("Market.Shop.Stock"), `<input type="number" name="stock" min="1" step="1" placeholder="∞">`, L("Market.Shop.StockHint"))}
    ${field(L("Market.Shop.Reach.Label"), `<select name="distance">${reach}</select>`)}
    ${field(L("Market.Shop.Place"), `<input type="checkbox" name="place"${canvas.ready && canvas.scene ? " checked" : " disabled"}>`)}
  </div>`;
  const content = boxContent({
    eyebrow: L("Market.Shop.Eyebrow"),
    heading: L("Market.Shop.Heading", { n: entries.length }),
    lead: L("Market.Shop.Lead"),
    body
  });
  const data = await foundry.applications.api.DialogV2.input({
    window: { title: L("Market.Shop.Title"), icon: "fa-solid fa-store" },
    classes: ["eternia", "lhd-box", "mk-shop-box"],
    position: { width: 520 },
    content,
    ok: { label: L("Market.Shop.Create"), icon: "fa-solid fa-store" },
    rejectClose: false,
    render: (event, dialog) => {
      const form = dialog.element.querySelector("form");
      const zone = form.querySelector("[data-drop='actor']");
      const picker = form.querySelector("file-picker[name='img']");
      const preview = form.querySelector(".mk-new-shop-img");
      picker?.addEventListener("change", () => { preview.src = picker.value || DEFAULT_IMAGES.merchant; });
      // An actor dropped on the box (a shopkeeper of the NPCs): its name, its picture and the picture of its token
      zone.addEventListener("dragover", ev => {
        ev.preventDefault();
        zone.classList.add("over");
      });
      zone.addEventListener("dragleave", () => zone.classList.remove("over"));
      zone.addEventListener("drop", async ev => {
        ev.preventDefault();
        zone.classList.remove("over");
        const drop = foundry.applications.ux.TextEditor.implementation.getDragEventData(ev);
        if (drop?.type !== "Actor") return;
        const actor = await fromUuid(drop.uuid);
        if (!actor || isPile(actor)) return;
        const src = actor.prototypeToken?.texture?.src || actor.img;
        form.elements.name.value = actor.name;
        picker.value = src;
        preview.src = src;
        zone.querySelector("p").textContent = L("Market.Shop.FromActor", { name: actor.name });
      });
      const sells = form.elements.acceptsSales;
      const percent = form.elements.sellPercent;
      const sync = () => { percent.disabled = !sells.checked; };
      sells.addEventListener("change", sync);
      sync();
    }
  });
  if (!data) return null;
  const greeting = String(data.greeting ?? "").trim();
  const actor = await createShop({
    name: data.name,
    img: data.img,
    description: greeting ? `<p>${escape(greeting)}</p>` : "",
    entries,
    stock: (toInt(data.stock) > 0) ? toInt(data.stock) : -1,
    buyPercent: data.buyPercent ?? 100,
    acceptsSales: !!data.acceptsSales,
    sellPercent: data.sellPercent ?? 10,
    distance: toInt(data.distance ?? -1),
    place: !!data.place
  });
  if (actor) ui.notifications.info(L("Market.Shop.Created", { name: actor.name, n: entries.length }));
  return actor;
}

/**
 * Put the items in a shop chosen in a box (the world's shops; the one asked first).
 * @param {object[]} entries
 * @param {Actor} [preferred]
 * @returns {Promise<Actor|null>}  The shop
 */
export async function chooseShop(entries, preferred = null) {
  const shops = worldShops();
  if (!shops.length) {
    ui.notifications.warn(L("Market.Shop.None"));
    return null;
  }
  const options = shops.map(s => `<option value="${s.id}"${s === preferred ? " selected" : ""}>${escape(s.name)} (${s.items.size})</option>`).join("");
  const data = await foundry.applications.api.DialogV2.input({
    window: { title: L("Market.Shop.AddTitle"), icon: "fa-solid fa-store" },
    classes: ["eternia", "lhd-box"],
    position: { width: 440 },
    content: boxContent({
      eyebrow: L("Market.Shop.Eyebrow"),
      heading: L("Market.Shop.AddHeading", { n: entries.length }),
      body: `<div class="form-group lhd-field"><label>${escape(L("Market.Shop.Which"))}</label><select name="shop">${options}</select></div>
        <div class="form-group lhd-field"><label>${escape(L("Market.Shop.Stock"))}</label><input type="number" name="stock" min="1" step="1" placeholder="∞"></div>`
    }),
    ok: { label: L("Market.Shop.Add"), icon: "fa-solid fa-plus" },
    rejectClose: false
  });
  const shop = data ? game.actors.get(data.shop) : null;
  if (!shop) return null;
  const { added, more } = await addToShop(shop, entries, { stock: (toInt(data.stock) > 0) ? toInt(data.stock) : -1 });
  ui.notifications.info(L("Market.Shop.Added", { name: shop.name, n: added, more }));
  return shop;
}
