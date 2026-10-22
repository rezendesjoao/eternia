/**
 * The Strategist's Motor: the Reading (Leitura). docs/classes.md has the class; AS REGRAS, page XI, the rules as the
 * player reads them.
 *
 * Studying the Field (a Setup Process) rolls 2D and keeps both dice as a Reading, up to the cap (1, +1 every 5 CR, +
 * the SR of Plan B; over it, the strategist chooses which to drop). On the attack cards (cardActions) a Reading takes
 * the place of dice of a check: the two lowest of the strategist's own checks (and of the allies', with A Lesson
 * Taught or the Chess Path), the two highest of an enemy's (with Foresee); Criticals and Fumbles follow the new dice,
 * and the Reading is gone. Other skills spend a Reading for its sum (2 to 12): a mark, a barrier, a blow, an order.
 *
 * State in flags.eternia.motor.estrategista:
 *   readings  [[d1, d2], ...] (value = how many)
 *   observed  { combat, n }: Readings kept by Observation in that combat
 *   foe       "<combat>.<round>" of the last Read the Enemy
 *   drill     "<combat>.<round>" of the last Rehearsed Formation
 */
import { L } from "../settings.mjs";
import { combatOf, toInt } from "../helpers/utils.mjs";
import {
  areAllies, areEnemies, chooseOption, combatPeers, crOf, hasApex, identifierOf, motorData, motorMax, pathOf,
  roundKey, setMotor, talentOf, talentRank
} from "./motor.mjs";

export const ESTRATEGISTA_ID = "estrategista";

/** Identifier of a Strategist skill. */
const T = name => `estrategista-${name}`;

const DEFAULTS = { state: "atento", value: 0, readings: [], observed: null, foe: null, drill: null };

/**
 * The skills that spend a Reading for its sum: which Readings they take (a test on the sum), and whether spending is
 * optional (Weak Point) or takes all of them (Checkmate).
 */
const SPENDERS = {
  "ponto-fraco": { optional: true },
  "armadilha-mental": { fits: sum => sum <= 7, issue: ["Motor.Estrategista.MaxSum", { n: 7 }] },
  "instrucao": {},
  "antecipar-o-golpe": {},
  "golpe-calculado": {},
  "xeque": {},
  "mudar-a-formacao": {},
  "tempo-certo": { fits: sum => sum >= 9, issue: ["Motor.Estrategista.MinSum", { n: 9 }] },
  "deducao-rapida": {},
  "xeque-mate": { all: 2 }
};

/** The skills that roll a new Reading. */
const STUDIES = ["estudar-o-campo", "estudo-rapido", "olhar-adiante", "plano-previo"];

/** The Readings of a state, as numbers. */
const readingsOf = data => (Array.isArray(data?.readings) ? data.readings : [])
  .map(r => [toInt(r?.[0]), toInt(r?.[1])]).filter(r => (r[0] > 0) && (r[1] > 0));

const sumOf = r => r[0] + r[1];
const label = r => `${r[0]}+${r[1]}`;

/** The dice of an attack card's check ("6, 4" → [6, 4]). */
const outcomeList = outcome => String(outcome?.results ?? "").split(",").map(toInt).filter(n => n > 0);

/** The active dice of a roll. */
const rollDice = roll => (roll?.dice ?? []).flatMap(d => d.results.filter(r => r.active).map(r => r.result));

/** The Path the strategist follows (none with only the Lesser Reading). */
const path = (actor, lesser) => (lesser ? null : pathOf(actor, ESTRATEGISTA_ID));

/** Whether the strategist has the Apex (not with only the Lesser Reading). */
const apex = (actor, lesser) => !lesser && hasApex(actor, ESTRATEGISTA_ID);

/** The dice a Reading roll uses: 2, 3 on the Foresight Path, 4 with Seeing Beyond. */
function readingDice(actor, lesser) {
  if (path(actor, lesser) !== "antevisao") return 2;
  return talentOf(actor, T("ver-alem")) ? 4 : 3;
}

/**
 * Roll a Reading: nD shown in the chat. With more than 2 dice the user keeps two (asked when `ask`, else the two
 * highest).
 * @returns {Promise<number[]>}
 */
