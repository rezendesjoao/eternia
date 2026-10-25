/**
 * Saving (Salvar): the Stray of the bestiary (a skill with `flags.eternia.monster = { rule: "save", below }`, caught in
 * the fourth stage of their form) can be brought back instead of killed. With its HP at `below` of the max (0.25) or
 * less, a character engaged with it (on one of its squares) spends a Major Action (in a combat, in its own Main Process)
 * and rolls Negotiation against its Resistance, both rolled, by the rule of the Hit Check (a fumble always fails, a
 * critical always wins, the monster wins the ties). Winning, the monster is [Pacified] until the end of the scene and
 * leaves the fight: defeated in the combat, no drops (`noLoot`), `flags.eternia.saved = { by, name }`; the GM may then
 * make it a Connection of the one who saved it (the card's button). The card comes out the first time its HP reach that
 * share (`saveOffered`), with the Save button; the roll goes on the saver's window and the GM applies it (`bestiarySave`).
 */
import { L, SYSTEM_ID } from "../settings.mjs";
import { isLocalChange } from "../helpers/clients.mjs";
import { actorName, combatOf, combatantOf, toInt } from "../helpers/utils.mjs";
import { registerHandler, request } from "../piles/pile-socket.mjs";
import { actionsLeft, spendAction } from "../automation/use.mjs";
import { applyModifier, checkModifier, consumeAfterRoll } from "../conditions/rolls.mjs";
import { diceFormula } from "../helpers/dice.mjs";
import { statusEffectData } from "../chat/status-links.mjs";

const TEMPLATE = "systems/eternia/templates/chat/save-card.hbs";

/** A monster's own name, without its token's number ("O Ungido Partido", not "O Ungido Partido (1)"). */
const personName = actor => game.actors.get(actor.id)?.name ?? actor.name;

/** A monster's save rule (its skill's), or null. */
export function saveRule(actor) {
  const item = (actor?.items ?? []).find(i => (i.type === "skill") && (i.getFlag(SYSTEM_ID, "monster")?.rule === "save"));
  return item ? { item, below: Number(item.getFlag(SYSTEM_ID, "monster").below) || 0.25 } : null;
}

/** Whether a monster can be reached now: standing, at its share of HP or less, not saved yet. */
export function canBeSaved(actor) {
  const rule = saveRule(actor);
  if (!rule || actor.getFlag(SYSTEM_ID, "saved") || actor.statuses.has("dead") || actor.statuses.has("incapacitated")) return false;
  const hp = toInt(actor.system.health?.value);
  const max = toInt(actor.system.health?.max);
  return (hp > 0) && (max > 0) && (hp <= Math.floor(max * rule.below));
}

/** Whether two tokens share a square (engaged). */
function engaged(a, b) {
  const size = a.parent.grid.size;
  const box = t => ({ x0: Math.round(t.x / size), y0: Math.round(t.y / size), x1: Math.round(t.x / size) + Math.max(1, toInt(t.width)) - 1, y1: Math.round(t.y / size) + Math.max(1, toInt(t.height)) - 1 });
  const p = box(a), q = box(b);
  return (p.x0 <= q.x1) && (q.x0 <= p.x1) && (p.y0 <= q.y1) && (q.y0 <= p.y1);
}

/** A roll of a check: its total and whether it is a critical or a fumble (two 6s or more; all 1s). */
async function checkRoll(formula) {
  const roll = await new Roll(formula).evaluate();
  const results = roll.dice[0]?.results.map(r => r.result) ?? [];
  const fumble = results.length > 0 && results.every(r => r === 1);
  const critical = !fumble && (results.filter(r => r === 6).length >= 2);
  return { roll, total: roll.total, critical, fumble };
}

/* -------------------------------------------- */
/*  The card                                    */
/* -------------------------------------------- */

/** The card's data and HTML: the monster, what happened, and the button that fits (Save, or the GM's Connection). */
async function renderCard(token, data) {
  const actor = token.actor;
  const res = actor.system.checks?.resistance ?? {};
  return foundry.applications.handlebars.renderTemplate(TEMPLATE, {
    img: actor.img, name: actorName(actor), eyebrow: L("Save.Eyebrow"), event: data.event,
    resistLabel: L("Save.ResistLabel"), resist: diceFormula({ dice: Math.max(1, toInt(res.dice) || 2), mod: toInt(res.mod) }),
    open: data.state === "open", saved: data.state === "saved", connected: !!data.connected,
    tryLabel: L("Save.Try"), tryHint: L("Save.Hint"),
    connectLabel: L("Save.Connect"), connectHint: L("Save.ConnectHint", { name: actorName(actor), saver: data.saverName ?? "" }),
    connectedLabel: L("Save.Connected", { name: personName(actor), saver: data.saverName ?? "" })
  });
}

