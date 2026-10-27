/**
 * The phase (a monster rule, docs/bestiario.md): a skill with `flags.eternia.monster = { rule: "phase", range, dice,
 * held }` (a Passive) takes its monster out of the world's writing at the end of each of its Main Processes: its token
 * hides and nothing reaches it (`phasedNote`, asked by conditions/damage.mjs: no damage, no statuses). At the start of
 * its next Main Process it comes back within `range` squares (6) of where it went, at the back of the prey with the
 * most Hate there (bestiary/blink.mjs: the token jumps onto that one's square, engaged), and its next damage of that
 * turn has +`dice`d6 (1); with no prey in reach, where it went. Whoever is on Standby (Espera) then catches the moment:
 * a window of one Major Action (conditions/window.mjs) to use out of turn, which is the Major Action of its own Main
 * Process (`held` in the window: using it spends that one too, and the Undo gives it back). Held by a status of `held`
 * (Grappled, Rooted, Paralyzed, Petrified, Asleep), or having lost its turn, it doesn't go. Out of phase, when it falls
 * or its combat ends, it comes back where it went.
 * State: the monster's flags.eternia.phased = { combatId, round }; `held` in a window; `heldMajor` on the card of a
 * skill used in that window. It runs on the window that changed the combat (the GM's).
 */
import { L, SYSTEM_ID } from "../settings.mjs";
import { isLocalChange, isPrimaryGM } from "../helpers/clients.mjs";
import { actorName, postSummary, toInt } from "../helpers/utils.mjs";
import { backOf, jump, preyNear, tokenOf } from "./blink.mjs";

const FLAG = "phased";
/** What keeps a monster from going (as it keeps a monster from fleeing, rules.mjs). */
const HOLDS = ["grappled", "rooted", "paralyzed", "petrified", "asleep"];

const label = id => game.i18n.localize(`ETERNIA.StatusEffect.${id}`);

/** The phase skill of an actor, or null. */
const phaseOf = actor => (actor?.items ?? []).find(i => (i.type === "skill") && (i.getFlag(SYSTEM_ID, "monster")?.rule === "phase")) ?? null;

/** Whether an actor is out of phase now. */
export const isPhased = actor => !!actor?.getFlag?.(SYSTEM_ID, FLAG);

/**
 * The note of a damage card on a monster out of phase, or "": then nothing of the card reaches it (conditions/damage.mjs).
 * @param {Actor} actor
 */
export function phasedNote(actor) {
  return isPhased(actor) ? L("Bestiary.Phase.Note") : "";
}

/** The moment of a combat a window belongs to (keyed as conditions/window.mjs keys it). */
const windowKey = combat => `${combat.id}.${combat.round}.${combat.progress?.acted?.length ?? 0}`;

/** The token of a combatant. */
const tokenOfCombatant = combatant => combatant.token ?? tokenOf(combatant.actor);

/** The effect of the bite that comes with the return: +dice on the next damage, until the end of that Main Process. */
const biteData = (item, dice) => ({
  name: item.name, img: item.img, type: "base", transfer: false, disabled: false,
  system: { changes: [{ key: "eternia.roll.damage.dice", type: "add", value: String(dice), phase: "initial", priority: null }] },
  flags: { [SYSTEM_ID]: { consumeOn: "attack", expires: "endOfProcess" } }
});

/* -------------------------------------------- */
/*  Going and coming back                       */
/* -------------------------------------------- */

/** The end of a monster's Main Process: out of phase, unless something holds it. */
async function phaseOut(actor, combat, lost) {
  const item = phaseOf(actor);
  if (!item || isPhased(actor) || actor.statuses.has("dead") || actor.statuses.has("incapacitated")) return;
  const combatant = combat.combatants.find(c => c.actor?.uuid === actor.uuid);
  const token = combatant ? tokenOfCombatant(combatant) : tokenOf(actor);
  if (!token) return;
  const rule = item.getFlag(SYSTEM_ID, "monster");
  const holding = (rule.held ?? HOLDS).filter(id => actor.statuses.has(id));
  if (holding.length) {
    await postSummary(item.name, [L("Bestiary.Phase.Held", { name: actorName(actor), status: holding.map(label).join(", ") })]);
    return;
  }
  if (lost) return;
  await actor.setFlag(SYSTEM_ID, FLAG, { combatId: combat.id, round: combat.round });
  await token.update({ hidden: true });
  await postSummary(item.name, [L("Bestiary.Phase.Out", { name: actorName(actor) })]);
}

/**
 * The start of a phased monster's Main Process: it comes back at the back of its prey, with the bite, and whoever is
 * on Standby gets the Major Action it kept, now.
 */
