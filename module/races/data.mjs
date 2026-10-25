/**
 * The races' data the windows share: the colour of each race's band (by identifier, the old races included for the
 * characters that still have them), the numerals of the stages of the form and the Character Rank of each stage.
 */

export const RACE_COLORS = {
  human: "#9a7816",
  elf: "#2f7f86",
  draconic: "#a8401c",
  demon: "#5d3fa8",
  celestial: "#5c7a90",
  feline: "#2f5fb3",
  lupine: "#6b5a45",
  vulpine: "#b5631c",
  flugel: "#5c7a90",
  etherious: "#5d3fa8",
  oni: "#a3302b",
  exceed: "#2f5fb3",
  vargr: "#6b5a45",
  kitsune: "#b5631c"
};
export const RACE_DEFAULT_COLOR = "#1f5137";

/** The colour of a group of races shown as one card in the creation wizard (the Bestials and their lineages). */
export const GROUP_COLORS = { bestial: "#7a5a2e" };

/** The numerals of the five stages of the form. */
export const ROMAN = ["", "I", "II", "III", "IV", "V"];

/** The order of the races in the creation wizard (the others after, by name). */
export const RACE_ORDER = ["human", "elf", "draconic", "demon", "celestial", "feline", "lupine", "vulpine"];
