/**
 * The Decrees (the Magia Mandamentos, docs/condicoes.md): a law around its bearer that holds for everyone. Whoever
 * breaks it within its reach is cursed at once, with a line in the chat.
 *
 * A bearer's Decrees are its active effects with `flags.eternia.decree` (the passive effect of a Mandamento skill:
 * "amor", "verdade"…; "all": the ten, the supreme spell Os Dez Mandamentos). They only hold while the bearer fights in
 * a started combat (and is not Incapacitated), over the tokens of that combat's scene.
 * - Who they catch: the bearer's enemies, always; its allies (same token disposition) and the bearer itself only with
 *   the Tabu on (an active effect with `decreeTabu`: the Magia's Tabu, in combat). Never whoever carries a Decree of
 *   its own, nor an actor with a Trait with `decreeImmune` (the Magia's Trait, the Caos's); `decreeSelfImmune` (Os Dez
 *   Mandamentos) keeps the bearer out of its own.
 * - The reach: 4 squares (counted like the attack cards), or the highest `decreeReach` of the bearer's effects
 *   (Revelar o Mandamento: 6), times the highest `decreeReachMult` (Forma de Assalto: 2). `decreeDamage` (a formula
 *   of the bearer, "@cr": Revelar) is direct damage whoever breaks it also takes.
 * - `decreeRounds` on an effect counts its rounds down in each Cleanup Process and ends it at 0 (Os Dez Mandamentos:
 *   until the end of the next round).
 *
 * The ten Decrees, what breaks them and the curse (the values are the bearer's: NP = its CR):
 *   amor       deals damage to the bearer (a damage card: eternia.damaged)                  [Pacified]
 *   verdade    leaves the engagement with the bearer: its token moves out of the bearer's square (not a forced
 *              move: a pull, a push, a switch)                                              [Petrified]
 *   devocao    engaged with the bearer, attacks others and not the bearer (eternia.attack) [Dominated] by the bearer
 *   pacifismo  takes a creature to 0 HP (eternia.defeated)                                  [Doom: 3]
 *   paciencia  recovers HP or gets rid of a Bad Status (eternia.recovered, eternia.freed)   [Agony: NP]
 *   repouso    attacks in two rounds in a row (eternia.attacked)                            [Sealed] on that skill
 *   silencio   uses a reaction: Instant, Before / After Check, Damage Roll, Before / After Damage (eternia.skillUsed)
 *                                                                                          [Silenced]
 *   pureza     attacks a [Prone], [Grappled], [Paralyzed], [Asleep] or [Petrified] target (eternia.attack) [Poisoned: NP]
 *   desapego   has two Combat Statuses or more (gets the second bonus)                      [Amnesia]; loses them all
 *   fe         ends its Main Process without having attacked that round (eternia.processEnd) [Blinded], [Burning: NP÷2 + 2]
 * A curse that ends at the end of the breaker's own Main Process, given during that Main Process, lasts through the
 * next one (`flags.eternia.nextTurn`, conditions/turns.mjs). Every curse carries `flags.eternia.decreeCurse = { by, decree }`: a spell's `bonusVs` entry with `decreeOf` hits
 * harder whoever is under a curse of its caster (the Magia's Trait), and Mandamento Materializado gives on a hit the
 * curses of its caster's own Decrees (`flags.eternia.decreeCurse` on the spell, helpers/magic-traits.mjs).
 *
 * The client that sees a Decree broken (the one that applied the damage, made the attack card, moved the token, ended
 * the Main Process…) asks the GM, who gives the curse (a socket request). An attack is an attack card (the record of
 * conditions/turns.mjs, flags.eternia.attacked).
 */
