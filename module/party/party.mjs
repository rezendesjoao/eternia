/**
 * The parties on the primary GM (piles/pile-socket.mjs requests), the way of the floating castle: a character of a
 * player invites another, whose player accepts or declines within a minute (a character whose players are away can't
 * be invited); the one who invited leads the party it makes, and only the leader invites, up to six. The leader takes
 * members out and passes the lead; anyone leaves (the leader leaving passes the lead to the one who came first after
 * it, and a party left with one member is no more); the leader may disband it. The GM may form a party of any
 * characters of players and take anyone out.
 *
 * Every change is the world setting (state.mjs: every window draws again from its onChange) and a short note in the
 * chat to the party's players and the GMs. The invitations waiting live only on the primary GM, which talks to the
 * windows on the socket (scope "party"): "ask" (the invitation, to whoever answers for the invited) and "closed" (an
 * invitation that ended: declined, expired, taken back, accepted or no longer possible). The UI says what each one
 * does (onPartyMessage).
 */
import { L, SYSTEM_ID } from "../settings.mjs";
import { escape } from "../helpers/utils.mjs";
import { CLIENT_ID, isPrimaryGM } from "../helpers/clients.mjs";
import { registerHandler, request } from "../piles/pile-socket.mjs";
import {
  MAX_PARTY, PARTY_SETTING, canJoin, hasRoom, isLeader, memberKey, membersOf, parties, partyById, partyOf
} from "./state.mjs";

const SOCKET = "system.eternia";
const SCOPE = "party";
/** How long an invitation waits for its answer. */
export const ASK_MS = 60000;

const P = (key, data) => L(`Party.${key}`, data);
const fail = (key, data = undefined) => ({ ok: false, error: `ETERNIA.Party.Error.${key}`, errorData: data });

/** The text of a request's error. */
export function errorText(result) {
  if (!result?.error) return "";
  return result.errorData ? game.i18n.format(result.error, result.errorData) : game.i18n.localize(result.error);
}

/* -------------------------------------------- */
/*  The socket                                  */
/* -------------------------------------------- */

const listeners = new Map();

/** What a window does with a message of the parties (the UI registers them). */
export function onPartyMessage(type, fn) {
  listeners.set(type, fn);
}

function deliver(message) {
  if (Array.isArray(message.to) && !message.to.includes(game.user.id)) return;
  try {
    listeners.get(message.type)?.(message);
  }
  catch (err) {
    console.error(`${SYSTEM_ID} | Party message "${message.type}" failed`, err);
  }
}

/**
 * Send a message to every window (this one too); `to` limits it to some users, and the server sends it only to their
 * windows (this one's user among them gets it back too: the window that sent it, known by its id, already has it).
 */
function broadcast(type, data = {}) {
  const message = { scope: SCOPE, type, ...data, clientId: CLIENT_ID };
  game.socket.emit(SOCKET, message, Array.isArray(message.to) ? { recipients: message.to } : {});
  deliver(message);
}

/* -------------------------------------------- */
/*  Who                                         */
/* -------------------------------------------- */

/** The invitations waiting for an answer (on the primary GM). */
const pending = new Map();

/** The invitation an actor waits on (as the invited). */
const pendingFor = key => [...pending.values()].find(p => p.to.uuid === key) ?? null;

/** What the windows show of a character. */
function faceOf(actor) {
  const token = actor?.prototypeToken;
  const blank = src => !src || (src === CONST.DEFAULT_TOKEN) || /mystery-man/.test(src);
  return {
    uuid: memberKey(actor),
    name: token?.name || actor?.name || "?",
    img: blank(actor?.img) ? (token?.texture?.src ?? actor?.img ?? "") : actor.img
  };
}

/** The users who answer for a character: its players who are on (null when none is). */
function respondersOf(actor) {
  const here = game.users.filter(u => !u.isGM && u.active && actor.testUserPermission(u, "OWNER"));
  return here.length ? here : null;
}

/** The users who see a party's notes: its players and the GMs. */
function readersOf(party) {
  const ids = new Set(game.users.filter(u => u.isGM).map(u => u.id));
  for (const actor of membersOf(party)) {
    for (const user of game.users) if (!user.isGM && actor.testUserPermission(user, "OWNER")) ids.add(user.id);
  }
  return [...ids];
}

/** Whether a user may act for a character (its owner, or a GM). */
const mayAct = (user, actor) => !!actor && (user.isGM || actor.testUserPermission(user, "OWNER"));

/**
 * Why a character can't invite another now (null: it can).
 * @param {Actor} from
 * @param {Actor} to
 * @returns {{key: string, data?: object}|null}   key: under ETERNIA.Party.Error
 */
