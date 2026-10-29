/**
 * The party's window (the "Grupo" button of the token controls; templates/party/window.hbs, css/party.css): for a
 * player, the party of the character it acts with (its members with the HP, the NP and where each one is; the
 * leader's "Lead" and "Take out", everyone's "Leave", the leader's "Disband"), the characters of the other players it
 * can invite (only who leads, or who has no party yet, invites), and how the party shares the XP. For the GM, every
 * party of the world, with the same buttons, and "Form a party" with the characters of the tokens selected.
 */
import { L } from "../settings.mjs";
import { confirmBox } from "../helpers/dialogs.mjs";
import { pictureOf } from "../canvas/bubble.mjs";
import { disbandParty, errorText, formParty, inviteProblem, kickMember, leaveParty, promoteMember } from "./party.mjs";
import { MAX_PARTY, canJoin, isLeader, memberKey, membersOf, parties, partyById, partyOf } from "./state.mjs";
import { actingCharacter, inviteFlow, memberView, note } from "./ui.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;
const P = (key, data) => L(`Party.${key}`, data);

/** The world actor of a token's actor. */
const baseOf = actor => (actor?.isToken ? (game.actors.get(actor.id) ?? actor) : actor);

export class PartyWindow extends HandlebarsApplicationMixin(ApplicationV2) {

  static ID = "eternia-party-window";

  /** Open the window, or bring it to the front. */
  static open() {
    let app = foundry.applications.instances.get(this.ID);
    if (!app) app = new this();
    if (app.rendered) app.bringToFront?.();
    app.render({ force: true });
    return app;
  }

  /** The button of the token controls: opens the window, or closes it when it is open. */
  static toggle() {
    const existing = foundry.applications.instances.get(this.ID);
    if (existing?.rendered) return existing.close();
    return this.open();
  }

  /** Draw the window again, when it is open. */
  static refresh() {
    const app = foundry.applications.instances.get(this.ID);
    if (app?.rendered) app.render();
  }

  constructor(options = {}) {
    super({ ...options, id: PartyWindow.ID });
  }

  static DEFAULT_OPTIONS = {
    classes: ["eternia", "eternia-party"],
    tag: "div",
    position: { width: 820, height: 640 },
    window: { icon: "fa-solid fa-users", resizable: true, title: "ETERNIA.Party.Window" },
    actions: {
      invite: PartyWindow.#onInvite,
      promote: PartyWindow.#onPromote,
      kick: PartyWindow.#onKick,
      leave: PartyWindow.#onLeave,
      disband: PartyWindow.#onDisband,
      form: PartyWindow.#onForm,
      pan: PartyWindow.#onPan
    }
  };

  static PARTS = {
    main: { template: "systems/eternia/templates/party/window.hbs", scrollable: [".pt-members", ".pt-candidates", ".pt-all"] }
  };

  /** The character the user picked in the window (a player with several), else the one it acts with. */
  #chosen = null;

