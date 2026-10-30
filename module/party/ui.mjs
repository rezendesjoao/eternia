/**
 * The parties' screens (css/party.css, prefix pt; the panels and the bubble are the system's, css/duels.css):
 * - The invitation (socket "ask"): the inviter and the invited, how many the party has, Accept / Decline while the time
 *   bar runs; the inviter waits and may take it back; how it ended comes in a note (socket "closed").
 * - The party's frame: on the screen of each of its players, at the top left (as the party's gauges under one's own in
 *   the floating castle), its members, the leader first, each with the HP, the NP and where it is; a click on one
 *   finds its token on the scene. A player in two parties (two characters) sees the one of the character it acts with.
 * - The bubble of someone else's character (canvas/bubble.mjs): invite to the party, take out, pass the lead.
 */
import { L, SYSTEM_ID } from "../settings.mjs";
import { escape, toInt } from "../helpers/utils.mjs";
import { closePanel, hasPanel, notePanel, openPanel, registerPanels } from "../helpers/panels.mjs";
import { pictureOf, registerBubbleEntry } from "../canvas/bubble.mjs";
import { isDying } from "../automation/death.mjs";
import { ASK_MS, answerInvite, cancelInvite, errorText, invite, inviteProblem, kickMember, onPartyMessage, promoteMember } from "./party.mjs";
import { MAX_PARTY, canJoin, isLeader, membersOf, partiesOfUser, partyOf, sameParty } from "./state.mjs";

const P = (key, data) => L(`Party.${key}`, data);
const sound = () => foundry.audio.AudioHelper.play({ src: CONFIG.sounds.notification, volume: 0.8, autoplay: true, loop: false }, false);

/** A short note in a panel. */
export const note = (text, { icon = "fa-solid fa-circle-info", danger = false } = {}) => notePanel(text, { title: P("Title"), icon, danger, ok: P("UI.Ok") });

/* -------------------------------------------- */
/*  Who acts                                    */
/* -------------------------------------------- */

/** The world actor of a token's actor. */
const baseOf = actor => (actor?.isToken ? (game.actors.get(actor.id) ?? actor) : actor);

/**
 * The character the user acts with: the token selected (a character of theirs), else the one assigned, else (a
 * player) the only character it has.
 * @returns {Actor|null}
 */
export function actingCharacter() {
  const own = a => canJoin(a) && a.isOwner;
  const controlled = canvas?.ready ? canvas.tokens.controlled.map(t => baseOf(t.actor)).filter(own) : [];
  if (controlled.length === 1) return controlled[0];
  if (own(game.user.character)) return game.user.character;
  if (!game.user.isGM) {
    const mine = game.actors.filter(own);
    if (mine.length === 1) return mine[0];
    // Several: the one in a party
    const partied = mine.filter(a => partyOf(a));
    if (partied.length === 1) return partied[0];
  }
  return null;
}

/** What a character shows in the panels. */
const faceOf = actor => ({ name: actor?.prototypeToken?.name || actor?.name || "?", img: pictureOf(actor, actor?.prototypeToken) });

/* -------------------------------------------- */
/*  The invitation                              */
/* -------------------------------------------- */

/** The inviter and the invited, with the party's handshake between them. */
function pair(a, b) {
  const face = side => `<figure class="dl-face"><span><img src="${escape(side.img)}" alt=""></span><figcaption>${escape(side.name)}</figcaption></figure>`;
  return `<div class="dl-versus pt-pair">${face(a)}<span class="dl-vs"><i class="fa-solid fa-handshake"></i></span>${face(b)}</div>`;
}

/**
 * Invite a character to the party of the one the user acts with.
 * @param {Actor} target
 * @param {Actor|null} [from]   Who invites (the character the user acts with)
 */
export async function inviteFlow(target, from = actingCharacter()) {
  const to = baseOf(target);
  if (!from) return note(P("Error.NoCharacter"), { icon: "fa-solid fa-hand-pointer" });
  const problem = inviteProblem(from, to);
  if (problem) return note(P(`Error.${problem.key}`, problem.data ?? {}), { icon: "fa-solid fa-ban" });
  const result = await invite(from, to);
  if (!result?.ok) return note(errorText(result) || P("Error.Generic"), { icon: "fa-solid fa-ban" });
  if (result.waiting) return waitingPanel(result.invite, result.names);
  return null;
}

