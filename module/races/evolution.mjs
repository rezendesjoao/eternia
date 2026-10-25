/**
 * The five stages of a race's form. A race item lists them in `flags.eternia.stages` (each one's name and `look`, what
 * changes in the body; stage 1 is the form the character is born with; stages 2 to 5 have the Character Rank they
 * need, the rite, the skills they give — a slot with several is a choice — and, at stage 4, the attributes the +1 may
 * go to). The race item of a character keeps where it
 * is: `flags.eternia.stage` (1 when absent), `flags.eternia.stageBonus` ({ str, dex, pow, int }, read by raceStats) and
 * `flags.eternia.stageLog` (what each stage gave: the skills it created, the attribute).
 *
 * Evolving (the race card of the sheet): the box says what the next stage gives and the rite, and takes the choices.
 * With the world setting `evolutionApproval` on, a player's request goes to the GM as a whispered card with Approve and
 * Refuse; the GM (or anyone, with the setting off) evolves at once. The stage's skills are given as the race's
 * (`grantedBy`); one the character already learned with a pick stops counting as a pick. The GM can also go back one
 * stage (the skills that stage created leave, and its +1). A card in the chat records each change.
 */

import { L, SYSTEM_ID, setting } from "../settings.mjs";
import { getOption } from "../helpers/character-options.mjs";
import { createGranted, GRANT_FLAG } from "../apps/option-grants.mjs";
import { PICK_FLAG } from "../apps/skill-browser.mjs";
import { boxContent } from "../helpers/dialogs.mjs";
import { escape, toInt } from "../helpers/utils.mjs";
import { RACE_COLORS, RACE_DEFAULT_COLOR, ROMAN } from "./data.mjs";

export { ROMAN };

const { DialogV2 } = foundry.applications.api;

const CARD = "systems/eternia/templates/chat/evolve-card.hbs";
const STATS = ["str", "dex", "pow", "int"];

const E = (key, data) => L(`Evolve.${key}`, data);
const rankOf = actor => Math.max(1, toInt(actor.system.infos?.crank) || 1);

/* -------------------------------------------- */
/*  Where a character is                        */
/* -------------------------------------------- */

/**
 * The stages of a race item, cleaned up: [{ stage, rank, name, look, rite, grants: string[][], attribute: string[] }].
 * @param {Item} race
 */
export function raceStages(race) {
  const raw = race?.flags?.[SYSTEM_ID]?.stages;
  if (!Array.isArray(raw)) return [];
  return raw.map(s => ({
    stage: toInt(s.stage),
    rank: Math.max(1, toInt(s.rank)),
    name: String(s.name ?? ""),
    look: String(s.look ?? ""),
    rite: String(s.rite ?? ""),
    grants: (Array.isArray(s.grants) ? s.grants : []).map(slot => (Array.isArray(slot) ? slot : [slot]).map(String)).filter(slot => slot.length),
    attribute: (Array.isArray(s.attribute) ? s.attribute : []).filter(a => STATS.includes(a))
  })).filter(s => (s.stage >= 1) && (s.stage <= 5)).sort((a, b) => a.stage - b.stage);
}

/**
 * The form of a character: its race item, the stages, the one it is at and the next.
 * @param {Actor} actor
 * @returns {{race: Item|null, stages: object[], stage: number, current: object|null, next: object|null, ready: boolean}}
 */
export function formOf(actor) {
  const race = (actor?.type === "character") ? getOption(actor, "race") : null;
  const stages = raceStages(race);
  if (!race || !stages.length) return { race, stages, stage: 0, current: null, next: null, ready: false };
  const stage = Math.min(5, Math.max(1, toInt(race.getFlag(SYSTEM_ID, "stage")) || 1));
  const current = stages.find(s => s.stage === stage) ?? { stage, rank: 1, name: "" };
  const next = stages.find(s => s.stage === stage + 1) ?? null;
  return { race, stages, stage, current, next, ready: !!next && (rankOf(actor) >= next.rank) };
}

/** The +1 of the stages, for raceStats (character-options.mjs). */
export function stageBonus(race) {
  const bonus = race?.flags?.[SYSTEM_ID]?.stageBonus ?? {};
  return Object.fromEntries(STATS.map(k => [k, toInt(bonus[k])]));
}

/** The colour of a race's band. */
export const raceColor = race => RACE_COLORS[race?.system?.identifier] ?? RACE_DEFAULT_COLOR;

/* -------------------------------------------- */
/*  What a stage gives                          */
/* -------------------------------------------- */

/** The skills of a stage's slots, as documents (null when one is missing). */
async function slotSkills(stage) {
  return Promise.all(stage.grants.map(async slot => (await Promise.all(slot.map(uuid => fromUuid(uuid).catch(() => null)))).filter(Boolean)));
}

