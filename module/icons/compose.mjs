/**
 * The picture of a decorated item icon: an SVG with the Foundry icon inside (shrunk in the browser, so no icon
 * ships with the system), the effects of the level over it and the frame of the grade on top, given to the <img>
 * as a blob URL. The animations live inside the SVG, so they play wherever the icon is shown.
 */
import { GRADES, THEMES } from "./data.mjs";

/** Side of the embedded icon, in pixels: sharp up to the item sheet on a high-density screen. */
const BASE_SIZE = 192;
const bases = new Map();
const pictures = new Map();
const ready = new Map();

/** FNV-1a hash of a text. */
export function hashOf(text) {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i++) hash = Math.imul(hash ^ text.charCodeAt(i), 16777619);
  return hash >>> 0;
}

/** Repeatable random numbers from a seed (mulberry32), so each icon always moves the same way. */
function randomFrom(seed) {
  let state = seed >>> 0;
  return (min = 0, max = 1) => {
    state = (state + 0x6D2B79F5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), state | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return min + ((((t ^ (t >>> 14)) >>> 0) / 4294967296) * (max - min));
  };
}

const n = value => Number(value.toFixed(2));

/** The color of an icon's background (its border band), bright and saturated, or null when it is gray. */
function toneOf(context, side) {
  const { data } = context.getImageData(0, 0, side, side);
  const band = side * 0.14;
  let r = 0;
  let g = 0;
  let b = 0;
  let count = 0;
  for (let y = 0; y < side; y += 2) {
    for (let x = 0; x < side; x += 2) {
      if ((x > band) && (x < side - band) && (y > band) && (y < side - band)) continue;
      const i = ((y * side) + x) * 4;
      r += data[i];
      g += data[i + 1];
      b += data[i + 2];
      count++;
    }
  }
  const [h, s] = rgbToHsl(r / count, g / count, b / count);
  if (s < 0.08) return null;
  return hslToHex(h, Math.min(0.85, Math.max(0.5, s * 1.6)), 0.62);
}

function rgbToHsl(r, g, b) {
  [r, g, b] = [r / 255, g / 255, b / 255];
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === r ? ((g - b) / d) + (g < b ? 6 : 0) : max === g ? ((b - r) / d) + 2 : ((r - g) / d) + 4;
  return [h / 6, s, l];
}

function hslToHex(h, s, l) {
  const k = m => (m + (h * 12)) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = m => l - (a * Math.max(-1, Math.min(k(m) - 3, 9 - k(m), 1)));
  return `#${[f(0), f(8), f(4)].map(v => Math.round(v * 255).toString(16).padStart(2, "0")).join("")}`;
}

/** A blob as a data URL. */
const dataUrlOf = blob => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result);
  reader.onerror = () => reject(reader.error);
  reader.readAsDataURL(blob);
});

/**
 * The icon as a small data URL and the color of its background, drawn once per path. The image is decoded and
 * encoded off the main thread (createImageBitmap, OffscreenCanvas.convertToBlob).
 */
function baseOf(path) {
  if (!bases.has(path)) bases.set(path, (async () => {
    const response = await fetch(path);
    if (!response.ok) throw new Error(`Could not load ${path}`);
    const bitmap = await createImageBitmap(await response.blob());
    const canvas = new OffscreenCanvas(BASE_SIZE, BASE_SIZE);
    const context = canvas.getContext("2d");
    context.imageSmoothingQuality = "high";
    const side = Math.min(bitmap.width, bitmap.height);
    context.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, BASE_SIZE, BASE_SIZE);
    bitmap.close();
    const tone = toneOf(context, BASE_SIZE);
    const url = await dataUrlOf(await canvas.convertToBlob({ type: "image/webp", quality: 0.92 }));
    return { url, tone };
  })());
  return bases.get(path);
}

/* -------------------------------------------- */
/*  Particles                                   */
/* -------------------------------------------- */