import { L, SYSTEM_ID } from "../settings.mjs";
import { isLocalChange, isPrimaryGM } from "../helpers/clients.mjs";
import { actorName, combatActors, combatOf, postSummary, toInt } from "../helpers/utils.mjs";
import { evaluateFormula, formulaData, isFormula } from "../helpers/effect-formulas.mjs";
import { parseSkillField } from "../helpers/skill-fields.mjs";
import { statusDefinition } from "../helpers/statuses.mjs";
import { registerHandler, request } from "../piles/pile-socket.mjs";
import { END_OF_OWN_PROCESS } from "./catalog.mjs";
import { takeDamage } from "./damage.mjs";
import { has, removeStatuses, rulesOn, sameActor } from "./rules.mjs";

/** The ten Decrees. */
export const DECREES = ["amor", "verdade", "devocao", "pacifismo", "paciencia", "repouso", "silencio", "pureza", "desapego", "fe"];

/** The curse of each Decree: statuses, with values of the bearer (formulas); `skill`: the tag is the skill used. */
const CURSES = {
  amor: [{ statusId: "pacified" }],
  verdade: [{ statusId: "petrified" }],
  devocao: [{ statusId: "dominated" }],
  pacifismo: [{ statusId: "doom", value: 3 }],
  paciencia: [{ statusId: "agony", value: "@cr" }],
  repouso: [{ statusId: "sealed", skill: true }],
  silencio: [{ statusId: "silenced" }],
  pureza: [{ statusId: "poisoned", value: "@cr" }],
  desapego: [{ statusId: "amnesia" }],
  fe: [{ statusId: "blinded" }, { statusId: "burning", value: "floor(@cr/2)+2" }]
};

/** How far a Decree reaches (squares). */
const REACH = 4;

/** Targets a Decree of Purity forbids to attack. */
const DEFENSELESS = ["prone", "grappled", "paralyzed", "asleep", "petrified"];

/** The Timings of the reactions (a Decree of Silence). */
const REACTIONS = new Set(["Instant", "Before Check", "After Check", "Damage Roll", "Before Damage", "After Damage"]);

/** A Decree broken again by the same one within this time (ms) is the same event (an area that hurts twice…). */
const DEBOUNCE = 2000;

const label = id => game.i18n.localize(`ETERNIA.StatusEffect.${id}`);
const flag = (effect, key) => effect.getFlag?.(SYSTEM_ID, key) ?? effect.flags?.[SYSTEM_ID]?.[key];

/** The name of a Decree ("Mandamento do Amor"). */
export const decreeName = id => L(`Decree.Name.${id}`);

/* -------------------------------------------- */
/*  Who holds what                              */
/* -------------------------------------------- */

/** The active effects of an actor, its items' passive ones included. */
const activeEffects = actor => [...(actor?.allApplicableEffects?.() ?? actor?.effects ?? [])].filter(e => e.active);

/** Whether an actor has an active effect with this flag. */
const flagged = (actor, key) => activeEffects(actor).some(e => !!flag(e, key));

/**
 * The Decrees an actor enforces (its active effects with `decree`; "all" is the ten).
 * @param {Actor} actor
 * @returns {Set<string>}
 */
export function decreesOf(actor) {
  const out = new Set();
  for (const effect of activeEffects(actor)) {
    const id = flag(effect, "decree");
    if (id === "all") DECREES.forEach(d => out.add(d));
    else if (DECREES.includes(id)) out.add(id);
  }
  return out;
}

/** The Decrees an actor carries for good: its Mandamentos (not the ten of the supreme spell). */
export function ownDecrees(actor) {
  return [...new Set(activeEffects(actor).map(e => flag(e, "decree")).filter(id => DECREES.includes(id)))];
}

/** Whether an actor is out of other bearers' Decrees: it carries a Decree, or a Trait makes it immune (`decreeImmune`). */
function warded(actor) {
  return activeEffects(actor).some(e => !!flag(e, "decree") || !!flag(e, "trait")?.decreeImmune);
}

/** How far a bearer's Decrees reach: 4 squares, the highest `decreeReach`, times the highest `decreeReachMult`. */
export function reachOf(bearer) {
  let reach = REACH;
  let mult = 1;
  for (const effect of activeEffects(bearer)) {
    reach = Math.max(reach, toInt(flag(effect, "decreeReach")));
    mult = Math.max(mult, Number(flag(effect, "decreeReachMult")) || 0);
  }
  return reach * mult;
}

