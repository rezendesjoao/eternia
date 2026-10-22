/**
 * The Summoner's Motor: the Pact (Pacto). docs/classes.md has the class; AS REGRAS, page XI, the rules as the
 * player reads them.
 *
 * A spirit (the wolf, the golem or the fairy) is bound to the summoner by Links (Laços), bought with the summoner's
 * own HP: CR+3 each (the Legion Path, CR/2+2; the Titan Path, twice as much). It has no token: it acts through the
 * summoner's skills. Its Command: Attack reads the Links, its special commands spend them, and with 0 Links it fades
 * away. Each spirit has a trait: the wolf's strikes roll +1D, the golem gives [Cancel: Links], the fairy
 * [Regen: Links × 2]; on the Fusion Path the spirit merges with the summoner instead ([Empowered: Links × 2],
 * [Cancel: Links × 2], [Regen: Links × 3]).
 *
 * A skill that needs a spirit says which in its flags.eternia.motor.spirit: "any", or one spirit ("lobo").
 *
 * State in flags.eternia.motor.invocador:
 *   state        "vazio" | "lobo" | "golem" | "fada"
 *   value        Links
 *   freeUsed     the Apex's free summon was used in this combat
 *   eternalUsed  the Apex kept the spirit at 1 Link in this combat
 *   foundation, cycle, fist   "<combat>.<round>" of the last once-per-round gain of those talents
 */
import { L } from "../settings.mjs";
import { combatOf, escape, toInt } from "../helpers/utils.mjs";
import {
  areAllies, areEnemies, chooseOption, crOf, hasApex, identifierOf, motorData, pathOf, recentUse,
  roundKey, setMotor, talentOf, talentRank
} from "./motor.mjs";

export const INVOCADOR_ID = "invocador";

/** Identifier of a Summoner skill. */
const T = name => `invocador-${name}`;

/** The spirits, in the order the dialogs show them. */
const SPIRITS = ["lobo", "golem", "fada"];

const DEFAULTS = { state: "vazio", value: 0, freeUsed: false, eternalUsed: false, foundation: null, cycle: null, fist: null };

/** The Path the actor follows (none with only the Lesser Pact). */
const path = (actor, lesser) => (lesser ? null : pathOf(actor, INVOCADOR_ID));

/** The spirits a summoner can call: the Lesser Pact only knows the wolf. */
const spiritsOf = lesser => (lesser ? ["lobo"] : SPIRITS);

/** HP a Link costs: CR+3; Legion CR/2+2; Titan twice that (back to the normal with the Apex). */
export function linkCost(actor, lesser) {
  const cr = crOf(actor);
  const followed = path(actor, lesser);
  if (followed === "legiao") return Math.floor(cr / 2) + 2;
  if ((followed === "tita") && !hasApex(actor, INVOCADOR_ID)) return 2 * (cr + 3);
  return cr + 3;
}

/** The summoner's HP now. */
const hpOf = actor => toInt(actor.system.health?.value);

/** The label of a spirit (its state). */
const spiritLabel = spirit => L(`Motor.Invocador.State.${spirit}`);

/** Post a short line about the Pact in the chat. */
function chatLine(actor, text) {
  return ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content: `<div class="eternia chat-card"><p>${escape(text)}</p></div>`
  });
}

/** Once per round: whether the key of this round is already in `key`. */
const spentThisRound = (actor, data, key) => !!roundKey(actor) && (data[key] === roundKey(actor));

