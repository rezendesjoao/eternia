/**
 * The conditions over the turns of a combat and as they come and go.
 *
 * - Setup Process: the Extra Breaths that come back every round (`revive` with `per: "round"`) are whole again; the
 *   Sun clock: for whoever has a Trait with `sunClock` (the Magia Sol), the [Sun] rises by 1 (up to SUN_NOON;
 *   SUN_NIGHT in a scene at least half dark); at noon it gives [The One] for the round, once per combat, and from then
 *   on it sets by 1 every round (automation/round.mjs calls setupConditions). A spell of that Magia raises it by 1
 *   too, until noon.
 * - Start of a Main Process: [Poisoned] deals its Rating as direct damage; [Confused] raises the Hate by 1.
 * - [Paralyzed], [Asleep], [Petrified] and [Nightmare] combatants lose their Main Process (they are skipped, see
 *   automation/round.mjs).
 * - End of the bearer's own Main Process (automation/round.mjs calls endOwnStatuses and endOwnProcess): the statuses
 *   of END_OF_OWN_PROCESS end, but those of WHOLE_TURN (or an effect with `nextTurn`) given during that very Main
 *   Process stay until the end of the next one, and those an infinite effect holds or a renewal keeps stay too
 *   (conditions/lasting.mjs, also in the Cleanup); [Impetus] rises by 1 (past the CR: [Berserk] until it ends); [Combo]
 *   breaks when the bearer didn't attack this round.
 * - Cleanup Process: [Burning] and [Black Flame] deal their Rating as [Flame] damage, [Nightmare] as direct damage,
 *   [Doom] counts down (at 0: Incapacitated), [Fuse] explodes (its Rating as [Flame] damage, then it ends), a [Servant]
 *   strikes the nearest enemy within 4 squares (its Rating as direct damage, with the tag of its effect; not the
 *   servant of a [Pacified] master), [The One] counts down (its Rating is the rounds it has left), then the statuses of
 *   END_OF_ROUND end (automation/round.mjs calls cleanupConditions).
 * - A Major Action: [Shocked] deals its Rating as direct damage; it ends [Intangible] and [Hidden] (not the
 *   [Hidden] of a skill that keeps it: the Fumaça's Trait, see helpers/magic-traits.mjs).
 * - Attack cards (on the primary GM): the attacker's record of attacks (`flags.eternia.attacked = { combat, round,
 *   previous }`: the rounds of its last attack and of the one before, in that combat) and the hook `eternia.attacked`;
 *   once every target of one is resolved, the [Combo] of its attacker grows (1, or the skill's `comboGain`, per target
 *   hit with `comboPerTarget`) when it hit anyone and breaks when it hit no one.
 * - Stacks: the third [Freezing] freezes ([Paralyzed]); the third [Fissured] breaks the guard ([Exposed], no
 *   [Barrier]); the stacks are cleared.
 * - [Awakened] and [Impetus] end with [Fatigue] equal to their Rating (not when an update says
 *   `eterniaNoFatigue`); [Swimming] and [Soaked] put out [Burning] (and don't catch it); [Sealed] without a skill
 *   seals the last skill used; [Grappled], [Bond], [Black Flame] and [Petrified] end when their source is
 *   Incapacitated.
 */
import { L, SYSTEM_ID } from "../settings.mjs";
import { isPrimaryGM, isLocalChange } from "../helpers/clients.mjs";
import { parseSkillField } from "../helpers/skill-fields.mjs";
import { statusDefinition } from "../helpers/statuses.mjs";
import { actorName, combatantOf, postSummary, toInt } from "../helpers/utils.mjs";
import { AFFLICTED_PROTECTS, END_OF_OWN_PROCESS, END_OF_ROUND, STACK_THRESHOLDS, SUN_NIGHT, SUN_NOON, WHOLE_TURN } from "./catalog.mjs";
import { extraBreaths, takeDamage } from "./damage.mjs";
import { addStatus, crOf, has, rating, removeStatuses, rulesOn, sameActor, sourcesOf, statusEffects } from "./rules.mjs";
import { keepsHidden, traitsFor } from "../helpers/magic-traits.mjs";
import { giveEffects, statusEffectData } from "../chat/status-links.mjs";
import { naturalEnd } from "./lasting.mjs";
import { cleanupFeeds } from "./souls.mjs";
import { countSpell } from "./transformations.mjs";

