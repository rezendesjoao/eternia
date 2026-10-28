/**
 * The reverence (a monster rule, docs/bestiario.md): a creature whose passive skill carries `flags.eternia.monster = {
 * rule: "bow", leave }` spares whoever bows to it (the Winter Guardian, the Stone Judge and its statues): its hostile
 * skills don't go at a creature that is [Prone] (a skill aimed at one warns, or is blocked, by the conditions' limits:
 * bestiary/use-checks.mjs). With `leave`, it goes away in the Cleanup Process of a round that ends with every creature of
 * the other side in its combat [Prone] or down (no drops: the token hides and is defeated in the combat), with a line in
 * the chat. Runs on the window that uses the skill (the warning) and on the primary GM (the leaving).
 */
import { L, SYSTEM_ID } from "../settings.mjs";
import { isPrimaryGM } from "../helpers/clients.mjs";
import { actorName, postSummary, wrap } from "../helpers/utils.mjs";
import { isHostile, rulesOn } from "../conditions/rules.mjs";

/** Down: Incapacitated or dead (or gone). */
const down = actor => !actor || actor.statuses.has("incapacitated") || actor.statuses.has("dead");

/** An actor's reverence rule (its skill and the rule), or null. */
export function bowRule(actor) {
  const item = (actor?.items ?? []).find(i => (i.type === "skill") && (i.getFlag(SYSTEM_ID, "monster")?.rule === "bow"));
  return item ? { item, rule: item.getFlag(SYSTEM_ID, "monster") } : null;
}

/** What the reverence says against a skill aimed now (the targets that bowed), for bestiary/use-checks.mjs. */
export function bowIssues(item, actor, targets) {
  const found = (actor?.type === "monster") ? bowRule(actor) : null;
  if (!found || !targets?.length || !isHostile(item) || down(actor)) return [];
  const bowed = targets.map(t => t.document ?? t).filter(t => t.actor?.statuses.has("prone"));
  if (!bowed.length) return [];
  return [L("Bestiary.Bow.Spares", { name: actorName(actor), targets: bowed.map(t => t.name).join(", ") })];
}

/** The Cleanup Process of a combat (primary GM): the ones that leave when everyone bowed. */
async function cleanupBow(combat) {
  const seen = new Set();
  for (const combatant of combat.combatants) {
    const actor = combatant.actor;
    const found = bowRule(actor);
    if (!found?.rule.leave || combatant.defeated || down(actor) || seen.has(actor.uuid)) continue;
    seen.add(actor.uuid);
    const side = combatant.token?.disposition ?? actor.prototypeToken?.disposition ?? -1;
    const foes = combat.combatants.filter(c => c.actor && !c.defeated && !down(c.actor) && ((c.token?.disposition ?? 0) !== side) && !c.token?.hidden);
    if (!foes.length || foes.some(c => !c.actor.statuses.has("prone"))) continue;
    await combatant.update({ defeated: true });
    await actor.setFlag(SYSTEM_ID, "noLoot", true);
    if (combatant.token) await combatant.token.update({ hidden: true });
    await postSummary(found.item.name, [L("Bestiary.Bow.Leaves", { name: actorName(actor) })]);
  }
}

/** Call during the `init` hook. */
export function registerBow() {
  wrap(CONFIG.Combat.documentClass.prototype, "_onPhaseStart", async function (original, phase, round, previous) {
    await original.call(this, phase, round, previous);
    const backwards = !!previous && (round < previous.round);
    if ((phase !== "cleanup") || backwards || !rulesOn() || !isPrimaryGM()) return;
    await cleanupBow(this).catch(err => console.error(`${SYSTEM_ID} | Reverence failed`, err));
  });
}
