/**
 * The heads (a monster rule, docs/bestiario.md): a monster whose passive carries `flags.eternia.monster = { rule: "heads",
 * start, skills, regrow, burn }` (the Swamp Hydra) attacks once for each head.
 * - In its Main Process it has one Major Action for each head (conditions/actions.mjs adds `extraMajors`): one of them may
 *   go to any skill, the others only to the skills named in `skills` (its bites; bestiary/use-checks.mjs warns).
 * - Each fifth of its max HP lost cuts a head, which leaves a stump; healing doesn't bring them back (`cut` keeps the
 *   fifths already lost).
 * - In each Setup Process every stump grows back as `regrow` (2) heads, unless damage with one of the tags of `burn`
 *   (["Flame"]) hurt the monster since the cut: a damage card (the one that cuts, too), or its [Burning], [Black Flame]
 *   or [Fuse] in the Cleanup. A burned stump stays a stump.
 * State: `flags.eternia.heads = { n, stumps, cut, other }` (`other`: the round whose free Major Action went to another
 * skill). The changes run on the window that changed the monster (the GM's), one after another.
 */
import { L, SYSTEM_ID } from "../settings.mjs";
import { isLocalChange, isPrimaryGM } from "../helpers/clients.mjs";
import { actorName, combatActors, combatOf, postSummary, toInt, wrap } from "../helpers/utils.mjs";
import { parseSkillField } from "../helpers/skill-fields.mjs";
import { rating, rulesOn } from "../conditions/rules.mjs";

/** The statuses that hurt with [Flame] in the Cleanup (conditions/turns.mjs). */
const FIRE = ["burning", "blackFlame", "fuse"];

/** The round of a combat, for the free Major Action. */
const roundKey = combat => `${combat.id}.${combat.round}`;

/** An actor's heads rule: its skill and its numbers, or null. */
export function headsRule(actor) {
  const item = (actor?.items ?? []).find(i => (i.type === "skill") && (i.getFlag(SYSTEM_ID, "monster")?.rule === "heads"));
  if (!item) return null;
  const rule = item.getFlag(SYSTEM_ID, "monster");
  const names = (rule.skills ?? []).map(s => String(s).trim()).filter(Boolean);
  return {
    item, names,
    start: Math.max(1, toInt(rule.start) || 5),
    regrow: Math.max(1, toInt(rule.regrow) || 2),
    skills: names.map(s => s.toLowerCase()),
    burn: (rule.burn ?? ["Flame"]).map(t => String(t).toLowerCase())
  };
}

/** The heads of an actor now (how many, the stumps, the fifths already cut), or null without the rule. */
export function headsOf(actor) {
  const rule = headsRule(actor);
  if (!rule) return null;
  const state = actor.getFlag(SYSTEM_ID, "heads") ?? {};
  return {
    rule, n: Number.isFinite(state.n) ? Math.max(0, toInt(state.n)) : rule.start,
    stumps: toInt(state.stumps), cut: toInt(state.cut), other: state.other ?? null
  };
}

/** The Major Actions the heads add to its Main Process: one for each head past the first (conditions/actions.mjs). */
export function extraMajors(actor) {
  if (actor?.type !== "monster") return 0;
  const heads = headsOf(actor);
  return heads ? Math.max(0, heads.n - 1) : 0;
}

/** Whether a skill is one the heads use (a bite). */
const headSkill = (heads, item) => heads.rule.skills.includes(String(item?.name ?? "").trim().toLowerCase());

/**
 * What the heads say against using a skill: the free Major Action of the round already went to another skill, and the
 * others are only for the bites.
 * @param {Item} item
 * @param {Actor} actor
 * @param {Combat|null} combat
 * @returns {string[]}
 */
export function headsIssues(item, actor, combat) {
  const heads = headsOf(actor);
  if (!heads || !combat || headSkill(heads, item) || (parseSkillField("timing", item.system.timing).type !== "Major")) return [];
  if (heads.other !== roundKey(combat)) return [];
  return [L("Bestiary.HeadsOther", { name: actorName(actor), skills: heads.rule.names.join(", ") })];
}

/* -------------------------------------------- */
/*  Cutting, burning, growing                   */
/* -------------------------------------------- */

/** One change of the heads at a time for each monster (the HP that cuts first, then the fire of the same blow). */
const chains = new Map();
function queue(actor, fn) {
  const next = (chains.get(actor.uuid) ?? Promise.resolve()).then(fn).catch(err => console.error(`${SYSTEM_ID} | Heads failed`, err));
  chains.set(actor.uuid, next);
  return next;
}

/** Keep the heads, with some changes. */
function save(actor, heads, changes) {
  const state = { n: heads.n, stumps: heads.stumps, cut: heads.cut, other: heads.other, ...changes };
  return actor.setFlag(SYSTEM_ID, "heads", state);
}

/** The fifths of its max HP an actor has lost (0 to 4), or null at 0 HP. */
function fifthsLost(actor) {
  const hp = toInt(actor.system.health?.value);
  const max = toInt(actor.system.health?.max);
  if ((hp <= 0) || (max <= 0)) return null;
  return Math.min(4, Math.max(0, Math.floor(((max - hp) * 5) / max)));
}