/** The token of an actor on a scene (a token actor's own, else a linked token of it), or null. */
function tokenOn(scene, actor) {
  if (!scene || !actor) return null;
  if (actor.isToken) return (actor.token?.parent === scene) ? actor.token : null;
  return scene.tokens.find(t => t.actorLink && (t.actorId === actor.id)) ?? null;
}

/** Where a token stands: its source position (TokenDocument#x keeps the old place while a move animates). */
const placeOf = t => ({ x: t._source?.x ?? t.x, y: t._source?.y ?? t.y });

/**
 * Squares between two tokens of a scene, counted like the attack cards (from the square each center is in, a diagonal
 * counts 2); off a square grid, by the larger of the two distances.
 * @param {TokenDocument} a
 * @param {TokenDocument} b
 * @param {{x: number, y: number}} [at]   Where `b` stands instead (before a move)
 * @returns {number}
 */
function squares(a, b, at = null) {
  const grid = a.parent?.grid;
  const size = grid?.size || 100;
  const center = (t, p) => ({ x: p.x + ((Number(t.width) || 1) * size) / 2, y: p.y + ((Number(t.height) || 1) * size) / 2 });
  const p = center(a, placeOf(a));
  const q = center(b, at ?? placeOf(b));
  if (grid?.getOffset && (grid.type === CONST.GRID_TYPES.SQUARE)) {
    const i = grid.getOffset(p);
    const j = grid.getOffset(q);
    return Math.abs(i.i - j.i) + Math.abs(i.j - j.j);
  }
  return Math.round(Math.max(Math.abs(p.x - q.x), Math.abs(p.y - q.y)) / size);
}

/** Whether a bearer's Decree catches this actor (the sides, the Tabu, the wards); not where it stands. */
function catches(bearer, breaker, bearerToken = null, breakerToken = null) {
  if (!breaker || breaker.statuses?.has("dead")) return false;
  if (sameActor(bearer, breaker)) return flagged(bearer, "decreeTabu") && !flagged(bearer, "decreeSelfImmune");
  if (warded(breaker)) return false;
  const allies = (bearerToken && breakerToken) ? (bearerToken.disposition === breakerToken.disposition)
    : (bearer.type === breaker.type);
  return !allies || flagged(bearer, "decreeTabu");
}

/**
 * The bearers whose Decree catches this actor now: they fight in a started combat, are not down, enforce the Decree,
 * and the actor's token is within their reach on that combat's scene.
 * @param {Actor} breaker
 * @param {string} decree
 * @param {object} [options]
 * @param {{x: number, y: number}} [options.from]  Where the breaker's token stood (before a move)
 * @returns {{bearer: Actor, squares: number}[]}
 */
export function bearersFor(breaker, decree, { from = null } = {}) {
  if (!rulesOn() || !breaker) return [];
  const found = new Map();
  for (const combat of game.combats ?? []) {
    if (!combat.started) continue;
    const scene = combat.scene ?? canvas?.scene ?? null;
    const theirs = tokenOn(scene, breaker);
    if (!theirs) continue;
    for (const bearer of combatActors(combat)) {
      if (found.has(bearer.uuid) || bearer.statuses.has("incapacitated") || bearer.statuses.has("dead")) continue;
      if (!decreesOf(bearer).has(decree)) continue;
      const mine = tokenOn(scene, bearer);
      if (!mine) continue;
      const distance = squares(mine, theirs, from);
      if ((distance > reachOf(bearer)) || !catches(bearer, breaker, mine, theirs)) continue;
      found.set(bearer.uuid, { bearer, squares: distance });
    }
  }
  return [...found.values()];
}

/** The Combat Statuses an actor has (its bonuses). */
const bonusesOf = actor => [...(actor?.statuses ?? [])].filter(id => statusDefinition(id)?.group === "combat");

/* -------------------------------------------- */
/*  Breaking a Decree                           */
/* -------------------------------------------- */

