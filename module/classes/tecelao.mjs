/**
 * The Weaver's Motor: the Pattern (Padrão). docs/classes.md has the class; AS REGRAS, page XI, the rules as the
 * player reads them.
 *
 * The weaver keeps a number from 2 to 12, the Pattern (chosen with Escolher o Padrão; changing it in a combat loses
 * the Threads already gathered). Any check of anyone in the combat (Hit Checks and Dodge Checks included) with two
 * dice that add up to the Pattern gives Threads (Fios), once per check: 1 for 6 to 8, 2 for 4, 5, 9 and 10, 3 for 2,
 * 3, 11 and 12 (doubled on the Path of Chance), up to the cap (3, +1 every 5 CR, + the SR of Wide Spindle). Threads
 * are pulled on the attack cards (cardActions): 1 Thread, the lowest die of a check goes up by 1 or the highest goes
 * down by 1; 2 Threads when that makes or unmakes a Critical or a Fumble. On the Path of Destiny the die goes to 6
 * (the weaver's and the allies' checks) or to 1 (the enemies'). Other talents spend Threads on statuses, barriers,
 * healing and the Shears' damage.
 *
 * State in flags.eternia.motor.tecelao:
 *   value    Threads
 *   pattern  the number (2 to 12), kept between combats
 *   second   the second number (Second Thread, the Apex) or null
 *   doubles  "<combat>.<round>" of the last pair that gave a Loose Thread
 *   cross    "<combat>.<round>" of the last Cross Stitch
 *   pulled   "<combat>.<round>" of the Apex's free pull
 *   fate     id of the combat where Doom was pulled
 */
import { L } from "../settings.mjs";
import { combatOf, toInt } from "../helpers/utils.mjs";
import { takeDamage } from "../conditions/damage.mjs";
import {
  areEnemies, chooseOption, crOf, hasApex, identifierOf, motorData, pathOf, recentUse, roundKey, setMotor, talentOf,
  talentRank
} from "./motor.mjs";

export const TECELAO_ID = "tecelao";

/** Identifier of a Weaver skill. */
const T = name => `tecelao-${name}`;

const DEFAULTS = { state: "tecendo", value: 0, pattern: 7, second: null, doubles: null, cross: null, pulled: null, fate: null };

