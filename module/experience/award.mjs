/**
 * The XP of the monsters (docs/matematica.md, section 10). When a monster falls, the character who felled it gets its
 * XP, shared with its party on the scene (party/state.mjs); a boss, with every character of its fight too (the raid's
 * rule: no party leaves a floor's boss with nothing). On the primary GM, a moment after the fall, when the felling
 * attacker is known (the same `fellerOf` of the drops). A creature [Dominated] by a character gives its kills to its
 * master; a monster felled by nobody, by a monster or by a character with no player gives nothing.
 *
 * A monster gives its XP once (`flags.eternia.xpGiven`, cleared by the card's Undo) and never when it came after its
 * combat started (the drops' `noLoot`: a boss's summons, a Rift's waves, the halves of what splits). A Rift gives its
 * scene when it closes, to whoever closed it; a Stray saved, to whoever saved it.
 *
 * What a monster gives: `flags.eternia.xp` (the compendium's creatures carry it, from the economy's weights; the GM can
 * change it in the Itens Deixados tab), else its NP and its kind (the tags Boss and Mob). The share: shareXp
 * (experience/data.mjs), then the boosts of each one (experience/boosts.mjs). The card goes to the players of whoever
 * got XP and to the GMs, with the GM's Undo. The XP goes up with `{ eterniaXpGain }`, which makes every window show the
 * "+N XP" over the tokens; an NP reached raises the NP by itself (experience/level.mjs).
 */
import { L, SYSTEM_ID } from "../settings.mjs";
import { isPrimaryGM } from "../helpers/clients.mjs";
import { actorName, toInt } from "../helpers/utils.mjs";
import { sourcesOf } from "../conditions/rules.mjs";
import { cameLate, fellerOf } from "../bestiary/drops.mjs";
import { isRift } from "../bestiary/rifts.mjs";
import { partyOf } from "../party/state.mjs";
import { MAX_PARTY, monsterXpValue, shareXp, xpProgress } from "./data.mjs";
import { restoreBoosts, spendBoosts } from "./boosts.mjs";
import { addXp, baseActor, isPlayerCharacter, rankOf, xpOf } from "./level.mjs";

const TEMPLATE = "systems/eternia/templates/chat/xp-card.hbs";
const X = (key, data) => L(`Xp.${key}`, data);

/** The monsters being given now (Incapacitated and Dead may come together). */
const giving = new Set();

/**
 * The awards and the Undos, one after another (on the GM's window): two monsters felled by one area share the party
 * in turn, and an Undo never meets an award halfway.
 */
let line = Promise.resolve();
const inLine = fn => {
  const run = line.then(fn);
  line = run.catch(() => null);
  return run;
};

/**
 * Whether a monster keeps the mark of its XP given on itself: a token's actor (its own) or a linked one. A world actor
 * of unlinked tokens (a sheet opened from the sidebar) would pass the mark on to every token of it.
 */
const marksItself = monster => !!(monster?.isToken || monster?.prototypeToken?.actorLink);

/* -------------------------------------------- */
/*  What a monster gives                        */
/* -------------------------------------------- */

const tagsOf = actor => (actor?.system?.tags ?? []).map(t => String(t).trim().toLowerCase());

/** A monster's kind for the XP: "boss" ([Boss]), "mob" ([Mob]) or "common". */
export function monsterKind(actor) {
  const tags = tagsOf(actor);
  if (tags.includes("boss")) return "boss";
  if (tags.includes("mob")) return "mob";
  return "common";
}

/** A monster's NP. */
export const monsterRank = actor => Math.max(1, toInt(actor?.system?.rank) || 1);

/**
 * The XP a monster gives: its own (`flags.eternia.xp`), else the one of its NP and kind.
 * @param {Actor} actor
 * @returns {number}
 */
export function monsterXp(actor) {
  if (actor?.type !== "monster") return 0;
  const own = actor.getFlag(SYSTEM_ID, "xp");
  if ((own !== undefined) && (own !== null) && (own !== "") && Number.isFinite(Number(own))) return Math.max(0, toInt(own));
  return monsterXpValue(monsterRank(actor), isRift(actor) ? { encounters: 1 } : { kind: monsterKind(actor) });
}

