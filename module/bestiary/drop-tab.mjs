/**
 * The Itens Deixados tab of the monster sheet (templates/monster/drops.hbs): the rows of the table sorted by their
 * faces, each with the faces and the copies to edit in place, the value, and the table's expected value next to the
 * Guide's for the monster's Level; a monster with no rows shows the table of its description, with the button that
 * turns it into rows. Dropping a physical item on the sheet adds a row (on the faces no row has yet).
 */
import { L, SYSTEM_ID } from "../settings.mjs";
import { confirm, toInt } from "../helpers/utils.mjs";
import { tagLabel } from "../i18n/terms.mjs";
import { PHYSICAL_TYPES } from "../piles/pile-config.mjs";
import { EXPECTED_VALUE, cameLate, convertTable, dropRows, dropRule, expectedValue, freeRange, rangeLabel, rollDrops } from "./drops.mjs";
import { GOLD_ICON, parseDropTable, parseRange } from "./drop-table.mjs";

const { DialogV2 } = foundry.applications.api;

/** Rows in the order of the table: by the faces, the fixed ones and the growth after. */
const order = rule => (rule.growth ? 20 : (rule.fixed ? 10 : rule.min + (rule.max / 10)));

/**
 * What the Guide of enemies asks of the monster's table: a common enemy's value for its Level on the 1d6; a mob's,
 * fixed, at a quarter (half, and half again); a boss's ×4 on the 1d6, plus an Anima-mundi of the Level + 1 and a
 * [Material-Base] of the Level, fixed.
 */
function guideText(actor) {
  const rank = Math.clamp(toInt(actor.system.rank) || 1, 1, 10);
  const base = EXPECTED_VALUE[rank - 1];
  const tags = (actor.system.tags ?? []).map(t => String(t).toLowerCase());
  if (tags.includes("boss")) return L("Drops.GuideBoss", { value: base * 4, n: Math.min(rank + 1, 10) });
  if (tags.includes("mob")) return L("Drops.GuideMob", { value: Math.round(base / 4) });
  return L("Drops.GuideCommon", { value: base });
}

/**
 * The tab's data.
 * @param {Actor} actor
 * @returns {Promise<object>}
 */
export async function dropsContext(actor) {
  const rows = await dropRows(actor);
  const kept = rows.some(r => r.item);
  const list = rows.map(({ rule, data, item }) => ({
    id: item?.id ?? null,
    img: data.img,
    name: rule.gold ? L("Drops.GoldRow") : data.name,
    range: rangeLabel(rule),
    rangeEdit: rule.growth ? "" : (rule.fixed ? L("Drops.Fixed") : ((rule.min === rule.max) ? `${rule.min}` : `${rule.min}-${rule.max}`)),
    growth: rule.growth,
    qty: rule.qty,
    gold: rule.gold,
    tags: (data.system?.tags ?? []).map(t => tagLabel(t)),
    value: rule.gold ? rule.gold : `${(toInt(data.system?.price) || 0) * rule.qty} G`,
    sort: order(rule)
  })).sort((a, b) => a.sort - b.sort);
  const dropped = actor.getFlag(SYSTEM_ID, "dropped");
  return {
    rows: list,
    kept,
    fromText: !kept && rows.length > 0,
    expected: expectedValue(rows),
    guide: guideText(actor),
    stolen: toInt(actor.getFlag(SYSTEM_ID, "stolenGold")),
    growth: toInt(actor.getFlag(SYSTEM_ID, "growth")),
    dropped: !!dropped,
    noLoot: cameLate(actor),
    gm: game.user.isGM
  };
}

/* -------------------------------------------- */
/*  Edits                                       */
/* -------------------------------------------- */

/** A physical item dropped on the monster sheet: a new row of the table. Returns the created items (or null to pass). */
export async function addDropRow(actor, data) {
  if (!PHYSICAL_TYPES.includes(data?.type)) return null;
  // The table still written in the description becomes rows first, so the new row joins it
  if (!actor.items.some(i => dropRule(i)) && parseDropTable(actor.system.description)?.length) await convertTable(actor);
  const item = foundry.utils.deepClone(data);
  delete item._id;
  if (item.system && ("equipped" in item.system)) item.system.equipped = false;
  foundry.utils.setProperty(item, `flags.${SYSTEM_ID}.drop`, { ...freeRange(actor), qty: 1 });
  return actor.createEmbeddedDocuments("Item", [item]);
}

