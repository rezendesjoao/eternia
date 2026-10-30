/**
 * A status (or another effect that changes the actor) put on a token or taken away, shown on the canvas instead of the
 * core's scrolling "+(Name)" text (EterniaActiveEffect#_displayScrollingStatus):
 * - Put on: the effect's icon comes in over the token on a dark medallion with a ring in the status's colour (crimson
 *   for a bad one, gold for a combat one, green for the rest), turns once and shrinks into its place among the token's
 *   status icons. The token's own icon there stays hidden until the medallion lands (canvas/token-style.mjs), then a
 *   small ring flashes on it. An effect without an icon on the token sinks into its middle.
 * - Taken away: the icon leaves its place growing, turning and fading upwards.
 * Every client plays it on its own canvas, for the tokens it sees. With "reduce motion" in the system it is only a
 * short flash; in Foundry's Low canvas performance mode (weak computers) and with the client setting "statusAnimation"
 * off, the core's light scrolling text plays instead.
 */
import { setting } from "../settings.mjs";
import { lowPerformance } from "../helpers/performance.mjs";
import { statusDefinition } from "../helpers/statuses.mjs";

/** The colour of the ring, by the status's group. */
const RINGS = { bad: 0xc8402f, life: 0xa3302b, combat: 0xe5c25a, other: 0x3a9a68 };
const DEFAULT_RING = 0x3a9a68;
/** The medallion is drawn at this diameter and scaled. */
const BASE = 100;

/** Icons on their way to a token: hidden there until they land (by token, src → how many are flying). */
const landing = new WeakMap();

const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const reduceMotion = () => !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
const animate = (attributes, options) => foundry.canvas.animation.CanvasAnimation.animate(attributes, options);

/** Add to the interface over the tokens, where core's scrolling text goes. */
function overTokens(object) {
  object.zIndex = CONFIG.Canvas.groups.interface?.zIndexScrollingText ?? 1100;
  object.eventMode = "none";
  return canvas.interface.addChild(object);
}

/** Whether the animation replaces the core text for this client. */
export const animatesStatuses = () => setting("statusAnimation") !== false;

/**
 * Hide the icons of a token that are still flying in (the token's _refreshEffects calls this).
 * @param {Token} token
 */
export function hideLanding(token) {
  const flying = landing.get(token);
  for (const icon of token.effects?.children ?? []) {
    if (icon.lhSrc) icon.renderable = !flying?.get(icon.lhSrc);
  }
}

/** Mark an icon as flying to a token (or landed: -1). */
function mark(token, src, delta) {
  const flying = landing.get(token) ?? new Map();
  const n = Math.max(0, (flying.get(src) ?? 0) + delta);
  if (n) flying.set(src, n);
  else flying.delete(src);
  landing.set(token, flying);
  if (!token.destroyed) token.renderFlags.set({ refreshEffects: true });
}

/** The ring's colour of an effect: its first status's group. */
function ringOf(effect) {
  for (const id of effect.statuses ?? []) {
    const group = statusDefinition(id)?.group;
    if (group) return RINGS[group] ?? DEFAULT_RING;
  }
  return DEFAULT_RING;
}

/**
 * The token's icon of an effect, once drawn and placed (Token#_refreshEffects sizes it): its centre and size in canvas
 * coordinates, or null.
 * @param {Token} token
 * @param {string} src
 */
function iconPlace(token, src) {
  const icon = token.effects?.children.find(c => c.lhSrc === src);
  if (!icon || icon.destroyed) return null;
  const overlay = icon === token.effects.overlay;
  const { width, height } = token.document.getSize();
  const size = overlay ? Math.min(width, height) * 0.6 : 20 * canvas.dimensions.uiScale;
  // Not placed yet: it still has its picture's size
  if (Math.abs(icon.width - size) > 0.5) return null;
  return {
    x: token.x + (overlay ? icon.x : icon.x + (size / 2)),
    y: token.y + (overlay ? icon.y : icon.y + (size / 2)),
    size
  };
}

/** A medallion: the icon on a dark disc with a ring, drawn at BASE and scaled. */
function medallion(texture, color) {
  const m = new PIXI.Container();
  const disc = new PIXI.Graphics();
  disc.beginFill(0x0d0906, 0.62).drawCircle(0, 0, BASE / 2).endFill();
  disc.lineStyle(5, color, 1).drawCircle(0, 0, (BASE / 2) - 2.5);
  disc.lineStyle(2, 0xfbf4df, 0.55).drawCircle(0, 0, (BASE / 2) - 7);
  const icon = new PIXI.Sprite(texture);
  icon.anchor.set(0.5);
  icon.width = icon.height = BASE * 0.66;
  m.addChild(disc, icon);
  return m;
}

