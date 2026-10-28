/**
 * The disguise (a monster rule, docs/bestiario.md): a monster whose skill carries `flags.eternia.monster = { rule:
 * "disguise", name, touch, reveal }` comes onto a scene hidden, while the GM tells the players what they see (`name`:
 * the Mimic's chest, the Gargoyle's statue; the chat line that reveals it says it). Its new token keeps its own look and
 * side but is hidden: the GM sees it faded, the players don't see it on the map nor in their tracker, and can't target
 * it. The token carries `flags.eternia.disguise = { hidden: true }` while disguised.
 * It shows what it is when (`reveal`, both by default):
 * - "act": it uses a skill (before its card) or its token moves by itself (one square is enough);
 * - "touch": a creature of the other side steps onto one of its squares (and gets the statuses of `touch`, it as their
 *   source: the Mimic's glue), or an attack or a damage card reaches it.
 * The GM showing its token (the eye of the token's HUD) reveals it too, whatever its rule says.
 * Revealed, the token shows (`flags.eternia.revealed`: a copy of it isn't disguised again), the chat tells it, it joins
 * the started combat of its scene and `eternia.revealed(token, { by, why })` is called ("act", "step", "hit" or "gm").
 * The window that saw it asks the GM (`bestiaryReveal`). A skill with `flags.eternia.monster = { rule: "conceal" }`
 * hides its user again when used (the Gargoyle's stone pose). For macros: `reveal(token)`, `disguise(token)`; a token
 * created with the option `eterniaNoDisguise` comes as itself.
 * Before 0.47.1 a disguised token took the rule's picture (`img`) and name and the secret disposition, its own look in
 * the flag (`{ name, img, scaleX, scaleY, disposition }`): revealing one of those gives its look back, and the bestiary
 * migration (version 4) turns the ones on the scenes into hidden tokens.
 */
import { L, SYSTEM_ID } from "../settings.mjs";
import { isLocalChange } from "../helpers/clients.mjs";
import { actorName, postSummary, toInt, wrap } from "../helpers/utils.mjs";
import { statusDefinition } from "../helpers/statuses.mjs";
import { registerHandler, request } from "../piles/pile-socket.mjs";

const label = id => game.i18n.localize(`ETERNIA.StatusEffect.${id}`);

/** What gives a disguise away, when its rule doesn't say. */
const REASONS = ["act", "touch"];

/** The tokens being revealed on this window (two triggers at once reveal once). */
const revealing = new Set();

/**
 * An actor's disguise: its skill, what the players are told they see, the statuses of its touch and what gives it
 * away, or null.
 * @param {Actor|null} actor
 */
export function disguiseOf(actor) {
  const item = (actor?.items ?? []).find(i => (i.type === "skill") && (i.getFlag(SYSTEM_ID, "monster")?.rule === "disguise"));
  if (!item) return null;
  const rule = item.getFlag(SYSTEM_ID, "monster");
  return { item, name: rule.name || item.name, touch: rule.touch ?? [], reveal: Array.isArray(rule.reveal) ? rule.reveal : REASONS };
}

/** Whether a token is disguised now (hidden by its disguise, or wearing one from before 0.47.1). */
export const isDisguised = token => !!token?.getFlag?.(SYSTEM_ID, "disguise");

/** The side of a disguised token (one from before 0.47.1 keeps its own in the flag, under the secret disposition). */
const sideOf = token => token.getFlag(SYSTEM_ID, "disguise")?.disposition ?? token.disposition;

/** Whether this reason gives a disguised token away. */
const givesAway = (token, why) => (disguiseOf(token.actor)?.reveal ?? REASONS).includes(why);

/** Whether a skill hides its user again (`conceal`). */
const conceals = item => item?.getFlag?.(SYSTEM_ID, "monster")?.rule === "conceal";

/** Hide or show a token's combatants in the players' tracker (shown: as the token itself is). */
async function trackerHidden(token, hidden) {
  for (const combat of game.combats) {
    const updates = combat.combatants.filter(c => (c.tokenId === token.id) && (c.sceneId === token.parent?.id) && (c.hidden !== hidden))
      .map(c => ({ _id: c.id, hidden }));
    if (updates.length) await combat.updateEmbeddedDocuments("Combatant", updates);
  }
}

/** The token of an actor: a token actor's own, else its first active one (the viewed scene first). */
function tokenOf(actor) {
  if (actor?.token) return actor.token;
  const tokens = actor?.getActiveTokens?.(false, true) ?? [];
  return tokens.find(t => t.parent === canvas?.scene) ?? tokens[0] ?? null;
}

