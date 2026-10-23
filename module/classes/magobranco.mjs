/**
 * The White Mage's Motor: the Law (Lei). docs/classes.md has the class; AS REGRAS, its page in XI, the rules as the
 * player reads them. A magic class: the White Mage chooses a Magia at CR 1, 5 and 10 (skills with flags.eternia.magic),
 * and the spells of the Magias feed and spend the class Motor ("@class" in their flags.eternia.motor, see motor.mjs).
 *
 * The Weaver's Pattern made the engine of the Magias. The mage writes a number from 2 to 12 in runes, the Law (with
 * Write the Law; changing it in a combat puts out the Runes already lit). Any check of anyone in the combat (Hit
 * Checks and Dodge Checks included) with two dice that add up to the Law lights Runes, once per check: 1 for 6 to 8,
 * 2 for 4, 5, 9 and 10, 3 for 2, 3, 11 and 12 (doubled on the Path of Augury); every Spell, the class's or a Magia's,
 * lights 1 more (the big ones 2: their own motor.gain). Up to the cap (3, +1 every 5 CR, + the SR of Runic Circle).
 * Runes are spent on the attack cards (cardActions, Rewrite): 1 Rune, the lowest die of a check goes up by 1 or the
 * highest down by 1; 2 Runes when that makes or unmakes a Critical or a Fumble. On the Path of the Absolute Law the die
 * goes to 6 (the mage's and the allies' checks) or to 1 (the enemies'). Other talents spend Runes on seals, barriers,
 * healing and the Sacred Rune's damage; the supreme spells of the Magias need the cap and spend them all.
 *
 * State in flags.eternia.motor.magobranco:
 *   state    "escrita" (one state: no chip)
 *   value    Runes
 *   pattern  the Law (2 to 12), kept between combats
 *   second   the Law's second number (Second Law, the Apex) or null
 *   doubles  "<combat>.<round>" of the last pair that gave the Twin Rune's Rune
 *   siege    "<combat>.<round>" of the last Siege Rune
 *   pulled   "<combat>.<round>" of the Apex's cheaper rewrite
 *   fate     id of the combat where the Verdict was given
 */
import { L } from "../settings.mjs";
import { combatOf, toInt } from "../helpers/utils.mjs";
import { takeDamage } from "../conditions/damage.mjs";
import {
  areEnemies, chooseOption, crOf, hasApex, identifierOf, motorData, pathOf, recentUse, roundKey, setMotor, talentOf,
  talentRank
} from "./motor.mjs";

export const MAGOBRANCO_ID = "magobranco";

/** Identifier of a White Mage skill. */
const T = name => `${MAGOBRANCO_ID}-${name}`;

const DEFAULTS = { state: "escrita", value: 0, pattern: 7, second: null, doubles: null, siege: null, pulled: null, fate: null };

/** Runes a number of the Law lights: the rarer the sum of two dice, the more. */
export function runesFor(n) {
  if ((n >= 6) && (n <= 8)) return 1;
  if ([4, 5, 9, 10].includes(n)) return 2;
  return 3;
}

/** The active dice of a roll. */
const rollDice = roll => (roll?.dice ?? []).flatMap(d => d.results.filter(r => r.active).map(r => r.result));

/** The dice of an attack card's check ("6, 4" → [6, 4]). */
const outcomeList = outcome => String(outcome?.results ?? "").split(",").map(toInt).filter(n => n > 0);

/** Whether two of these dice add up to n. */
function shows(dice, n) {
  for (let i = 0; i < dice.length; i++) {
    for (let j = i + 1; j < dice.length; j++) if (dice[i] + dice[j] === n) return true;
  }
  return false;
}

/** Whether two of these dice are equal. */
const hasPair = dice => dice.some((d, i) => dice.indexOf(d) !== i);

/** Critical (two or more 6s) and Fumble (all 1s) of a set of dice, as the attack cards judge them. */
function judge(dice) {
  const fumble = (dice.length > 0) && dice.every(d => d === 1);
  return { fumble, critical: !fumble && (dice.filter(d => d === 6).length >= 2) };
}

/** The Path the mage follows (none with only the Lesser Law). */
const path = (actor, lesser) => (lesser ? null : pathOf(actor, MAGOBRANCO_ID));