/** Post the save card of a monster. */
async function postCard(token, data) {
  const content = await renderCard(token, data);
  return ChatMessage.create({ speaker: { alias: actorName(token.actor) }, content, flags: { [SYSTEM_ID]: { saveCard: { tokenUuid: token.uuid, ...data } } } });
}

/** HP changed (on the window that changed them): the first time a monster can be reached, the card with the Save button. */
async function checkSave(actor) {
  if (!canBeSaved(actor) || actor.getFlag(SYSTEM_ID, "saveOffered")) return;
  const token = actor.token ?? actor.getActiveTokens(false, true).find(t => t.parent === canvas?.scene) ?? null;
  if (!token) return;
  await actor.setFlag(SYSTEM_ID, "saveOffered", true);
  await postCard(token, { state: "open", event: L("Save.Offered", { name: actorName(actor) }) });
}

/* -------------------------------------------- */
/*  Trying                                      */
/* -------------------------------------------- */

/** The character this user tries with: a controlled token of theirs, else their assigned character's token. */
function saverToken() {
  const controlled = (canvas?.tokens?.controlled ?? []).find(t => t.actor?.isOwner && (t.actor.type === "character"));
  if (controlled) return controlled.document;
  const character = game.user.character;
  return character?.getActiveTokens?.(false, true).find(t => t.parent === canvas?.scene) ?? null;
}

/**
 * Try to save a monster: the checks, the Major Action, Negotiation against its Resistance, then the GM applies it.
 * @param {TokenDocument} token    The monster's token
 * @param {TokenDocument} [saver]  The character's token
 */
export async function trySave(token, saver = saverToken()) {
  const actor = saver?.actor;
  const monster = token?.actor;
  if (!actor || (actor.type !== "character") || !monster) return ui.notifications.warn(L("Save.NoSaver"));
  if (monster.getFlag(SYSTEM_ID, "saved")) return ui.notifications.warn(L("Save.Already"));
  if (!canBeSaved(monster)) return ui.notifications.warn(L("Save.NotYet", { name: actorName(monster) }));
  if ((saver.parent !== token.parent) || !engaged(saver, token)) return ui.notifications.warn(L("Save.NotEngaged", { name: actorName(actor) }));
  // In a combat: in its own Main Process, with a Major Action left
  const combat = combatOf(actor);
  const combatant = combat ? combatantOf(combat, actor) : null;
  const left = actionsLeft(actor);
  if (combatant && left) {
    if ((combat.phase !== "main") || (combat.progress?.active !== combatant.id)) return ui.notifications.warn(L("Save.NotYourProcess", { name: actorName(actor) }));
    if (!left.major) return ui.notifications.warn(L("Save.NoMajor", { name: actorName(actor) }));
    await spendAction(actor, "major");
  }
  const check = actor.system.checks?.negotiation ?? {};
  const condition = checkModifier(actor, { stat: "negotiation" });
  const mine = await checkRoll(diceFormula(applyModifier({ dice: Math.max(1, toInt(check.dice) || 2), mod: toInt(check.total) }, condition)));
  const res = monster.system.checks?.resistance ?? {};
  const theirs = await checkRoll(diceFormula({ dice: Math.max(1, toInt(res.dice) || 2), mod: toInt(res.mod) }));
  await mine.roll.toMessage({
    speaker: ChatMessage.getSpeaker({ actor }),
    flavor: `${L("Save.Flavor", { name: actorName(monster), vs: theirs.total })}${condition.text ? ` (${condition.text})` : ""}`
  });
  await consumeAfterRoll(actor, condition.consume);
  // The rule of the Hit Check: the fumbles fail, the criticals win, the monster wins ties and critical against critical
  const success = !mine.fumble && (theirs.fumble || (!theirs.critical && (mine.critical || (mine.total > theirs.total))));
  const result = await request("bestiarySave", { tokenUuid: token.uuid, saverUuid: actor.uuid, total: mine.total, vs: theirs.total, success });
  if (!result?.ok && result?.error) ui.notifications.warn(game.i18n.localize(result.error));
  return result;
}