/** Whether the XP is the monster's own (not the one its NP and kind give). */
export const ownXp = actor => {
  const own = actor?.getFlag(SYSTEM_ID, "xp");
  return (own !== undefined) && (own !== null) && (own !== "") && Number.isFinite(Number(own));
};

/* -------------------------------------------- */
/*  Who gets it                                 */
/* -------------------------------------------- */

/** The token of an actor on its scene (a synthetic actor's own, else the first one of a world actor). */
function tokenOf(actor) {
  if (actor?.token) return actor.token;
  return actor?.getActiveTokens(false, true)[0] ?? null;
}

/** Whether an actor has a token on a scene. */
const onScene = (actor, scene) => !!scene && scene.tokens.some(t => t.actor && (baseActor(t.actor)?.uuid === actor.uuid));

/** Whether a character can take XP now (a dead one, for good, can't). */
const canTake = actor => isPlayerCharacter(actor) && !actor.statuses.has("dead");

/**
 * The character a kill is credited to: the feller, if a character of a player; the master of a creature [Dominated]
 * by one; else nobody.
 * @param {Actor|null} feller
 * @returns {Actor|null}
 */
export function creditOf(feller) {
  if (!feller) return null;
  if (isPlayerCharacter(feller)) return baseActor(feller);
  for (const master of sourcesOf(feller, "dominated")) if (isPlayerCharacter(master)) return baseActor(master);
  return null;
}

/**
 * Who shares a monster's XP: the character credited and its party on the monster's scene; for a boss, every
 * character of the players in the boss's combat too.
 * @param {Actor} monster
 * @param {Actor|null} credited
 * @returns {{members: Actor[], raid: boolean, party: object|null}}
 */
export function sharersOf(monster, credited) {
  const token = tokenOf(monster);
  const scene = token?.parent ?? tokenOf(credited)?.parent ?? null;
  const members = new Map();
  const party = credited ? partyOf(credited) : null;
  if (credited && canTake(credited)) members.set(credited.uuid, credited);
  if (party) {
    for (const uuid of party.members) {
      const actor = fromUuidSync(uuid);
      if (actor && canTake(actor) && (!scene || onScene(actor, scene))) members.set(actor.uuid, actor);
    }
  }
  let raid = false;
  if ((monsterKind(monster) === "boss") && token) {
    for (const combat of game.combats) {
      if (!combat.combatants.some(c => c.tokenId === token.id)) continue;
      for (const combatant of combat.combatants) {
        const actor = combatant.actor ? baseActor(combatant.actor) : null;
        if (!actor || members.has(actor.uuid) || !canTake(actor)) continue;
        // Only the characters of the players' side (a character on a hostile token fights as an enemy)
        if (combatant.token?.disposition === CONST.TOKEN_DISPOSITIONS.HOSTILE) continue;
        members.set(actor.uuid, actor);
        raid = true;
      }
    }
  }
  return { members: [...members.values()], raid, party };
}

/* -------------------------------------------- */
/*  The award                                   */
/* -------------------------------------------- */

/**
 * Give a monster's XP (GM): who felled it and its party share it, and the card says who got what.
 * @param {Actor} monster
 * @param {object} [options]
 * @param {Actor|null} [options.feller]   Who felled it (undefined: the drops' feller)
 * @param {boolean} [options.force]       Give even one already given or one that came late (the sheet's button)
 * @param {string} [options.reason]       "fall", "rift" (closed), "save" (saved) or "hand" (the GM's button)
 * @returns {Promise<ChatMessage|null>}
 */
export function awardMonster(monster, options = {}) {
  return inLine(() => award(monster, options));
}

