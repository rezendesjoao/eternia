/**
 * The Druid's Motor: the Forms (Formas). docs/classes.md has the class; AS REGRAS, page XI, the rules as the player
 * reads them.
 *
 * The druid is in its human form or in a beast form, and gathers Sap (Seiva) up to the cap (3, +1 every 5 CR, + the
 * SR of Breath of the Woods). Each form is a menu of its own: the beast skills need a beast form and the healing ones
 * the human form (flags needs.state). Taking a beast form (Call of the Beast) costs 1 Sap (2 on the Primeval Beast
 * Path, none with the Apex); in a beast form each Cleanup Process costs 1 more, and with none left the druid goes back
 * to the human form. In the human form the Setup Process gives +1 Sap. While a form lasts it gives its statuses
 * (statuses): the bear [Cancel: 2 + Sap] (and [Barrier: CR+5] when taken), the wolf [Empowered: CR÷2 + 2], the hawk
 * and the swarm [Flying], the oak (Grove Path) [Cancel: 4 + Sap×2] and a heal to the allies next to it at each Setup.
 *
 * State in flags.eternia.motor.druida:
 *   state   "humana" | "urso" | "lobo" | "falcao" | "carvalho" | "enxame"
 *   value   Sap
 *   from    the form before the last change (the bear's Barrier is only for a new bear)
 */
import { L } from "../settings.mjs";
import { canHeal } from "../conditions/damage.mjs";
import { combatOf, toInt } from "../helpers/utils.mjs";
import {
  areAllies, areEnemies, chooseOption, combatPeers, crOf, hasApex, identifierOf, motorData, pathOf, setMotor, talentOf,
  talentRank
} from "./motor.mjs";

export const DRUIDA_ID = "druida";

/** Identifier of a Druid skill. */
const T = name => `druida-${name}`;

const DEFAULTS = { state: "humana", value: 1, from: null };

/** The beast forms (every form but the human one). */
export const BEASTS = ["urso", "lobo", "falcao", "carvalho", "enxame"];
const isBeast = state => BEASTS.includes(state);

/** The Druid's strikes in a beast form (Sharp Claws adds to them). */
const BEAST_ATTACKS = new Set(["garra-e-presa", "investida-do-urso", "bote-do-lobo", "nuvem-voraz", "rugido-ancestral"].map(T));

/** The Path the actor follows (none with only the Lesser Forms). */
const path = (actor, lesser) => (lesser ? null : pathOf(actor, DRUIDA_ID));

/**
 * The beast forms an actor knows: the bear and the wolf (the Grove trades the wolf for the oak), the hawk with Hawk
 * Wings, the swarm on its Path; only the wolf with the Lesser Forms.
 * @param {Actor} actor
 * @param {boolean} lesser
 * @returns {string[]}
 */
export function knownForms(actor, lesser) {
  if (lesser) return ["lobo"];
  const followed = pathOf(actor, DRUIDA_ID);
  const forms = ["urso"];
  if (followed !== "bosque") forms.push("lobo");
  if (talentOf(actor, T("asas-do-falcao"))) forms.push("falcao");
  if (followed === "bosque") forms.push("carvalho");
  if (followed === "enxame") forms.push("enxame");
  return forms;
}

/** Sap a beast form costs: 1, 2 on the Primeval Beast Path, none with the Apex. */
function formCost(actor, lesser) {
  if (!lesser && hasApex(actor, DRUIDA_ID)) return 0;
  return (path(actor, lesser) === "primeva") ? 2 : 1;
}

/** Sap a beast strike (Bear Charge, Wolf Pounce) spends: 1, none on the Primeval Beast Path with the Apex. */
function strikeCost(actor, lesser) {
  return (!lesser && (path(actor, lesser) === "primeva") && hasApex(actor, DRUIDA_ID)) ? 0 : 1;
}

/** Squares between two actors' tokens on the scene being viewed (Infinity when one has none). */
function squaresBetween(a, b) {
  const ta = a?.getActiveTokens?.()[0]?.document;
  const tb = b?.getActiveTokens?.()[0]?.document;
  if (!ta || !tb || (ta.parent !== tb.parent)) return Infinity;
  const size = ta.parent.grid?.size || 100;
  return Math.round(Math.max(Math.abs(ta.x - tb.x), Math.abs(ta.y - tb.y)) / size);
}

/** Give statuses to an actor, as a skill's effect would (status-links.mjs: loaded here, it reaches back to motor.mjs). */
async function giveStatus(actor, id, value, { caster = null, expires = "endOfScene" } = {}) {
  const { giveEffects, statusEffectData } = await import("../chat/status-links.mjs");
  return giveEffects(actor, [statusEffectData(id, value, "", { caster, expires })]);
}

