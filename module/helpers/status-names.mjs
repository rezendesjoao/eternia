/**
 * The names the texts give to the statuses: the ones a chat link can apply (and how their value works) and the extra
 * names some texts use. Read by the status links of the chat (chat/status-links.mjs) and the bracket chips
 * (helpers/text-chips.mjs).
 */

/** The statuses that can be applied from a link, and how their value works. */
export const LINKABLE = {
  staggered: {}, dazed: {}, rigor: {}, confused: {}, afflicted: {}, overconfident: {},
  decay: { rated: true }, regen: { rated: true }, barrier: { rated: true },
  pursuit: { rated: true },
  weakness: { rated: true, tagged: true },
  cancel: { rated: true, tagged: true },
  // The conditions of Eternia (conditions/catalog.mjs)
  paralyzed: {}, asleep: {}, rooted: {}, prone: {}, slowed: {}, grappled: {},
  silenced: {}, disarmed: {}, blinded: {}, sealed: { tagged: true },
  frightened: {}, charmed: {}, taunted: {}, berserk: { rated: true },
  burning: { rated: true }, poisoned: { rated: true }, freezing: { rated: true }, shocked: { rated: true }, cursed: {},
  exposed: {}, fissured: { rated: true }, marked: { rated: true }, doom: { rated: true },
  hasted: {}, empowered: { rated: true }, focused: {}, mirror: { rated: true }, intangible: {}, lastStand: {},
  awakened: { rated: true }, bond: {},
  // The conditions of the Magias' review (0.26)
  soaked: { rated: true }, weakened: { rated: true }, fuse: { rated: true }, servant: { rated: true, tagged: true },
  dominated: {},
  // The conditions of 0.27 (the Sun clock, the Counter, the Grudge, the Black Flame)
  blackFlame: { rated: true }, sun: { rated: true }, theOne: { rated: true }, counter: { tagged: true },
  grudge: { rated: true }
};

/** Extra names some texts use. */
export const SYNONYMS = {
  regeneration: "regen", pursuits: "pursuit", weaknesses: "weakness", cancellation: "cancel",
  paralysis: "paralyzed", paralisia: "paralyzed", sleep: "asleep", sono: "asleep", root: "rooted", grapple: "grappled",
  silence: "silenced", silêncio: "silenced", disarm: "disarmed", blind: "blinded", cegueira: "blinded", seal: "sealed",
  selo: "sealed", fear: "frightened", charm: "charmed", encanto: "charmed", taunt: "taunted", provocação: "taunted",
  rage: "berserk", burn: "burning", queimadura: "burning", poison: "poisoned", veneno: "poisoned", freeze: "freezing",
  frozen: "freezing", congelado: "freezing", shock: "shocked", choque: "shocked", curse: "cursed", maldição: "cursed",
  crack: "fissured", fissura: "fissured", mark: "marked", marca: "marked", sentence: "doom", haste: "hasted",
  focus: "focused", foco: "focused", reflect: "mirror", reflexo: "mirror", "último fôlego": "lastStand",
  "last stand": "lastStand", awaken: "awakened", transformação: "awakened", link: "bond",
  soak: "soaked", molhado: "soaked", weaken: "weakened", enfraquecer: "weakened", dominate: "dominated",
  dominação: "dominated", servo: "servant",
  "fogo negro": "blackFlame", "chamas negras": "blackFlame", hellblaze: "blackFlame", "the one": "theOne",
  "contra-ataque": "counter", vingança: "grudge"
};
