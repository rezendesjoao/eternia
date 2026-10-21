/**
 * Fate Points (Rules I.a): "Increase the number of dice in a single check (before making it) by one;
 * reroll all dice in a single check; remove any one Bad Status you're currently affected by."
 *
 * - Skill card: "+1D" next to its Check. The extra die goes through the system's roll bonuses
 *   (a short-lived effect on the character), so it shows on the card like any other bonus.
 * - Attack card: the attacker rerolls the Hit Check; a character target rerolls its Dodge Check.
 * - Any other 2D6 roll of a character: its roller rerolls it (posted as a new roll).
 * - Character sheet: a star next to the Fate Points removes one Bad Status; while [Afflicted], the
 *   statuses it protects can't go before it.
 * Each spends 1 Fate Point of the character, and is marked on the card.
 */
import { L, SYSTEM_ID, setting } from "../settings.mjs";
import { diceFormula } from "../helpers/dice.mjs";
import { hateRank } from "../helpers/effect-conditions.mjs";
import { request } from "../piles/pile-socket.mjs";
import { actorName, escape, targetActor, toInt } from "../helpers/utils.mjs";
import { rollCheck } from "../chat/cards.mjs";
import { LH_STATUSES } from "../helpers/statuses.mjs";
import { AFFLICTED_PROTECTS } from "../conditions/catalog.mjs";
import { has, removeStatuses } from "../conditions/rules.mjs";
import { applyModifier, consumeAfterRoll, dodgeModifier } from "../conditions/rolls.mjs";

const ATTACK_TEMPLATE = "systems/eternia/templates/chat/attack-card.hbs";

/** Bad Statuses Fate can remove (all of them, the conditions of Eternia included); [Afflicted] protects some. */
const badStatuses = () => LH_STATUSES.filter(s => s.group === "bad");

/** Call during the `init` hook. */
export function registerFate() {
  Hooks.on("renderChatMessageHTML", onRenderMessage);
  Hooks.on("renderActorSheetV2", onRenderSheet);
}

const fateOf = actor => toInt(actor?._source?.system?.fate?.value);
const canSpend = actor => !!actor && (actor.type === "character") && actor.isOwner && (fateOf(actor) > 0);

/**
 * Spend 1 Fate Point.
 * @param {Actor} actor
 * @returns {Promise<boolean>}   Whether it was spent.
 */
export async function spendFate(actor) {
  if (!actor?.isOwner || (actor.type !== "character")) return false;
  const fate = fateOf(actor);
  if (fate < 1) {
    ui.notifications.warn(L("Fate.None", { name: actorName(actor) }));
    return false;
  }
  await actor.update({ "system.fate.value": fate - 1 });
  return true;
}

/* -------------------------------------------- */
/*  Dice (as the system's combat-cards.mjs)     */
/* -------------------------------------------- */

/** Critical (two or more 6s) and Fumble (all 1s; any 1 when [Overconfident]); a Fumble counts as 0. */
function rollOutcome(roll, actor) {
  const results = roll.dice.flatMap(d => d.results.filter(r => r.active).map(r => r.result));
  const overconfident = !!actor?.system["bad-status"]?.overconfident;
  const fumble = (results.length > 0) && (results.every(r => r === 1) || (overconfident && results.includes(1)));
  const critical = !fumble && (results.filter(r => r === 6).length >= 2);
  return { total: fumble ? 0 : roll.total, critical, fumble, formula: roll.formula, results: results.join(", ") };
}

/** Fumbles fail, Criticals succeed, the Defender wins ties and Critical vs Critical. */
function resolveHit(attack, dodge) {
  if (attack.fumble) return false;
  if (dodge.fumble) return true;
  if (dodge.critical) return false;
  if (attack.critical) return true;
  return attack.total > dodge.total;
}

/** A Dodge Check: Evasion / Resistance, -1D when [Dazed] (min 1D), +2 for a [Hate Under] character. */
async function rollDodge(actor, vs, { attacker = null, item = null } = {}) {
  const check = actor.system.checks?.[vs] ?? {};
  const condition = dodgeModifier(actor, { vs, attacker, item });
  if (condition.autoFail) {
    const roll = await new Roll("0").evaluate();
    const asleep = game.i18n.localize("ETERNIA.StatusEffect.asleep");
    return { roll, dodge: { total: 0, critical: false, fumble: true, formula: "—", results: "", conditions: asleep } };
  }
  let { dice, mod } = applyModifier({ dice: toInt(check.dice), mod: toInt(actor.type === "monster" ? check.mod : check.total) }, condition);
  const hateUnder = hateRank(actor) === "under";
  if (hateUnder) mod += 2;
  const roll = await new Roll(diceFormula({ dice, mod })).evaluate();
  await consumeAfterRoll(actor, condition.consume);
  return { roll, dodge: { ...rollOutcome(roll, actor), hateUnder, conditions: condition.text } };
}