async function rollReading(actor, title, n, { ask = false } = {}) {
  const roll = await new Roll(`${n}d6`).evaluate();
  await roll.toMessage({ speaker: ChatMessage.getSpeaker({ actor }), flavor: L("Motor.Estrategista.RollFlavor", { skill: title }) });
  const dice = rollDice(roll);
  if (dice.length <= 2) return dice;
  const best = [...dice].sort((a, b) => b - a).slice(0, 2);
  if (!ask) return best;
  const pairs = new Map();
  for (let i = 0; i < dice.length; i++) {
    for (let j = i + 1; j < dice.length; j++) {
      const pair = [dice[i], dice[j]].sort((a, b) => b - a);
      pairs.set(pair.join(","), pair);
    }
  }
  const options = [...pairs.values()].map(p => ({ value: p.join(","), label: `${label(p)} (${sumOf(p)})` }));
  const choice = await chooseOption(title, options, { hint: L("Motor.Estrategista.Keep"), selected: best.join(",") });
  return choice ? choice.split(",").map(toInt) : best;
}

/**
 * Readings within the cap: over it, the user drops one at a time (when `ask`), else the lowest sums go.
 * @returns {Promise<number[][]>}
 */
async function withinCap(title, list, max, { ask = false } = {}) {
  const kept = [...list];
  while (kept.length > Math.max(0, max)) {
    let drop = null;
    if (ask) {
      const options = kept.map((r, i) => ({ value: String(i), label: `${label(r)} (${sumOf(r)})` }));
      const lowest = kept.reduce((low, r, i) => ((sumOf(r) < sumOf(kept[low])) ? i : low), 0);
      const choice = await chooseOption(title, options, { hint: L("Motor.Estrategista.Discard"), selected: String(lowest) });
      if (choice !== null) drop = toInt(choice);
    }
    if (drop === null) drop = kept.reduce((low, r, i) => ((sumOf(r) < sumOf(kept[low])) ? i : low), 0);
    kept.splice(drop, 1);
  }
  return kept;
}

