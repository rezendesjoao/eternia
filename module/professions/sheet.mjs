/**
 * The profession tab of the character sheet (templates/character/profession.hbs): the crest with the Rank, the EXP
 * and the attempts of the scenario, the buttons of the bench, the Workshop's chances, the materials, the talent, the
 * works the character carries and the Rank ladder (and the skill of the Sealer). Without a profession: the ten to
 * choose from.
 */
import { L } from "../settings.mjs";
import { escape, toInt } from "../helpers/utils.mjs";
import { CORE_PACK, optionDataFrom } from "../helpers/character-options.mjs";
import {
  ENHANCEMENT_INDEX, GRADE_QUALITY, MAX_MATERIAL, MAX_RANK, PROFESSIONS, PROFESSION_IDS, QUALITY_COLORS, RANK_EXP,
  TALENTS, TRAIN_SPEED, attemptsOf, batchOf, craftChances, gatherOutcome, levelCapOf
} from "./data.mjs";
import { craftOf, enhancementText } from "./forge.mjs";
import { freshRanks, materialsOf, professionOf, rankTitle, refundAttempt, setExp } from "./state.mjs";
import { EXP, gatherCap, pendingOf } from "./actions.mjs";
import { PROFESSION_SKILL } from "./skills.mjs";
import { ProfessionBench, modesOf } from "./bench.mjs";

const MODE_ICONS = {
  craft: "fa-solid fa-hammer", fusion: "fa-solid fa-object-group", gather: "fa-solid fa-person-digging",
  retouch: "fa-solid fa-wand-magic-sparkles", sell: "fa-solid fa-coins", sharpen: "fa-solid fa-sword",
  mend: "fa-solid fa-shirt", banquet: "fa-solid fa-bowl-food", copy: "fa-solid fa-scroll", train: "fa-solid fa-horse"
};

/** What a talent says about the character now (the copies of the Batch…). */
function talentNote(p, actor) {
  switch (p.def.talent) {
    case "batch": return L("Profession.Sheet.BatchNow", { n: batchOf(p.rank) });
    case "mend": return L("Profession.Sheet.MendNow", { n: p.rank * 3 });
    case "gather": return L("Profession.Sheet.GatherNow", { n: gatherCap(p, actor) });
    case "retouch": return L("Profession.Sheet.RetouchNow");
    case "train": return L("Profession.Sheet.TrainNow", { n: TRAIN_SPEED });
    case "seal": return L("Profession.Sheet.SealNow", { n: p.rank });
    default: return "";
  }
}

/**
 * The data of the profession tab.
 * @param {Actor} actor
 * @param {{editable: boolean}} options
 */
