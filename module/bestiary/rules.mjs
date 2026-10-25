/**
 * The monster rules (docs/bestiario.md): what a monster's skills do besides their rolls, effects and the flags the
 * system already reads. A skill carries one rule in `flags.eternia.monster = { rule, ... }`:
 *   pack       { per, tag }     Passive. +per damage for each other creature of its side engaged with the target
 *                               (bestiary/pack.mjs, counted by the damage card).
 *   grow       { empowered, heal, at, size }  Its use: the monster grows one step (`flags.eternia.growth`): its
 *                               [Empowered] becomes `empowered` × the steps, it recovers `heal` HP and, from the step
 *                               `at`, its token takes `size` squares. The drop rows with `growth` drop once per step.
 *   threshold  { below, statuses: [{ statusId, value }] }  Passive. The first time its HP fall to `below` of the max
 *                               (0.5: half), still standing, it gets those statuses until the end of the scene.
 *   fall       { radius }       Passive. When it falls, the skill's damage hits every creature within `radius` squares
 *                               of it (a damage card, no Dodge Check), with the skill's hitStatuses.
 *   cleanse    { count }        Passive. In each Cleanup Process it ends `count` of its Bad Statuses.
 *   summon     { actors: [{ uuid, count }], radius }  Its use: those monsters come out next to it, in its combat, and
 *                               leave no drops (bestiary/spawn.mjs).
 * The rules run on the window that changed the monster (the GM's): the use of a skill (`eternia.skillUsed`), its HP,
 * its fall (Incapacitated) and the Cleanup Process of its combat.
 */
import { L, SYSTEM_ID } from "../settings.mjs";
import { isLocalChange, isPrimaryGM } from "../helpers/clients.mjs";
import { actorName, postSummary, toInt, wrap } from "../helpers/utils.mjs";
import { diceFormula } from "../helpers/dice.mjs";
import { statusDefinition } from "../helpers/statuses.mjs";
import { createDamageCard } from "../helpers/combat-cards.mjs";
import { takeHealing } from "../conditions/damage.mjs";
import { removeStatuses, rulesOn, sameActor, sourcesOf } from "../conditions/rules.mjs";
import { spawnNear } from "./spawn.mjs";

const label = id => game.i18n.localize(`ETERNIA.StatusEffect.${id}`);

/** The monster rule of a skill, or null. */
export const ruleOf = item => item?.getFlag?.(SYSTEM_ID, "monster") ?? null;

/** An actor's skills with a rule of this kind. */
const withRule = (actor, kind) => (actor?.items ?? []).filter(i => (i.type === "skill") && (ruleOf(i)?.rule === kind));

/** The token of an actor (a token actor's own, else its first active one on the viewed scene). */
function tokenOf(actor) {
  if (actor?.token) return actor.token;
  return actor?.getActiveTokens?.(false, true).find(t => t.parent === canvas?.scene) ?? actor?.getActiveTokens?.(false, true)[0] ?? null;
}

/** Give statuses to an actor, until the end of the scene, from a source. Returns their names ("Fúria 5"). */
async function giveStatuses(actor, list, from) {
  const names = [];
  for (const { statusId, value = null } of list ?? []) {
    if (!statusId) continue;
    const rated = !!statusDefinition(statusId)?.rated;
    await game.eternia.applyStatus(actor, statusId, { value: rated ? (toInt(value) || 1) : null, from });
    names.push(rated ? `${label(statusId)} ${toInt(value) || 1}` : label(statusId));
  }
  return names;
}

/* -------------------------------------------- */
/*  Growing                                     */
/* -------------------------------------------- */

/** The monster grows a step: [Empowered] by the steps, HP, the bigger token, and one more set of its growth drops. */
async function grow(actor, item) {
  const rule = ruleOf(item);
  const steps = toInt(actor.getFlag(SYSTEM_ID, "growth")) + 1;
  await actor.setFlag(SYSTEM_ID, "growth", steps);
  const lines = [];
  const per = toInt(rule.empowered);
  if (per > 0) {
    // One [Empowered] of the growth at a time, the new one with all the steps
    const old = actor.effects.filter(e => e.getFlag(SYSTEM_ID, "growthEffect")).map(e => e.id);
    if (old.length) await actor.deleteEmbeddedDocuments("ActiveEffect", old);
    const { statusEffectData } = await import("../chat/status-links.mjs");
    const effect = statusEffectData("empowered", per * steps, "", { caster: actor, expires: "endOfScene" });
    foundry.utils.setProperty(effect, `flags.${SYSTEM_ID}.growthEffect`, true);
    await actor.createEmbeddedDocuments("ActiveEffect", [effect]);
  }
  const healed = (toInt(rule.heal) > 0) ? await takeHealing(actor, toInt(rule.heal), { what: item.name, natural: true, silent: true }) : null;
  const size = toInt(rule.size);
  const token = tokenOf(actor);
  let bigger = false;
  if (token && size && (steps >= toInt(rule.at)) && (toInt(token.width) < size)) {
    await token.update({ width: size, height: size });
    bigger = true;
  }
  lines.push(L("Bestiary.Grow", { name: actorName(actor), n: steps, value: per * steps }));
  if (healed?.line) lines.push(healed.line);
  if (bigger) lines.push(L("Bestiary.Bigger", { name: actorName(actor) }));
  await postSummary(item.name, lines);
}

/* -------------------------------------------- */
/*  The threshold                               */
/* -------------------------------------------- */

