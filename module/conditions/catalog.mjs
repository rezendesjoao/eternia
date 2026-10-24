/**
 * The conditions of Eternia (docs/condicoes.md): the 41 statuses added to the 23 of the base rules, and what every
 * status does at the table. The definitions join the system's status list (helpers/statuses.mjs); the tables below
 * are read by the mechanisms of this folder (rolls, actions, damage, turns, recovery).
 *
 * Statuses with a Rating keep it in a field of `system.bad-status` (the status panel edits it, effects with a
 * Rating raise it); `stack` statuses add every new application up to their maximum instead of keeping the highest.
 * Statuses with `source` remember who gave them (the caster of the effect): Fear, Charm, Taunt, Grapple, Bond and
 * Dominated only act against or through that character.
 */

const ICONS = "systems/eternia/assets/ui/status";
const icon = id => `${ICONS}/${id}.svg`;

/** Families of the Bad Statuses, in the order the status panel shows them. */
export const FAMILIES = ["core", "control", "block", "mind", "element", "guard"];

/** @type {import("../helpers/statuses.mjs").LHStatus[]} */
export const NEW_STATUSES = [
  // Control
  { id: "paralyzed", group: "bad", family: "control", img: icon("paralyzed") },
  { id: "asleep", group: "bad", family: "control", img: icon("asleep") },
  { id: "rooted", group: "bad", family: "control", img: icon("rooted") },
  { id: "prone", group: "bad", family: "control", img: icon("prone") },
  { id: "slowed", group: "bad", family: "control", img: icon("slowed") },
  { id: "grappled", group: "bad", family: "control", img: icon("grappled"), source: true },
  // Block
  { id: "silenced", group: "bad", family: "block", img: icon("silenced") },
  { id: "disarmed", group: "bad", family: "block", img: icon("disarmed") },
  { id: "blinded", group: "bad", family: "block", img: icon("blinded") },
  { id: "sealed", group: "bad", family: "block", img: icon("sealed"), tagged: true },
  { id: "weakened", group: "bad", family: "block", img: icon("weakened"), path: "bad-status.weakened", rated: true },
  // Mind
  { id: "frightened", group: "bad", family: "mind", img: icon("frightened"), source: true },
  { id: "charmed", group: "bad", family: "mind", img: icon("charmed"), source: true },
  { id: "taunted", group: "bad", family: "mind", img: icon("taunted"), source: true },
  { id: "dominated", group: "bad", family: "mind", img: icon("dominated"), source: true },
  { id: "berserk", group: "bad", family: "mind", img: icon("berserk"), path: "bad-status.berserk", rated: true },
  // Elements
  { id: "burning", group: "bad", family: "element", img: icon("burning"), path: "bad-status.burning", rated: true },
  { id: "poisoned", group: "bad", family: "element", img: icon("poisoned"), path: "bad-status.poisoned", rated: true },
  { id: "freezing", group: "bad", family: "element", img: icon("freezing"), path: "bad-status.freezing", rated: true, stack: 3 },
  { id: "shocked", group: "bad", family: "element", img: icon("shocked"), path: "bad-status.shocked", rated: true },
  { id: "soaked", group: "bad", family: "element", img: icon("soaked"), path: "bad-status.soaked", rated: true },
  // The fuses add up (a big stack, no threshold): each new one makes the blast bigger
  { id: "fuse", group: "bad", family: "element", img: icon("fuse"), path: "bad-status.fuse", rated: true, stack: 999 },
  { id: "cursed", group: "bad", family: "element", img: icon("cursed") },
  // The fire of Purgatory: no action, water or swim puts it out, and it stops all healing (conditions/damage.mjs)
  { id: "blackFlame", group: "bad", family: "element", img: icon("blackFlame"), path: "bad-status.blackFlame", rated: true, source: true },
  // Guard break
  { id: "exposed", group: "bad", family: "guard", img: icon("exposed") },
  { id: "fissured", group: "bad", family: "guard", img: icon("fissured"), path: "bad-status.fissured", rated: true, stack: 3 },
  { id: "marked", group: "bad", family: "guard", img: icon("marked"), path: "bad-status.marked", rated: true },
  { id: "doom", group: "bad", family: "guard", img: icon("doom"), path: "bad-status.doom", rated: true },
  // Combat Statuses
  { id: "hasted", group: "combat", img: icon("hasted") },
  { id: "empowered", group: "combat", img: icon("empowered"), path: "bad-status.empowered", rated: true },
  { id: "focused", group: "combat", img: icon("focused") },
  { id: "mirror", group: "combat", img: icon("mirror"), path: "bad-status.mirror", rated: true },
  { id: "intangible", group: "combat", img: icon("intangible") },
  { id: "lastStand", group: "combat", img: icon("lastStand") },
  { id: "awakened", group: "combat", img: icon("awakened"), path: "bad-status.awakened", rated: true },
  // A summoned servant (its effect's statusData.tag is the tag of its blows)
  { id: "servant", group: "combat", img: icon("servant"), path: "bad-status.servant", rated: true },
  // The Sun clock (conditions/turns.mjs): the Sun rises every round up to noon, [The One] for a round, then sets
  { id: "sun", group: "combat", img: icon("sun"), path: "bad-status.sun", rated: true },
  { id: "theOne", group: "combat", img: icon("theOne"), path: "bad-status.theOne", rated: true },
  // The next direct attack of a type goes back to the attacker, doubled (statusData.tag: magical | physical | any)
  { id: "counter", group: "combat", img: icon("counter"), tagged: true },
  // The damage taken, kept for one blow (conditions/damage.mjs)
  { id: "grudge", group: "combat", img: icon("grudge"), path: "bad-status.grudge", rated: true },
  // Other
  { id: "bond", group: "other", img: icon("bond"), source: true }
];

