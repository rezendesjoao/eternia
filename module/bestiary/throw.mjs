/**
 * The throw (a monster rule, docs/bestiario.md): a skill with `flags.eternia.monster = { rule: "throw", squares }` grabs
 * and throws whoever its damage card hurts (`eternia.damaged`, on the window that applied it; the GM decides where). In
 * a window the GM picks a creature up to `squares` (4) away from the thrown one, or a straight line that long on the map
 * (the first creature in the way stops the flight), or not to throw. The thrown token flies there (a forced move; into
 * the square of the creature it hits, engaged with it), and the creature hit takes the skill's damage too: a damage card
 * with it as the target, no Dodge Check, with the skill's hitStatuses. That card is marked `impact`: it throws no one.
 */
import { L, SYSTEM_ID } from "../settings.mjs";
import { actorName, postSummary, toInt } from "../helpers/utils.mjs";
import { diceFormula } from "../helpers/dice.mjs";
import { createDamageCard } from "../helpers/combat-cards.mjs";
import { registerHandler, request } from "../piles/pile-socket.mjs";
import { cellDistance, cellOf, clampCell, nearestCell, overlaps, sceneToken } from "./rush.mjs";

/** The straight lines a body can be thrown along, on the map. */
const LINES = { right: { i: 0, j: 1 }, left: { i: 0, j: -1 }, up: { i: -1, j: 0 }, down: { i: 1, j: 0 } };

const ruleOf = item => item?.getFlag?.(SYSTEM_ID, "monster") ?? null;

/** The creatures on the scene a body can hit: not itself nor its thrower, not the dead nor the piles. */
const hittable = (thrown, thrower) => thrown.parent.tokens.filter(t => (t !== thrown) && (t !== thrower) && t.actor
  && !t.actor.statuses.has("dead") && (t.actor.type !== "pile"));

/** The creatures a token can be thrown at: up to `squares` away from it (not those in its own square), nearest first. */
function throwTargets(thrown, thrower, squares) {
  const from = cellOf(thrown);
  return hittable(thrown, thrower).map(token => ({ token, distance: nearestCell(token, from).distance }))
    .filter(e => (e.distance > 0) && (e.distance <= squares))
    .sort((a, b) => (a.distance - b.distance) || a.token.name.localeCompare(b.token.name));
}

/** A flight along a line: where the token lands, and the first creature in the way (it stops there, engaged with it). */
function flight(thrown, thrower, line, squares) {
  const scene = thrown.parent;
  const from = cellOf(thrown);
  const others = hittable(thrown, thrower);
  let to = from;
  for (let k = 1; k <= squares; k++) {
    const next = clampCell(scene, thrown, { i: from.i + (line.i * k), j: from.j + (line.j * k) });
    if ((next.i === to.i) && (next.j === to.j)) break;
    to = next;
    const hit = others.find(t => overlaps(thrown, t, to));
    if (hit) return { to, hit };
  }
  return { to, hit: null };
}

/** The GM's window: at whom (or along which line) the body goes. Returns "token:<id>", "line:<dir>", or null. */
async function askWhere(thrown, squares, candidates) {
  const option = (value, text, checked) => `<label class="eternia-throw-option"><input type="radio" name="to" value="${value}"${checked ? " checked" : ""}> ${foundry.utils.escapeHTML(text)}</label>`;
  const options = [
    ...candidates.map((e, i) => option(`token:${e.token.id}`, L("Bestiary.ThrowAt", { name: e.token.name, n: e.distance }), i === 0)),
    ...Object.keys(LINES).map((dir, i) => option(`line:${dir}`, L(`Bestiary.ThrowLine.${dir}`, { n: squares }), !candidates.length && (i === 0)))
  ];
  const result = await foundry.applications.api.DialogV2.wait({
    window: { title: L("Bestiary.ThrowTitle", { name: thrown.name }), icon: "fa-solid fa-hand-back-fist" },
    classes: ["eternia", "lhd-box", "eternia-throw"],
    position: { width: 420 },
    content: `<p>${foundry.utils.escapeHTML(L("Bestiary.ThrowLead", { name: thrown.name, n: squares }))}</p><div class="form-group stacked">${options.join("")}</div>`,
    buttons: [
      { action: "throw", label: L("Bestiary.ThrowOk"), icon: "fa-solid fa-hand-back-fist", default: true,
        callback: (event, button) => button.form?.elements.to?.value ?? null },
      { action: "keep", label: L("Bestiary.ThrowCancel"), icon: "fa-solid fa-xmark" }
    ],
    rejectClose: false
  }).catch(() => null);
  return (result && (result !== "keep")) ? result : null;
}

