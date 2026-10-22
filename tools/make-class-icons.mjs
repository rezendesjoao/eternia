// Class icons: the emblem of each class, drawn from shapes in the manner of the Log Horizon class logos. The family
// gives the frame and the colors (warrior: green diamond; weapon: cream square; healer: pink circle; magic: cyan
// hexagon), the class gives the glyph: a flat light-to-color silhouette over the dark inside, details cut out of it.
// Writes assets/icons/classes/<id>.svg and <id>-dedicacao.svg (the emblem with the "+" seal of a Dedication).
// Usage: node tools/make-class-icons.mjs
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "assets", "icons", "classes");

/* -------------------------------------------- */
/*  Families                                    */
/* -------------------------------------------- */

const FAMILIES = {
  warrior: { frame: "diamond", top: "#dcf7ea", bottom: "#4fcf9a", dark: "#1c4332", line: "#eef9f3", scale: 0.8 },
  weapon: { frame: "square", top: "#f8f6e4", bottom: "#d3c873", dark: "#25261d", line: "#f3f0e2", scale: 0.92 },
  healer: { frame: "circle", top: "#fad3de", bottom: "#c56ec5", dark: "#4a3341", line: "#f7eaf0", scale: 0.9 },
  magic: { frame: "hexagon", top: "#d5f7f5", bottom: "#4ccfbf", dark: "#181d1d", line: "#e9f7f6", scale: 0.88 }
};

/** Outer and inner shape of each frame (viewBox 0 0 100 100). */
const FRAMES = {
  diamond: ["M50 2 L98 50 L50 98 L2 50 Z", "M50 9.5 L90.5 50 L50 90.5 L9.5 50 Z"],
  square: [rrect(5, 5, 90, 90, 3), rrect(10.5, 10.5, 79, 79, 1.5)],
  circle: [circle(50, 50, 47), circle(50, 50, 41.5)],
  hexagon: ["M3 50 L26.5 8 L73.5 8 L97 50 L73.5 92 L26.5 92 Z", "M9.5 50 L29.8 13.5 L70.2 13.5 L90.5 50 L70.2 86.5 L29.8 86.5 Z"]
};

/* -------------------------------------------- */
/*  Shapes                                      */
/* -------------------------------------------- */

function n(v) {
  return Number(v.toFixed(2));
}

function rrect(x, y, w, h, r = 0) {
  r = Math.min(r, w / 2, h / 2);
  if (!r) return `M${n(x)} ${n(y)} H${n(x + w)} V${n(y + h)} H${n(x)} Z`;
  return `M${n(x + r)} ${n(y)} H${n(x + w - r)} A${n(r)} ${n(r)} 0 0 1 ${n(x + w)} ${n(y + r)} V${n(y + h - r)}`
    + ` A${n(r)} ${n(r)} 0 0 1 ${n(x + w - r)} ${n(y + h)} H${n(x + r)} A${n(r)} ${n(r)} 0 0 1 ${n(x)} ${n(y + h - r)}`
    + ` V${n(y + r)} A${n(r)} ${n(r)} 0 0 1 ${n(x + r)} ${n(y)} Z`;
}

function circle(cx, cy, r) {
  return `M${n(cx - r)} ${n(cy)} A${n(r)} ${n(r)} 0 1 0 ${n(cx + r)} ${n(cy)} A${n(r)} ${n(r)} 0 1 0 ${n(cx - r)} ${n(cy)} Z`;
}

function ellipse(cx, cy, rx, ry) {
  return `M${n(cx - rx)} ${n(cy)} A${n(rx)} ${n(ry)} 0 1 0 ${n(cx + rx)} ${n(cy)} A${n(rx)} ${n(ry)} 0 1 0 ${n(cx - rx)} ${n(cy)} Z`;
}

const poly = points => `M${points.map(([x, y]) => `${n(x)} ${n(y)}`).join(" L")} Z`;

/** A star of `points` tips around (cx, cy). */
function star(cx, cy, points, outer, inner, turn = -90) {
  const out = [];
  for (let i = 0; i < points * 2; i++) {
    const r = (i % 2) ? inner : outer;
    const a = ((turn + (i * 180 / points)) * Math.PI) / 180;
    out.push([cx + (r * Math.cos(a)), cy + (r * Math.sin(a))]);
  }
  return poly(out);
}

