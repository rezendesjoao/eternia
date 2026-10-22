/**
 * The Minstrel's Motor: the Movements (Movimentos) of a song. docs/classes.md has the class; AS REGRAS, page XI, the
 * rules as the player reads them.
 *
 * The minstrel sings one song at a time (the War March and the Ballad of Life; the Hymn of the Wall and the Lament of
 * the Fallen by talents) or none (silence). Starting or changing a song (a Minor Action) puts it at Movement I; at each
 * Setup Process, still singing it, it rises one Movement, up to the cap (3; +1 at CR 10, +1 with the Apex, + Strong
 * Beat's SR). The song is an aura on everyone in the combat on the minstrel's side (the minstrel too), or on every
 * enemy for the Lament: [Empowered], [Regen], [Cancel] or [Weakness] by the Movement. The Finale spends every Movement
 * for a burst of the song until the end of the round, and the minstrel falls silent.
 *
 * The auras are written by the active GM (the "eterniaSong" request, registered when this module loads): effects
 * flagged flags.eternia.minstrelAura = { caster, kind } ("aura", "extra" for the Setup extras, "burst" for the
 * Finale), replaced at each change. A [Silenced] minstrel at the Setup Process stops singing.
 *
 * A skill that needs a song being sung says so in its flags.eternia.motor.singing.
 *
 * State in flags.eternia.motor.menestrel:
 *   state      "silencio" | "marcha" | "balada" | "hino" | "lamento"
 *   value      Movements
 *   apexStart  the first song of this combat starts at Movement II (Apex)
 *   hurt       "<combat>.<round>" of the last round an ally lost HP (Crescendo)
 *   switched   "<combat>.<round>" of the last song change (Endless Repertoire)
 *   refrain    Refrain was used in this combat
 *   regency    "<combat>.<round>" of the last Regency change
 *   chord, applause   "<combat>.<round>" of the last gain of those talents
 */
import { L, SYSTEM_ID } from "../settings.mjs";
import { request, registerHandler } from "../piles/pile-socket.mjs";
import { combatOf, toInt } from "../helpers/utils.mjs";
import {
  areAllies, areEnemies, combatPeers, crOf, hasApex, identifierOf, mainWeaponTags, motorData, motorMax, pathOf,
  roundKey, setMotor, sideOf, skillMotor, talentOf, talentRank
} from "./motor.mjs";

export const MENESTREL_ID = "menestrel";

/** Identifier of a Minstrel skill. */
const T = name => `menestrel-${name}`;

/** The songs (the Motor's states besides silence). */
const SONGS = ["marcha", "balada", "hino", "lamento"];

/** Flag of the effects a song puts on the combat. */
const AURA_FLAG = "minstrelAura";

const DEFAULTS = {
  state: "silencio", value: 0, apexStart: false, hurt: null, switched: null, refrain: false, regency: null,
  chord: null, applause: null
};

/** The Path the actor follows (none with only the Lesser Movements). */
const path = (actor, lesser) => (lesser ? null : pathOf(actor, MENESTREL_ID));

/** I, II, III… */
const ROMAN = ["0", "I", "II", "III", "IV", "V", "VI", "VII", "VIII"];
export const roman = n => ROMAN[toInt(n)] ?? String(n);

const songName = song => L(`Motor.Menestrel.Song.${song}`);

/** Whether a skill starts a song (its Motor part sets one). */
const songOf = item => {
  const set = skillMotor(item)?.set;
  return SONGS.includes(set) ? set : null;
};

/** Whether a roll shows two or more 6s (a Critical). */
function critical(roll) {
  const results = (roll?.dice ?? []).flatMap(d => d.results.filter(r => r.active).map(r => r.result));
  return results.filter(r => r === 6).length >= 2;
}

/* -------------------------------------------- */
/*  The song on the combat                      */
/* -------------------------------------------- */

