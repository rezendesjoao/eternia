/**
 * How the tokens come.
 *
 * - A character's token sees (sight on; with no range of its own, an unlimited one: darkness in Eternia is a rule of
 *   the scene, [Darkness] and [Night Vision], not the light of the map, so the walls are what hide things), is linked
 *   to its actor (the HP it lost stays when the token is deleted and placed again) and a new character stands with the
 *   friends. A monster's token stays unlinked: each one on the map is a copy.
 * - Every token shows its name, always (unless someone picked another mode for it).
 * - New actors take this (EterniaActor#_preCreate), and a character's token is linked whenever one is placed.
 * - The portrait leads the token's picture: a new portrait goes to the prototype token and the placed tokens while their
 *   picture still follows it (none, the default one, the type icon or the old portrait; EterniaActor#_preUpdate and
 *   #_onUpdate).
 * - A world migration gives the actors and tokens already in the world the same, and turns off core's turn marker (the
 *   ring that spun around the token whose turn it is; the combat tracker's settings can bring it back).
 * - A numbered token (unlinked, its prototype appends a number: the bestiary's creatures) carries a Roman numeral after
 *   the name, "Kobold I", "Kobold II", in place of core's "Kobold (1)": the lowest one no token of the scene with that
 *   name carries (EterniaActor#getTokenDocument, and bestiary/spawn.mjs for the ones called together).
 */
import { SYSTEM_ID } from "../settings.mjs";

/** Call during the `init` hook. */
export function registerTokenDefaults() {
  // A character's token is always linked to its actor, whatever its prototype says.
  Hooks.on("preCreateToken", token => {
    const actor = game.actors.get(token.actorId);
    if ((actor?.type === "character") && !token.actorLink) token.updateSource({ actorLink: true });
  });
}

/**
 * What a token of an actor of this type should have and still doesn't: changes to its data (a prototype token or a
 * placed token), empty when there are none.
 * @param {string} type             The actor's type
 * @param {object} token            The token's source data
 * @param {object} [options]
 * @param {boolean} [options.fresh] A new actor with no side of its own: a character stands with the friends
 * @returns {object}
 */
export function tokenDefaults(type, token, { fresh = false } = {}) {
  const changes = {};
  if (!["character", "monster"].includes(type)) return changes;
  // Core hides the name by default; a mode someone picked (on hover, to the owner…) stays
  if ((token?.displayName ?? CONST.TOKEN_DISPLAY_MODES.NONE) === CONST.TOKEN_DISPLAY_MODES.NONE) {
    changes.displayName = CONST.TOKEN_DISPLAY_MODES.ALWAYS;
  }
  if (type !== "character") return changes;
  if (!token?.actorLink) changes.actorLink = true;
  if (!token?.sight?.enabled) changes.sight = { enabled: true, range: (Number(token?.sight?.range) > 0) ? token.sight.range : null };
  if (fresh) changes.disposition = CONST.TOKEN_DISPOSITIONS.FRIENDLY;
  return changes;
}

/* -------------------------------------------- */
/*  The portrait and the token                  */
/* -------------------------------------------- */

/** The pictures every actor starts with: core's and the system's type icons. */
const DEFAULT_ART = /(^|\/)(mystery-man\.svg|actors_icons\/[\w-]+\.svg)$/;

/**
 * Whether a token's picture follows the portrait: it has none yet, a default one or the portrait itself.
 * @param {string} src        The token's picture
 * @param {string} portrait   The portrait (before it changes)
 */
export function followsPortrait(src, portrait) {
  return !src || (src === portrait) || (src === CONST.DEFAULT_TOKEN) || DEFAULT_ART.test(src);
}

/**
 * The actor's portrait changed: its placed tokens that followed the old one take the new one (the linked ones, and the
 * unlinked copies that have no picture of their own). Only the tokens this user may change.
 * @param {Actor} actor
 * @param {string} from   The old portrait
 * @param {string} to     The new one
 */
export async function syncTokenArt(actor, from, to) {
  if (actor.isToken || !to) return;
  for (const scene of game.scenes) {
    const updates = scene.tokens.filter(t => (t.actorId === actor.id) && t.isOwner && (t.actorLink || !t._source.delta?.img)
      && followsPortrait(t._source.texture?.src, from)).map(t => ({ _id: t.id, "texture.src": to }));
    if (updates.length) await scene.updateEmbeddedDocuments("Token", updates);
  }
}

