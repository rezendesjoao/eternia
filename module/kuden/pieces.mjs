/**
 * Kuden pieces (house rule): signature skills paid with the
 * same skill picks as the official ones.
 *
 * - A piece is a skill with the [Kuden] tag and the flag `kuden`: { piece, restriction, restrictionText,
 *   origin, ruler, resource }. The pieces and what they cost in Kuden Points (PK):
 *     core         the Core, free (one per character)
 *     technique    2 PK per Skill Rank when Combat, 1 when General
 *     gift         1 PK
 *     greaterGift  2 PK; 1 with a Medium or Heavy Restriction
 *     apex         4 PK (one per character)
 * - Paying a piece adds the system's pick marks to it (`flags.eternia.skillPicks`, see the system's skill
 *   browser): a Combat pick is 2 PK, a General pick 1 PK. The skill browser then counts those picks as
 *   spent, deleting the piece gives them back, and lowering the CR offers to undo them like any pick. What
 *   the picks pay beyond the cost stays saved (at most 1 PK, as in the rules).
 * - The Core may define the Resource, from 0 to 5: its value is set on the sheet (manual) or follows the
 *   hour of the scene (env.mjs). The conditions in conditions.mjs read it.
 * - The color gifts (no rules effect) are lines in the actor flag `kuden.color`.
 */
import { L, SYSTEM_ID } from "../settings.mjs";
import { getPendingSkills, PICK_FLAG } from "../apps/skill-browser.mjs";
import { toInt } from "../helpers/utils.mjs";
import { envLabel, envOf, HOURS } from "./env.mjs";

export const KUDEN_TAG = "Kuden";
export const FLAG = "kuden";
export const PIECES = ["core", "technique", "gift", "greaterGift", "apex"];
export const TIERS = ["light", "medium", "heavy"];
export const RESOURCE_MAX = 5;

/** The Resource of a Core that follows the hour, before it is edited: the sun of Escanor. */
export const DEFAULT_CURVE = Object.freeze({ lateNight: 0, dawn: 1, morning: 3, noon: 5, afternoon: 3, dusk: 1, night: 0 });

/** PK of a pick. */
const PICK_PK = { Combat: 2, General: 1 };

/** A new piece: its subtype, Timing, Limit, maximum Skill Rank and image. */
const NEW_PIECE = {
  core: { subtype: "Combat", timing: "Constant", limit: "-", max: 1, img: "icons/magic/symbols/runes-star-pentagon-orange.webp" },
  technique: { subtype: "Combat", timing: "Major", limit: "-", max: 5, img: "icons/skills/melee/strike-sword-slashing-red.webp" },
  gift: { subtype: "General", timing: "Constant", limit: "-", max: 1, img: "icons/magic/light/explosion-star-small-blue-yellow.webp" },
  greaterGift: { subtype: "Combat", timing: "Constant", limit: "-", max: 1, img: "icons/magic/light/explosion-star-glow-orange.webp" },
  apex: { subtype: "Combat", timing: "Major", limit: "1/Scenario", max: 1, img: "icons/magic/light/beam-rays-yellow-blue.webp" }
};

/* -------------------------------------------- */
/*  Pieces and costs                            */
/* -------------------------------------------- */

/** The Kuden flag of a skill (or skill data), or null when it is not a piece. */
export function kudenOf(item) {
  if (item?.type !== "skill") return null;
  const data = item.flags?.[SYSTEM_ID]?.[FLAG];
  return (data && PIECES.includes(data.piece)) ? data : null;
}

export const isKuden = item => !!kudenOf(item);
export const pieceOf = item => kudenOf(item)?.piece ?? null;

const srOf = item => Math.max(1, toInt(item.system?.skillRank?.value));
const rankOf = actor => Math.max(1, toInt(actor?.system?.infos?.crank));

/** What a piece costs, in PK. */
export function costOf(item) {
  const kuden = kudenOf(item);
  switch (kuden?.piece) {
    case "technique": return srOf(item) * ((item.system.subtype === "General") ? 1 : 2);
    case "gift": return 1;
    case "greaterGift": return ["medium", "heavy"].includes(kuden.restriction) ? 1 : 2;
    case "apex": return 4;
    default: return 0;
  }
}

