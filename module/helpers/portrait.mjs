/**
 * Portraits that are tokens. An Eternia token (the gold ring on a clear background, and the shapes of its kind: the rays
 * of the absolute deities, the hexagon of the Rifts) shows on the sheets as it is: no dark square behind it, no square
 * frame, and scaled so the shape fills the place of the portrait (css/sheet.css, ".token"). Any other picture keeps the
 * frame: a painting fills it as before, and the default ones (core's mystery man, the system's type icons) are white
 * drawings made for the dark.
 *
 * A picture is a token when its corners are clear and what is drawn fills most of the box around it: a disc fills 79%
 * of it, a hexagon 75%, the rays 87%; a figure cut out of its background 30 to 55%.
 */
import { DEFAULT_ART } from "../canvas/token-defaults.mjs";

/** The size a picture is read at (a 512 px token's ring, 6 px from the edge, is found to the pixel). */
const SIZE = 96;

/** What each picture is, by its path: the promise of its fit. */
const FITS = new Map();

/**
 * How a portrait sits in its place: null when it keeps the frame; for a token, the CSS that scales and moves the
 * picture so the shape fills the (square) place: --tw/--th its width and height, --tl/--tt its left and top, as
 * fractions of the place.
 * @param {string} src   The portrait
 * @returns {Promise<{style: string}|null>}
 */
export function portraitFit(src) {
  if (!src || DEFAULT_ART.test(src)) return Promise.resolve(null);
  if (!FITS.has(src)) FITS.set(src, measure(src).catch(() => null));
  return FITS.get(src);
}

/** Read the picture (null when it isn't a token, or can't be read: one from another site that doesn't allow it). */
async function measure(src) {
  const image = new Image();
  if (new URL(src, window.location.href).origin !== window.location.origin) image.crossOrigin = "anonymous";
  image.src = src;
  await image.decode();
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = SIZE;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  context.drawImage(image, 0, 0, SIZE, SIZE);
  const { data } = context.getImageData(0, 0, SIZE, SIZE);
  const alpha = (x, y) => data[(((y * SIZE) + x) * 4) + 3];

  const last = SIZE - 1;
  if ((alpha(0, 0) + alpha(last, 0) + alpha(0, last) + alpha(last, last)) / 4 >= 128) return null;
  let left = SIZE, top = SIZE, right = -1, bottom = -1, solid = 0;
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      if (alpha(x, y) < 128) continue;
      solid++;
      left = Math.min(left, x);
      right = Math.max(right, x);
      top = Math.min(top, y);
      bottom = Math.max(bottom, y);
    }
  }
  const w = right - left + 1, h = bottom - top + 1;
  if ((w < SIZE * 0.6) || (h < SIZE * 0.6) || (solid < w * h * 0.7)) return null;

  // The shape's box in the picture's own pixels, and the picture scaled so the box's longer side fills the place
  const width = image.naturalWidth, height = image.naturalHeight;
  const side = Math.max((w / SIZE) * width, (h / SIZE) * height);
  const tw = width / side, th = height / side;
  const tl = 0.5 - (((left + (w / 2)) / SIZE) * tw), tt = 0.5 - (((top + (h / 2)) / SIZE) * th);
  const n = v => v.toFixed(4);
  return { style: `--tw: ${n(tw)}; --th: ${n(th)}; --tl: ${n(tl)}; --tt: ${n(tt)}` };
}