/**
 * A Decree was broken: the GM gives the breaker the curse (and the bearer's `decreeDamage`). Returns the chat line.
 * @param {Actor} bearer
 * @param {Actor} breaker
 * @param {string} decree
 * @param {object} [options]
 * @param {string} [options.skill]   The skill used (the Decree of Rest seals it)
 * @returns {Promise<string|null>}
 */
export async function breakDecree(bearer, breaker, decree, { skill = "" } = {}) {
  if (!bearer || !breaker) return null;
  const result = await request("decreeBreak", { bearerUuid: bearer.uuid, breakerUuid: breaker.uuid, decree, skill });
  return result?.ok ? (result.line ?? null) : null;
}

/** The actor of a uuid (a token's uuid gives its actor), or null. */
async function actorOf(uuid) {
  const doc = uuid ? await fromUuid(uuid).catch(() => null) : null;
  const actor = (doc instanceof TokenDocument) ? doc.actor : doc;
  return (actor instanceof Actor) ? actor : null;
}

/** When a Decree was last broken by whom (GM side): bearer|breaker|decree -> time. */
const recent = new Map();

/** GM side of breakDecree: the Decree must still hold on the bearer, in combat, and catch the breaker. */
async function onBreakRequest({ bearerUuid, breakerUuid, decree, skill }) {
  const bearer = await actorOf(bearerUuid);
  const breaker = await actorOf(breakerUuid);
  if (!bearer || !breaker || !DECREES.includes(decree) || !decreesOf(bearer).has(decree)) return { ok: false };
  const combat = combatOf(bearer);
  const scene = combat?.scene ?? canvas?.scene ?? null;
  if (!combat || !catches(bearer, breaker, tokenOn(scene, bearer), tokenOn(scene, breaker))) return { ok: false };
  const key = `${bearer.uuid}|${breaker.uuid}|${decree}`;
  if ((Date.now() - (recent.get(key) ?? 0)) < DEBOUNCE) return { ok: true, line: null };
  recent.set(key, Date.now());
  return { ok: true, line: await curse(bearer, breaker, decree, { skill: String(skill ?? "").slice(0, 120) }) };
}

/**
 * The data of a curse effect on the breaker: the status with its value (a formula of the bearer), the bearer as its
 * source, and the marks of the Decree.
 * @param {object} entry     One of CURSES
 * @param {Actor} bearer
 * @param {string} decree
 * @param {object} [options]
 * @param {string} [options.skill]
 */
function curseEffect(entry, bearer, decree, { skill = "" } = {}) {
  const value = isFormula(entry.value) ? Math.max(1, evaluateFormula(entry.value, formulaData(bearer, null)) ?? 1)
    : (toInt(entry.value) || null);
  const tag = entry.skill ? skill : "";
  const statusData = { statusId: entry.statusId, ...(value ? { value } : {}), ...(tag ? { tag } : {}) };
  const status = CONFIG.statusEffects.find(s => s.id === entry.statusId);
  return {
    name: `${label(entry.statusId)}${tag ? ` (${tag})` : ""}${value ? `: ${value}` : ""}`,
    img: status?.img ?? "icons/svg/aura.svg",
    statuses: [entry.statusId],
    transfer: false,
    disabled: false,
    flags: {
      [SYSTEM_ID]: {
        statusData, expires: "endOfScene", itemUse: true,
        source: { itemUuid: "", itemName: decreeName(decree), casterUuid: bearer.uuid, useId: foundry.utils.randomID() },
        decreeCurse: { by: bearer.uuid, decree },
        // Given during the breaker's own Main Process, it lasts through the next one (conditions/turns.mjs)
        ...(END_OF_OWN_PROCESS.includes(entry.statusId) ? { nextTurn: true } : {})
      }
    }
  };
}

/**
 * The curse of a broken Decree (on the GM): the Decree of Detachment first takes the bonuses; the statuses (those the
 * breaker is immune to don't take); the bearer's `decreeDamage`. Posts the line and returns it.
 * @param {Actor} bearer
 * @param {Actor} breaker
 * @param {string} decree
 * @param {{skill: string}} options
 * @returns {Promise<string>}
 */