const label = id => game.i18n.localize(`ETERNIA.StatusEffect.${id}`);

/** How far a [Servant] reaches (squares, counted like the attack cards). */
const SERVANT_REACH = 4;

/** Statuses that put out [Burning] when they come, and keep it from taking. */
const PUTS_OUT_FIRE = ["swimming", "soaked"];

/* -------------------------------------------- */
/*  Actions                                     */
/* -------------------------------------------- */

/**
 * After a skill is used: a Major Action sets off [Shocked] and ends [Intangible] and [Hidden]; the skill is the last
 * one used (for [Sealed]).
 * @param {Actor} actor
 * @param {Item} item
 * @param {string|null} action   The action it spent in the Main Process ("major"…), null outside a combat
 */
export async function afterAction(actor, item, action) {
  if (!actor?.isOwner || !rulesOn()) return;
  // A skill (not a usable item): the one a [Sealed] without a name seals, the Sun clock, the spells counted
  if (item.type === "skill") {
    await actor.setFlag(SYSTEM_ID, "lastSkill", item.name).catch(() => null);
    // A spell of the Magia that keeps the Sun clock raises the Sun (in a combat, until noon).
    const combat = combatOf(actor);
    if (combat && traitsFor(actor, item).some(e => e.getFlag(SYSTEM_ID, "trait")?.sunClock)) await moveSun(actor, combat, { spell: true });
    // The n-th spell of a Magia in the scene transforms (transformations.mjs)
    await countSpell(actor, item);
  }
  const major = (action === "major") || (parseSkillField("timing", item.system.timing).type === "Major");
  if (!major) return;
  const shock = rating(actor, "shocked");
  if (shock > 0) await takeDamage(actor, shock, { reason: "shocked" });
  const ended = ["intangible", "hidden"].filter(id => has(actor, id) && !((id === "hidden") && keepsHidden(item, actor)));
  if (ended.length) await removeStatuses(actor, ended);
}

/* -------------------------------------------- */
/*  The Sun clock                               */
/* -------------------------------------------- */

/* -------------------------------------------- */
/*  The contagion                               */
/* -------------------------------------------- */

/** The key of a combat's Cleanup ("<combat>.<round>"), or null outside a combat. */
function cleanupKey(actor) {
  const combat = combatOf(actor);
  return combat ? `${combat.id}.${combat.round}` : null;
}

/** Whether an actor caught its [Contagion] in this very Cleanup (it only hurts and spreads from the next one). */
function caughtNow(actor) {
  const key = cleanupKey(actor);
  return !!key && statusEffects(actor, "contagion").length > 0
    && statusEffects(actor, "contagion").every(e => e.getFlag(SYSTEM_ID, "caughtAt") === key);
}

/**
 * [Contagion] passes from an actor to the allies (same token disposition) within 1 square of it that don't have it
 * yet, with the same Rating and source. In a combat only.
 * @returns {Promise<string[]>}   Lines for the Cleanup summary
 */
async function spreadContagion(actor, value) {
  const key = cleanupKey(actor);
  const token = actor.token ?? actor.getActiveTokens?.(false, true)[0] ?? null;
  const scene = token?.parent;
  if (!key || !scene) return [];
  const size = scene.grid.size;
  const box = t => ({ x0: Math.round(t.x / size), y0: Math.round(t.y / size), x1: Math.round(t.x / size) + Math.max(1, toInt(t.width)) - 1, y1: Math.round(t.y / size) + Math.max(1, toInt(t.height)) - 1 });
  const a = box(token);
  const source = sourcesOf(actor, "contagion")[0] ?? null;
  const caught = [];
  for (const other of scene.tokens) {
    const ally = other.actor;
    if ((other === token) || other.hidden || !ally || (other.disposition !== token.disposition) || (ally.type === "pile")) continue;
    if (ally.statuses.has("dead") || ally.statuses.has("incapacitated") || has(ally, "contagion")) continue;
    const b = box(other);
    if (Math.max(0, b.x0 - a.x1, a.x0 - b.x1, b.y0 - a.y1, a.y0 - b.y1) > 1) continue;
    const effect = statusEffectData("contagion", value, "", { caster: source });
    effect.flags[SYSTEM_ID].caughtAt = key;
    if (await giveEffects(ally, [effect])) caught.push(actorName(ally));
  }
  return caught.length ? [L("Conditions.ContagionSpreads", { name: actorName(actor), list: caught.join(", ") })] : [];
}

