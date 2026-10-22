/**
 * The Commander's Motor: Tactics (Táticas). docs/classes.md has the class; AS REGRAS, page XI, the rules as the
 * player reads them.
 *
 * The commander gathers Orders: +1 at each Setup Process and +1 with Survey the Field (Minor). An Order lets an ally
 * act out of turn: Order: Attack! (the ally makes a basic attack now, with [Focused], and its Major Action is given
 * back when that attack's result is known), Order: Advance! (the ally moves now and gets [Barrier]), and the talents'
 * orders. Cap: 2, +1 every 5 CR (+ the SR of Tactical Reserve); the Lesser Tactics hold 1.
 *
 * State in flags.eternia.motor.comandante:
 *   value     Orders
 *   ordered   { key, uuids, done, hits }: the allies told to attack in the round "<combat>.<round>", those whose
 *             attack was settled (Major Action back) and those that hit
 *   free      "<combat>.<round>" of the Order the Apex made free
 *   banner    the Standard is raised (Raise the Standard); moving the token takes it down
 *   example   "<combat>.<round>" of the last Lead by Example gain
 *   prepared  Orders the Battle Plan of the Briefing gives when the combat starts
 */
import { L } from "../settings.mjs";
import { combatOf, toInt } from "../helpers/utils.mjs";
import {
  addToMotor, areAllies, areEnemies, combatPeers, crOf, hasApex, identifierOf, motorData, pathOf, roundKey, setMotor,
  talentOf, talentRank
} from "./motor.mjs";

export const COMANDANTE_ID = "comandante";

/** Identifier of a Commander skill. */
const T = name => `comandante-${name}`;

const DEFAULTS = { state: "em-campo", value: 0, ordered: null, free: null, banner: false, example: null, prepared: 0 };

/** The basic attacks an Order: Attack! calls for (skills-basic). */
const BASIC_ATTACKS = ["ataque básico com arma", "ataque mágico básico"];

/** The action a Timing spends in the Main Process (as automation/use.mjs). */
const TIMING_ACTIONS = { Major: "major", Minor: "minor", Move: "move" };

/** The Path the actor follows (none with only the Lesser Tactics). */
const path = (actor, lesser) => (lesser ? null : pathOf(actor, COMANDANTE_ID));

/** Attack cards already settled on this window: "<message>.<attacker>" (an attack card tells each target apart). */
const settled = new Set();
const scored = new Set();

/** The token document an actor stands on (its own for a synthetic actor, else its first one on the scene). */
function tokenOf(actor) {
  return actor?.token ?? actor?.getActiveTokens?.(false, true)?.[0] ?? null;
}

/** Squares between two actors' tokens (diagonals count 1), Infinity when they aren't on the same scene. */
export function squaresBetween(a, b) {
  const ta = tokenOf(a);
  const tb = tokenOf(b);
  if (!ta || !tb || (ta.parent?.id !== tb.parent?.id)) return Infinity;
  const size = ta.parent?.grid?.size || 100;
  return Math.round(Math.max(Math.abs(ta.x - tb.x), Math.abs(ta.y - tb.y)) / size);
}

/** Whether an enemy of the actor's combat stands in its square (engaged). */
const engaged = actor => combatPeers(actor).some(peer => areEnemies(actor, peer) && (squaresBetween(actor, peer) === 0));

/** The action an Order would spend without the Apex (its Motor part's, else its Timing's). */
const orderAction = (item, motor) => motor.action ?? TIMING_ACTIONS[item.system?.timing] ?? null;

/** Whether this use of an Order is the round's free one (Supreme Command). */
function freeOrder(actor, item, motor, data, lesser) {
  if (!motor?.order || lesser || !hasApex(actor, COMANDANTE_ID)) return false;
  const action = orderAction(item, motor);
  const key = roundKey(actor);
  return !!key && !!action && (action !== "none") && (data.free !== key);
}

/** Whether a skill is one of the basic attacks (Order: Attack!). */
const basicAttack = item => BASIC_ATTACKS.includes(String(item?.name ?? "").trim().toLowerCase());

/** Give an ally back the Major Action its ordered attack took (this window rolled it: it owns the attacker). */
async function refundMajor(attacker) {
  const combat = combatOf(attacker);
  const saved = attacker.getFlag("eternia", "actions");
  if (!combat || !attacker.isOwner || (saved?.key !== `${combat.id}.${combat.round}`) || (toInt(saved.major) < 1)) return;
  await attacker.update({ "flags.eternia.actions.major": toInt(saved.major) - 1 });
}

/**
 * An ally told to attack attacked: its Major Action comes back (once), and a hit feeds the Captain Path (+1) and
 * Chain of Command (two ordered allies hit: +1).
 */