export function professionContext(actor, { editable }) {
  const p = professionOf(actor);
  if (!p) {
    return {
      none: true, editable,
      choices: PROFESSION_IDS.map(id => {
        const def = PROFESSIONS[id];
        return {
          id, img: def.img, color: def.color, icon: TALENTS[def.talent].icon, name: L(`Profession.Name.${id}`),
          crafts: L(`Profession.Crafts.${id}`), talent: L(`Profession.Talent.${def.talent}.name`)
        };
      })
    };
  }

  const crafter = p.def.kinds.length > 0;
  const from = RANK_EXP[p.rank - 1];
  const pct = p.next ? Math.clamp(((p.exp - from) / (p.next - from)) * 100, 0, 100) : 100;
  const { levels, shards } = materialsOf(actor);
  const pending = pendingOf(actor);
  const talent = TALENTS[p.def.talent];
  const modes = modesOf(p);

  let chances = null;
  if (crafter) {
    chances = craftChances(p.rank).map(c => ({
      id: c.id, label: L(`Profession.Quality.${c.id}`), color: QUALITY_COLORS[c.id], pct: Math.round(c.pct), width: c.pct.toFixed(2)
    }));
  }
  else if (p.id === "gatherer") {
    const counts = { none: 0, one: 0, two: 0 };
    let shard = 0;
    for (let a = 1; a <= 6; a++) for (let b = 1; b <= 6; b++) {
      const o = gatherOutcome([a, b], p.rank);
      counts[o.id]++;
      if (o.shard) shard++;
    }
    const color = { none: QUALITY_COLORS.fail, one: QUALITY_COLORS.uncommon, two: QUALITY_COLORS.rare };
    chances = Object.entries(counts).map(([id, n]) => ({
      id, label: L(`Profession.Gather.Chance.${id}`), color: color[id], pct: Math.round((n / 36) * 100), width: ((n / 36) * 100).toFixed(2)
    }));
    chances.push({ id: "shard", label: L("Profession.Gather.Chance.shard"), color: QUALITY_COLORS.legendary, pct: Math.round((shard / 36) * 100), width: 0, extra: true });
  }

  // Equal copies (a Batch, a Double) show once, with their count.
  const copies = new Map();
  for (const item of actor.items) {
    if (!craftOf(item)) continue;
    const key = `${item.name}|${craftOf(item).grade}|${!!item.system.equipped}`;
    if (!copies.has(key)) copies.set(key, []);
    copies.get(key).push(item);
  }
  const works = [...copies.values()].map(([item, ...more]) => {
    const craft = craftOf(item);
    const quality = GRADE_QUALITY[craft.grade];
    return {
      id: item.id, uuid: item.uuid, name: item.name, img: item.img, equipped: !!item.system.equipped, count: more.length + 1,
      quality: L(`Profession.Quality.${quality}`), color: QUALITY_COLORS[quality], grade: craft.grade,
      gems: Array.from({ length: craft.grade }),
      enhancements: craft.enhancements.map(e => {
        const def = ENHANCEMENT_INDEX.get(e.id);
        return def ? { icon: def.icon, ...enhancementText(def, craft.base, e), legendary: !!def.legendary, cut: !!e.cut } : null;
      }).filter(Boolean)
    };
  }).sort((a, b) => (b.grade - a.grade) || a.name.localeCompare(b.name, game.i18n.lang));

  const statBox = (icon, value, label) => ({ icon, value, label });
  const stats = [statBox("fa-solid fa-dice", `+${p.rank}`, L("Profession.Sheet.RollBonus"))];
  if (crafter) stats.push(statBox("fa-solid fa-layer-group", p.cap, L("Profession.Sheet.Cap")));
  if (p.id === "gatherer") stats.push(statBox("fa-solid fa-cube", gatherCap(p, actor), L("Profession.Sheet.GatherCap")));
  if (p.id === "merchant") stats.push(statBox("fa-solid fa-coins", "100%", L("Profession.Sheet.FullPrice")));
  stats.push(statBox("fa-solid fa-hammer", p.attempts.max, L("Profession.Sheet.AttemptsStat")));

  return {
    editable, isGM: game.user.isGM, id: p.id, name: p.name, img: p.def.img, color: p.def.color,
    rank: p.rank, rankTitle: rankTitle(p.rank), crafts: L(`Profession.Crafts.${p.id}`),
    celebrate: freshRanks.delete(actor.id),
    gems: Array.from({ length: MAX_RANK }, (_, i) => ({ on: i < p.rank })),
    exp: {
      value: p.exp, next: p.next, pct: pct.toFixed(1),
      label: p.next ? L("Profession.Sheet.ExpNext", { n: p.next - p.exp, rank: p.rank + 1 }) : L("Profession.Sheet.ExpMax")
    },
    attempts: { ...p.attempts, pips: Array.from({ length: p.attempts.max }, (_, i) => ({ used: i >= p.attempts.left })) },
    stats,
    actions: modes.map((mode, i) => ({ mode, icon: MODE_ICONS[mode], label: L(`Profession.Mode.${mode}`), hint: L(`Profession.ModeHint.${mode}`), primary: i === 0 })),
    pending: pending ? {
      name: pending.base.name, color: QUALITY_COLORS[pending.quality], slots: pending.slots,
      quality: `${L(`Profession.Quality.${pending.quality}`)} [M${pending.grade}]`
    } : null,
    chances, chancesTitle: L(crafter ? "Profession.Sheet.Chances" : "Profession.Sheet.GatherChances", { n: p.rank }),
    materials: Array.from({ length: MAX_MATERIAL }, (_, i) => ({ level: i + 1, count: levels.get(i + 1)?.length ?? 0 })),
    shards: shards.length,
    talent: {
      name: L(`Profession.Talent.${p.def.talent}.name`), text: L(`Profession.Talent.${p.def.talent}.text`),
      icon: talent.icon, passive: !talent.action, note: talentNote(p, actor),
      cost: talent.attempt ? L("Profession.Sheet.CostsAttempt") : ""
    },
    // The skills the profession gives (the Sealer's Seal), used from here or from the HUD
    skills: actor.items.filter(i => (i.type === "skill") && (i.getFlag("eternia", PROFESSION_SKILL) === p.id))
      .map(i => ({ id: i.id, name: i.name, img: i.img, timing: L("Profession.Sheet.SkillLine") })),
    works,
    ladder: Array.from({ length: MAX_RANK }, (_, i) => {
      const r = i + 1;
      return {
        rank: r, title: rankTitle(r), exp: RANK_EXP[i], attempts: attemptsOf(r), cap: crafter ? levelCapOf(r) : null,
        reached: r <= p.rank, current: r === p.rank
      };
    }),
    expHint: L("Profession.Sheet.ExpHint", { retouch: EXP.retouch })
  };
}

