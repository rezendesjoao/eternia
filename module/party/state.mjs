/**
 * The parties (Grupos), the way of the floating castle's players: a party is up to six characters of players, one of
 * them its leader. They live in the world setting `parties` ([{ id, leader, members, created }]: the uuids of the
 * world actors, the leader among the members, in the order they came), written only by the primary GM (party.mjs).
 * What a party does: it shares the monsters' XP (experience/award.mjs), a Banquet feeds it (content/content.mjs) and
 * its players see one another in the party's frame (ui.mjs).
 */
import { SYSTEM_ID } from "../settings.mjs";
import { MAX_PARTY } from "../experience/data.mjs";

export { MAX_PARTY };

export const PARTY_SETTING = "parties";

/** A party as saved, if whole: an id, a leader among two members or more. */
const valid = p => !!p?.id && Array.isArray(p.members) && (p.members.length >= 2) && p.members.includes(p.leader);

/** Every party of the world. */
export function parties() {
  const saved = game.settings.get(SYSTEM_ID, PARTY_SETTING);
  return (Array.isArray(saved) ? saved : []).filter(valid);
}

/** The uuid a character is kept by in a party: its world actor's (a token's actor of a world actor counts as it). */
export function memberKey(actor) {
  if (!actor) return null;
  if (typeof actor === "string") return actor;
  return actor.isToken ? (game.actors.get(actor.id)?.uuid ?? actor.uuid) : actor.uuid;
}

/** The party of a character, or null. */
export function partyOf(actor) {
  const key = memberKey(actor);
  return key ? (parties().find(p => p.members.includes(key)) ?? null) : null;
}

/** A party by its id. */
export const partyById = id => parties().find(p => p.id === id) ?? null;

/** The actors of a party, in their order (the leader first). */
export function membersOf(party) {
  if (!party) return [];
  const order = [party.leader, ...party.members.filter(m => m !== party.leader)];
  return order.map(uuid => fromUuidSync(uuid)).filter(a => a instanceof Actor);
}

/** Whether a character leads its party. */
export const isLeader = (party, actor) => !!party && (party.leader === memberKey(actor));

/** Whether two characters are in the same party. */
export function sameParty(a, b) {
  const party = partyOf(a);
  return !!party && party.members.includes(memberKey(b));
}

/** Whether a party has room for one more. */
export const hasRoom = party => !party || (party.members.length < MAX_PARTY);

/** Whether an actor can be in a party: a character of a player. */
export const canJoin = actor => (actor?.type === "character") && !!actor.hasPlayerOwner;

/**
 * The parties of a user's characters (a player with two characters may lead one party and be in another): the
 * assigned character's first.
 * @param {User} [user]
 * @returns {object[]}
 */
export function partiesOfUser(user = game.user) {
  const all = parties();
  if (user.isGM) return all;
  const mine = all.filter(p => p.members.some(uuid => fromUuidSync(uuid)?.testUserPermission(user, "OWNER")));
  const assigned = user.character ? memberKey(user.character) : null;
  return mine.sort((a, b) => Number(b.members.includes(assigned)) - Number(a.members.includes(assigned)));
}
