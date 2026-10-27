/**
 * A monster's (Menor) and a boss's [Destino 1] (docs/bestiario.md), data of its skill:
 * - `flags.eternia.minor = { damage }` ("(Menor): +5 de dano.") or `{ statuses: [{ statusId, value }] }` ("(Menor): o
 *   alvo fica [Derrubado]."): used in its own Main Process with its Minor Action free, the use spends the Minor Action
 *   too (automation/use.mjs) and the blow gets the bonus: the damage on its roll (chat/cards.mjs), the statuses on whoever
 *   it hits (helpers/combat-cards.mjs). World setting monsterMinor.
 * - `flags.eternia.fateOption = { fate, mode, range, statuses }`: when the skill is used, its user's owner is asked
 *   whether it spends the Fate: "engaged" (the blow reaches every Adventurer engaged with it, who become the targets;
 *   asked when there are two or more), "area" (an Area of choice: asked when two or more creatures are targeted), "status"
 *   (the statuses go on whoever the blow hits). The Rifts don't (their Fate is a clock). The Fate goes back with the
 *   use's Undo.
 * Both stay on the use's record (`usage.minor`, `usage.fateOption`), which the blow's cards find by the skill card.
 */
import { L, SYSTEM_ID, setting } from "../settings.mjs";
import { actorName, combatOf, confirm, escape, isAdventurer, toInt } from "../helpers/utils.mjs";
import { squaresBetween } from "./nearest.mjs";

/** The statuses that take a creature out of the reckoning. */
const GONE = ["dead", "incapacitated", "absent"];

/** A list of statuses as the cards keep them. */
const statusList = list => [].concat(list ?? []).filter(s => s?.statusId)
  .map(s => ({ statusId: s.statusId, value: toInt(s.value) || null }));

/** "[Derrubado]", "[Envenenado: 7]". */
const statusText = list => list.map(s => {
  const name = game.i18n.localize(`ETERNIA.StatusEffect.${s.statusId}`);
  return s.value ? `[${name}: ${s.value}]` : `[${name}]`;
}).join(", ");

/**
 * A skill's (Menor), or null.
 * @param {Item} item
 * @returns {{damage: number, statuses: object[]}|null}
 */
export function minorOf(item) {
  const minor = item?.flags?.[SYSTEM_ID]?.minor;
  if (!minor) return null;
  const damage = toInt(minor.damage);
  const statuses = statusList(minor.statuses);
  return (damage || statuses.length) ? { damage, statuses } : null;
}

/** What a (Menor) gives, for the card's line: "+5 de dano", "[Derrubado]". */
export function minorText(minor) {
  return [minor?.damage ? L("Minor.Damage", { n: minor.damage }) : "", statusText(statusList(minor?.statuses))]
    .filter(Boolean).join(", ");
}

/** A skill's [Destino N], or null. */
function fateOptionOf(item) {
  const option = item?.flags?.[SYSTEM_ID]?.fateOption;
  if (!option || !["engaged", "area", "status"].includes(option.mode)) return null;
  return { fate: Math.max(1, toInt(option.fate) || 1), mode: option.mode, range: toInt(option.range), statuses: statusList(option.statuses) };
}

/** The token of an actor: a token actor's own, else its first active one (the viewed scene first). */
function tokenOf(actor) {
  if (actor?.token) return actor.token;
  const tokens = actor?.getActiveTokens?.(false, true) ?? [];
  return tokens.find(t => t.parent === canvas?.scene) ?? tokens[0] ?? null;
}

/**
 * The Adventurers engaged with a creature's token: in its squares (their neighbours too, with closeReach); in a combat,
 * only those who fight in it.
 */
function engagedWith(actor) {
  const own = tokenOf(actor);
  if (!own) return [];
  const reach = setting("closeReach") ? 1 : 0;
  const combat = combatOf(actor);
  const fighting = combat ? new Set(combat.combatants.map(c => c.tokenId)) : null;
  return own.parent.tokens.filter(t => (t !== own) && t.actor && !t.hidden && (!fighting || fighting.has(t.id))
    && isAdventurer(t.actor, t) && !GONE.some(id => t.actor.statuses.has(id)) && (squaresBetween(own, t) <= reach));
}