/** The skill uuids a stage gives with these choices (the first of a slot when the choice is missing or wrong). */
function chosenUuids(stage, choices = {}) {
  return stage.grants.map((slot, i) => {
    const picked = choices.slots?.[i];
    return slot.includes(picked) ? picked : slot[0];
  }).filter(Boolean);
}

/** The attribute a stage's +1 goes to (null when the stage has none). */
function chosenAttribute(stage, choices = {}) {
  if (!stage.attribute.length) return null;
  return stage.attribute.includes(choices.attribute) ? choices.attribute : stage.attribute[0];
}

const statLabel = key => L(`Sheet.Attr.${key}.abbr`);

/* -------------------------------------------- */
/*  The box                                     */
/* -------------------------------------------- */

/**
 * Open the box of the next stage of a character's form (the race card's button). A GM also gets "go back one stage".
 * @param {Actor} actor
 */
export async function openEvolution(actor) {
  const form = formOf(actor);
  if (!form.race) return;
  const gm = game.user.isGM;
  if (!form.next) {
    if (gm && (form.stage > 1)) return confirmRegress(actor, form);
    return ui.notifications.info(E("Last", { name: actor.name }));
  }
  if (!form.ready && !gm) return ui.notifications.warn(E("NotYet", { rank: form.next.rank, stage: ROMAN[form.next.stage] }));

  const next = form.next;
  const skills = await slotSkills(next);
  const lines = [];
  const fields = [];
  skills.forEach((options, i) => {
    if (!options.length) return;
    if (options.length === 1) {
      lines.push({ html: `<b>${escape(options[0].name)}</b>`, kind: "gain", icon: "fa-solid fa-paw" });
      return;
    }
    fields.push(`<fieldset class="lhd-field evolve-choice"><legend>${escape(E("Choose"))}</legend>${options.map((o, n) => `<label>`
      + `<input type="radio" name="slot${i}" value="${escape(o.uuid)}"${n ? "" : " checked"}><img src="${escape(o.img)}" alt="">`
      + `<span>${escape(o.name)}</span></label>`).join("")}</fieldset>`);
  });
  if (next.attribute.length === 1) {
    lines.push({ text: E("Attribute", { stat: statLabel(next.attribute[0]) }), kind: "gain", icon: "fa-solid fa-chart-simple" });
  }
  else if (next.attribute.length > 1) {
    fields.push(`<fieldset class="lhd-field evolve-choice stats"><legend>${escape(E("AttributeChoose"))}</legend>${next.attribute.map((k, n) => `<label`
      + ` data-tooltip="${escape(L(`Sheet.Attr.${k}.name`))}"><input type="radio" name="attribute" value="${k}"${n ? "" : " checked"}>`
      + `<b>${escape(statLabel(k))}</b></label>`).join("")}</fieldset>`);
  }
  if (!form.ready) lines.push({ text: E("GmEarly", { rank: next.rank }), kind: "condition" });
  const asks = !gm && setting("evolutionApproval");
  const rite = next.rite ? `<p class="evolve-rite"><i class="fa-solid fa-scroll"></i><span><b>${escape(E("Rite"))}</b> ${escape(next.rite)}</span></p>` : "";
  const note = `<p class="evolve-note">${escape(E(asks ? "NoteAsk" : "NoteNow"))}</p>`;
  const content = boxContent({
    img: form.race.img,
    eyebrow: E("Eyebrow", { from: ROMAN[form.stage], to: ROMAN[next.stage] }),
    heading: next.name,
    lead: E("Lead", { name: actor.name, race: form.race.name, stage: ROMAN[next.stage] }),
    lines,
    body: `<div class="evolve-form">${fields.join("")}</div>${rite}${note}`
  });

  const read = (button) => {
    const data = button.form ? new foundry.applications.ux.FormDataExtended(button.form).object : {};
    return { slots: next.grants.map((slot, i) => data[`slot${i}`] ?? slot[0]), attribute: data.attribute ?? null };
  };
  const buttons = [{
    action: "evolve", default: true,
    label: asks ? E("Ask") : E("Evolve", { stage: ROMAN[next.stage] }),
    icon: asks ? "fa-solid fa-paper-plane" : "fa-solid fa-paw",
    callback: (event, button) => ({ go: "evolve", choices: read(button) })
  }];
  if (gm && (form.stage > 1)) buttons.push({ action: "back", label: E("Back", { stage: ROMAN[form.stage - 1] }), icon: "fa-solid fa-arrow-rotate-left", callback: () => ({ go: "back" }) });
  buttons.push({ action: "cancel", label: L("Use.Cancel"), icon: "fa-solid fa-xmark" });

  const answer = await DialogV2.wait({
    window: { title: E("Window", { name: actor.name }), icon: "fa-solid fa-paw" },
    classes: ["lhauto-dialog", "lhd-box", "evolve-dialog"],
    position: { width: 470 },
    content,
    buttons,
    rejectClose: false
  });
  if (!answer || (typeof answer !== "object")) return;
  if (answer.go === "back") return regress(actor);
  if (asks) return requestEvolution(actor, next.stage, answer.choices);
  return evolve(actor, next.stage, answer.choices);
}

