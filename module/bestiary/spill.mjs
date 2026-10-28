/**
 * The spill (a monster rule, docs/bestiario.md): a creature whose passive skill carries `flags.eternia.monster = { rule:
 * "spill", when, statuses }` loses its strength when it gets a status (the Kappa of the frozen lakes: knocked [Prone],
 * the water of the dish on its head spills). The first time it gets one of `when` (a status id or a list) in a scene, it
 * also gets `statuses` until the end of the scene, with a line in the chat (`flags.eternia.spilled`: the scene, so it
 * happens once). Runs on the primary GM.
 */
import { L, SYSTEM_ID } from "../settings.mjs";
import { isPrimaryGM } from "../helpers/clients.mjs";
import { actorName, postSummary } from "../helpers/utils.mjs";
import { giveEffects } from "../chat/status-links.mjs";
import { rulesOn } from "../conditions/rules.mjs";
import { statusList } from "./rust.mjs";

const label = id => game.i18n.localize(`ETERNIA.StatusEffect.${id}`);

/** A status came on a creature: the spill rules it carries. */
async function onStatus(actor, effect) {
  const items = actor.items.filter(i => (i.type === "skill") && (i.getFlag(SYSTEM_ID, "monster")?.rule === "spill"));
  for (const item of items) {
    const rule = item.getFlag(SYSTEM_ID, "monster");
    const when = [rule.when ?? []].flat();
    const hit = when.find(id => effect.statuses.has(id));
    if (!hit) continue;
    const scene = (actor.token?.parent ?? canvas?.scene)?.id ?? "";
    const spilled = actor.getFlag(SYSTEM_ID, "spilled") ?? {};
    if (spilled[item.id] === scene) continue;
    await actor.setFlag(SYSTEM_ID, "spilled", { ...spilled, [item.id]: scene });
    const { effects, names } = statusList(rule.statuses, actor);
    if (effects.length) await giveEffects(actor, effects);
    await postSummary(item.name, [L("Bestiary.Spill", { name: actorName(actor), status: label(hit), statuses: names.join(", ") })]);
  }
}

/** Call during the `init` hook. */
export function registerSpill() {
  Hooks.on("createActiveEffect", effect => {
    const actor = effect.parent;
    if (!(actor instanceof Actor) || (actor.type !== "monster") || !effect.statuses?.size || !isPrimaryGM() || !rulesOn()) return;
    onStatus(actor, effect).catch(err => console.error(`${SYSTEM_ID} | Spill failed`, err));
  });
}
