/**
 * Attack and damage cards: fixes on top of the system's combat-cards.mjs.
 *
 * - Damage tied to its attack. The system's Damage looks for the latest attack card of the skill
 *   among the last 30 messages, which a busy shared chat loses (the damage then counts as "no dodge
 *   failed": no Hate Damage, Pursuit, Weakness or -1 Hate). Here the skill card's Check and Damage go
 *   through here: the attack card remembers the skill card it came from, the Damage uses that
 *   attack, and the attack card gets its own Damage button.
 * - Apply: a target that still has to roll its Dodge Check, or that dodged, can't take the damage; a
 *   target that already took it asks before taking it again; the button can't be clicked twice.
 * - Cards posted in a private message mode (GM / blind / self) are also shown to the owners of their
 *   targets and of the attacker, who dodge and apply from them.
 * - The damage (or healing) of a skill on its user (Target: Self) has the user's token as its target when
 *   nobody is targeted.
 */
import { L, SYSTEM_ID, setting } from "../settings.mjs";
import { createDamageCard, targetEntries } from "../helpers/combat-cards.mjs";
import { diceFormula } from "../helpers/dice.mjs";
import { evaluateFormula, formulaData } from "../helpers/effect-formulas.mjs";
import { isMonsterSkill, rollSkill, skillRollable } from "../helpers/skill-rolls.mjs";
import { isSelfTarget } from "../helpers/item-use.mjs";
import { rollBonuses, rollBonusesLabel } from "../helpers/roll-bonuses.mjs";
import { confirm, escape, sameTarget, targetActor, toInt } from "../helpers/utils.mjs";
import { withCloseReach } from "../automation/reach.mjs";

/** Battle status a character skill's damage adds, by type (as the system's skill-rolls.mjs). */
const DAMAGE_POWER = { physical: "attack", magical: "magic" };
const TYPE_LABELS = {
  physical: "ETERNIA.Skill.Label.DamagePhysical",
  magical: "ETERNIA.Skill.Label.DamageMagical",
  penetrating: "ETERNIA.Combat.Type.penetrating",
  direct: "ETERNIA.Combat.Type.direct"
};
const RECOVERY_LABEL = "ETERNIA.Skill.Label.DamageRecovery";

/** Set while this window posts an attack / damage card, to tag it (see onPreCreate). */
let pending = null;

/** Call during the `init` hook. */
export function registerCards() {
  Hooks.on("preCreateChatMessage", onPreCreate);
  Hooks.on("renderChatMessageHTML", onRender);
}

/* -------------------------------------------- */
/*  Check and Damage                            */
/* -------------------------------------------- */

/**
 * Roll a skill's Check (the system's rollSkill), tying the attack card to the skill card.
 * @param {Item} item
 * @param {ChatMessage|null} useMessage   The skill card the Check was rolled from
 */
export async function rollCheck(item, useMessage) {
  pending = { itemUuid: item.uuid, useMessageId: useMessage?.id ?? null };
  try {
    return await withCloseReach(item, () => rollSkill(item, "check"));
  }
  finally {
    pending = null;
  }
}

/** The latest attack card rolled from this skill card. */
function linkedAttack(useMessage) {
  const messages = game.messages.contents;
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].getFlag(SYSTEM_ID, "useMessageId") === useMessage.id) return messages[i];
  }
  return null;
}

/** The character a character skill rolls for (as the system's skill-rolls.mjs). */
function skillRoller(item) {
  const actor = item.actor ?? canvas?.tokens?.controlled[0]?.actor ?? game.user.character ?? null;
  return (actor?.type === "character") ? actor : null;
}

/** Actors a damage roll is made against: those the attack hit, else the user's targets. */
function rollTargets(attackMessage) {
  const attack = attackMessage?.getFlag("eternia", "attack");
  const uuids = attack
    ? attack.targets.filter(t => t.hit !== false).map(t => t.actorUuid)
    : [...game.user.targets].map(t => t.actor?.uuid);
  return uuids.filter(Boolean).map(uuid => fromUuidSync(uuid)).filter(a => a instanceof Actor);
}

/**
 * Roll a skill's Damage against the given attack (the system's rollSkill, with the attack chosen here).
 * @param {Item} item
 * @param {ChatMessage|null} attackMessage
 */
export async function rollDamage(item, attackMessage) {
  const values = item.system.damage;
  const powers = (!isMonsterSkill(item) && !values.noPower)
    ? [DAMAGE_POWER[values.type], values.recovery ? "restoration" : null].filter(Boolean)
    : [];

  let actor = item.actor;
  if (powers.length) {
    actor = skillRoller(item);
    if (!actor) return ui.notifications.warn(game.i18n.localize("ETERNIA.Skill.Notif.NoCharacter"));
  }
  let dice = toInt(values.dice);
  let mod = toInt(values.mod);
  for (const power of powers) mod += toInt(actor.system["battle-status"]?.power?.[power]?.total);
  const data = (values.formula || values.diceFormula) ? formulaData(actor ?? item.actor, item) : null;
  if (values.diceFormula) dice += Math.max(0, evaluateFormula(values.diceFormula, data) ?? 0);
  if (values.formula) mod += evaluateFormula(values.formula, data) ?? 0;
  const bonuses = rollBonuses(actor, item, "damage", { targets: rollTargets(attackMessage) });
  for (const bonus of bonuses) {
    dice += bonus.dice;
    mod += bonus.mod;
  }

  let flavor = `${item.name} - ${game.i18n.localize("ETERNIA.Skill.Label.Damage")}`;
  const type = values.recovery ? RECOVERY_LABEL : TYPE_LABELS[values.type];
  if (type) flavor += ` (${game.i18n.localize(type)})`;

  // A skill on its user (Target: Self) heals or hits the user's token when nobody is targeted.
  let targets;
  if (!attackMessage && !game.user.targets.size && item.actor && isSelfTarget(item)) {
    const token = canvas?.tokens?.controlled.find(t => t.actor === item.actor) ?? item.actor.getActiveTokens()[0];
    if (token) targets = targetEntries([token]);
  }

  pending = { itemUuid: item.uuid, attackId: attackMessage?.id ?? null };
  try {
    return await createDamageCard(item, actor, diceFormula({ dice, mod }), flavor, attackMessage, targets,
      { bonuses: rollBonusesLabel(bonuses) });
  }
  finally {
    pending = null;
  }
}

