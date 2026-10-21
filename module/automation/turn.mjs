/**
 * Turn helpers for big tables (ideas from PF2e Workbench, PF2e Toolbelt and Sundry, written for the Round
 * Progression of the eternia system, where the Main Process of each combatant is `flags.eternia.active`):
 * - notice: the players who own the combatant whose Main Process starts get a notice and a sound;
 * - select: its token is selected for its owners (for the GM, only the combatants no player owns);
 * - pan: the view goes to its token;
 * - untarget: when a Main Process the user is responsible for ends, the user's targets are cleared, so the next
 *   skill doesn't go to the old target.
 * Each is a client setting: every player turns on what helps them. Simultaneous combats are followed apart.
 */
import { L, setting } from "../settings.mjs";
import { actorName } from "../helpers/utils.mjs";

/** The combatant in its Main Process, by combat id, as last seen by this window. */
const lastActive = new Map();

/** The combatant whose Main Process it is (none outside the Main Process). */
const activeId = combat => ((combat.started && (combat.phase === "main")) ? (combat.getFlag("eternia", "active") ?? null) : null);

/** Call during the `init` hook. */
export function registerTurn() {
  Hooks.once("ready", () => {
    for (const combat of game.combats) lastActive.set(combat.id, activeId(combat));
  });
  Hooks.on("updateCombat", onUpdateCombat);
  Hooks.on("deleteCombat", combat => lastActive.delete(combat.id));
}

function onUpdateCombat(combat, changed) {
  if (!foundry.utils.hasProperty(changed, "flags.eternia") && !("round" in changed)) return;
  const next = activeId(combat);
  const prev = lastActive.get(combat.id) ?? null;
  lastActive.set(combat.id, next);
  if (prev === next) return;
  if (prev) onProcessEnd(combat.combatants.get(prev));
  if (next) onProcessStart(combat.combatants.get(next));
}

/** Whether this user plays the combatant: a player who owns it, or the GM for those no player owns. */
function responsible(combatant) {
  if (!combatant?.actor) return false;
  if (game.user.isGM) return !combatant.hasPlayerOwner;
  return combatant.actor.testUserPermission(game.user, "OWNER");
}

/** The combatant's token on the scene this window shows, if any. */
function tokenOnCanvas(combatant) {
  const token = combatant.token?.object;
  return (token && canvas?.ready && (token.document.parent === canvas.scene)) ? token : null;
}

function onProcessStart(combatant) {
  if (!combatant) return;
  const mine = responsible(combatant);
  if (mine && !game.user.isGM && setting("turnNotice")) {
    ui.notifications.info(L("Turn.Notice", { name: actorName(combatant.actor) }));
    foundry.audio.AudioHelper.play({ src: CONFIG.sounds.notification, volume: 0.8, autoplay: true, loop: false }, false);
  }
  const token = tokenOnCanvas(combatant);
  if (!token) return;
  if (mine && setting("turnSelect") && token.isOwner) token.control({ releaseOthers: true });
  if (setting("turnPan") && token.visible) canvas.animatePan({ x: token.center.x, y: token.center.y, duration: 300 });
}

function onProcessEnd(combatant) {
  if (!combatant || !setting("turnUntarget") || !responsible(combatant)) return;
  if (game.user.targets.size) canvas.tokens?.setTargets([], { mode: "replace" });
}