/* -------------------------------------------- */
/*  What the statuses do                        */
/* -------------------------------------------- */

/** Statuses that take away the whole Main Process (and every reaction): their combatants are skipped. */
export const NO_ACTIONS = ["paralyzed", "asleep"];

/** Statuses that forbid the actions with the [Movement] tag and moving the token. */
export const NO_MOVEMENT = ["rigor", "rooted", "grappled", "paralyzed", "asleep"];

/** Statuses that forbid reactions (Before / After Check, Damage Roll, Before / After Damage). */
export const NO_REACTIONS = ["dazed", "shocked", "paralyzed", "asleep"];

/** Tags of the skills [Silenced] forbids (unless the skill is also a [Curse]: the demons' power isn't magic). */
export const SILENCED_TAGS = ["Magic Attack", "Spell", "Song"];

/** Statuses that end at the end of their bearer's own Main Process ([Afflicted] keeps the protected ones). */
export const END_OF_OWN_PROCESS = ["staggered", "dazed", "paralyzed", "silenced", "taunted", "weakened", "dominated"];

/** Statuses that end in the Cleanup Process (after its damage). */
export const END_OF_ROUND = ["rooted", "slowed", "blinded", "frightened", "shocked", "exposed", "intangible", "soaked", "counter"];

/** How high the Sun goes (noon), and at night (a scene at least half dark). */
export const SUN_NOON = 5;
export const SUN_NIGHT = 2;

/** Statuses [Afflicted] protects: removing them puts them back at once. */
export const AFFLICTED_PROTECTS = ["staggered", "dazed", "confused", "weakness", "overconfident", "frightened", "charmed"];

/**
 * Statuses the bearer ends by spending an action of its Main Process (the first that is left is used). Outside a
 * combat, or with the action economy off, they simply end.
 */
export const RECOVERY = {
  rigor: ["minor", "major"],
  confused: ["major"],
  decay: ["major"],
  afflicted: ["minor", "major"],
  prone: ["move"],
  grappled: ["major"],
  disarmed: ["minor"],
  charmed: ["major"],
  berserk: ["major"],
  burning: ["minor"],
  poisoned: ["major"],
  freezing: ["major"],
  fissured: ["major"],
  fuse: ["major"]
};

/** Groups whose statuses end with the scene (Bad and Combat Statuses), and the other statuses that do. */
export const END_OF_SCENE_GROUPS = ["bad", "combat"];
export const END_OF_SCENE_OTHERS = ["hidden", "bond"];

/** At their last stack, these statuses turn into something else (their stacks are cleared). */
export const STACK_THRESHOLDS = {
  freezing: { to: ["paralyzed"] },
  fissured: { to: ["exposed"], breakBarrier: true }
};
