/**
 * The statuses that add up (docs/bestiario.md): a skill of a monster with `flags.eternia.monster = { rule: "stack",
 * statuses: [ids] }` makes those statuses, when it gives them (its hits, its effects), add their Rating to the one the
 * target already has, with no top: the cold of the Shadow's touch, a [Weakened] that grows with every touch. The
 * statuses that stack by their own rule (`stack` in conditions/catalog.mjs) already add up, to their top.
 * Run on the window that creates the effect, before the status field takes the highest Rating (helpers/statuses.mjs).
 */
import { SYSTEM_ID } from "../settings.mjs";
import { toInt } from "../helpers/utils.mjs";
import { statusDefinition } from "../helpers/statuses.mjs";
import { rating, rulesOn } from "../conditions/rules.mjs";
import { ruleOf } from "./rules.mjs";

const label = id => game.i18n.localize(`ETERNIA.StatusEffect.${id}`);

/** Whether the statuses of this id that a creature gives add up: a skill of it with the stack rule for them. */
const stacks = (actor, id) => (actor?.items ?? []).some(i => (i.type === "skill") && (ruleOf(i)?.rule === "stack")
  && [].concat(ruleOf(i).statuses ?? []).includes(id));

/** An effect about to be created: the Rating of a status from a creature whose statuses add up goes on top. */
function onPreCreate(effect, data, options, userId) {
  if ((userId !== game.user.id) || !rulesOn()) return;
  const actor = effect.parent;
  const status = effect.getFlag(SYSTEM_ID, "statusData");
  const def = statusDefinition(status?.statusId);
  if (!(actor instanceof Actor) || !def?.rated || def.stack || !(toInt(status.value) > 0)) return;
  const casterUuid = effect.getFlag(SYSTEM_ID, "source")?.casterUuid;
  const caster = casterUuid ? fromUuidSync(casterUuid, { strict: false }) : null;
  if (!stacks(caster, status.statusId)) return;
  const current = rating(actor, status.statusId);
  if (current <= 0) return;
  const value = current + toInt(status.value);
  // The name the status links give it ("Enfraquecido: 3") follows the Rating
  const auto = `${label(status.statusId)}${status.tag ? ` (${status.tag})` : ""}: ${toInt(status.value)}`;
  effect.updateSource({
    [`flags.${SYSTEM_ID}.statusData.value`]: value,
    ...((effect.name === auto) ? { name: auto.replace(/\d+$/, String(value)) } : {})
  });
}

/** Call during the `init` hook. */
export function registerStack() {
  Hooks.on("preCreateActiveEffect", onPreCreate);
}