/* -------------------------------------------- */
/*  Card creation                               */
/* -------------------------------------------- */

function onPreCreate(message) {
  const flags = message.flags?.eternia ?? {};
  const card = flags.attack ?? flags.damage;
  if (!card) return;
  if (pending && (card.itemUuid === pending.itemUuid)) {
    if (flags.attack && pending.useMessageId) message.updateSource({ [`flags.${SYSTEM_ID}.useMessageId`]: pending.useMessageId });
    if (flags.damage && ("attackId" in pending)) message.updateSource({ [`flags.${SYSTEM_ID}.attackId`]: pending.attackId });
  }
  if (setting("cards")) showToOwners(message, card);
}

/** A private card is also shown to the owners of its targets and of the attacker. */
function showToOwners(message, card) {
  const whisper = message.whisper ?? [];
  if (!whisper.length) return;
  const actors = (card.targets ?? []).map(targetActor).filter(Boolean);
  const attacker = ChatMessage.getSpeakerActor(message.speaker);
  if (attacker) actors.push(attacker);
  const ids = new Set(whisper);
  for (const user of game.users) {
    if (!user.isGM && actors.some(actor => actor.testUserPermission(user, "OWNER"))) ids.add(user.id);
  }
  if ((ids.size !== whisper.length) || message.blind) message.updateSource({ whisper: [...ids], blind: false });
}

/* -------------------------------------------- */
/*  Card buttons                                */
/* -------------------------------------------- */

function onRender(message, html) {
  if (!setting("cards")) return;
  // Capture: runs before the system's own listeners on the buttons.
  html.addEventListener("click", event => onClick(event, message), { capture: true });
  addDamageButton(message, html);
}

function onClick(event, message) {
  const roll = event.target.closest?.(".skill-card-roll");
  if (roll) return onSkillRoll(event, message, roll);
  const apply = event.target.closest?.(".lh-apply");
  if (apply) return guardApply(event, message, apply);
}

const stop = event => {
  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();
};

/** The skill card's Check / Damage buttons. */
function onSkillRoll(event, message, button) {
  stop(event);
  const which = button.dataset.roll;
  const uuid = button.closest("[data-item-uuid]")?.dataset.itemUuid;
  (async () => {
    const item = uuid ? await fromUuid(uuid).catch(() => null) : null;
    if (!item) return ui.notifications.warn(game.i18n.localize("ETERNIA.Skill.Notif.Missing"));
    if (which === "check") return rollCheck(item, message);
    return rollDamage(item, linkedAttack(message));
  })().catch(err => console.error(`${SYSTEM_ID} | Skill roll failed`, err));
}

/** "Roll damage" on the attack card itself, for its author. */
function addDamageButton(message, html) {
  const attack = message.getFlag("eternia", "attack");
  if (!attack || !message.isOwner) return;
  const item = fromUuidSync(attack.itemUuid);
  const card = html.querySelector(".lh-attack-card");
  if (!item || !card || !skillRollable(item).damage) return;
  const button = document.createElement("button");
  button.type = "button";
  button.className = "lhauto-attack-damage";
  button.innerHTML = `<i class="fa-solid fa-burst"></i> ${escape(L("Cards.RollDamage"))}`;
  button.addEventListener("click", event => {
    event.preventDefault();
    rollDamage(item, message).catch(err => console.error(`${SYSTEM_ID} | Damage roll failed`, err));
  });
  card.append(button);
}

/** Damage card "Apply" buttons (see the module comment). */
function guardApply(event, message, button) {
  // A click sent again after "apply again?" was confirmed.
  if (button.dataset.eterniaConfirmed) {
    delete button.dataset.eterniaConfirmed;
    button.disabled = true;
    return;
  }
  const card = message.getFlag("eternia", "damage");
  const row = button.closest(".lh-target[data-index]");
  const target = row ? card?.targets?.[Number(row.dataset.index)] : null;
  // Applying to the selected tokens (card without targets): only the double click is stopped.
  if (!target) {
    button.disabled = true;
    return;
  }

  const attackId = message.getFlag(SYSTEM_ID, "attackId");
  const attack = attackId ? game.messages.get(attackId)?.getFlag("eternia", "attack") : null;
  const entry = attack?.targets?.find(t => sameTarget(t, target));
  if (entry && !entry.auto && (button.dataset.mode !== "heal")) {
    if (entry.hit === false) {
      stop(event);
      return ui.notifications.warn(L("Cards.Dodged", { name: target.name }));
    }
    if ((entry.hit === null) || (entry.hit === undefined)) {
      stop(event);
      return ui.notifications.warn(L("Cards.PendingDodge", { name: target.name }));
    }
  }

  if (target.applied) {
    stop(event);
    confirm({
      title: L("Cards.AgainTitle"),
      content: `<p>${escape(L("Cards.AlreadyApplied", { name: target.name, result: target.applied }))}</p>`,
      yes: L("Cards.ApplyAgain"),
      no: L("Use.Cancel")
    }).then(ok => {
      if (!ok) return;
      button.dataset.eterniaConfirmed = "1";
      button.click();
    });
    return;
  }
  button.disabled = true;
}