/** The started combat an actor fights in (the viewed one first), or null. */
function combatOf(actor) {
  const fights = combat => combat?.started && combat.combatants.some(c => c.actor && sameActor(c.actor, actor));
  if (fights(game.combat)) return game.combat;
  return game.combats?.find(fights) ?? null;
}

/** Whether a combat's scene is night: at least half dark (the scene's own darkness). */
function isNight(combat) {
  const scene = combat?.scene ?? canvas?.scene ?? null;
  return Number(scene?.environment?.darknessLevel ?? 0) >= 0.5;
}

/** Whether an actor keeps the Sun clock: an active Trait with `sunClock` (the Magia Sol). */
function keepsSunClock(actor) {
  return [...(actor?.allApplicableEffects?.() ?? [])].some(e => e.active && e.getFlag(SYSTEM_ID, "trait")?.sunClock);
}

/**
 * The Sun moves for an actor in a combat: before noon it rises by 1 (up to SUN_NOON, SUN_NIGHT at night); reaching
 * noon gives [The One] for the round, once per combat; after noon, every Setup Process sets it by 1 and spells no
 * longer raise it.
 * @param {Actor} actor
 * @param {Combat} combat
 * @param {object} [options]
 * @param {boolean} [options.spell]   Raised by a spell (nothing after noon) rather than by the round
 * @returns {Promise<string|null>}    A line for the chat
 */
async function moveSun(actor, combat, { spell = false } = {}) {
  const current = rating(actor, "sun");
  const afterNoon = actor.getFlag(SYSTEM_ID, "sunNoon") === combat.id;
  if (afterNoon) {
    if (spell || (current <= 0)) return null;
    await actor.update({ "system.bad-status.sun": current - 1 });
    return L("Conditions.SunSets", { name: actorName(actor), n: current - 1 });
  }
  const cap = isNight(combat) ? SUN_NIGHT : SUN_NOON;
  const next = Math.min(current + 1, cap);
  if (next <= current) return null;
  await actor.update({ "system.bad-status.sun": next });
  if (next < SUN_NOON) return L("Conditions.SunRises", { name: actorName(actor), n: next });
  // Noon: [The One] for the rest of the round.
  await actor.setFlag(SYSTEM_ID, "sunNoon", combat.id);
  await addStatus(actor, "theOne", 1);
  const line = L("Conditions.Noon", { name: actorName(actor) });
  if (spell) await postSummary(label("theOne"), [line]);
  return line;
}

/**
 * The conditions of one actor in the Setup Process of a combat: the Extra Breaths that come back every round, and the
 * Sun clock. Called by automation/round.mjs for everyone in the combat, on the GM that started the phase.
 * @param {Actor} actor
 * @param {Combat} combat
 * @returns {Promise<string[]>}   Lines for the chat
 */
export async function setupConditions(actor, combat) {
  if (!rulesOn()) return [];
  const lines = [];
  const breath = await refreshBreaths(actor);
  if (breath) lines.push(breath);
  const sun = keepsSunClock(actor) ? await moveSun(actor, combat) : null;
  if (sun) lines.push(sun);
  return lines;
}

/** The Extra Breaths of an actor that come back every round (`per: "round"`) and were spent: whole again. */
async function refreshBreaths(actor) {
  const spent = actor.getFlag(SYSTEM_ID, "reviveSpent");
  if (!spent) return null;
  const back = extraBreaths(actor).filter(b => (b.per === "round") && (toInt(spent[b.key]) > 0));
  if (!back.length) return null;
  await actor.update(Object.fromEntries(back.map(b => [`flags.${SYSTEM_ID}.reviveSpent.${b.key}`, 0])));
  return L("Conditions.BreathBack", { name: actorName(actor), effects: back.map(b => b.effect.name).join(", ") });
}

/* -------------------------------------------- */
/*  End of the bearer's own Main Process        */
/* -------------------------------------------- */

