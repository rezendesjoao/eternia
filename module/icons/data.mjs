/**
 * Item icons: a frame for the magic grade ([M1] to [M7]) and, from level 11, movement: a glint that crosses the
 * icon and, from level 21, an aura and particles with the item's theme (docs/icones.md).
 */
import { GRADE_QUALITY, QUALITY_COLORS } from "../professions/data.mjs";

/** Item types that get a frame, and the ones that also move with the level. */
export const FRAMED_TYPES = ["weapon", "armor", "shield", "accessory", "bag", "mount", "usable", "gear"];
export const MOVING_TYPES = ["weapon", "armor", "shield", "accessory"];

/** Generic icons shared by many items: never decorated. */
export const GENERIC_ICONS = "systems/eternia/assets/ui/items_icons/";

/** Level from which the icon gets a glint (1) and an aura with particles (2). */
export const TIER_LEVELS = [11, 21];

/**
 * Frames by magic grade. M1 to M3 (Magic items) take the color of the profession qualities; M4 to M6 (Artifacts)
 * are gold with a gem; M7 (Phantasmal) is spectral.
 */
export const GRADES = {
  1: { frame: "magic", color: QUALITY_COLORS[GRADE_QUALITY[1]] },
  2: { frame: "magic", color: QUALITY_COLORS[GRADE_QUALITY[2]] },
  3: { frame: "magic", color: QUALITY_COLORS[GRADE_QUALITY[3]] },
  4: { frame: "artifact", gem: ["#ffe3a0", "#f0a51e", "#7a4a05"] },
  5: { frame: "artifact", gem: ["#ffb8ae", "#d63a3a", "#6a0e0e"] },
  6: { frame: "artifact", gem: ["#bfe6ff", "#2f8fe0", "#0b3a6a"] },
  7: { frame: "phantasm", gem: ["#ffffff", "#8fe8dc", "#2b5a72"] }
};

/**
 * The themes of the aura and the particles: the aura color ("auto": the color of the icon's background), two
 * particle colors (light, main) and the parts, as [kind, count, shape?]. Kinds: twinkle, rise, drift, embers, fall,
 * float, gust, ripple, orbit, smoke, bolt, bubble, rays (compose.mjs).
 */
export const THEMES = {
  steel: { aura: "auto", colors: ["#ffffff", "#cfe0ff"], parts: [["twinkle", 7], ["drift", 4]] },
  gold: { aura: "#ffb83a", colors: ["#fff3c4", "#ffbf3f"], parts: [["rise", 8], ["twinkle", 3]] },
  gale: { aura: "#8fdcff", colors: ["#ffffff", "#bfeaff"], parts: [["gust", 4], ["drift", 4]] },
  petals: { aura: "#ff8fbf", colors: ["#fff0f5", "#ff9cc0"], parts: [["fall", 7, "petal"], ["twinkle", 1]] },
  wisteria: { aura: "#b48cff", colors: ["#f3e9ff", "#b48cff"], parts: [["fall", 7, "petal"], ["twinkle", 1]] },
  moon: { aura: "#8fb3ff", colors: ["#f2f6ff", "#9ec3ff"], parts: [["rise", 6], ["twinkle", 3]] },
  shadow: { aura: "#7a3fd0", colors: ["#e3c8ff", "#9b5cff"], parts: [["smoke", 6], ["rise", 5]] },
  arcane: { aura: "#7f6bff", colors: ["#f0ecff", "#8fb0ff"], parts: [["orbit", 8], ["twinkle", 3]] },
  verdant: { aura: "#6fd06a", colors: ["#efffd9", "#78d064"], parts: [["float", 5, "leaf"], ["rise", 4]] },
  notes: { aura: "#ffc04a", colors: ["#fff4cf", "#ffc04a"], parts: [["float", 4, "note"], ["twinkle", 3]] },
  trance: { aura: "#a86bff", colors: ["#f6eaff", "#b68cff"], parts: [["ripple", 3], ["float", 3, "note"]] },
  dragon: { aura: "#ff4a2a", colors: ["#ffe08a", "#ff4a2a"], parts: [["embers", 10], ["twinkle", 2]] },
  embers: { aura: "#ff6a1f", colors: ["#ffe9a0", "#ff7a2f"], parts: [["embers", 11]] },
  frost: { aura: "#7fd4ff", colors: ["#ffffff", "#bfeaff"], parts: [["fall", 6, "flake"], ["twinkle", 3]] },
  sparks: { aura: "#ffe14a", colors: ["#fffbe0", "#ffe14a"], parts: [["bolt", 4], ["twinkle", 3]] },
  radiance: { aura: "#ffe9a0", colors: ["#fffdf0", "#ffe58a"], parts: [["rays", 1], ["rise", 6]] },
  venom: { aura: "#6fd04a", colors: ["#e4ffcc", "#6fd04a"], parts: [["bubble", 7], ["rise", 2]] },
  mind: { aura: "#b86bff", colors: ["#f6e8ff", "#c07cff"], parts: [["ripple", 3], ["orbit", 4]] }
};

/** The theme of an element tag, before the kind of the weapon. */
export const ELEMENT_THEMES = {
  Flame: "embers", Cold: "frost", Shock: "sparks", Holy: "radiance", Radiance: "radiance", Poison: "venom",
  Mental: "mind"
};

/** The theme of a weapon kind (tag) when the item has no element nor theme of its own. */
export const KIND_THEMES = {
  Staff: "arcane", Instrument: "notes", Bow: "gale", Crossbow: "gale", Katana: "petals", Throwing: "gale",
  Whip: "gale"
};
export const DEFAULT_THEME = "steel";