  /** The character the window is about. */
  #me() {
    const chosen = this.#chosen ? fromUuidSync(this.#chosen) : null;
    if (chosen?.isOwner && canJoin(chosen)) return chosen;
    return actingCharacter();
  }

  /** @override */
  async _prepareContext(options) {
    const gm = game.user.isGM;
    const me = this.#me();
    const party = me ? partyOf(me) : null;
    const leads = !!party && isLeader(party, me);
    const owned = gm ? [] : game.actors.filter(a => canJoin(a) && a.isOwner);
    const view = p => {
      const leader = fromUuidSync(p.leader);
      return {
        id: p.id,
        title: P("Heading.Of", { name: leader?.prototypeToken?.name || leader?.name || "?" }),
        count: P("Count", { n: p.members.length, max: MAX_PARTY }),
        members: membersOf(p).map(a => {
          const m = memberView(p, a);
          const self = !!me && (memberKey(a) === memberKey(me));
          return { ...m, self, canLead: (gm || (leads && (p.id === party?.id))) && !m.leader, canKick: (gm || (leads && (p.id === party?.id))) && !self && (gm || !m.leader) };
        })
      };
    };
    // Who the user can invite: the characters of the other players, outside any party
    const canInvite = !gm && !!me && (!party || (leads && (party.members.length < MAX_PARTY)));
    const candidates = canInvite ? game.actors.filter(a => canJoin(a) && !a.isOwner && !partyOf(a)).map(a => {
      const online = game.users.some(u => !u.isGM && u.active && a.testUserPermission(u, "OWNER"));
      const problem = inviteProblem(me, a);
      return {
        uuid: a.uuid, name: a.prototypeToken?.name || a.name, img: pictureOf(a, a.prototypeToken),
        rank: Math.max(1, Number(a.system.infos?.crank) || 1),
        online, players: game.users.filter(u => !u.isGM && a.testUserPermission(u, "OWNER")).map(u => u.name).join(", "),
        blocked: problem ? P(`Error.${problem.key}`, problem.data ?? {}) : (!online ? P("Error.Away", { name: a.name }) : "")
      };
    }).sort((a, b) => (Number(b.online) - Number(a.online)) || a.name.localeCompare(b.name, game.i18n.lang)) : [];
    const selected = gm && canvas?.ready ? canvas.tokens.controlled.map(t => baseOf(t.actor)).filter(canJoin) : [];
    return {
      gm,
      me: me ? { uuid: me.uuid, name: me.prototypeToken?.name || me.name, img: pictureOf(me, me.prototypeToken) } : null,
      choices: (owned.length > 1) ? owned.map(a => ({ uuid: a.uuid, name: a.name, selected: me && (a.uuid === me.uuid) })) : [],
      party: party ? view(party) : null,
      leads,
      canInvite,
      inviteNote: (!gm && me && party && !leads) ? P("UI.OnlyLeader") : ((party && (party.members.length >= MAX_PARTY)) ? P("Error.Full", { n: MAX_PARTY }) : ""),
      candidates,
      all: gm ? parties().map(view) : [],
      selected: selected.map(a => a.name).join(", "),
      canForm: selected.length >= 2,
      max: MAX_PARTY,
      rules: [1, 2, 3, 4, 5].map(n => P(`Rules.${n}`, { max: MAX_PARTY }))
    };
  }

  /** @override */
  async _onRender(context, options) {
    await super._onRender(context, options);
    const root = this.element;
    root.querySelector("select[name='pt-me']")?.addEventListener("change", event => {
      this.#chosen = event.target.value || null;
      this.render();
    });
    const search = root.querySelector(".pt-search input");
    search?.addEventListener("input", () => {
      const q = search.value.trim().toLocaleLowerCase(game.i18n.lang);
      for (const li of root.querySelectorAll(".pt-candidate")) li.hidden = !!q && !li.dataset.search.includes(q);
    });
    for (const li of root.querySelectorAll(".pt-candidate")) li.dataset.search = (li.dataset.name ?? "").toLocaleLowerCase(game.i18n.lang);
  }

  /** A request's answer: a note when it failed. */
  static #after(result) {
    if (!result?.ok) note(errorText(result) || P("Error.Generic"), { icon: "fa-solid fa-ban" });
    return result;
  }

  static async #onInvite(event, target) {
    const actor = fromUuidSync(target.closest("[data-uuid]")?.dataset.uuid ?? "");
    if (!actor) return;
    await inviteFlow(actor, this.#me());
  }

  static async #onPromote(event, target) {
    const uuid = target.closest("[data-uuid]")?.dataset.uuid;
    if (!uuid) return;
    PartyWindow.#after(await promoteMember(game.user.isGM ? null : this.#me(), uuid));
  }

  static async #onKick(event, target) {
    const uuid = target.closest("[data-uuid]")?.dataset.uuid;
    const actor = uuid ? fromUuidSync(uuid) : null;
    if (!actor) return;
    const ok = await confirmBox({
      title: P("UI.KickTitle"), icon: "fa-solid fa-user-minus", img: actor.img, eyebrow: P("Title"), heading: actor.name,
      lead: P("UI.KickLead", { name: actor.name }), yes: P("UI.Kick"), yesIcon: "fa-solid fa-user-minus", tone: "danger"
    });
    if (ok) PartyWindow.#after(await kickMember(game.user.isGM ? null : this.#me(), uuid));
  }

  static async #onLeave() {
    const me = this.#me();
    if (!me) return;
    const ok = await confirmBox({
      title: P("UI.LeaveTitle"), icon: "fa-solid fa-person-walking-arrow-right", img: me.img, eyebrow: P("Title"), heading: me.name,
      lead: P("UI.LeaveLead"), yes: P("UI.Leave"), yesIcon: "fa-solid fa-person-walking-arrow-right"
    });
    if (ok) PartyWindow.#after(await leaveParty(me));
  }

  static async #onDisband(event, target) {
    const id = target.closest("[data-party]")?.dataset.party;
    const party = id ? partyById(id) : null;
    if (!party) return;
    const ok = await confirmBox({
      title: P("UI.DisbandTitle"), icon: "fa-solid fa-people-arrows", eyebrow: P("Title"), heading: P("Heading.Of", { name: fromUuidSync(party.leader)?.name ?? "?" }),
      lead: P("UI.DisbandLead"), yes: P("UI.Disband"), yesIcon: "fa-solid fa-people-arrows", tone: "danger"
    });
    if (ok) PartyWindow.#after(await disbandParty(game.user.isGM ? null : this.#me(), party.id));
  }

  static async #onForm() {
    if (!game.user.isGM || !canvas?.ready) return;
    const actors = canvas.tokens.controlled.map(t => baseOf(t.actor)).filter(canJoin);
    PartyWindow.#after(await formParty(actors));
  }

  static #onPan(event, target) {
    const actor = fromUuidSync(target.closest("[data-uuid]")?.dataset.uuid ?? "");
    const token = actor?.getActiveTokens(true).find(t => t.document.parent === canvas?.scene && t.visible);
    if (token) canvas.animatePan({ x: token.center.x, y: token.center.y, duration: 400 });
  }
}

/** Call during the `init` hook: the window follows the parties, the selection (the GM's Form) and the HP. */
export function registerPartyWindow() {
  Hooks.on("eternia.partiesChanged", () => PartyWindow.refresh());
  for (const hook of ["controlToken", "userConnected", "canvasReady"]) Hooks.on(hook, () => PartyWindow.refresh());
  Hooks.on("updateActor", actor => {
    if ((actor.type === "character") && foundry.applications.instances.get(PartyWindow.ID)?.rendered) PartyWindow.refresh();
  });
}

