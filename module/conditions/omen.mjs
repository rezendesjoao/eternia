/**
 * The Omen (Presságio, the Magia Visão): dice rolled at the start of a combat and kept, each one to replace, once, one
 * die of any check of an attack card: a Hit Check or a Dodge Check, the bearer's, an ally's or an enemy's.
 *
 * - Who has it: an active Trait with `omen` (a formula: how many dice), read at the start of every combat (the Setup
 *   Process of round 1, on the window that started it). The dice are kept in `flags.eternia.omen = { combat, dice }`
 *   and go when the combat ends.
 * - The buttons: on an attack card, each check shows one button for each kept value that helps the bearer's side. On
 *   the bearer's or an ally's check (the same disposition), the value replaces the lowest die when it is higher; on an
 *   enemy's check, the highest die when it is lower (helpers/combat-cards.mjs adjustCardRoll judges the hits again).
 *   Replacing costs no action. The GM sees the buttons of the tokens it controls; a player, those of its characters.
 * - The Trait's `omenFocus`: when a kept die turns the result of an attack (a hit into a miss, or a miss into a hit),
 *   the bearer becomes [Focused].
 * - The use action `{ type: "omen", value: n, data: { face } }` adds n dice to the user's Omen, rolled or all showing
 *   `face` (the spells Ver o Golpe, Profecia, Destino Fixo and Caleidoscópio). A spell with `omenSpend` (O Fim Já
 *   Escrito) adds the dice to its damage (the formula `@omen`, their sum: helpers/effect-formulas.mjs), and the Omen
 *   ends when that damage is rolled.
 */
import { L, SYSTEM_ID } from "../settings.mjs";
import { isLocalChange } from "../helpers/clients.mjs";
import { actorName, combatActors, combatOf, escape, postSummary, toInt, wrap } from "../helpers/utils.mjs";
import { evaluateFormula, formulaData, isFormula } from "../helpers/effect-formulas.mjs";
import { addStatus, rulesOn } from "./rules.mjs";
import { registerUseAction } from "./effects.mjs";

/** How many dice an Omen keeps at most (a guard against runaway spells). */
const OMEN_CAP = 12;

/* -------------------------------------------- */
/*  The kept dice                               */
/* -------------------------------------------- */

/** The active Traits of an actor with this key (its own effects and its items' passive ones). */
function traitsWith(actor, key) {
  return [...(actor?.allApplicableEffects?.() ?? [])].filter(e => e.active && e.getFlag(SYSTEM_ID, "trait")?.[key]);
}

/**
 * The dice an actor keeps in its Omen for the combat it fights in now (none outside it).
 * @param {Actor} actor
 * @returns {number[]}
 */
export function omenDice(actor) {
  const omen = actor?.getFlag?.(SYSTEM_ID, "omen");
  if (!omen?.combat || !Array.isArray(omen.dice)) return [];
  return (omen.combat === combatOf(actor)?.id) ? omen.dice.map(toInt).filter(n => (n >= 1) && (n <= 6)) : [];
}

/** Keep these dice as the actor's Omen in a combat. */
async function setOmen(actor, combat, dice) {
  await actor.setFlag(SYSTEM_ID, "omen", { combat: combat?.id ?? null, dice: dice.slice(0, OMEN_CAP) });
  refreshCards();
}

/** The attack cards on show are drawn again (their Omen buttons follow the dice that are left). */
function refreshCards() {
  const recent = game.messages.contents.slice(-20).filter(m => m.getFlag(SYSTEM_ID, "attack"));
  for (const message of recent) ui.chat?.updateMessage?.(message);
}

/** Roll n dice for an actor (a Roll the chat shows with its dice). */
async function rollDice(actor, n, flavor) {
  const roll = await new Roll(`${n}d6`).evaluate();
  await roll.toMessage({ speaker: ChatMessage.getSpeaker({ actor }), flavor });
  return roll.dice.flatMap(d => d.results.filter(r => r.active).map(r => r.result));
}

