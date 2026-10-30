/**
 * The status icons ahead of the canvas.
 *
 * Foundry loads the icon of every status (CONFIG.statusEffects, ~90 SVGs here) with the textures of the first scene
 * of a session, after the world data, and the server answers each one in its own round trip: against a remote server
 * that's the longest part of the first scene's load. Their texts are fetched as soon as the translations are in, while
 * the world data is still on its way and the connections sit idle, and handed to PIXI's SVG loader when the canvas
 * asks for them (it reads an SVG with `PIXI.settings.ADAPTER.fetch(url).text()`). The textures are built at the same
 * moment and in the same way as before, from the same file: only the wait for the network moves out of the way.
 */

/** @type {Map<string, Promise<string|null>>} absolute URL -> the SVG text (null: let PIXI fetch it) */
const pending = new Map();
let adapterFetch = null;

/** The absolute URL PIXI asks for (Assets resolves the path against the origin and Foundry's route prefix). */
const absolute = src => new URL(foundry.utils.getRoute(src), window.location.origin).href;

function restore() {
  if (!adapterFetch) return;
  PIXI.settings.ADAPTER.fetch = adapterFetch;
  adapterFetch = null;
  pending.clear();
}

function prefetch() {
  if (game.settings.get("core", "noCanvas")) return;
  const adapter = PIXI.settings?.ADAPTER;
  if (typeof adapter?.fetch !== "function") return;
  for (const status of CONFIG.statusEffects ?? []) {
    const src = status.img;
    if (!src || !/\.svg$/i.test(src) || /^(data|blob):/.test(src)) continue;
    const url = absolute(src);
    if (pending.has(url) || PIXI.Assets.cache.has(src) || PIXI.Assets.cache.has(url)) continue;
    pending.set(url, fetch(url, { priority: "low" })
      .then(response => (response.ok ? response.text() : null))
      .catch(() => null));
  }
  if (!pending.size) return;
  adapterFetch = adapter.fetch;
  adapter.fetch = (url, options) => {
    const text = (options === undefined) ? pending.get(url) : undefined;
    if (!text) return adapterFetch(url, options);
    pending.delete(url);
    const fallback = adapterFetch;
    if (!pending.size) restore();
    return text.then(svg => ((svg === null) ? fallback(url, options)
      : new Response(svg, { status: 200, headers: { "Content-Type": "image/svg+xml" } })));
  };
}

export function registerStatusPrefetch() {
  Hooks.once("i18nInit", prefetch);
  // Whatever the canvas didn't ask for (another scene, no tokens to draw) stops waiting here
  Hooks.once("canvasReady", restore);
}