/* -------------------------------------------- */
/*  The number of a token                       */
/* -------------------------------------------- */

const ROMAN = [[1000, "M"], [900, "CM"], [500, "D"], [400, "CD"], [100, "C"], [90, "XC"], [50, "L"], [40, "XL"],
  [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"]];

/** A whole number in Roman numerals: 1 is "I", 14 is "XIV". */
export function toRoman(n) {
  let rest = Math.trunc(Number(n));
  if (!(rest > 0)) return String(n);
  let out = "";
  for (const [value, digits] of ROMAN) {
    while (rest >= value) {
      out += digits;
      rest -= value;
    }
  }
  return out;
}

/** The value of a Roman numeral written the usual way ("XIV" is 14); 0 when it isn't one. */
function fromRoman(text) {
  if (!/^[IVXLCDM]+$/.test(text)) return 0;
  let total = 0;
  let rest = text;
  for (const [value, digits] of ROMAN) {
    while (rest.startsWith(digits)) {
      total += value;
      rest = rest.slice(digits.length);
    }
  }
  return (!rest && (toRoman(total) === text)) ? total : 0;
}

/** The number a token's name carries after a base name: "Kobold III" (or core's old "Kobold (3)") is 3; 0 when none. */
function tokenNumber(name, base) {
  if (!name?.startsWith(`${base} `)) return 0;
  const tail = name.slice(base.length + 1);
  const old = /^\((\d+)\)$/.exec(tail);
  return old ? Number(old[1]) : fromRoman(tail);
}

/**
 * The lowest number that no token of a scene with this base name carries, nor any in `taken` (the tokens being made in
 * the same moment, which the scene doesn't have yet).
 * @param {Scene|null} scene
 * @param {string} base
 * @param {Set<number>} [taken]
 * @returns {number}
 */
export function freeNumber(scene, base, taken = new Set()) {
  const used = new Set(taken);
  for (const token of scene?.tokens ?? []) used.add(tokenNumber(token.name, base));
  let n = 1;
  while (used.has(n)) n++;
  return n;
}

/** The name of a numbered token: "Kobold II". */
export const numberedName = (base, n) => `${base} ${toRoman(n)}`;

/* -------------------------------------------- */
/*  Migration                                   */
/* -------------------------------------------- */

/**
 * The actors and tokens already in the world: the characters' prototype tokens and placed tokens see and are linked,
 * every token shows its name; core's turn marker goes off. A placed character token that was unlinked had data of its
 * own (HP, Fate, Hate, Fatigue): the first one found (the active scene's first) hands it to its actor, so linking it
 * doesn't heal anyone.
 */
async function migrateTokens(done) {
  if (done >= 1) return true;

  const config = game.settings.get("core", "combatTrackerConfig");
  if (config?.turnMarker?.enabled) {
    await game.settings.set("core", "combatTrackerConfig", { ...config, turnMarker: { ...config.turnMarker, enabled: false } });
  }

  const actors = game.actors.map(actor => ({ _id: actor.id, prototypeToken: tokenDefaults(actor.type, actor._source.prototypeToken) }))
    .filter(u => !foundry.utils.isEmpty(u.prototypeToken));
  if (actors.length) await Actor.implementation.updateDocuments(actors);

  const handed = new Set();
  const scenes = [...game.scenes].sort((a, b) => Number(b.active) - Number(a.active));
  for (const scene of scenes) {
    const updates = [];
    for (const token of scene.tokens) {
      const actor = game.actors.get(token.actorId);
      if (!actor) continue;
      const changes = tokenDefaults(actor.type, token._source);
      if (foundry.utils.isEmpty(changes)) continue;
      const own = token._source.delta?.system;
      if (changes.actorLink && own && !foundry.utils.isEmpty(own) && !handed.has(actor.id)) {
        handed.add(actor.id);
        await actor.update({ system: own });
      }
      updates.push({ _id: token.id, ...changes });
    }
    if (updates.length) await scene.updateEmbeddedDocuments("Token", updates);
  }
  console.log(`${SYSTEM_ID} | Tokens: ${actors.length} actors and their placed tokens set to see, link and show the name`);
  return true;
}

/** World migration (see helpers/migrations.mjs). */
export const TOKENS_MIGRATION = {
  id: "tokens", setting: "tokensMigrationVersion", version: 1, run: migrateTokens
};
