/**
 * Starting skills of a Race / Class / Subclass (`system.grants`): when a character takes one, a dialog
 * offers to add them. Each grant is a slot with one skill (fixed) or several (the player picks one).
 * The skills added this way remember the option that gave them, so changing class can remove them.
 *
 * A slot may also say the Character Rank it comes at (`rank`, docs/classes.md): a class's Path at CR 3 (a choice)
 * and its Apex at CR 10 (`auto`: given without asking). Those slots are offered when the character reaches that
 * CR (the rank up, or the CR changed by hand) and again at the next changes while the choice is still open.
 * A slot with `magic: true` is a choice among every Magia of the compendiums (skills with flags.eternia.magic) the
 * character doesn't have yet; the n-th one is open while the character has fewer than n Magias. It is offered in a
 * window of its own (apps/magic-picker.mjs), after the dialog of the other slots. A player's first slot of CR 1 is
 * drawn (the Awakening, apps/awakening.mjs): the picker shows the rolls, or the Magia it awakened with comes back.
 */
import { MagicPicker } from "./magic-picker.mjs";
import { awakeningOf, drawsAwakening, lockAwakening } from "./awakening.mjs";
import { exclusiveMagia } from "./magic-holders.mjs";

const { DialogV2 } = foundry.applications.api;

/** Flag of the skills added from an option: { type, source } */
export const GRANT_FLAG = "grantedBy";

/** What identifies an option item across copies: the compendium entry it came from, or its name. */
function sourceOf(item) {
  return item._stats?.compendiumSource ?? item.name;
}

function normalize(name) {
  return String(name ?? "").trim().toLowerCase();
}

/** The Magias an actor has. */
export const magicsOf = actor => actor.items.filter(i => (i.type === "skill") && i.getFlag("eternia", "magic")?.id);

/** The actor already has this skill (same compendium entry or same name). */
function owns(actor, skill) {
  return actor.items.some(i => (i.type === "skill")
    && ((i._stats?.compendiumSource === skill.uuid) || (normalize(i.name) === normalize(skill.name))));
}

/**
 * Offer the starting skills of an option item the character just took, and the removal of the skills
 * granted by the previous option of the same type.
 * @param {Actor} actor
 * @param {Item} item  The new Race / Class / Subclass
 * @param {object} [options]
 * @param {number} [options.above]       Only the slots of a CR above this one (1 at a rank up: not the starting kit)
 * @param {boolean} [options.withStale]  Offer to remove the skills of the previous option of the same type
 * @param {boolean} [options.onlyChoices]  Only the slots with several skills (the Dragon Slayer's element)
 */
export async function offerGrants(actor, item, { above = 0, withStale = true, onlyChoices = false } = {}) {
  const source = sourceOf(item);
  const cr = Number(actor.system.infos?.crank) || 1;
  const stale = withStale ? actor.items.filter(i => {
    const flag = i.getFlag("eternia", GRANT_FLAG);
    return (flag?.type === item.type) && (flag.source !== source);
  }) : [];

  const slots = [];
  const auto = [];
  // The open Magia slots (their CR), each offered in the Magia picker after the dialog
  const magic = [];
  const owned = magicsOf(actor).length;
  // An Absoluta takes every Magia slot (apps/magic-holders.mjs): no other Magia is offered
  const exclusive = exclusiveMagia(actor);
  let magicSlot = 0;
  for (const [index, grant] of (item.system.grants ?? []).entries()) {
    // The n-th Magia slot is open while the character has fewer than n Magias.
    if (grant.magic) magicSlot += 1;
    // The slots of a CR the character hasn't reached (or, at a rank up, the starting ones) wait.
    const rank = Number(grant.rank) || 1;
    if ((rank > cr) || (rank <= above)) continue;
    if (onlyChoices && !grant.magic && ((grant.uuids ?? []).length < 2)) continue;
    if (grant.magic) {
      if ((owned < magicSlot) && !exclusive) magic.push({ rank, first: (magicSlot === 1) && (rank === 1) });
      continue;
    }
    const uuids = grant.uuids ?? [];
    const skills = (await Promise.all(uuids.map(uuid => fromUuid(uuid).catch(() => null)))).filter(Boolean);
    if (!skills.length) continue;
    const options = skills.map(s => ({ uuid: s.uuid, name: s.name, img: s.img, owned: owns(actor, s) }));
    const choice = options.length > 1;
    // Given without asking (a class's Apex).
    if (grant.auto && !choice) {
      if (!options[0].owned) auto.push(options[0].uuid);
      continue;
    }
    // A choice already satisfied (the character has one of its skills) starts on that skill.
    const preset = options.find(o => o.owned) ?? options[0];
    options.forEach(o => o.checked = choice ? (o === preset) : !o.owned);
    slots.push({ index, choice, options, rank, done: choice ? preset.owned : options[0].owned });
  }
  if (auto.length) await createGranted(actor, item, auto);
  // The other slots first; "Not now" there leaves the Magia for later too.
  if ((slots.some(s => !s.done) || stale.length) && !(await offerSlots(actor, item, slots, stale, magic.length > 0))) return;
  for (const { rank, first } of magic) {
    const uuid = (first && drawsAwakening()) ? await awakenedMagia(actor, item) : await MagicPicker.choose(actor, { source: item, rank });
    if (!uuid) return;
    await createGranted(actor, item, [uuid]);
    // The first Magia closes the Awakening (the GM's choice too): the player can't change it
    if (first) await lockAwakening(actor, uuid);
  }
}

