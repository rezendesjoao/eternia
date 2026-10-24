/**
 * What the conditions forbid, by the setting "conditionLimits" (warn: ask to go on; block: players can't, the GM
 * may still go on). The action HUD reads the same issues to dim what can't be used now.
 *
 * - No action at all: [Paralyzed], [Asleep] (their combatants are skipped, see turns.mjs).
 * - No [Movement] skill, and the token doesn't move: [Rigor], [Rooted], [Grappled] (and the two above).
 * - No reaction (Before / After Check, Damage Roll, Before / After Damage): [Dazed], [Shocked].
 * - [Silenced]: no [Magic Attack], [Spell] or [Song], but a [Curse] isn't magic and goes on. [Disarmed]: no weapon
 *   attack. [Sealed (Skill)]: not that skill.
 * - [Berserk]: only skills that attack.
 * - Targets: [Blinded] only within 1 Sq; [Grappled] attacks only its grappler, [Taunted] must include its taunter,
 *   [Charmed] never attacks its charmer. [Frightened] can't move closer to what frightens it.
 * - Actions: [Hasted] has a second Minor Action; [Slowed] has no Move Action.
 */
import { L, setting } from "../settings.mjs";
import { parseSkillField } from "../helpers/skill-fields.mjs";
import { findTag } from "../helpers/tag-catalog.mjs";
import { actorName, toInt } from "../helpers/utils.mjs";
import { NO_ACTIONS, NO_MOVEMENT, NO_REACTIONS, SILENCED_TAGS } from "./catalog.mjs";
import { has, isHostile, isSourceOf, limitsMode, rulesOn, sameActor, sourcesOf } from "./rules.mjs";

const label = id => game.i18n.localize(`ETERNIA.StatusEffect.${id}`);
const REACTIONS = new Set(["Before Check", "After Check", "Damage Roll", "Before Damage", "After Damage"]);
const tagKeys = item => (item.system.tags ?? []).map(t => (findTag(t)?.label ?? String(t)).trim().toLowerCase());

/** Whether a skill attacks with the weapon (Range "Weapon", or a weapon attack tag). */
function isWeaponAttack(item) {
  return /weapon/i.test(item.system.range ?? "")
    || tagKeys(item).some(t => ["weapon attack", "melee attack", "ranged attack", "sword attack"].includes(t));
}

/** Distance in squares between two tokens (Manhattan, as the attack cards count it), null off a square grid. */
function squares(a, b) {
  if (!a || !b || !canvas.ready || (canvas.grid.type !== CONST.GRID_TYPES.SQUARE)) return null;
  const p = canvas.grid.getOffset(a.center);
  const q = canvas.grid.getOffset(b.center);
  return Math.abs(p.i - q.i) + Math.abs(p.j - q.j);
}

const tokenOf = actor => (canvas.ready ? (canvas.tokens.controlled.find(t => t.actor === actor) ?? actor?.getActiveTokens(true)[0] ?? null) : null);

/**
 * The issues the conditions of an actor raise against using a skill now.
 * @param {Item} item
 * @param {Actor} actor
 * @param {object} [context]
 * @param {Token[]} [context.targets]   The targeted tokens (known when the skill is used, not in the HUD)
 * @returns {{text: string, mode: string}[]}
 */
export function conditionUseIssues(item, actor, { targets = null } = {}) {
  const mode = limitsMode();
  if (!actor || (mode === "off") || !rulesOn()) return [];
  const issues = [];
  const push = (id, key, data = {}) => issues.push({ text: L(`Conditions.Use.${key}`, { status: label(id), name: actorName(actor), ...data }), mode });
  const timing = parseSkillField("timing", item.system.timing).type;
  if (timing === "Constant") return [];
  const tags = tagKeys(item);

  for (const id of NO_ACTIONS) if (has(actor, id)) push(id, "NoActions");
  if (tags.includes("movement")) {
    for (const id of NO_MOVEMENT) if (has(actor, id) && !NO_ACTIONS.includes(id)) push(id, "NoMovement");
  }
  if (REACTIONS.has(timing)) {
    for (const id of NO_REACTIONS) if (has(actor, id) && !NO_ACTIONS.includes(id)) push(id, "NoReactions");
  }
  if (has(actor, "silenced") && !tags.includes("curse") && SILENCED_TAGS.some(t => tags.includes(t.toLowerCase()))) {
    push("silenced", "Silenced");
  }
  if (has(actor, "disarmed") && isWeaponAttack(item)) push("disarmed", "Disarmed");
  if (has(actor, "sealed") && sealedSkills(actor).includes(item.name.trim().toLowerCase())) push("sealed", "Sealed");
  const hostile = isHostile(item);
  // [Berserk] still moves, and uses the skills made for it (those that require it): only the other skills that
  // don't attack are out.
  if (has(actor, "berserk") && !hostile && !tags.includes("movement") && (timing !== "Move") && !requires(item, "berserk")) {
    push("berserk", "Berserk");
  }

  // Targets (only when the skill is used: the user's targets are known then)
  if (targets && hostile) {
    const actors = targets.map(t => t.actor).filter(Boolean);
    if (has(actor, "blinded")) {
      const origin = tokenOf(actor);
      const far = targets.filter(t => (squares(origin, t) ?? 0) > 1);
      if (far.length) push("blinded", "Blinded", { targets: far.map(t => t.name).join(", ") });
    }
    for (const id of ["grappled", "taunted"]) {
      const sources = sourcesOf(actor, id);
      if (!sources.length || !actors.length) continue;
      const others = actors.filter(a => !sources.some(s => sameActor(s, a)));
      if ((id === "grappled") && others.length) push(id, "Grappled", { source: sources.map(actorName).join(", ") });
      if ((id === "taunted") && !actors.some(a => sources.some(s => sameActor(s, a)))) {
        push(id, "Taunted", { source: sources.map(actorName).join(", ") });
      }
    }
    const charmers = actors.filter(a => isSourceOf(actor, "charmed", a));
    if (charmers.length) push("charmed", "Charmed", { source: charmers.map(actorName).join(", ") });
  }
  return issues;
}

