/**
 * The disguise (a monster rule, docs/bestiario.md): a monster whose skill carries `flags.eternia.monster = { rule:
 * "disguise", name, img, scale, touch, reveal }` comes onto a scene as something else (the Mimic's chest, the
 * Gargoyle's statue). Its new token takes that name and picture (`scale`: of the picture) and the secret disposition:
 * the players see no name, bars, border or statuses, and can't target it. Its own look waits in the token's
 * `flags.eternia.disguise = { name, img, scaleX, scaleY, disposition }`.
 * It shows what it is when (`reveal`, both by default):
 * - "act": it uses a skill (before its card) or its token moves by itself;
 * - "touch": a creature of the other side steps onto one of its squares (and gets the statuses of `touch`, it as their
 *   source: the Mimic's glue), or an attack or a damage card reaches it.
 * Revealed, the token gets its look and side back (`flags.eternia.revealed`: a copy of it isn't disguised again), the
 * chat tells it, it joins the started combat of its scene and `eternia.revealed(token, { by, why })` is called ("act",
 * "step", "hit" or "gm"). The window that saw it asks the GM (`bestiaryReveal`). For macros: `reveal(token)`,
 * `disguise(token)`; a token created with the option `eterniaNoDisguise` comes as itself.
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
 * An actor's disguise: its skill, the look it takes, the statuses of its touch and what gives it away, or null.
 * @param {Actor|null} actor
 */
export function disguiseOf(actor) {
  const item = (actor?.items ?? []).find(i => (i.type === "skill") && (i.getFlag(SYSTEM_ID, "monster")?.rule === "disguise"));
  if (!item) return null;
  const rule = item.getFlag(SYSTEM_ID, "monster");
  return {
    item, name: rule.name || item.name, img: rule.img || item.img, scale: Number(rule.scale) || 1,
    touch: rule.touch ?? [], reveal: Array.isArray(rule.reveal) ? rule.reveal : REASONS
  };
}

/** Whether a token is disguised now (its own look waits in its flags). */
export const isDisguised = token => !!token?.getFlag?.(SYSTEM_ID, "disguise");

/** Whether this reason gives a disguised token away. */
const givesAway = (token, why) => (disguiseOf(token.actor)?.reveal ?? REASONS).includes(why);

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

/** The changes that disguise a token, its own look kept (from its source: the document keeps the old one a moment). */
function disguiseChanges(token, rule) {
  const own = token._source ?? token;
  return {
    name: rule.name,
    "texture.src": rule.img,
    "texture.scaleX": rule.scale,
    "texture.scaleY": rule.scale,
    disposition: CONST.TOKEN_DISPOSITIONS.SECRET,
    [`flags.${SYSTEM_ID}.disguise`]: {
      name: own.name, img: own.texture?.src, scaleX: own.texture?.scaleX ?? 1, scaleY: own.texture?.scaleY ?? 1,
      disposition: own.disposition
    }
  };
}

/* -------------------------------------------- */
/*  Disguising and revealing                    */
/* -------------------------------------------- */

/**
 * Disguise a token already on a scene (a macro; new tokens come disguised). GM only.
 * @param {TokenDocument} token
 * @returns {Promise<boolean>}
 */
export async function disguise(token) {
  const rule = disguiseOf(token?.actor);
  if (!game.user.isGM || !rule || isDisguised(token)) return false;
  await token.update({ ...disguiseChanges(token, rule), [`flags.${SYSTEM_ID}.-=revealed`]: null });
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

/** The GM reveals a token: its look and side back, the touch's statuses, the line in the chat, the combat. */
async function revealNow({ tokenUuid, byUuid = null, why = "gm" }) {
  const token = fromUuidSync(tokenUuid);
  const look = token?.getFlag(SYSTEM_ID, "disguise");
  if (!look || revealing.has(tokenUuid)) return { ok: true };
  revealing.add(tokenUuid);
  try {
    const rule = disguiseOf(token.actor);
    const shown = token.name;
    await token.update({
      name: look.name, "texture.src": look.img, "texture.scaleX": look.scaleX ?? 1, "texture.scaleY": look.scaleY ?? 1,
      disposition: look.disposition ?? CONST.TOKEN_DISPOSITIONS.HOSTILE,
      [`flags.${SYSTEM_ID}.-=disguise`]: null, [`flags.${SYSTEM_ID}.revealed`]: true
    });
    const by = byUuid ? fromUuidSync(byUuid) : null;
    const key = (by && { step: "Stepped", hit: "Hit" }[why]) || "Revealed";
    const lines = [L(`Bestiary.Disguise.${key}`, { shown, name: look.name, by: actorName(by) })];
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
    // In a started combat of its scene, it joins the fight
    const combat = game.combats.find(c => c.started && (c.scene?.id === token.parent.id));
    if (combat && !combat.combatants.some(c => c.tokenId === token.id)) {
      await combat.createEmbeddedDocuments("Combatant", [{ tokenId: token.id, sceneId: token.parent.id, actorId: token.actorId, hidden: token.hidden }]);
      lines.push(L("Bestiary.Disguise.Joins", { name: look.name }));
    }
    await postSummary(rule?.item.name ?? look.name, lines);
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

/** A new token of a monster with a disguise comes disguised (on the window that creates it). */
function onPreCreateToken(token, data, options, userId) {
  if ((userId !== game.user.id) || options.eterniaNoDisguise) return;
  const flags = data.flags?.[SYSTEM_ID] ?? {};
  if (flags.disguise || flags.revealed) return;
  const rule = disguiseOf(token.actor ?? game.actors.get(token.actorId));
  if (rule) token.updateSource(disguiseChanges(token, rule));
}

/** A token moved (on the window that moved it): a disguised one by itself, or someone onto a disguised one. */
function onUpdateToken(token, changes, options, userId) {
  if (!(("x" in changes) || ("y" in changes)) || !isLocalChange(options, userId) || !token.parent) return;
  if (isDisguised(token)) {
    if (!options.eterniaForced && givesAway(token, "act")) reveal(token, { why: "act" }).catch(err => console.error(`${SYSTEM_ID} | Reveal failed`, err));
    return;
  }
  const mover = token.actor;
  if (!mover || (mover.type === "pile")) return;
  for (const other of token.parent.tokens) {
    if ((other === token) || !isDisguised(other) || !givesAway(other, "touch")) continue;
    // Its own side walks by
    if (token.disposition === other.getFlag(SYSTEM_ID, "disguise").disposition) continue;
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
  // It uses a skill: it shows itself before the card
  wrap(CONFIG.Item.documentClass.prototype, "ItemThrow", async function (original, ...args) {
    const token = this.actor ? tokenOf(this.actor) : null;
    if (isDisguised(token) && givesAway(token, "act")) await reveal(token, { why: "act" }).catch(err => console.error(`${SYSTEM_ID} | Reveal failed`, err));
    return original.apply(this, args);
  });
}
