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
  assassino: {
    id: "assassino",
    motor: "assassino",
    color: "#4a3b5c",
    band: "light",
    branches: ["sombra", "veneno", "lamina", "rede"],
    paths: ["fantasma", "carrasco", "teia"]
  },
  berserker: {
    id: "berserker",
    motor: "berserker",
    color: "#8c2f1d",
    band: "robust",
    branches: ["sangue", "furia", "massacre", "couro"],
    paths: ["gigante", "dragao", "ancestrais"]
  },
  cacador: {
    id: "cacador",
    motor: "cacador",
    color: "#4f6b2e",
    band: "firm",
    branches: ["olho", "aljava", "rastro", "vento"],
    paths: ["falcao", "chuva", "aguia"]
  },
  comandante: {
    id: "comandante",
    motor: "comandante",
    color: "#6b5a2a",
    band: "firm",
    branches: ["vanguarda", "formacao", "estandarte", "mapa"],
    paths: ["marechal", "capitao", "bandeira"]
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
    color: "#3b5b7a",
    band: "colossal",
    branches: ["muralha", "desafio", "martelo", "guarda"],
    paths: ["fortaleza", "escudo", "retaliacao"]
  },
  invocador: {
    id: "invocador",
    motor: "invocador",
    color: "#3f6f8f",
    band: "light",
    branches: ["lobo", "golem", "fada", "pacto"],
    paths: ["legiao", "fusao", "tita"]
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
    color: "#b5651d",
    band: "firm",
    branches: ["punho", "fluxo", "vento", "centro"],
    paths: ["montanha", "rio", "tempestade"]
  },
  oraculo: {
    id: "oraculo",
    motor: "oraculo",
    color: "#7a3e8c",
    band: "firm",
    branches: ["cura", "juizo", "presagio", "veu"],
    paths: ["vida", "chamas", "ossos"]
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
    color: "#8b2e2b",
    // HP band of docs/classes.md
    band: "robust",
    // Talent branches, in the order of the tab
    branches: ["espera", "fio", "bainha", "aco"],
    // Paths (CR 3), in the order of the tab
    paths: ["lua", "agua", "relampago"]
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