const STYLE = `
.p{transform-box:fill-box;transform-origin:center;animation-iteration-count:infinite;animation-timing-function:linear}
.twinkle{animation-name:twinkle;animation-timing-function:ease-in-out}
.rise{animation-name:rise}
.drift{animation-name:drift;animation-timing-function:ease-in-out}
.embers{animation-name:embers}
.fall{animation-name:fall}
.float{animation-name:float;animation-timing-function:ease-in-out}
.gust{animation-name:gust;animation-timing-function:ease-in-out;animation-iteration-count:infinite}
.ripple{animation-name:ripple;animation-timing-function:ease-out}
.smoke{animation-name:smoke;animation-timing-function:ease-out}
.bolt{animation-name:bolt}
.bubble{animation-name:bubble;animation-timing-function:ease-in}
.glow{transform-box:fill-box;transform-origin:center;animation:glow 2.4s ease-in-out infinite}
.spin{transform-box:view-box;transform-origin:50px 50px;animation:spin linear infinite}
.spin.back{animation-direction:reverse}
.aura{animation:pulse 3.4s ease-in-out infinite}
.glint{animation:sweep ease-in-out infinite}
@keyframes twinkle{0%,45%{transform:scale(0) rotate(0deg);opacity:0}62%{transform:scale(1) rotate(45deg);opacity:1}80%,100%{transform:scale(0) rotate(90deg);opacity:0}}
@keyframes rise{0%{transform:translate(0,0) scale(.5);opacity:0}18%{opacity:.95}78%{opacity:.85}100%{transform:translate(var(--dx),var(--dy)) scale(1);opacity:0}}
@keyframes drift{0%{transform:translate(0,0);opacity:0}30%,70%{opacity:.8}100%{transform:translate(var(--dx),var(--dy));opacity:0}}
@keyframes embers{0%{transform:translate(0,0) scale(1);opacity:0}10%{opacity:1}35%{transform:translate(calc(var(--dx)*.6),calc(var(--dy)*.35)) scale(.9);opacity:.7}55%{opacity:1}100%{transform:translate(var(--dx),var(--dy)) scale(.3);opacity:0}}
@keyframes fall{0%{transform:translate(0,0) rotate(0deg) scaleX(1);opacity:0}10%{opacity:1}30%{transform:translate(calc(var(--dx)*.3),calc(var(--dy)*.3)) rotate(calc(var(--r)*.3)) scaleX(.35)}55%{transform:translate(calc(var(--dx)*.55),calc(var(--dy)*.55)) rotate(calc(var(--r)*.55)) scaleX(1)}80%{transform:translate(calc(var(--dx)*.8),calc(var(--dy)*.8)) rotate(calc(var(--r)*.8)) scaleX(.35);opacity:1}100%{transform:translate(var(--dx),var(--dy)) rotate(var(--r)) scaleX(1);opacity:0}}
@keyframes float{0%{transform:translate(0,0) rotate(0deg);opacity:0}20%{opacity:.95}50%{transform:translate(calc(var(--dx)*-.5),calc(var(--dy)*.5)) rotate(var(--r))}80%{opacity:.9}100%{transform:translate(var(--dx),var(--dy)) rotate(calc(var(--r)*-1));opacity:0}}
@keyframes gust{0%{stroke-dashoffset:30;opacity:0}20%,75%{opacity:var(--o)}100%{stroke-dashoffset:-104;opacity:0}}
@keyframes ripple{0%{transform:scale(.25);opacity:0}15%{opacity:.75}100%{transform:scale(1.55);opacity:0}}
@keyframes smoke{0%{transform:translate(0,0) scale(.45);opacity:0}25%{opacity:.85}100%{transform:translate(var(--dx),var(--dy)) scale(1.5);opacity:0}}
@keyframes bolt{0%,100%{opacity:0}2%{opacity:1}5%{opacity:.15}8%{opacity:.95}13%{opacity:0}}
@keyframes bubble{0%{transform:translate(0,0) scale(.4);opacity:0}15%{opacity:.9}85%{transform:translate(calc(var(--dx)*.9),calc(var(--dy)*.9)) scale(1);opacity:.9}100%{transform:translate(var(--dx),var(--dy)) scale(1.5);opacity:0}}
@keyframes glow{0%,100%{transform:scale(.65);opacity:.55}50%{transform:scale(1.1);opacity:1}}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes pulse{0%,100%{opacity:calc(var(--a)*.45)}50%{opacity:var(--a)}}
@keyframes sweep{0%{transform:translateX(-150px)}24%,100%{transform:translateX(150px)}}`;