/* -------------------------------------------- */
/*  Glyphs                                      */
/* -------------------------------------------- */
// Each glyph is a list of layers drawn in order: "solid" (the glyph's gradient), "cut" (the dark of the frame, for
// details), "outline" (a dark stroke that parts two solids) and "line" (a stroke in the glyph's gradient). A layer
// may turn around the center with `rotate`.

const solid = (d, rotate) => ({ kind: "solid", d, rotate });
const cut = (d, rotate) => ({ kind: "cut", d, rotate });
const outline = (d, width, rotate) => ({ kind: "outline", d, width, rotate });
const line = (d, width, rotate) => ({ kind: "line", d, width, rotate });

const GLYPHS = {
  // The Guardian's Bulwark: a shield with a cross
  guardiao: () => {
    const shield = "M27 18 H73 V46 C73 67 62 78 50 86 C38 78 27 67 27 46 Z";
    const inner = "M32.5 23.5 H67.5 V46 C67.5 63.5 58.5 72.5 50 79 C41.5 72.5 32.5 63.5 32.5 46 Z";
    return [solid(shield), outline(inner, 2.6), cut(rrect(47.2, 24, 5.6, 54, 1)), cut(rrect(34, 38, 32, 5.6, 1))];
  },
  // The Samurai's Sheath: a katana leaving it, on the diagonal
  samurai: () => {
    const r = -12;
    return [
      solid("M37 45 C56 43.4 72 43 83 44.4 L93 50 L83 54.2 C72 56 56 56.2 37 55.2 Z", r),
      cut("M40 50.6 C58 50.4 72 49.8 87 49.6 L84.6 51.8 C72 53 58 53.4 40 53.2 Z", r),
      solid(rrect(32.4, 40.4, 5.2, 19.2, 2.4), r),
      solid(rrect(12, 45, 19.6, 10, 3), r),
      cut(poly([[15.4, 50], [18, 47.4], [20.6, 50], [18, 52.6]]), r),
      cut(poly([[21.6, 50], [24.2, 47.4], [26.8, 50], [24.2, 52.6]]), r),
      cut(poly([[27.8, 50], [30.4, 47.4], [33, 50], [30.4, 52.6]]), r),
      solid(rrect(8.4, 44.2, 4.6, 11.6, 1.6), r)
    ];
  },
  // The Monk's Chain: a closed fist
  monge: () => [
    solid(rrect(26.5, 24, 11, 19, 4.5)), solid(rrect(38.6, 22, 11, 21, 4.5)),
    solid(rrect(50.7, 22.6, 11, 20.4, 4.5)), solid(rrect(62.8, 25.4, 10.6, 17.6, 4.5)),
    solid(rrect(26.5, 37, 47, 28, 7)),
    outline(rrect(28.6, 41.6, 30, 10.4, 5.2), 2.6), solid(rrect(28.6, 41.6, 30, 10.4, 5.2)),
    solid(rrect(31, 66, 38, 15, 3)),
    cut(rrect(31, 70.4, 38, 1.8, 0)), cut(rrect(31, 75.2, 38, 1.8, 0))
  ],
  // The Resonant's Spark: a cut gem and its shine
  ressonante: () => [
    solid(poly([[28, 41], [37.5, 27], [62.5, 27], [72, 41], [50, 80]])),
    cut(rrect(28, 40, 44, 2, 0)),
    { kind: "cutline", d: "M37.5 27 L44 41 L50 80 M62.5 27 L56 41 L50 80 M44 41 L50 27 L56 41", width: 1.8 },
    solid(star(72, 24, 4, 11, 2.6)),
    solid(star(27, 66, 4, 6.5, 1.6))
  ],
  // The Assassin's Contract: a dagger, point down
  assassino: () => {
    const r = 32;
    return [
      solid(poly([[42.4, 46], [57.6, 46], [55.4, 74], [50, 91], [44.6, 74]]), r),
      { kind: "cutline", d: "M50 50 L50 77", width: 2, rotate: r },
      solid("M27 43 Q31 35.5 39.5 38.5 H60.5 Q69 35.5 73 43 Q69 50.5 60.5 47.5 H39.5 Q31 50.5 27 43 Z", r),
      solid(rrect(44.6, 18, 10.8, 21, 2.8), r),
      cut(rrect(44.6, 24, 10.8, 2, 0), r), cut(rrect(44.6, 30.4, 10.8, 2, 0), r),
      solid(circle(50, 12.4, 6.4), r), cut(circle(50, 12.4, 2.3), r)
    ];
  },
  // The Berserker's Rage: a double axe
  berserker: () => [
    solid(rrect(47.4, 18, 5.2, 68, 2.6)),
    solid(poly([[47.4, 18.5], [50, 9], [52.6, 18.5]])),
    solid("M52 32 C59 30 65 26 71 18.5 C83 26 86 50 72 62 C66 55 59 51 52 49 Z"),
    solid("M48 32 C41 30 35 26 29 18.5 C17 26 14 50 28 62 C34 55 41 51 48 49 Z"),
    { kind: "cutline", d: "M72.5 24 C79.5 31 80.5 48 73 56.5 M27.5 24 C20.5 31 19.5 48 27 56.5", width: 1.8 },
    cut(rrect(47.4, 64, 5.2, 1.8, 0)), cut(rrect(47.4, 69.4, 5.2, 1.8, 0)), cut(rrect(47.4, 74.8, 5.2, 1.8, 0))
  ],
  // The Hunter's Aim: a bow drawn, with its arrow
  cacador: () => [
    solid("M41 15 C18 29 18 71 41 85 L44 81.4 C25 68.6 25 31.4 44 18.6 Z"),
    solid(rrect(41.4, 18, 1.8, 64, 0.9)),
    solid(rrect(27, 48.7, 50, 2.6, 1.3)),
    solid(poly([[73, 43.5], [89, 50], [73, 56.5], [76.5, 50]])),
    solid(poly([[29, 50], [20.5, 42.5], [15, 42.5], [22.5, 50]])),
    solid(poly([[29, 50], [20.5, 57.5], [15, 57.5], [22.5, 50]]))
  ],
  // The Commander's Tactics: a standard and its star
  comandante: () => [
    solid(rrect(29.6, 21, 4.8, 66, 2)),
    solid(poly([[32, 8.5], [36.4, 18.5], [32, 22.5], [27.6, 18.5]])),
    solid("M34.4 24 H78 L69 39 L78 54 H34.4 Z"),
    cut(star(54, 39, 5, 8.4, 3.5)),
    solid(rrect(27.4, 83.6, 9.2, 4, 1.4))
  ],
  // The Minstrel's Movements: a lyre
  menestrel: () => [
    solid("M35.5 27 C21 33 23 61 39.5 72 L45 72 C31.5 61 30 39 40.5 33 Z"),
    solid("M64.5 27 C79 33 77 61 60.5 72 L55 72 C68.5 61 70 39 59.5 33 Z"),
    solid(circle(36, 25.5, 4.8)), solid(circle(64, 25.5, 4.8)),
    cut(circle(36, 25.5, 1.8)), cut(circle(64, 25.5, 1.8)),
    solid(rrect(33, 31.4, 34, 4.6, 2.3)),
    solid(rrect(38, 69, 24, 10, 3)),
    solid(rrect(44.2, 36, 1.6, 33.5, 0.8)), solid(rrect(49.2, 36, 1.6, 33.5, 0.8)), solid(rrect(54.2, 36, 1.6, 33.5, 0.8))
  ],
  // The Priest's Grace: a sun with a cross
  sacerdote: () => {
    const rays = [];
    for (let i = 0; i < 8; i++) {
      const a = (i * 45 - 90) * Math.PI / 180;
      const tip = (i % 2) ? 31 : 38;
      const half = (i % 2) ? 5.2 : 6.6;
      const side = a + Math.PI / 2;
      const bx = 50 + (19 * Math.cos(a));
      const by = 50 + (19 * Math.sin(a));
      rays.push(solid(poly([
        [bx + (half * Math.cos(side)), by + (half * Math.sin(side))],
        [50 + (tip * Math.cos(a)), 50 + (tip * Math.sin(a))],
        [bx - (half * Math.cos(side)), by - (half * Math.sin(side))]
      ])));
    }
    return [...rays, solid(circle(50, 50, 20)), cut(rrect(47.4, 37, 5.2, 27, 1.2)), cut(rrect(40, 44, 20, 5.2, 1.2))];
  },
  // The Druid's Forms: the print of a beast
  druida: () => [
    solid("M50 49 C61 49 71 59 69.5 68.5 C68 77 59 77.5 50 75 C41 77.5 32 77 30.5 68.5 C29 59 39 49 50 49 Z"),
    solid(ellipse(33.6, 40.6, 5.6, 7.4)), solid(ellipse(44.6, 31.6, 5.8, 7.8)),
    solid(ellipse(55.4, 31.6, 5.8, 7.8)), solid(ellipse(66.4, 40.6, 5.6, 7.4))
  ],
  // The Oracle's Burden: an eye that sees, with its rays
  oraculo: () => [
    solid("M16 52 Q50 22 84 52 Q50 82 16 52 Z"),
    cut(circle(50, 52, 13)),
    solid(circle(50, 52, 6)),
    cut(circle(53, 49, 1.8)),
    solid(rrect(48.4, 13, 3.2, 12, 1.6)),
    solid(rrect(48.4, 13, 3.2, 12, 1.6), -38),
    solid(rrect(48.4, 13, 3.2, 12, 1.6), 38)
  ],
  // The Sorcerer's Heat: a flame
  feiticeiro: () => [
    solid("M50 12 C56 27 71 34 71 55 C71 72 61 85 50 86 C39 85 29 72 29 57 C29 45 37 38 40 27 C44 33 44.5 39 47.5 42 C47 31 46 21 50 12 Z"),
    cut("M50 50 C55 57 62 62 61 71 C60 78 55 81 50 81 C45 81 40 78 39.5 71.5 C39.5 63 47 58 50 50 Z"),
    solid("M50 62 C52.5 66.5 56 68.5 55 74 C54.4 76.8 52.4 78 50 78 C47.6 78 45.6 76.8 45.2 74 C44.6 69 48.5 66.5 50 62 Z")
  ],
  // The Summoner's Pact: a circle of summoning
  invocador: () => [
    { kind: "solid", d: `${circle(50, 50, 33)} ${circle(50, 50, 28.6)}`, evenodd: true },
    line(poly([[50, 21.4], [74.8, 64.3], [25.2, 64.3]]), 3.2),
    solid(circle(50, 21.4, 4)), solid(circle(74.8, 64.3, 4)), solid(circle(25.2, 64.3, 4)),
    solid(star(50, 52, 4, 9, 2.6))
  ],
  // The Strategist's Reading: two dice on the table
  estrategista: () => [
    solid(rrect(20, 22, 34, 34, 6), -12),
    cut(circle(29, 31, 3.1), -12), cut(circle(37, 39, 3.1), -12), cut(circle(45, 47, 3.1), -12),
    outline(rrect(44, 42, 34, 34, 6), 4.4, 10),
    solid(rrect(44, 42, 34, 34, 6), 10),
    cut(circle(52.5, 50.5, 3.1), 10), cut(circle(69.5, 50.5, 3.1), 10), cut(circle(61, 59, 3.1), 10),
    cut(circle(52.5, 67.5, 3.1), 10), cut(circle(69.5, 67.5, 3.1), 10)
  ],
  // The Weaver's Pattern: a spool of thread and its needle
  tecelao: () => [
    solid(rrect(28, 20, 36, 7.6, 2.8)), solid(rrect(28, 72.4, 36, 7.6, 2.8)),
    solid(rrect(32.5, 27, 27, 45.4, 1)),
    { kind: "cutline", d: "M32.5 34 L59.5 31 M32.5 41 L59.5 38 M32.5 48 L59.5 45 M32.5 55 L59.5 52 M32.5 62 L59.5 59 M32.5 69 L59.5 66", width: 1.5 },
    outline("M50 8 L52.4 15 L52.4 79 L50 90 L47.6 79 L47.6 15 Z", 3.4, 36),
    solid("M50 8 L52.4 15 L52.4 79 L50 90 L47.6 79 L47.6 15 Z", 36),
    cut(ellipse(50, 18.5, 1, 3.6), 36)
  ]
};

