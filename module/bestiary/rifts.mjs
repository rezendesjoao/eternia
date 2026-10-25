/**
 * The Rifts (Fendas): tears where the writing of the world grew thin, scene hazards closed by writing the Sacred
 * Tongue over them while the group holds what comes out. A Rift is a monster with `flags.eternia.rift`:
 *   dc       the check to write over it (2d6 + POW against it: Small 9, Great 11, Mother 13)
 *   wave     [{ uuid, count }]: what comes out of it in each Setup Process of its combat (a number or a formula), next to
 *            it (bestiary/spawn.mjs), leaving no drops
 *   first    [{ uuid, count }]: what comes out in the first Setup instead (the Mother Rift's named beast)
 *   grow     how many writings a writer hurt before the end of the round undoes (1)
 * Its clock is its Fate (`system.fate`: the writings left of the max), shown on its token as the Fate diamonds.
 * Writing (the card's button, or `game.eternia.bestiary.writeRift`): a character within 1 square of it spends a Major
 * Action (in a combat, in its Main Process) and rolls 2d6 + POW; beating the number takes one writing off the clock (a
 * critical, two). A writer hurt by an attack before the end of that round makes the Rift grow back (`eternia.damaged`).
 * At 0 the Rift closes: its token hides, the writer who closed it gets its drops, and no wave comes out any more.
 * The writings and the growing go through the GM (socket handlers `riftWrite`, `riftGrow`).
 */
import { L, SYSTEM_ID } from "../settings.mjs";
import { isLocalChange } from "../helpers/clients.mjs";
import { actorName, combatOf, combatantOf, escape, toInt, wrap } from "../helpers/utils.mjs";
import { registerHandler, request } from "../piles/pile-socket.mjs";
import { actionsLeft, spendAction } from "../automation/use.mjs";
import { applyModifier, checkModifier, consumeAfterRoll } from "../conditions/rolls.mjs";
import { diceFormula } from "../helpers/dice.mjs";
import { rollDrops } from "./drops.mjs";
import { spawnNear } from "./spawn.mjs";

const TEMPLATE = "systems/eternia/templates/chat/rift-card.hbs";

/** Whether an actor is a Rift. */
export const isRift = actor => !!actor?.getFlag?.(SYSTEM_ID, "rift");

/** A Rift's clock and rules. */
export function riftState(actor) {
  const rift = actor.getFlag(SYSTEM_ID, "rift") ?? {};
  return {
    left: Math.max(0, toInt(actor.system.fate?.value)),
    max: Math.max(1, toInt(actor.system.fate?.max)),
    dc: toInt(rift.dc) || 9,
    grow: Math.max(1, toInt(rift.grow) || 1),
    closed: !!rift.closed,
    wave: rift.wave ?? [],
    first: rift.first ?? null
  };
}

/** The squares between two tokens, from their edges (0: on the same square). */
function gap(a, b) {
  const size = a.parent.grid.size;
  const box = t => ({ x0: Math.round(t.x / size), y0: Math.round(t.y / size), x1: Math.round(t.x / size) + Math.max(1, toInt(t.width)) - 1, y1: Math.round(t.y / size) + Math.max(1, toInt(t.height)) - 1 });
  const p = box(a), q = box(b);
  return Math.max(0, q.x0 - p.x1, p.x0 - q.x1, q.y0 - p.y1, p.y0 - q.y1);
}

/** The Rift tokens of a scene that are still open. */
const openRifts = scene => (scene?.tokens ?? []).filter(t => isRift(t.actor) && !riftState(t.actor).closed && !t.hidden);

/* -------------------------------------------- */
/*  The card                                    */
/* -------------------------------------------- */

/** Post the Rift's card: what came out (or what happened), the clock and the Write button. */
async function postCard(token, { event, lines = [] } = {}) {
  const actor = token.actor;
  const state = riftState(actor);
  const content = await foundry.applications.handlebars.renderTemplate(TEMPLATE, {
    img: actor.img, name: actorName(actor), eyebrow: L("Rift.Eyebrow"),
    event, lines,
    clock: Array.from({ length: state.max }, (_, i) => i < (state.max - state.left)),
    clockLabel: L("Rift.Clock", { done: state.max - state.left, max: state.max }),
    dc: state.dc, dcLabel: L("Rift.Dc"),
    closed: state.closed, closedLabel: L("Rift.Closed"),
    write: L("Rift.Write"), writeHint: L("Rift.WriteHint", { dc: state.dc })
  });
  return ChatMessage.create({ speaker: { alias: actorName(actor) }, content, flags: { [SYSTEM_ID]: { riftCard: { tokenUuid: token.uuid } } } });
}

