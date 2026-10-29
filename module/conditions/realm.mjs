/**
 * A Realm (the Reino do Caos): the area around its caster follows a rule while the effect lasts.
 *
 * An effect on the caster with `flags.eternia.realm = { radius, enemies: [{ statusId, value }], allies: [...] }` gives
 * those statuses to the creatures within `radius` squares of the caster's token (counted like the attack cards): the
 * enemies (the other side by disposition) and the allies (the same side, the caster too). It acts when the effect
 * comes and again in every Setup Process while it lasts, with the caster up; no Dodge Check (the area is the caster's
 * world). The values are formulas of the caster, worked out each time. A status already there with that Rating or more
 * is left alone.
 * `notSelf: true` leaves the caster out of its own allies (the eyes that erase every magic around but their owner's);
 * `damage: { enemies, allies, tag }` (formulas of the caster) hurts each side that much, as direct damage, every time
 * the Realm acts (the death that pulses around the Artes Negras: the allies too).
 */
import { L, SYSTEM_ID } from "../settings.mjs";
import { isLocalChange } from "../helpers/clients.mjs";
import { actorName, combatActors, postSummary, toInt, wrap } from "../helpers/utils.mjs";
import { evaluateFormula, formulaData, isFormula } from "../helpers/effect-formulas.mjs";
import { statusDefinition } from "../helpers/statuses.mjs";
import { has, rating, rulesOn } from "./rules.mjs";
import { immunities } from "./effects.mjs";
import { takeDamage } from "./damage.mjs";

const label = id => game.i18n.localize(`ETERNIA.StatusEffect.${id}`);

/** The square a token stands on (its center), on its own scene's grid. */
function squareOf(token) {
  const size = token.parent?.grid?.size || 100;
  return {
    i: Math.floor((token.y + ((token.height * size) / 2)) / size),
    j: Math.floor((token.x + ((token.width * size) / 2)) / size)
  };
}

/** The caster's token on the scene of the combat (or the one on show), or null. */
function tokenOf(actor, scene) {
  if (actor.token && (!scene || (actor.token.parent === scene))) return actor.token;
  const tokens = actor.getActiveTokens(true, true);
  return tokens.find(t => !scene || (t.parent === scene)) ?? tokens[0] ?? null;
}

/**
 * The creatures a Realm reaches now: those within its radius of the caster's token, by side.
 * @param {Actor} caster
 * @param {number} radius
 * @param {Scene|null} scene
 * @returns {{enemies: Actor[], allies: Actor[]}}
 */
export function realmReach(caster, radius, scene = null, { self = true } = {}) {
  const out = { enemies: [], allies: [] };
  const own = tokenOf(caster, scene);
  if (!own) return out;
  const side = own.disposition;
  const at = squareOf(own);
  for (const token of own.parent.tokens) {
    const actor = token.actor;
    if (!actor || actor.statuses.has("dead")) continue;
    const p = squareOf(token);
    if ((Math.abs(p.i - at.i) + Math.abs(p.j - at.j)) > radius) continue;
    if (token === own) {
      if (self) out.allies.push(actor);
    }
    else if (side && (token.disposition === side)) out.allies.push(actor);
    else if (side && (token.disposition === -side)) out.enemies.push(actor);
  }
  return out;
}

/** Give a Realm's statuses to one creature. Returns the statuses given. */
async function giveRule(actor, list, caster, item) {
  const given = [];
  const immune = immunities(actor);
  for (const entry of list ?? []) {
    const id = entry?.statusId;
    if (!id || immune.has(id)) continue;
    const def = statusDefinition(id);
    const value = def?.rated ? Math.max(1, (isFormula(entry.value) ? evaluateFormula(entry.value, formulaData(caster, item)) : toInt(entry.value)) || 1) : null;
    if (has(actor, id) && (!value || (rating(actor, id) >= value))) continue;
    await game.eternia.applyStatus(actor, id, { value, from: caster });
    given.push(value ? `${label(id)} ${value}` : label(id));
  }
  return given;
}

