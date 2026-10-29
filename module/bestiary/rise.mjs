/**
 * The dead that rise (docs/bestiario.md): the body of a fallen creature gets up as a monster of the side that raised
 * it. Two monster rules, in `flags.eternia.monster` of a skill:
 *   rise   { uuid }                 Passive. Whoever falls by its blow (a damage card of it taking them to 0 HP) rises
 *                                   as that monster (its own kind by default) in the next Setup Process of the combat,
 *                                   unless they have HP again by then (the Shadow). The chat tells it when they fall.
 *   raise  { uuid, radius, bound }  Its use: every fallen creature within `radius` squares (4, counted like the attack
 *                                   cards), of either side, rises as that monster, its servant (the Necromancer's Raise
 *                                   the Dead); with `bound`, whoever it called or raised falls when it falls.
 * Rising: the body's token hides and the monster takes its square, in the combat, on the side of whoever raised it,
 * leaving no drops (bestiary/spawn.mjs), named after the body ("Sombra de Kenji"); the body is [Dead], for good, and
 * rises once. A character still [Dying] holds its body (automation/death.mjs): it doesn't rise while it lives, and one
 * marked by a riser rises in a later Setup if it dies. When the risen falls, or its token goes, the body is back on its
 * square and the risen's token hides; a character's body also shows again if the GM takes its [Dead] away. The marks: `rising = { uuid, by, combat, round }` on the token of who fell by a riser, `risen` (the risen's
 * token) on the body's token, `risenFrom` (the body's token) on the risen's. The rising runs on the GM: the Setup, the
 * use of the skill, the falls; the mark, on the window that applied the blow.
 */
import { L, SYSTEM_ID } from "../settings.mjs";
import { isLocalChange, isPrimaryGM } from "../helpers/clients.mjs";
import { actorName, postSummary, toInt, wrap } from "../helpers/utils.mjs";
import { rulesOn } from "../conditions/rules.mjs";
import { ruleOf } from "./rules.mjs";
import { spawnNear } from "./spawn.mjs";
import { isRift } from "./rifts.mjs";
import { isDying } from "../automation/death.mjs";

/** An actor's skills with a rule of this kind. */
const withRule = (actor, kind) => (actor?.items ?? []).filter(i => (i.type === "skill") && (ruleOf(i)?.rule === kind));

/** Whether a creature is down: 0 HP, Incapacitated or Dead. */
const isDown = actor => !!actor && ((toInt(actor.system?.health?.value) <= 0) || actor.statuses.has("incapacitated")
  || actor.statuses.has("dead"));

/** Whether a token can be a body that rises: a creature (not a pile nor a Rift) that hasn't risen yet. */
const isBody = token => !!token?.actor && (token.actor.type !== "pile") && !isRift(token.actor)
  && !token.getFlag(SYSTEM_ID, "risen") && !token.getFlag(SYSTEM_ID, "risenFrom");

/** The tokens of an actor (a token actor's own, else its active ones). */
const tokensOf = actor => (actor?.token ? [actor.token] : (actor?.getActiveTokens?.(false, true) ?? []));

/** The token of an actor (a token actor's own, else its first active one on the viewed scene). */
function tokenOf(actor) {
  const tokens = tokensOf(actor);
  return tokens.find(t => t.parent === canvas?.scene) ?? tokens[0] ?? null;
}

/** The started combat on a token's scene, or null. */
const combatOn = token => game.combats.find(c => c.started && (c.scene?.id === token?.parent?.id)) ?? null;

/** What a creature rises as: the rule's monster, else the riser's own kind (the compendium monster it came from). */
const riseUuid = (rule, actor) => rule?.uuid || actor?._stats?.compendiumSource || actor?.uuid || "";

/** The square a token stands on (its center). */
function squareOf(token) {
  const size = token.parent?.grid?.size || 100;
  return {
    i: Math.floor((token._source.y + ((token.height * size) / 2)) / size),
    j: Math.floor((token._source.x + ((token.width * size) / 2)) / size)
  };
}

/** The fallen bodies within some squares of a token (Manhattan, from the squares of their centers, like the cards). */
function fallenAround(token, radius) {
  const at = squareOf(token);
  return token.parent.tokens.filter(t => {
    // A character still [Dying] holds its body
    if ((t === token) || t.hidden || !isBody(t) || !isDown(t.actor) || isDying(t.actor)) return false;
    const p = squareOf(t);
    return (Math.abs(p.i - at.i) + Math.abs(p.j - at.j)) <= radius;
  });
}

/* -------------------------------------------- */
/*  Rising                                      */
/* -------------------------------------------- */

