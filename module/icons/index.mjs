/**
 * Item icons (docs/icones.md): wherever an item's icon is shown (sheets, compendiums, sidebar, chat, HUD, bench),
 * its <img> swaps to the picture with the frame of its magic grade and the effects of its level.
 *   data.mjs     grades, levels and themes
 *   compose.mjs  the picture (an SVG built in the browser around the Foundry icon)
 */
import { SYSTEM_ID } from "../settings.mjs";
import { lowPerformance } from "../helpers/performance.mjs";
import { MARKET_INDEX_FIELDS, marketPack, packIndex } from "../helpers/pack-index.mjs";
import {
  DEFAULT_THEME, ELEMENT_THEMES, FRAMED_TYPES, GENERIC_ICONS, KIND_THEMES, MOVING_TYPES, TIER_LEVELS
} from "./data.mjs";
import { drawnPictureOf, pictureOf, svgTextOf } from "./compose.mjs";

/**
 * For icons shown outside a sheet: icon path -> {one, byName}, the data of the one look of that path (null when
 * items draw it in different ways, as color variants do) and the data of each item name that uses it.
 */
const registry = new Map();
let observer = null;
/** Waits for the <img> to come near the screen before drawing them. */
let viewer = null;

/** What the compendium indexes must carry to draw an icon. */
const INDEX_FIELDS = ["system.rank", "system.tags", `flags.${SYSTEM_ID}.icon`];

/**
 * The sidebar directories that never show an item icon (their pictures are portraits and scene thumbnails), docked or
 * popped out: what is drawn in them is not looked at.
 */
const PLAIN = ["actors", "scenes", "journal", "playlists"].flatMap(id => [`#${id}`, `#${id}-popout`]).join(", ");
const inPlain = node => !!node.closest?.(PLAIN);

/**
 * Whether the icons move: the client setting, unless the system asks for reduced motion or Foundry runs in its Low
 * performance mode (the weakest computers).
 */
const animated = () => game.settings.get(SYSTEM_ID, "iconEffects")
  && !lowPerformance()
  && !window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/** The magic grade ([M1] to [M7]) of an item from its tags, or 0. */
export function gradeOf(tags) {
  let grade = 0;
  for (const tag of tags ?? []) {
    const match = /^M([1-7])$/.exec(tag);
    if (match) grade = Math.max(grade, Number(match[1]));
  }
  return grade;
}

/**
 * How an item's icon is drawn, or null when it stays as it is.
 * @param {Item|object} data    an item or a compendium index entry
 * @returns {{grade: number, tier: number, theme: string, hue: number, intensity: number, animated: boolean}|null}
 */
export function iconStyleOf(data) {
  if (!data?.img || !FRAMED_TYPES.includes(data.type) || data.img.startsWith(GENERIC_ICONS)) return null;
  const tags = data.system?.tags ?? [];
  const own = foundry.utils.getProperty(data, `flags.${SYSTEM_ID}.icon`) ?? {};
  const level = Number(data.system?.rank) || 0;
  const tier = MOVING_TYPES.includes(data.type) ? TIER_LEVELS.filter(min => level >= min).length : 0;
  const grade = gradeOf(tags);
  const hue = Number(own.hue) || 0;
  if (!grade && !tier && !hue) return null;
  const theme = own.fx ?? tags.map(tag => ELEMENT_THEMES[tag]).find(Boolean) ?? tags.map(tag => KIND_THEMES[tag]).find(Boolean)
    ?? DEFAULT_THEME;
  const intensity = tier >= 2 ? Math.min(1, (level - TIER_LEVELS[1]) / 9) : 0;
  return { grade, tier, theme, hue, intensity: Math.round(intensity * 10) / 10, animated: animated() };
}

const styleKey = style => style && [style.grade, style.tier, style.theme, style.hue, style.intensity].join("|");