/** Whether the mage has the Apex (not with only the Lesser Law). */
const apex = (actor, lesser) => !lesser && hasApex(actor, MAGOBRANCO_ID);

/** Whether the Law has two numbers (Second Law, the Apex). */
const twoNumbers = (actor, lesser) => !lesser && (!!talentOf(actor, T("segunda-lei")) || apex(actor, lesser));

/** The numbers of the mage's Law now. */
function laws(actor, data, lesser) {
  const list = [toInt(data.pattern) || 7];
  if (twoNumbers(actor, lesser) && toInt(data.second)) list.push(toInt(data.second));
  return list;
}

/** Who rolled a check of an attack card: the attacker (the Hit Check) or that target (its Dodge Check). */
function rollerOf(card) {
  const data = card.message.getFlag("eternia", "attack");
  if (card.kind === "attack") {
    const item = data?.itemUuid ? fromUuidSync(data.itemUuid) : null;
    return item?.actor ?? ChatMessage.getSpeakerActor(card.message.speaker) ?? null;
  }
  const target = data?.targets?.[card.index];
  if (!target) return null;
  return fromUuidSync(target.tokenUuid)?.actor ?? fromUuidSync(target.actorUuid) ?? null;
}

/** "own", "ally" or "enemy": whose check it is, for the mage. */
function relationOf(actor, roller) {
  if (!roller) return "ally";
  if (roller.id === actor.id) return "own";
  return areEnemies(actor, roller) ? "enemy" : "ally";
}

/** The check outcome of an attack card as it is now (the card's own data, not the rendered copy). */
function currentOutcome(card) {
  const data = card.message.getFlag("eternia", "attack");
  return (card.kind === "attack") ? data?.attack : data?.targets?.[card.index]?.dodge;
}

/**
 * The dice after a rewrite: "up" the lowest goes up by 1, "down" the highest down by 1, "six" the lowest becomes 6,
 * "one" the highest becomes 1, "fate" every die becomes 1 (the Verdict). Null when nothing would change.
 */
function rewritten(dice, action) {
  if (!dice.length) return null;
  const next = [...dice];
  const low = next.indexOf(Math.min(...next));
  const high = next.indexOf(Math.max(...next));
  switch (action) {
    case "up":
      if (next[low] >= 6) return null;
      next[low] += 1;
      return next;
    case "down":
      if (next[high] <= 1) return null;
      next[high] -= 1;
      return next;
    case "six":
      if (next[low] >= 6) return null;
      next[low] = 6;
      return next;
    case "one":
      if (next[high] <= 1) return null;
      next[high] = 1;
      return next;
    case "fate":
      return next.every(d => d === 1) ? null : next.map(() => 1);
  }
  return null;
}

/**
 * Runes a rewrite costs: 1, 2 when it makes or unmakes a Critical or a Fumble (always 1 on the mage's and the allies'
 * checks with the Guiding Rune), every Rune (at least 3) for the Verdict. The Apex's rewrite of the round costs 1 less
 * (nothing on the Path of the Absolute Law).
 */
function rewriteCost(actor, lesser, data, action, outcome, next, relation) {
  if (action === "fate") return Math.max(3, toInt(data.value));
  const after = judge(next);
  let cost = ((!!outcome.critical !== after.critical) || (!!outcome.fumble !== after.fumble)) ? 2 : 1;
  if ((cost > 1) && (relation !== "enemy") && !lesser && talentOf(actor, T("runa-guia"))) cost = 1;
  if (apex(actor, lesser) && (data.pulled !== roundKey(actor))) cost = (path(actor, lesser) === "lei-absoluta") ? 0 : cost - 1;
  return Math.max(0, cost);
}

/** The rewrites the mage may make on a check: the Absolute Law's, or the ±1 (only +1 with the Lesser Law). */
function rewriteActions(actor, lesser, data, relation) {
  if (lesser) return ["up"];
  if (path(actor, lesser) === "lei-absoluta") {
    const list = [(relation === "enemy") ? "one" : "six"];
    const combat = combatOf(actor);
    if ((relation === "enemy") && talentOf(actor, T("veredicto")) && (toInt(data.value) >= 3) && combat && (data.fate !== combat.id)) {
      list.push("fate");
    }
    return list;
  }
  return ["up", "down"];
}

const ACTION_KEYS = { up: "Up", down: "Down", six: "Six", one: "One", fate: "Fate" };