/**
 * A body rises as a monster: its token hides, the monster takes its square (in the combat, on the given side, named
 * after the body) and the body is [Dead]. GM only.
 * @param {TokenDocument} body
 * @param {string} uuid                    The monster it rises as
 * @param {object} [options]
 * @param {string} [options.by]            Who raised it (the risen's `calledBy`)
 * @param {number|null} [options.disposition]   Its side (the raiser's token)
 * @returns {Promise<TokenDocument|null>}   The risen's token
 */
export async function riseAs(body, uuid, { by = "", disposition = null } = {}) {
  if (!game.user.isGM || !uuid || !isBody(body)) return null;
  const [risen] = await spawnNear(body, [{ uuid, count: 1 }], { radius: 1, by });
  if (!risen) return null;
  const base = risen.actor?.prototypeToken?.name || risen.actor?.name || risen.name;
  const update = { x: body._source.x, y: body._source.y, name: L("Bestiary.RisenName", { as: base, name: body.name }),
    [`flags.${SYSTEM_ID}.risenFrom`]: body.uuid };
  if (Number.isInteger(disposition) && (disposition !== risen.disposition)) update.disposition = disposition;
  await risen.update(update, { animate: false });
  await body.update({ hidden: true, [`flags.${SYSTEM_ID}.risen`]: risen.uuid, [`flags.${SYSTEM_ID}.-=rising`]: null });
  if (body.actor && !body.actor.statuses.has("dead")) await body.actor.toggleStatusEffect("dead", { active: true });
  return risen;
}

/** A risen fell, or its token went: the body is back on its square, and the risen's token hides. GM only. */
async function bodyBack(risen, { gone = false } = {}) {
  const uuid = risen.getFlag(SYSTEM_ID, "risenFrom");
  const body = uuid ? fromUuidSync(uuid, { strict: false }) : null;
  if (!(body instanceof TokenDocument) || !body.hidden) return;
  await body.update({ x: risen._source.x, y: risen._source.y, hidden: false }, { animate: false });
  if (!gone) await risen.update({ hidden: true });
  await postSummary(risen.name, [L("Bestiary.BodyBack", { risen: risen.name, name: body.name })]);
}

/* -------------------------------------------- */
/*  rise: who falls by its blow                 */
/* -------------------------------------------- */

/** A damage card took a creature to 0 HP (on the window that applied it): fallen by a riser, it will rise. */
async function onDefeated(actor, card) {
  if (!rulesOn() || !card?.attackerUuid) return;
  const tokenAt = t => (t?.tokenUuid ? fromUuidSync(t.tokenUuid, { strict: false }) : null);
  const target = (card.targets ?? []).find(t => (t.actorUuid === actor.uuid) || (tokenAt(t)?.actor === actor));
  const token = tokenAt(target) ?? tokenOf(actor);
  if (!(token instanceof TokenDocument) || !token.isOwner || !isBody(token)) return;
  const attacker = fromUuidSync(card.attackerUuid, { strict: false });
  const skill = withRule(attacker, "rise")[0];
  // The last blow decides: fallen by another, it no longer rises
  if (!skill) {
    if (token.getFlag(SYSTEM_ID, "rising")) await token.unsetFlag(SYSTEM_ID, "rising");
    return;
  }
  const combat = combatOn(token);
  if (!combat) return;
  const uuid = riseUuid(ruleOf(skill), attacker);
  await token.setFlag(SYSTEM_ID, "rising", { uuid, by: attacker.uuid, combat: combat.id, round: combat.round });
  const as = fromUuidSync(uuid, { strict: false })?.name ?? actorName(attacker);
  await postSummary(skill.name, [L("Bestiary.Rising", { name: token.name, by: actorName(attacker), as })]);
}

/** HP back (on the window that healed): whoever was going to rise no longer does. */
async function onHealed(actor) {
  for (const token of tokensOf(actor).filter(t => t.getFlag(SYSTEM_ID, "rising") && t.isOwner)) {
    await token.unsetFlag(SYSTEM_ID, "rising");
    await postSummary(token.name, [L("Bestiary.RiseSaved", { name: token.name })]);
  }
}

/** The Setup Process of a combat: who fell by a riser in an earlier round, and is still down, rises. */
async function setupRise(combat, round) {
  const lines = [];
  for (const token of combat.scene?.tokens.filter(t => t.getFlag(SYSTEM_ID, "rising")?.combat === combat.id) ?? []) {
    const mark = token.getFlag(SYSTEM_ID, "rising");
    if (toInt(mark.round) >= round) continue;
    if (token.hidden || !isBody(token) || !isDown(token.actor)) {
      await token.unsetFlag(SYSTEM_ID, "rising");
      continue;
    }
    // A character still [Dying] holds its body: it rises only once dead
    if (isDying(token.actor)) continue;
    const raiser = fromUuidSync(mark.by, { strict: false });
    const risen = await riseAs(token, mark.uuid, { by: mark.by, disposition: tokenOf(raiser)?.disposition ?? null });
    if (risen) lines.push(L("Bestiary.Rose", { name: token.name, as: risen.name }));
  }
  if (lines.length) await postSummary(L("Bestiary.RiseTitle"), lines);
}