async function curse(bearer, breaker, decree, { skill }) {
  const name = decreeName(decree);
  const parts = [];
  if (decree === "desapego") {
    const bonuses = bonusesOf(breaker);
    if (bonuses.length) {
      await removeStatuses(breaker, bonuses);
      parts.push(L("Decree.Bonuses", { statuses: bonuses.map(label).join(", ") }));
    }
  }
  const effects = CURSES[decree].map(entry => curseEffect(entry, bearer, decree, { skill }));
  const created = (await breaker.createEmbeddedDocuments("ActiveEffect", effects)) ?? [];
  parts.unshift(created.length ? created.map(e => e.name).join(", ") : L("Decree.Immune"));
  // Revelar o Mandamento: whoever breaks it also takes direct damage
  const damage = activeEffects(bearer).reduce((most, e) => {
    const value = flag(e, "decreeDamage");
    const n = isFormula(value) ? (evaluateFormula(value, formulaData(bearer, e.parent instanceof Item ? e.parent : null)) ?? 0) : toInt(value);
    return Math.max(most, n);
  }, 0);
  const lines = [L("Decree.Broken", { name: actorName(breaker), decree: name, bearer: actorName(bearer), curse: parts.join(" · ") })];
  if (damage > 0) {
    const hit = await takeDamage(breaker, damage, { what: name, from: bearer, silent: true });
    if (hit) lines.push(hit.line);
  }
  await postSummary(name, lines);
  return lines[0];
}

/* -------------------------------------------- */
/*  What breaks them                            */
/* -------------------------------------------- */

/** Break a Decree for every bearer it catches the breaker for. */
async function breakAll(breaker, decree, { from = null, skill = "", only = null } = {}) {
  for (const { bearer } of bearersFor(breaker, decree, { from })) {
    if (only && !only(bearer)) continue;
    await breakDecree(bearer, breaker, decree, { skill });
  }
}

/** Love: whoever deals damage to its bearer. */
function onDamaged(actor, card, { amount = 0, absorbed = 0, attacker = null } = {}) {
  if (!attacker || card?.recovery || ((amount <= 0) && (absorbed <= 0))) return;
  breakAll(attacker, "amor", { only: bearer => sameActor(bearer, actor) })
    .catch(err => console.error(`${SYSTEM_ID} | Decree of Love failed`, err));
}

/** Pacifism: whoever takes a creature to 0 HP. */
function onDefeated(actor, card) {
  const attacker = card?.attackerUuid ? fromUuidSync(card.attackerUuid) : null;
  const breaker = (attacker instanceof TokenDocument) ? attacker.actor : attacker;
  if (!(breaker instanceof Actor)) return;
  breakAll(breaker, "pacifismo").catch(err => console.error(`${SYSTEM_ID} | Decree of Pacifism failed`, err));
}

/** Patience: whoever recovers HP or gets rid of a Bad Status (conditions/damage.mjs: eternia.recovered, eternia.freed). */
function onRelief(actor) {
  if (!actor) return;
  breakAll(actor, "paciencia").catch(err => console.error(`${SYSTEM_ID} | Decree of Patience failed`, err));
}

/** Silence: a skill used as a reaction (automation/use.mjs: eternia.skillUsed). */
async function onSkillUsed(item, { actor = item?.actor } = {}) {
  if (!rulesOn() || !actor || (item?.type !== "skill")) return;
  if (REACTIONS.has(parseSkillField("timing", item.system.timing).type)) await breakAll(actor, "silencio");
}

/**
 * An attack was declared (an attack card, on the attacker's client: eternia.attack): Devotion (engaged with the bearer,
 * it attacks others and not the bearer) and Purity (one of its targets is defenseless).
 * @param {ChatMessage} message
 * @param {{item: Item, attacker: Actor|null, targets: Actor[]}} context
 */