/**
 * A Realm acts: its rule on everyone it reaches now. Returns the chat lines.
 * @param {Actor} caster
 * @param {ActiveEffect} effect
 * @param {Scene|null} scene
 * @returns {Promise<string[]>}
 */
async function applyRealm(caster, effect, scene = null) {
  const realm = effect.getFlag(SYSTEM_ID, "realm");
  if (!realm || caster.statuses.has("incapacitated") || caster.statuses.has("dead")) return [];
  const item = fromUuidSync(effect.getFlag(SYSTEM_ID, "source")?.itemUuid ?? "") ?? ((effect.parent instanceof Item) ? effect.parent : null);
  const reach = realmReach(caster, Math.max(0, toInt(realm.radius)), scene, { self: !realm.notSelf });
  const lines = [];
  for (const [side, list] of [["enemies", realm.enemies], ["allies", realm.allies]]) {
    if (!list?.length) continue;
    for (const actor of reach[side]) {
      const given = await giveRule(actor, list, caster, item);
      if (given.length) lines.push(L("Realm.Rule", { name: actorName(actor), statuses: given.join(", ") }));
    }
  }
  // The damage the Realm deals around (by side), as direct damage of the caster
  for (const side of ["enemies", "allies"]) {
    const value = realm.damage?.[side];
    if (!value) continue;
    const n = Math.max(0, (isFormula(value) ? evaluateFormula(value, formulaData(caster, item)) : toInt(value)) || 0);
    if (!n) continue;
    for (const actor of reach[side]) {
      if (actor === caster) continue;
      const hurt = await takeDamage(actor, n, { what: effect.name, from: caster, tag: realm.damage.tag ?? "", silent: true });
      if (hurt) lines.push(hurt.line);
    }
  }
  return lines;
}

/** The active Realms of an actor: its own effects and the passive ones of its skills (a monster's aura, bestiary/). */
const realmsOf = actor => [...(actor?.allApplicableEffects?.() ?? [])].filter(e => e.active && e.getFlag(SYSTEM_ID, "realm"));

/** The Setup Process of a round: every Realm of the combat acts again (not those of who is out of the fight: fallen,
 * gone, fled). */
async function setupRealms(combat) {
  const out = new Set(combat.combatants.filter(c => c.isDefeated).map(c => c.actor?.uuid));
  for (const caster of combatActors(combat)) {
    if (out.has(caster.uuid)) continue;
    for (const effect of realmsOf(caster)) {
      const lines = await applyRealm(caster, effect, combat.scene ?? null);
      if (lines.length) await postSummary(effect.name, lines);
    }
  }
}

/** A Realm comes: it acts at once, on the window that made it. */
async function onCreateEffect(effect, options, userId) {
  if (!isLocalChange(options, userId) || !rulesOn() || !effect.getFlag(SYSTEM_ID, "realm")) return;
  const actor = effect.parent;
  if (!(actor instanceof Actor)) return;
  const lines = await applyRealm(actor, effect, canvas?.scene ?? null);
  await postSummary(effect.name, lines.length ? lines : [L("Realm.Empty", { name: actorName(actor) })]);
}

/** Call during the `init` hook. */
export function registerRealm() {
  wrap(CONFIG.Combat.documentClass.prototype, "_onPhaseStart", async function (original, phase, round, previous) {
    await original.call(this, phase, round, previous);
    const backwards = !!previous && (round < previous.round);
    if ((phase !== "setup") || backwards || !rulesOn()) return;
    await setupRealms(this).catch(err => console.error(`${SYSTEM_ID} | Realm failed`, err));
  });
  Hooks.on("createActiveEffect", (...args) => onCreateEffect(...args).catch(err => console.error(`${SYSTEM_ID} | Realm failed`, err)));
}