/** Roll new Readings and keep them (outside a plan: no dialog, the lowest go). */
async function gainReadings(actor, lesser, title, count = 1) {
  const fresh = [];
  for (let i = 0; i < count; i++) fresh.push(await rollReading(actor, title, readingDice(actor, lesser)));
  const data = motorData(actor, ESTRATEGISTA_ID);
  const kept = await withinCap(title, [...readingsOf(data), ...fresh], motorMax(actor, ESTRATEGISTA_ID));
  await setMotor(actor, ESTRATEGISTA_ID, { ...data, readings: kept, value: kept.length });
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

/** "own", "ally", "enemy" or null: whose check it is, for the strategist. */
function relationOf(actor, roller) {
  if (!roller) return null;
  if (roller.id === actor.id) return "own";
  if (areEnemies(actor, roller)) return "enemy";
  return areAllies(actor, roller) ? "ally" : null;
}

/** Whether the strategist's Readings work on this check. */
function allowed(actor, lesser, relation) {
  if (relation === "own") return true;
  if (relation === "ally") return !!talentOf(actor, T("licao-ensinada")) || (path(actor, lesser) === "xadrez");
  if (relation === "enemy") return !!talentOf(actor, T("prever"));
  return false;
}

/** The dice of a check with a Reading in place of its two lowest (or, for an enemy, its two highest). */
function withReading(dice, reading, enemy) {
  const next = [...dice];
  if (next.length === 1) return [enemy ? Math.min(...reading) : Math.max(...reading)];
  const order = next.map((d, i) => i).sort((a, b) => (enemy ? (next[b] - next[a]) : (next[a] - next[b])));
  next[order[0]] = reading[0];
  next[order[1]] = reading[1];
  return next;
}

/** Whether a check of an attack card went the roller's way, after the change: a hit, or a dodge; null while pending. */
function succeeded(card) {
  const data = card.message.getFlag("eternia", "attack");
  if (!data) return null;
  if (card.kind === "attack") {
    const known = (data.targets ?? []).filter(t => typeof t.hit === "boolean");
    return known.length ? known.some(t => t.hit) : null;
  }
  const hit = data.targets?.[card.index]?.hit;
  return (typeof hit === "boolean") ? !hit : null;
}

/** Give a status to an actor, from the strategist (the system's relay when the user doesn't own it). */
function giveStatus(actor, from, statusId, { value = null, expires = "endOfScene" } = {}) {
  return game.eternia?.applyStatus?.(actor, statusId, { value, expires, from });
}

/** The user's targeted actors (the targets of a skill just used). */
const targetedActors = () => [...game.user.targets].map(t => t.actor).filter(Boolean);

export const ESTRATEGISTA = {
  id: ESTRATEGISTA_ID,
  i18n: "Motor.Estrategista",
  states: ["atento"],
  defaults: DEFAULTS,
  costKeyword: "Leituras",

  /** The cap of Readings. */
  max(actor, { lesser }) {
    if (lesser) return 1 + talentRank(actor, T("plano-b"));
    let max = 1 + Math.floor(crOf(actor) / 5);
    if ((path(actor, lesser) === "xadrez") && apex(actor, lesser)) max += 1;
    return max + talentRank(actor, T("plano-b"));
  },

  /** The skills that spend a Reading need one (that fits); Revise needs one to revise. */
  issues(actor, item, motor, { data }) {
    const key = identifierOf(item).replace(`${ESTRATEGISTA_ID}-`, "");
    const readings = readingsOf(data);
    if (key === "revisar") return readings.length ? [] : [L("Motor.Estrategista.NoReading")];
    const spender = SPENDERS[key];
    if (!spender || spender.optional) return [];
    if (spender.all && (readings.length < spender.all)) return [L("Motor.Estrategista.MinReadings", { n: spender.all })];
    if (!readings.length) return [L("Motor.Estrategista.NoReading")];
    if (spender.fits && !readings.some(r => spender.fits(sumOf(r)))) return [L(...spender.issue)];
    return [];
  },

  /** Studying rolls Readings; Revise rerolls one die; the spenders take a Reading (its sum in @use.reading). */
  async plan(actor, item, motor, { data, max, lesser, plan }) {
    const key = identifierOf(item).replace(`${ESTRATEGISTA_ID}-`, "");
    const readings = readingsOf(data);

    if (STUDIES.includes(key)) {
      const rolls = (key === "plano-previo") ? Math.max(1, talentRank(actor, T("plano-previo")))
        : (((key === "estudar-o-campo") && apex(actor, lesser)) ? 2 : 1);
      const fresh = [];
      for (let i = 0; i < rolls; i++) fresh.push(await rollReading(actor, item.name, readingDice(actor, lesser), { ask: true }));
      plan.changes.readings = await withinCap(item.name, [...readings, ...fresh], max, { ask: true });
      return plan;
    }

    if (key === "revisar") {
      const options = readings.map((r, i) => ({ value: String(i), label: `${label(r)} (${sumOf(r)})` }));
      const lowest = readings.reduce((low, r, i) => ((sumOf(r) < sumOf(readings[low])) ? i : low), 0);
      const pick = await chooseOption(item.name, options, { hint: L("Motor.Estrategista.ReviseHint"), selected: String(lowest) });
      if (pick === null) return null;
      const reading = [...readings[toInt(pick)]];
      const die = (reading[0] <= reading[1]) ? 0 : 1;
      const roll = await new Roll("1d6").evaluate();
      await roll.toMessage({ speaker: ChatMessage.getSpeaker({ actor }), flavor: L("Motor.Estrategista.RollFlavor", { skill: item.name }) });
      reading[die] = roll.total;
      plan.changes.readings = readings.map((r, i) => ((i === toInt(pick)) ? reading.sort((a, b) => b - a) : r));
      return plan;
    }

    const spender = SPENDERS[key];
    if (!spender) return plan;
    if (spender.all) {
      plan.vars.reading = readings.reduce((t, r) => t + sumOf(r), 0);
      plan.spent = readings.length;
      plan.changes.readings = [];
      return plan;
    }
    const fitting = readings.map((r, i) => ({ r, i })).filter(({ r }) => !spender.fits || spender.fits(sumOf(r)));
    const options = fitting.map(({ r, i }) => ({ value: String(i), label: `${label(r)} (${sumOf(r)})` }));
    if (spender.optional) options.unshift({ value: "none", label: L("Motor.Estrategista.NoSpend") });
    if (!options.length) return plan;
    const top = fitting.reduce((best, f) => ((!best || (sumOf(f.r) > sumOf(best.r))) ? f : best), null);
    const pick = await chooseOption(item.name, options, {
      hint: L(spender.optional ? "Motor.Estrategista.ChooseOptional" : "Motor.Estrategista.Choose"),
      selected: (spender.optional || !top) ? "none" : String(top.i)
    });
    if (pick === null) return null;
    if (pick === "none") return plan;
    const reading = readings[toInt(pick)];
    plan.vars.reading = sumOf(reading);
    plan.vars.a = reading[0];
    plan.vars.b = reading[1];
    plan.spent = 1;
    plan.changes.readings = readings.filter((r, i) => i !== toInt(pick));
    return plan;
  },

  /** The value follows the Readings kept. */
  after(actor, item, plan, next) {
    next.readings = readingsOf(next);
    next.value = next.readings.length;
    return next;
  },

  /** Any write (a pip clicked on the class tab too): a pip taken off drops the last Reading; none comes by hand. */
  normalize(actor, data) {
    const readings = readingsOf(data);
    const value = Math.min(toInt(data.value), readings.length);
    return { ...data, value, readings: readings.slice(0, value) };
  },

  /** The class tab and the HUD: the Readings; ready with a double six in hand (a sure Critical). */
  display(actor, { data }) {
    const readings = readingsOf(data);
    return {
      note: readings.length ? L("Motor.Estrategista.Note", { list: readings.map(label).join(" · ") }) : "",
      ready: readings.some(r => (r[0] === 6) && (r[1] === 6)),
      readyLabel: L("Motor.Estrategista.ReadyLabel")
    };
  },

  /* ------------------------------------------ */
  /*  Playing a Reading (attack cards)          */
  /* ------------------------------------------ */

  /** One button per Reading on the checks the strategist may change. */
  cardActions(actor, { lesser, data }, card) {
    const readings = readingsOf(data);
    if (!readings.length || !outcomeList(card.roll).length) return [];
    const relation = relationOf(actor, rollerOf(card));
    if (!allowed(actor, lesser, relation)) return [];
    const tip = (relation === "enemy") ? "Motor.Estrategista.EnemyTip" : "Motor.Estrategista.OwnTip";
    return readings.map((r, i) => ({
      action: `read:${i}`,
      label: L("Motor.Estrategista.Button", { a: r[0], b: r[1] }),
      tooltip: L(tip, { a: r[0], b: r[1] }),
      icon: "fa-solid fa-chess-knight"
    }));
  },

  /** Play a Reading: it leaves first, the check changes (it comes back if the card can't), then what that sets off. */
  async onCardAction(actor, { lesser }, action, card) {
    const index = toInt(String(action).split(":")[1]);
    const data = motorData(actor, ESTRATEGISTA_ID);
    const readings = readingsOf(data);
    const reading = readings[index];
    if (!reading) return ui.notifications.warn(L("Motor.Estrategista.NoReading"));
    const flags = card.message.getFlag("eternia", "attack");
    const outcome = (card.kind === "attack") ? flags?.attack : flags?.targets?.[card.index]?.dodge;
    const dice = outcomeList(outcome);
    if (!dice.length) return;
    const roller = rollerOf(card);
    const relation = relationOf(actor, roller);
    if (!allowed(actor, lesser, relation)) return;
    const rest = readings.filter((r, i) => i !== index);
    await setMotor(actor, ESTRATEGISTA_ID, { ...data, readings: rest, value: rest.length });
    const { adjustCardRoll } = await import("../helpers/combat-cards.mjs");
    const ok = await adjustCardRoll(card.message, {
      kind: card.kind, index: card.index, dice: withReading(dice, reading, relation === "enemy"), actorUuid: actor.uuid,
      note: L("Motor.Estrategista.NoteUsed", { name: actor.name, a: reading[0], b: reading[1] })
    });
    if (!ok) {
      const now = motorData(actor, ESTRATEGISTA_ID);
      const back = [...readingsOf(now), reading];
      return setMotor(actor, ESTRATEGISTA_ID, { ...now, readings: back, value: back.length });
    }
    await afterReading(actor, lesser, card, roller, relation, reading);
  },

  /* ------------------------------------------ */
  /*  Events                                    */
  /* ------------------------------------------ */

  /** Master Mind on the Detective Path: every combat starts with a Reading. */
  async onCombatStart(actor, { lesser }) {
    if ((path(actor, lesser) === "detetive") && apex(actor, lesser)) {
      await gainReadings(actor, lesser, L("Motor.Estrategista.CombatStart"));
    }
  },

  /** The Readings end with the combat (on the Detective Path they stay). */
  async onCombatEnd(actor, { lesser }) {
    const data = motorData(actor, ESTRATEGISTA_ID);
    const readings = (path(actor, lesser) === "detetive") ? readingsOf(data) : [];
    await setMotor(actor, ESTRATEGISTA_ID, { ...DEFAULTS, readings, value: readings.length });
  },

  /** Observation: a Critical anywhere in the combat becomes a Reading of two sixes ([SR] per combat). */
  async onAnyCheck(actor, { lesser }, roller, roll) {
    const rank = talentRank(actor, T("observacao"));
    if (!rank || (rollDice(roll).filter(d => d === 6).length < 2)) return;
    const combat = combatOf(actor);
    if (!combat) return;
    const data = motorData(actor, ESTRATEGISTA_ID);
    const seen = (data.observed?.combat === combat.id) ? toInt(data.observed.n) : 0;
    if (seen >= rank) return;
    const kept = await withinCap("", [...readingsOf(data), [6, 6]], motorMax(actor, ESTRATEGISTA_ID));
    await setMotor(actor, ESTRATEGISTA_ID, { ...data, readings: kept, value: kept.length, observed: { combat: combat.id, n: seen + 1 } });
  },

  /** Read the Scene: a pair in the check is kept as a Reading. */
  async onCheck(actor, { lesser }, roll, context) {
    if (identifierOf(context?.item) !== T("ler-a-cena")) return;
    const dice = rollDice(roll);
    const pair = dice.find((d, i) => dice.indexOf(d) !== i);
    if (!pair) return;
    const data = motorData(actor, ESTRATEGISTA_ID);
    const kept = await withinCap("", [...readingsOf(data), [pair, pair]], motorMax(actor, ESTRATEGISTA_ID));
    await setMotor(actor, ESTRATEGISTA_ID, { ...data, readings: kept, value: kept.length });
  },

  /** Case Closed (Detective Path): an enemy the strategist identified falls: a new Reading. */
  async onAnyKill(actor, { lesser }, victim) {
    if ((path(actor, lesser) !== "detetive") || !talentOf(actor, T("caso-encerrado")) || !areEnemies(actor, victim)) return;
    const identified = victim.effects.some(e => e.statuses.has("identified") && (e.flags?.eternia?.source?.casterUuid === actor.uuid));
    if (identified) await gainReadings(actor, lesser, talentOf(actor, T("caso-encerrado")).name);
  },

  /** After a skill: the marks, orders and swaps the spenders leave on their targets (their sums in @use.reading). */
  async onUse(actor, { lesser }, item, plan) {
    const key = identifierOf(item).replace(`${ESTRATEGISTA_ID}-`, "");
    const reading = toInt(plan?.vars?.reading);
    if (!reading) return;
    const cr = crOf(actor);
    const targets = targetedActors();
    if (key === "ponto-fraco") {
      for (const target of targets) await giveStatus(target, actor, "marked", { value: reading + Math.floor(cr / 2) });
    }
    else if ((key === "instrucao") && (reading >= 10)) {
      for (const target of targets) await giveStatus(target, actor, "empowered", { value: Math.floor(cr / 2) + 2, expires: "endOfRound" });
    }
    else if (key === "xeque") await checkOrder(actor, targets, reading + cr, item.name);
    else if (key === "deducao-rapida") await deduce(actor, plan.vars);
  }
};

/**
 * What playing a Reading sets off. On an enemy's check: Dismantle the Guard ([Marked] when it then misses or fails the
 * dodge), Read the Enemy (a new Reading, once a round). On an ally's: Rehearsed Formation (a new Reading when it works,
 * once a round); the Chess Path (the Reading comes back when it works); Castling (a Critical: a new Reading).
 */
async function afterReading(actor, lesser, card, roller, relation, reading) {
  const key = roundKey(actor);
  const worked = succeeded(card);
  if (relation === "enemy") {
    if (roller && (worked === false) && talentOf(actor, T("desmontar-a-guarda"))) {
      await giveStatus(roller, actor, "marked", { value: Math.floor(crOf(actor) / 2) + 2 });
    }
    const data = motorData(actor, ESTRATEGISTA_ID);
    if (talentOf(actor, T("ler-o-inimigo")) && (data.foe !== key)) {
      await setMotor(actor, ESTRATEGISTA_ID, { ...data, foe: key });
      await gainReadings(actor, lesser, talentOf(actor, T("ler-o-inimigo")).name);
    }
    return;
  }
  if (relation !== "ally") return;
  if ((path(actor, lesser) === "xadrez") && worked) {
    const data = motorData(actor, ESTRATEGISTA_ID);
    const back = await withinCap("", [...readingsOf(data), reading], motorMax(actor, ESTRATEGISTA_ID));
    await setMotor(actor, ESTRATEGISTA_ID, { ...data, readings: back, value: back.length });
    ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor }), content: `<p>${L("Motor.Estrategista.Kept", { name: actor.name, a: reading[0], b: reading[1] })}</p>` });
  }
  const flags = card.message.getFlag("eternia", "attack");
  const outcome = (card.kind === "attack") ? flags?.attack : flags?.targets?.[card.index]?.dodge;
  if ((path(actor, lesser) === "xadrez") && outcome?.critical && talentOf(actor, T("roque"))) {
    await gainReadings(actor, lesser, talentOf(actor, T("roque")).name);
  }
  const data = motorData(actor, ESTRATEGISTA_ID);
  if (worked && talentOf(actor, T("formacao-ensaiada")) && (data.drill !== key)) {
    await setMotor(actor, ESTRATEGISTA_ID, { ...data, drill: key });
    await gainReadings(actor, lesser, talentOf(actor, T("formacao-ensaiada")).name);
  }
}