/** The inviter waits for the answer (and may take it back). */
function waitingPanel(entry, names = []) {
  openPanel(`pwait:${entry.id}`, {
    title: P("UI.WaitTitle"),
    icon: "fa-solid fa-users",
    html: `${pair(entry.from, entry.to)}<p class="dl-box-lead">${escape(P("UI.Waiting", { name: entry.to.name }))}</p>`
      + (names.length ? `<p class="dl-box-small">${escape(P("UI.WaitingFor", { names: names.join(", ") }))}</p>` : ""),
    left: Math.max(0, (entry.expires ?? 0) - Date.now()) || ASK_MS,
    total: ASK_MS,
    buttons: [{ id: "withdraw", kind: "ghost", icon: "fa-solid fa-xmark", label: P("UI.Withdraw") }],
    onButton: async (id, el) => {
      for (const b of el.querySelectorAll(".dl-btn")) b.disabled = true;
      const result = await cancelInvite(entry.id);
      if (!result?.ok) closePanel(`pwait:${entry.id}`);
    }
  });
}

/** The invitation, on the screen of whoever answers for the invited. */
function askPanel({ invite: entry }) {
  sound();
  openPanel(`pask:${entry.id}`, {
    title: P("UI.AskTitle"),
    icon: "fa-solid fa-users",
    html: `${pair(entry.from, entry.to)}`
      + `<p class="dl-box-lead">${escape(P("UI.Asks", { name: entry.from.name, target: entry.to.name }))}</p>`
      + `<p class="dl-box-rule">${escape(P("UI.AskRule", { n: entry.size, max: MAX_PARTY }))}</p>`
      + `<p class="dl-box-question">${escape(P("UI.Question"))}</p>`,
    left: Math.max(0, (entry.expires ?? 0) - Date.now()) || ASK_MS,
    total: ASK_MS,
    buttons: [
      { id: "accept", kind: "primary", icon: "fa-solid fa-check", label: P("UI.Accept") },
      { id: "decline", kind: "ghost", icon: "fa-solid fa-xmark", label: P("UI.Decline") }
    ],
    onButton: async (id, el) => {
      for (const b of el.querySelectorAll(".dl-btn")) b.disabled = true;
      const result = await answerInvite(entry.id, id === "accept");
      if (!result?.ok) {
        closePanel(`pask:${entry.id}`);
        const text = errorText(result);
        if (text) note(text, { icon: "fa-solid fa-ban" });
      }
    }
  });
}

/** An invitation ended: its panels close, and whoever didn't end it hears how. */
function onClosed(message) {
  const asked = hasPanel(`pask:${message.id}`);
  const waited = hasPanel(`pwait:${message.id}`);
  closePanel(`pask:${message.id}`);
  closePanel(`pwait:${message.id}`);
  const why = message.why;
  if (why === "accepted") {
    if (waited) note(P("UI.Closed.accepted", { name: message.invited }), { icon: "fa-solid fa-user-plus" });
    return;
  }
  if (why === "invalid") {
    if (asked || waited) note(errorText({ error: message.error, errorData: message.errorData }), { icon: "fa-solid fa-ban" });
    return;
  }
  // The one who invited hears of the invited; the invited, of the one who invited
  if (waited && ["declined", "expired"].includes(why)) note(P(`UI.Closed.${why}`, { name: message.invited }), { icon: "fa-solid fa-ban" });
  if (asked && ["cancelled", "expired"].includes(why)) note(P(`UI.Closed.${why}Asked`, { name: message.inviter }));
}

/* -------------------------------------------- */
/*  The bubble                                  */
/* -------------------------------------------- */