/**
 * The effects of a song at a Movement: [{ to: "allies" | "enemies", statusId, value, kind }].
 * @param {Actor} actor
 * @param {string} song
 * @param {number} level
 * @param {object} options
 * @param {boolean} options.lesser
 * @param {boolean} [options.setup]   The Setup Process: the extras of Duet and Tide of Voices too
 * @param {boolean} [options.burst]   The Finale
 */
function songEffects(actor, song, level, { lesser, setup = false, burst = false }) {
  if (!SONGS.includes(song) || (level <= 0)) return [];
  const cr = crOf(actor);
  const siren = path(actor, lesser) === "sereia";
  const kind = burst ? "burst" : "aura";
  const list = [];
  if (burst) {
    const strong = Math.floor(cr / 2) + 3;
    if (song === "marcha") list.push({ to: "allies", statusId: "empowered", value: level * strong, kind });
    if (song === "balada") list.push({ to: "allies", statusId: "regen", value: level * (cr + 5), kind });
    if (song === "hino") list.push({ to: "allies", statusId: "barrier", value: level * (cr + 5), kind });
    if (song === "lamento") list.push({ to: "enemies", statusId: "weakness", value: level * strong * (siren ? 2 : 1), kind });
    // The Baton (Conductor): the Finale also leaves the allies [Focused].
    if ((path(actor, lesser) === "maestro") && talentOf(actor, T("batuta")) && (song !== "lamento")) {
      list.push({ to: "allies", statusId: "focused", value: null, kind });
    }
    return list;
  }
  if (song === "marcha") list.push({ to: "allies", statusId: "empowered", value: level * 2, kind });
  if (song === "balada") list.push({ to: "allies", statusId: "regen", value: level * (2 + Math.floor(cr / 5)), kind });
  if (song === "hino") list.push({ to: "allies", statusId: "cancel", value: level * 2, kind });
  if (song === "lamento") list.push({ to: "enemies", statusId: "weakness", value: level * 2 * (siren ? 2 : 1), kind });
  if (setup) {
    // Duet: from Movement II, the allies start each round [Focused].
    if (talentOf(actor, T("dueto")) && (level >= 2) && (song !== "lamento")) {
      list.push({ to: "allies", statusId: "focused", value: null, kind: "extra" });
    }
    // Tide of Voices (Siren): the Lament at Movement III also slows the enemies down.
    if (siren && talentOf(actor, T("mare-de-vozes")) && (song === "lamento") && (level >= 3)) {
      list.push({ to: "enemies", statusId: "slowed", value: null, kind: "extra" });
    }
  }
  return list;
}

/**
 * Put a song on the combat (on the active GM): `clear` the minstrel's earlier effects ("auras", "all" or "none"), then
 * create these.
 * @param {Actor} actor
 * @param {object[]} effects   See songEffects
 * @param {object} options
 * @param {string} options.clear
 * @param {string} [options.song]   The song's name for the effects
 * @param {number} [options.level]
 */
async function sing(actor, effects, { clear = "auras", song = "", level = 0 } = {}) {
  if (!combatOf(actor)) return;
  const name = song ? `${songName(song)} (${roman(level)})` : "";
  const result = await request("eterniaSong", { casterUuid: actor.uuid, clear, effects, name });
  if (!result?.ok) console.warn(`${SYSTEM_ID} | The song of ${actor.uuid} could not be written`, result?.error);
}

/** The song as it is now (the Motor's state and Movements), replacing the aura (and the extras at the Setup). */
function refresh(actor, { setup = false, clear = null, lesser = false } = {}) {
  const data = motorData(actor, MENESTREL_ID);
  const effects = songEffects(actor, data.state, toInt(data.value), { lesser, setup });
  return sing(actor, effects, { clear: clear ?? (setup ? "all" : "auras"), song: data.state, level: toInt(data.value) });
}