/** The key of a combat's round, for what counts per round of a combat. */
const roundKey = combat => `${combat.id}.${combat.round}`;

/** The round key of the actor's own Main Process going on now, or null. */
function ownProcessKey(actor) {
  const combat = combatOf(actor);
  const combatant = combat ? combatantOf(combat, actor) : null;
  if (!combatant || (combat.phase !== "main") || (combat.progress?.active !== combatant.id)) return null;
  return roundKey(combat);
}

/**
 * The statuses that end with the bearer's own Main Process (END_OF_OWN_PROCESS; [Afflicted] keeps the ones it
 * protects). Those of WHOLE_TURN, or of an effect with `nextTurn`, given during this very Main Process stay until the
 * end of the next one. Called by automation/round.mjs on the window that ended the process.
 * @param {Actor} actor
 * @param {Combat} combat
 */
export async function endOwnStatuses(actor, combat) {
  const fresh = actor.effects.filter(e => e.getFlag(SYSTEM_ID, "keepThrough") === roundKey(combat));
  const kept = new Set(fresh.flatMap(e => [...e.statuses]));
  const afflicted = actor.statuses.has("afflicted");
  // Not those an infinite effect holds, nor a renewed one (conditions/lasting.mjs)
  const ending = await naturalEnd(actor, END_OF_OWN_PROCESS.filter(id => has(actor, id) && !kept.has(id) && !(afflicted && AFFLICTED_PROTECTS.includes(id))));
  if (ending.length) await removeStatuses(actor, ending);
  if (fresh.length) {
    await actor.updateEmbeddedDocuments("ActiveEffect", fresh.map(e => ({ _id: e.id, [`flags.${SYSTEM_ID}.-=keepThrough`]: null })));
  }
}

/**
 * The conditions of the end of the bearer's own Main Process: [Impetus] rises by 1 (past its CR, it loses control:
 * [Berserk: CR] until the Impetus ends); [Combo] breaks when the bearer didn't attack this round. Called by
 * automation/round.mjs on the window that ended the process.
 * @param {Actor} actor
 * @param {Combat} combat
 * @returns {Promise<string[]>}   Lines for the chat
 */
export async function endOwnProcess(actor, combat) {
  if (!rulesOn() || actor.statuses.has("dead") || actor.statuses.has("incapacitated")) return [];
  const lines = [];
  const impetus = rating(actor, "impetus");
  if (impetus > 0) {
    const next = Math.min(impetus + 1, statusDefinition("impetus").stack);
    await actor.update({ "system.bad-status.impetus": next });
    lines.push(L("Conditions.ImpetusRises", { name: actorName(actor), n: next }));
    const cr = crOf(actor);
    const raging = actor.effects.some(e => e.active && (e.getFlag(SYSTEM_ID, "endsWith") === "impetus") && e.statuses.has("berserk"));
    if ((next > cr) && !raging) {
      const effect = statusEffectData("berserk", Math.max(1, cr), "", { caster: actor });
      effect.flags[SYSTEM_ID].endsWith = "impetus";
      await giveEffects(actor, [effect]);
      lines.push(L("Conditions.ImpetusOver", { name: actorName(actor), n: Math.max(1, cr) }));
    }
  }
  const combo = rating(actor, "combo");
  if ((combo > 0) && !attackedThisRound(actor, combat)) {
    await actor.update({ "system.bad-status.combo": 0 });
    lines.push(L("Conditions.ComboFades", { name: actorName(actor) }));
  }
  return lines;
}

/* -------------------------------------------- */
/*  [Combo]                                     */
/* -------------------------------------------- */

/**
 * Whether an actor attacked (declared an attack card) in the current round of a combat.
 * @param {Actor} actor
 * @param {Combat} combat
 * @returns {boolean}
 */
export function attackedThisRound(actor, combat) {
  const record = actor?.getFlag(SYSTEM_ID, "attacked");
  return !!combat && (record?.combat === combat.id) && (record.round === combat.round);
}

/**
 * An actor declared an attack: its record of attacks (`flags.eternia.attacked = { combat, round, previous }`, the
 * rounds of its last attack and of the one before it in that combat), then the hook `eternia.attacked`.
 * @param {Actor} attacker
 * @param {ChatMessage} message
 */