/** Where a token stands: its source position (TokenDocument#x keeps the old place while a move animates). */
const placeOf = token => ({ x: token._source?.x ?? token.x, y: token._source?.y ?? token.y });

/** Whether two tokens of a scene share a square. */
function overlaps(a, b) {
  const size = a.parent.grid.size;
  const box = t => {
    const p = placeOf(t);
    const x0 = Math.round(p.x / size), y0 = Math.round(p.y / size);
    return { x0, y0, x1: x0 + Math.max(1, toInt(t.width)) - 1, y1: y0 + Math.max(1, toInt(t.height)) - 1 };
  };
  const p = box(a), q = box(b);
  return (p.x0 <= q.x1) && (q.x0 <= p.x1) && (p.y0 <= q.y1) && (q.y0 <= p.y1);
}

/** The changes that disguise a token: hidden, with its own look and side. */
const disguiseChanges = () => ({ hidden: true, [`flags.${SYSTEM_ID}.disguise`]: { hidden: true } });

/* -------------------------------------------- */
/*  Disguising and revealing                    */
/* -------------------------------------------- */

/**
 * Disguise a token already on a scene (a macro; new tokens come disguised). GM only.
 * @param {TokenDocument} token
 * @returns {Promise<boolean>}
 */
export async function disguise(token) {
  if (!game.user.isGM || !disguiseOf(token?.actor) || isDisguised(token)) return false;
  await token.update({ ...disguiseChanges(), [`flags.${SYSTEM_ID}.-=revealed`]: null });
  await trackerHidden(token, true);
  return true;
}

/**
 * Show what a disguised token is: the GM does it, whoever's window saw it.
 * @param {TokenDocument} token
 * @param {object} [options]
 * @param {Actor} [options.by]     Who gave it away (stepped onto it, hit it)
 * @param {string} [options.why]   "act", "step", "hit" or "gm"
 * @returns {Promise<boolean>}
 */
export async function reveal(token, { by = null, why = "gm" } = {}) {
  if (!isDisguised(token)) return false;
  const payload = { tokenUuid: token.uuid, byUuid: by?.uuid ?? null, why };
  if (game.user.isGM) return (await revealNow(payload)).ok;
  return !!(await request("bestiaryReveal", payload))?.ok;
}

/** The GM reveals a token: it shows, the touch's statuses, the line in the chat, the combat. */
async function revealNow({ tokenUuid, byUuid = null, why = "gm" }) {
  const token = fromUuidSync(tokenUuid);
  const look = token?.getFlag(SYSTEM_ID, "disguise");
  if (!look || revealing.has(tokenUuid)) return { ok: true };
  revealing.add(tokenUuid);
  try {
    const rule = disguiseOf(token.actor);
    // A token disguised before 0.47.1 wears the rule's picture and name: its own look and side come back from the flag
    const worn = !!look.img;
    const shown = worn ? token.name : (rule?.name ?? token.name);
    const name = worn ? look.name : token.name;
    const changes = worn
      ? {
        name: look.name, "texture.src": look.img, "texture.scaleX": look.scaleX ?? 1, "texture.scaleY": look.scaleY ?? 1,
        disposition: look.disposition ?? CONST.TOKEN_DISPOSITIONS.HOSTILE
      }
      : { hidden: false };
    await token.update({ ...changes, [`flags.${SYSTEM_ID}.-=disguise`]: null, [`flags.${SYSTEM_ID}.revealed`]: true });
    const by = byUuid ? fromUuidSync(byUuid) : null;
    const key = (by && { step: "Stepped", hit: "Hit" }[why]) || "Revealed";
    const lines = [L(`Bestiary.Disguise.${key}`, { shown, name, by: actorName(by) })];
    // Whoever stepped onto it gets the statuses of its touch (the glue of the Mimic), it as their source
    if ((why === "step") && (by instanceof Actor) && rule?.touch?.length) {
      const given = [];
      for (const { statusId, value = null } of rule.touch) {
        if (!statusId) continue;
        const rated = !!statusDefinition(statusId)?.rated;
        await game.eternia.applyStatus(by, statusId, { value: rated ? (toInt(value) || 1) : null, from: token.actor });
        given.push(rated ? `${label(statusId)} ${toInt(value) || 1}` : label(statusId));
      }
      if (given.length) lines.push(L("Bestiary.Disguise.Stuck", { name: actorName(by), statuses: given.join(", ") }));
    }
    // In a started combat of its scene, it joins the fight (shown in the tracker if it was there already)
    await trackerHidden(token, !!token.hidden);
    const combat = game.combats.find(c => c.started && (c.scene?.id === token.parent.id));
    if (combat && !combat.combatants.some(c => c.tokenId === token.id)) {
      await combat.createEmbeddedDocuments("Combatant", [{ tokenId: token.id, sceneId: token.parent.id, actorId: token.actorId, hidden: token.hidden }]);
      lines.push(L("Bestiary.Disguise.Joins", { name }));
    }
    await postSummary(rule?.item.name ?? name, lines);
    /**
     * A disguised monster showed what it is (on the GM's window).
     * @param {TokenDocument} token
     * @param {{by: Actor|null, why: string}} context
     */
    Hooks.callAll("eternia.revealed", token, { by, why });
  }
  finally {
    revealing.delete(tokenUuid);
  }
  return { ok: true };
}