/** The system's pick marks of a skill. */
export function marksOf(item) {
  const marks = item?.flags?.eternia?.[PICK_FLAG];
  return Array.isArray(marks) ? marks : [];
}

/** PK paid for a piece: its pick marks. */
export const paidOf = item => marksOf(item).reduce((n, mark) => n + (PICK_PK[mark?.subtype] ?? 0), 0);

/** The Kuden pieces of an actor. */
export const piecesOf = actor => (actor?.items?.contents ?? []).filter(isKuden);

/** The Core of an actor (the first one). */
export const coreOf = actor => piecesOf(actor).find(item => pieceOf(item) === "core") ?? null;

/* -------------------------------------------- */
/*  Ledger and payment                          */
/* -------------------------------------------- */

/**
 * The PK of an actor: what the pieces cost and what their picks paid, the pending picks and the issues.
 * @param {Actor} actor
 */
export function ledgerOf(actor) {
  const pieces = piecesOf(actor);
  const cost = pieces.reduce((n, item) => n + costOf(item), 0);
  const paid = pieces.reduce((n, item) => n + paidOf(item), 0);
  const kept = paid - cost;
  const pending = getPendingSkills(actor);
  const count = piece => pieces.filter(item => pieceOf(item) === piece).length;
  const warnings = [];
  if (kept < 0) warnings.push(L((pending.Combat + pending.General) ? "Kuden.Ledger.Missing" : "Kuden.Ledger.MissingNoPicks", { n: -kept }));
  if (kept > 1) warnings.push(L("Kuden.Ledger.Surplus", { n: kept }));
  if (count("core") > 1) warnings.push(L("Kuden.Ledger.TwoCores"));
  if (count("apex") > 1) warnings.push(L("Kuden.Ledger.TwoApexes"));
  if (pieces.length && !count("core")) warnings.push(L("Kuden.Ledger.NoCore"));
  const canSettle = ((kept < 0) && ((pending.Combat + pending.General) > 0)) || (kept > 1);
  return { pieces, cost, paid, kept, pending, warnings, canSettle };
}

/** The mark of a pick spent on a piece (see the system's skill browser): new, or the raise of a Technique. */
function newMark(item, marks, subtype, rank) {
  const kuden = kudenOf(item);
  if (kuden?.piece !== "technique") return { rank, subtype, kind: "new" };
  // The Skill Rank this pick pays for: a Combat pick pays one rank of a Combat Technique, a General pick half of one.
  const perRank = (item.system.subtype === "General") ? 1 : 2;
  const paidRanks = Math.floor(marks.reduce((n, m) => n + (PICK_PK[m?.subtype] ?? 0), 0) / perRank);
  return paidRanks ? { rank, subtype, kind: "raise", fromSR: paidRanks } : { rank, subtype, kind: "new" };
}

/**
 * Settle the PK: pay what the pieces lack with the pending picks (a Combat pick for each 2 PK, a General pick
 * for what is left, a Combat one when there is no General), then give back the picks paid beyond the cost
 * and the saved point.
 * @param {Actor} actor
 * @returns {Promise<{paid: number, cost: number, missing: number}>}
 */