async function recordAttack(attacker, message) {
  const combat = combatOf(attacker);
  if (!combat) return;
  const last = attacker.getFlag(SYSTEM_ID, "attacked");
  const same = last?.combat === combat.id;
  const previous = !same ? null : ((last.round === combat.round) ? (last.previous ?? null) : last.round);
  const record = { combat: combat.id, round: combat.round, previous };
  await attacker.setFlag(SYSTEM_ID, "attacked", record);
  /**
   * An actor declared an attack in a combat (a Decree that punishes two attacks in a row listens): `round` is now,
   * `previous` the round of the attack before it in the same combat (null if none). Only on the primary GM.
   * @param {Actor} attacker
   * @param {{message: ChatMessage, combat: string, round: number, previous: number|null}} context
   */
  Hooks.callAll("eternia.attacked", attacker, { message, ...record });
}

/** Whether an actor counts its hits: it has [Combo], or a Trait with `combo` (the Magia that builds it). */
function countsCombo(actor) {
  if (has(actor, "combo")) return true;
  return [...(actor?.allApplicableEffects?.() ?? [])].some(e => e.active && e.getFlag(SYSTEM_ID, "trait")?.combo);
}

/** Attack cards whose [Combo] was counted in this window (the card's flag keeps it for the others). */
const comboCounted = new Set();

/**
 * An attack card was made or changed (a character's Dodge Check): made, its attacker attacked (recordAttack); once
 * every target is resolved, its [Combo] grows when it hit anyone (1 by default; the skill's `comboGain`, times the
 * targets hit with `comboPerTarget`) and breaks when it hit no one. On the primary GM, once per card.
 * @param {ChatMessage} message
 * @param {boolean} created
 */
async function onAttackCard(message, created) {
  const data = message.getFlag(SYSTEM_ID, "attack");
  if (!data?.targets?.length || !rulesOn() || !isPrimaryGM()) return;
  const item = data.itemUuid ? await fromUuid(data.itemUuid).catch(() => null) : null;
  const attacker = item?.actor ?? ChatMessage.getSpeakerActor(message.speaker);
  if (!attacker) return;
  if (created) await recordAttack(attacker, message);
  if (!countsCombo(attacker)) return;
  if (data.targets.some(t => typeof t.hit !== "boolean")) return;
  if (comboCounted.has(message.id) || message.getFlag(SYSTEM_ID, "comboCounted")) return;
  comboCounted.add(message.id);
  await message.setFlag(SYSTEM_ID, "comboCounted", true);
  const hits = data.targets.filter(t => t.hit).length;
  const name = actorName(attacker);
  if (!hits) {
    if (rating(attacker, "combo") <= 0) return;
    await attacker.update({ "system.bad-status.combo": 0 });
    await postSummary(game.i18n.localize("ETERNIA.StatusEffect.combo"), [L("Conditions.ComboMissed", { name })]);
    return;
  }
  const gain = Math.max(1, toInt(item?.getFlag(SYSTEM_ID, "comboGain")) || 1) * (item?.getFlag(SYSTEM_ID, "comboPerTarget") ? hits : 1);
  await addStatus(attacker, "combo", gain);
  await postSummary(game.i18n.localize("ETERNIA.StatusEffect.combo"), [L("Conditions.ComboUp", { name, n: rating(attacker, "combo") })]);
}

/* -------------------------------------------- */
/*  Main Process and Cleanup                    */
/* -------------------------------------------- */

/** A combatant's Main Process starts: [Poisoned] and [Confused]. Runs on the primary GM. */
async function onMainProcessStart(combat, combatant) {
  const actor = combatant?.actor;
  if (!actor || actor.statuses.has("dead") || actor.statuses.has("incapacitated")) return;
  const poison = rating(actor, "poisoned");
  if (poison > 0) await takeDamage(actor, poison, { reason: "poisoned" });
  if (has(actor, "confused") && (actor.type === "character")) {
    const hate = toInt(actor._source.system.infos?.hate);
    await actor.update({ "system.infos.hate": hate + 1 });
    await postSummary(label("confused"), [L("Conditions.ConfusedHate", { name: actorName(actor), hate: hate + 1 })]);
  }
}

