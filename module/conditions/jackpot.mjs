/**
 * The Jackpot (the Magia Aposta Mortal): a game of chance in the curse.
 * - A Trait with `slots`: every spell of its Magia spins three reels when used (eternia.skillUsed, on the user's window),
 *   and so does every Setup Process while an effect with `slotsEachRound` is on (conditions/turns.mjs). Three of a kind
 *   is the [Jackpot]; a pair, +1 [Luck] (+2 with an effect with `pairsDouble`); [Luck] reaching 3 is the [Jackpot] too.
 *   No spin during the [Jackpot].
 * - [Jackpot] (`jackpot`, its Rating the rounds left): the bearer gets all its HP back at once and in every Setup
 *   Process, and an Extra Breath that never runs out (`revive`, the HP all back), its spells cost no Hate
 *   (automation/use.mjs) and its attacks deal +CR (conditions/rolls.mjs). It counts down in every Cleanup Process.
 */
import { L, SYSTEM_ID } from "../settings.mjs";
import { isLocalChange } from "../helpers/clients.mjs";
import { actorName, escape, postSummary, toInt } from "../helpers/utils.mjs";
import { statusEffectData } from "../chat/status-links.mjs";
import { traitsFor } from "../helpers/magic-traits.mjs";
import { has, rating, removeStatuses, rulesOn } from "./rules.mjs";
import { takeHealing } from "./damage.mjs";

/** How many rounds the prize lasts, and the [Luck] that is the prize. */
export const JACKPOT_ROUNDS = 3;
const LUCK_PRIZE = 3;
const label = id => game.i18n.localize(`ETERNIA.StatusEffect.${id}`);

/** Whether an actor has an active effect with a flag. */
const hasFlag = (actor, key) => [...(actor?.allApplicableEffects?.() ?? [])].some(e => e.active && e.getFlag(SYSTEM_ID, key));

/** The card of a spin: the three reels and what they gave. */
async function postReels(actor, faces, result) {
  const reels = faces.map(n => `<span class="et-reel${result.prize ? " et-reel-prize" : ""}">${n}</span>`).join("");
  const content = `<div class="eternia chat-card lhauto-card et-slots">
    <header class="chat-card-header"><div class="chat-card-title"><h3>${escape(L("Jackpot.Title"))}</h3></div></header>
    <div class="et-reels">${reels}</div>
    <p class="et-reels-result">${escape(result.line)}</p>
  </div>`;
  await ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor }), content });
}

/**
 * The prize: [Jackpot] for its rounds, with the Extra Breath that never runs out, and all the HP back now.
 * @param {Actor} actor
 */
export async function hitJackpot(actor) {
  if (has(actor, "luck")) await removeStatuses(actor, ["luck"]);
  const data = statusEffectData("jackpot", JACKPOT_ROUNDS, "", { caster: actor });
  data.flags[SYSTEM_ID].revive = { uses: 99, per: "round", hp: "@hpMax" };
  await actor.createEmbeddedDocuments("ActiveEffect", [data]);
  const missing = toInt(actor.system.health?.max) - toInt(actor.system.health?.value);
  if (missing > 0) await takeHealing(actor, missing, { what: label("jackpot"), silent: true, natural: true });
}

/**
 * Spin the reels for an actor (its owner's window). Returns the line, or null when it doesn't spin.
 * @param {Actor} actor
 * @returns {Promise<string|null>}
 */
export async function spin(actor) {
  if (!rulesOn() || !actor?.isOwner || has(actor, "jackpot")) return null;
  const roll = await new Roll("3d6").evaluate();
  game.dice3d?.showForRoll(roll, game.user, true);
  const faces = roll.dice[0].results.map(r => r.result);
  const counts = faces.reduce((map, n) => map.set(n, (map.get(n) ?? 0) + 1), new Map());
  const best = Math.max(...counts.values());
  const result = { prize: false, line: "" };
  if (best >= 3) result.prize = true;
  else if (best === 2) {
    const luck = Math.min(LUCK_PRIZE, rating(actor, "luck") + (hasFlag(actor, "pairsDouble") ? 2 : 1));
    if (luck >= LUCK_PRIZE) result.prize = true;
    else {
      await actor.update({ "system.bad-status.luck": luck });
      result.line = L("Jackpot.Pair", { name: actorName(actor), n: luck });
    }
  }
  else result.line = L("Jackpot.Nothing", { name: actorName(actor) });
  if (result.prize) {
    await hitJackpot(actor);
    result.line = L("Jackpot.Prize", { name: actorName(actor), n: JACKPOT_ROUNDS });
  }
  await postReels(actor, faces, result);
  return result.line;
}

/** A spell of a Magia that spins was used (the user's window). */
async function onSkillUsed(item, { actor }) {
  if (!rulesOn() || !actor?.isOwner || !item?.flags?.eternia?.magicSpell) return;
  if (!traitsFor(actor, item).some(e => e.getFlag(SYSTEM_ID, "trait")?.slots)) return;
  await spin(actor);
}

/**
 * The Setup Process of a bearer (called by conditions/turns.mjs): the prize heals, or the domain spins. The lines.
 * @param {Actor} actor
 * @returns {Promise<string[]>}
 */
export async function jackpotSetup(actor) {
  if (!rulesOn()) return [];
  if (has(actor, "jackpot")) {
    const missing = toInt(actor.system.health?.max) - toInt(actor.system.health?.value);
    if (missing <= 0) return [];
    const healed = await takeHealing(actor, missing, { what: label("jackpot"), silent: true, natural: true });
    return healed ? [healed.line] : [];
  }
  if (!hasFlag(actor, "slotsEachRound")) return [];
  const line = await spin(actor);
  return line ? [line] : [];
}

/**
 * The Cleanup Process (called by conditions/turns.mjs): the prize counts down. The line, or null.
 * @param {Actor} actor
 */
export async function jackpotCleanup(actor) {
  const left = rating(actor, "jackpot");
  if (left <= 0) return null;
  if (left > 1) {
    await actor.update({ "system.bad-status.jackpot": left - 1 });
    return L("Jackpot.Lasts", { name: actorName(actor), n: left - 1 });
  }
  await removeStatuses(actor, ["jackpot"]);
  return L("Jackpot.Ends", { name: actorName(actor) });
}

/** The [Luck] reached 3 some other way (Pagar para Ver): the prize, on the window that changed it. */
async function onUpdateActor(actor, changes, options, userId) {
  const luck = foundry.utils.getProperty(changes, "system.bad-status.luck");
  if (!isLocalChange(options, userId) || !(Number(luck) >= LUCK_PRIZE) || has(actor, "jackpot") || !rulesOn()) return;
  await hitJackpot(actor);
  await postSummary(label("jackpot"), [L("Jackpot.Prize", { name: actorName(actor), n: JACKPOT_ROUNDS })]);
}

/** Call during the `init` hook. */
export function registerJackpot() {
  const fail = err => console.error(`${SYSTEM_ID} | The reels failed`, err);
  Hooks.on("eternia.skillUsed", (item, context) => onSkillUsed(item, context).catch(fail));
  Hooks.on("updateActor", (actor, changes, options, userId) => onUpdateActor(actor, changes, options, userId).catch(fail));
}