async function confirmRegress(actor, form) {
  const ok = await DialogV2.confirm({
    window: { title: E("Window", { name: actor.name }), icon: "fa-solid fa-arrow-rotate-left" },
    classes: ["lhauto-dialog", "lhd-box"],
    content: boxContent({ img: form.race.img, eyebrow: E("EyebrowLast"), heading: form.current?.name ?? "",
      lead: E("LastGm", { name: actor.name, stage: ROMAN[form.stage - 1] }) }),
    rejectClose: false,
    yes: { label: E("Back", { stage: ROMAN[form.stage - 1] }), icon: "fa-solid fa-arrow-rotate-left" },
    no: { label: L("Use.Cancel"), icon: "fa-solid fa-xmark" }
  });
  if (ok) return regress(actor);
}

/* -------------------------------------------- */
/*  Evolving                                    */
/* -------------------------------------------- */

/**
 * Take a character to the next stage of its form (who calls it may change the actor: the owner or the GM).
 * @param {Actor} actor
 * @param {number} stage   The stage it goes to (must be the next one)
 * @param {object} [choices]  { slots: uuid per slot, attribute }
 * @returns {Promise<boolean>}
 */
export async function evolve(actor, stage, choices = {}) {
  const form = formOf(actor);
  if (!form.next || (form.next.stage !== toInt(stage))) {
    ui.notifications.warn(E("Stale", { name: actor.name }));
    return false;
  }
  const next = form.next;
  const race = form.race;
  const uuids = chosenUuids(next, choices);
  const before = new Set(actor.items.map(i => i.id));

  // Skills the character already learned with a pick (the old unlockables): now they are the race's, and the pick is back
  const source = race._stats?.compendiumSource ?? race.name;
  const owned = [];
  for (const uuid of uuids) {
    const doc = await fromUuid(uuid).catch(() => null);
    const item = actor.items.find(i => (i.type === "skill") && ((i._stats?.compendiumSource === uuid)
      || (doc && (i.name.trim().toLowerCase() === doc.name.trim().toLowerCase()))));
    if (item) owned.push(item);
  }
  if (owned.length) {
    await actor.updateEmbeddedDocuments("Item", owned.map(i => ({
      _id: i.id,
      [`flags.${SYSTEM_ID}.${GRANT_FLAG}`]: { type: "race", source },
      [`flags.${SYSTEM_ID}.-=${PICK_FLAG}`]: null,
      [`flags.${SYSTEM_ID}.raceStage`]: next.stage
    })));
  }
  await createGranted(actor, race, uuids);
  const created = actor.items.filter(i => !before.has(i.id)).map(i => i.id);

  const attribute = chosenAttribute(next, choices);
  const bonus = stageBonus(race);
  if (attribute) bonus[attribute] += 1;
  const log = [...(race.getFlag(SYSTEM_ID, "stageLog") ?? []), { stage: next.stage, created, attribute }];
  await race.update({ [`flags.${SYSTEM_ID}.stage`]: next.stage, [`flags.${SYSTEM_ID}.stageBonus`]: bonus, [`flags.${SYSTEM_ID}.stageLog`]: log });

  const names = [...owned, ...actor.items.filter(i => created.includes(i.id))].map(i => i.name);
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content: await renderCard(actor, form, next, { names, attribute, state: "done" })
  });
  return true;
}

/**
 * The GM takes a character back one stage: the skills that stage created leave, and its +1.
 * @param {Actor} actor
 */
export async function regress(actor) {
  if (!game.user.isGM) return false;
  const form = formOf(actor);
  if (!form.race || (form.stage <= 1)) return false;
  const race = form.race;
  const log = [...(race.getFlag(SYSTEM_ID, "stageLog") ?? [])];
  const index = log.map(e => toInt(e.stage)).lastIndexOf(form.stage);
  const entry = (index >= 0) ? log.splice(index, 1)[0] : null;
  const gone = (entry?.created ?? []).filter(id => actor.items.has(id));
  if (gone.length) await actor.deleteEmbeddedDocuments("Item", gone);
  const bonus = stageBonus(race);
  if (entry?.attribute && (bonus[entry.attribute] > 0)) bonus[entry.attribute] -= 1;
  await race.update({ [`flags.${SYSTEM_ID}.stage`]: form.stage - 1, [`flags.${SYSTEM_ID}.stageBonus`]: bonus, [`flags.${SYSTEM_ID}.stageLog`]: log });
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    whisper: game.users.filter(u => u.isGM || actor.testUserPermission(u, "OWNER")).map(u => u.id),
    content: `<p>${escape(E("Regressed", { name: actor.name, stage: ROMAN[form.stage - 1] }))}</p>`
  });
  return true;
}

