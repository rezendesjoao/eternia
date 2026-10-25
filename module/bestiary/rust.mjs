/**
 * Rust (a monster rule, docs/bestiario.md): the hits of a skill with `flags.eternia.monster = { rule: "rust", statuses }`
 * give those statuses (the Rust Monster's antennae: [Fissured: 1], that adds up) only to whoever wears metal: an
 * equipped armor or shield of metal. Leather, cloth and wood don't rust. Runs on the window that applied the damage.
 *
 * Metal (`isMetal`, also read by the contact rule, bestiary/contact.mjs: the metal weapon that hits): the item's own
 * `flags.eternia.metal` (true or false) when it has it; else its tags (a blade, a katana, a spear, an axe or a mace, a
 * heavy armor are; a staff, a bow, a crossbow, a whip, an instrument, a light armor aren't); else its name (iron, steel,
 * silver, copper, mail, plates, scales…).
 */
import { L, SYSTEM_ID } from "../settings.mjs";
import { actorName, postSummary, toInt } from "../helpers/utils.mjs";
import { findTag } from "../helpers/tag-catalog.mjs";
import { mainWeapon } from "../helpers/hands.mjs";
import { statusDefinition } from "../helpers/statuses.mjs";
import { giveEffects, statusEffectData } from "../chat/status-links.mjs";
import { rulesOn, sameActor } from "../conditions/rules.mjs";

const label = id => game.i18n.localize(`ETERNIA.StatusEffect.${id}`);

/** Tags of the items made of metal, and of those that aren't. */
const METAL_TAGS = ["Blade", "Katana", "Spear", "Hafted", "Heavy Armor"];
const OTHER_TAGS = ["Staff", "Bow", "Crossbow", "Whip", "Instrument", "Light Armor"];
/** Words of a name that tell the rest apart (a medium armor, a fist weapon, a shield). */
const METAL_WORDS = /ferro|a[çc]o\b|prata|cobre|lat[ãa]o|bronze|malha|cota|placa|lamelar|escama|peitoral|brigandina|bandas|an[ée]is|hamata|soqueira|adaga|katar|jamadahar|baghnakh|metal|iron|steel|silver|copper|brass|mail|plate|scale/i;

/** Whether an item is made of metal. */
export function isMetal(item) {
  if (!item) return false;
  const own = item.flags?.[SYSTEM_ID]?.metal;
  if (typeof own === "boolean") return own;
  const tags = (item.system?.tags ?? []).map(t => findTag(t)?.label ?? String(t));
  if (tags.some(t => METAL_TAGS.includes(t))) return true;
  if (tags.some(t => OTHER_TAGS.includes(t))) return false;
  return METAL_WORDS.test(item.name ?? "");
}

/** The metal an actor wears: its first equipped armor or shield of metal, or null. */
export function wornMetal(actor) {
  return (actor?.items ?? []).find(i => ["armor", "shield"].includes(i.type) && i.system.equipped && isMetal(i)) ?? null;
}

/** Whether a skill strikes with the weapon (Range "Weapon", or a [Weapon / Melee / Ranged Attack] tag). */
function withWeapon(item) {
  if (/weapon/i.test(item?.system?.range ?? "")) return true;
  return (item?.system?.tags ?? []).some(t => ["Weapon Attack", "Melee Attack", "Ranged Attack"].includes(findTag(t)?.label ?? String(t)));
}

/** The metal weapon a skill strikes with: the attacker's main weapon, when the skill uses it and it is metal; or null. */
export function metalWeapon(item, attacker) {
  if (!item || !withWeapon(item)) return null;
  const weapon = mainWeapon(attacker);
  return isMetal(weapon) ? weapon : null;
}

/** Statuses to give from a rule's list (the Ratings worked out): effect data, and their names for the chat. */
export function statusList(list, caster, { infinite = false } = {}) {
  const effects = [];
  const names = [];
  for (const { statusId, value = null } of list ?? []) {
    if (!statusId) continue;
    const rated = !!statusDefinition(statusId)?.rated;
    const n = rated ? (toInt(value) || 1) : null;
    const effect = statusEffectData(statusId, n, "", { caster, expires: "endOfScene" });
    if (infinite) effect.flags[SYSTEM_ID].infinite = true;
    effects.push(effect);
    names.push(rated ? `${label(statusId)} ${n}` : label(statusId));
  }
  return { effects, names };
}

/** A damage card of a skill that rusts was applied (on the window that applied it): the metal the target wears rusts. */
async function onDamaged(actor, card, { amount = 0, absorbed = 0, attacker = null, item = null } = {}) {
  const rule = item?.getFlag?.(SYSTEM_ID, "monster");
  if (!rulesOn() || (rule?.rule !== "rust") || card?.recovery || !actor?.isOwner || !attacker || sameActor(attacker, actor)) return;
  if ((toInt(amount) <= 0) && (toInt(absorbed) <= 0)) return;
  const metal = wornMetal(actor);
  if (!metal) return;
  const { effects, names } = statusList(rule.statuses, attacker);
  if (!effects.length || !(await giveEffects(actor, effects))) return;
  await postSummary(item.name, [L("Bestiary.Rust.Armor", { name: actorName(actor), piece: metal.name, statuses: names.join(", ") })]);
}

/** Call during the `init` hook. */
export function registerRust() {
  Hooks.on("eternia.damaged", (actor, card, context) => onDamaged(actor, card, context ?? {}).catch(err => console.error(`${SYSTEM_ID} | Rust failed`, err)));
}