async function onAttack(message, { item = null, attacker = null, targets = [] } = {}) {
  const actor = attacker ?? item?.actor;
  if (!rulesOn() || !actor) return;
  const others = (targets ?? []).filter(t => t && !sameActor(t, actor));
  if (!others.length) return;
  await breakAll(actor, "devocao", { only: bearer => !others.some(t => sameActor(t, bearer)) && engaged(bearer, actor) });
  if (others.some(t => DEFENSELESS.some(id => has(t, id)))) await breakAll(actor, "pureza");
}

/**
 * Rest: an attack the round right after another one (conditions/turns.mjs: eternia.attacked, on the primary GM). The
 * curse seals the skill of that attack.
 * @param {Actor} attacker
 * @param {{message: ChatMessage, round: number, previous: number|null}} context
 */
function onAttacked(attacker, { message = null, round = 0, previous = null } = {}) {
  if (!attacker || (previous === null) || (previous !== (round - 1))) return;
  const uuid = message?.getFlag?.(SYSTEM_ID, "attack")?.itemUuid;
  const skill = (uuid ? fromUuidSync(uuid)?.name : "") ?? "";
  breakAll(attacker, "repouso", { skill }).catch(err => console.error(`${SYSTEM_ID} | Decree of Rest failed`, err));
}

/**
 * Faith: a Main Process ended without an attack that round (conditions/turns.mjs: eternia.processEnd, on the window
 * that ended it); not a Main Process lost to a status.
 * @param {Actor} actor
 * @param {Combat} combat
 * @param {{attacked: boolean, lost: boolean}} context
 */
function onProcessEnd(actor, combat, { attacked = false, lost = false } = {}) {
  if (!actor || attacked || lost || actor.statuses.has("incapacitated") || actor.statuses.has("dead")) return;
  breakAll(actor, "fe").catch(err => console.error(`${SYSTEM_ID} | Decree of Faith failed`, err));
}

/** Whether two actors stand in the same square in a started combat (engaged). */
function engaged(a, b) {
  for (const combat of game.combats ?? []) {
    if (!combat.started) continue;
    const scene = combat.scene ?? canvas?.scene ?? null;
    const ta = tokenOn(scene, a);
    const tb = tokenOn(scene, b);
    if (ta && tb && (squares(ta, tb) === 0)) return true;
  }
  return false;
}

/** Truth: a token about to move remembers where it stood. */
function onPreUpdateToken(token, changes, options) {
  if (("x" in changes) || ("y" in changes)) options.eterniaDecreeFrom = placeOf(token);
}

/** Truth: a token that left the square of a bearer (by itself: not a pull, a push or a switch). */
function onUpdateToken(token, changes, options, userId) {
  const from = options.eterniaDecreeFrom;
  if (!from || options.eterniaForced || !rulesOn() || !isLocalChange(options, userId) || !token.actor) return;
  const scene = token.parent;
  const left = bearer => {
    const theirs = tokenOn(scene, bearer);
    return !!theirs && !sameActor(bearer, token.actor) && (squares(theirs, token, from) === 0) && (squares(theirs, token) > 0);
  };
  breakAll(token.actor, "verdade", { from, only: left }).catch(err => console.error(`${SYSTEM_ID} | Decree of Truth failed`, err));
}

/** Detachment: a bonus comes and the actor has two or more. */
function onCreateEffect(effect, options, userId) {
  const actor = effect.parent;
  if (!rulesOn() || !(actor instanceof Actor) || !isLocalChange(options, userId)) return;
  const gives = [...(effect.statuses ?? []), flag(effect, "statusData")?.statusId].filter(Boolean);
  if (!gives.some(id => statusDefinition(id)?.group === "combat") || (bonusesOf(actor).length < 2)) return;
  breakAll(actor, "desapego").catch(err => console.error(`${SYSTEM_ID} | Decree of Detachment failed`, err));
}

