/**
 * The Kuden tab of the system's skill sheet: which piece the skill is, its Restriction, where it comes from in
 * the source material and what it is priced by; on a Core, the Resource. The fields are named like the flags,
 * so the sheet saves them by itself (it submits on change). The [Kuden] tag follows the piece.
 */
import { L, SYSTEM_ID, setting } from "../settings.mjs";
import { escape, toInt } from "../helpers/utils.mjs";
import { HOURS } from "./env.mjs";
import { costOf, DEFAULT_CURVE, FLAG, KUDEN_TAG, kudenOf, paidOf, PIECES, RESOURCE_MAX, TIERS } from "./pieces.mjs";

const NAME = `flags.${SYSTEM_ID}.${FLAG}`;

const options = (values, selected, label) => values.map(v =>
  `<option value="${escape(v)}"${(v === selected) ? " selected" : ""}>${escape(label(v))}</option>`).join("");

const group = (label, field, hint = "") => `<div class="form-group">
    <label>${escape(L(label))}</label>
    <div class="form-fields">${field}</div>
    ${hint ? `<p class="hint">${escape(hint)}</p>` : ""}
  </div>`;

/** The fields of the tab. */
function tabHTML(item, editable) {
  const data = item.flags?.[SYSTEM_ID]?.[FLAG] ?? {};
  const kuden = kudenOf(item);
  const piece = kuden?.piece ?? "";
  const off = editable ? "" : " disabled";
  const text = (key, value) => `<input type="text" name="${NAME}.${key}" value="${escape(value ?? "")}"${off}>`;

  let html = group("Kuden.Field.Piece",
    `<select name="${NAME}.piece"${off}>${options(["", ...PIECES], piece, v => (v ? L(`Kuden.Piece.${v}`) : L("Kuden.PieceNone")))}</select>`,
    piece ? L(`Kuden.PieceHint.${piece}`) : L("Kuden.PieceNoneHint"));
  if (!piece) return html;

  html += `<p class="lhk-cost">${escape(L("Kuden.Field.CostLine", { cost: costOf(item), paid: paidOf(item) }))}</p>`;
  html += group("Kuden.Field.Restriction",
    `<select name="${NAME}.restriction"${off}>${options(["", ...TIERS], data.restriction ?? "", v => (v ? `${L(`Kuden.Tier.${v}`)} (${L(`Kuden.TierHint.${v}`)})` : L("Kuden.Tier.none")))}</select>`);
  html += group("Kuden.Field.RestrictionText", text("restrictionText", data.restrictionText));
  html += group("Kuden.Field.Origin", text("origin", data.origin));
  html += group("Kuden.Field.Ruler", text("ruler", data.ruler));

  if (piece === "core") {
    const r = data.resource ?? {};
    const max = Math.clamp(toInt(r.max) || RESOURCE_MAX, 1, RESOURCE_MAX);
    const curve = HOURS.map(h => `<label class="lhk-hour"><span>${escape(L(`Kuden.Hour.${h}`))}</span>
        <input type="number" min="0" max="${max}" step="1" name="${NAME}.resource.curve.${h}" value="${toInt(r.curve?.[h] ?? DEFAULT_CURVE[h])}"${off}></label>`).join("");
    const check = (key, label) => `<label class="checkbox"><input type="checkbox" name="${NAME}.resource.${key}"${r[key] ? " checked" : ""}${off}> ${escape(L(label))}</label>`;
    html += `<fieldset class="lhk-resource">
      <legend>${escape(L("Kuden.Resource.Title"))}</legend>
      <p class="hint">${escape(L("Kuden.Resource.Hint"))}</p>
      ${group("Kuden.Resource.Name", `<input type="text" name="${NAME}.resource.name" value="${escape(r.name ?? "")}" placeholder="${escape(L("Kuden.Resource.NamePlaceholder"))}"${off}>`)}
      ${group("Kuden.Resource.Max", `<input type="number" min="1" max="${RESOURCE_MAX}" step="1" name="${NAME}.resource.max" value="${max}"${off}>`)}
      ${group("Kuden.Resource.Source", `<select name="${NAME}.resource.source"${off}>${options(["manual", "hour"], (r.source === "hour") ? "hour" : "manual", v => L(`Kuden.Source.${v}`))}</select>`)}
      ${(r.source === "hour")
        ? `<div class="lhk-curve">${curve}</div>${check("dark", "Kuden.Resource.Dark")}`
        : check("resetOnScene", "Kuden.Resource.ResetOnScene")}
    </fieldset>`;
  }
  return html;
}

/** Add the tab to a skill sheet (each render). */
function onRenderSheet(app, element) {
  const item = app.document;
  if (!(item instanceof Item) || (item.type !== "skill") || !setting("kuden")) return;
  const nav = element.querySelector("nav.sheet-tabs[data-group='primary']");
  const body = element.querySelector("section.sheet-body");
  if (!nav || !body || body.querySelector(".lhauto-kuden-tab")) return;
  const active = app.tabGroups?.primary === "kuden";

  const link = document.createElement("a");
  link.className = `item${active ? " active" : ""}`;
  Object.assign(link.dataset, { action: "tab", group: "primary", tab: "kuden" });
  link.innerHTML = `<i class="fa-solid fa-scroll"></i> ${escape(L("Kuden.Title"))}`;
  nav.append(link);

  const tab = document.createElement("div");
  tab.className = `tab lhauto-kuden-tab${active ? " active" : ""}`;
  Object.assign(tab.dataset, { group: "primary", tab: "kuden" });
  tab.innerHTML = tabHTML(item, app.isEditable);
  body.append(tab);
}

/** The [Kuden] tag follows the piece: added when the skill becomes a piece, removed when it stops being one. */
function syncTag(item, changes) {
  const piece = foundry.utils.getProperty(changes, `${NAME}.piece`);
  if (piece === undefined) return;
  const tags = foundry.utils.getProperty(changes, "system.tags") ?? item.system?.tags ?? [];
  const has = tags.includes(KUDEN_TAG);
  if (PIECES.includes(piece) && !has) foundry.utils.setProperty(changes, "system.tags", [...tags, KUDEN_TAG]);
  else if (!PIECES.includes(piece) && has) foundry.utils.setProperty(changes, "system.tags", tags.filter(t => t !== KUDEN_TAG));
}

/** Call during the `init` hook. */
export function registerKudenItemSheet() {
  Hooks.on("renderApplicationV2", onRenderSheet);
  Hooks.on("preUpdateItem", (item, changes) => {
    if (item.type === "skill") syncTag(item, changes);
  });
}