/* -------------------------------------------- */
/*  What gives it away                          */
/* -------------------------------------------- */

/** A new token of a monster with a disguise comes hidden (on the window that creates it). */
function onPreCreateToken(token, data, options, userId) {
  if ((userId !== game.user.id) || options.eterniaNoDisguise) return;
  const flags = data.flags?.[SYSTEM_ID] ?? {};
  if (flags.disguise || flags.revealed) return;
  if (disguiseOf(token.actor ?? game.actors.get(token.actorId))) token.updateSource(disguiseChanges());
}

/**
 * A token changed (on the window that changed it): the GM showed a disguised one (the eye of its HUD), a disguised one
 * moved by itself, or someone moved onto a disguised one.
 */
function onUpdateToken(token, changes, options, userId) {
  if (!isLocalChange(options, userId) || !token.parent) return;
  if ((changes.hidden === false) && isDisguised(token)) {
    reveal(token, { why: "gm" }).catch(err => console.error(`${SYSTEM_ID} | Reveal failed`, err));
    return;
  }
  if (!(("x" in changes) || ("y" in changes))) return;
  if (isDisguised(token)) {
    if (!options.eterniaForced && givesAway(token, "act")) reveal(token, { why: "act" }).catch(err => console.error(`${SYSTEM_ID} | Reveal failed`, err));
    return;
  }
  const mover = token.actor;
  if (!mover || (mover.type === "pile")) return;
  for (const other of token.parent.tokens) {
    if ((other === token) || !isDisguised(other) || !givesAway(other, "touch")) continue;
    // Its own side walks by
    if (token.disposition === sideOf(other)) continue;
    if (overlaps(token, other)) reveal(other, { by: mover, why: "step" }).catch(err => console.error(`${SYSTEM_ID} | Reveal failed`, err));
  }
}

/** An attack declared against disguised targets, or a damage card that reached one: they show what they are. */
function onReached(actors, attacker) {
  for (const actor of actors) {
    const token = tokenOf(actor);
    if (isDisguised(token) && givesAway(token, "touch")) reveal(token, { by: attacker, why: "hit" }).catch(err => console.error(`${SYSTEM_ID} | Reveal failed`, err));
  }
}

/** Call during the `init` hook. */
export function registerDisguise() {
  registerHandler("bestiaryReveal", payload => revealNow(payload));
  Hooks.on("preCreateToken", onPreCreateToken);
  Hooks.on("updateToken", onUpdateToken);
  Hooks.on("eternia.attack", (message, { attacker = null, targets = [] } = {}) => onReached(targets, attacker));
  Hooks.on("eternia.damaged", (actor, card, { attacker = null } = {}) => onReached([actor], attacker));
  // A disguised token comes into a combat hidden from the players' tracker
  Hooks.on("preCreateCombatant", (combatant, data, options, userId) => {
    if ((userId === game.user.id) && isDisguised(combatant.token)) combatant.updateSource({ hidden: true });
  });
  // It uses a skill: it shows itself before the card (not a skill that disguises it again)
  wrap(CONFIG.Item.documentClass.prototype, "ItemThrow", async function (original, ...args) {
    const token = this.actor ? tokenOf(this.actor) : null;
    if (isDisguised(token) && givesAway(token, "act") && !conceals(this)) await reveal(token, { why: "act" }).catch(err => console.error(`${SYSTEM_ID} | Reveal failed`, err));
    return original.apply(this, args);
  });
  // The stone pose: a skill with the `conceal` rule hides its user again (on the GM's window, the monster's)
  Hooks.on("eternia.skillUsed", (item, { actor = null } = {}) => {
    const token = (conceals(item) && game.user.isGM) ? tokenOf(actor) : null;
    if (token && !isDisguised(token)) disguise(token).catch(err => console.error(`${SYSTEM_ID} | Disguise failed`, err));
  });
}