/** The family of each class: its frame and colors. */
const CLASS_FAMILY = {
  guardiao: "warrior", samurai: "warrior", monge: "warrior", ressonante: "warrior",
  assassino: "weapon", berserker: "weapon", cacador: "weapon", comandante: "weapon", menestrel: "weapon",
  sacerdote: "healer", druida: "healer", oraculo: "healer",
  feiticeiro: "magic", invocador: "magic", estrategista: "magic", tecelao: "magic"
};

/* -------------------------------------------- */
/*  Emblem                                      */
/* -------------------------------------------- */

function layerSVG(layer, fam) {
  const turn = layer.rotate ? ` transform="rotate(${layer.rotate} 50 50)"` : "";
  switch (layer.kind) {
    case "solid": return `<path d="${layer.d}" fill="url(#glyph)"${layer.evenodd ? ` fill-rule="evenodd"` : ""}${turn}/>`;
    case "cut": return `<path d="${layer.d}" fill="${fam.dark}"${turn}/>`;
    case "outline": return `<path d="${layer.d}" fill="none" stroke="${fam.dark}" stroke-width="${layer.width}" stroke-linejoin="round"${turn}/>`;
    case "cutline": return `<path d="${layer.d}" fill="none" stroke="${fam.dark}" stroke-width="${layer.width}" stroke-linecap="round" stroke-linejoin="round"${turn}/>`;
    case "line": return `<path d="${layer.d}" fill="none" stroke="url(#glyph)" stroke-width="${layer.width}" stroke-linejoin="round"${turn}/>`;
  }
  return "";
}