/* -------------------------------------------- */
/*  raise: the fallen around it                 */
/* -------------------------------------------- */

/** The raise skill was used: every fallen creature around the user rises as its servant. */
async function raiseDead(actor, item) {
  const rule = ruleOf(item);
  const token = tokenOf(actor);
  if (!token) return;
  const radius = Math.max(0, toInt(rule.radius ?? 4));
  const uuid = riseUuid(rule, actor);
  const lines = [];
  for (const body of fallenAround(token, radius)) {
    const risen = await riseAs(body, uuid, { by: actor.uuid, disposition: token.disposition });
    if (risen) lines.push(L("Bestiary.Rose", { name: body.name, as: risen.name }));
  }
  await postSummary(item.name, lines.length ? lines : [L("Bestiary.RaiseNone", { name: actorName(actor), n: radius })]);
}

/** A raiser bound to its dead fell: whoever it called or raised falls with it. GM only. */
async function boundFall(actor) {
  const skill = withRule(actor, "raise").find(i => ruleOf(i).bound) ?? withRule(actor, "summon").find(i => ruleOf(i).bound);
  const scene = skill ? tokenOf(actor)?.parent : null;
  if (!scene) return;
  const dead = scene.tokens.filter(t => (t.getFlag(SYSTEM_ID, "calledBy") === actor.uuid) && !t.hidden && t.actor && !isDown(t.actor));
  for (const t of dead) {
    await t.actor.update({ "system.health.value": 0 });
    if (!t.actor.statuses.has("incapacitated")) await t.actor.toggleStatusEffect("incapacitated", { active: true });
  }
  if (dead.length) await postSummary(skill.name, [L("Bestiary.BoundFall", { name: actorName(actor), list: dead.map(t => t.name).join(", ") })]);
}

/* -------------------------------------------- */
/*  Hooks                                       */
/* -------------------------------------------- */

/** Call during the `init` hook. */
export function registerRise() {
  const fail = what => err => console.error(`${SYSTEM_ID} | ${what} failed`, err);
  Hooks.on("eternia.defeated", (actor, card) => onDefeated(actor, card).catch(fail("Rise mark")));
  Hooks.on("updateActor", (actor, changes, options, userId) => {
    if (!isLocalChange(options, userId) || !foundry.utils.hasProperty(changes, "system.health.value")) return;
    if (toInt(actor.system.health?.value) > 0) onHealed(actor).catch(fail("Rise mark"));
  });
  Hooks.on("eternia.skillUsed", (item, { actor } = {}) => {
    if ((ruleOf(item)?.rule !== "raise") || !actor?.isOwner || !game.user.isGM) return;
    raiseDead(actor, item).catch(fail("Raise"));
  });
  // A fall: a risen's body is back; a raiser bound to its dead takes them along
  Hooks.on("createActiveEffect", effect => {
    const actor = effect.parent;
    if (!(actor instanceof Actor) || !effect.statuses?.has("incapacitated") || !isPrimaryGM()) return;
    for (const token of tokensOf(actor).filter(t => t.getFlag(SYSTEM_ID, "risenFrom"))) bodyBack(token).catch(fail("Body back"));
    boundFall(actor).catch(fail("Bound fall"));
  });
  Hooks.on("deleteToken", token => {
    if (token.getFlag(SYSTEM_ID, "risenFrom") && isPrimaryGM()) bodyBack(token, { gone: true }).catch(fail("Body back"));
  });
  // A character whose [Dead] the GM took away: its body shows again, and may rise again
  Hooks.on("deleteActiveEffect", effect => {
    const actor = effect.parent;
    if (!(actor instanceof Actor) || (actor.type !== "character") || !effect.statuses?.has("dead") || !isPrimaryGM()) return;
    for (const token of tokensOf(actor).filter(t => t.getFlag(SYSTEM_ID, "risen"))) {
      token.update({ hidden: false, [`flags.${SYSTEM_ID}.-=risen`]: null }).catch(fail("Body back"));
    }
  });
  // A combat that ends: the falls in it no longer rise
  Hooks.on("deleteCombat", combat => {
    if (!isPrimaryGM()) return;
    for (const token of combat.scene?.tokens.filter(t => t.getFlag(SYSTEM_ID, "rising")?.combat === combat.id) ?? []) {
      token.unsetFlag(SYSTEM_ID, "rising").catch(() => null);
    }
  });
  wrap(CONFIG.Combat.documentClass.prototype, "_onPhaseStart", async function (original, phase, round, previous) {
    await original.call(this, phase, round, previous);
    const backwards = !!previous && (round < previous.round);
    if ((phase === "setup") && !backwards && rulesOn()) await setupRise(this, round).catch(fail("Rise"));
  });
}