/** A particle at (x, y), moving with its class and variables. */
const moving = (cls, x, y, vars, inner) =>
  `<g transform="translate(${n(x)} ${n(y)})"><g class="p ${cls}" style="${vars}">${inner}</g></g>`;

/** Duration and a negative delay, so the particles are already on their way when the icon shows. */
function timing(random, min, max) {
  const duration = random(min, max);
  return `animation-duration:${n(duration)}s;animation-delay:-${n(random(0, duration))}s`;
}

const shapes = {
  mote: (r, id) => `<circle r="${n(r)}" fill="url(#mote${id})"/>`,
  ember: (r, id) => `<circle r="${n(r)}" fill="url(#ember${id})"/>`,
  star: (s, id) => `<g transform="scale(${n(s)})"><circle r="2.8" fill="url(#mote${id})"/>`
    + `<path d="M0-6L1-1L6 0L1 1L0 6L-1 1L-6 0L-1-1Z" fill="#fff"/></g>`,
  petal: (s, id) => `<path transform="scale(${n(s)})" d="M0-5C3-4.6 4.2-1.2 2.3 2.7L0 1.5L-2.3 2.7C-4.2-1.2-3-4.6 0-5Z" fill="url(#petal${id})"/>`,
  leaf: (s, id, [light]) => `<g transform="scale(${n(s)})"><path d="M0-5.5C3.2-3.4 3.2 3.4 0 5.5C-3.2 3.4-3.2-3.4 0-5.5Z" fill="url(#petal${id})"/>`
    + `<path d="M0-4.6V4.6" stroke="${light}" stroke-width=".5" opacity=".7"/></g>`,
  flake: (s, id, [light]) => `<g transform="scale(${n(s)})"><circle r="3" fill="url(#mote${id})"/>`
    + `<path d="M0-4.5V4.5M-3.9-2.25L3.9 2.25M-3.9 2.25L3.9-2.25" stroke="${light}" stroke-width=".9" stroke-linecap="round"/></g>`,
  note: (s, id, [, main], index) => `<g transform="scale(${n(s)})" fill="${main}"><circle r="3.4" fill="url(#mote${id})"/>`
    + (index % 2
      ? `<ellipse cx="-3" cy="1" rx="2.1" ry="1.5" transform="rotate(-20 -3 1)"/><ellipse cx="3" cy="0" rx="2.1" ry="1.5" transform="rotate(-20 3 0)"/>`
        + `<rect x="-1.4" y="-8" width=".8" height="9"/><rect x="4.6" y="-9" width=".8" height="9"/><path d="M-1.4-8L5.4-9.2V-7.4L-1.4-6.2Z"/>`
      : `<ellipse rx="2.3" ry="1.6" transform="rotate(-20)"/><rect x="1.5" y="-9.5" width=".9" height="9.6"/>`
        + `<path d="M2.4-9.5C5.2-8 5.6-5.6 4.2-3.5C4.6-5.4 3.9-6.6 2.4-7.3Z"/>`)
    + "</g>",
  bolt: (s, id, [light, main]) => `<g transform="scale(${n(s)})" fill="none" stroke-linecap="round" stroke-linejoin="round">`
    + `<polyline points="0,-8 -2.2,-1.6 1.6,-.8 -1,7" stroke="${main}" stroke-width="2.6" opacity=".45"/>`
    + `<polyline points="0,-8 -2.2,-1.6 1.6,-.8 -1,7" stroke="${light}" stroke-width="1"/></g>`,
  bubble: (r, id, [light, main]) => `<circle r="${n(r)}" fill="${main}" fill-opacity=".14" stroke="${light}" stroke-width=".7"/>`
    + `<circle cx="${n(-r * 0.35)}" cy="${n(-r * 0.35)}" r="${n(r * 0.28)}" fill="#fff" opacity=".8"/>`,
  smoke: (r, id) => `<circle r="${n(r)}" fill="url(#smoke${id})"/>`
};