async function award(monster, { feller, force = false, reason = "fall" } = {}) {
  if (!game.user.isGM || (monster?.type !== "monster") || giving.has(monster.uuid)) return null;
  if (!force && (monster.getFlag(SYSTEM_ID, "xpGiven") || cameLate(monster))) return null;
  const base = monsterXp(monster);
  if (base <= 0) return null;
  giving.add(monster.uuid);
  try {
    const credited = creditOf((feller === undefined) ? fellerOf(monster) : feller);
    const { members, raid, party } = sharersOf(monster, credited);
    if (!members.length) return null;
    const np = monsterRank(monster);
    const shares = shareXp(base, np, members.map(a => ({ id: a.uuid, rank: rankOf(a) })), { bonusCount: Math.min(MAX_PARTY, members.length) });
    const rows = [];
    for (const share of shares) {
      const actor = members.find(a => a.uuid === share.id);
      // One who couldn't take it (an error on its sheet) leaves the others theirs, and the card still comes
      try {
        // The boosts multiply what the monster gives and spend a monster each (only when it gives something)
        const boosts = (share.xp > 0) ? await spendBoosts(actor) : [];
        const pct = boosts.reduce((sum, b) => sum + b.pct, 0);
        const extra = Math.round(share.xp * pct / 100);
        const gain = share.xp + extra;
        const before = xpOf(actor);
        if (gain > 0) await addXp(actor, gain, { source: "monster" });
        rows.push({ uuid: actor.uuid, name: actorName(actor), img: actor.img, rank: share.rank, factor: share.factor, weight: share.weight,
          base: share.xp, extra, gain, before, boosts });
      }
      catch (err) {
        console.error(`${SYSTEM_ID} | XP for ${actor?.name} failed`, err);
      }
    }
    const message = await postCard(monster, { base, np, reason, raid, party: !!party, count: members.length, rows });
    if (marksItself(monster)) await monster.setFlag(SYSTEM_ID, "xpGiven", message?.id ?? true);
    return message;
  }
  finally {
    giving.delete(monster.uuid);
  }
}

/** The kind of a monster as the card says it ("comum de NP 3"). */
function kindLabel(monster) {
  if (isRift(monster)) return X("Kind.rift");
  if (monster.getFlag(SYSTEM_ID, "named")) return X("Kind.named");
  return X(`Kind.${monsterKind(monster)}`);
}

/** A factor as the card writes it: "×1,2". */
const factorText = factor => `×${String(Math.round(factor * 100) / 100).replace(".", ",")}`;

/** The card's data of one who got XP. */
function rowView(row, np) {
  const after = xpProgress(row.before + row.gain);
  const notes = [];
  if (row.weight < 1) notes.push(X("Card.Share", { pct: Math.round(row.weight * 100) }));
  if (row.factor !== 1) notes.push(X((row.factor > 1) ? "Card.Above" : ((row.factor > 0) ? "Card.Below" : "Card.TooLow"), { factor: factorText(row.factor), n: Math.abs(np - row.rank) }));
  for (const boost of row.boosts ?? []) notes.push(X("Card.Boost", { name: boost.name, pct: boost.pct }));
  return {
    ...row,
    gainLabel: row.gain ? X("Card.Gain", { n: row.gain }) : X("Card.Nothing"),
    notes: notes.join(" · "),
    rankLabel: X("Card.Rank", { rank: after.rank }),
    pct: Math.round(after.pct * 1000) / 10,
    progress: after.max ? X("Card.Max") : X("Card.Progress", { into: after.into, need: after.need })
  };
}

/** Who sees the card: the players of whoever got XP and the GMs. */
function whisperOf(rows) {
  const ids = new Set(game.users.filter(u => u.isGM).map(u => u.id));
  for (const row of rows) {
    const actor = fromUuidSync(row.uuid);
    for (const user of game.users) if (!user.isGM && actor?.testUserPermission(user, "OWNER")) ids.add(user.id);
  }
  return [...ids];
}

async function renderCard(monster, data, { undone = false } = {}) {
  const how = data.raid ? X("Card.Raid", { n: data.count }) : (data.count > 1) ? X("Card.Party", { n: data.count, pct: Math.round(10 * (Math.min(MAX_PARTY, data.count) - 1)) }) : X("Card.Alone");
  return foundry.applications.handlebars.renderTemplate(TEMPLATE, {
    img: monster?.img ?? "", name: monster ? actorName(monster) : "?",
    eyebrow: X(`Card.Eyebrow.${data.reason}`), kind: monster ? X("Card.Kind", { kind: kindLabel(monster), np: data.np }) : "",
    base: X("Card.Base", { n: data.base }), how,
    rows: data.rows.map(row => rowView(row, data.np)),
    undone, undoLabel: X("Card.Undo"), undoneLabel: X("Card.Undone")
  });
}