/** The party's entries in the bubble of someone else's character. */
function registerBubbleEntries() {
  const target = token => baseOf(token.actor);
  const mine = () => actingCharacter();
  const leading = () => {
    const me = mine();
    const party = me ? partyOf(me) : null;
    return (party && isLeader(party, me)) ? { me, party } : null;
  };
  registerBubbleEntry({
    id: "partyInvite", order: 1, icon: "fa-solid fa-user-plus",
    visible: token => {
      const actor = target(token);
      if (!canJoin(actor) || partyOf(actor)) return false;
      const me = mine();
      const party = me ? partyOf(me) : null;
      return !party || isLeader(party, me);
    },
    label: () => P("UI.Invite"),
    onClick: token => inviteFlow(target(token))
  });
  registerBubbleEntry({
    id: "partyLead", order: 2, icon: "fa-solid fa-crown",
    visible: token => !!leading() && sameParty(leading().me, target(token)),
    label: () => P("UI.Promote"),
    onClick: async token => {
      const { me } = leading() ?? {};
      const result = await promoteMember(me, target(token));
      if (!result?.ok) note(errorText(result) || P("Error.Generic"), { icon: "fa-solid fa-ban" });
    }
  });
  registerBubbleEntry({
    id: "partyKick", order: 3, icon: "fa-solid fa-user-minus",
    visible: token => !!leading() && sameParty(leading().me, target(token)),
    label: () => P("UI.Kick"),
    onClick: async token => {
      const { me } = leading() ?? {};
      const result = await kickMember(me, target(token));
      if (!result?.ok) note(errorText(result) || P("Error.Generic"), { icon: "fa-solid fa-ban" });
    }
  });
  registerBubbleEntry({
    id: "partyOf", order: 4, icon: "fa-solid fa-users",
    // Someone in a party that isn't the user's: whose it is
    visible: token => {
      const party = partyOf(target(token));
      const me = mine();
      return !!party && !(me && sameParty(me, target(token)));
    },
    label: token => P("UI.InPartyOf", { name: faceOf(fromUuidSync(partyOf(target(token))?.leader)).name }),
    onClick: () => game.eternia.party?.open()
  });
}

/* -------------------------------------------- */
/*  The frame                                   */
/* -------------------------------------------- */

/** The party the frame shows: the one of the character the user acts with, else the user's first. */
export function framedParty() {
  if (game.user.isGM) return null;
  const me = actingCharacter();
  return (me ? partyOf(me) : null) ?? partiesOfUser()[0] ?? null;
}

/** Whether a character has a token on the scene being viewed. */
const hereOf = actor => !!canvas?.scene && canvas.scene.tokens.some(t => t.actor && (baseOf(t.actor)?.uuid === actor.uuid));

/** Whether the players of a character are on. */
const onlineOf = actor => game.users.some(u => !u.isGM && u.active && actor.testUserPermission(u, "OWNER"));

/** What a member shows in the frame and in the window. */
export function memberView(party, actor) {
  const max = Math.max(1, toInt(actor.system.health?.max));
  const hp = Math.max(0, toInt(actor.system.health?.value));
  const pct = Math.clamp((hp / max) * 100, 0, 100);
  const dead = actor.statuses.has("dead");
  const down = dead || isDying(actor) || actor.statuses.has("incapacitated");
  const here = hereOf(actor);
  const online = onlineOf(actor);
  const where = dead ? P("Where.dead") : (down ? P("Where.down") : (!online ? P("Where.away") : (here ? P("Where.here") : P("Where.far"))));
  return {
    uuid: actor.uuid,
    name: faceOf(actor).name,
    img: faceOf(actor).img,
    rank: Math.max(1, toInt(actor.system.infos?.crank) || 1),
    hp, max, pct: Math.round(pct * 10) / 10,
    tone: (pct > 50) ? "high" : ((pct > 20) ? "mid" : "low"),
    leader: isLeader(party, actor),
    mine: actor.isOwner,
    here, online, down, dead, where
  };
}

let drawFrame = null;
/** Draw the frame again (at most once a frame). */
export function refreshFrame() {
  if (drawFrame) return;
  drawFrame = requestAnimationFrame(() => {
    drawFrame = null;
    renderFrame();
  });
}

/** The frame folded (only the bar), on this window. */
let folded = false;