export async function settle(actor) {
  const pieces = piecesOf(actor);
  const marks = new Map(pieces.map(item => [item.id, [...marksOf(item)]]));
  const pending = { ...getPendingSkills(actor) };
  const rank = rankOf(actor);
  const value = id => marks.get(id).reduce((n, m) => n + (PICK_PK[m?.subtype] ?? 0), 0);
  const total = () => pieces.reduce((n, item) => n + value(item.id), 0);
  const cost = pieces.reduce((n, item) => n + costOf(item), 0);

  // Pay: the pieces that lack the most first.
  const lacking = () => pieces.map(item => ({ item, short: costOf(item) - value(item.id) })).filter(p => p.short > 0)
    .sort((a, b) => b.short - a.short);
  for (const { item } of lacking()) {
    let short = costOf(item) - value(item.id);
    while ((short > 0) && ((cost - total()) > 0)) {
      let subtype = null;
      if ((short >= 2) && (pending.Combat > 0)) subtype = "Combat";
      else if (pending.General > 0) subtype = "General";
      else if (pending.Combat > 0) subtype = "Combat";
      if (!subtype) break;
      pending[subtype] -= 1;
      const list = marks.get(item.id);
      list.push(newMark(item, list, subtype, rank));
      short -= PICK_PK[subtype];
    }
  }

  // Give back: a pick worth no more than the surplus, from the pieces that paid the most beyond their cost.
  let surplus = total() - cost;
  while (surplus > 1) {
    const over = pieces.map(item => ({ item, over: value(item.id) - costOf(item) })).filter(p => p.over > 0)
      .sort((a, b) => b.over - a.over);
    let removed = false;
    for (const { item } of over) {
      const list = marks.get(item.id);
      const index = list.findLastIndex(m => (PICK_PK[m?.subtype] ?? 0) <= surplus);
      if (index < 0) continue;
      surplus -= PICK_PK[list[index].subtype] ?? 0;
      list.splice(index, 1);
      removed = true;
      break;
    }
    if (!removed) break;
  }

  const updates = pieces.filter(item => marks.get(item.id).length !== marksOf(item).length
      || marks.get(item.id).some((m, i) => m !== marksOf(item)[i]))
    .map(item => ({ _id: item.id, [`flags.eternia.${PICK_FLAG}`]: marks.get(item.id) }));
  if (updates.length) await actor.updateEmbeddedDocuments("Item", updates);
  const paid = total();
  return { paid, cost, missing: Math.max(0, cost - paid) };
}

/**
 * Create a piece on the actor (a skill with the Kuden flag and tag), pay it and open its sheet.
 * @param {Actor} actor
 * @param {string} piece
 * @returns {Promise<Item|null>}
 */
export async function createPiece(actor, piece) {
  const base = NEW_PIECE[piece];
  if (!base || !actor?.isOwner) return null;
  const [item] = await actor.createEmbeddedDocuments("Item", [{
    name: L(`Kuden.New.${piece}`),
    type: "skill",
    img: base.img,
    system: {
      subtype: base.subtype,
      tags: [KUDEN_TAG],
      timing: base.timing,
      limit: base.limit,
      cost: "-",
      skillRank: { value: 1, max: base.max }
    },
    flags: { [SYSTEM_ID]: { [FLAG]: { piece, restriction: "", restrictionText: "", origin: "", ruler: "" } } }
  }], { eterniaKudenNew: true });
  if (!item) return null;
  await announceSettle(actor);
  item.sheet?.render(true);
  return item;
}

/**
 * +1 / −1 Skill Rank of a Technique (never beyond its maximum or the CR), then settle the PK.
 * @param {Item} item
 * @param {number} delta
 */
export async function changeRank(item, delta) {
  const actor = item?.actor;
  if (!actor?.isOwner || (pieceOf(item) !== "technique")) return;
  const sr = srOf(item), max = Math.max(1, toInt(item.system.skillRank?.max));
  const next = Math.clamp(sr + delta, 1, Math.min(max, rankOf(actor)));
  if (next === sr) return ui.notifications.warn(L(delta > 0 ? "Kuden.Sheet.AtMax" : "Kuden.Sheet.AtMin"));
  await item.update({ "system.skillRank.value": next });
  await announceSettle(actor);
}

/** Settle the PK and say when something is still missing. */
export async function announceSettle(actor) {
  const { missing } = await settle(actor);
  if (missing) ui.notifications.warn(L("Kuden.Ledger.NoPicks", { n: missing }));
  return missing;
}

/* -------------------------------------------- */
/*  Resource                                    */
/* -------------------------------------------- */

/**
 * The Resource the actor's Core defines, or null: { name, max, source, value, curve, dark, resetOnScene, hour }.
 * @param {Actor} actor
 */
export function resourceOf(actor) {
  const def = kudenOf(coreOf(actor))?.resource;
  if (!def?.name) return null;
  const max = Math.clamp(toInt(def.max) || RESOURCE_MAX, 1, RESOURCE_MAX);
  const source = (def.source === "hour") ? "hour" : "manual";
  const curve = Object.fromEntries(HOURS.map(h => [h, Math.clamp(toInt(def.curve?.[h] ?? DEFAULT_CURVE[h]), 0, max)]));
  let value, hour = null;
  if (source === "hour") {
    const env = envOf(actor);
    hour = env.hour;
    value = (def.dark && env.darkness) ? 0 : curve[env.hour];
  }
  else value = toInt(actor.flags?.[SYSTEM_ID]?.[FLAG]?.value);
  return { name: String(def.name), max, source, value: Math.clamp(value, 0, max), curve, hour, dark: !!def.dark, resetOnScene: !!def.resetOnScene };
}

