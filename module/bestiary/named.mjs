/**
 * Naming a beast (the monster sheet's crown, GM): a dialog with the name, whether it comes alone or with its pack and
 * the Mark of the Weight, then a new world actor made by the template (bestiary/named-template.mjs), next to the
 * monster it came from, with its sheet open.
 */
import { L } from "../settings.mjs";
import { escape, postSummary } from "../helpers/utils.mjs";
import { ITEMS_PACK } from "../professions/data.mjs";
import { MARKS, nameBeast } from "./named-template.mjs";

const { DialogV2 } = foundry.applications.api;

const T = (key, data) => L(`Named.${key}`, data);

/** The item data of the Anima-mundi of a level, from the item compendium (or null). */
async function catalystData(level) {
  const pack = game.packs.get(ITEMS_PACK);
  const entry = (await pack?.getIndex())?.find(e => e.name === `Anima-mundi ${level}`);
  const doc = entry ? await pack.getDocument(entry._id) : null;
  if (!doc) return null;
  const data = game.items.fromCompendium(doc);
  foundry.utils.setProperty(data, "_stats.compendiumSource", doc.uuid);
  return data;
}

/**
 * Ask for the named beast of a monster and make it (GM).
 * @param {Actor} actor
 * @returns {Promise<Actor|null>}
 */
export async function nameMonster(actor) {
  if (!game.user.isGM || (actor?.type !== "monster")) return null;
  const options = MARKS.map(m => `<option value="${m}">${escape(T(`${m}.name`))}: ${escape(T(`${m}.hint`))}</option>`).join("");
  const data = await DialogV2.input({
    window: { title: T("Title", { name: actor.name }), icon: "fa-solid fa-crown" },
    classes: ["eternia", "lhd-box"],
    position: { width: 460 },
    content: `<p>${escape(T("Lead"))}</p>
      <div class="form-group"><label>${escape(T("Name"))}</label><input type="text" name="name" value="" placeholder="${escape(T("NamePlaceholder", { name: actor.name }))}" autofocus></div>
      <div class="form-group"><label>${escape(T("Comes"))}</label><select name="solo"><option value="">${escape(T("WithPack"))}</option><option value="1">${escape(T("Alone"))}</option></select></div>
      <div class="form-group"><label>${escape(T("Mark"))}</label><select name="mark">${options}</select></div>`,
    ok: { label: T("Confirm"), icon: "fa-solid fa-crown" }
  });
  const name = String(data?.name ?? "").trim();
  if (!data || !name) return null;
  // From the monster itself, not a token's copy of it (its "(2)" in the name, its wounds and statuses)
  const source = actor.isToken ? (game.actors.get(actor.id) ?? actor) : actor;
  // The beast's Level + 1 (its Level is the monster's + 2), looked up before the template, which has no Foundry.
  const level = Math.min((Math.trunc(Number(source._source.system.rank)) || 1) + 3, 10);
  const anima = await catalystData(level);
  const made = nameBeast(source.toObject(), {
    name, solo: !!data.solo, mark: MARKS.includes(data.mark) ? data.mark : MARKS[0],
    newId: () => foundry.utils.randomID(), catalyst: lv => ((lv === level) ? anima : null), t: T
  });
  made.folder = source.inCompendium ? null : (source.folder?.id ?? null);
  const created = await Actor.implementation.create(made, { keepEmbeddedIds: true });
  if (!created) return null;
  await postSummary(T("Eyebrow"), [], [T("Done", { name: created.name, from: source.name, rank: created.system.rank })]);
  created.sheet.render(true);
  return created;
}