/* -------------------------------------------- */
/*  The request to the GM                       */
/* -------------------------------------------- */

/** A player asks the GM for the next stage: a whispered card with the GM's buttons. */
export async function requestEvolution(actor, stage, choices) {
  const form = formOf(actor);
  if (!form.next || (form.next.stage !== stage)) return;
  if (!game.users.some(u => u.isGM)) return ui.notifications.warn(E("NoGm"));
  const uuids = chosenUuids(form.next, choices);
  const names = (await Promise.all(uuids.map(u => fromUuid(u).catch(() => null)))).filter(Boolean).map(s => s.name);
  const attribute = chosenAttribute(form.next, choices);
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    whisper: [...new Set([...game.users.filter(u => u.isGM).map(u => u.id), game.user.id])],
    content: await renderCard(actor, form, form.next, { names, attribute, state: "pending" }),
    flags: { [SYSTEM_ID]: { evolveRequest: { actorUuid: actor.uuid, stage, choices, names, attribute, state: "pending" } } }
  });
  ui.notifications.info(E("Sent"));
}

/** The GM answers a request (the card's buttons). */
export async function answerRequest(message, approve) {
  const request = message.getFlag(SYSTEM_ID, "evolveRequest");
  if (!game.user.isGM || (request?.state !== "pending")) return;
  const actor = await fromUuid(request.actorUuid).catch(() => null);
  if (!actor) return ui.notifications.warn(E("Gone"));
  const form = formOf(actor);
  let state = approve ? "approved" : "refused";
  if (approve && !(await evolve(actor, request.stage, request.choices))) state = "stale";
  const next = form.next ?? form.current;
  await message.update({
    content: await renderCard(actor, form, next, { names: request.names ?? [], attribute: request.attribute, state }),
    [`flags.${SYSTEM_ID}.evolveRequest.state`]: state
  });
}

/* -------------------------------------------- */
/*  The card                                    */
/* -------------------------------------------- */

async function renderCard(actor, form, stage, { names = [], attribute = null, state = "done" } = {}) {
  const rows = names.map(name => ({ icon: "fa-solid fa-paw", tone: "unlock", label: E("Card.Skill"), value: name }));
  if (attribute) rows.push({ icon: "fa-solid fa-chart-simple", label: E("Card.Attribute"), value: `${statLabel(attribute)} +1` });
  if (stage?.rite) rows.push({ icon: "fa-solid fa-scroll", tone: "warn", label: E("Card.Rite"), value: stage.rite });
  const done = state === "done";
  return foundry.applications.handlebars.renderTemplate(CARD, {
    color: raceColor(form.race),
    img: actor.img,
    eyebrow: E(done ? "Card.Done" : "Card.Request"),
    title: actor.name,
    stageName: stage?.name ?? "",
    race: form.race?.name ?? "",
    from: ROMAN[(stage?.stage ?? 2) - 1],
    to: ROMAN[stage?.stage ?? 1],
    formLabel: E("Card.Form"),
    rows,
    request: !done,
    pending: state === "pending",
    stateLabel: done ? "" : E(`Card.State.${state}`),
    approve: E("Card.Approve"),
    refuse: E("Card.Refuse"),
    label: E(done ? "Card.DoneLabel" : "Card.RequestLabel", { name: actor.name, stage: ROMAN[stage?.stage ?? 1] })
  });
}

/* -------------------------------------------- */
/*  Registration                                */
/* -------------------------------------------- */

/** Call during the `init` hook. */
export function registerEvolution() {
  Hooks.on("renderChatMessageHTML", (message, html) => {
    const request = message.getFlag(SYSTEM_ID, "evolveRequest");
    if (!request) return;
    const actions = html.querySelector(".rk-actions");
    if (!actions) return;
    if (!game.user.isGM || (request.state !== "pending")) return actions.remove();
    actions.querySelector('[data-action="evolve-approve"]')?.addEventListener("click", () => answerRequest(message, true));
    actions.querySelector('[data-action="evolve-refuse"]')?.addEventListener("click", () => answerRequest(message, false));
  });
}
