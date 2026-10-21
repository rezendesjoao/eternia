import { SYSTEM_ID } from "../settings.mjs";

export const toInt = value => Math.trunc(Number(value) || 0);

/** Text made safe for HTML. */
export const escape = value => Handlebars.escapeExpression(String(value ?? ""));

/**
 * Wrap a method of a class prototype. `fn(original, ...args)` runs with `this` bound to the instance.
 * @param {object} proto
 * @param {string} name
 * @param {Function} fn
 */
export function wrap(proto, name, fn) {
  const original = proto?.[name];
  if (typeof original !== "function") {
    console.warn(`${SYSTEM_ID} | ${name} not found: that automation is off`);
    return;
  }
  proto[name] = function (...args) {
    return fn.call(this, original, ...args);
  };
}

/** Whether an actor fights in a combat (token actors compare by uuid). */
export const fightsIn = (combat, actor) => !!actor && combat.combatants.some(c => c.actor?.uuid === actor.uuid);

/**
 * The started combat an actor fights in: the one this client views first, else any other.
 * @param {Actor} actor
 * @returns {Combat|null}
 */
export function combatOf(actor) {
  if (!actor) return null;
  const started = combat => combat.started && fightsIn(combat, actor);
  if (game.combat && started(game.combat)) return game.combat;
  return game.combats.find(started) ?? null;
}

/** The combatant of an actor in a combat. */
export const combatantOf = (combat, actor) => combat?.combatants.find(c => c.actor?.uuid === actor?.uuid) ?? null;

/** The distinct actors of a combat. */
export function combatActors(combat) {
  const actors = new Map();
  for (const combatant of combat?.combatants ?? []) {
    const actor = combatant.actor;
    if (actor && !actors.has(actor.uuid)) actors.set(actor.uuid, actor);
  }
  return [...actors.values()];
}

/** Incapacitated, Dead or Absent (or defeated in the tracker): always Post-Action. */
export function outOfAction(combatant) {
  const statuses = combatant.actor?.statuses;
  return !!(combatant.isDefeated || statuses?.has("incapacitated") || statuses?.has("dead") || statuses?.has("absent"));
}

/** The name an actor goes by on the scene. */
export const actorName = actor => actor?.token?.name ?? actor?.name ?? "?";

/** The actor of an attack / damage card target (token actors included). */
export const targetActor = target => fromUuidSync(target?.tokenUuid)?.actor ?? fromUuidSync(target?.actorUuid) ?? null;

/** Whether two card targets are the same token (or actor). */
export const sameTarget = (a, b) => (a?.tokenUuid && b?.tokenUuid) ? (a.tokenUuid === b.tokenUuid) : (a?.actorUuid === b?.actorUuid);

/**
 * Yes / No dialog; No is the default answer.
 * @returns {Promise<boolean>}
 */
export async function confirm({ title, content, yes, no }) {
  const answer = await foundry.applications.api.DialogV2.confirm({
    window: { title },
    classes: ["lhauto-dialog"],
    content,
    modal: true,
    rejectClose: false,
    yes: { label: yes ?? "COMMON.Yes" },
    no: { label: no ?? "COMMON.No" }
  });
  return answer === true;
}

/**
 * Post a small summary card: the public lines for everyone, the others to the GMs only.
 * @param {string} title
 * @param {string[]} lines
 * @param {string[]} [gmLines]
 */
export async function postSummary(title, lines, gmLines = []) {
  const card = list => `<div class="eternia chat-card lhauto-card">
    <header class="chat-card-header"><div class="chat-card-title"><h3>${escape(title)}</h3></div></header>
    <ul>${list.map(line => `<li>${escape(line)}</li>`).join("")}</ul>
  </div>`;
  if (lines.length) await ChatMessage.create({ speaker: { alias: title }, content: card(lines) });
  if (gmLines.length) {
    await ChatMessage.create({
      speaker: { alias: title },
      content: card(gmLines),
      whisper: ChatMessage.getWhisperRecipients("GM").map(u => u.id)
    });
  }
}