/** Give a status to an actor, from the mage (the system's relay when the user doesn't own it). */
function giveStatus(actor, from, statusId, { value = null, expires = "endOfScene" } = {}) {
  return game.eternia?.applyStatus?.(actor, statusId, { value, expires, from });
}

/** Writes of the Motor one after the other (several checks can arrive together). */
const queues = new Map();
function serial(actor, fn) {
  const before = queues.get(actor.uuid) ?? Promise.resolve();
  const next = before.then(fn, fn);
  queues.set(actor.uuid, next.catch(() => null));
  return next;
}

/** Options of the Law dialog: each number with the Runes it lights. */
const numberOptions = () => Array.from({ length: 11 }, (_, i) => i + 2).map(n => ({
  value: String(n), label: L(runesFor(n) === 1 ? "Motor.MagoBranco.Option" : "Motor.MagoBranco.Options", { n, runas: runesFor(n) })
}));

export const MAGOBRANCO = {
  id: MAGOBRANCO_ID,
  i18n: "Motor.MagoBranco",
  states: ["escrita"],
  defaults: DEFAULTS,
  costKeyword: "Runas",

  /** The cap of Runes. */
  max(actor, { lesser }) {
    let max = 3 + Math.floor(crOf(actor) / 5);
    if (lesser) max = Math.max(1, Math.floor(max / 2));
    return max + talentRank(actor, T("circulo-runico"));
  },

  /** The Path of Augury rolls the Law: writing it is not for that Path. */
  issues(actor, item, motor, { lesser }) {
    if ((identifierOf(item) === T("escrever-a-lei")) && (path(actor, lesser) === "augurio")) {
      return [L("Motor.MagoBranco.AuguryIssue")];
    }
    return [];
  },

  /** Writing the Law, the Wheel of the Sky and the Final Sentence's sure strike. */
  async plan(actor, item, motor, { data, max, lesser, plan }) {
    const id = identifierOf(item);
    if (id === T("escrever-a-lei")) {
      const options = numberOptions();
      const first = await chooseOption(item.name, options, { hint: L("Motor.MagoBranco.ChooseHint"), selected: String(data.pattern ?? 7) });
      if (first === null) return null;
      let second = null;
      if (twoNumbers(actor, lesser)) {
        const others = options.filter(o => o.value !== first);
        const picked = await chooseOption(item.name, others, {
          hint: L("Motor.MagoBranco.ChooseSecond"), selected: String(data.second ?? others[0].value)
        });
        if (picked === null) return null;
        second = toInt(picked);
      }
      plan.changes.pattern = toInt(first);
      plan.changes.second = second;
      // A new Law in the middle of a combat puts out the Runes already lit.
      const changed = (toInt(first) !== toInt(data.pattern)) || (second !== (toInt(data.second) || null));
      if (changed && combatOf(actor)) plan.spent = toInt(data.value);
      return plan;
    }
    if (id === T("roda-do-ceu")) {
      const n = await rollLaw(actor, item.name);
      plan.changes.pattern = n;
      if (talentOf(actor, T("grande-augurio")) && (runesFor(n) === 3)) plan.gain = 1;
      return plan;
    }
    if ((id === T("runa-sagrada")) && !lesser && talentOf(actor, T("sentenca-final")) && (max > 0) && (plan.spent >= max)) {
      plan.autoHit = true;
    }
    return plan;
  },

  /** The Seal of Light slows whom it hits; the Great Seal as well ([Rooted] too with 4 Runes or more). */
  onHit(actor, item) {
    const id = identifierOf(item);
    if (id === T("selo-de-luz")) return [{ statusId: "slowed", value: null, name: item.name }];
    if (id === T("grande-selo")) {
      const list = [{ statusId: "slowed", value: null, name: item.name }];
      if (toInt(recentUse(item)?.spent) >= 4) list.push({ statusId: "rooted", value: null, name: item.name });
      return list;
    }
    return [];
  },

  /** The class tab and the HUD: the Law; ready when the Final Sentence's sure strike is there. */
  display(actor, { lesser, data, max }) {
    const list = laws(actor, data, lesser);
    const note = (list.length > 1) ? L("Motor.MagoBranco.NoteTwo", { a: list[0], b: list[1] }) : L("Motor.MagoBranco.Note", { n: list[0] });
    const ready = !lesser && (max > 0) && (toInt(data.value) >= max) && !!talentOf(actor, T("sentenca-final"));
    return { note, ready, readyLabel: L("Motor.MagoBranco.ReadyLabel") };
  },

  /* ------------------------------------------ */
  /*  Rewriting the dice (attack cards)         */
  /* ------------------------------------------ */

  /** The buttons on a check of an attack card: +1 / −1 (→ 6 / → 1 on the Path of the Absolute Law, and the Verdict). */
  cardActions(actor, { lesser, data }, card) {
    if (toInt(data.value) < 1) return [];
    const outcome = card.roll;
    const dice = outcomeList(outcome);
    if (!dice.length) return [];
    const relation = relationOf(actor, rollerOf(card));
    const buttons = [];
    for (const action of rewriteActions(actor, lesser, data, relation)) {
      const next = rewritten(dice, action);
      if (!next) continue;
      const cost = rewriteCost(actor, lesser, data, action, outcome, next, relation);
      const label = L(`Motor.MagoBranco.${ACTION_KEYS[action]}`);
      buttons.push({
        action,
        label: (cost === 1) ? label : L(cost ? "Motor.MagoBranco.Cost" : "Motor.MagoBranco.Free", { label, n: cost }),
        tooltip: L(`Motor.MagoBranco.${ACTION_KEYS[action]}Tip`),
        icon: "fa-solid fa-feather-pointed"
      });
    }
    return buttons;
  },

  /** A rewrite: the Runes first, then the check (given back if the card can't change), then what the rewrite sets off. */
  onCardAction(actor, { lesser }, action, card) {
    return serial(actor, async () => {
      const data = motorData(actor, MAGOBRANCO_ID);
      const outcome = currentOutcome(card);
      if (!outcome) return;
      const roller = rollerOf(card);
      const relation = relationOf(actor, roller);
      if (!rewriteActions(actor, lesser, data, relation).includes(action)) return;
      const next = rewritten(outcomeList(outcome), action);
      if (!next) return ui.notifications.warn(L("Motor.MagoBranco.NoDie"));
      const cost = rewriteCost(actor, lesser, data, action, outcome, next, relation);
      if (toInt(data.value) < cost) return ui.notifications.warn(L("Motor.MagoBranco.NoRunes", { n: cost }));
      const changes = { value: toInt(data.value) - cost };
      if (apex(actor, lesser) && (data.pulled !== roundKey(actor))) changes.pulled = roundKey(actor);
      if (action === "fate") changes.fate = combatOf(actor)?.id ?? null;
      await setMotor(actor, MAGOBRANCO_ID, { ...data, ...changes });
      const { adjustCardRoll } = await import("../helpers/combat-cards.mjs");
      const ok = await adjustCardRoll(card.message, {
        kind: card.kind, index: card.index, dice: next, actorUuid: actor.uuid,
        note: L(`Motor.MagoBranco.Note${ACTION_KEYS[action]}`, { name: actor.name })
      });
      if (!ok) {
        return setMotor(actor, MAGOBRANCO_ID, {
          ...motorData(actor, MAGOBRANCO_ID), value: toInt(data.value), pulled: data.pulled, fate: data.fate
        });
      }
      if (roller) await afterRewrite(actor, lesser, roller, relation, outcome, judge(next));
    });
  },

  /* ------------------------------------------ */
  /*  Events                                    */
  /* ------------------------------------------ */

  /** Every combat starts with the Runes of Carved Runes. */
  async onCombatStart(actor) {
    const data = motorData(actor, MAGOBRANCO_ID);
    await setMotor(actor, MAGOBRANCO_ID, { ...data, value: talentRank(actor, T("runas-gravadas")), doubles: null, siege: null, pulled: null, fate: null });
  },

  /** Path of Augury: the Law is rolled at each Setup Process (both numbers with the Apex); the Great Augury. */
  async onSetup(actor, { lesser }) {
    if (path(actor, lesser) !== "augurio") return;
    const n = await rollLaw(actor, L("Motor.MagoBranco.AuguryFlavor"));
    const second = apex(actor, lesser) ? await rollLaw(actor, L("Motor.MagoBranco.AuguryFlavor")) : null;
    const data = motorData(actor, MAGOBRANCO_ID);
    const great = talentOf(actor, T("grande-augurio")) && [n, second].some(x => x && (runesFor(x) === 3));
    await setMotor(actor, MAGOBRANCO_ID, { ...data, pattern: n, second, value: toInt(data.value) + (great ? 1 : 0) });
  },

  async onCombatEnd(actor) {
    const data = motorData(actor, MAGOBRANCO_ID);
    await setMotor(actor, MAGOBRANCO_ID, { ...DEFAULTS, pattern: toInt(data.pattern) || 7, second: data.second ?? null });
  },

  /**
   * Any check of the combat that shows the Law: Runes (once per check; one more on the mage's own Seal of Light);
   * a pair, the Twin Rune.
   */
  onAnyCheck(actor, { lesser }, roller, roll, context) {
    const dice = rollDice(roll);
    if (dice.length < 2) return;
    return serial(actor, async () => {
      const data = motorData(actor, MAGOBRANCO_ID);
      let gain = 0;
      for (const n of laws(actor, data, lesser)) if (shows(dice, n)) gain = Math.max(gain, runesFor(n));
      if (gain && (path(actor, lesser) === "augurio")) gain *= 2;
      if (gain && (roller?.id === actor.id) && (identifierOf(context?.item) === T("selo-de-luz"))) gain += 1;
      const changes = {};
      const key = roundKey(actor);
      if (!lesser && hasPair(dice) && talentOf(actor, T("runa-gemea")) && (data.doubles !== key)) {
        gain += 1;
        changes.doubles = key;
      }
      if (!gain) return;
      await setMotor(actor, MAGOBRANCO_ID, { ...data, ...changes, value: toInt(data.value) + gain });
    });
  },

  /** Siege Rune (Path of the Siege): an enemy slowed or rooted by the mage fails a Dodge Check: +1 Rune a round. */
  onAnyHit(actor, { lesser }, attacker, target) {
    if ((path(actor, lesser) !== "cerco") || !talentOf(actor, T("runa-do-cerco")) || !areEnemies(actor, target)) return;
    const caught = target.effects.some(e => (e.statuses.has("slowed") || e.statuses.has("rooted"))
      && (e.flags?.eternia?.source?.casterUuid === actor.uuid));
    if (!caught) return;
    return serial(actor, async () => {
      const data = motorData(actor, MAGOBRANCO_ID);
      const key = roundKey(actor);
      if (data.siege === key) return;
      await setMotor(actor, MAGOBRANCO_ID, { ...data, siege: key, value: toInt(data.value) + 1 });
    });
  }
};