async function orderedAttack(actor, lesser, attacker, item, message, hit) {
  const data = motorData(actor, COMANDANTE_ID);
  const order = data.ordered;
  if (!order || (order.key !== roundKey(actor)) || !attacker || !(order.uuids ?? []).includes(attacker.uuid)) return;
  if (!basicAttack(item)) return;
  const tag = `${message?.id ?? ""}.${attacker.uuid}`;
  const next = { ...order, done: [...(order.done ?? [])], hits: [...(order.hits ?? [])] };
  let changed = false;
  if (!settled.has(tag) && !next.done.includes(attacker.uuid)) {
    settled.add(tag);
    next.done.push(attacker.uuid);
    changed = true;
    await refundMajor(attacker);
  }
  let gain = 0;
  if (hit && !scored.has(tag) && !next.hits.includes(attacker.uuid)) {
    scored.add(tag);
    next.hits.push(attacker.uuid);
    changed = true;
    const followed = path(actor, lesser);
    if (followed === "capitao") gain += 1;
    if ((followed === "marechal") && (next.hits.length === 2) && talentOf(actor, T("comando-em-cadeia"))) gain += 1;
  }
  if (changed) await setMotor(actor, COMANDANTE_ID, { ...data, value: toInt(data.value) + gain, ordered: next });
}

/**
 * The Banner Path: at each Setup Process, the allies within 3 Sq (5 with Tall Mast, which also includes the
 * commander; all of them with the Apex) get [Empowered: Orders × 2] until the end of the round ([Cancel: Orders] too
 * with Banner Oath). The commander's earlier aura goes first. Run by the GM (the round work).
 */
async function bannerAura(actor) {
  const { statusEffectData } = await import("../chat/status-links.mjs");
  const orders = toInt(motorData(actor, COMANDANTE_ID).value);
  const tall = !!talentOf(actor, T("mastro-alto"));
  const reach = hasApex(actor, COMANDANTE_ID) ? Infinity : (tall ? 5 : 3);
  const oath = !!talentOf(actor, T("juramento-da-bandeira"));
  for (const peer of combatPeers(actor)) {
    const self = peer.uuid === actor.uuid;
    if (!peer.isOwner || !(self ? tall : areAllies(actor, peer))) continue;
    const old = peer.effects.filter(e => e.flags?.eternia?.commandAura === actor.uuid).map(e => e.id);
    if (old.length) await peer.deleteEmbeddedDocuments("ActiveEffect", old).catch(() => null);
    if (!orders || (squaresBetween(actor, peer) > reach)) continue;
    const effects = [statusEffectData("empowered", orders * 2, "", { caster: actor, expires: "endOfRound" })];
    if (oath) effects.push(statusEffectData("cancel", orders, "", { caster: actor, expires: "endOfRound" }));
    for (const effect of effects) effect.flags.eternia.commandAura = actor.uuid;
    await peer.createEmbeddedDocuments("ActiveEffect", effects);
  }
}