/** Check: the targeted enemies are [Taunted] by an ally the strategist picks, who gets a [Barrier]. */
async function checkOrder(actor, targets, barrier, title) {
  const allies = combatPeers(actor).filter(a => (a.id === actor.id) || areAllies(actor, a));
  const options = (allies.length ? allies : [actor]).map(a => ({ value: a.uuid, label: a.token?.name ?? a.name }));
  const pick = await chooseOption(title, options, { hint: L("Motor.Estrategista.PickAlly"), selected: options[0].value });
  const ally = pick ? fromUuidSync(pick) : null;
  if (!ally) return;
  for (const target of targets) await giveStatus(target, ally, "taunted", { expires: "endOfRound" });
  await giveStatus(ally, actor, "barrier", { value: barrier, expires: "endOfRound" });
}

/**
 * Quick Deduction (Detective Path): the strategist's last plain check (Analysis, Knowledge, Perception…) with the
 * Reading in place of its two lowest dice; the new total goes to the chat.
 */
async function deduce(actor, vars) {
  const reading = [toInt(vars.a), toInt(vars.b)];
  const message = game.messages.contents.slice(-30).reverse().find(m => (m.speaker?.actor === actor.id) && m.rolls?.length
    && !m.flags?.eternia?.attack && !m.flags?.eternia?.damage && !m.flags?.eternia?.skillUse);
  if (!message) return ui.notifications.warn(L("Motor.Estrategista.NoCheck"));
  const roll = message.rolls[0];
  const dice = rollDice(roll);
  if (!dice.length) return ui.notifications.warn(L("Motor.Estrategista.NoCheck"));
  const mod = roll.total - dice.reduce((t, d) => t + d, 0);
  const next = withReading(dice, reading, false);
  const fumble = next.every(d => d === 1);
  const critical = !fumble && (next.filter(d => d === 6).length >= 2);
  const total = fumble ? 0 : next.reduce((t, d) => t + d, 0) + mod;
  const extra = critical ? ` ${game.i18n.localize("ETERNIA.Combat.Critical")}` : (fumble ? ` ${game.i18n.localize("ETERNIA.Combat.Fumble")}` : "");
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content: `<p>${L("Motor.Estrategista.Deduction", { name: actor.name, a: reading[0], b: reading[1], test: message.flavor ?? "", total })}${extra}</p>`
  });
}