export const DRUIDA = {
  id: DRUIDA_ID,
  i18n: "Motor.Druida",
  states: ["humana", ...BEASTS],
  stateColors: {
    humana: 0x2f7a52, urso: 0x7a5230, lobo: 0x6b7480, falcao: 0x4a90c2, carvalho: 0x3d5c2a, enxame: 0xb8860b
  },
  defaults: DEFAULTS,
  costKeyword: "Seiva",

  /** The cap of Sap. */
  max(actor, { lesser }) {
    let max = 3 + Math.floor(crOf(actor) / 5);
    if (lesser) max = Math.max(1, Math.floor(max / 2));
    return max + talentRank(actor, T("folego-da-mata"));
  },

  /** Instinctive Shift needs another form; the beast strikes need their Sap. */
  issues(actor, item, motor, { data, lesser }) {
    const id = identifierOf(item);
    if (id === T("transformacao-instintiva")) {
      if (data.state === "urso") return [L("Motor.Druida.AlreadyBear")];
      if (lesser) return [L("Motor.Druida.NoBear")];
      const cost = formCost(actor, lesser);
      return (toInt(data.value) < cost) ? [L("Motor.Druida.NoSap", { n: cost })] : [];
    }
    if ([T("investida-do-urso"), T("bote-do-lobo")].includes(id)) {
      const cost = strikeCost(actor, lesser);
      return (toInt(data.value) < cost) ? [L("Motor.Druida.NoSap", { n: cost })] : [];
    }
    return [];
  },

  /** Wild Instinct and the Apex: the Call of the Beast is a Move Action. */
  actionOf(actor, item, motor, action) {
    if (identifierOf(item) !== T("chamado-da-fera")) return action;
    return (hasApex(actor, DRUIDA_ID) || talentOf(actor, T("instinto-selvagem"))) ? "move" : action;
  },

  /** The Call of the Beast asks the form; the shifts and the beast strikes pay their Sap. */
  async plan(actor, item, motor, { data, lesser, plan }) {
    const id = identifierOf(item);
    if (id === T("chamado-da-fera")) {
      const forms = knownForms(actor, lesser).filter(f => f !== data.state);
      if (isBeast(data.state)) forms.push("humana");
      const choice = await chooseOption(item.name, forms.map(f => ({ value: f, label: L(`Motor.Druida.State.${f}`) })), {
        hint: L("Motor.Druida.ChooseForm", { n: toInt(data.value) })
      });
      if (!choice) return null;
      const cost = (choice === "humana") ? 0 : formCost(actor, lesser);
      if (toInt(data.value) < cost) {
        ui.notifications.warn(L("Motor.Druida.NoSap", { n: cost }));
        return null;
      }
      plan.spent = cost;
      plan.set = choice;
      plan.changes.from = data.state;
    }
    else if (id === T("transformacao-instintiva")) {
      plan.spent = formCost(actor, lesser);
      plan.set = "urso";
      plan.changes.from = data.state;
    }
    else if ([T("investida-do-urso"), T("bote-do-lobo")].includes(id)) {
      plan.spent = Math.min(toInt(data.value), strikeCost(actor, lesser));
    }
    return plan;
  },

  /** A new bear: [Barrier: CR+5]. */
  async onUse(actor, { lesser }, item, plan) {
    if (!plan || (plan.set !== "urso") || (plan.changes?.from === "urso")) return;
    await giveStatus(actor, "barrier", crOf(actor) + 5, { caster: actor });
  },

  /** The statuses of the form, in combat. */
  statuses(actor, { data }) {
    if (!combatOf(actor)) return [];
    const sap = toInt(data.value);
    switch (data.state) {
      case "urso": return [{ key: "forma", statusId: "cancel", value: 2 + sap }];
      case "lobo": return [{ key: "forma", statusId: "empowered", value: Math.floor(crOf(actor) / 2) + 2 }];
      case "falcao":
      case "enxame": return [{ key: "forma", statusId: "flying" }];
      case "carvalho": return [{ key: "forma", statusId: "cancel", value: 4 + (sap * 2) }];
    }
    return [];
  },

  /** Sharp Claws: in a beast form, the beast strikes add +[Sap×2] to their damage. */
  rollBonuses(actor, item, which) {
    if (which !== "damage") return [];
    const claws = talentOf(actor, T("garras-afiadas"));
    if (!claws || !BEAST_ATTACKS.has(identifierOf(item))) return [];
    const data = motorData(actor, DRUIDA_ID);
    const sap = toInt(data.value);
    return (isBeast(data.state) && (sap > 0)) ? [{ dice: 0, mod: sap * 2, label: claws.name }] : [];
  },

  /** What the Druid's strikes leave on whoever they hit. */
  onHit(actor, item, { lesser }) {
    const id = identifierOf(item);
    const data = motorData(actor, DRUIDA_ID);
    const out = [];
    if (id === T("garra-e-presa")) {
      if (data.state === "urso") out.push({ statusId: "taunted", value: null, name: item.name });
      if (data.state === "carvalho") out.push({ statusId: "prone", value: null, name: item.name });
    }
    if (id === T("investida-do-urso")) out.push({ statusId: "prone", value: null, name: item.name });
    if (id === T("raizes-que-prendem")) out.push({ statusId: "rooted", value: null, name: item.name });
    if (id === T("espinheiro")) out.push({ statusId: "slowed", value: null, name: item.name });
    if (id === T("rugido-ancestral")) out.push({ statusId: "frightened", value: null, name: item.name });
    const stings = talentOf(actor, T("mil-ferroadas"));
    if (stings && !lesser && (data.state === "enxame") && [T("garra-e-presa"), T("nuvem-voraz")].includes(id)) {
      out.push({ statusId: "poisoned", value: Math.floor(crOf(actor) / 2) + 2, name: stings.name });
    }
    return out;
  },

  /* ------------------------------------------ */
  /*  Events                                    */
  /* ------------------------------------------ */

  /** Every combat starts in the human form, with 1 Sap and those of Deep Roots. */
  async onCombatStart(actor) {
    await setMotor(actor, DRUIDA_ID, { ...DEFAULTS, value: 1 + talentRank(actor, T("raizes-fundas")) });
  },

  /** Setup Process: +1 Sap in the human form (and in the oak with Roots of the World); the oak heals its neighbors. */
  async onSetup(actor, { lesser }) {
    const data = motorData(actor, DRUIDA_ID);
    const grows = (data.state === "humana") || ((data.state === "carvalho") && !!talentOf(actor, T("raizes-do-mundo")));
    if (grows) await setMotor(actor, DRUIDA_ID, { ...data, value: toInt(data.value) + 1 });
    if ((data.state !== "carvalho") || (path(actor, lesser) !== "bosque")) return;
    const reach = hasApex(actor, DRUIDA_ID) ? 3 : 1;
    const heal = Math.floor(crOf(actor) / 2) + 2;
    const healed = [];
    for (const ally of combatPeers(actor).filter(a => areAllies(actor, a) && (squaresBetween(actor, a) <= reach))) {
      const hp = toInt(ally.system.health?.value);
      const max = toInt(ally.system.health?.max);
      if (!canHeal(ally) || (hp <= 0) || (hp >= max)) continue;
      await ally.update({ "system.health.value": Math.min(max, hp + heal) });
      healed.push(`${ally.token?.name ?? ally.name} +${Math.min(max, hp + heal) - hp}`);
    }
    if (healed.length) {
      await ChatMessage.create({
        speaker: ChatMessage.getSpeaker({ actor }),
        content: `<p><strong>${L("Motor.Druida.State.carvalho")}</strong>: ${healed.join(", ")} PV</p>`
      });
    }
  },

  /** Cleanup Process: a beast form costs 1 Sap; with none, back to the human form. */
  async onCleanup(actor, { lesser }) {
    const data = motorData(actor, DRUIDA_ID);
    if (!isBeast(data.state)) return;
    const followed = path(actor, lesser);
    if ((followed === "primeva") && (data.state !== "carvalho")) return;
    if ((data.state === "carvalho") && talentOf(actor, T("raizes-do-mundo"))) return;
    if (toInt(data.value) > 0) await setMotor(actor, DRUIDA_ID, { ...data, value: toInt(data.value) - 1 });
    else await setMotor(actor, DRUIDA_ID, { ...data, state: "humana", from: data.state });
  },

  async onCombatEnd(actor) {
    await setMotor(actor, DRUIDA_ID, { ...DEFAULTS });
  },

  /** Primeval Blood (Primeval Beast Path): an attack takes HP from the druid in a beast form: +1 Sap. */
  async onDamaged(actor, { lesser }, amount, attacker) {
    if ((path(actor, lesser) !== "primeva") || !talentOf(actor, T("sangue-primevo"))) return;
    const data = motorData(actor, DRUIDA_ID);
    if (!isBeast(data.state) || (attacker && !areEnemies(actor, attacker))) return;
    await setMotor(actor, DRUIDA_ID, { ...data, value: toInt(data.value) + 1 });
  },

  /** Fury of the Beast: an attack of the druid in a beast form leaves an enemy at 0 HP: +1 Sap. */
  async onKill(actor, { lesser }, target, item) {
    if (!talentOf(actor, T("furia-da-fera")) || !areEnemies(actor, target) || (item?.actor?.uuid !== actor.uuid)) return;
    const data = motorData(actor, DRUIDA_ID);
    if (isBeast(data.state)) await setMotor(actor, DRUIDA_ID, { ...data, value: toInt(data.value) + 1 });
  },

  /** Hunger of the Wild: an attack of the druid takes HP from a [Rooted] enemy: +1 Sap. */
  async onAnyDamaged(actor, { lesser }, victim, amount, attacker) {
    if ((attacker?.uuid !== actor.uuid) || !areEnemies(actor, victim) || !victim.statuses?.has("rooted")) return;
    if (!talentOf(actor, T("fome-da-selva"))) return;
    const data = motorData(actor, DRUIDA_ID);
    await setMotor(actor, DRUIDA_ID, { ...data, value: toInt(data.value) + 1 });
  }
};
