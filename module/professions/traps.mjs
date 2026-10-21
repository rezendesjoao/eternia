/**
 * The Engineer's traps. In the Setup of its combat (or out of combat), the Engineer arms a bomb or a net it carries
 * on a square of the scene; the first enemy (a token of another disposition) that moves into it sets it off: a bomb
 * makes its damage card against it, and its effects (statuses) go to it.
 * A trap is a Region of the scene with the item's data in `flags.eternia.trap`. The GM's client makes it (players
 * can't create Regions) and the primary GM watches the tokens' movement.
 */
import { L, SYSTEM_ID } from "../settings.mjs";
import { request } from "../piles/pile-socket.mjs";
import { isPrimaryGM } from "../helpers/clients.mjs";
import { actorName, escape, toInt } from "../helpers/utils.mjs";
import { diceFormula } from "../helpers/dice.mjs";
import { createDamageCard, targetEntries } from "../helpers/combat-cards.mjs";
import { applyItemEffects } from "../helpers/item-use.mjs";
import { evaluateFormula, formulaData } from "../helpers/effect-formulas.mjs";
import { PROFESSIONS, kindOf } from "./data.mjs";
import { professionOf } from "./state.mjs";
import { postCard } from "./actions.mjs";

const TRAP_COLOR = "#d4861a";

/** A bomb or net that can be armed (flags.eternia.trap). */
export const isTrapItem = item => (kindOf(item) === "gadget") && !!item.getFlag(SYSTEM_ID, "trap");

/** The gadgets an Engineer carries that can be armed. */
export const trapItems = actor => (actor?.items ?? []).filter(isTrapItem);

/** Why the actor can't arm a trap now (its combat is past the Setup), or null. */
function phaseProblem(actor) {
  const combat = [game.combat, ...game.combats].find(c => c?.started && c.getCombatantsByActor(actor).length);
  return (combat && (combat.phase !== "setup")) ? "Profession.Error.TrapPhase" : null;
}

/** Wait for a click on the scene: the top-left corner of the square clicked, or null (Escape, right click). */
function pickSquare() {
  const view = canvas.app?.canvas ?? canvas.app?.view;
  if (!view) return Promise.resolve(null);
  return new Promise(resolve => {
    const done = point => {
      view.removeEventListener("pointerdown", onDown, true);
      document.removeEventListener("keydown", onKey, true);
      document.body.classList.remove("lhp-picking");
      resolve(point);
    };
    const onDown = event => {
      event.preventDefault();
      event.stopPropagation();
      if (event.button !== 0) return done(null);
      const point = canvas.canvasCoordinatesFromClient({ x: event.clientX, y: event.clientY });
      done(canvas.grid.getTopLeftPoint(point));
    };
    const onKey = event => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      done(null);
    };
    view.addEventListener("pointerdown", onDown, true);
    document.addEventListener("keydown", onKey, true);
    document.body.classList.add("lhp-picking");
  });
}

/**
 * Arm a trap: the player clicks a square of the viewed scene.
 * @param {Actor} actor   The Engineer
 * @param {Item} item     A bomb or net it carries
 */
export async function armTrap(actor, item) {
  const p = professionOf(actor);
  if (p?.id !== "engineer") return ui.notifications.warn(L("Profession.Error.NoProfession"));
  if (!isTrapItem(item) || (item.actor !== actor)) return ui.notifications.warn(L("Profession.Error.NotTrap"));
  if (!canvas.scene || !canvas.ready) return ui.notifications.warn(L("Profession.Error.NoScene"));
  const problem = phaseProblem(actor);
  if (problem && !game.user.isGM) return ui.notifications.warn(L(problem));
  ui.notifications.info(L("Profession.Trap.Pick", { item: item.name }));
  const point = await pickSquare();
  if (!point) return null;
  const token = actor.getActiveTokens(false, true)[0];
  const disposition = token?.disposition ?? CONST.TOKEN_DISPOSITIONS.FRIENDLY;
  const result = await request("professionTrap", {
    actorUuid: actor.uuid, itemId: item.id, sceneId: canvas.scene.id, x: point.x, y: point.y, disposition
  });
  if (!result?.ok) return ui.notifications.warn(L(result?.error ?? "Profession.Error.Generic"));
  const name = item.name;
  await item.delete();
  await postCard(actor, p, {
    title: L("Profession.Trap.Armed"), lines: [L("Profession.Chat.TrapArmed", { item: name })],
    whisper: [game.user.id, ...game.users.filter(u => u.isGM).map(u => u.id)]
  });
  return true;
}

