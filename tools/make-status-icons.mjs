// Status icons: the white glyph of a game-icons.net icon (CC BY 3.0) on a square of the status group's color, with
// the credit in a comment, written to assets/ui/status/<id>.svg. Icons that already exist are kept unless --all.
// Usage: node tools/make-status-icons.mjs <game-icons folder> [--all]
//   The folder has the layout of https://github.com/game-icons/icons (<author>/<name>.svg).
import fs from "fs";
import path from "path";

const COLORS = { life: "#5d4a91", bad: "#b23a48", combat: "#1f8a70", other: "#c0861b" };
const AUTHORS = { lorc: "Lorc", delapouite: "Delapouite", sbed: "Sbed", skoll: "Skoll", zeromancer: "Zeromancer",
  "carl-olsen": "Carl Olsen" };

/** Status id -> [group, "author/icon"]. */
const STATUS_ICONS = {
  fatigue: ["life", "delapouite/tired-eye"],
  weakness: ["life", "lorc/cracked-shield"],
  incapacitated: ["life", "skoll/knockout"],
  dead: ["life", "lorc/tombstone"],
  staggered: ["bad", "lorc/foot-trip"],
  dazed: ["bad", "delapouite/knocked-out-stars"],
  rigor: ["bad", "delapouite/frozen-body"],
  confused: ["bad", "lorc/brainstorm"],
  decay: ["bad", "lorc/bleeding-wound"],
  pursuit: ["bad", "lorc/footprint"],
  afflicted: ["bad", "lorc/broken-heart"],
  overconfident: ["bad", "lorc/laurel-crown"],
  paralyzed: ["bad", "lorc/spider-web"],
  asleep: ["bad", "delapouite/night-sleep"],
  rooted: ["bad", "delapouite/tree-roots"],
  prone: ["bad", "sbed/falling"],
  slowed: ["bad", "lorc/snail"],
  grappled: ["bad", "lorc/grab"],
  silenced: ["bad", "delapouite/silenced"],
  disarmed: ["bad", "skoll/drop-weapon"],
  blinded: ["bad", "delapouite/blindfold"],
  sealed: ["bad", "lorc/padlock"],
  frightened: ["bad", "lorc/terror"],
  charmed: ["bad", "lorc/smitten"],
  taunted: ["bad", "lorc/shouting"],
  berserk: ["bad", "delapouite/enrage"],
  burning: ["bad", "carl-olsen/flame"],
  poisoned: ["bad", "lorc/poison-bottle"],
  freezing: ["bad", "lorc/snowflake-2"],
  shocked: ["bad", "sbed/electric"],
  cursed: ["bad", "lorc/cursed-star"],
  exposed: ["bad", "skoll/shield-disabled"],
  fissured: ["bad", "lorc/cracked-helm"],
  marked: ["bad", "delapouite/human-target"],
  doom: ["bad", "lorc/grim-reaper"],
  regen: ["combat", "zeromancer/heart-plus"],
  cancel: ["combat", "sbed/cancel"],
  barrier: ["combat", "lorc/magic-shield"],
  hasted: ["combat", "lorc/sprint"],
  empowered: ["combat", "lorc/muscle-up"],
  focused: ["combat", "lorc/meditation"],
  mirror: ["combat", "lorc/mirror-mirror"],
  intangible: ["combat", "lorc/ghost"],
  lastStand: ["combat", "lorc/half-heart"],
  awakened: ["combat", "lorc/aura"],
  hidden: ["other", "lorc/hidden"],
  swimming: ["other", "delapouite/swimfins"],
  flying: ["other", "lorc/feathered-wing"],
  identified: ["other", "lorc/magnifying-glass"],
  standby: ["other", "lorc/hourglass"],
  hateTop: ["other", "delapouite/angry-eyes"],
  hateUnder: ["other", "lorc/target-arrows"],
  absent: ["other", "delapouite/exit-door"],
  bond: ["other", "lorc/linked-rings"]
};

const [source, ...flags] = process.argv.slice(2);
if (!source) {
  console.error("Usage: node tools/make-status-icons.mjs <game-icons folder> [--all]");
  process.exit(1);
}
const all = flags.includes("--all");
const out = "assets/ui/status";
let written = 0;
for (const [id, [group, icon]] of Object.entries(STATUS_ICONS)) {
  const file = path.join(out, `${id}.svg`);
  if (!all && fs.existsSync(file)) continue;
  const [author, name] = icon.split("/");
  const svg = fs.readFileSync(path.join(source, author, `${name}.svg`), "utf8");
  const glyphs = [...svg.matchAll(/<path\b[^>]*\bd="([^"]+)"/g)].map(m => m[1]).filter(d => !d.startsWith("M0 0h512v512H0z"));
  if (!glyphs.length) throw new Error(`${icon}: no glyph`);
  const credit = `<!-- "${name}" by ${AUTHORS[author] ?? author}, https://game-icons.net, CC BY 3.0. Background recolored. -->`;
  const body = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path fill="${COLORS[group]}" d="M0 0h512v512H0z"/>`
    + glyphs.map(d => `<path fill="#fff" d="${d}"/>`).join("") + "</svg>";
  fs.writeFileSync(file, `${credit}\n${body}`);
  written++;
}
console.log(`${written} icon(s) written to ${out}`);