/* -------------------------------------------- */
/*  Writing                                     */
/* -------------------------------------------- */

/** The character this user writes with: a controlled token of theirs, else their assigned character's token. */
function writerToken() {
  const controlled = (canvas?.tokens?.controlled ?? []).find(t => t.actor?.isOwner && !isRift(t.actor));
  if (controlled) return controlled.document;
  const character = game.user.character;
  return character?.getActiveTokens?.(false, true).find(t => t.parent === canvas?.scene) ?? null;
}

/**
 * Write the Sacred Tongue over a Rift: the checks, the Major Action, the roll, then the GM moves the clock.
 * @param {TokenDocument} rift
 * @param {TokenDocument} [writer]
 */
export async function writeRift(rift, writer = writerToken()) {
  const actor = writer?.actor;
  if (!actor || !rift?.actor || !isRift(rift.actor)) return ui.notifications.warn(L("Rift.NoWriter"));
  const state = riftState(rift.actor);
  if (state.closed) return ui.notifications.warn(L("Rift.AlreadyClosed"));
  if ((writer.parent !== rift.parent) || (gap(writer, rift) > 1)) return ui.notifications.warn(L("Rift.TooFar", { name: actorName(actor) }));
  // In a combat: in its own Main Process, with a Major Action left
  const combat = combatOf(actor);
  const combatant = combat ? combatantOf(combat, actor) : null;
  const left = actionsLeft(actor);
  if (combatant && left) {
    if ((combat.phase !== "main") || (combat.progress?.active !== combatant.id)) return ui.notifications.warn(L("Rift.NotYourProcess", { name: actorName(actor) }));
    if (!left.major) return ui.notifications.warn(L("Rift.NoMajor", { name: actorName(actor) }));
    await spendAction(actor, "major");
  }
  const condition = checkModifier(actor, { stat: "pow" });
  const formula = diceFormula(applyModifier({ dice: 2, mod: toInt(actor.system.attributes?.pow?.mod) }, condition));
  const roll = await new Roll(formula).evaluate();
  const sixes = roll.dice[0]?.results.filter(r => r.result === 6).length ?? 0;
  const ones = roll.dice[0]?.results.filter(r => r.result === 1).length ?? 0;
  const critical = sixes >= 2;
  const fumble = !critical && (ones === roll.dice[0]?.results.length);
  await roll.toMessage({
    speaker: ChatMessage.getSpeaker({ actor }),
    flavor: `${L("Rift.WriteFlavor", { dc: state.dc })}${condition.text ? ` (${condition.text})` : ""}`
  });
  await consumeAfterRoll(actor, condition.consume);
  const success = !fumble && (critical || (roll.total > state.dc));
  if (success && combat) await actor.setFlag(SYSTEM_ID, "riftWriting", { riftUuid: rift.uuid, combatId: combat.id, round: combat.round });
  const result = await request("riftWrite", { riftUuid: rift.uuid, writerUuid: actor.uuid, steps: success ? (critical ? 2 : 1) : 0, total: roll.total });
  if (!result?.ok && result?.error) ui.notifications.warn(game.i18n.localize(result.error));
  return result;
}

/** The GM moves the clock: a writing (or a failed one), and the Rift closes at 0. */
async function onWrite({ riftUuid, writerUuid, steps, total }) {
  const rift = fromUuidSync(riftUuid);
  const actor = rift?.actor;
  const writer = fromUuidSync(writerUuid);
  if (!actor || !isRift(actor)) return { ok: false };
  const state = riftState(actor);
  if (state.closed) return { ok: true };
  const name = actorName(writer);
  if (!(steps > 0)) {
    await postCard(rift, { event: L("Rift.Failed", { name, total }) });
    return { ok: true };
  }
  const left = Math.max(0, state.left - steps);
  await actor.update({ "system.fate.value": left });
  if (left > 0) {
    await postCard(rift, { event: L(steps > 1 ? "Rift.WroteCritical" : "Rift.Wrote", { name, total }) });
    return { ok: true };
  }
  await closeRift(rift, writer);
  return { ok: true };
}