/** GM side: make the trap's Region, for the owner of an Engineer that carries the item. */
export async function onTrapRequest({ actorUuid, itemId, sceneId, x, y, disposition }, user) {
  const actor = await fromUuid(actorUuid);
  if (!actor?.testUserPermission(user, "OWNER") || (professionOf(actor)?.id !== "engineer")) return { ok: false };
  const item = actor.items.get(itemId);
  const scene = game.scenes.get(sceneId);
  if (!item || !isTrapItem(item) || !scene) return { ok: false };
  const size = scene.grid.size;
  await scene.createEmbeddedDocuments("Region", [{
    name: L("Profession.Trap.Region", { item: item.name }),
    color: TRAP_COLOR,
    shapes: [{ type: "rectangle", x: toInt(x), y: toInt(y), width: size, height: size, rotation: 0, hole: false }],
    visibility: CONST.REGION_VISIBILITY.ALWAYS,
    flags: { [SYSTEM_ID]: { trap: { item: item.toObject(), actorUuid, disposition: toInt(disposition), userId: user.id } } }
  }]);
  return { ok: true };
}

/**
 * A token moved: the traps of its scene it passed through go off (the first time an enemy of the Engineer steps
 * in). Primary GM only.
 * @param {TokenDocument} token
 * @param {object} movement
 */
async function onMoveToken(token, movement) {
  const traps = token.parent?.regions.filter(r => r.getFlag(SYSTEM_ID, "trap")) ?? [];
  if (!traps.length || !token.actor || (token.actor.type === "pile")) return;
  const waypoints = movement?.passed?.waypoints ?? [];
  for (const region of traps) {
    const trap = region.getFlag(SYSTEM_ID, "trap");
    if (token.disposition === trap.disposition) continue;
    const inside = waypoints.some(w => {
      const center = token.getCenterPoint(w);
      return region.testPoint({ x: center.x, y: center.y, elevation: center.elevation ?? w.elevation ?? 0 });
    });
    if (!inside) continue;
    await region.delete();
    await setOff(trap, token);
  }
}

/** A trap goes off on a token: its damage card, its effects. */
async function setOff(trap, token) {
  const engineer = await fromUuid(trap.actorUuid).catch(() => null);
  const item = new Item.implementation(trap.item, { parent: engineer ?? undefined });
  const victim = token.actor;
  const damage = item.system.damage ?? {};
  const data = formulaData(engineer ?? victim, item);
  const dice = toInt(damage.dice) + (damage.diceFormula ? Math.max(0, evaluateFormula(damage.diceFormula, data) ?? 0) : 0);
  const mod = toInt(damage.mod) + (damage.formula ? (evaluateFormula(damage.formula, data) ?? 0) : 0);
  if (dice || mod) {
    await createDamageCard(item, engineer, diceFormula({ dice, mod }), `${item.name} · ${L("Profession.Trap.Name")}`, null,
      targetEntries([{ document: token, actor: victim }]));
  }
  const given = item.effects.size ? await applyItemEffects(item, [victim]) : [];
  const p = engineer ? professionOf(engineer) : null;
  const lines = [L("Profession.Chat.TrapTriggered", { item: item.name, name: token.name })];
  if (given.length) lines.push(L("Profession.Chat.TrapEffects", { effects: item.effects.map(e => e.name).join(", ") }));
  if (p) await postCard(engineer, p, { title: L("Profession.Trap.Name"), lines });
  else {
    await ChatMessage.create({
      speaker: { alias: engineer ? actorName(engineer) : L("Profession.Trap.Name") },
      content: `<div class="eternia chat-card lhauto-card lhp-card" style="--lhp-color: ${PROFESSIONS.engineer.color}"><ul>${lines.map(l => `<li>${escape(l)}</li>`).join("")}</ul></div>`
    });
  }
}

/** Call during the `init` hook (with registerHandler for "professionTrap"). */
export function registerTraps() {
  Hooks.on("moveToken", (token, movement) => {
    if (!isPrimaryGM()) return;
    onMoveToken(token, movement).catch(err => console.error(`${SYSTEM_ID} | Trap failed`, err));
  });
}

/** Characters' traps on a scene (for the sheet: how many are armed). */
export function armedTraps(actor) {
  return game.scenes.contents.flatMap(scene => scene.regions.filter(r => r.getFlag(SYSTEM_ID, "trap")?.actorUuid === actor.uuid));
}
