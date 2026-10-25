/**
 * The race tab of the character sheet (templates/character/race.hbs): the race band (its picture, the lineage of a
 * Bestial, its line, the numbers with the +1 of the stages) with the seal of the form, and the five stages of the form
 * one under the other: the name of each and what changes in the body, the rite, what the world sees at that stage,
 * and what it gives (the skills as tiles, the class tab's: the character's own copy, which uses and opens, or the
 * compendium one, which opens to read; the +1 of the fourth). The stage the character is at, the next one (Evolve, when it is open;
 * the GM may also go back one) and the ones still closed each look their part. A race without stages (one that left
 * the list) shows its innate skills.
 */
import { L, SYSTEM_ID } from "../settings.mjs";
import { getOption, raceStats } from "../helpers/character-options.mjs";
import { firstSentence, readParts } from "../apps/creation-catalog.mjs";
import { term } from "../i18n/terms.mjs";
import { toInt } from "../helpers/utils.mjs";
import { formOf, raceColor, ROMAN } from "./evolution.mjs";

const STATS = ["str", "dex", "pow", "int"];
const normalize = name => String(name ?? "").trim().toLowerCase();

/**
 * A skill tile (the class tab's): the character's copy of the compendium skill, or the compendium one (locked while
 * its stage is still closed).
 */
function tileOf(actor, uuid, { open, rank }) {
  const entry = fromUuidSync(uuid, { strict: false });
  const owned = actor.items.find(i => (i.type === "skill") && ((i._stats?.compendiumSource === uuid)
    || (!!entry && (normalize(i.name) === normalize(entry.name))))) ?? null;
  if (!owned && !entry) return null;
  return {
    uuid,
    id: owned?.id ?? null,
    name: owned?.name ?? entry.name,
    img: owned?.img ?? entry.img,
    owned: !!owned,
    timing: term("timing", owned?.system.timing ?? entry?.system?.timing ?? ""),
    minRank: rank,
    locked: !owned && !open
  };
}

/** The tiles of a stage's slots: a choice already made shows the skill chosen, one still open shows every option. */
function slotTiles(actor, slots, opts) {
  return slots.flatMap(slot => {
    const tiles = slot.map(uuid => tileOf(actor, uuid, opts)).filter(Boolean);
    const chosen = tiles.filter(t => t.owned);
    return ((slot.length > 1) && chosen.length) ? chosen : tiles.map(t => ({ ...t, option: slot.length > 1 }));
  });
}

/** "+1 em DES ou POD" (or the attribute chosen, once the stage was reached). */
function attributeLine(stage, chosen) {
  if (!stage.attribute?.length) return "";
  if (chosen) return L("RaceTab.AttributeChosen", { stat: L(`Sheet.Attr.${chosen}.abbr`) });
  if (stage.attribute.length === 4) return L("RaceTab.AttributeAny");
  return L("RaceTab.Attribute", { stats: stage.attribute.map(k => L(`Sheet.Attr.${k}.abbr`)).join(` ${L("Wizard.Race.Or")} `) });
}

/**
 * The data of the race tab.
 * @param {Actor} actor
 * @param {object} options
 * @param {boolean} options.editable
 */
export function raceContext(actor, { editable }) {
  const race = getOption(actor, "race");
  if (!race) return { none: true, editable };
  const form = formOf(actor);
  const flags = race.flags?.[SYSTEM_ID] ?? {};
  const cr = Math.max(1, toInt(actor.system.infos?.crank) || 1);
  const human = race.system.identifier === "human";
  const stats = raceStats(actor) ?? {};
  const bonus = flags.stageBonus ?? {};
  const { lore } = readParts(race.system.description);
  const log = Array.isArray(flags.stageLog) ? flags.stageLog : [];
  const innate = (race.system.grants ?? []).map(g => (g?.uuids ?? []).map(String)).filter(slot => slot.length);
  const gm = game.user.isGM;

  const stages = form.stages.map(st => {
    const state = (st.stage < form.stage) ? "done" : (st.stage === form.stage) ? "current"
      : (st.stage === form.stage + 1) ? (form.ready ? "ready" : "next") : "locked";
    const chosen = log.findLast?.(e => toInt(e.stage) === st.stage)?.attribute ?? null;
    const open = ["done", "current", "ready"].includes(state);
    return {
      stage: st.stage,
      roman: ROMAN[st.stage],
      name: st.name,
      look: st.look,
      rank: st.rank,
      state,
      // A closed stage whose CR already came opens after the one before it
      stateLabel: ((state === "locked") && (st.rank <= cr)) ? L("RaceTab.State.after", { stage: ROMAN[st.stage - 1] })
        : L(`RaceTab.State.${state}`, { rank: st.rank }),
      skills: slotTiles(actor, (st.stage === 1) ? innate : st.grants, { open, rank: st.rank }),
      attribute: attributeLine(st, (state === "done" || state === "current") ? chosen : null),
      rite: st.rite,
      seen: L(`RaceTab.${human ? "SeenHuman" : "Seen"}.${st.stage}`),
      // Evolve on the next stage (open, or brought forward by the GM); going back on the current one (the GM)
      evolve: editable && ((state === "ready") || (gm && (state === "next"))),
      evolveTip: (state === "next") ? L("Evolve.GmEarly", { rank: st.rank }) : "",
      back: editable && gm && (state === "current") && (st.stage > 1)
    };
  });

  return {
    none: false,
    editable,
    id: race.id,
    name: race.name,
    img: race.img,
    color: raceColor(race),
    eyebrow: flags.lineage ? L("RaceTab.EyebrowLineage", { group: L(`Wizard.Race.Group.${flags.raceGroup}.Name`), lineage: flags.lineage })
      : L("RaceTab.Eyebrow"),
    tagline: firstSentence(lore),
    lore,
    base: [
      ...STATS.map(k => ({ value: `+${toInt(stats[k])}`, label: L(`Sheet.Attr.${k}.abbr`), raised: toInt(bonus[k]) > 0 })),
      { value: `+${toInt(stats.hp)}`, label: L("Sheet.HPShort"), hp: true },
      { value: `+${toInt(stats.fate)}`, label: game.i18n.localize("ETERNIA.Label.Fate"), fate: true }
    ],
    form: form.stage ? {
      roman: ROMAN[form.stage],
      name: form.current?.name ?? "",
      of: L("RaceTab.StageOf", { stage: ROMAN[form.stage] }),
      ready: form.ready && editable
    } : null,
    stages,
    // A race without stages (one that left the list, or one of the table's own): its innate skills
    retired: !form.stages.length,
    retiredNote: L(flags.retired ? "RaceTab.Retired" : "RaceTab.NoStages"),
    innate: form.stages.length ? [] : slotTiles(actor, innate, { open: true, rank: 1 })
  };
}

/** The tab's badge: the next stage can be awakened. */
export function raceBadge(context) {
  return (!context.none && context.form?.ready) ? 1 : 0;
}