/**
 * Add dice to an actor's Omen in the combat it fights in: n rolled now, or n showing `face`. Returns the chat line.
 * @param {Actor} actor
 * @param {number} n
 * @param {number|null} [face]
 * @returns {Promise<string|null>}
 */
export async function addOmen(actor, n, face = null) {
  n = Math.max(0, Math.min(toInt(n), OMEN_CAP));
  const combat = combatOf(actor);
  if (!n) return null;
  if (!combat) return L("Omen.NoCombat", { name: actorName(actor) });
  const fixed = (toInt(face) >= 1) && (toInt(face) <= 6) ? toInt(face) : null;
  const added = fixed ? Array(n).fill(fixed) : await rollDice(actor, n, L("Omen.Title"));
  const dice = [...omenDice(actor), ...added];
  await setOmen(actor, combat, dice);
  return L("Omen.Added", { name: actorName(actor), added: added.join(", "), dice: dice.join(", ") });
}

/* -------------------------------------------- */
/*  The start of a combat                       */
/* -------------------------------------------- */

/** Round 1's Setup Process (from the Briefing): everyone with an Omen rolls its dice. */
async function rollOmens(combat) {
  const lines = [];
  const gmLines = [];
  for (const actor of combatActors(combat)) {
    if (actor.statuses.has("dead")) continue;
    const traits = traitsWith(actor, "omen");
    if (!traits.length) {
      if (actor.getFlag(SYSTEM_ID, "omen")) await actor.unsetFlag(SYSTEM_ID, "omen");
      continue;
    }
    const n = traits.reduce((total, e) => {
      const value = e.getFlag(SYSTEM_ID, "trait").omen;
      return total + Math.max(0, (isFormula(value) ? evaluateFormula(value, formulaData(actor, e.parent)) : toInt(value)) || 0);
    }, 0);
    const dice = n ? await rollDice(actor, Math.min(n, OMEN_CAP), L("Omen.Title")) : [];
    await setOmen(actor, combat, dice);
    (actor.hasPlayerOwner ? lines : gmLines).push(L("Omen.Rolled", { name: actorName(actor), dice: dice.join(", ") || "—" }));
  }
  if (lines.length || gmLines.length) await postSummary(L("Omen.Title"), lines, gmLines);
}

/* -------------------------------------------- */
/*  The buttons on the attack cards             */
/* -------------------------------------------- */

/** The characters whose Omens this window may spend: the GM's controlled tokens, a player's own characters. */
function seers() {
  const actors = game.user.isGM ? (canvas.tokens?.controlled ?? []).map(t => t.actor)
    : game.actors.filter(a => a.isOwner && (a.type === "character"));
  return [...new Set(actors.filter(a => a?.isOwner && omenDice(a).length))];
}

/** The side of an actor: its token's disposition (its prototype's without a token). */
function sideOf(actor) {
  const token = actor?.token ?? actor?.getActiveTokens?.(true)[0]?.document ?? null;
  return (token ?? actor?.prototypeToken)?.disposition ?? 0;
}

/** Whether `roller`'s check is one the seer wants high: its own or an ally's. */
const helps = (seer, roller) => !!roller && ((roller.uuid === seer.uuid) || (sideOf(roller) === sideOf(seer)));

/** The dice of a check outcome (the card's "1, 6"). */
const diceOf = outcome => String(outcome?.results ?? "").split(",").map(toInt).filter(n => n > 0);

/**
 * The dice of a check with one die replaced by `value`: the lowest when the seer wants it high, else the highest; null
 * when that doesn't help.
 * @param {number[]} dice
 * @param {number} value
 * @param {boolean} raise
 * @returns {{dice: number[], old: number}|null}
 */