/** Each kind of particle: its count of them, as SVG. */
const PARTS = {
  twinkle: ({ random, id }) => {
    const t = random(0.12, 0.88);
    return moving("twinkle", 14 + (72 * t) + random(-9, 9), 86 - (72 * t) + random(-9, 9), timing(random, 2.4, 4.4),
      shapes.star(random(0.75, 1.45), id));
  },
  rise: ({ random, id }) => moving("rise", random(10, 90), random(62, 100),
    `--dx:${n(random(-9, 9))}px;--dy:${n(random(-58, -30))}px;${timing(random, 3, 5.5)}`, shapes.mote(random(1.7, 3.4), id)),
  drift: ({ random, id }) => moving("drift", random(12, 88), random(12, 88),
    `--dx:${n(random(-18, 18))}px;--dy:${n(random(-10, 6))}px;${timing(random, 4, 7)}`, shapes.mote(random(1.4, 2.6), id)),
  embers: ({ random, id }) => moving("embers", random(8, 92), random(70, 104),
    `--dx:${n(random(-14, 14))}px;--dy:${n(random(-86, -52))}px;${timing(random, 1.5, 2.9)}`, shapes.ember(random(1, 2.2), id)),
  fall: ({ random, id, colors, shape }) => moving("fall", random(-10, 72), random(-14, 18),
    `--dx:${n(random(22, 48))}px;--dy:${n(random(72, 112))}px;--r:${n(random(160, 520))}deg;${timing(random, 4.5, 7.5)}`,
    shapes[shape](random(1, 1.6), id, colors)),
  float: ({ random, id, colors, shape, index }) => moving("float", random(16, 84), random(70, 100),
    `--dx:${n(random(-10, 10))}px;--dy:${n(random(-64, -38))}px;--r:${n(random(-25, 25))}deg;${timing(random, 3.5, 6)}`,
    shapes[shape](random(0.95, 1.3), id, colors, index)),
  gust: ({ random, colors: [light] }) => {
    const y = random(14, 86);
    return `<path class="gust" d="M-12 ${n(y)}Q50 ${n(y + random(-16, 16))} 112 ${n(y + random(-12, 12))}" pathLength="100" `
      + `fill="none" stroke="${light}" stroke-width="${n(random(0.8, 1.6))}" stroke-linecap="round" stroke-dasharray="26 200" `
      + `style="--o:${n(random(0.45, 0.8))};${timing(random, 1.8, 3.2)}"/>`;
  },
  ripple: ({ index, count, colors: [, main] }) =>
    `<circle class="p ripple" cx="50" cy="50" r="24" fill="none" stroke="${main}" stroke-width="1.4" `
    + `style="animation-duration:3.6s;animation-delay:-${n(index * 3.6 / count)}s"/>`,
  orbit: ({ random, id, index }) => {
    const radius = random(26, 44);
    return `<g class="spin${index % 2 ? " back" : ""}" style="animation-duration:${n(random(6, 11))}s">`
      + `<g transform="rotate(${n(random(0, 360))} 50 50)"><g transform="translate(${n(50 + radius)} 50)">`
      + `<g class="glow" style="animation-delay:-${n(random(0, 2.4))}s">${shapes.mote(random(1.8, 3), id)}</g></g></g></g>`;
  },
  smoke: ({ random, id }) => moving("smoke", random(10, 90), random(64, 104),
    `--dx:${n(random(-12, 12))}px;--dy:${n(random(-56, -30))}px;${timing(random, 3.5, 6)}`, shapes.smoke(random(7, 13), id)),
  bolt: ({ random, id, colors }) =>
    `<g transform="translate(${n(random(18, 82))} ${n(random(18, 82))}) rotate(${n(random(0, 360))})">`
    + `<g class="p bolt" style="${timing(random, 1.6, 3.2)}">${shapes.bolt(random(0.8, 1.3), id, colors)}</g></g>`,
  bubble: ({ random, id, colors }) => moving("bubble", random(12, 88), random(66, 102),
    `--dx:${n(random(-6, 6))}px;--dy:${n(random(-50, -26))}px;${timing(random, 2.6, 4.6)}`, shapes.bubble(random(2, 3.8), id, colors)),
  rays: ({ id }) => `<g class="spin" style="animation-duration:26s"><g opacity=".55">`
    + Array.from({ length: 10 }, (_, i) => `<path d="M50 50L47.6 0H52.4Z" fill="url(#ray${id})" transform="rotate(${i * 36} 50 50)"/>`).join("")
    + "</g></g>"
};