/** The GM applies a try: saved ([Pacified] until the end of the scene, out of the fight, no drops), or not yet. */
async function onSave({ tokenUuid, saverUuid, total, vs, success }) {
  const token = fromUuidSync(tokenUuid);
  const monster = token?.actor;
  const saver = fromUuidSync(saverUuid);
  if (!monster || !(saver instanceof Actor)) return { ok: false };
  if (monster.getFlag(SYSTEM_ID, "saved")) return { ok: true };
  const names = { name: actorName(monster), saver: actorName(saver), total, vs };
  if (!success) {
    await postCard(token, { state: "open", event: L("Save.Failed", names) });
    return { ok: true };
  }
  // [Pacified] that the Cleanup doesn't end: until the end of the scene
  const effect = statusEffectData("pacified", null, "", { caster: saver, expires: "endOfScene" });
  foundry.utils.setProperty(effect, `flags.${SYSTEM_ID}.infinite`, true);
  await monster.createEmbeddedDocuments("ActiveEffect", [effect]);
  await monster.update({ [`flags.${SYSTEM_ID}.saved`]: { by: saver.uuid, name: actorName(saver) }, [`flags.${SYSTEM_ID}.noLoot`]: true });
  for (const combat of game.combats) {
    const combatant = combat.combatants.find(c => c.tokenId === token.id);
    if (combatant) await combatant.update({ defeated: true });
  }
  await postCard(token, { state: "saved", saverUuid: saver.uuid, saverName: actorName(saver), event: L("Save.Saved", names) });
  return { ok: true };
}

/** The GM makes the saved monster a Connection of the one who saved it. */
async function connect(message) {
  const data = message.getFlag(SYSTEM_ID, "saveCard");
  const token = fromUuidSync(data?.tokenUuid ?? "");
  const saver = fromUuidSync(data?.saverUuid ?? "");
  if (!token?.actor || !(saver instanceof Actor) || data.connected) return;
  const monster = token.actor;
  await saver.createEmbeddedDocuments("Item", [{
    name: personName(monster), type: "connection", img: monster.img,
    system: { description: `<p>${L("Save.ConnectionText", { name: personName(monster), saver: actorName(saver) })}</p>` }
  }]);
  const next = { ...data, connected: true };
  await message.update({ content: await renderCard(token, next), [`flags.${SYSTEM_ID}.saveCard`]: next });
  ui.notifications.info(L("Save.Connected", { name: personName(monster), saver: actorName(saver) }));
}

/* -------------------------------------------- */
/*  Registration                                */
/* -------------------------------------------- */

/** The card's buttons: Save (anyone, with their character), Connection (the GM, once saved). */
function onRenderMessage(message, html) {
  const data = message.getFlag(SYSTEM_ID, "saveCard");
  if (!data) return;
  const token = fromUuidSync(data.tokenUuid);
  const tryButton = html.querySelector('[data-action="save-try"]');
  if (tryButton) {
    if (!token?.actor || token.actor.getFlag(SYSTEM_ID, "saved")) tryButton.remove();
    else tryButton.addEventListener("click", event => {
      event.preventDefault();
      trySave(fromUuidSync(data.tokenUuid)).catch(err => console.error(`${SYSTEM_ID} | Saving failed`, err));
    });
  }
  const connectButton = html.querySelector('[data-action="save-connect"]');
  if (connectButton) {
    if (!game.user.isGM || data.connected) connectButton.remove();
    else connectButton.addEventListener("click", event => {
      event.preventDefault();
      connectButton.disabled = true;
      connect(message).catch(err => console.error(`${SYSTEM_ID} | Connection failed`, err));
    });
  }
}

/** Call during the `init` hook. */
export function registerSave() {
  registerHandler("bestiarySave", payload => onSave(payload));
  Hooks.on("renderChatMessageHTML", onRenderMessage);
  Hooks.on("updateActor", (actor, changes, options, userId) => {
    if ((actor.type !== "monster") || !isLocalChange(options, userId) || !foundry.utils.hasProperty(changes, "system.health")) return;
    checkSave(actor).catch(err => console.error(`${SYSTEM_ID} | Saving failed`, err));
  });
  foundry.applications.handlebars.loadTemplates([TEMPLATE]);
}