/** Set the value of a manual Resource. */
export async function setResource(actor, value) {
  const resource = resourceOf(actor);
  if (!resource || (resource.source !== "manual") || !actor.isOwner) return;
  const next = Math.clamp(toInt(value), 0, resource.max);
  if (next !== resource.value) await actor.setFlag(SYSTEM_ID, `${FLAG}.value`, next);
}

/** End of a scene: a manual Resource marked so goes back to 0. */
export async function kudenEndScene(actor) {
  const resource = resourceOf(actor);
  if (resource?.resetOnScene && (resource.source === "manual") && resource.value) {
    await actor.setFlag(SYSTEM_ID, `${FLAG}.value`, 0);
  }
}

/* -------------------------------------------- */
/*  Color gifts                                 */
/* -------------------------------------------- */

export function colorOf(actor) {
  const list = actor?.flags?.[SYSTEM_ID]?.[FLAG]?.color;
  return Array.isArray(list) ? list.map(String) : [];
}

export async function setColor(actor, list) {
  if (actor?.isOwner) await actor.setFlag(SYSTEM_ID, `${FLAG}.color`, list.map(s => String(s).trim()).filter(Boolean));
}

/* -------------------------------------------- */
/*  Sheet                                       */
/* -------------------------------------------- */

/**
 * Data of the Kuden tab of the character sheet (templates/character/kuden.hbs).
 * @param {Actor} actor
 * @param {object} options
 * @param {boolean} options.editable
 * @param {Function} options.term   Field translator of the sheet (Timing, Cost, Limit)
 */
export function kudenContext(actor, { editable, term }) {
  const ledger = ledgerOf(actor);
  const tier = item => kudenOf(item)?.restriction;
  const row = item => {
    const s = item.system, kuden = kudenOf(item);
    const max = toInt(s.skillRank?.max), sr = srOf(item);
    return {
      id: item.id,
      name: item.name,
      img: item.img,
      piece: kuden.piece,
      technique: kuden.piece === "technique",
      sr: (kuden.piece === "technique") ? `${sr}/${Math.max(max, 1)}` : "",
      cost: costOf(item),
      paid: paidOf(item),
      unpaid: paidOf(item) < costOf(item),
      tier: TIERS.includes(tier(item)) ? L(`Kuden.Tier.${tier(item)}`) : "",
      tierId: tier(item),
      restriction: kuden.restrictionText ?? "",
      timing: term("timing", s.timing),
      limit: (s.limit && (s.limit !== "-")) ? term("limit", s.limit) : "",
      subtype: game.i18n.localize(`ETERNIA.Skill.Type.${s.subtype}`)
    };
  };
  const core = coreOf(actor);
  const resource = resourceOf(actor);
  const groups = ["technique", "gift", "greaterGift", "apex"].map(piece => ({
    piece,
    label: L(`Kuden.Pieces.${piece}`),
    hint: L(`Kuden.PieceHint.${piece}`),
    rows: ledger.pieces.filter(item => pieceOf(item) === piece).map(row)
  }));
  const color = colorOf(actor);
  return {
    editable,
    core: core ? row(core) : null,
    resource: resource && {
      ...resource,
      pips: Array.from({ length: resource.max }, (_, i) => ({ value: i + 1, on: i < resource.value })),
      manual: resource.source === "manual",
      canEdit: editable && (resource.source === "manual"),
      sourceLabel: (resource.source === "hour")
        ? L("Kuden.Sheet.ResourceHour", { hour: L(`Kuden.Hour.${resource.hour}`) })
        : L("Kuden.Source.manual")
    },
    ledger: {
      paid: ledger.paid, cost: ledger.cost, kept: ledger.kept,
      pending: L("Kuden.Ledger.Pending", { combat: ledger.pending.Combat, general: ledger.pending.General }),
      warnings: ledger.warnings, canSettle: editable && ledger.canSettle
    },
    groups,
    color: color.map((text, index) => ({ text, index })),
    colorOver: color.length > 3,
    env: envLabel(envOf(actor))
  };
}