/** GM side of sing: the minstrel's owner asks; the GM writes the effects on everyone in the combat. */
async function onSongRequest({ casterUuid, clear, effects, name }, user) {
  const caster = fromUuidSync(casterUuid);
  if (!(caster instanceof Actor) || !caster.testUserPermission(user, "OWNER")) return { ok: false };
  const peers = combatPeers(caster);
  if (!peers.length) return { ok: true };
  const { statusEffectData } = await import("../chat/status-links.mjs");
  const allies = peers.filter(p => sideOf(p) === sideOf(caster));
  const enemies = peers.filter(p => areEnemies(caster, p));
  for (const actor of peers) {
    const old = actor.effects.filter(e => {
      const flag = e.flags?.[SYSTEM_ID]?.[AURA_FLAG];
      if (!flag || (flag.caster !== casterUuid)) return false;
      return (clear === "all") || ((clear === "auras") && (flag.kind === "aura"));
    }).map(e => e.id);
    const list = (effects ?? []).filter(e => ((e.to === "enemies") ? enemies : allies).includes(actor)).map(e => {
      const data = statusEffectData(e.statusId, toInt(e.value) || null, "", {
        caster, expires: (e.kind === "burst") ? "endOfRound" : "endOfScene"
      });
      if (name) data.name = `${name}${e.kind === "burst" ? " · Finale" : ""}`;
      data.flags[SYSTEM_ID][AURA_FLAG] = { caster: casterUuid, kind: e.kind };
      return data;
    });
    if (old.length) await actor.deleteEmbeddedDocuments("ActiveEffect", old).catch(() => null);
    if (list.length) await actor.createEmbeddedDocuments("ActiveEffect", list);
  }
  return { ok: true };
}

// The GM writes the songs: its window must answer the players' requests as soon as the system loads.
registerHandler("eterniaSong", onSongRequest);

/* -------------------------------------------- */
/*  The Motor                                   */
/* -------------------------------------------- */

