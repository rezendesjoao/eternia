/**
 * The parties (party.mjs: the invitations and the changes on the primary GM; ui.mjs: the invitation's panels, the
 * party's frame and the bubble's entries; window.mjs: the party's window; state.mjs: what a party is): the world
 * setting, the "Grupo" button of the token controls (after the Duels), the windows drawn again when a party changes,
 * and the API for macros (`game.eternia.party`).
 */
import { partiesOfUser, parties, partyOf, membersOf } from "./state.mjs";
import {
  answerInvite, cancelInvite, disbandParty, formParty, invite, kickMember, leaveParty, promoteMember, registerPartyRules
} from "./party.mjs";
import { actingCharacter, framedParty, inviteFlow, refreshFrame, registerPartyScreens } from "./ui.mjs";
import { PartyWindow, registerPartyWindow } from "./window.mjs";

/** Call during the `init` hook (after the Duels: the buttons keep that order). */
export function registerParty() {
  registerPartyRules();
  registerPartyScreens();
  registerPartyWindow();
  foundry.applications.handlebars.loadTemplates(["systems/eternia/templates/party/window.hbs", "systems/eternia/templates/party/member.hbs"]);

  Hooks.on("getSceneControlButtons", controls => {
    const tokens = controls.tokens;
    if (!tokens?.tools) return;
    tokens.tools.eterniaParty = {
      name: "eterniaParty",
      title: "ETERNIA.Party.Button",
      icon: "fa-solid fa-users",
      order: Object.keys(tokens.tools).length,
      button: true,
      visible: true,
      onChange: () => PartyWindow.toggle()
    };
  });

  game.eternia.party = {
    open: () => PartyWindow.open(),
    all: parties,
    of: partyOf,
    members: membersOf,
    mine: partiesOfUser,
    framed: framedParty,
    acting: actingCharacter,
    invite,
    inviteFlow,
    answer: answerInvite,
    cancel: cancelInvite,
    leave: leaveParty,
    kick: kickMember,
    promote: promoteMember,
    disband: disbandParty,
    form: formParty,
    refresh: refreshFrame
  };
}