export function omenSwap(dice, value, raise) {
  if (!dice.length) return null;
  const target = raise ? Math.min(...dice) : Math.max(...dice);
  if (raise ? (target >= value) : (target <= value)) return null;
  const next = [...dice];
  next[next.indexOf(target)] = value;
  return { dice: next, old: target };
}

/** The checks of an attack card: the Hit Check and every Dodge Check rolled, with who rolled each. */
function cardChecks(message) {
  const data = message.getFlag(SYSTEM_ID, "attack");
  if (!data || data.auto) return [];
  const attacker = data.itemUuid ? (fromUuidSync(data.itemUuid)?.actor ?? null) : null;
  const checks = data.attack ? [{ kind: "attack", index: null, outcome: data.attack, roller: attacker }] : [];
  (data.targets ?? []).forEach((target, index) => {
    if (!target.dodge) return;
    const roller = fromUuidSync(target.tokenUuid)?.actor ?? fromUuidSync(target.actorUuid) ?? null;
    checks.push({ kind: "dodge", index, outcome: target.dodge, roller });
  });
  return checks;
}

/** An attack card: the Omen buttons of the user's seers on its Hit Check and on each Dodge Check. */
function addOmenButtons(message, html) {
  if (!rulesOn() || !message.getFlag(SYSTEM_ID, "attack")) return;
  const list = seers();
  if (!list.length) return;
  for (const check of cardChecks(message)) {
    const buttons = [];
    for (const seer of list) {
      const raise = helps(seer, check.roller);
      for (const value of [...new Set(omenDice(seer))].sort((a, b) => b - a)) {
        const swap = omenSwap(diceOf(check.outcome), value, raise);
        if (!swap) continue;
        const button = document.createElement("a");
        button.className = "lhm-card-action omen";
        button.style.whiteSpace = "nowrap";
        button.dataset.tooltip = L("Omen.ButtonTip", { name: actorName(seer), old: swap.old, value });
        // The Hit Check has room for "Omen 6"; a target's row, only for the value (the tooltip says the rest)
        const label = (list.length > 1) ? L("Omen.ButtonOf", { name: actorName(seer), value })
          : ((check.kind === "attack") ? L("Omen.Button", { value }) : String(value));
        button.innerHTML = `<i class="fa-solid fa-eye"></i> ${escape(label)}`;
        button.addEventListener("click", event => {
          event.preventDefault();
          event.stopPropagation();
          useOmen(seer, value, { message, kind: check.kind, index: check.index })
            .catch(err => console.error(`${SYSTEM_ID} | Omen failed`, err));
        });
        buttons.push(button);
      }
    }
    if (!buttons.length) continue;
    const bar = document.createElement("div");
    bar.className = `lhm-card-actions omen ${check.kind}`;
    bar.append(...buttons);
    if (check.kind === "attack") (html.querySelector(".dice-roll") ?? html.querySelector(".lh-attack-card"))?.after(bar);
    else html.querySelector(`.lh-target[data-index="${check.index}"]`)?.append(bar);
  }
}

/** One Omen at a time per actor: two quick clicks don't spend the same die twice. */
const queues = new Map();
function serial(actor, fn) {
  const next = (queues.get(actor.uuid) ?? Promise.resolve()).then(fn, fn);
  queues.set(actor.uuid, next.catch(() => null));
  return next;
}

/** The hits of an attack card (true / false / null per target). */
const hitsOf = message => (message.getFlag(SYSTEM_ID, "attack")?.targets ?? []).map(t => t.hit);

/**
 * Replace a die of a check with one of the seer's kept dice: the die leaves the Omen, the card judges the hits again,
 * and the Trait's `omenFocus` gives [Focused] when a result turned.
 * @param {Actor} seer
 * @param {number} value
 * @param {{message: ChatMessage, kind: "attack"|"dodge", index: number|null}} card
 * @returns {Promise<boolean>}
 */