/** The icons of the items in the compendiums and the world. */
function buildRegistry() {
  const looks = new Map();
  const add = data => {
    const style = iconStyleOf(data);
    if (!style) return;
    const seen = looks.get(data.img) ?? { styles: new Map(), byName: new Map() };
    seen.styles.set(styleKey(style), data);
    seen.byName.set(data.name, data);
    looks.set(data.img, seen);
  };
  for (const pack of game.packs) if (pack.documentName === "Item") for (const entry of pack.index) add(entry);
  for (const item of game.items) add(item);
  registry.clear();
  for (const [img, { styles, byName }] of looks) {
    registry.set(img, { one: (styles.size === 1) ? styles.values().next().value : null, byName });
  }
}

/**
 * The application an element is in. With `apps`, the answers of one pass over the page (an observer's batch, the first
 * look) are kept for every element walked through, so the <img> of one subtree climb it once; made again each pass, it
 * never answers for an element moved since.
 * @param {Element} element
 * @param {Map<Element, object|null>} [apps]
 */
function appOf(element, apps) {
  const walked = [];
  let app = null;
  for (let node = element; node; node = node.parentElement) {
    if (apps?.has(node)) {
      app = apps.get(node);
      break;
    }
    walked.push(node);
    const found = node.id && foundry.applications.instances.get(node.id);
    if (found) {
      app = found;
      break;
    }
  }
  if (apps) for (const node of walked) apps.set(node, app);
  return app;
}

/** The icon paths of the <img> sources seen (a source always gives the same path in a page), up to PATHS_KEPT. */
const paths = new Map();
const PATHS_KEPT = 5000;

/** The icon path of an <img> source, as items store it. */
function pathOf(src) {
  let path = paths.get(src);
  if (path !== undefined) return path;
  try {
    const url = new URL(src, window.location.href);
    if (url.origin !== window.location.origin) path = src;
    else {
      const route = foundry.utils.getRoute("/");
      path = decodeURIComponent(url.pathname);
      if (path.startsWith(route)) path = path.slice(route.length);
      path = path.replace(/^\/+/, "");
    }
  }
  catch {
    path = src;
  }
  if (paths.size >= PATHS_KEPT) paths.clear();
  paths.set(src, path);
  return path;
}

/**
 * The item an <img> shows: from its sheet row, its sheet, its compendium or sidebar entry, or by its path (and, when
 * items draw that path in different ways, by the name in its alt text, as the chat cards give it).
 * @param {HTMLImageElement} img
 * @param {string} path
 * @param {Map} [apps]   The answers of appOf in this pass
 */
function itemFor(img, path, apps) {
  const app = appOf(img, apps);
  const doc = app?.document;
  const row = img.closest("[data-item-id]");
  if (row) {
    const actor = (doc instanceof Actor) ? doc : app?.actor;
    const item = actor?.items?.get(row.dataset.itemId) ?? game.items.get(row.dataset.itemId);
    if (item?.img === path) return item;
  }
  if ((doc instanceof Item) && (doc.img === path)) return doc;
  const entry = img.closest("[data-entry-id]");
  if (entry && app?.collection) {
    const found = app.collection.index?.get?.(entry.dataset.entryId) ?? app.collection.get?.(entry.dataset.entryId);
    if (found?.img === path) return found;
  }
  const known = registry.get(path);
  return known?.one ?? known?.byName.get(img.alt) ?? null;
}

/** What an <img> shows, when it is an item icon to decorate: its source, icon path and style. */
function targetOf(img, apps) {
  const src = img.getAttribute("src");
  if (!src || src.startsWith("blob:") || src.startsWith("data:")) return null;
  const path = pathOf(src);
  // A path no item draws, whichever it is (the item found always has this img: iconStyleOf leaves the generic icons)
  if (!path || path.startsWith(GENERIC_ICONS)) return null;
  const style = iconStyleOf(itemFor(img, path, apps));
  return style ? { src, path, style } : null;
}

