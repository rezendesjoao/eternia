/**
 * Contact (a monster rule, docs/bestiario.md): a monster whose skill carries `flags.eternia.monster = { rule: "contact",
 * statuses, close, metal, infinite }` gives those statuses (`[{ statusId, value }]`) to whoever hurts it with a damage
 * card, it as their source: only with a close attack (`close`: the Mimic's glue, [Grappled]), only with a metal weapon
 * (`metal`: the Rust Monster eats the edge, [Weakened]; bestiary/rust.mjs tells the metal). With `infinite`, they last
 * until the end of the scene or a Major Action of the Livrar-se (conditions/lasting.mjs), not by their own rule.
 * Unlike `struckStatus` (conditions/forms.mjs), it asks how the blow came. Runs on the window that applied the damage.
 */
import { L, SYSTEM_ID } from "../settings.mjs";
import { actorName, postSummary, toInt } from "../helpers/utils.mjs";
import { giveEffects } from "../chat/status-links.mjs";
import { isCloseAttack } from "../conditions/rolls.mjs";
import { rulesOn, sameActor } from "../conditions/rules.mjs";
import { metalWeapon, statusList } from "./rust.mjs";

/** A damage card hurt a monster with the contact rule: whoever struck it gets the statuses. */
async function onDamaged(actor, card, { amount = 0, absorbed = 0, attacker = null, item = null } = {}) {
  if (!rulesOn() || card?.recovery || !actor?.isOwner || !attacker || sameActor(attacker, actor)) return;
  if ((toInt(amount) <= 0) && (toInt(absorbed) <= 0)) return;
  const skills = (actor.items ?? []).filter(i => (i.type === "skill") && (i.getFlag(SYSTEM_ID, "monster")?.rule === "contact"));
  for (const skill of skills) {
    const rule = skill.getFlag(SYSTEM_ID, "monster");
    if (rule.close && !isCloseAttack(item, attacker)) continue;
    const weapon = rule.metal ? metalWeapon(item, attacker) : null;
    if (rule.metal && !weapon) continue;
    const { effects, names } = statusList(rule.statuses, actor, { infinite: !!rule.infinite });
    if (!effects.length || !(await giveEffects(attacker, effects))) continue;
    const line = weapon
      ? L("Bestiary.Contact.Weapon", { name: actorName(attacker), weapon: weapon.name, by: actorName(actor), statuses: names.join(", ") })
      : L("Bestiary.Contact.Given", { name: actorName(attacker), by: actorName(actor), statuses: names.join(", ") });
    await postSummary(skill.name, [line]);
  }
}

/** Call during the `init` hook. */
export function registerContact() {
  Hooks.on("eternia.damaged", (actor, card, context) => onDamaged(actor, card, context ?? {}).catch(err => console.error(`${SYSTEM_ID} | Contact failed`, err)));
}