async function renderAttack(data, roll) {
  return foundry.applications.handlebars.renderTemplate(ATTACK_TEMPLATE, {
    ...data,
    labels: { vs: data.vs ? game.i18n.localize(`ETERNIA.Check.${data.vs.capitalize()}`) : "", type: "" },
    rollHTML: roll ? await roll.render() : "",
    recoveryOnly: false
  });
}

/* -------------------------------------------- */
/*  +1D and rerolls                             */
/* -------------------------------------------- */

/** Roll a skill's Check with one more die. */
async function checkWithExtraDie(item, useMessage) {
  const actor = item.actor;
  if (!await spendFate(actor)) return;
  const [effect] = await actor.createEmbeddedDocuments("ActiveEffect", [{
    name: L("Fate.ExtraDie"),
    img: "icons/svg/d6-grey.svg",
    type: "base",
    system: { changes: [{ key: "eternia.roll.check.dice", type: "add", value: "1", phase: "initial", priority: null }] },
    flags: { [SYSTEM_ID]: { fateDie: true } }
  }]);
  try {
    await rollCheck(item, useMessage);
  }
  finally {
    await effect?.delete().catch(() => null);
  }
}

/** The attacker rerolls the Hit Check of an attack card. */
async function rerollHit(message, actor) {
  const data = foundry.utils.deepClone(message.getFlag("eternia", "attack"));
  if (!data?.attack?.formula || data.auto || !message.isOwner) return;
  if (!await spendFate(actor)) return;
  const roll = await new Roll(data.attack.formula).evaluate();
  await game.dice3d?.showForRoll(roll, game.user, true);
  data.attack = rollOutcome(roll, actor);
  for (const target of data.targets) if (target.dodge) target.hit = resolveHit(data.attack, target.dodge);
  data.fateRerolls = toInt(data.fateRerolls) + 1;
  await message.update({
    content: await renderAttack(data, roll),
    rolls: [roll, ...message.rolls.slice(1)].map(r => r.toJSON()),
    "flags.eternia.attack": data
  });
}

/** A character target rerolls its Dodge Check on an attack card. */
async function rerollDodge(message, index) {
  const data = message.getFlag("eternia", "attack");
  const target = data?.targets?.[index];
  const actor = targetActor(target);
  if (!target?.dodge || data.auto || !canSpend(actor)) return;
  const item = data.itemUuid ? fromUuidSync(data.itemUuid) : null;
  const { roll, dodge } = await rollDodge(actor, data.vs, { attacker: item?.actor ?? null, item });
  await game.dice3d?.showForRoll(roll, game.user, true);
  const patch = { dodge: { ...dodge, fate: true }, hit: resolveHit(data.attack, dodge) };
  if (message.isOwner) {
    if (!await spendFate(actor)) return;
    const next = foundry.utils.deepClone(data);
    Object.assign(next.targets[index], patch);
    await message.update({ content: await renderAttack(next, message.rolls[0]), "flags.eternia.attack": next });
    return;
  }
  // Someone else's card: the active GM writes it, if the user owns that target (system relay).
  const result = await request("combatCardUpdate", { messageId: message.id, kind: "attack", index, patch });
  if (result?.ok) await spendFate(actor);
  else ui.notifications.warn(game.i18n.localize(result?.error ?? "ETERNIA.Piles.Error.Generic"));
}

/** Reroll any other 2D6 roll of a character: a new roll, the old one marked. */
async function rerollPlain(message, actor) {
  if (!await spendFate(actor)) return;
  const roll = await new Roll(message.rolls[0].formula).evaluate();
  await roll.toMessage({
    speaker: message.speaker,
    flavor: `${message.flavor ?? ""} (${L("Fate.Rerolled")})`.trim(),
    flags: { [SYSTEM_ID]: { rerollOf: message.id } }
  });
  await message.setFlag(SYSTEM_ID, "rerolled", true);
}

/* -------------------------------------------- */
/*  Buttons                                     */
/* -------------------------------------------- */

function button(className, icon, label, tooltip) {
  const el = document.createElement("button");
  el.type = "button";
  el.className = `lhauto-fate ${className}`;
  el.innerHTML = `<i class="${icon}"></i> ${escape(label)}`;
  if (tooltip) el.dataset.tooltip = tooltip;
  return el;
}

const onClick = (el, fn) => el.addEventListener("click", event => {
  event.preventDefault();
  event.stopPropagation();
  el.disabled = true;
  Promise.resolve(fn()).catch(err => console.error(`${SYSTEM_ID} | Fate action failed`, err));
});