export function useOmen(seer, value, { message, kind, index = null }) {
  return serial(seer, async () => {
    const check = cardChecks(message).find(c => (c.kind === kind) && (c.index === index));
    const swap = check && omenSwap(diceOf(check.outcome), value, helps(seer, check.roller));
    if (!swap) {
      ui.notifications.warn(L("Omen.NoDie"));
      return false;
    }
    const combat = combatOf(seer);
    const dice = omenDice(seer);
    const at = dice.indexOf(value);
    if (!combat || (at < 0)) {
      ui.notifications.warn(L("Omen.Gone", { value }));
      return false;
    }
    dice.splice(at, 1);
    await setOmen(seer, combat, dice);
    const before = hitsOf(message);
    const { adjustCardRoll } = await import("../helpers/combat-cards.mjs");
    const ok = await adjustCardRoll(message, {
      kind, index, dice: swap.dice, actorUuid: seer.uuid,
      note: L("Omen.Note", { name: actorName(seer), old: swap.old, value })
    });
    if (!ok) {
      await setOmen(seer, combat, [...omenDice(seer), value]);
      return false;
    }
    // A relayed change reaches this window a moment later.
    for (let i = 0; (i < 10) && (JSON.stringify(hitsOf(message)) === JSON.stringify(before)); i++) await new Promise(r => setTimeout(r, 100));
    const after = hitsOf(message);
    const turned = before.some((hit, i) => (typeof hit === "boolean") && (typeof after[i] === "boolean") && (hit !== after[i]));
    if (turned && traitsWith(seer, "omenFocus").length) {
      await addStatus(seer, "focused");
      await postSummary(L("Omen.Title"), [L("Omen.Focus", { name: actorName(seer) })]);
    }
    return true;
  });
}

/* -------------------------------------------- */
/*  Hooks                                       */
/* -------------------------------------------- */

/** A damage card of a spell with `omenSpend`: the dice it added (`@omen`) leave the caster's Omen. */
async function onCreateMessage(message, options, userId) {
  if (userId !== game.user.id) return;
  const card = message.getFlag(SYSTEM_ID, "damage");
  if (!card?.itemUuid || card.recovery) return;
  const item = fromUuidSync(card.itemUuid);
  const actor = item?.actor;
  if (!item?.getFlag(SYSTEM_ID, "omenSpend") || !actor?.isOwner) return;
  const dice = omenDice(actor);
  if (!dice.length) return;
  await setOmen(actor, combatOf(actor), []);
  await postSummary(item.name, [L("Omen.Spent", { name: actorName(actor), dice: dice.join(", "), n: dice.reduce((t, d) => t + d, 0) })]);
}

/** A combat ends: the dice of its fighters go. */
async function onDeleteCombat(combat, options, userId) {
  if (!isLocalChange(options, userId)) return;
  for (const actor of combatActors(combat)) {
    if ((actor.getFlag(SYSTEM_ID, "omen")?.combat === combat.id) && actor.isOwner) await actor.unsetFlag(SYSTEM_ID, "omen");
  }
}

/** Call during the `init` hook. */
export function registerOmen() {
  wrap(CONFIG.Combat.documentClass.prototype, "_onPhaseStart", async function (original, phase, round, previous) {
    await original.call(this, phase, round, previous);
    if ((phase !== "setup") || ((previous?.round ?? 0) !== 0) || !rulesOn()) return;
    await rollOmens(this).catch(err => console.error(`${SYSTEM_ID} | Omen failed`, err));
  });
  Hooks.on("renderChatMessageHTML", addOmenButtons);
  Hooks.on("createChatMessage", (...args) => onCreateMessage(...args).catch(err => console.error(`${SYSTEM_ID} | Omen failed`, err)));
  Hooks.on("deleteCombat", (...args) => onDeleteCombat(...args).catch(err => console.error(`${SYSTEM_ID} | Omen failed`, err)));
  registerUseAction("omen", async (actor, { value, data }) => addOmen(actor, value, data?.face ?? null));
}