async function phaseBack(combat, combatant) {
  const actor = combatant.actor;
  const item = phaseOf(actor);
  const token = tokenOfCombatant(combatant);
  await actor.unsetFlag(SYSTEM_ID, FLAG);
  if (!token) return;
  const rule = item?.getFlag(SYSTEM_ID, "monster") ?? {};
  const range = Math.max(0, toInt(rule.range) || 6);
  const prey = preyNear(token, range)[0] ?? null;
  if (prey) await jump(token, backOf(token, prey), { hidden: false });
  else await token.update({ hidden: false });
  const lines = [L(prey ? "Bestiary.Phase.Back" : "Bestiary.Phase.BackHere", { name: actorName(actor), target: prey?.name ?? "" })];
  const dice = Math.max(0, toInt(rule.dice ?? 1));
  if (item && dice) await actor.createEmbeddedDocuments("ActiveEffect", [biteData(item, dice)]);
  // On Standby on the other side, the Major Action of the Main Process to come is kept for this moment
  const side = Math.sign(toInt(token.disposition));
  const ready = combat.combatants.filter(c => (c.id !== combatant.id) && c.actor && !c.isDefeated && combat.isOnStandby?.(c)
    && (Math.sign(toInt(tokenOfCombatant(c)?.disposition)) === -side));
  for (const c of ready) {
    await c.actor.setFlag(SYSTEM_ID, "window", { key: windowKey(combat), major: 1, minor: 0, move: 0, from: item?.name ?? "", held: true });
  }
  if (ready.length) lines.push(L("Bestiary.Phase.Caught", { names: ready.map(c => c.name).join(", "), name: actorName(actor) }));
  await postSummary(item?.name ?? actorName(actor), lines);
}

/** A phased monster that falls, or whose combat ends, comes back where it went. */
async function comeBack(actor, token) {
  if (!isPhased(actor)) return;
  await actor.unsetFlag(SYSTEM_ID, FLAG);
  if (token?.hidden) await token.update({ hidden: false });
}

/* -------------------------------------------- */
/*  The kept Major Action                       */
/* -------------------------------------------- */

/** A skill used in the window of the return: it was the Major Action of the user's own Main Process. */
async function spendHeld(item, { actor, action, message }) {
  const usage = message?.getFlag?.(SYSTEM_ID, "usage");
  const window = actor?.getFlag?.(SYSTEM_ID, "window");
  if (!usage?.window || !window?.held || (window.key !== usage.window) || (action !== "major") || !actor.isOwner) return;
  const { spendAction } = await import("../automation/use.mjs");
  await spendAction(actor, "major");
  await message.setFlag(SYSTEM_ID, "heldMajor", true);
}

/** That use undone: the Major Action of the Main Process comes back too. */
async function refundHeld(record) {
  const actor = fromUuidSync(record?.actorUuid ?? "");
  const spent = actor?.getFlag?.(SYSTEM_ID, "actions");
  if (!actor?.isOwner || (spent?.key !== `${record.combatId}.${record.round}`)) return;
  await actor.update({ [`flags.${SYSTEM_ID}.actions.major`]: Math.max(0, toInt(spent.major) - 1) });
}

/* -------------------------------------------- */
/*  Registration                                */
/* -------------------------------------------- */

/** Call during the `init` hook. */
export function registerPhase() {
  Hooks.on("eternia.processEnd", (actor, combat, context) => {
    if (!phaseOf(actor) || !actor.isOwner) return;
    phaseOut(actor, combat, !!context?.lost).catch(err => console.error(`${SYSTEM_ID} | Phase failed`, err));
  });
  // A Main Process begins: a phased monster comes back
  Hooks.on("updateCombat", (combat, changes, options, userId) => {
    const active = foundry.utils.getProperty(changes, `flags.${SYSTEM_ID}.active`);
    if (!active || !isLocalChange(options, userId) || (combat.phase !== "main") || options.eterniaRepeat?.start) return;
    const combatant = combat.combatants.get(active);
    if (!isPhased(combatant?.actor)) return;
    phaseBack(combat, combatant).catch(err => console.error(`${SYSTEM_ID} | Phase failed`, err));
  });
  Hooks.on("deleteCombat", combat => {
    if (!isPrimaryGM()) return;
    for (const combatant of combat.combatants) {
      if (isPhased(combatant.actor)) comeBack(combatant.actor, tokenOfCombatant(combatant)).catch(() => null);
    }
  });
  Hooks.on("createActiveEffect", effect => {
    const actor = effect.parent;
    if (!(actor instanceof Actor) || !isPhased(actor) || !isPrimaryGM()) return;
    if (effect.statuses?.has("incapacitated") || effect.statuses?.has("dead")) comeBack(actor, tokenOf(actor)).catch(() => null);
  });
  Hooks.on("eternia.skillUsed", (item, context) => {
    spendHeld(item, context ?? {}).catch(err => console.error(`${SYSTEM_ID} | The kept action failed`, err));
  });
  Hooks.on("updateChatMessage", (message, changes, options, userId) => {
    if (!isLocalChange(options, userId) || !message.getFlag(SYSTEM_ID, "heldMajor")) return;
    if (foundry.utils.getProperty(changes, `flags.${SYSTEM_ID}.usage.undone`) !== true) return;
    refundHeld(message.getFlag(SYSTEM_ID, "usage")).catch(() => null);
  });
}