/** Choose a profession: its Subclass from the system compendium (it replaces the previous one). */
async function chooseProfession(actor, id) {
  const pack = game.packs.get(CORE_PACK);
  const index = await pack?.getIndex({ fields: ["system.identifier"] });
  const entry = index?.find(e => (e.type === "subclass") && (e.system?.identifier === id));
  const doc = entry ? await pack.getDocument(entry._id) : null;
  if (!doc) return ui.notifications.warn(L("Profession.Error.Missing"));
  return actor.createEmbeddedDocuments("Item", [optionDataFrom(doc)]);
}

/** Set the EXP by hand. */
async function editExp(actor) {
  const p = professionOf(actor);
  if (!p) return;
  const value = await foundry.applications.api.DialogV2.prompt({
    window: { title: L("Profession.Sheet.SetExp"), icon: "fa-solid fa-star" },
    classes: ["lhauto-dialog"],
    content: `<div class="form-group"><label>${escape(L("Profession.Sheet.Exp", { name: p.name }))}</label>
      <input type="number" name="exp" min="0" step="1" value="${p.exp}" autofocus></div>`,
    ok: { label: L("Profession.Sheet.Save"), callback: (event, button) => Math.max(0, toInt(button.form.elements.exp.value)) },
    rejectClose: false
  });
  if ((value !== null) && (value !== undefined) && (value !== p.exp)) await setExp(actor, value);
}

/**
 * A click on the profession tab (data-action="lhp", data-op).
 * @param {foundry.applications.sheets.ActorSheetV2} sheet
 * @param {HTMLElement} target
 */
export async function professionAction(sheet, target) {
  const actor = sheet.actor;
  const op = target.dataset.op;
  if (op === "work") {
    const item = actor.items.get(target.closest("[data-item-id]")?.dataset.itemId);
    return item?.sheet.render(true);
  }
  if (!sheet.isEditable) return;
  switch (op) {
    case "choose": return chooseProfession(actor, target.dataset.id);
    case "bench": return ProfessionBench.open(actor, target.dataset.mode);
    case "pending": return ProfessionBench.open(actor, "craft");
    case "exp": return editExp(actor);
    case "refund": return game.user.isGM ? refundAttempt(actor) : null;
    case "skill": return actor.items.get(target.closest("[data-item-id]")?.dataset.itemId)?.ItemThrow();
  }
  return null;
}

