/**
 * Breeding (a monster rule, docs/bestiario.md): a creature whose skill carries `flags.eternia.monster = { rule: "breed",
 * uuid, radius, max, whole }` multiplies while nobody hurts it (the Horned Hares of the frozen woods). In each Setup
 * Process of its combat, the ones of its kind standing on the scene pair up: two of them within `radius` squares (1) of
 * each other, both unhurt (with `whole`, the default: at their max HP), make one more next to them (`uuid`: the
 * compendium monster of the kind; no drops, `calledBy`), until `max` of the kind are standing on the scene (8). A
 * creature breeds once per Setup, from the second round; the hurt ones don't. The kind is the token's compendium source
 * (or its world actor). Runs on the primary GM.
 */
import { L, SYSTEM_ID } from "../settings.mjs";
import { isPrimaryGM } from "../helpers/clients.mjs";
import { postSummary, toInt, wrap } from "../helpers/utils.mjs";
import { rulesOn } from "../conditions/rules.mjs";
import { spawnNear } from "./spawn.mjs";

/** Down: Incapacitated or dead (or gone). */
const down = actor => !actor || actor.statuses.has("incapacitated") || actor.statuses.has("dead");

/** The breed rule of an actor (its skill's), with the skill, or null. */
function breedRule(actor) {
  const item = (actor?.items ?? []).find(i => (i.type === "skill") && (i.getFlag(SYSTEM_ID, "monster")?.rule === "breed"));
  return item ? { item, rule: item.getFlag(SYSTEM_ID, "monster") } : null;
}

/** The kind of a token: its compendium source, else its world actor. */
const kindOf = token => token.actor?._stats?.compendiumSource || token.baseActor?._stats?.compendiumSource || token.actorId;

/** The squares between two tokens (from their nearest squares). */
function gap(a, b) {
  const size = a.parent.grid.size;
  const box = t => ({ x0: Math.round(t.x / size), y0: Math.round(t.y / size), x1: Math.round(t.x / size) + Math.max(1, toInt(t.width)) - 1, y1: Math.round(t.y / size) + Math.max(1, toInt(t.height)) - 1 });
  const p = box(a), q = box(b);
  return Math.max(0, q.x0 - p.x1, p.x0 - q.x1, q.y0 - p.y1, p.y0 - q.y1);
}

/** Unhurt: at its max HP (or, without `whole`, simply standing). */
const unhurt = (actor, whole) => !whole || (toInt(actor.system.health?.value) >= toInt(actor.system.health?.max));

/** The Setup Process of a combat: the breeders of its scene pair up and make more. */
async function setupBreed(combat) {
  const scene = combat.scene;
  if (!scene) return;
  const kinds = new Map();
  for (const token of scene.tokens) {
    if (token.hidden || down(token.actor) || (token.actor?.type !== "monster")) continue;
    const found = breedRule(token.actor);
    if (!found) continue;
    const key = kindOf(token);
    if (!kinds.has(key)) kinds.set(key, { ...found, tokens: [] });
    kinds.get(key).tokens.push(token);
  }
  for (const { item, rule, tokens } of kinds.values()) {
    const radius = Math.max(1, toInt(rule.radius) || 1);
    const max = Math.max(1, toInt(rule.max) || 8);
    const whole = rule.whole !== false;
    const room = max - tokens.length;
    if ((room <= 0) || !rule.uuid) continue;
    const free = tokens.filter(t => unhurt(t.actor, whole));
    const used = new Set();
    const pairs = [];
    for (const a of free) {
      if (used.has(a.id)) continue;
      const b = free.find(t => (t !== a) && !used.has(t.id) && (gap(a, t) <= radius));
      if (!b) continue;
      used.add(a.id);
      used.add(b.id);
      pairs.push(a);
    }
    const born = [];
    for (const parent of pairs.slice(0, room)) {
      const made = await spawnNear(parent, [{ uuid: rule.uuid, count: 1 }], { radius: 2, by: parent.actor.uuid });
      born.push(...made);
    }
    if (born.length) await postSummary(item.name, [L("Bestiary.Breed", { name: tokens[0].actor.name, n: born.length, total: tokens.length + born.length })]);
  }
}

/** Call during the `init` hook. */
export function registerBreed() {
  wrap(CONFIG.Combat.documentClass.prototype, "_onPhaseStart", async function (original, phase, round, previous) {
    await original.call(this, phase, round, previous);
    const backwards = !!previous && (round < previous.round);
    // From the second round: the first Setup is the meeting
    if ((phase !== "setup") || (round <= 1) || backwards || !rulesOn() || !isPrimaryGM()) return;
    await setupBreed(this).catch(err => console.error(`${SYSTEM_ID} | Breeding failed`, err));
  });
}