export const MENESTREL = {
  id: MENESTREL_ID,
  i18n: "Motor.Menestrel",
  states: ["silencio", ...SONGS],
  stateColors: { silencio: 0x6b6b6b, marcha: 0xb8261b, balada: 0x2f7a52, hino: 0x3b5b7a, lamento: 0x5c3a6e },
  defaults: DEFAULTS,
  costKeyword: "Movimentos",

  /**
   * The cap of Movements: 3, +1 at CR 10, +1 with the Apex, + Strong Beat's SR. The Lesser Movements: 2. On the Siren
   * Path the other songs stop at II (not with the Apex).
   */
  max(actor, { lesser }) {
    const strong = talentRank(actor, T("tempo-forte"));
    if (lesser) return 2 + strong;
    const apex = hasApex(actor, MENESTREL_ID);
    let max = 3 + ((crOf(actor) >= 10) ? 1 : 0) + (apex ? 1 : 0) + strong;
    const state = motorData(actor, MENESTREL_ID).state;
    if ((path(actor, lesser) === "sereia") && !apex && !["lamento", "silencio"].includes(state)) max = Math.min(max, 2);
    return max;
  },

  /** A song already being sung can't be started again; some skills need a song. */
  issues(actor, item, motor, { data }) {
    const song = songOf(item);
    if (song && (data.state === song)) return [L("Motor.Menestrel.SameSong")];
    if (motor.singing && !SONGS.includes(data.state)) return [L("Motor.Menestrel.NeedSong")];
    return [];
  },

  /** Modulation: changing songs is a Move Action. Conductor + Apex: the Finale is a Minor Action. */
  actionOf(actor, item, motor, action) {
    if (songOf(item) && talentOf(actor, T("modulacao"))) return "move";
    if ((identifierOf(item) === T("finale")) && hasApex(actor, MENESTREL_ID) && (pathOf(actor, MENESTREL_ID) === "maestro")) {
      return "minor";
    }
    return action;
  },

  /** A new song (its first Movement) and the Finale (which song, at which Movement). */
  plan(actor, item, motor, { data, max, lesser, plan }) {
    const song = songOf(item);
    const followed = path(actor, lesser);
    if (song) {
      let level = 1;
      const singing = SONGS.includes(data.state);
      const have = toInt(data.value);
      if (!singing && data.apexStart) {
        level = 2;
        plan.changes.apexStart = false;
      }
      else if (singing) {
        if (followed === "trovador") level = hasApex(actor, MENESTREL_ID) ? have : Math.max(1, Math.floor(have / 2));
        const now = roundKey(actor);
        if ((level < have) && (followed === "maestro") && talentOf(actor, T("regencia")) && now && (data.regency !== now)) {
          level = have;
          plan.changes.regency = now;
        }
        if ((level < have) && talentOf(actor, T("refrao")) && !data.refrain && combatOf(actor)) {
          level = have;
          plan.changes.refrain = true;
        }
      }
      plan.changes.switched = roundKey(actor);
      plan.vars.level = Math.max(1, level);
      plan.vars.song = song;
      plan.vars.from = data.state;
      return plan;
    }
    if (identifierOf(item) === T("finale")) {
      plan.vars.level = toInt(data.value);
      plan.vars.song = data.state;
      // The Conductor doesn't fall silent: the song goes on, at Movement I.
      plan.set = (followed === "maestro") ? data.state : "silencio";
    }
    return plan;
  },

  /** The new song's Movement; after the Conductor's Finale, Movement I. */
  after(actor, item, plan, next) {
    if (songOf(item)) next.value = toInt(plan.vars?.level) || 1;
    else if ((identifierOf(item) === T("finale")) && (next.state !== "silencio")) next.value = 1;
    return next;
  },

  /** Solo: with the Movements at the cap, the minstrel's attacks with an [Instrument] add +CR to the damage. */
  rollBonuses(actor, item, which, { lesser }) {
    if (which !== "damage") return [];
    const solo = talentOf(actor, T("solo"));
    if (!solo || !item.system?.check?.vs || !mainWeaponTags(actor).includes("instrument")) return [];
    const data = motorData(actor, MENESTREL_ID);
    const max = motorMax(actor, MENESTREL_ID);
    return (SONGS.includes(data.state) && (max > 0) && (toInt(data.value) >= max))
      ? [{ dice: 0, mod: crOf(actor), label: solo.name }] : [];
  },

  /** The Sustained Note leaves the target [Dazed]; the Dissonance, [Confused]. */
  onHit(actor, item) {
    const id = identifierOf(item);
    if (id === T("nota-sustentada")) return [{ statusId: "dazed", value: null, name: item.name }];
    if (id === T("dissonancia")) return [{ statusId: "confused", value: null, name: item.name }];
    return [];
  },

  /** The class tab and the HUD: the Movement, and the song at its peak. */
  display(actor, { data, max }) {
    if (!SONGS.includes(data.state)) return {};
    const level = toInt(data.value);
    return {
      note: L("Motor.Menestrel.Note", { song: songName(data.state), level: roman(level) }),
      ready: (max > 0) && (level >= max),
      readyLabel: L("Motor.Menestrel.ReadyLabel")
    };
  },

  /* ------------------------------------------ */
  /*  Events                                    */
  /* ------------------------------------------ */

  /** Every combat starts in silence (with the Apex, the first song will start at II). */
  async onCombatStart(actor, { lesser }) {
    await setMotor(actor, MENESTREL_ID, { ...DEFAULTS, apexStart: !lesser && hasApex(actor, MENESTREL_ID) });
    await sing(actor, [], { clear: "all" });
  },

  async onCombatEnd(actor) {
    await setMotor(actor, MENESTREL_ID, { ...DEFAULTS });
  },

  /**
   * Setup Process: still singing, the song rises one Movement (Crescendo: two, when no ally lost HP in the last
   * round; Endless Repertoire: two, the round after a change). [Silenced]: the song stops. Then the song is written
   * again, with the Setup extras.
   */
  async onSetup(actor, { lesser }, combat, round) {
    const data = motorData(actor, MENESTREL_ID);
    if (!SONGS.includes(data.state)) return sing(actor, [], { clear: "all" });
    if (actor.statuses.has("silenced")) {
      await setMotor(actor, MENESTREL_ID, { ...data, state: "silencio", value: 0 });
      await ChatMessage.create({
        speaker: ChatMessage.getSpeaker({ actor }),
        content: `<div class="eternia chat-card"><p>${L("Motor.Menestrel.Silenced", { name: actor.name })}</p></div>`
      });
      return sing(actor, [], { clear: "all" });
    }
    const last = `${combat.id}.${round - 1}`;
    let gain = 1;
    if (!lesser && talentOf(actor, T("crescendo")) && (data.hurt !== last)) gain = 2;
    if ((path(actor, lesser) === "trovador") && talentOf(actor, T("sem-fim")) && (data.switched === last)) gain = 2;
    await setMotor(actor, MENESTREL_ID, { ...data, value: toInt(data.value) + gain });
    return refresh(actor, { setup: true, lesser });
  },

  /** A song started (its aura now), the Finale (its burst), and any other change of the Movements (the aura again). */
  async onUse(actor, { lesser }, item, plan) {
    if (!plan) return;
    const song = songOf(item);
    if (song) {
      // Medley (Troubadour): the song before keeps sounding until the next Setup Process.
      const medley = (path(actor, lesser) === "trovador") && talentOf(actor, T("medley"));
      return refresh(actor, { lesser, clear: medley ? "none" : "auras" });
    }
    if (identifierOf(item) === T("finale")) {
      const level = toInt(plan.vars?.level);
      await sing(actor, songEffects(actor, plan.vars?.song, level, { lesser, burst: true }),
        { clear: "auras", song: plan.vars?.song, level });
      // The Conductor keeps singing, at Movement I.
      if (SONGS.includes(motorData(actor, MENESTREL_ID).state)) await refresh(actor, { lesser, clear: "auras" });
      return;
    }
    if (toInt(plan.spent) || toInt(plan.gain)) await refresh(actor, { lesser });
  },

  /** Crescendo: an ally lost HP this round. */
  async onAnyDamaged(actor, { lesser }, victim, amount) {
    if (!(amount > 0) || !talentOf(actor, T("crescendo"))) return;
    if ((victim?.uuid !== actor.uuid) && !areAllies(actor, victim)) return;
    const data = motorData(actor, MENESTREL_ID);
    const now = roundKey(actor);
    if (now && (data.hurt !== now)) await setMotor(actor, MENESTREL_ID, { ...data, hurt: now });
  },

  /** Applause: an ally's Critical (once per round) gives +1 Movement. */
  async onAnyCheck(actor, { lesser }, roller, roll) {
    if (!talentOf(actor, T("aplausos")) || !areAllies(actor, roller) || !critical(roll)) return;
    const data = motorData(actor, MENESTREL_ID);
    const now = roundKey(actor);
    if (!SONGS.includes(data.state) || !now || (data.applause === now)) return;
    await setMotor(actor, MENESTREL_ID, { ...data, value: toInt(data.value) + 1, applause: now });
    await refresh(actor, { lesser });
  },

  /** Encore: an enemy brought to 0 HP gives +1 Movement. */
  async onAnyKill(actor, { lesser }, victim) {
    if (!talentOf(actor, T("bis")) || !areEnemies(actor, victim)) return;
    const data = motorData(actor, MENESTREL_ID);
    if (!SONGS.includes(data.state)) return;
    await setMotor(actor, MENESTREL_ID, { ...data, value: toInt(data.value) + 1 });
    await refresh(actor, { lesser });
  },

  /** Cutting Chord: a hit gives +1 Movement (once per round). */
  async onHitTarget(actor, { lesser }, target, item) {
    if (identifierOf(item) !== T("acorde")) return;
    const data = motorData(actor, MENESTREL_ID);
    const now = roundKey(actor);
    if (!SONGS.includes(data.state) || !now || (data.chord === now)) return;
    await setMotor(actor, MENESTREL_ID, { ...data, value: toInt(data.value) + 1, chord: now });
    await refresh(actor, { lesser });
  }
};