/**
 * The conditions of one actor in the Cleanup Process: [Burning] and [Doom], then the statuses that end with the
 * round. Called by automation/round.mjs for everyone in the combat.
 * @param {Actor} actor
 * @returns {Promise<string[]>}   Lines for the Cleanup summary
 */
export async function cleanupConditions(actor) {
  if (!rulesOn()) return [];
  const lines = [];
  const burn = rating(actor, "burning");
  if (burn > 0) {
    const result = await takeDamage(actor, burn, { reason: "burning", tag: "Flame", silent: true });
    if (result) lines.push(result.line);
  }
  const blackFlame = rating(actor, "blackFlame");
  if (blackFlame > 0) {
    const result = await takeDamage(actor, blackFlame, { reason: "blackFlame", tag: "Flame", silent: true });
    if (result) lines.push(result.line);
  }
  const nightmare = rating(actor, "nightmare");
  if (nightmare > 0) {
    const result = await takeDamage(actor, nightmare, { reason: "nightmare", silent: true });
    if (result) lines.push(result.line);
  }
  const doom = rating(actor, "doom");
  if (doom > 0) {
    const next = doom - 1;
    await actor.update({ "system.bad-status.doom": next });
    if (next <= 0) {
      if (!actor.statuses.has("incapacitated")) await actor.toggleStatusEffect("incapacitated", { active: true });
      lines.push(L("Conditions.DoomFalls", { name: actorName(actor) }));
    }
    else lines.push(L("Conditions.DoomCount", { name: actorName(actor), n: next }));
  }
  // [Contagion] hurts, then passes to the allies within 1 square (not the one caught in this same Cleanup)
  const contagion = rating(actor, "contagion");
  if ((contagion > 0) && !caughtNow(actor)) {
    const result = await takeDamage(actor, contagion, { reason: "contagion", silent: true });
    if (result) lines.push(result.line);
    lines.push(...await spreadContagion(actor, contagion));
  }
  const fuse = rating(actor, "fuse");
  if (fuse > 0) {
    await removeStatuses(actor, ["fuse"]);
    const result = await takeDamage(actor, fuse, { reason: "fuse", tag: "Flame", silent: true });
    if (result) lines.push(result.line);
  }
  const strike = await servantStrike(actor);
  if (strike) lines.push(strike.line);
  // Effects that feed whoever gave them (the Casulo das Trevas: conditions/souls.mjs)
  lines.push(...await cleanupFeeds(actor));
  // [The One] counts down: its Rating is the rounds it has left (the end of an extended one leaves [Fatigue]).
  const one = rating(actor, "theOne");
  if (one > 0) {
    await actor.update({ "system.bad-status.theOne": one - 1 });
    lines.push(L((one > 1) ? "Conditions.TheOneLasts" : "Conditions.TheOneEnds", { name: actorName(actor) }));
  }
  // [Afflicted] keeps the statuses it protects ([Frightened]); an infinite effect or a renewal, the ones it holds
  // (conditions/lasting.mjs).
  const afflicted = has(actor, "afflicted");
  const ending = await naturalEnd(actor, END_OF_ROUND.filter(id => has(actor, id) && !(afflicted && AFFLICTED_PROTECTS.includes(id))));
  if (ending.length) {
    await removeStatuses(actor, ending);
    lines.push(L("Conditions.RoundEnds", { name: actorName(actor), statuses: ending.map(label).join(", ") }));
  }
  return lines;
}

/**
 * [Servant]: the servant strikes the nearest enemy within SERVANT_REACH squares of its master's token (the other side
 * by disposition, not down): the Rating as direct damage, with the tag of the servant's effect (a shadow soldier's
 * [Blight]), through takeDamage.
 * @param {Actor} actor
 * @returns {Promise<{loss: number, line: string}|null>}
 */