/** Roll 2d6 for the Law (Path of Augury), shown in the chat: the sum. */
async function rollLaw(actor, flavor) {
  const roll = await new Roll("2d6").evaluate();
  await roll.toMessage({ speaker: ChatMessage.getSpeaker({ actor }), flavor });
  return roll.total;
}

/**
 * What a rewrite sets off. On an enemy's check: the Seal of the Mark ([Marked]), the Path of the Siege ([Slowed],
 * [Rooted] on a Fumble or with the Apex), the Broken Rune (a Fumble hurts). On the mage's or an ally's: the Golden Law
 * (a Critical makes it [Empowered]).
 */
async function afterRewrite(actor, lesser, roller, relation, before, after) {
  const cr = crOf(actor);
  if (relation === "enemy") {
    if (!lesser && talentOf(actor, T("selo-de-marca"))) {
      await giveStatus(roller, actor, "marked", { value: Math.floor(cr / 2) + 2 });
    }
    if (path(actor, lesser) === "cerco") {
      await giveStatus(roller, actor, apex(actor, lesser) ? "rooted" : "slowed");
      if (after.fumble && !apex(actor, lesser)) await giveStatus(roller, actor, "rooted");
    }
    const broken = !lesser && talentOf(actor, T("runa-partida"));
    if (broken && after.fumble && !before.fumble) await takeDamage(roller, cr * 2, { what: broken.name, from: actor });
    return;
  }
  const golden = (path(actor, lesser) === "lei-absoluta") && talentOf(actor, T("lei-dourada"));
  if (golden && after.critical && !before.critical) {
    await giveStatus(roller, actor, "empowered", { value: Math.floor(cr / 2) + 2, expires: "endOfRound" });
  }
}
