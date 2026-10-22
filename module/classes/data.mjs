/**
 * The classes of Eternia (docs/classes.md): what the class tab shows besides the class item itself. The class item
 * (compendium Raças e Classes, folder Classes) has the base (attributes, HP, the grants of the kit, the Path at CR 3
 * and the Apex at CR 10); its skills sit in the compendium of class skills, in a folder named like the class, with
 * flags.eternia:
 *   identifier   "<class>-<name>" (requirements, the Motor rules and the tab find them by it)
 *   kind         "motor" | "feeds" | "spends" | "bends": what the skill does to the Motor
 *   branch       the group of the tab: "kit", a branch of talents, "general", "path", "apex" or "dedication"
 *   motor        its Motor part (motor.mjs)
 *   path / pathTalent / apex / dedication   see motor.mjs and apps/skill-browser.mjs
 */

/** Static data of each class, by the class item's `system.identifier`. */
export const CLASSES = {
  samurai: {
    id: "samurai",
    motor: "samurai",
    color: "#8b2e2b",
    // HP band of docs/classes.md
    band: "robust",
    // Talent branches, in the order of the tab
    branches: ["espera", "fio", "bainha", "aco"],
    // Paths (CR 3), in the order of the tab
    paths: ["lua", "agua", "relampago"]
  }
};

/** Character Ranks of the class milestones (docs/classes.md, Progressão). */
export const MILESTONES = [
  { rank: 1, id: "kit" },
  { rank: 3, id: "path" },
  { rank: 5, id: "dedication" },
  { rank: 10, id: "apex" }
];

/** What a skill does to its Motor: icon of the tab's badge. */
export const KIND_ICONS = {
  motor: "fa-solid fa-gear",
  feeds: "fa-solid fa-arrow-up",
  spends: "fa-solid fa-burst",
  bends: "fa-solid fa-shuffle"
};