/* -------------------------------------------- */
/*  Frames                                      */
/* -------------------------------------------- */

const CORNERS = [[5, 5], [95, 5], [5, 95], [95, 95]];

/** Magic items ([M1] to [M3]): a colored line with a diamond at each corner. */
const magicFrame = (color, id) => `<g fill="none">`
  + `<rect x="1.4" y="1.4" width="97.2" height="97.2" rx="5" stroke="#0b0806" stroke-opacity=".75" stroke-width="2.8"/>`
  + `<rect x="4.5" y="4.5" width="91" height="91" rx="3" stroke="${color}" stroke-opacity=".35" stroke-width="2.6"/>`
  + `<rect x="2.6" y="2.6" width="94.8" height="94.8" rx="4" stroke="${color}" stroke-width="2.1"/>`
  + `<rect x="2.6" y="2.6" width="94.8" height="94.8" rx="4" stroke="url(#shine${id})" stroke-width="2.1"/></g>`
  + CORNERS.map(([x, y]) => `<path d="M${x} ${y - 4}L${x + 4} ${y}L${x} ${y + 4}L${x - 4} ${y}Z" fill="${color}" stroke="#0b0806" stroke-width=".8"/>`
    + `<path d="M${x - 1.4} ${y - 1.4}L${x} ${y - 2.8}" stroke="#fff" stroke-opacity=".85" stroke-width=".8" stroke-linecap="round"/>`).join("");

/** Artifacts ([M4] to [M6]) and Phantasmal items ([M7]): a double metal frame, a flourish and a gem per corner. */
const ornateFrame = id => `<g fill="none">`
  + `<rect x="1.2" y="1.2" width="97.6" height="97.6" rx="3" stroke="#1d1204" stroke-width="2.8"/>`
  + `<rect x="2.5" y="2.5" width="95" height="95" rx="2.4" stroke="url(#metal${id})" stroke-width="2.6"/>`
  + `<rect x="5.4" y="5.4" width="89.2" height="89.2" rx="1.4" stroke="#1d1204" stroke-opacity=".6" stroke-width="1"/>`
  + `<rect x="5.4" y="5.4" width="89.2" height="89.2" rx="1.4" stroke="url(#metal${id})" stroke-opacity=".8" stroke-width=".55"/></g>`
  + [0, 90, 180, 270].map(angle => `<g transform="rotate(${angle} 50 50)">`
    + `<path d="M5.5 21C9.5 19.5 12.5 16 12.5 12.5C16 12.5 19.5 9.5 21 5.5" fill="none" stroke="#1d1204" stroke-width="2.6" stroke-linecap="round"/>`
    + `<path d="M5.5 21C9.5 19.5 12.5 16 12.5 12.5C16 12.5 19.5 9.5 21 5.5" fill="none" stroke="url(#metal${id})" stroke-width="1.3" stroke-linecap="round"/>`
    + `<circle cx="6.6" cy="6.6" r="4.1" fill="url(#gem${id})" stroke="#1d1204" stroke-width=".9"/>`
    + `<circle cx="5.3" cy="5.3" r="1.15" fill="#fff" opacity=".85"/></g>`).join("");

/** The aura of a theme that takes the color of the icon, when the icon is gray. */
const AUTO_AURA = "#8fbaff";

const METALS = {
  artifact: ["#fff4c2", "#e8bd4a", "#8f6114", "#f3d06a", "#7a520c"],
  phantasm: ["#f2fffd", "#8fe8dc", "#3a6f87", "#cdbcff", "#2b3d6a"]
};

/* -------------------------------------------- */
/*  The picture                                 */
/* -------------------------------------------- */