async function servantStrike(actor) {
  const value = rating(actor, "servant");
  // The servant of a [Pacified] master hurts no one either.
  if ((value <= 0) || has(actor, "pacified")) return null;
  // The scene of the master's combat, not the one the GM is viewing
  const scene = combatOf(actor)?.scene ?? canvas?.scene ?? null;
  const token = !scene ? null
    : ((actor.token?.parent === scene) ? actor.token : (actor.getDependentTokens({ scenes: scene })[0] ?? null));
  const side = token?.disposition ?? 0;
  if (!token || !side) return null;
  const size = scene.grid?.size || 100;
  const squareOf = t => ({ i: Math.floor((t.y + ((t.height * size) / 2)) / size), j: Math.floor((t.x + ((t.width * size) / 2)) / size) });
  const at = squareOf(token);
  const [nearest] = scene.tokens.contents
    .filter(t => (t !== token) && t.actor && (t.disposition === -side)
      && !t.actor.statuses.has("incapacitated") && !t.actor.statuses.has("dead"))
    .map(t => {
      const p = squareOf(t);
      return { actor: t.actor, squares: Math.abs(p.i - at.i) + Math.abs(p.j - at.j) };
    })
    .filter(e => e.squares <= SERVANT_REACH)
    .sort((a, b) => a.squares - b.squares);
  if (!nearest) return null;
  const effect = statusEffects(actor, "servant")
    .sort((a, b) => toInt(b.getFlag(SYSTEM_ID, "statusData")?.value) - toInt(a.getFlag(SYSTEM_ID, "statusData")?.value))[0];
  const tag = effect?.getFlag(SYSTEM_ID, "statusData")?.tag ?? "";
  return takeDamage(nearest.actor, value, {
    what: L("Conditions.ServantStrike", { name: actorName(actor) }), from: actor, tag, silent: true
  });
}

/** Whose Main Process starts: the combatant set active by this update. */
function onUpdateCombat(combat, changes, options, userId) {
  if (!rulesOn() || !isPrimaryGM()) return;
  const active = foundry.utils.getProperty(changes, "flags.eternia.active");
  // A Main Process that already began this round (the tracker stepped back and forward again)
  if (!active || (combat.phase !== "main") || options?.eterniaRepeat?.start) return;
  const combatant = combat.combatants.get(active);
  onMainProcessStart(combat, combatant).catch(err => console.error(`${SYSTEM_ID} | Main Process conditions failed`, err));
}

/* -------------------------------------------- */
/*  Coming and going                            */
/* -------------------------------------------- */

/** Rating fields before an update, to see what reached a threshold or ended. */
function onPreUpdateActor(actor, changes, options) {
  if (!foundry.utils.hasProperty(changes, "system.bad-status")) return;
  const bad = actor._source.system?.["bad-status"] ?? {};
  options.eterniaConditions = { awakened: toInt(bad.awakened), impetus: toInt(bad.impetus), freezing: toInt(bad.freezing),
    fissured: toInt(bad.fissured) };
}

async function onUpdateActor(actor, changes, options, userId) {
  if (!rulesOn() || !isLocalChange(options, userId) || !options.eterniaConditions) return;
  const bad = actor._source.system?.["bad-status"] ?? {};
  const before = options.eterniaConditions;

  // [Awakened] and [Impetus] end (this very update clears them): [Fatigue] equal to their Rating (characters; not when
  // the update says so: a blow that lets the Impetus out for free).
  for (const id of ["awakened", "impetus"]) {
    const now = foundry.utils.getProperty(changes, `system.bad-status.${id}`);
    if ((now === undefined) || toInt(now) || !(before[id] > 0) || (actor.type !== "character") || options.eterniaNoFatigue) continue;
    // The Transcendent (a Human's last stage): its [Awakened] leaves no Fatigue
    if ((id === "awakened") && actor.items.some(i => i.getFlag("eternia", "special") === "transcend")) continue;
    const fatigue = toInt(actor._source.system.infos?.fatigue) + before[id];
    await actor.update({ "system.infos.fatigue": fatigue });
    await postSummary(label(id), [L(`Conditions.${(id === "awakened") ? "AwakenedEnds" : "ImpetusEnds"}`, { name: actorName(actor), n: before[id] })]);
  }

  // Thresholds of the stacks
  for (const [id, rule] of Object.entries(STACK_THRESHOLDS)) {
    const max = statusDefinition(id)?.stack ?? 0;
    const value = toInt(bad[id]);
    if (!max || (value < max) || (before[id] >= max)) continue;
    const updates = { [`system.bad-status.${id}`]: 0 };
    if (rule.breakBarrier) updates["system.bad-status.barrier"] = 0;
    await actor.update(updates);
    for (const to of rule.to) await addStatus(actor, to);
    await postSummary(label(id), [L(`Conditions.Threshold.${id}`, { name: actorName(actor) })]);
  }
}