function onRenderMessage(message, html) {
  if (!setting("fate")) return;

  // Skill card: +1D next to the Check
  const check = html.querySelector('.skill-card-roll[data-roll="check"]');
  if (check) {
    const uuid = check.closest("[data-item-uuid]")?.dataset.itemUuid;
    const item = uuid ? fromUuidSync(uuid) : null;
    if (item && canSpend(item.actor)) {
      const el = button("lhauto-fate-die", "fa-solid fa-star", L("Fate.ExtraDieButton"), L("Fate.ExtraDieHint"));
      onClick(el, () => checkWithExtraDie(item, message));
      check.after(el);
    }
  }

  // Attack card: reroll the Hit Check, reroll a Dodge Check
  const attack = message.getFlag("eternia", "attack");
  if (attack) {
    const card = html.querySelector(".lh-attack-card");
    if (attack.fateRerolls) {
      card?.querySelector(".chat-card-header")?.insertAdjacentHTML("afterend",
        `<div class="lhauto-fate-mark"><i class="fa-solid fa-star"></i> ${escape(L("Fate.HitRerolled", { n: attack.fateRerolls }))}</div>`);
    }
    const attacker = ChatMessage.getSpeakerActor(message.speaker);
    if (!attack.auto && message.isOwner && canSpend(attacker) && card) {
      const el = button("lhauto-fate-reroll", "fa-solid fa-star", L("Fate.RerollHit"));
      onClick(el, () => rerollHit(message, attacker));
      card.querySelector(".lh-targets")?.before(el);
    }
    html.querySelectorAll(".lh-attack-card .lh-target[data-index]").forEach(row => {
      const index = Number(row.dataset.index);
      const target = attack.targets?.[index];
      if (!target?.dodge) return;
      if (target.dodge.fate) row.querySelector(".lh-dodge")?.insertAdjacentHTML("afterbegin", '<i class="fa-solid fa-star lhauto-fate-star"></i>');
      if (attack.auto || !canSpend(targetActor(target))) return;
      const el = button("lhauto-fate-dodge", "fa-solid fa-rotate", "", L("Fate.RerollDodge"));
      onClick(el, () => rerollDodge(message, index));
      row.append(el);
    });
    return;
  }

  // Any other 2D6 roll of a character
  if (!message.isRoll || message.flags?.eternia || !message.isAuthor) return;
  if (message.getFlag(SYSTEM_ID, "rerolled")) {
    html.querySelector(".message-content")?.insertAdjacentHTML("beforeend",
      `<div class="lhauto-fate-mark"><i class="fa-solid fa-star"></i> ${escape(L("Fate.WasRerolled"))}</div>`);
    return;
  }
  const actor = ChatMessage.getSpeakerActor(message.speaker);
  const roll = message.rolls[0];
  if (!roll || !/\d+d6/i.test(roll.formula) || !canSpend(actor)) return;
  const el = button("lhauto-fate-reroll", "fa-solid fa-star", L("Fate.Reroll"));
  onClick(el, () => rerollPlain(message, actor));
  html.querySelector(".message-content")?.append(el);
}

/* -------------------------------------------- */
/*  Removing a Bad Status                       */
/* -------------------------------------------- */

function onRenderSheet(app, html) {
  if (!setting("fate")) return;
  const actor = app.document;
  if ((actor?.type !== "character") || !actor.isOwner) return;
  const title = html.querySelector(".fate h4");
  if (!title || title.querySelector(".lhauto-fate-use")) return;
  const link = document.createElement("a");
  link.className = "lhauto-fate-use";
  link.dataset.tooltip = L("Fate.UseHint");
  link.innerHTML = '<i class="fa-solid fa-star"></i>';
  link.addEventListener("click", event => {
    event.preventDefault();
    event.stopPropagation();
    removeBadStatus(actor).catch(err => console.error(`${SYSTEM_ID} | Fate action failed`, err));
  });
  title.append(link);
}

/** Spend 1 Fate Point to remove one Bad Status of a character. */
export async function removeBadStatus(actor) {
  const afflicted = has(actor, "afflicted");
  const options = badStatuses().filter(s => has(actor, s.id)).filter(s => !(afflicted && AFFLICTED_PROTECTS.includes(s.id)));
  if (!options.length) return ui.notifications.info(L("Fate.NoBadStatus", { name: actorName(actor) }));
  if (fateOf(actor) < 1) return ui.notifications.warn(L("Fate.None", { name: actorName(actor) }));

  const label = status => game.i18n.localize(`ETERNIA.StatusEffect.${status.id}`);
  const content = `<p>${escape(L("Fate.RemoveIntro", { name: actorName(actor), fate: fateOf(actor) }))}</p>
    ${afflicted ? `<p class="hint">${escape(L("Fate.AfflictedNote"))}</p>` : ""}
    <div class="form-group"><select name="status">${options.map(s => `<option value="${s.id}">${escape(label(s))}</option>`).join("")}</select></div>`;
  const choice = await foundry.applications.api.DialogV2.prompt({
    window: { title: L("Fate.RemoveTitle") },
    classes: ["lhauto-dialog"],
    content,
    rejectClose: false,
    ok: { label: L("Fate.Remove"), icon: "fa-solid fa-star", callback: (event, button) => button.form.elements.status.value }
  });
  const status = options.find(s => s.id === choice);
  if (!status || !await spendFate(actor)) return;
  await removeStatuses(actor, [status.id]);
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content: `<div class="eternia chat-card lhauto-card"><p><i class="fa-solid fa-star"></i> ${escape(L("Fate.Removed", {
      name: actorName(actor), status: label(status), fate: fateOf(actor)
    }))}</p></div>`
  });
}