export function inviteProblem(from, to) {
  if (!from || !to) return { key: "Missing" };
  for (const actor of [from, to]) {
    if (!canJoin(actor)) return { key: "NotPlayer", data: { name: faceOf(actor).name } };
    if (actor.statuses.has("dead")) return { key: "Dead", data: { name: faceOf(actor).name } };
  }
  if (memberKey(from) === memberKey(to)) return { key: "Self" };
  const theirs = partyOf(to);
  if (theirs) return { key: "InParty", data: { name: faceOf(to).name } };
  const party = partyOf(from);
  if (party && !isLeader(party, from)) return { key: "NotLeader" };
  if (party && !hasRoom(party)) return { key: "Full", data: { n: MAX_PARTY } };
  if (pendingFor(memberKey(to))) return { key: "Busy", data: { name: faceOf(to).name } };
  return null;
}

/* -------------------------------------------- */
/*  Saving and the notes                        */
/* -------------------------------------------- */

/** Save the parties (the primary GM). */
async function save(list) {
  await game.settings.set(SYSTEM_ID, PARTY_SETTING, list);
}

/**
 * A short note in the chat to a party's players and the GMs.
 * @param {object} party   The party (after the change; or the one that was, for a disband)
 * @param {string} key     Under ETERNIA.Party.Note
 * @param {object} data
 * @param {string[]} [also]   Users who see it besides (whoever left)
 */
async function notice(party, key, data, also = []) {
  const whisper = [...new Set([...readersOf(party), ...also])];
  const icon = { Joined: "fa-user-plus", Left: "fa-person-walking-arrow-right", Kicked: "fa-user-minus", Leader: "fa-crown",
    Disbanded: "fa-people-arrows", Formed: "fa-users" }[key] ?? "fa-users";
  await ChatMessage.create({
    speaker: { alias: P("Title") },
    whisper,
    content: `<div class="eternia-party-note"><i class="fa-solid ${icon}"></i><span>${escape(P(`Note.${key}`, data))}</span></div>`,
    flags: { [SYSTEM_ID]: { partyNote: { key, party: party.id } } }
  });
}

/** The users of a character (to see the note of having left). */
const usersOf = actor => game.users.filter(u => !u.isGM && actor?.testUserPermission(u, "OWNER")).map(u => u.id);

/* -------------------------------------------- */
/*  The invitation (on the primary GM)          */
/* -------------------------------------------- */

/** An invitation: checked, then sent to whoever answers for the invited (or straight in). */
async function onInvite({ from, to } = {}, user) {
  const inviter = from ? await fromUuid(from) : null;
  const invited = to ? await fromUuid(to) : null;
  if (!mayAct(user, inviter)) return fail("NotYours");
  const problem = inviteProblem(inviter, invited);
  if (problem) return fail(problem.key, problem.data);
  const responders = respondersOf(invited);
  if (!responders) return fail("Away", { name: faceOf(invited).name });
  const party = partyOf(inviter);
  const entry = {
    id: foundry.utils.randomID(),
    from: faceOf(inviter),
    to: faceOf(invited),
    by: user.id,
    answer: responders.map(u => u.id),
    size: party ? party.members.length : 1,
    expires: Date.now() + ASK_MS
  };
  // Whoever invites answers for both (a player with two characters, the GM's request for a player who is on): in
  if (entry.answer.includes(user.id)) return join(entry);
  pending.set(entry.id, entry);
  entry.timer = setTimeout(() => expire(entry.id), ASK_MS);
  broadcast("ask", { to: entry.answer, invite: view(entry) });
  return { ok: true, waiting: true, invite: view(entry), names: responders.map(u => u.name) };
}

/** The two names of an invitation, for the notes of how it ended (each side reads the other's). */
const namesOf = entry => ({ inviter: entry.from.name, invited: entry.to.name });

/** What the windows show of an invitation. */
const view = entry => ({ id: entry.id, from: entry.from, to: entry.to, size: entry.size, expires: entry.expires, by: entry.by });

/** The answer of the invited's player. */
async function onAnswer({ id, accept } = {}, user) {
  const entry = pending.get(id);
  if (!entry) return fail("Gone");
  if (!entry.answer.includes(user.id) && !user.isGM) return fail("NotYours");
  clearTimeout(entry.timer);
  pending.delete(id);
  if (!accept) {
    broadcast("closed", { to: [entry.by, ...entry.answer], id, why: "declined", ...namesOf(entry) });
    return { ok: true };
  }
  return join(entry);
}

/** The inviter takes the invitation back. */
async function onCancel({ id } = {}, user) {
  const entry = pending.get(id);
  if (!entry) return fail("Gone");
  if ((entry.by !== user.id) && !user.isGM) return fail("NotYours");
  clearTimeout(entry.timer);
  pending.delete(id);
  broadcast("closed", { to: [entry.by, ...entry.answer], id, why: "cancelled", ...namesOf(entry) });
  return { ok: true };
}