/** Os Dez Mandamentos and the like: `decreeRounds` counts down in each Cleanup Process, and the effect ends at 0. */
async function onCombatPhase(combat, after, before, { repeat = false } = {}) {
  if (!isPrimaryGM() || (after?.phase !== "cleanup") || !before || repeat) return;
  if ((after.round < before.round) || ((after.round === before.round) && (before.phase === "cleanup"))) return;
  for (const actor of combatActors(combat)) {
    for (const effect of actor.effects.filter(e => toInt(flag(e, "decreeRounds")) > 0)) {
      const left = toInt(flag(effect, "decreeRounds")) - 1;
      if (left > 0) {
        await effect.setFlag(SYSTEM_ID, "decreeRounds", left);
        continue;
      }
      await effect.delete().catch(() => null);
      await postSummary(effect.name, [L("Decree.Ends", { name: actorName(actor), effect: effect.name })]);
    }
  }
}

/* -------------------------------------------- */
/*  Spells and Traits                           */
/* -------------------------------------------- */

/**
 * The statuses a spell that "gives the curse of its caster's Decree" gives on a hit (Mandamento Materializado): those
 * of the caster's own Decrees, with its values and the marks of a curse (onHit entries of a damage card).
 * @param {Actor} actor   The caster
 * @returns {{statusId: string, value: number|null, name: string, data: object}[]}
 */
export function decreeHitStatuses(actor) {
  if (!actor) return [];
  const values = formulaData(actor, null);
  return ownDecrees(actor).flatMap(decree => CURSES[decree].map(entry => ({
    statusId: entry.statusId,
    value: (isFormula(entry.value) ? evaluateFormula(entry.value, values) : toInt(entry.value)) || null,
    name: decreeName(decree),
    data: { flags: { [SYSTEM_ID]: { decreeCurse: { by: actor.uuid, decree } } } }
  })));
}

/** What a spell with its caster's curse strips on a hit: the bonuses, with the Decree of Detachment. */
export function decreeStrip(actor) {
  if (!ownDecrees(actor).includes("desapego")) return [];
  return CONFIG.statusEffects.map(s => s.id).filter(id => statusDefinition(id)?.group === "combat");
}

/**
 * Whether an actor is under a curse of this caster's Decree.
 * @param {Actor} actor
 * @param {string} casterUuid
 */
export function cursedByDecree(actor, casterUuid) {
  if (!actor || !casterUuid) return false;
  const caster = fromUuidSync(casterUuid);
  return [...actor.effects].some(e => {
    const by = e.active ? flag(e, "decreeCurse")?.by : null;
    if (!by) return false;
    if (by === casterUuid) return true;
    const other = fromUuidSync(by);
    return !!caster && !!other && sameActor(other, caster);
  });
}

/* -------------------------------------------- */
/*  Registration                                */
/* -------------------------------------------- */

/** Call during the `init` hook. */
export function registerDecree() {
  registerHandler("decreeBreak", onBreakRequest);
  Hooks.on("eternia.damaged", onDamaged);
  Hooks.on("eternia.defeated", onDefeated);
  Hooks.on("eternia.recovered", actor => onRelief(actor));
  Hooks.on("eternia.freed", (actor, { statuses = [] } = {}) => { if (statuses.length) onRelief(actor); });
  Hooks.on("eternia.skillUsed", (...args) => onSkillUsed(...args).catch(err => console.error(`${SYSTEM_ID} | Decree of Silence failed`, err)));
  Hooks.on("eternia.attack", (...args) => onAttack(...args).catch(err => console.error(`${SYSTEM_ID} | Decrees failed`, err)));
  Hooks.on("eternia.attacked", onAttacked);
  Hooks.on("eternia.processEnd", onProcessEnd);
  Hooks.on("preUpdateToken", onPreUpdateToken);
  Hooks.on("updateToken", onUpdateToken);
  Hooks.on("createActiveEffect", onCreateEffect);
  Hooks.on("eternia.combatPhase", (...args) => onCombatPhase(...args).catch(err => console.error(`${SYSTEM_ID} | Decree rounds failed`, err)));
}