/** Puts the picture in the <img>, unless its source changed meanwhile. */
function swap(img, { src, path }, url) {
  if (img.getAttribute("src") !== src) return;
  img.dataset.etiIcon = path;
  img.src = url;
}

/**
 * Swaps an <img> of an item icon to its picture: at once when the picture is drawn, else when the <img> comes near
 * the screen, so long lists and hidden tabs draw only what is seen.
 * @param {HTMLImageElement} img
 * @param {Map} [apps]   The answers of appOf in this pass
 */
function decorate(img, apps) {
  const target = targetOf(img, apps);
  if (!target) return;
  const url = drawnPictureOf(target.path, target.style);
  if (url) swap(img, target, url);
  else viewer.observe(img);
}

/** Draws the pictures of the <img> that came near the screen. */
function draw(entries) {
  const apps = new Map();
  for (const { target: img, isIntersecting } of entries) {
    if (!isIntersecting) continue;
    viewer.unobserve(img);
    const target = targetOf(img, apps);
    if (!target) continue;
    pictureOf(target.path, target.style).then(url => swap(img, target, url),
      err => console.warn(`${SYSTEM_ID} | Could not draw the icon ${target.path}`, err));
  }
}

/** The <img> of a node and below it. */
function imagesOf(node) {
  if (node.nodeType !== Node.ELEMENT_NODE) return [];
  return (node.tagName === "IMG") ? [node] : node.getElementsByTagName("img");
}

/** Decorates the item icons already shown and the ones that come. */
async function start() {
  // Only the compendiums with items that take a frame: the registry keeps nothing of the others (the skills'), whose
  // indexes the windows' catalogs fetch later, one at a time, once the game is idle (helpers/prewarm.mjs). The GM asks
  // the compendiums the Market lists for its fields too: its catalog then reads this index, not one of its own.
  const packs = game.packs.filter(pack => (pack.documentName === "Item") && pack.index.some(e => FRAMED_TYPES.includes(e.type)));
  const fields = pack => ((game.user.isGM && marketPack(pack)) ? [...INDEX_FIELDS, ...MARKET_INDEX_FIELDS] : INDEX_FIELDS);
  await Promise.all(packs.map(pack => packIndex(pack, fields(pack))));
  buildRegistry();
  viewer = new IntersectionObserver(draw, { rootMargin: "300px" });
  const apps = new Map();
  for (const img of document.getElementsByTagName("img")) if (!inPlain(img)) decorate(img, apps);
  observer = new MutationObserver(records => {
    const apps = new Map();
    for (const record of records) {
      if (inPlain(record.target)) continue;
      if (record.type === "attributes") {
        decorate(record.target, apps);
        continue;
      }
      for (const node of record.removedNodes) for (const img of imagesOf(node)) viewer.unobserve(img);
      for (const node of record.addedNodes) {
        if (!node.matches?.(PLAIN)) for (const img of imagesOf(node)) decorate(img, apps);
      }
    }
  });
  observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["src"] });
}

/** Draws the icons again: after a change of item icons, levels or tags in the world. */
function refresh() {
  buildRegistry();
  for (const img of document.querySelectorAll("img[data-eti-icon]")) {
    const path = img.dataset.etiIcon;
    delete img.dataset.etiIcon;
    img.src = path;
  }
}

/** Call during the `init` hook. */
export function registerIcons() {
  CONFIG.Item.compendiumIndexFields = [...new Set([...(CONFIG.Item.compendiumIndexFields ?? []), ...INDEX_FIELDS])];
  Hooks.once("ready", () => start().catch(err => console.error(`${SYSTEM_ID} | Could not start the item icons`, err)));
  const changed = foundry.utils.debounce(refresh, 300);
  for (const hook of ["createItem", "updateItem", "deleteItem"]) {
    Hooks.on(hook, item => {
      if (!item.parent) changed();
    });
  }
}

/** For macros: game.eternia.icons. */
export const iconsApi = { styleOf: iconStyleOf, refresh, svgOf: svgTextOf };