/**
 * A player's first Magia: the one it awakened with comes back; else the Magia picker with the rolls of the Awakening.
 * @param {Actor} actor
 * @param {Item} item  The class
 * @returns {Promise<string|null>}
 */
async function awakenedMagia(actor, item) {
  const { chosen } = awakeningOf(actor);
  if (chosen) {
    ui.notifications.info(game.i18n.format("ETERNIA.Awakening.Back", { name: fromUuidSync(chosen)?.name ?? "" }));
    return chosen;
  }
  return MagicPicker.choose(actor, { source: item, rank: 1, awakening: true });
}

/**
 * The dialog of an option's slots, and of the removal of the skills of the previous option of the same type.
 * @param {Actor} actor
 * @param {Item} item
 * @param {object[]} slots
 * @param {Item[]} stale
 * @param {boolean} magicNext  A Magia comes after (the dialog says so)
 * @returns {Promise<boolean>}  Whether the player accepted it
 */
async function offerSlots(actor, item, slots, stale, magicNext) {
  // Only slots of a later CR: say which CR they come with (a class Path).
  const later = slots.filter(s => !s.done && (s.rank > 1));

  const typeLabel = game.i18n.localize(`TYPES.Item.${item.type}`);
  const hint = (later.length && (later.length === slots.filter(s => !s.done).length))
    ? game.i18n.format("ETERNIA.CharacterOptions.Grants.HintRank", { name: item.name, rank: Math.max(...later.map(s => s.rank)) })
    : "";
  const content = await foundry.applications.handlebars.renderTemplate(
    "systems/eternia/templates/apps/option-grants.hbs",
    { item, slots, stale, typeLabel, hint, magicNext }
  );
  const title = hint
    ? game.i18n.format("ETERNIA.CharacterOptions.Grants.TitleRank", { name: item.name, rank: Math.max(...later.map(s => s.rank)) })
    : game.i18n.format("ETERNIA.CharacterOptions.Grants.Title", { name: item.name });
  const data = await DialogV2.wait({
    window: { title, icon: "fa-solid fa-book-atlas" },
    classes: ["eternia", "option-grants"],
    position: { width: 420 },
    content,
    buttons: [
      {
        action: "add",
        label: "ETERNIA.CharacterOptions.Grants.Add",
        icon: "fa-solid fa-check",
        default: true,
        callback: (event, button) => new foundry.applications.ux.FormDataExtended(button.form).object
      },
      { action: "skip", label: "ETERNIA.CharacterOptions.Grants.Skip", icon: "fa-solid fa-xmark" }
    ],
    rejectClose: false
  });
  if (!data || (typeof data !== "object")) return false;

  // Remove the skills of the previous option
  if (data.removeStale && stale.length) await actor.deleteEmbeddedDocuments("Item", stale.map(i => i.id));

  // Add the chosen skills
  // (a fixed slot is a checkbox: the form gives true/false; a choice is a radio: the form gives its uuid)
  const uuids = slots.map(slot => {
    const value = data[`slot${slot.index}`];
    if (value === true) return slot.options[0].uuid;
    return (typeof value === "string") ? value : null;
  }).filter(Boolean);
  await createGranted(actor, item, uuids);
  return true;
}

/**
 * Add the skills of these compendium uuids the actor doesn't have yet, marked as given by the option.
 * @param {Actor} actor
 * @param {Item} item       The Race / Class / Subclass (or the skill) that gives them
 * @param {string[]} uuids
 */
export async function createGranted(actor, item, uuids) {
  const source = sourceOf(item);
  const type = (item.type === "skill") ? "skill" : item.type;
  const toCreate = [];
  for (const uuid of uuids) {
    const skill = await fromUuid(uuid);
    if (!skill || owns(actor, skill)) continue;
    const skillData = skill.toObject();
    delete skillData._id;
    delete skillData.folder;
    delete skillData.sort;
    delete skillData.ownership;
    foundry.utils.setProperty(skillData, "_stats.compendiumSource", skill.uuid);
    foundry.utils.setProperty(skillData, `flags.eternia.${GRANT_FLAG}`, { type, source });
    toCreate.push(skillData);
  }
  if (toCreate.length) await actor.createEmbeddedDocuments("Item", toCreate);
}

/** Skills of an actor given by this option or skill. */
export function grantedBy(actor, item) {
  const source = sourceOf(item);
  const type = (item.type === "skill") ? "skill" : item.type;
  return actor.items.filter(i => {
    const flag = i.getFlag("eternia", GRANT_FLAG);
    return (flag?.type === type) && (flag.source === source);
  });
}
