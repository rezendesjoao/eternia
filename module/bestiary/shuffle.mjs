/**
 * The shuffle (a monster rule, docs/bestiario.md): a creature whose passive skill carries `flags.eternia.monster = {
 * rule: "shuffle" }` is badly written, and its writing changes every round (the Erasure that slips out of the Rifts). The
 * skill's own effects are the forms it may take. In each Setup Process of its combat it takes one of them by chance (never
 * the same twice in a row): a copy of that effect on the creature (`flags.eternia.shuffled` = the skill's id), which
 * replaces the one of the round before, with a line in the chat. The form left at the end of the combat goes with it.
 * Runs on the primary GM.
 */
import { L, SYSTEM_ID } from "../settings.mjs";
import { isPrimaryGM } from "../helpers/clients.mjs";
import { actorName, postSummary, wrap } from "../helpers/utils.mjs";
import { rulesOn } from "../conditions/rules.mjs";

/** Down: Incapacitated or dead (or gone). */
const down = actor => !actor || actor.statuses.has("incapacitated") || actor.statuses.has("dead");

/** The shuffle skill of an actor, or null. */
const shuffleSkill = actor => (actor?.items ?? []).find(i => (i.type === "skill") && (i.getFlag(SYSTEM_ID, "monster")?.rule === "shuffle")) ?? null;

/** The form an actor wears now (its shuffled effect), or null. */
export const shuffledOf = actor => (actor?.effects ?? []).find(e => e.getFlag(SYSTEM_ID, "shuffled")) ?? null;

/** Take a new form: one of the skill's effects, by chance, not the one worn now. */
async function reshuffle(actor) {
  const item = shuffleSkill(actor);
  const pool = item ? [...item.effects] : [];
  if (!pool.length) return;
  const worn = shuffledOf(actor);
  const choices = pool.length > 1 ? pool.filter(e => e.name !== worn?.name) : pool;
  const pick = choices[Math.floor(Math.random() * choices.length)];
  if (worn) await worn.delete().catch(() => null);
  const data = pick.toObject();
  delete data._id;
  Object.assign(data, { transfer: false, disabled: false, origin: item.uuid });
  foundry.utils.setProperty(data, `flags.${SYSTEM_ID}.shuffled`, item.id);
  foundry.utils.setProperty(data, `flags.${SYSTEM_ID}.expires`, "endOfScene");
  await actor.createEmbeddedDocuments("ActiveEffect", [data]);
  await postSummary(item.name, [L("Bestiary.Shuffle", { name: actorName(actor), form: pick.name })]);
}

/** The Setup Process of a combat: every badly written creature in it takes a new form. */
async function setupShuffle(combat) {
  const seen = new Set();
  for (const combatant of combat.combatants) {
    const actor = combatant.actor;
    if (!actor || combatant.defeated || down(actor) || seen.has(actor.uuid) || !shuffleSkill(actor)) continue;
    seen.add(actor.uuid);
    await reshuffle(actor);
  }
}

/** Call during the `init` hook. */
export function registerShuffle() {
  wrap(CONFIG.Combat.documentClass.prototype, "_onPhaseStart", async function (original, phase, round, previous) {
    await original.call(this, phase, round, previous);
    const backwards = !!previous && (round < previous.round);
    if ((phase !== "setup") || backwards || !rulesOn() || !isPrimaryGM()) return;
    await setupShuffle(this).catch(err => console.error(`${SYSTEM_ID} | Shuffle failed`, err));
  });
  // The combat ends: the form goes with it
  Hooks.on("deleteCombat", combat => {
    if (!isPrimaryGM()) return;
    for (const combatant of combat.combatants) {
      const worn = shuffledOf(combatant.actor);
      if (worn) worn.delete().catch(() => null);
    }
  });
}