function emblem(id, { dedication = false } = {}) {
  const fam = FAMILIES[CLASS_FAMILY[id]];
  const [outer, inner] = FRAMES[fam.frame];
  const glyph = GLYPHS[id]().map(l => layerSVG(l, fam)).filter(Boolean).join("\n    ");
  const seal = dedication ? `
  <g>
    <circle cx="80" cy="80" r="14" fill="url(#band)" stroke="${fam.line}" stroke-width="1.4"/>
    <circle cx="80" cy="80" r="10.4" fill="${fam.dark}"/>
    <path d="${rrect(77.6, 72, 4.8, 16, 1.2)} ${rrect(72, 77.6, 16, 4.8, 1.2)}" fill="url(#glyph)"/>
  </g>` : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <!-- Eternia: ${dedication ? "Dedication to the class" : "class"} ${id} (tools/make-class-icons.mjs). -->
  <defs>
    <linearGradient id="band" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${fam.top}"/>
      <stop offset="1" stop-color="${fam.bottom}"/>
    </linearGradient>
    <linearGradient id="glyph" gradientUnits="userSpaceOnUse" x1="0" y1="16" x2="0" y2="86">
      <stop offset="0" stop-color="${fam.top}"/>
      <stop offset="0.35" stop-color="${fam.top}"/>
      <stop offset="1" stop-color="${fam.bottom}"/>
    </linearGradient>
  </defs>
  <path d="${outer}" fill="url(#band)" stroke="${fam.line}" stroke-width="1.2" stroke-linejoin="round"/>
  <path d="${inner}" fill="${fam.dark}"/>
  <path d="${inner}" fill="none" stroke="#000" stroke-opacity="0.35" stroke-width="1"/>
  <g transform="translate(50 50) scale(${fam.scale}) translate(-50 -50)">
    ${glyph}
  </g>${seal}
</svg>
`;
}

fs.mkdirSync(OUT, { recursive: true });
for (const id of Object.keys(CLASS_FAMILY)) {
  fs.writeFileSync(path.join(OUT, `${id}.svg`), emblem(id));
  fs.writeFileSync(path.join(OUT, `${id}-dedicacao.svg`), emblem(id, { dedication: true }));
}
console.log(`${Object.keys(CLASS_FAMILY).length * 2} icons in ${path.relative(process.cwd(), OUT)}`);