/** A status comes: a swimmer doesn't catch [Burning]; [Sealed] without a skill seals the last one used. */
function onPreCreateEffect(effect, data, options, userId) {
  if ((userId !== game.user.id) || !rulesOn()) return;
  const actor = effect.parent;
  if (!(actor instanceof Actor)) return;
  const statusData = effect.getFlag(SYSTEM_ID, "statusData") ?? {};
  // Effects that give [Burning] (skills, chat links) don't take on a swimmer or a [Soaked] actor; the GM can still set
  // it in the sheet.
  const burns = (statusData.statusId === "burning") || effect.statuses?.has("burning");
  if (burns && PUTS_OUT_FIRE.some(id => has(actor, id))) return false;
  // A status that takes a whole turn, given during its bearer's own Main Process, lasts until the end of the next one.
  const ids = [...(effect.statuses ?? []), statusData.statusId].filter(Boolean);
  if (ids.some(id => END_OF_OWN_PROCESS.includes(id)) && (ids.some(id => WHOLE_TURN.includes(id)) || effect.getFlag(SYSTEM_ID, "nextTurn"))) {
    const key = ownProcessKey(actor);
    if (key) effect.updateSource({ [`flags.${SYSTEM_ID}.keepThrough`]: key });
  }
  if (!effect.statuses?.has("sealed") || statusData.tag) return;
  const skill = actor.getFlag(SYSTEM_ID, "lastSkill");
  if (!skill) return;
  effect.updateSource({
    name: `${label("sealed")} (${skill})`,
    [`flags.${SYSTEM_ID}.statusData`]: { ...statusData, statusId: "sealed", tag: skill }
  });
}

async function onCreateEffect(effect, options, userId) {
  const actor = effect.parent;
  if (!rulesOn() || !(actor instanceof Actor)) return;
  if (PUTS_OUT_FIRE.some(id => effect.statuses?.has(id)) && isLocalChange(options, userId) && has(actor, "burning")) {
    await removeStatuses(actor, ["burning"]);
  }
  // A source Incapacitated (by whoever applied the damage): what it holds ([Grappled]) or is bound to ([Bond]) is
  // freed, by the GM.
  if (effect.statuses?.has("incapacitated") && isPrimaryGM()) await freeFrom(actor);
}

/**
 * End the [Grappled], [Bond], [Black Flame] and [Petrified] that this actor gave, on every actor of the world and of
 * the scenes.
 */
async function freeFrom(source) {
  const actors = [...game.actors];
  for (const scene of game.scenes) for (const token of scene.tokens) if (!token.actorLink && token.actor) actors.push(token.actor);
  for (const actor of actors) {
    for (const id of ["grappled", "bond", "blackFlame", "petrified"]) {
      if (!has(actor, id) || !sourcesOf(actor, id).some(s => sameActor(s, source))) continue;
      await removeStatuses(actor, [id]);
      await postSummary(label(id), [L("Conditions.Freed", { name: actorName(actor), status: label(id), source: actorName(source) })]);
    }
  }
}

/** Call during the `init` hook. */
export function registerConditionTurns() {
  Hooks.on("updateCombat", onUpdateCombat);
  Hooks.on("preUpdateActor", onPreUpdateActor);
  Hooks.on("updateActor", (...args) => onUpdateActor(...args).catch(err => console.error(`${SYSTEM_ID} | Condition update failed`, err)));
  Hooks.on("preCreateActiveEffect", onPreCreateEffect);
  Hooks.on("createActiveEffect", (...args) => onCreateEffect(...args).catch(err => console.error(`${SYSTEM_ID} | Condition effect failed`, err)));
  Hooks.on("createChatMessage", message => onAttackCard(message, true).catch(err => console.error(`${SYSTEM_ID} | Combo failed`, err)));
  Hooks.on("updateChatMessage", message => onAttackCard(message, false).catch(err => console.error(`${SYSTEM_ID} | Combo failed`, err)));
}