export const COMANDANTE = {
  id: COMANDANTE_ID,
  i18n: "Motor.Comandante",
  states: ["em-campo"],
  defaults: DEFAULTS,
  costKeyword: "Ordens",

  /** The cap of Orders. */
  max(actor, { lesser }) {
    const base = lesser ? 1 : 2 + Math.floor(crOf(actor) / 5);
    return base + talentRank(actor, T("reserva-tatica"));
  },

  /** Supreme Command: one Order a round spends no action. Front Line (Captain): Attack! is a Minor Action engaged. */
  actionOf(actor, item, motor, action) {
    const ctx = motorData(actor, COMANDANTE_ID);
    const lesser = !talentOf(actor, T("taticas"));
    if (freeOrder(actor, item, motor, ctx, lesser)) return "none";
    if ((motor.order === "attack") && (path(actor, lesser) === "capitao") && talentOf(actor, T("na-linha-de-frente"))
      && engaged(actor)) return "minor";
    return action;
  },

  /** What a use sets: the free Order of the round, who was told to attack, the Standard, the Battle Plan. */
  plan(actor, item, motor, { data, lesser, plan }) {
    const id = identifierOf(item);
    const key = roundKey(actor);
    if (freeOrder(actor, item, motor, data, lesser)) plan.changes.free = key;
    if ((motor.order === "attack") && key) {
      const captain = path(actor, lesser) === "capitao";
      const told = [...(game.user?.targets ?? [])].map(t => t.actor).filter(a => a
        && ((a.uuid === actor.uuid) ? captain : areAllies(actor, a)));
      plan.changes.ordered = { key, uuids: told.map(a => a.uuid), done: [], hits: [] };
    }
    if (id === T("erguer-estandarte")) plan.changes.banner = true;
    if (id === T("plano-de-batalha")) plan.changes.prepared = 1;
    return plan;
  },

  /** Steadfast Standard: with the Standard raised, [Cancel: Orders × 2] on the commander. */
  statuses(actor, { data }) {
    if (!combatOf(actor) || !data.banner || !talentOf(actor, T("estandarte-inabalavel"))) return [];
    const value = toInt(data.value) * 2;
    return (value > 0) ? [{ key: "inabalavel", statusId: "cancel", value }] : [];
  },

  /** The class tab and the HUD: the Standard raised, the free Order of the Apex still there. */
  display(actor, { lesser, data, max }) {
    const notes = [];
    if (data.banner && combatOf(actor)) notes.push(L("Motor.Comandante.Banner"));
    const key = roundKey(actor);
    if (!lesser && key && hasApex(actor, COMANDANTE_ID) && (data.free !== key)) notes.push(L("Motor.Comandante.FreeOrder"));
    return { ready: (max > 0) && (toInt(data.value) >= max), readyLabel: L("Motor.Comandante.Ready"), note: notes.join(" · ") };
  },

  /* ------------------------------------------ */
  /*  Events                                    */
  /* ------------------------------------------ */

  /** Every combat starts with the Orders of First Order and of the Battle Plan (full: Captain with the Apex). */
  async onCombatStart(actor, { lesser }) {
    const data = motorData(actor, COMANDANTE_ID);
    let start = toInt(data.prepared) + talentRank(actor, T("primeira-ordem"));
    if ((path(actor, lesser) === "capitao") && hasApex(actor, COMANDANTE_ID)) start = 99;
    await setMotor(actor, COMANDANTE_ID, { ...DEFAULTS, value: start });
  },

  /**
   * Setup Process: +1 Order (+2 from none with Line of Command; nothing with the Lesser Tactics), +1 with the Standard
   * raised; then the Banner Path's aura.
   */
  async onSetup(actor, { lesser }) {
    const data = motorData(actor, COMANDANTE_ID);
    const followed = path(actor, lesser);
    let gain = lesser ? 0 : 1;
    if ((followed === "marechal") && (toInt(data.value) === 0) && talentOf(actor, T("linha-de-comando"))) gain = 2;
    if (data.banner && talentOf(actor, T("erguer-estandarte"))) gain += 1;
    await setMotor(actor, COMANDANTE_ID, { ...data, value: toInt(data.value) + gain, ordered: null });
    if (followed === "bandeira") await bannerAura(actor);
  },

  async onCombatEnd(actor) {
    await setMotor(actor, COMANDANTE_ID, { ...DEFAULTS });
  },

  /** Moving the token takes the Standard down. */
  async onMove(actor) {
    const data = motorData(actor, COMANDANTE_ID);
    if (data.banner) await setMotor(actor, COMANDANTE_ID, { ...data, banner: false });
  },

  /** Lead by Example: the commander's own hit, once a round: +1 Order. */
  async onHitTarget(actor, { lesser }, target, item) {
    if (!talentOf(actor, T("pelo-exemplo")) || !areEnemies(actor, target)) return;
    const data = motorData(actor, COMANDANTE_ID);
    const key = roundKey(actor);
    if (!key || (data.example === key)) return;
    await setMotor(actor, COMANDANTE_ID, { ...data, value: toInt(data.value) + 1, example: key });
  },

  /** Ordered attacks: hits and misses. */
  async onAnyHit(actor, { lesser }, attacker, target, item, message) {
    await orderedAttack(actor, lesser, attacker, item, message, true);
  },

  async onAnyMiss(actor, { lesser }, attacker, target, item, message) {
    await orderedAttack(actor, lesser, attacker, item, message, false);
  },

  /** No One Left Behind: an ally falls to 0 HP to an enemy's attack: +1 Order. */
  async onAnyDamaged(actor, { lesser }, victim, amount, attacker) {
    if (!talentOf(actor, T("ninguem-fica")) || !areAllies(actor, victim) || (attacker && !areEnemies(actor, attacker))) return;
    if (toInt(victim.system?.health?.value) > 0) return;
    await addToMotor(actor, COMANDANTE_ID, 1);
  },

  /** Living Example (Captain): the commander's own attack leaves an enemy at 0 HP: +2 Orders. */
  async onKill(actor, { lesser }, target, item) {
    if ((path(actor, lesser) !== "capitao") || !talentOf(actor, T("exemplo-vivo")) || !areEnemies(actor, target)) return;
    if (item && (item.actor?.uuid !== actor.uuid)) return;
    await addToMotor(actor, COMANDANTE_ID, 2);
  },

  /** Glory of the Battalion: with the Standard raised, an ally leaves an enemy at 0 HP: +1 Order. */
  async onAnyKill(actor, { lesser }, victim, attacker) {
    if (!attacker || !areAllies(actor, attacker) || !areEnemies(actor, victim)) return;
    const data = motorData(actor, COMANDANTE_ID);
    if (!data.banner || !talentOf(actor, T("gloria-do-batalhao"))) return;
    await setMotor(actor, COMANDANTE_ID, { ...data, value: toInt(data.value) + 1 });
  }
};
