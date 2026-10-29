/**
 * The Evolution Ticket (Tíquete de Evolução): a ticket (item `ticket`, subtype "Evolution") that the GM gives for what
 * teaches without a fight (a lesson at the academy, a feat, a favour) and that its holder uses for TICKET_XP of XP
 * each, gives to another character or sells (a [Valioso]: a shop pays it in full). It stacks (`system.quantity`) and
 * takes no room in the bag. Only the GM makes them (the sheet's "+" and `game.eternia.xp.giveTickets`); the player of
 * the character uses them from the Tickets of the inventory, one or several at once, and the XP goes up there (its NP
 * follows: experience/level.mjs). With a GM on, the use goes through the GM (the request `xpTickets`), the only hand that
 * writes the XP then, so a Ticket never races a monster's award; with none, the player's window does it.
 */
import { L, SYSTEM_ID } from "../settings.mjs";
import { escape, toInt } from "../helpers/utils.mjs";
import { boxContent } from "../helpers/dialogs.mjs";
import { registerHandler, request } from "../piles/pile-socket.mjs";
import { TICKET_XP } from "./data.mjs";
import { addXp, baseActor, xpOf } from "./level.mjs";

const X = (key, data) => L(`Xp.${key}`, data);
export const TICKET_SUBTYPE = "Evolution";

/** Whether an item is an Evolution Ticket. */
export const isEvolutionTicket = item => (item?.type === "ticket") && (item.system?.subtype === TICKET_SUBTYPE);

/** An actor's Evolution Tickets (one stack, normally). */
export const ticketsOf = actor => (actor?.items ?? []).filter(isEvolutionTicket);

/** How many Evolution Tickets an actor holds. */
export const ticketCount = actor => ticketsOf(actor).reduce((sum, i) => sum + Math.max(0, toInt(i.system.quantity)), 0);

/**
 * Give an actor Evolution Tickets (GM): onto its stack, or a new one from the item compendium.
 * @param {Actor} actor
 * @param {number} [n]
 * @returns {Promise<Item|null>}
 */
export async function giveTickets(actor, n = 1) {
  const count = Math.max(1, toInt(n));
  const target = baseActor(actor);
  if (!target || (target.type !== "character")) return null;
  const stack = ticketsOf(target)[0];
  if (stack) {
    await stack.update({ "system.quantity": Math.max(0, toInt(stack.system.quantity)) + count });
    return stack;
  }
  const data = await Item.implementation.ticketData(TICKET_SUBTYPE);
  data.system.quantity = count;
  const [item] = await target.createEmbeddedDocuments("Item", [data]);
  return item;
}

/**
 * Use Evolution Tickets: they leave the stack and their XP goes in, with a card in the chat.
 * @param {Actor} actor
 * @param {number} [n]   How many (1 by default; never more than the stack)
 * @returns {Promise<{used: number, xp: number}|null>}
 */
export async function useTickets(actor, n = 1) {
  const target = baseActor(actor);
  if (!target?.isOwner) return null;
  if (!game.user.isGM && game.users.activeGM) {
    const result = await request("xpTickets", { actorUuid: target.uuid, n });
    if (!result?.ok) {
      ui.notifications.warn(result?.error ? game.i18n.format(result.error, result.errorData ?? {}) : X("Ticket.None", { name: target.name }));
      return null;
    }
    return { used: result.used, xp: result.xp };
  }
  return spendTickets(target, n);
}

/** The use itself: the stacks, the card and the XP (the GM's window, or the owner's with no GM on). */
async function spendTickets(target, n) {
  const stacks = ticketsOf(target);
  const held = ticketCount(target);
  const used = Math.min(held, Math.max(1, toInt(n)));
  if (!used) {
    ui.notifications.warn(X("Ticket.None", { name: target.name }));
    return null;
  }
  // Out of the stacks, the first ones first
  let left = used;
  for (const stack of stacks) {
    if (!left) break;
    const qty = Math.max(0, toInt(stack.system.quantity));
    const take = Math.min(qty, left);
    left -= take;
    if (take >= qty) await stack.delete();
    else await stack.update({ "system.quantity": qty - take });
  }
  const xp = used * TICKET_XP;
  const before = xpOf(target);
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor: target }),
    content: `<div class="eternia-xp-ticket"><img src="${escape(stacks[0]?.img ?? "")}" alt="">`
      + `<div><small>${escape(X("Ticket.Eyebrow"))}</small><strong>${escape(X("Ticket.Used", { name: target.name, n: used }))}</strong>`
      + `<span>${escape(X("Ticket.Gain", { xp, before, after: before + xp }))}</span></div></div>`,
    flags: { [SYSTEM_ID]: { xpTicket: { actorUuid: target.uuid, used, xp } } }
  });
  await addXp(target, xp, { source: "ticket" });
  return { used, xp };
}

/** GM side: a player uses the Tickets of a character of theirs. */
async function onTicketsRequest({ actorUuid, n } = {}, user) {
  const actor = actorUuid ? await fromUuid(actorUuid) : null;
  if (!(actor instanceof Actor) || !actor.testUserPermission(user, "OWNER")) return { ok: false, error: "ETERNIA.Piles.Error.Generic" };
  const result = await spendTickets(actor, n);
  return result ? { ok: true, ...result } : { ok: false, error: "ETERNIA.Xp.Ticket.None", errorData: { name: actor.name } };
}

/** Call during the `init` hook. */
export function registerTickets() {
  registerHandler("xpTickets", onTicketsRequest);
}

/**
 * The sheet's "Use": one ticket, or a box with how many when there are more.
 * @param {Actor} actor
 */
export async function useTicketsDialog(actor) {
  const held = ticketCount(actor);
  if (held <= 1) return useTickets(actor, 1);
  const chosen = await foundry.applications.api.DialogV2.prompt({
    window: { title: X("Ticket.Window"), icon: "fa-solid fa-ticket" },
    classes: ["eternia", "lhd-box"],
    position: { width: 420 },
    content: boxContent({
      img: ticketsOf(actor)[0]?.img,
      eyebrow: X("Ticket.Eyebrow"),
      heading: actor.name,
      lead: X("Ticket.Lead", { n: held, xp: TICKET_XP }),
      body: `<div class="form-group lhd-field"><label>${escape(X("Ticket.HowMany"))}</label>`
        + `<input type="number" name="count" min="1" max="${held}" step="1" value="1" autofocus></div>`
    }),
    ok: {
      label: X("Ticket.Use"),
      icon: "fa-solid fa-angles-up",
      callback: (event, button) => Math.clamp(toInt(button.form.elements.count.value) || 1, 1, held)
    },
    rejectClose: false
  });
  if (!chosen) return null;
  return useTickets(actor, chosen);
}