/** Nobody answered in time. */
function expire(id) {
  const entry = pending.get(id);
  if (!entry) return;
  pending.delete(id);
  broadcast("closed", { to: [entry.by, ...entry.answer], id, why: "expired", ...namesOf(entry) });
}

/** The invited comes in: the inviter's party, or a new one that the inviter leads. */
async function join(entry) {
  const inviter = fromUuidSync(entry.from.uuid);
  const invited = fromUuidSync(entry.to.uuid);
  // Something changed while the answer came (the invited joined another party, the party filled up)
  const problem = inviteProblem(inviter, invited);
  if (problem) {
    const result = fail(problem.key, problem.data);
    broadcast("closed", { to: [entry.by, ...(entry.answer ?? [])], id: entry.id, why: "invalid", error: result.error, errorData: result.errorData });
    return result;
  }
  const list = parties();
  let party = list.find(p => p.members.includes(entry.from.uuid));
  const made = !party;
  if (made) {
    party = { id: foundry.utils.randomID(), leader: entry.from.uuid, members: [entry.from.uuid, entry.to.uuid], created: Date.now() };
    list.push(party);
  }
  else party.members = [...party.members, entry.to.uuid];
  await save(list);
  broadcast("closed", { to: [entry.by, ...(entry.answer ?? [])], id: entry.id, why: "accepted", ...namesOf(entry) });
  await notice(party, made ? "Formed" : "Joined", { name: entry.to.name, leader: entry.from.name, n: party.members.length, max: MAX_PARTY });
  return { ok: true, joined: true, party: party.id };
}

/* -------------------------------------------- */
/*  Leaving, taking out, the lead               */
/* -------------------------------------------- */

/**
 * A member leaves its party (or is taken out): a leader leaving passes the lead on; one left alone, no party.
 * @returns {Promise<object>}
 */
async function remove(key, { by = null, kicked = false, name: given = null } = {}) {
  const list = parties();
  const party = list.find(p => p.members.includes(key));
  if (!party) return fail("NoParty");
  const actor = fromUuidSync(key);
  const name = given ?? faceOf(actor).name;
  const before = { ...party, members: [...party.members] };
  party.members = party.members.filter(m => m !== key);
  let next = null;
  if (party.leader === key) {
    party.leader = party.members[0] ?? null;
    next = party.leader ? faceOf(fromUuidSync(party.leader)).name : null;
  }
  const gone = party.members.length < 2;
  const kept = gone ? list.filter(p => p.id !== party.id) : list;
  await save(kept);
  const also = usersOf(actor);
  if (gone) await notice(before, kicked ? "KickedLast" : "LeftLast", { name, by: by ?? "" }, also);
  else {
    await notice(party, kicked ? "Kicked" : "Left", { name, by: by ?? "" }, also);
    if (next) await notice(party, "Leader", { name: next });
  }
  return { ok: true, disbanded: gone };
}

async function onLeave({ actor } = {}, user) {
  const member = actor ? fromUuidSync(actor) : null;
  if (!mayAct(user, member)) return fail("NotYours");
  return remove(memberKey(member));
}

async function onKick({ leader, member } = {}, user) {
  const head = leader ? fromUuidSync(leader) : null;
  const party = head ? partyOf(head) : partyOf(member);
  if (!party) return fail("NoParty");
  // The GM takes anyone out; a player, as the leader of the party
  if (!user.isGM && !(mayAct(user, head) && isLeader(party, head))) return fail("NotLeader");
  if (!party.members.includes(member)) return fail("NotMember");
  if (member === party.leader && !user.isGM) return fail("Self");
  return remove(member, { by: head ? faceOf(head).name : user.name, kicked: true });
}

async function onPromote({ leader, member } = {}, user) {
  const head = leader ? fromUuidSync(leader) : null;
  const list = parties();
  const party = list.find(p => p.members.includes(member));
  if (!party) return fail("NoParty");
  if (!user.isGM && !(mayAct(user, head) && isLeader(party, head))) return fail("NotLeader");
  if (party.leader === member) return { ok: true };
  party.leader = member;
  await save(list);
  await notice(party, "Leader", { name: faceOf(fromUuidSync(member)).name });
  return { ok: true };
}

async function onDisband({ leader, party: id } = {}, user) {
  const head = leader ? fromUuidSync(leader) : null;
  const party = id ? partyById(id) : partyOf(head);
  if (!party) return fail("NoParty");
  if (!user.isGM && !(mayAct(user, head) && isLeader(party, head))) return fail("NotLeader");
  await save(parties().filter(p => p.id !== party.id));
  await notice(party, "Disbanded", { name: faceOf(fromUuidSync(party.leader)).name });
  return { ok: true };
}