/** HP changed: each fifth newly lost cuts a head, and a stump is left. */
async function cutHeads(actor) {
  const heads = headsOf(actor);
  const fifths = heads ? fifthsLost(actor) : null;
  if (!heads || (fifths === null) || (fifths <= heads.cut)) return;
  const lost = Math.min(fifths - heads.cut, heads.n);
  const n = heads.n - lost;
  const stumps = heads.stumps + lost;
  await save(actor, heads, { n, stumps, cut: fifths });
  if (lost <= 0) return;
  await postSummary(heads.rule.item.name, [L((lost > 1) ? "Bestiary.HeadsCutMany" : "Bestiary.HeadsCut", { name: actorName(actor), n: lost, heads: n, stumps })]);
}

/** Damage of [Flame] hurt it: the stumps there now are burned and won't grow back. */
async function burnStumps(actor) {
  const heads = headsOf(actor);
  if (!heads?.stumps) return;
  await save(actor, heads, { stumps: 0 });
  await postSummary(heads.rule.item.name, [L("Bestiary.HeadsBurned", { name: actorName(actor), heads: heads.n })]);
}

/** A Setup Process: each stump grows back as `regrow` heads. */
async function growHeads(actor) {
  const heads = headsOf(actor);
  if (!heads?.stumps) return;
  const n = heads.n + (heads.stumps * heads.rule.regrow);
  await save(actor, heads, { n, stumps: 0 });
  await postSummary(heads.rule.item.name, [L("Bestiary.HeadsGrow", { name: actorName(actor), per: heads.rule.regrow, heads: n })]);
}

/** The monsters with heads of a combat, standing and in the fight. */
function hydrasOf(combat) {
  const out = new Set(combat.combatants.filter(c => c.isDefeated).map(c => c.actor?.uuid));
  return combatActors(combat).filter(a => headsRule(a) && !out.has(a.uuid) && !a.statuses.has("dead") && !a.statuses.has("incapacitated"));
}

/** A Main Process starts (on the primary GM): how many Major Actions the heads give it. */
function onUpdateCombat(combat, changes, options) {
  if (!rulesOn() || !isPrimaryGM()) return;
  const active = foundry.utils.getProperty(changes, "flags.eternia.active");
  if (!active || (combat.phase !== "main") || options?.eterniaRepeat?.start) return;
  const actor = combat.combatants.get(active)?.actor;
  const heads = headsOf(actor);
  if (!heads || actor.statuses.has("dead") || actor.statuses.has("incapacitated")) return;
  postSummary(heads.rule.item.name, [L("Bestiary.HeadsTurn", {
    name: actorName(actor), heads: heads.n, stumps: heads.stumps, skills: heads.rule.names.join(", ")
  })]).catch(err => console.error(`${SYSTEM_ID} | Heads failed`, err));
}

/** Call during the `init` hook. */
export function registerHeads() {
  // The HP that cuts (on the window that changed them)
  Hooks.on("updateActor", (actor, changes, options, userId) => {
    if ((actor.type !== "monster") || !rulesOn() || !isLocalChange(options, userId) || !foundry.utils.hasProperty(changes, "system.health")) return;
    if (headsRule(actor)) queue(actor, () => cutHeads(actor));
  });
  // The fire of a damage card that hurt it (after the cut of the same blow)
  Hooks.on("eternia.damaged", (actor, card, { amount = 0, absorbed = 0 } = {}) => {
    const rule = ((actor?.type === "monster") && actor.isOwner && rulesOn()) ? headsRule(actor) : null;
    if (!rule || ((toInt(amount) <= 0) && (toInt(absorbed) <= 0))) return;
    const tags = (card?.tags ?? []).map(t => String(t).toLowerCase());
    if (rule.burn.some(t => tags.includes(t))) queue(actor, () => burnStumps(actor));
  });
  // The free Major Action of the round, spent on a skill that isn't a bite
  Hooks.on("eternia.skillUsed", (item, { actor, action } = {}) => {
    const heads = ((actor?.type === "monster") && actor.isOwner) ? headsOf(actor) : null;
    const combat = heads ? combatOf(actor) : null;
    if (!combat || (action !== "major") || headSkill(heads, item)) return;
    queue(actor, () => save(actor, headsOf(actor), { other: roundKey(combat) }));
  });
  Hooks.on("updateCombat", onUpdateCombat);
  // The Cleanup's fire burns the stumps (the HP it took, read around the Cleanup); the Setup grows them back
  wrap(CONFIG.Combat.documentClass.prototype, "_onPhaseStart", async function (original, phase, round, previous) {
    const backwards = !!previous && (round < previous.round);
    const burning = ((phase === "cleanup") && !backwards && rulesOn())
      ? hydrasOf(this).filter(a => FIRE.some(id => rating(a, id) > 0)).map(actor => ({ actor, hp: toInt(actor.system.health?.value) }))
      : [];
    await original.call(this, phase, round, previous);
    if (backwards || !rulesOn()) return;
    for (const { actor, hp } of burning) {
      if (toInt(actor.system.health?.value) < hp) await queue(actor, () => burnStumps(actor));
    }
    if (phase === "setup") for (const actor of hydrasOf(this)) await queue(actor, () => growHeads(actor));
  });
}