/**
 * Throw a creature with a skill of the throw rule: where the GM picks (or `at`: a token to throw it at, or a line,
 * "right", "left", "up" or "down"); the thrown token flies, and the creature it hits takes the impact.
 * @param {Actor} target      The thrown creature
 * @param {Actor|null} thrower
 * @param {Item} item         The skill
 * @param {{sceneId?: string, at?: TokenDocument|string}} [options]
 * @returns {Promise<string|null>}   The chat line, or null when nothing was thrown
 */
export async function throwCreature(target, thrower, item, { sceneId = "", at } = {}) {
  const scene = game.scenes.get(sceneId) ?? canvas?.scene ?? null;
  const thrown = sceneToken(scene, target);
  if (!thrown) return null;
  const by = sceneToken(scene, thrower);
  const squares = Math.max(1, toInt(ruleOf(item)?.squares) || 4);
  const candidates = throwTargets(thrown, by, squares);
  let choice = (at === undefined) ? await askWhere(thrown, squares, candidates) : at;
  if (choice instanceof TokenDocument) choice = `token:${choice.id}`;
  else if (LINES[choice]) choice = `line:${choice}`;
  const [kind, value] = String(choice ?? "").split(":");
  let to = null;
  let hit = null;
  if (kind === "token") {
    hit = candidates.find(e => e.token.id === value)?.token ?? null;
    if (!hit) return null;
    to = clampCell(scene, thrown, nearestCell(hit, cellOf(thrown)).cell);
  }
  else if ((kind === "line") && LINES[value]) ({ to, hit } = flight(thrown, by, LINES[value], squares));
  else return null;

  const n = cellDistance(cellOf(thrown), to);
  if (n) await thrown.update({ x: to.j * scene.grid.size, y: to.i * scene.grid.size }, { eterniaForced: true });
  const data = { name: actorName(thrower ?? item.actor), target: thrown.name, n, hit: hit?.name ?? "" };
  const line = L(hit ? "Bestiary.ThrownAt" : (n ? "Bestiary.Thrown" : "Bestiary.ThrownNowhere"), data);
  await postSummary(item.name, [line]);
  if (hit) {
    const damage = item.system.damage ?? {};
    const entry = { tokenUuid: hit.uuid, actorUuid: hit.actor.uuid, name: hit.name, img: hit.texture?.src ?? hit.actor.img };
    const message = await createDamageCard(item, thrower ?? item.actor, diceFormula({ dice: damage.dice, mod: damage.mod }),
      L("Bestiary.ThrowImpact", { skill: item.name }), null, [entry]);
    if (message) await message.update({ [`flags.${SYSTEM_ID}.damage.impact`]: true });
  }
  return line;
}

/** A damage card hurt a creature: a skill of the throw rule throws it (the GM picks where). */
function onDamaged(actor, card) {
  if (!actor || !card || card.impact) return;
  const item = card.itemUuid ? fromUuidSync(card.itemUuid) : null;
  if (ruleOf(item)?.rule !== "throw") return;
  const thrower = (card.attackerUuid ? fromUuidSync(card.attackerUuid) : null) ?? item.actor;
  if (thrower?.uuid === actor.uuid) return;
  request("bestiaryThrow", { itemUuid: item.uuid, throwerUuid: thrower?.uuid ?? "", targetUuid: actor.uuid, sceneId: canvas?.scene?.id ?? "" })
    .catch(err => console.error(`${SYSTEM_ID} | Throw failed`, err));
}

/** The GM throws. */
async function onThrowRequest({ itemUuid, throwerUuid, targetUuid, sceneId }) {
  const item = fromUuidSync(itemUuid);
  const target = fromUuidSync(targetUuid);
  const thrower = (throwerUuid ? fromUuidSync(throwerUuid) : null) ?? item?.actor ?? null;
  if ((item instanceof Item) && (target instanceof Actor)) await throwCreature(target, thrower, item, { sceneId });
  return { ok: true };
}

/** Call during the `init` hook. */
export function registerThrow() {
  registerHandler("bestiaryThrow", payload => onThrowRequest(payload));
  Hooks.on("eternia.damaged", onDamaged);
}