/** The Rift closes: its token hides, the one who closed it gets its drops. */
async function closeRift(rift, writer) {
  const actor = rift.actor;
  await actor.update({ [`flags.${SYSTEM_ID}.rift.closed`]: true });
  await postCard(rift, { event: L("Rift.ClosedBy", { name: actorName(writer) }) });
  await rollDrops(actor, { force: true, receiver: (writer?.type === "character") ? writer : null });
  await rift.update({ hidden: true });
}

/** A writer was hurt before the end of the round: the Rift grows back (GM). */
async function onGrow({ riftUuid, writerUuid }) {
  const rift = fromUuidSync(riftUuid);
  const actor = rift?.actor;
  if (!actor || !isRift(actor)) return { ok: false };
  const state = riftState(actor);
  if (state.closed || (state.left >= state.max)) return { ok: true };
  await actor.update({ "system.fate.value": Math.min(state.max, state.left + state.grow) });
  await postCard(rift, { event: L("Rift.Grew", { name: actorName(fromUuidSync(writerUuid)) }) });
  return { ok: true };
}

/** A damage card hurt someone (on the window that applied it): a writer of this round makes the Rift grow. */
async function onDamaged(actor, card, { amount = 0 } = {}) {
  const writing = actor?.getFlag?.(SYSTEM_ID, "riftWriting");
  if (!writing || (toInt(amount) <= 0)) return;
  const combat = game.combats.get(writing.combatId);
  if (!combat || (combat.round !== writing.round)) return actor.isOwner ? actor.unsetFlag(SYSTEM_ID, "riftWriting") : null;
  if (actor.isOwner) await actor.unsetFlag(SYSTEM_ID, "riftWriting");
  await request("riftGrow", { riftUuid: writing.riftUuid, writerUuid: actor.uuid });
}

/* -------------------------------------------- */
/*  The waves                                   */
/* -------------------------------------------- */

/** The Setup Process of a combat: every open Rift of its scene lets its wave out. */
async function setupWaves(combat) {
  for (const rift of openRifts(combat.scene)) {
    const state = riftState(rift.actor);
    const list = ((combat.round <= 1) && state.first?.length) ? state.first : state.wave;
    const tokens = list.length ? await spawnNear(rift, list, { radius: 2, by: rift.actor.uuid }) : [];
    const lines = tokens.length ? [L("Rift.Wave", { list: tokens.map(t => t.name).join(", ") })] : [];
    await postCard(rift, { event: L("Rift.Setup", { round: combat.round }), lines });
  }
}

/* -------------------------------------------- */
/*  Registration                                */
/* -------------------------------------------- */

/** The card's Write button: the user's character writes. */
function onRenderMessage(message, html) {
  const data = message.getFlag(SYSTEM_ID, "riftCard");
  if (!data) return;
  const button = html.querySelector('[data-action="rift-write"]');
  if (!button) return;
  const rift = fromUuidSync(data.tokenUuid);
  if (!rift?.actor || riftState(rift.actor).closed) return button.remove();
  button.addEventListener("click", event => {
    event.preventDefault();
    writeRift(fromUuidSync(data.tokenUuid)).catch(err => console.error(`${SYSTEM_ID} | Rift writing failed`, err));
  });
}

/** Call during the `init` hook. */
export function registerRifts() {
  registerHandler("riftWrite", payload => onWrite(payload));
  registerHandler("riftGrow", payload => onGrow(payload));
  Hooks.on("eternia.damaged", (...args) => onDamaged(...args).catch(err => console.error(`${SYSTEM_ID} | Rift growth failed`, err)));
  Hooks.on("renderChatMessageHTML", onRenderMessage);
  wrap(CONFIG.Combat.documentClass.prototype, "_onPhaseStart", async function (original, phase, round, previous) {
    await original.call(this, phase, round, previous);
    const backwards = !!previous && (round < previous.round);
    if ((phase !== "setup") || backwards) return;
    await setupWaves(this).catch(err => console.error(`${SYSTEM_ID} | Rift wave failed`, err));
  });
  foundry.applications.handlebars.loadTemplates([TEMPLATE]);
}