/** The owner of a creature with Fate to spend (a character's, or a monster's that isn't a Rift). */
function hasFate(actor, need) {
  if (!actor?.isOwner || !["character", "monster"].includes(actor.type) || actor.getFlag(SYSTEM_ID, "rift")) return false;
  return toInt(actor._source.system.fate?.value) >= need;
}

/**
 * Ask whether the user of a skill spends its Fate on the skill's [Destino N], when it would change the blow. On a yes,
 * the "engaged" option targets the engaged Adventurers now (the attack card reads the targets).
 * @param {Item} item
 * @returns {Promise<{fate: number, mode: string, statuses: object[]}|null>}   The option taken, or null.
 */
export async function askFateOption(item) {
  const actor = item.actor;
  const option = fateOptionOf(item);
  if (!option || !setting("fate") || !hasFate(actor, option.fate)) return null;
  const engaged = (option.mode === "engaged") ? engagedWith(actor) : [];
  const targets = [...game.user.targets];
  if ((option.mode === "engaged") && (engaged.length < 2)) return null;
  if ((option.mode === "area") && (targets.length < 2)) return null;

  const fate = toInt(actor._source.system.fate.value);
  const line = {
    engaged: () => L("FateOption.Engaged", { name: actorName(actor), targets: engaged.map(t => t.name).join(", ") }),
    area: () => L("FateOption.Area", { range: option.range || "—", targets: targets.map(t => t.name).join(", ") }),
    status: () => L("FateOption.Status", { statuses: statusText(option.statuses) })
  }[option.mode]();
  const yes = await confirm({
    title: L("FateOption.Title", { n: option.fate }),
    icon: "fa-solid fa-star",
    img: item.img,
    eyebrow: L("FateOption.Eyebrow", { name: actorName(actor), fate }),
    heading: item.name,
    lines: [{ html: escape(line) }],
    question: L("FateOption.Question", { n: option.fate }),
    yes: L("FateOption.Spend", { n: option.fate }),
    yesIcon: "fa-solid fa-star",
    no: L("FateOption.Keep")
  });
  if (!yes) return null;
  if (option.mode === "engaged") canvas.tokens?.setTargets(engaged.filter(t => t.object).map(t => t.id), { mode: "replace" });
  return { fate: option.fate, mode: option.mode, statuses: option.statuses };
}

/** What a [Destino N] taken gives, for the card's line. */
export function fateOptionText(option) {
  if (!option) return "";
  return L(`FateOption.Taken.${option.mode}`, { n: option.fate, statuses: statusText(statusList(option.statuses)) });
}

/* -------------------------------------------- */
/*  The blow                                    */
/* -------------------------------------------- */

/** The use record of the skill card an attack card was rolled from (automation/use.mjs), unless it was undone. */
function usageOf(attackMessage) {
  const id = attackMessage?.getFlag(SYSTEM_ID, "useMessageId");
  const record = id ? game.messages.get(id)?.getFlag(SYSTEM_ID, "usage") : null;
  return (record && !record.undone) ? record : null;
}

/**
 * The damage the use's (Menor) adds to the blow's roll, as a roll bonus.
 * @param {Item} item
 * @param {ChatMessage|null} attackMessage
 * @returns {{label: string, dice: number, mod: number}[]}
 */
export function minorBonuses(item, attackMessage) {
  const record = usageOf(attackMessage);
  if (!record || (record.itemUuid !== item?.uuid) || item.system.damage?.recovery) return [];
  const damage = toInt(record.minor?.damage);
  return damage ? [{ label: L("Minor.Label"), dice: 0, mod: damage }] : [];
}

/**
 * The statuses the use's (Menor) and [Destino N] give to whoever the blow hits.
 * @param {Item} item
 * @param {ChatMessage|null} attackMessage
 * @returns {{statusId: string, value: number|null, name: string}[]}
 */
export function useHitStatuses(item, attackMessage) {
  const record = usageOf(attackMessage);
  if (!record || (record.itemUuid !== item?.uuid)) return [];
  return [
    ...statusList(record.minor?.statuses).map(s => ({ ...s, name: `${item.name} (${L("Minor.Label")})` })),
    ...statusList(record.fateOption?.statuses).map(s => ({ ...s, name: `${item.name} (${L("FateOption.Short", { n: record.fateOption.fate })})` }))
  ];
}
