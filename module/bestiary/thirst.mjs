/**
 * The thirst (a monster rule, docs/bestiario.md): a creature whose passive skill carries `flags.eternia.monster = { rule:
 * "thirst", steps }` must draw blood every round (the Redcap, whose cap dies dry). In each Cleanup Process of its combat,
 * if none of its damage cards took HP from a creature of the other side in that round, it goes one step drier and gets
 * the statuses of that step until the end of the scene (default: [Weakened: 3], then [Slowed]); past the last step it
 * falls (0 HP, Incapacitated). Drawing blood again ends the statuses of the thirst and starts over. The record is
 * `flags.eternia.thirst = { combat, round, dry }` (the round of its last blood); the window that applied the damage asks
 * the GM when it doesn't own the monster (`bestiaryThirst`). The steps' effects carry `flags.eternia.thirstStep`.
 */
import { L, SYSTEM_ID } from "../settings.mjs";
import { isPrimaryGM } from "../helpers/clients.mjs";
import { actorName, postSummary, toInt, wrap } from "../helpers/utils.mjs";
import { giveEffects } from "../chat/status-links.mjs";
import { rulesOn, sameActor } from "../conditions/rules.mjs";
import { registerHandler, request } from "../piles/pile-socket.mjs";
import { statusList } from "./rust.mjs";

/** The steps when the rule doesn't give them. */
const STEPS = [[{ statusId: "weakened", value: 3 }], [{ statusId: "slowed" }]];

/** Down: Incapacitated or dead (or gone). */
const down = actor => !actor || actor.statuses.has("incapacitated") || actor.statuses.has("dead");

/** The thirst skill of an actor, or null. */
const thirstSkill = actor => (actor?.items ?? []).find(i => (i.type === "skill") && (i.getFlag(SYSTEM_ID, "monster")?.rule === "thirst")) ?? null;

/** The combat an actor fights in now (a started one), or null. */
function combatOf(actor) {
  const fights = c => c?.started && c.combatants.some(cb => cb.actor && sameActor(cb.actor, actor));
  return fights(game.combat) ? game.combat : (game.combats?.find(fights) ?? null);
}

/** Blood drawn (GM): the round is kept, the thirst starts over, its statuses end. */
async function quench({ monsterUuid }) {
  const monster = fromUuidSync(monsterUuid ?? "");
  if (!(monster instanceof Actor) || !thirstSkill(monster)) return { ok: true };
  const combat = combatOf(monster);
  const old = monster.getFlag(SYSTEM_ID, "thirst") ?? {};
  await monster.setFlag(SYSTEM_ID, "thirst", { combat: combat?.id ?? "", round: combat?.round ?? 0, dry: 0 });
  const steps = monster.effects.filter(e => e.getFlag(SYSTEM_ID, "thirstStep")).map(e => e.id);
  if (steps.length) await monster.deleteEmbeddedDocuments("ActiveEffect", steps).catch(() => null);
  if (toInt(old.dry) > 0) await postSummary(thirstSkill(monster).name, [L("Bestiary.Thirst.Quenched", { name: actorName(monster) })]);
  return { ok: true };
}

/** A damage card was applied (on the window that applied it): a thirsty monster that took HP drew blood. */
function onDamaged(actor, card, { amount = 0, attacker = null } = {}) {
  if (!rulesOn() || card?.recovery || !attacker || (toInt(amount) <= 0) || sameActor(attacker, actor) || !thirstSkill(attacker)) return;
  request("bestiaryThirst", { monsterUuid: attacker.uuid }).catch(err => console.error(`${SYSTEM_ID} | Thirst failed`, err));
}

/** The Cleanup Process of a combat (primary GM): every thirsty monster that drew no blood this round dries a step. */
async function cleanupThirst(combat) {
  const seen = new Set();
  for (const combatant of combat.combatants) {
    const actor = combatant.actor;
    const item = thirstSkill(actor);
    if (!item || combatant.defeated || down(actor) || seen.has(actor.uuid)) continue;
    seen.add(actor.uuid);
    const flag = actor.getFlag(SYSTEM_ID, "thirst") ?? {};
    if ((flag.combat === combat.id) && (toInt(flag.round) === combat.round)) continue;
    const rule = item.getFlag(SYSTEM_ID, "monster");
    const steps = Array.isArray(rule.steps) && rule.steps.length ? rule.steps : STEPS;
    const dry = (flag.combat === combat.id ? toInt(flag.dry) : 0) + 1;
    await actor.setFlag(SYSTEM_ID, "thirst", { combat: combat.id, round: flag.combat === combat.id ? toInt(flag.round) : 0, dry });
    if (dry > steps.length) {
      await actor.update({ "system.health.value": 0 });
      if (!actor.statuses.has("incapacitated")) await actor.toggleStatusEffect("incapacitated", { active: true });
      await postSummary(item.name, [L("Bestiary.Thirst.Dead", { name: actorName(actor) })]);
      continue;
    }
    const { effects, names } = statusList(steps[dry - 1], actor);
    for (const effect of effects) effect.flags[SYSTEM_ID].thirstStep = dry;
    if (effects.length) await giveEffects(actor, effects);
    await postSummary(item.name, [L("Bestiary.Thirst.Dry", { name: actorName(actor), n: dry, left: steps.length - dry + 1, statuses: names.join(", ") })]);
  }
}

/** Call during the `init` hook. */
export function registerThirst() {
  registerHandler("bestiaryThirst", payload => quench(payload));
  Hooks.on("eternia.damaged", (actor, card, context) => onDamaged(actor, card, context ?? {}));
  wrap(CONFIG.Combat.documentClass.prototype, "_onPhaseStart", async function (original, phase, round, previous) {
    await original.call(this, phase, round, previous);
    const backwards = !!previous && (round < previous.round);
    if ((phase !== "cleanup") || backwards || !rulesOn() || !isPrimaryGM()) return;
    await cleanupThirst(this).catch(err => console.error(`${SYSTEM_ID} | Thirst failed`, err));
  });
}