/**
 * The SVG of an icon.
 * @param {{url: string, tone: string|null}} base    the icon as a data URL, and the color of its background
 * @param {object} style    from iconStyleOf (index.mjs)
 * @param {string} id       suffix of the ids, unique per picture
 * @param {number} seed     for the particles
 */
export function svgOf(base, style, id, seed) {
  const random = randomFrom(seed);
  const grade = GRADES[style.grade];
  const theme = THEMES[style.theme] ?? THEMES.steel;
  const [light, main] = theme.colors;
  const aura = (theme.aura === "auto") ? (base.tone ?? AUTO_AURA) : theme.aura;
  const strength = style.intensity ?? 0;
  const moves = style.animated;
  const defs = [];
  const layers = [];

  if (style.hue) defs.push(`<filter id="hue${id}" color-interpolation-filters="sRGB"><feColorMatrix type="hueRotate" values="${style.hue}"/></filter>`);
  layers.push(`<image href="${base.url}" width="100" height="100" preserveAspectRatio="xMidYMid slice"${style.hue ? ` filter="url(#hue${id})"` : ""}/>`);

  if (style.tier >= 2) {
    // The glow behind the item: a light in the middle, shown only where the icon is dark (its background).
    defs.push(`<filter id="inv${id}" color-interpolation-filters="sRGB"><feColorMatrix type="matrix" `
        + `values="-2.2 0 0 0 1.35 0 -2.2 0 0 1.35 0 0 -2.2 0 1.35 0 0 0 1 0"/></filter>`,
      `<mask id="back${id}" maskUnits="userSpaceOnUse" x="0" y="0" width="100" height="100">`
        + `<image href="${base.url}" width="100" height="100" preserveAspectRatio="xMidYMid slice" filter="url(#inv${id})"/></mask>`,
      `<radialGradient id="glow${id}" cx=".5" cy=".5" r=".58"><stop offset="0" stop-color="${aura}"/>`
        + `<stop offset=".4" stop-color="${aura}" stop-opacity=".6"/><stop offset="1" stop-color="${aura}" stop-opacity="0"/></radialGradient>`,
      `<linearGradient id="rim${id}" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${aura}"/>`
        + `<stop offset="1" stop-color="${aura}" stop-opacity="0"/></linearGradient>`);
    const glow = n(0.5 + (0.35 * strength));
    const edge = n(0.45 + (0.35 * strength));
    const delay = n(random(0, 3.4));
    // A rim of light along the four edges.
    const rim = [0, 90, 180, 270].map(angle => `<rect width="13" height="100" fill="url(#rim${id})" transform="rotate(${angle} 50 50)"/>`).join("");
    layers.push(moves
      ? `<g mask="url(#back${id})"><rect class="aura" width="100" height="100" fill="url(#glow${id})" style="--a:${glow};animation-delay:-${delay}s"/></g>`
        + `<g class="aura" style="mix-blend-mode:screen;--a:${edge};animation-delay:-${delay}s">${rim}</g>`
      : `<g mask="url(#back${id})"><rect width="100" height="100" fill="url(#glow${id})" opacity="${n(glow * 0.7)}"/></g>`
        + `<g style="mix-blend-mode:screen" opacity="${n(edge * 0.7)}">${rim}</g>`);
    if (moves) {
      defs.push(`<radialGradient id="mote${id}"><stop offset="0" stop-color="#fff"/><stop offset=".3" stop-color="${light}"/>`
          + `<stop offset=".62" stop-color="${main}" stop-opacity=".55"/><stop offset="1" stop-color="${main}" stop-opacity="0"/></radialGradient>`,
        `<radialGradient id="ember${id}"><stop offset="0" stop-color="#fffbe6"/><stop offset=".35" stop-color="${light}"/>`
          + `<stop offset=".7" stop-color="${main}" stop-opacity=".7"/><stop offset="1" stop-color="${main}" stop-opacity="0"/></radialGradient>`,
        `<linearGradient id="petal${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${light}"/><stop offset="1" stop-color="${main}"/></linearGradient>`,
        `<radialGradient id="smoke${id}"><stop offset="0" stop-color="#0d0618" stop-opacity=".9"/><stop offset=".55" stop-color="#1c0b33" stop-opacity=".55"/>`
          + `<stop offset="1" stop-color="#1c0b33" stop-opacity="0"/></radialGradient>`,
        `<linearGradient id="ray${id}" gradientUnits="userSpaceOnUse" x1="50" y1="50" x2="50" y2="0"><stop offset="0" stop-color="${light}" stop-opacity=".9"/>`
          + `<stop offset="1" stop-color="${main}" stop-opacity="0"/></linearGradient>`);
      const dark = [];
      const bright = [];
      for (const [kind, count, shape] of theme.parts) {
        for (let index = 0; index < count; index++) {
          (kind === "smoke" ? dark : bright).push(PARTS[kind]({ random, id, colors: theme.colors, shape, index, count }));
        }
      }
      const opacity = n(0.85 + (0.15 * strength));
      if (dark.length) layers.push(`<g opacity="${opacity}">${dark.join("")}</g>`);
      layers.push(`<g style="mix-blend-mode:screen" opacity="${opacity}">${bright.join("")}</g>`);
    }
  }

  if (moves && (style.tier >= 1)) {
    defs.push(`<linearGradient id="glint${id}" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0"/>`
      + `<stop offset=".5" stop-color="#fff" stop-opacity="${style.tier >= 2 ? ".7" : ".5"}"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>`);
    const sweep = style.tier >= 2 ? random(3.8, 5.2) : random(5.5, 7.5);
    layers.push(`<g style="mix-blend-mode:screen"><g class="glint" style="animation-duration:${n(sweep)}s;animation-delay:-${n(random(0, sweep))}s">`
      + `<g transform="rotate(28 50 50)"><rect x="34" y="-30" width="32" height="160" fill="url(#glint${id})"/></g></g></g>`);
  }

  if (grade?.frame === "magic") {
    defs.push(`<linearGradient id="shine${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".75"/>`
      + `<stop offset=".35" stop-color="#fff" stop-opacity="0"/><stop offset=".7" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".35"/></linearGradient>`);
    layers.push(magicFrame(grade.color, id));
  }
  else if (grade) {
    const metal = METALS[grade.frame];
    defs.push(`<linearGradient id="metal${id}" x1="0" y1="0" x2="1" y2="1">${metal.map((color, i) =>
      `<stop offset="${i / (metal.length - 1)}" stop-color="${color}"/>`).join("")}</linearGradient>`,
    `<radialGradient id="gem${id}" cx=".35" cy=".32" r=".8"><stop offset="0" stop-color="#fff"/><stop offset=".3" stop-color="${grade.gem[0]}"/>`
      + `<stop offset=".72" stop-color="${grade.gem[1]}"/><stop offset="1" stop-color="${grade.gem[2]}"/></radialGradient>`);
    layers.push(ornateFrame(id));
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="${BASE_SIZE}" height="${BASE_SIZE}">`
    + (moves ? `<style>${STYLE}</style>` : "") + `<defs>${defs.join("")}</defs>${layers.join("")}</svg>`;
}

const keyOf = (path, style) => [path, style.grade, style.tier, style.theme, style.hue, style.intensity, style.animated].join("|");

/**
 * The picture of an icon with a style, drawn once: the promise of its blob URL.
 * @param {string} path
 * @param {object} style
 * @returns {Promise<string>}
 */
export function pictureOf(path, style) {
  const key = keyOf(path, style);
  if (!pictures.has(key)) pictures.set(key, baseOf(path).then(base => {
    const seed = hashOf(key);
    const url = URL.createObjectURL(new Blob([svgOf(base, style, seed.toString(36), seed)], { type: "image/svg+xml" }));
    ready.set(key, url);
    return url;
  }));
  return pictures.get(key);
}

/** The blob URL of a picture already drawn, or null (it does not start drawing it). */
export const drawnPictureOf = (path, style) => ready.get(keyOf(path, style)) ?? null;

/** The SVG text of an icon (for previews and tests). */
export async function svgTextOf(path, style) {
  const seed = hashOf(keyOf(path, style));
  return svgOf(await baseOf(path), style, seed.toString(36), seed);
}