export const INVOCADOR = {
  id: INVOCADOR_ID,
  i18n: "Motor.Invocador",
  states: ["vazio", "lobo", "golem", "fada"],
  stateColors: { vazio: 0x6b6b6b, lobo: 0x3f6f8f, golem: 0x8a6a25, fada: 0x2f7a52 },
  defaults: DEFAULTS,
  costKeyword: "Laços",

  /** The cap of Links: 3, +1 every 5 CR; Legion −1 (not with the Apex), Titan +2; + Blood Link's SR. */
  max(actor, { lesser }) {
    let max = 3 + Math.floor(crOf(actor) / 5);
    if (lesser) max = Math.max(1, Math.floor(max / 2));
    else if ((path(actor, lesser) === "legiao") && !hasApex(actor, INVOCADOR_ID)) max -= 1;
    else if (path(actor, lesser) === "tita") max += 2;
    return max + talentRank(actor, T("laco-de-sangue"));
  },

  /** The spirit a command needs; Summon: enough HP for one Link; Swap: another spirit to swap to. */
  issues(actor, item, motor, { data, max, lesser }) {
    const id = identifierOf(item);
    if (motor.spirit) {
      const wanted = (motor.spirit === "any") ? SPIRITS : [motor.spirit].flat();
      if (!wanted.includes(data.state)) {
        return [(motor.spirit === "any") ? L("Motor.Invocador.NeedSpirit")
          : L("Motor.Invocador.NeedThis", { spirit: wanted.map(spiritLabel).join(" / ") })];
      }
    }
    if (id === T("invocar")) {
      const free = hasApex(actor, INVOCADOR_ID) && !data.freeUsed && !!combatOf(actor);
      const room = (data.state === "vazio") ? max : max - toInt(data.value);
      const cost = linkCost(actor, lesser);
      if (!free && (hpOf(actor) - 1 < cost)) return [L("Motor.Invocador.NoHp", { cost })];
      if ((room <= 0) && (spiritsOf(lesser).length === 1)) return [L("Motor.Invocador.Full")];
    }
    if ((id === T("troca")) && (spiritsOf(lesser).length < 2)) return [L("Motor.Invocador.NoSwap")];
    return [];
  },

  /** Quick Call: Summon is a Minor Action. */
  actionOf(actor, item, motor, action) {
    if ((identifierOf(item) === T("invocar")) && talentOf(actor, T("chamado-rapido"))) return "minor";
    return action;
  },

  /** Summon (the spirit and the Links bought), Swap, the Living Shield, the Titan's Fury. */
  async plan(actor, item, motor, { data, max, lesser, plan }) {
    const id = identifierOf(item);
    if (id === T("invocar")) {
      const options = spiritsOf(lesser).map(s => ({ value: s, label: spiritLabel(s) }));
      const spirit = await chooseOption(item.name, options, {
        hint: L("Motor.Invocador.ChooseSpirit"), selected: SPIRITS.includes(data.state) ? data.state : options[0].value
      });
      if (!spirit) return null;
      const same = spirit === data.state;
      const room = same ? max - toInt(data.value) : max;
      const free = hasApex(actor, INVOCADOR_ID) && !data.freeUsed && !!combatOf(actor);
      const cost = free ? 0 : linkCost(actor, lesser);
      const affordable = cost ? Math.floor((hpOf(actor) - 1) / cost) : room;
      const top = Math.min(room, affordable);
      if (top < 1) {
        ui.notifications.warn(room < 1 ? L("Motor.Invocador.Full") : L("Motor.Invocador.NoHp", { cost }));
        return null;
      }
      const amounts = Array.from({ length: top }, (_, i) => i + 1).map(n => ({
        value: String(n),
        label: cost ? L("Motor.Invocador.LinksOption", { n, hp: n * cost }) : L("Motor.Invocador.LinksFree", { n })
      }));
      const chosen = toInt(await chooseOption(item.name, amounts, {
        hint: L("Motor.Invocador.ChooseLinks", { cost, hp: hpOf(actor) }), selected: String(top)
      }));
      if (!chosen) return null;
      plan.set = spirit;
      plan.gain = chosen;
      // Another spirit takes the place of the one there: its Links go with it.
      if (!same) plan.spent = toInt(data.value);
      plan.vars.hp = chosen * cost;
      if (free) plan.changes.freeUsed = true;
      return plan;
    }
    if (id === T("troca")) {
      const options = spiritsOf(lesser).filter(s => s !== data.state).map(s => ({ value: s, label: spiritLabel(s) }));
      const spirit = await chooseOption(item.name, options, { hint: L("Motor.Invocador.ChooseSwap") });
      if (!spirit) return null;
      plan.set = spirit;
      return plan;
    }
    if (id === T("escudo-vivo")) {
      const golem = (data.state === "golem") && !lesser;
      // The golem's shield holds more: (CR+5) + Links × 2.
      plan.vars.shield = (crOf(actor) + 5) + (golem ? 2 * toInt(data.value) : 0);
      if (golem && talentOf(actor, T("corpo-de-pedra"))) plan.spent = 0;
      return plan;
    }
    return plan;
  },

  /** With 0 Links the spirit fades (once per combat the Apex keeps it at 1). */
  after(actor, item, plan, next) {
    if ((next.state === "vazio") || (toInt(next.value) > 0)) return next;
    if (hasApex(actor, INVOCADOR_ID) && !next.eternalUsed && !!combatOf(actor)) {
      next.value = 1;
      next.eternalUsed = true;
      plan.vars.eternal = true;
      return next;
    }
    next.state = "vazio";
    next.value = 0;
    plan.vars.vanished = true;
    return next;
  },

  /** The wolf's trait (+1D to its strikes, not on the Fusion Path) and the Healing Glow (+Links × 2 to heals). */
  rollBonuses(actor, item, which, { lesser }) {
    if (which !== "damage") return [];
    const data = motorData(actor, INVOCADOR_ID);
    const id = identifierOf(item);
    const bonuses = [];
    if ((data.state === "lobo") && (path(actor, lesser) !== "fusao") && [T("comando-ataque"), T("investida")].includes(id)) {
      bonuses.push({ dice: 1, mod: 0, label: spiritLabel("lobo") });
    }
    const glow = talentOf(actor, T("brilho-curativo"));
    if (glow && (data.state === "fada") && item.system?.damage?.recovery) {
      bonuses.push({ dice: 0, mod: 2 * toInt(data.value), label: glow.name });
    }
    return bonuses;
  },

  /** The Wolf's Charge throws down ([Prone], and Deep Fangs: [Decay]); the Stone Fist draws the target ([Taunted]). */
  onHit(actor, item, { lesser }) {
    const id = identifierOf(item);
    if (id === T("investida")) {
      const statuses = [{ statusId: "prone", value: null, name: item.name }];
      const fangs = talentOf(actor, T("presas"));
      const spent = toInt(recentUse(item)?.spent);
      if (fangs && (spent > 0)) statuses.push({ statusId: "decay", value: 2 * spent, name: fangs.name });
      return statuses;
    }
    if (id === T("punho-de-pedra")) return [{ statusId: "taunted", value: null, name: item.name }];
    return [];
  },

  /** The spirit's trait, or the Fusion's, on the summoner (in a combat, with a spirit). */
  statuses(actor, { lesser, data, max }) {
    const links = toInt(data.value);
    if (!combatOf(actor) || (data.state === "vazio") || (links <= 0)) return [];
    if (path(actor, lesser) === "fusao") {
      // Avatar: with the Links at the cap (one less with the Apex), the Fusion's traits double.
      const need = hasApex(actor, INVOCADOR_ID) ? Math.max(1, max - 1) : max;
      const x = (talentOf(actor, T("avatar")) && (links >= need)) ? 2 : 1;
      const fused = {
        lobo: { statusId: "empowered", value: 2 * links * x },
        golem: { statusId: "cancel", value: 2 * links * x },
        fada: { statusId: "regen", value: 3 * links * x }
      }[data.state];
      return fused ? [{ key: "fusao", ...fused, name: `${L("Motor.Invocador.Name")}: ${spiritLabel(data.state)}` }] : [];
    }
    if (lesser) return [];
    if (data.state === "golem") return [{ key: "golem", statusId: "cancel", value: links, name: spiritLabel("golem") }];
    if (data.state === "fada") return [{ key: "fada", statusId: "regen", value: 2 * links, name: spiritLabel("fada") }];
    return [];
  },

  /** The class tab and the HUD: what a Link costs. */
  display(actor, { lesser }) {
    return { note: L("Motor.Invocador.Note", { cost: linkCost(actor, lesser) }) };
  },

  /** @motor.cost: the HP of a Link. */
  formulaData(actor, item, { lesser }) {
    return { cost: linkCost(actor, lesser) };
  },

  /* ------------------------------------------ */
  /*  Events                                    */
  /* ------------------------------------------ */

  /** The HP paid for the Links; the Return to the Void when the spirit fades. */
  async onUse(actor, { lesser }, item, plan) {
    if (!plan) return;
    const paid = toInt(plan.vars?.hp);
    if (paid > 0) {
      await actor.update({ "system.health.value": Math.max(1, hpOf(actor) - paid) });
      await chatLine(actor, L("Motor.Invocador.Paid", { name: actor.name, hp: paid }));
    }
    if (plan.vars?.vanished) {
      const back = talentOf(actor, T("retorno"));
      if (back) {
        const hp = Math.min(hpOf(actor) + (2 * crOf(actor)), toInt(actor.system.health?.max));
        const gained = hp - hpOf(actor);
        if (gained > 0) {
          await actor.update({ "system.health.value": hp });
          await chatLine(actor, L("Motor.Invocador.Returned", { name: actor.name, hp: gained }));
        }
      }
    }
    if (plan.vars?.eternal) await chatLine(actor, L("Motor.Invocador.Eternal", { name: actor.name }));
  },

  /** Every combat starts without a spirit. */
  async onCombatStart(actor) {
    await setMotor(actor, INVOCADOR_ID, { ...DEFAULTS });
  },

  async onCombatEnd(actor) {
    await setMotor(actor, INVOCADOR_ID, { ...DEFAULTS });
  },

  /** Steady Reinforcement (Legion): Setup Process, with a spirit: +1 Link without paying HP. */
  async onSetup(actor, { lesser }) {
    if ((path(actor, lesser) !== "legiao") || !talentOf(actor, T("reforco"))) return;
    const data = motorData(actor, INVOCADOR_ID);
    if (data.state === "vazio") return;
    await setMotor(actor, INVOCADOR_ID, { ...data, value: toInt(data.value) + 1 });
  },

  /** The Hunt: with the wolf, an enemy brought to 0 HP by the summoner's attack (or the wolf's): +1 Link. */
  async onKill(actor, { lesser }, target, item) {
    if (!talentOf(actor, T("cacada")) || !areEnemies(actor, target) || (item?.actor?.uuid !== actor.uuid)) return;
    const data = motorData(actor, INVOCADOR_ID);
    if (data.state !== "lobo") return;
    await setMotor(actor, INVOCADOR_ID, { ...data, value: toInt(data.value) + 1 });
  },

  /** Foundation: with the golem, the first time each round an attack takes HP from the summoner: +1 Link. */
  async onDamaged(actor, { lesser }, amount, attacker) {
    if (!talentOf(actor, T("fundacao")) || !areEnemies(actor, attacker)) return;
    const data = motorData(actor, INVOCADOR_ID);
    if ((data.state !== "golem") || spentThisRound(actor, data, "foundation")) return;
    await setMotor(actor, INVOCADOR_ID, { ...data, value: toInt(data.value) + 1, foundation: roundKey(actor) });
  },

  /** The Fairy's Cycle: with the fairy, the first time each round a heal of the summoner gives HP back: +1 Link. */
  async onAnyHealed(actor, { lesser }, target, amount, healer) {
    if ((healer?.uuid !== actor.uuid) || !talentOf(actor, T("ciclo"))) return;
    if ((target?.uuid !== actor.uuid) && !areAllies(actor, target)) return;
    const data = motorData(actor, INVOCADOR_ID);
    if ((data.state !== "fada") || spentThisRound(actor, data, "cycle")) return;
    await setMotor(actor, INVOCADOR_ID, { ...data, value: toInt(data.value) + 1, cycle: roundKey(actor) });
  },

  /** The Stone Fist: with the golem, a hit gives +1 Link (once per round). */
  async onHitTarget(actor, { lesser }, target, item) {
    if (identifierOf(item) !== T("punho-de-pedra")) return;
    const data = motorData(actor, INVOCADOR_ID);
    if ((data.state !== "golem") || spentThisRound(actor, data, "fist")) return;
    await setMotor(actor, INVOCADOR_ID, { ...data, value: toInt(data.value) + 1, fist: roundKey(actor) });
  }
};