/** Threads a Pattern number gives: the rarer the sum of two dice, the more. */
export function threadsFor(n) {
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

/** The Path the weaver follows (none with only the Lesser Pattern). */
const path = (actor, lesser) => (lesser ? null : pathOf(actor, TECELAO_ID));

/** Whether the weaver has the Apex (not with only the Lesser Pattern). */
const apex = (actor, lesser) => !lesser && hasApex(actor, TECELAO_ID);

/** Whether the weaver keeps two numbers (Second Thread, the Apex). */
const twoNumbers = (actor, lesser) => !lesser && (!!talentOf(actor, T("segundo-fio")) || apex(actor, lesser));

/** The Pattern numbers of the weaver now. */
function patterns(actor, data, lesser) {
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

/** "own", "ally" or "enemy": whose check it is, for the weaver. */
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
 * The dice after a pull: "up" the lowest goes up by 1, "down" the highest down by 1, "six" the lowest becomes 6, "one"
 * the highest becomes 1, "fate" every die becomes 1. Null when nothing would change.
 */
function pulled(dice, action) {
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
 * Threads a pull costs: 1, 2 when it makes or unmakes a Critical or a Fumble (always 1 on the weaver's and the
 * allies' checks with Guiding Thread), every Thread (at least 3) for Doom. The Apex's free pull of the round takes 1
 * off (all of it on the Path of Destiny).
 */
function pullCost(actor, lesser, data, action, outcome, next, relation) {
  if (action === "fate") return Math.max(3, toInt(data.value));
  const after = judge(next);
  let cost = ((!!outcome.critical !== after.critical) || (!!outcome.fumble !== after.fumble)) ? 2 : 1;
  if ((cost > 1) && (relation !== "enemy") && !lesser && talentOf(actor, T("fio-guia"))) cost = 1;
  if (apex(actor, lesser) && (data.pulled !== roundKey(actor))) cost = (path(actor, lesser) === "destino") ? 0 : cost - 1;
  return Math.max(0, cost);
}

/** The pulls the weaver may make on a check: the Destiny Path's, or the ±1 (only +1 with the Lesser Pattern). */
function pullActions(actor, lesser, data, relation) {
  if (lesser) return ["up"];
  if (path(actor, lesser) === "destino") {
    const list = [(relation === "enemy") ? "one" : "six"];
    const combat = combatOf(actor);
    if ((relation === "enemy") && talentOf(actor, T("sina")) && (toInt(data.value) >= 3) && combat && (data.fate !== combat.id)) {
      list.push("fate");
    }
    return list;
  }
  return ["up", "down"];
}

const ACTION_KEYS = { up: "Up", down: "Down", six: "Six", one: "One", fate: "Fate" };

/** Give a status to an actor, from the weaver (the system's relay when the user doesn't own it). */
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

/** Options of the Pattern dialog: each number with the Threads it gives. */
const numberOptions = () => Array.from({ length: 11 }, (_, i) => i + 2).map(n => ({
  value: String(n), label: L(threadsFor(n) === 1 ? "Motor.Tecelao.Option" : "Motor.Tecelao.Options", { n, fios: threadsFor(n) })
}));

export const TECELAO = {
  id: TECELAO_ID,
  i18n: "Motor.Tecelao",
  states: ["tecendo"],
  defaults: DEFAULTS,
  costKeyword: "Fios",

  /** The cap of Threads. */
  max(actor, { lesser }) {
    let max = 3 + Math.floor(crOf(actor) / 5);
    if (lesser) max = Math.max(1, Math.floor(max / 2));
    return max + talentRank(actor, T("fuso-largo"));
  },

  /** The Path of Chance rolls the Pattern: choosing it is not for that Path. */
  issues(actor, item, motor, { lesser }) {
    if ((identifierOf(item) === T("escolher-o-padrao")) && (path(actor, lesser) === "acaso")) {
      return [L("Motor.Tecelao.ChanceIssue")];
    }
    return [];
  },

  /** Choosing the Pattern, the Wheel of Fortune, the Tight Lasso's Threads and the Unraveling's sure strike. */
  async plan(actor, item, motor, { data, max, lesser, plan }) {
    const id = identifierOf(item);
    if (id === T("escolher-o-padrao")) {
      const options = numberOptions();
      const first = await chooseOption(item.name, options, { hint: L("Motor.Tecelao.ChooseHint"), selected: String(data.pattern ?? 7) });
      if (first === null) return null;
      let second = null;
      if (twoNumbers(actor, lesser)) {
        const others = options.filter(o => o.value !== first);
        const picked = await chooseOption(item.name, others, {
          hint: L("Motor.Tecelao.ChooseSecond"), selected: String(data.second ?? others[0].value)
        });
        if (picked === null) return null;
        second = toInt(picked);
      }
      plan.changes.pattern = toInt(first);
      plan.changes.second = second;
      // A new number in the middle of a combat loses the Threads gathered.
      const changed = (toInt(first) !== toInt(data.pattern)) || (second !== (toInt(data.second) || null));
      if (changed && combatOf(actor)) plan.spent = toInt(data.value);
      return plan;
    }
    if (id === T("roda-da-fortuna")) {
      const n = await rollPattern(actor, item.name);
      plan.changes.pattern = n;
      if (talentOf(actor, T("sorte-grande")) && (threadsFor(n) === 3)) plan.gain = 1;
      return plan;
    }
    if ((id === T("laco")) && !lesser && talentOf(actor, T("laco-apertado")) && (toInt(data.value) > 0)) {
      const top = Math.min(toInt(data.value), talentRank(actor, T("laco-apertado")));
      const options = Array.from({ length: top + 1 }, (_, n) => ({
        value: String(n), label: L(n === 1 ? "Motor.Tecelao.ThreadOne" : "Motor.Tecelao.ThreadMany", { n })
      }));
      const n = await chooseOption(item.name, options, { hint: L("Motor.Tecelao.KnotHint"), selected: String(top) });
      if (n === null) return null;
      plan.spent = toInt(n);
      return plan;
    }
    if ((id === T("corte-da-tesoura")) && !lesser && talentOf(actor, T("desenlace")) && (max > 0) && (plan.spent >= max)) {
      plan.autoHit = true;
    }
    return plan;
  },

  /** The Lasso slows whom it hits ([Rooted] too with a Thread of the Tight Lasso); the Great Tangle as well. */
  onHit(actor, item, { lesser }) {
    const id = identifierOf(item);
    const spent = toInt(recentUse(item)?.spent);
    if (id === T("laco")) {
      const list = [{ statusId: "slowed", value: null, name: item.name }];
      if (!lesser && (spent > 0)) list.push({ statusId: "rooted", value: null, name: item.name });
      return list;
    }
    if (id === T("grande-emaranhado")) {
      const list = [{ statusId: "slowed", value: null, name: item.name }];
      if (spent >= 4) list.push({ statusId: "rooted", value: null, name: item.name });
      return list;
    }
    return [];
  },

  /** The class tab and the HUD: the Pattern; ready when the Unraveling's sure strike is there. */
  display(actor, { lesser, data, max }) {
    const list = patterns(actor, data, lesser);
    const note = (list.length > 1) ? L("Motor.Tecelao.NoteTwo", { a: list[0], b: list[1] }) : L("Motor.Tecelao.Note", { n: list[0] });
    const ready = !lesser && (max > 0) && (toInt(data.value) >= max) && !!talentOf(actor, T("desenlace"));
    return { note, ready, readyLabel: L("Motor.Tecelao.ReadyLabel") };
  },

  /* ------------------------------------------ */
  /*  Pulling the Threads (attack cards)        */
  /* ------------------------------------------ */

  /** The buttons on a check of an attack card: +1 / −1 (→ 6 / → 1 on the Path of Destiny, and Doom). */
  cardActions(actor, { lesser, data }, card) {
    if (toInt(data.value) < 1) return [];
    const outcome = card.roll;
    const dice = outcomeList(outcome);
    if (!dice.length) return [];
    const relation = relationOf(actor, rollerOf(card));
    const buttons = [];
    for (const action of pullActions(actor, lesser, data, relation)) {
      const next = pulled(dice, action);
      if (!next) continue;
      const cost = pullCost(actor, lesser, data, action, outcome, next, relation);
      const label = L(`Motor.Tecelao.${ACTION_KEYS[action]}`);
      buttons.push({
        action,
        label: (cost === 1) ? label : L(cost ? "Motor.Tecelao.Cost" : "Motor.Tecelao.Free", { label, n: cost }),
        tooltip: L(`Motor.Tecelao.${ACTION_KEYS[action]}Tip`),
        icon: "fa-solid fa-wand-sparkles"
      });
    }
    return buttons;
  },

  /** A pull: the Threads first, then the check (given back if the card can't change), then what the pull sets off. */
  onCardAction(actor, { lesser }, action, card) {
    return serial(actor, async () => {
      const data = motorData(actor, TECELAO_ID);
      const outcome = currentOutcome(card);
      if (!outcome) return;
      const roller = rollerOf(card);
      const relation = relationOf(actor, roller);
      if (!pullActions(actor, lesser, data, relation).includes(action)) return;
      const next = pulled(outcomeList(outcome), action);
      if (!next) return ui.notifications.warn(L("Motor.Tecelao.NoDie"));
      const cost = pullCost(actor, lesser, data, action, outcome, next, relation);
      if (toInt(data.value) < cost) return ui.notifications.warn(L("Motor.Tecelao.NoThreads", { n: cost }));
      const changes = { value: toInt(data.value) - cost };
      if (apex(actor, lesser) && (data.pulled !== roundKey(actor))) changes.pulled = roundKey(actor);
      if (action === "fate") changes.fate = combatOf(actor)?.id ?? null;
      await setMotor(actor, TECELAO_ID, { ...data, ...changes });
      const { adjustCardRoll } = await import("../helpers/combat-cards.mjs");
      const ok = await adjustCardRoll(card.message, {
        kind: card.kind, index: card.index, dice: next, actorUuid: actor.uuid,
        note: L(`Motor.Tecelao.Note${ACTION_KEYS[action]}`, { name: actor.name })
      });
      if (!ok) return setMotor(actor, TECELAO_ID, { ...motorData(actor, TECELAO_ID), value: toInt(data.value), pulled: data.pulled, fate: data.fate });
      if (roller) await afterPull(actor, lesser, roller, relation, outcome, judge(next));
    });
  },

  /* ------------------------------------------ */
  /*  Events                                    */
  /* ------------------------------------------ */

  /** Every combat starts with the Threads of Lucky Line. */
  async onCombatStart(actor) {
    const data = motorData(actor, TECELAO_ID);
    await setMotor(actor, TECELAO_ID, { ...data, value: talentRank(actor, T("linha-da-sorte")), doubles: null, cross: null, pulled: null, fate: null });
  },

  /** Path of Chance: the Pattern is rolled at each Setup Process (both numbers with the Apex); Big Luck. */
  async onSetup(actor, { lesser }) {
    if (path(actor, lesser) !== "acaso") return;
    const n = await rollPattern(actor, L("Motor.Tecelao.ChanceFlavor"));
    const second = apex(actor, lesser) ? await rollPattern(actor, L("Motor.Tecelao.ChanceFlavor")) : null;
    const data = motorData(actor, TECELAO_ID);
    const lucky = talentOf(actor, T("sorte-grande")) && [n, second].some(x => x && (threadsFor(x) === 3));
    await setMotor(actor, TECELAO_ID, { ...data, pattern: n, second, value: toInt(data.value) + (lucky ? 1 : 0) });
  },

  async onCombatEnd(actor) {
    const data = motorData(actor, TECELAO_ID);
    await setMotor(actor, TECELAO_ID, { ...DEFAULTS, pattern: toInt(data.pattern) || 7, second: data.second ?? null });
  },

  /**
   * Any check of the combat that shows the Pattern: Threads (once per check; one more on the weaver's own Lasso);
   * a pair, the Loose Thread.
   */
  onAnyCheck(actor, { lesser }, roller, roll, context) {
    const dice = rollDice(roll);
    if (dice.length < 2) return;
    return serial(actor, async () => {
      const data = motorData(actor, TECELAO_ID);
      let gain = 0;
      for (const n of patterns(actor, data, lesser)) if (shows(dice, n)) gain = Math.max(gain, threadsFor(n));
      if (gain && (path(actor, lesser) === "acaso")) gain *= 2;
      if (gain && (roller?.id === actor.id) && (identifierOf(context?.item) === T("laco"))) gain += 1;
      const changes = {};
      const key = roundKey(actor);
      if (!lesser && hasPair(dice) && talentOf(actor, T("fio-solto")) && (data.doubles !== key)) {
        gain += 1;
        changes.doubles = key;
      }
      if (!gain) return;
      await setMotor(actor, TECELAO_ID, { ...data, ...changes, value: toInt(data.value) + gain });
    });
  },

  /** Cross Stitch (Path of Embroidery): an enemy slowed or rooted by the weaver fails a Dodge Check: +1 Thread a round. */
  onAnyHit(actor, { lesser }, attacker, target) {
    if ((path(actor, lesser) !== "bordado") || !talentOf(actor, T("ponto-cruz")) || !areEnemies(actor, target)) return;
    const caught = target.effects.some(e => (e.statuses.has("slowed") || e.statuses.has("rooted"))
      && (e.flags?.eternia?.source?.casterUuid === actor.uuid));
    if (!caught) return;
    return serial(actor, async () => {
      const data = motorData(actor, TECELAO_ID);
      const key = roundKey(actor);
      if (data.cross === key) return;
      await setMotor(actor, TECELAO_ID, { ...data, cross: key, value: toInt(data.value) + 1 });
    });
  }
};

/** Roll 2D for the Pattern (Path of Chance), shown in the chat: the sum. */
async function rollPattern(actor, flavor) {
  const roll = await new Roll("2d6").evaluate();
  await roll.toMessage({ speaker: ChatMessage.getSpeaker({ actor }), flavor });
  return roll.total;
}

/**
 * What a pull sets off. On an enemy's check: Knot of the Mark ([Marked]), the Path of Embroidery ([Slowed], [Rooted]
 * on a Fumble or with the Apex), Snapped Thread (a Fumble hurts). On the weaver's or an ally's: Golden Thread (a
 * Critical makes it [Empowered]).
 */
async function afterPull(actor, lesser, roller, relation, before, after) {
  const cr = crOf(actor);
  if (relation === "enemy") {
    if (!lesser && talentOf(actor, T("no-de-marca"))) {
      await giveStatus(roller, actor, "marked", { value: Math.floor(cr / 2) + 2 });
    }
    if (path(actor, lesser) === "bordado") {
      await giveStatus(roller, actor, apex(actor, lesser) ? "rooted" : "slowed");
      if (after.fumble && !apex(actor, lesser)) await giveStatus(roller, actor, "rooted");
    }
    const snapped = !lesser && talentOf(actor, T("fio-rompido"));
    if (snapped && after.fumble && !before.fumble) await takeDamage(roller, cr * 2, { what: snapped.name, from: actor });
    return;
  }
  const golden = (path(actor, lesser) === "destino") && talentOf(actor, T("fio-dourado"));
  if (golden && after.critical && !before.critical) {
    await giveStatus(roller, actor, "empowered", { value: Math.floor(cr / 2) + 2, expires: "endOfRound" });
  }
}