function renderFrame() {
  const party = game.settings.get(SYSTEM_ID, "partyFrame") ? framedParty() : null;
  let el = document.getElementById("eternia-party");
  if (!party) return el?.remove();
  if (!el) {
    el = document.createElement("section");
    el.id = "eternia-party";
    el.addEventListener("click", onFrameClick);
    document.body.append(el);
  }
  const members = membersOf(party).map(a => memberView(party, a));
  el.className = `pt-frame${folded ? " folded" : ""}`;
  // Beside the scene controls, wherever they end
  const controls = document.getElementById("scene-controls")?.getBoundingClientRect();
  if (controls?.width) el.style.setProperty("--pt-frame-left", `${Math.round(controls.right + 14)}px`);
  el.innerHTML = `<header class="pt-frame-head">`
    + `<i class="fa-solid fa-users"></i><span>${escape(P("Frame.Title"))}</span><b>${members.length}/${MAX_PARTY}</b>`
    + `<button type="button" data-frame="open" data-tooltip-text="${escape(P("Frame.Open"))}"><i class="fa-solid fa-up-right-from-square"></i></button>`
    + `<button type="button" data-frame="fold" data-tooltip-text="${escape(P(folded ? "Frame.Unfold" : "Frame.Fold"))}"><i class="fa-solid fa-chevron-${folded ? "down" : "up"}"></i></button></header>`
    + (folded ? "" : `<ol class="pt-frame-list">${members.map(m => `<li class="pt-member${m.leader ? " leader" : ""}${m.mine ? " mine" : ""}${m.down ? " down" : ""}${m.dead ? " dead" : ""}${m.online ? "" : " away"}${m.here ? " here" : ""}" data-uuid="${escape(m.uuid)}" data-tooltip-text="${escape(`${m.name} · ${m.where}`)}">`
      + `<span class="pt-face"><img src="${escape(m.img)}" alt="">${m.leader ? "<i class=\"pt-crown fa-solid fa-crown\"></i>" : ""}</span>`
      + `<span class="pt-info"><span class="pt-name">${escape(m.name)}</span>`
      + `<span class="pt-hp ${m.tone}"><i style="width: ${m.pct}%"></i></span>`
      + `<small><b>${escape(P("Frame.Rank", { rank: m.rank }))}</b><span>${m.hp}/${m.max}</span>${m.here ? "" : `<em>${escape(m.where)}</em>`}</small></span></li>`).join("")}</ol>`);
}

function onFrameClick(event) {
  const button = event.target.closest("[data-frame]");
  if (button?.dataset.frame === "fold") {
    folded = !folded;
    return renderFrame();
  }
  if (button?.dataset.frame === "open") return game.eternia.party?.open();
  const row = event.target.closest(".pt-member[data-uuid]");
  if (!row || !canvas?.ready) return;
  const actor = fromUuidSync(row.dataset.uuid);
  const token = actor?.getActiveTokens(true).find(t => t.document.parent === canvas.scene && t.visible);
  if (!token) return;
  canvas.animatePan({ x: token.center.x, y: token.center.y, duration: 400 });
  if (actor.isOwner) token.control({ releaseOthers: true });
}

/* -------------------------------------------- */
/*  Registration                                */
/* -------------------------------------------- */

/** Call during the `init` hook. */
export function registerPartyScreens() {
  onPartyMessage("ask", askPanel);
  onPartyMessage("closed", onClosed);
  registerPanels();
  registerBubbleEntries();
  game.settings.register(SYSTEM_ID, "partyFrame", {
    name: "ETERNIA.Settings.partyFrame.Name",
    hint: "ETERNIA.Settings.partyFrame.Hint",
    scope: "client",
    config: true,
    type: Boolean,
    default: true,
    onChange: () => refreshFrame()
  });
  Hooks.on("eternia.partiesChanged", () => refreshFrame());
  for (const hook of ["canvasReady", "createToken", "deleteToken", "controlToken", "userConnected"]) Hooks.on(hook, () => refreshFrame());
  Hooks.on("updateActor", actor => {
    if ((actor.type === "character") && document.getElementById("eternia-party")) refreshFrame();
  });
  // A status of a member the frame shows (a row of the open list reads only its own actor; the folded frame, none)
  for (const hook of ["createActiveEffect", "deleteActiveEffect"]) {
    Hooks.on(hook, effect => {
      const actor = effect.parent;
      if (!(actor instanceof Actor)) return;
      const rows = document.getElementById("eternia-party")?.querySelectorAll(".pt-member[data-uuid]") ?? [];
      if ([...rows].some(row => row.dataset.uuid === actor.uuid)) refreshFrame();
    });
  }
  Hooks.once("ready", () => refreshFrame());
}