/** The GM takes characters deleted out of their parties (the deleteActor hook, the cleaning on ready). */
async function onRemoveDeleted({ members = [], names = [] } = {}, user) {
  if (!user.isGM) return fail("NotYours");
  for (const [i, key] of members.entries()) {
    if (fromUuidSync(key) && !names[i]) continue;
    await remove(key, { name: names[i] ?? L("Party.Gone") });
  }
  return { ok: true };
}

/** The GM forms a party of characters of players (the first one leads), out of the parties they were in. */
async function onForm({ members = [] } = {}, user) {
  if (!user.isGM) return fail("NotYours");
  const keys = [...new Set(members.map(m => memberKey(m)))].filter(Boolean);
  const actors = keys.map(k => fromUuidSync(k)).filter(a => canJoin(a));
  if (actors.length < 2) return fail("FormFew");
  if (actors.length > MAX_PARTY) return fail("Full", { n: MAX_PARTY });
  const chosen = actors.map(a => memberKey(a));
  // Out of their old parties (one left alone there, that party is no more)
  const list = parties().map(p => ({ ...p, members: p.members.filter(m => !chosen.includes(m)) }))
    .map(p => (p.members.includes(p.leader) ? p : { ...p, leader: p.members[0] }))
    .filter(p => p.members.length >= 2);
  const party = { id: foundry.utils.randomID(), leader: chosen[0], members: chosen, created: Date.now() };
  await save([...list, party]);
  await notice(party, "Formed", { name: actors.slice(1).map(a => faceOf(a).name).join(", "), leader: faceOf(actors[0]).name, n: chosen.length, max: MAX_PARTY });
  return { ok: true, party: party.id };
}

/* -------------------------------------------- */
/*  For the windows                             */
/* -------------------------------------------- */

/** Invite a character (with one of the user's). */
export const invite = (from, to) => request("partyInvite", { from: memberKey(from), to: memberKey(to) });
/** Answer an invitation. */
export const answerInvite = (id, accept) => request("partyAnswer", { id, accept: !!accept });
/** Take an invitation back. */
export const cancelInvite = id => request("partyCancel", { id });
/** Leave the party. */
export const leaveParty = actor => request("partyLeave", { actor: memberKey(actor) });
/** Take a member out (the leader, or the GM with no leader). */
export const kickMember = (leader, member) => request("partyKick", { leader: leader ? memberKey(leader) : null, member: memberKey(member) });
/** Pass the lead. */
export const promoteMember = (leader, member) => request("partyPromote", { leader: leader ? memberKey(leader) : null, member: memberKey(member) });
/** Disband the party (its leader, or the GM by the party's id). */
export const disbandParty = (leader, party = null) => request("partyDisband", { leader: leader ? memberKey(leader) : null, party });
/** The GM forms a party. */
export const formParty = actors => request("partyForm", { members: actors.map(a => memberKey(a)) });

/** Call during the `init` hook. */
export function registerPartyRules() {
  game.settings.register(SYSTEM_ID, PARTY_SETTING, {
    scope: "world",
    config: false,
    type: Array,
    default: [],
    onChange: () => Hooks.callAll("eternia.partiesChanged")
  });
  registerHandler("partyInvite", onInvite);
  registerHandler("partyAnswer", onAnswer);
  registerHandler("partyCancel", onCancel);
  registerHandler("partyLeave", onLeave);
  registerHandler("partyKick", onKick);
  registerHandler("partyPromote", onPromote);
  registerHandler("partyDisband", onDisband);
  registerHandler("partyForm", onForm);
  Hooks.once("ready", () => {
    game.socket.on(SOCKET, message => {
      if ((message?.scope === SCOPE) && (message.clientId !== CLIENT_ID)) deliver(message);
    });
  });
  registerHandler("partyRemove", onRemoveDeleted);
  // A character deleted leaves its party: the primary GM asks its own queue, so the change never crosses another one
  Hooks.on("deleteActor", actor => {
    if (!isPrimaryGM() || !partyOf(actor)) return;
    request("partyRemove", { members: [memberKey(actor)], names: [faceOf(actor).name] })
      .catch(err => console.error(`${SYSTEM_ID} | Could not take a deleted character out of its party`, err));
  });
  // Members deleted while no GM was on (they can't be found any more) leave when the primary GM comes
  Hooks.once("ready", () => {
    if (!isPrimaryGM()) return;
    const gone = [...new Set(parties().flatMap(p => p.members))].filter(uuid => !fromUuidSync(uuid));
    if (gone.length) request("partyRemove", { members: gone }).catch(err => console.error(`${SYSTEM_ID} | Could not clean the parties`, err));
  });
}