async function postCard(monster, data) {
  return ChatMessage.create({
    speaker: { alias: actorName(monster) },
    content: await renderCard(monster, data),
    whisper: whisperOf(data.rows),
    flags: { [SYSTEM_ID]: { xpCard: { monsterUuid: monster.uuid, ...data, undone: false } } }
  });
}

/**
 * The card's Undo (GM): the XP goes back from everyone who got it (an NP it gave goes back too, after the box), the
 * boosts get back the monster they spent, and the monster can give its XP again.
 * @param {ChatMessage} message
 */
export function undoXp(message) {
  return inLine(() => undo(message));
}

async function undo(message) {
  const data = message.getFlag(SYSTEM_ID, "xpCard");
  if (!game.user.isGM || !data || data.undone || data.undoing) return;
  // Marked first: another GM window (or a second click) finds it taken
  await message.update({ [`flags.${SYSTEM_ID}.xpCard.undoing`]: true });
  for (const row of data.rows ?? []) {
    const actor = fromUuidSync(row.uuid);
    if (!actor) continue;
    try {
      if (row.gain) await addXp(actor, -row.gain, { source: "undo" });
      if (row.boosts?.length) await restoreBoosts(actor, row.boosts);
    }
    catch (err) {
      console.error(`${SYSTEM_ID} | XP undo for ${actor.name} failed`, err);
    }
  }
  const monster = fromUuidSync(data.monsterUuid);
  if (monster?.getFlag(SYSTEM_ID, "xpGiven")) await monster.unsetFlag(SYSTEM_ID, "xpGiven");
  await message.update({ content: await renderCard(monster, data, { undone: true }), [`flags.${SYSTEM_ID}.xpCard.undone`]: true });
}

/* -------------------------------------------- */
/*  When                                        */
/* -------------------------------------------- */

/** A monster fell (Incapacitated or Dead came): its XP, a moment later, when the felling attacker is known. */
function onStatus(effect) {
  const actor = effect.parent;
  // A Rift gives its XP when it closes (bestiary/rifts.mjs), not when it falls
  if (!(actor instanceof Actor) || (actor.type !== "monster") || isRift(actor) || !isPrimaryGM()) return;
  if (!effect.statuses?.has("incapacitated") && !effect.statuses?.has("dead")) return;
  setTimeout(() => {
    if (actor.statuses.has("incapacitated") || actor.statuses.has("dead")) {
      awardMonster(actor).catch(err => console.error(`${SYSTEM_ID} | XP failed`, err));
    }
  }, 700);
}

/** The card's Undo button, for the GM while it can be undone. */
function onRenderMessage(message, html) {
  const data = message.getFlag(SYSTEM_ID, "xpCard");
  if (!data) return;
  const actions = html.querySelector(".xp-actions");
  if (!actions) return;
  if (!game.user.isGM || data.undone || data.undoing) return actions.remove();
  actions.querySelector('[data-action="xp-undo"]')?.addEventListener("click", event => {
    event.preventDefault();
    event.currentTarget.disabled = true;
    undoXp(message).catch(err => console.error(`${SYSTEM_ID} | XP undo failed`, err));
  });
}

/** Call during the `init` hook. */
export function registerAward() {
  Hooks.on("createActiveEffect", effect => onStatus(effect));
  Hooks.on("renderChatMessageHTML", onRenderMessage);
  foundry.applications.handlebars.loadTemplates([TEMPLATE]);
}

/** For the sheet's tab: what a monster gives, said in words. */
export function monsterXpText(actor) {
  const n = monsterXp(actor);
  return ownXp(actor) ? X("Sheet.Own", { n }) : X("Sheet.ByKind", { n, kind: kindLabel(actor), np: monsterRank(actor) });
}