/** Whether a skill only works with a status (its conditions ask for it). */
function requires(item, status) {
  const conditions = item.system?.conditions;
  const list = Array.isArray(conditions) ? conditions : Object.values(conditions ?? {});
  return list.some(c => (c?.type === "status") && (c.value === status));
}

/** The skills an actor has [Sealed]: the Tag of each sealing, lower case. */
export function sealedSkills(actor) {
  return [...actor.effects]
    .filter(e => e.active && e.statuses?.has("sealed"))
    .map(e => String(e.getFlag("eternia", "statusData")?.tag ?? "").trim().toLowerCase())
    .filter(Boolean);
}

/**
 * How many actions of each kind an actor has in its Main Process: [Hasted] has a second Minor Action, [Slowed]
 * has no Move Action.
 * @param {Actor} actor
 * @returns {{major: number, minor: number, move: number}}
 */
export function actionAllowance(actor) {
  const allowed = { major: 1, minor: 1, move: 1 };
  if (!rulesOn()) return allowed;
  if (has(actor, "hasted")) allowed.minor = 2;
  if (has(actor, "slowed")) allowed.move = 0;
  return allowed;
}

/* -------------------------------------------- */
/*  Moving the token                            */
/* -------------------------------------------- */

/** Statuses that keep the token where it is. */
function stuckBy(actor) {
  return NO_MOVEMENT.filter(id => has(actor, id));
}

/** Call during the `init` hook. */
export function registerConditionMovement() {
  Hooks.on("preUpdateToken", (token, changes, options, userId) => {
    if ((userId !== game.user.id) || options.eterniaForced || !(("x" in changes) || ("y" in changes))) return;
    const actor = token.actor;
    const mode = limitsMode();
    if (!actor || (mode === "off") || !rulesOn()) return;
    const issues = stuckBy(actor).map(id => L("Conditions.Move.Stuck", { name: token.name, status: label(id) }));
    // [Frightened]: not closer to what frightens it.
    const fears = sourcesOf(actor, "frightened").flatMap(s => s.getActiveTokens(true)).filter(t => t.scene === token.parent);
    if (fears.length && token.object) {
      const next = { ...token.object.center };
      const size = canvas.grid.size;
      if ("x" in changes) next.x = changes.x + ((token.width * size) / 2);
      if ("y" in changes) next.y = changes.y + ((token.height * size) / 2);
      for (const fear of fears) {
        const before = squares(token.object, fear);
        const p = canvas.grid.getOffset(next);
        const q = canvas.grid.getOffset(fear.center);
        const after = Math.abs(p.i - q.i) + Math.abs(p.j - q.j);
        if ((before !== null) && (after < before)) issues.push(L("Conditions.Move.Fear", { name: token.name, source: fear.name }));
      }
    }
    if (!issues.length) return;
    if ((mode === "block") && !game.user.isGM) {
      ui.notifications.warn(issues.join(" "));
      return false;
    }
    ui.notifications.info(issues.join(" "));
  });
}

/** Whether the whole Main Process is lost: the combatant is skipped (turns.mjs). */
export const losesTurn = actor => rulesOn() && (setting("conditionLimits") !== "off") && NO_ACTIONS.some(id => has(actor, id));

/** The number of a stack, for the chat lines. */
export const stacks = (actor, id) => toInt(actor?.system?.["bad-status"]?.[id]);
