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
 *   element / elementTalent   { class, id }: an element skill chosen at CR 1 (the Dragon Slayer's) and its talents
 *   magic / magicSpell        { id }: a Magia (chosen in the class's Magia slots) and its spells
 */

/**
 * The colors of the classes by family and function: the physical classes in warm colors, the magic ones in cool
 * colors, one shade for each function in the group. The same as the emblems (tools/make-class-icons.mjs), darker: the
 * band and the accents of the class tab.
 */
export const CLASS_COLORS = {
  physical: { tanque: "#8a5a2b", dano: "#a3302b", precisao: "#b5631c", suporte: "#9a7816" },
  magic: { dano: "#5d3fa8", hibrida: "#2f5fb3", controle: "#1f7f75", suporte: "#5c7a90" }
};

/** Static data of each class, by the class item's `system.identifier`. */
export const CLASSES = {
  assassino: {
    id: "assassino",
    motor: "assassino",
    family: "physical",
    role: "precisao",
    color: CLASS_COLORS.physical.precisao,
    band: "light",
    branches: ["sombra", "veneno", "lamina", "rede"],
    paths: ["fantasma", "carrasco", "teia"],
    magic: true
  },
  berserker: {
    id: "berserker",
    motor: "berserker",
    family: "physical",
    role: "dano",
    color: CLASS_COLORS.physical.dano,
    band: "robust",
    branches: ["sangue", "furia", "massacre", "couro"],
    paths: ["gigante", "dragao", "ancestrais"],
    magic: true
  },
  cacador: {
    id: "cacador",
    motor: "cacador",
    family: "physical",
    role: "precisao",
    color: CLASS_COLORS.physical.precisao,
    band: "firm",
    branches: ["olho", "aljava", "rastro", "vento"],
    paths: ["falcao", "chuva", "aguia"],
    magic: true
  },
  comandante: {
    id: "comandante",
    motor: "comandante",
    family: "physical",
    role: "suporte",
    color: CLASS_COLORS.physical.suporte,
    band: "firm",
    branches: ["vanguarda", "formacao", "estandarte", "mapa"],
    paths: ["marechal", "capitao", "bandeira"],
    magic: true
  },
  druida: {
    id: "druida",
    motor: "druida",
    color: "#2e6b3a",
    band: "firm",
    branches: ["fera", "raiz", "estacao", "selva"],
    paths: ["primeva", "bosque", "enxame"]
  },
  estrategista: {
    id: "estrategista",
    motor: "estrategista",
    color: "#2f4f6f",
    band: "light",
    branches: ["plano", "previsao", "licao", "tabuleiro"],
    paths: ["xadrez", "antevisao", "detetive"]
  },
  feiticeiro: {
    id: "feiticeiro",
    motor: "feiticeiro",
    color: "#c2410c",
    band: "frail",
    branches: ["chama", "fole", "fornalha", "cinza"],
    paths: ["vulcao", "geada", "estrela"]
  },
  guardiao: {
    id: "guardiao",
    motor: "guardiao",
    family: "physical",
    role: "tanque",
    color: CLASS_COLORS.physical.tanque,
    band: "colossal",
    branches: ["muralha", "desafio", "martelo", "guarda"],
    paths: ["fortaleza", "escudo", "retaliacao"],
    magic: true
  },
  invocador: {
    id: "invocador",
    motor: "invocador",
    family: "magic",
    role: "controle",
    color: CLASS_COLORS.magic.controle,
    band: "light",
    branches: ["lobo", "golem", "fada", "pacto"],
    paths: ["legiao", "fusao", "tita"],
    // A magic class since 0.13 (its grants have the Magia slots)
    magic: true
  },
  magoazul: {
    id: "magoazul",
    motor: "magoazul",
    family: "magic",
    role: "hibrida",
    color: CLASS_COLORS.magic.hibrida,
    band: "firm",
    branches: ["grimorio", "forma", "garra", "guarda"],
    paths: ["corpo-inteiro", "metamorfose", "grimorio-azul"],
    magic: true
  },
  magobranco: {
    id: "magobranco",
    motor: "magobranco",
    family: "magic",
    role: "suporte",
    color: CLASS_COLORS.magic.suporte,
    band: "light",
    branches: ["runa", "selo", "barreira", "julgamento"],
    paths: ["augurio", "lei-absoluta", "cerco"],
    magic: true
  },
  magonegro: {
    id: "magonegro",
    motor: "magonegro",
    family: "magic",
    role: "dano",
    color: CLASS_COLORS.magic.dano,
    band: "frail",
    branches: ["fluxo", "reserva", "muralha", "ruina"],
    paths: ["classe-s", "mago-santo", "spriggan"],
    // A magic class: its grants have Magia slots (CR 1, 5 and 10) and the tab shows the Magias
    magic: true
  },
  magovermelho: {
    id: "magovermelho",
    motor: "magovermelho",
    family: "magic",
    role: "hibrida",
    color: CLASS_COLORS.magic.hibrida,
    band: "firm",
    branches: ["espada", "armadura", "foco", "troca"],
    paths: ["arma-selada", "panoplia", "troca-relampago"],
    magic: true
  },
  matador: {
    id: "matador",
    motor: "matador",
    family: "magic",
    role: "dano",
    color: CLASS_COLORS.magic.dano,
    band: "firm",
    branches: ["fome", "escama", "garra", "rugido"],
    paths: ["primeira", "segunda", "terceira"],
    // Elements (chosen at CR 1, module/classes/matador.mjs), in the order of the tab
    elements: ["fogo", "ferro", "ceu", "raio", "branco", "sombras", "veneno"],
    magic: true
  },
  menestrel: {
    id: "menestrel",
    motor: "menestrel",
    color: "#a83262",
    band: "light",
    branches: ["repertorio", "compasso", "palco", "plateia"],
    paths: ["maestro", "trovador", "sereia"]
  },
  monge: {
    id: "monge",
    motor: "monge",
    family: "physical",
    role: "dano",
    color: CLASS_COLORS.physical.dano,
    band: "firm",
    branches: ["punho", "fluxo", "vento", "centro"],
    paths: ["montanha", "rio", "tempestade"],
    magic: true
  },
  oraculo: {
    id: "oraculo",
    motor: "oraculo",
    color: "#7a3e8c",
    band: "firm",
    branches: ["cura", "juizo", "presagio", "veu"],
    paths: ["vida", "chamas", "ossos"]
  },
  pictomante: {
    id: "pictomante",
    motor: "pictomante",
    family: "magic",
    role: "controle",
    color: CLASS_COLORS.magic.controle,
    band: "light",
    branches: ["lamina", "escudo", "prisao", "gesto"],
    paths: ["arma", "criatura", "paisagem"],
    magic: true
  },
  ressonante: {
    id: "ressonante",
    motor: "ressonante",
    color: "#2f8f8f",
    band: "firm",
    branches: ["lamina", "egide", "joia", "eco"],
    paths: ["icone", "triade", "supernova"]
  },
  sacerdote: {
    id: "sacerdote",
    motor: "sacerdote",
    color: "#c9a24a",
    band: "firm",
    branches: ["prece", "escudo", "vigilia", "luz"],
    paths: ["misericordia", "martir", "aurora"]
  },
  samurai: {
    id: "samurai",
    motor: "samurai",
    family: "physical",
    role: "dano",
    color: CLASS_COLORS.physical.dano,
    // HP band of docs/classes.md
    band: "robust",
    // Talent branches, in the order of the tab
    branches: ["espera", "fio", "bainha", "aco"],
    // Paths (CR 3), in the order of the tab
    paths: ["lua", "agua", "relampago"],
    magic: true
  },
  tecelao: {
    id: "tecelao",
    motor: "tecelao",
    color: "#6b4fa0",
    band: "light",
    branches: ["tear", "no", "trama", "tesoura"],
    paths: ["acaso", "destino", "bordado"]
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