/** HP changed: the thresholds it crossed, once each. */
async function checkThresholds(actor) {
  const hp = toInt(actor.system.health?.value);
  const max = toInt(actor.system.health?.max);
  if ((hp <= 0) || (max <= 0)) return;
  const crossed = actor.getFlag(SYSTEM_ID, "thresholds") ?? [];
  for (const item of withRule(actor, "threshold")) {
    const rule = ruleOf(item);
    if (crossed.includes(item.id) || (hp > Math.floor(max * (Number(rule.below) || 0.5)))) continue;
    crossed.push(item.id);
    await actor.setFlag(SYSTEM_ID, "thresholds", crossed);
    const names = await giveStatuses(actor, rule.statuses, actor);
    await postSummary(item.name, [L("Bestiary.Threshold", { name: actorName(actor), statuses: names.join(", ") })]);
  }
}

/* -------------------------------------------- */
/*  The fall                                    */
/* -------------------------------------------- */

/** The tokens within some squares of a token (from its edges), itself out, the dead out. */
function tokensAround(token, radius) {
  const size = token.parent.grid.size;
  const box = t => ({ x0: Math.round(t.x / size), y0: Math.round(t.y / size), x1: Math.round(t.x / size) + Math.max(1, toInt(t.width)) - 1, y1: Math.round(t.y / size) + Math.max(1, toInt(t.height)) - 1 });
  const a = box(token);
  return token.parent.tokens.filter(t => {
    if ((t === token) || !t.actor || t.actor.statuses.has("dead") || (t.actor.type === "pile")) return false;
    const b = box(t);
    const dx = Math.max(0, b.x0 - a.x1, a.x0 - b.x1), dy = Math.max(0, b.y0 - a.y1, a.y0 - b.y1);
    return Math.max(dx, dy) <= radius;
  });
}

/** A monster fell: its fall skills hit everyone around it (a damage card with them as the targets). */
async function onFall(actor) {
  const token = tokenOf(actor);
  if (!token) return;
  for (const item of withRule(actor, "fall")) {
    const rule = ruleOf(item);
    const around = tokensAround(token, Math.max(0, toInt(rule.radius)));
    if (!around.length) continue;
    const targets = around.map(t => ({ tokenUuid: t.uuid, actorUuid: t.actor.uuid, name: t.name, img: t.texture?.src ?? t.actor.img }));
    const damage = item.system.damage ?? {};
    const flavor = `${item.name} - ${game.i18n.localize("ETERNIA.Skill.Label.Damage")}`;
    await createDamageCard(item, actor, diceFormula({ dice: damage.dice, mod: damage.mod }), flavor, null, targets);
  }
}

/* -------------------------------------------- */
/*  The Cleanup                                 */
/* -------------------------------------------- */

/** The Cleanup Process of a combat: each monster that clears itself ends some of its Bad Statuses. */
async function cleanupCleanse(combat) {
  const seen = new Set();
  for (const combatant of combat.combatants) {
    const actor = combatant.actor;
    if (!actor || seen.has(actor.uuid) || actor.statuses.has("incapacitated") || actor.statuses.has("dead")) continue;
    seen.add(actor.uuid);
    for (const item of withRule(actor, "cleanse")) {
      // Not the ones it gave itself (the [Berserk] of its own threshold)
      const bad = [...actor.statuses].filter(id => (statusDefinition(id)?.group === "bad") && !(sourcesOf(actor, id).length
        && sourcesOf(actor, id).every(s => sameActor(s, actor))));
      const ids = bad.slice(0, Math.max(1, toInt(ruleOf(item).count) || 1));
      if (!ids.length) continue;
      await removeStatuses(actor, ids);
      await postSummary(item.name, [L("Bestiary.Cleanse", { name: actorName(actor), statuses: ids.map(label).join(", ") })]);
    }
  }
}

/* -------------------------------------------- */
/*  Hooks                                       */
/* -------------------------------------------- */

/** A skill was used (on the window of its user): grow, summon. */
async function onSkillUsed(item, { actor }) {
  const rule = ruleOf(item);
  if (!rule || !actor?.isOwner || (actor.type !== "monster")) return;
  if (rule.rule === "grow") await grow(actor, item);
  if (rule.rule === "summon") {
    const token = tokenOf(actor);
    const tokens = token ? await spawnNear(token, rule.actors ?? [], { radius: toInt(rule.radius) || 2, by: actor.uuid }) : [];
    if (tokens.length) await postSummary(item.name, [L("Bestiary.Summon", { name: actorName(actor), list: tokens.map(t => t.name).join(", ") })]);
  }
}

/** Call during the `init` hook. */
export function registerMonsterRules() {
  Hooks.on("eternia.skillUsed", (item, context) => onSkillUsed(item, context ?? {}).catch(err => console.error(`${SYSTEM_ID} | Monster rule failed`, err)));
  Hooks.on("updateActor", (actor, changes, options, userId) => {
    if ((actor.type !== "monster") || !isLocalChange(options, userId) || !foundry.utils.hasProperty(changes, "system.health")) return;
    checkThresholds(actor).catch(err => console.error(`${SYSTEM_ID} | Threshold failed`, err));
  });
  Hooks.on("createActiveEffect", (effect, options, userId) => {
    const actor = effect.parent;
    if (!(actor instanceof Actor) || (actor.type !== "monster") || !effect.statuses?.has("incapacitated") || !isPrimaryGM()) return;
    onFall(actor).catch(err => console.error(`${SYSTEM_ID} | Fall rule failed`, err));
  });
  wrap(CONFIG.Combat.documentClass.prototype, "_onPhaseStart", async function (original, phase, round, previous) {
    await original.call(this, phase, round, previous);
    const backwards = !!previous && (round < previous.round);
    if ((phase !== "cleanup") || backwards || !rulesOn()) return;
    await cleanupCleanse(this).catch(err => console.error(`${SYSTEM_ID} | Cleanse failed`, err));
  });
}