/** A row of gold ("2d6×NP"), on the free faces. */
export async function addGoldRow(actor) {
  const rank = Math.max(1, toInt(actor.system.rank));
  return actor.createEmbeddedDocuments("Item", [{
    name: L("Drops.GoldRow"), type: "gear", img: GOLD_ICON,
    system: { price: 0, tags: [], equipped: false },
    flags: { [SYSTEM_ID]: { drop: { ...freeRange(actor), qty: 1, gold: `2d6*${rank}` } } }
  }]);
}

/** A field of a row changed: its faces ("1-3", "Fixo"), its copies or its gold formula. */
export async function editDropRow(actor, itemId, field, value) {
  const item = actor.items.get(itemId);
  const rule = item ? dropRule(item) : null;
  if (!rule) return;
  const flag = { ...item.getFlag(SYSTEM_ID, "drop") };
  if (field === "range") {
    const range = parseRange(value);
    if (!range) return ui.notifications.warn(L("Drops.BadRange"));
    if (range.fixed) { flag.fixed = true; delete flag.min; delete flag.max; }
    else { flag.fixed = false; flag.min = range.min; flag.max = range.max; }
  }
  else if (field === "qty") flag.qty = Math.max(1, toInt(value) || 1);
  else if (field === "gold") flag.gold = String(value ?? "").replace(/×/g, "*").trim();
  await item.update({ [`flags.${SYSTEM_ID}.drop`]: _replace(flag) });
}

/** The sheet's "Roll" (GM): for whom, then the roll, even for a monster already rolled. */
export async function rollFromSheet(actor) {
  if (!game.user.isGM) return;
  const party = game.actors.filter(a => (a.type === "character") && a.hasPlayerOwner).sort((a, b) => a.name.localeCompare(b.name));
  const felled = actor.getFlag(SYSTEM_ID, "felledBy");
  const options = [`<option value="">${L("Drops.ToFloor")}</option>`,
    ...party.map(a => `<option value="${a.uuid}"${(a.uuid === felled) ? " selected" : ""}>${foundry.utils.escapeHTML(a.name)}</option>`)].join("");
  const data = await DialogV2.input({
    window: { title: L("Drops.RollTitle", { name: actor.token?.name ?? actor.name }), icon: "fa-solid fa-sack" },
    classes: ["eternia", "lhd-box"],
    content: `<div class="form-group"><label>${L("Drops.ForWhom")}</label><select name="receiver">${options}</select></div>`,
    ok: { label: L("Drops.Roll"), icon: "fa-solid fa-dice-d6" }
  });
  if (!data) return;
  const receiver = data.receiver ? (fromUuidSync(data.receiver) ?? null) : null;
  return rollDrops(actor, { force: true, receiver });
}

/** The sheet's "Turn into rows" (GM): the description's table becomes the rows. */
export async function convertFromSheet(actor) {
  const table = parseDropTable(actor.system.description);
  if (!table?.length) return;
  const ok = await confirm({
    title: L("Drops.ConvertTitle"), icon: "fa-solid fa-table-list", img: actor.img, heading: actor.name,
    lead: L("Drops.ConvertLead", { n: table.length }), yes: L("Drops.Convert"), no: game.i18n.localize("ETERNIA.Use.Cancel")
  });
  if (ok) await convertTable(actor);
}

/** The tab's fields (they save on change, outside the sheet's form). */
export function activateDropTab(root, actor) {
  for (const input of root.querySelectorAll(".tab[data-tab='drops'] [data-drop-field]")) {
    input.addEventListener("change", event => {
      event.stopPropagation();
      const id = input.closest("[data-item-id]")?.dataset.itemId;
      if (id) editDropRow(actor, id, input.dataset.dropField, input.value);
    });
    input.addEventListener("keydown", event => { if (event.key === "Enter") { event.preventDefault(); input.blur(); } });
  }
}