/** A ring that opens and fades where something lands or leaves. */
async function flash(x, y, radius, color) {
  const ring = new PIXI.Graphics();
  ring.lineStyle(3, color, 1).drawCircle(0, 0, BASE / 2);
  ring.position.set(x, y);
  ring.scale.set((radius * 2) / BASE);
  overTokens(ring);
  try {
    await animate([
      { parent: ring.scale, attribute: "x", to: ring.scale.x * 1.9 },
      { parent: ring.scale, attribute: "y", to: ring.scale.y * 1.9 },
      { parent: ring, attribute: "alpha", from: 0.9, to: 0 }
    ], { duration: 380, easing: "easeOutCircle" });
  }
  finally {
    ring.destroy();
  }
}

/**
 * The icon comes in over the token, turns once and shrinks into its place among the status icons.
 * @param {Token} token
 * @param {ActiveEffect} effect
 */
async function arrive(token, effect) {
  const src = effect.img;
  const color = ringOf(effect);
  let landed = false;
  const land = () => {
    if (!landed) mark(token, src, -1);
    landed = true;
  };
  mark(token, src, 1);
  try {
    const texture = await foundry.canvas.loadTexture(src, { fallback: "icons/svg/hazard.svg" });
    // The token draws its icons after the change: wait for this one (an effect without an icon has none)
    let place = null;
    for (let i = 0; (i < 20) && !place && !token.destroyed; i++) {
      await wait(25);
      place = iconPlace(token, src);
    }
    if (token.destroyed || !canvas.ready) return;
    const center = token.center;
    const big = Math.min(token.w, token.h) * 0.92;
    const target = place ?? { x: center.x, y: center.y, size: big * 0.18 };
    if (reduceMotion()) {
      land();
      return flash(target.x, target.y, target.size / 2, color);
    }
    const m = medallion(texture, color);
    m.position.set(center.x, center.y);
    m.scale.set((big * 0.7) / BASE);
    m.alpha = 0;
    m.rotation = -0.7;
    overTokens(m);
    try {
      flash(center.x, center.y, big / 2, color);
      // It appears over the token, a little bigger than it lands
      await animate([
        { parent: m, attribute: "alpha", to: 1 },
        { parent: m.scale, attribute: "x", to: big / BASE },
        { parent: m.scale, attribute: "y", to: big / BASE },
        { parent: m, attribute: "rotation", to: 0 }
      ], { duration: 220, easing: "easeOutCircle" });
      // One turn, shrinking into its place
      await animate([
        { parent: m, attribute: "x", to: target.x },
        { parent: m, attribute: "y", to: target.y },
        { parent: m.scale, attribute: "x", to: (target.size * 1.15) / BASE },
        { parent: m.scale, attribute: "y", to: (target.size * 1.15) / BASE },
        { parent: m, attribute: "rotation", to: Math.PI * 2 }
      ], { duration: 640, easing: "easeInOutCosine" });
      land();
      flash(target.x, target.y, target.size / 2, color);
      await animate([{ parent: m, attribute: "alpha", to: 0 }], { duration: 140 });
    }
    finally {
      m.destroy({ children: true });
    }
  }
  finally {
    land();
  }
}

/**
 * The icon leaves its place growing, turning and fading upwards.
 * @param {Token} token
 * @param {ActiveEffect} effect
 */
async function leave(token, effect) {
  const src = effect.img;
  const color = ringOf(effect);
  // Its place before the token draws its icons again
  const place = iconPlace(token, src) ?? { x: token.center.x, y: token.center.y, size: Math.min(token.w, token.h) * 0.2 };
  if (reduceMotion()) return flash(place.x, place.y, place.size / 2, color);
  const texture = await foundry.canvas.loadTexture(src, { fallback: "icons/svg/hazard.svg" });
  if (token.destroyed || !canvas.ready) return;
  const m = medallion(texture, color);
  m.position.set(place.x, place.y);
  m.scale.set((place.size * 1.15) / BASE);
  overTokens(m);
  try {
    const end = (Math.min(token.w, token.h) * 0.5) / BASE;
    await animate([
      { parent: m, attribute: "y", to: place.y - (token.h * 0.45) },
      { parent: m.scale, attribute: "x", to: end },
      { parent: m.scale, attribute: "y", to: end },
      { parent: m, attribute: "rotation", to: -Math.PI },
      { parent: m, attribute: "alpha", from: 1, to: 0 }
    ], { duration: 620, easing: "easeOutCircle" });
  }
  finally {
    m.destroy({ children: true });
  }
}

/**
 * Play the animation of an effect put on (or taken from) its actor, on each token of it this client sees.
 * @param {ActiveEffect} effect
 * @param {boolean} enabled     Put on (true) or taken away
 * @returns {boolean}  Whether it played (an effect without an icon falls back to the core text)
 */
export function animateStatus(effect, enabled) {
  if (!canvas?.ready || !effect.img) return false;
  // Low performance: the core's scrolling text, as with the setting off
  if (lowPerformance()) return false;
  const actor = effect.target;
  for (const token of actor?.getActiveTokens?.(true) ?? []) {
    if (!token.visible || token.document.isSecret) continue;
    (enabled ? arrive(token, effect) : leave(token, effect))
      .catch(err => console.warn("eternia | Status animation", err));
  }
  return true;
}
