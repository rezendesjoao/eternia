/**
 * Race, Class and Subclass of a character: each one is an Item embedded in the actor (one of each
 * at most), taken from the system compendium, a world compendium or the world items.
 */

import { offerGrants } from "../apps/option-grants.mjs";
import { chooseHumanStats, isHumanRace, offerBonusPoints } from "../apps/stat-allocation.mjs";
import { offerClassSkills, rollbackPicks, waitForRollback } from "../apps/skill-browser.mjs";
import { isLocalChange } from "./clients.mjs";

/** Item types a character holds a single copy of. */
export const OPTION_TYPES = ["race", "class", "subclass"];

/** System compendium holding the races and classes. */
export const CORE_PACK = "eternia.races-classes";

/** Default icons of each option type. */
export const OPTION_ICONS = {
  race: "icons/environment/people/group.webp",
  class: "icons/environment/people/infantry.webp",
  subclass: "icons/skills/trades/academics-study-reading-book.webp"
};

/** Class archetypes: key -> localization key. */
export const ARCHETYPES = {
  warrior: "ETERNIA.Archetype.Warrior",
  weaponAttacker: "ETERNIA.Archetype.WeaponAttacker",
  healer: "ETERNIA.Archetype.Healer",
  mage: "ETERNIA.Archetype.Mage"
};

/** The Race / Class / Subclass item of a character, if any. */
export function getOption(actor, type) {
  return actor.items.find(i => i.type === type) ?? null;
}

/** Numeric fields of an option item (form inputs may store them as text). */
function numbers(data, keys) {
  return Object.fromEntries(keys.map(k => [k, Number(data[k]) || 0]));
}

/** Numbers of the character's race (its Race item), or null. */
export function raceStats(actor) {
  const item = getOption(actor, "race");
  if (!item) return null;
  return numbers({ ...item.system.attributes, hp: item.system.hp, fate: item.system.fate },
    ["str", "dex", "pow", "int", "hp", "fate"]);
}

/** Numbers of the character's class (its Class item), or null. */
export function classStats(actor) {
  const item = getOption(actor, "class");
  if (!item) return null;
  return numbers({ ...item.system.attributes, hp: item.system.hp, hpPerRank: item.system.hpPerRank },
    ["str", "dex", "pow", "int", "hp", "hpPerRank"]);
}

/* -------------------------------------------- */
/*  Option items                                */
/* -------------------------------------------- */

/** Plain data of an option item, ready to embed in an actor. */
export function optionDataFrom(item) {
  const data = item.toObject();
  delete data._id;
  delete data.folder;
  delete data.sort;
  delete data.ownership;
  foundry.utils.setProperty(data, "_stats.compendiumSource", item.uuid);
  return data;
}

/* -------------------------------------------- */
/*  Registration                                */
/* -------------------------------------------- */

export function registerCharacterOptions() {
  // A character holds a single Race, Class and Subclass: adding one replaces the previous one.
  Hooks.on("createItem", (item, options, userId) => {
    if (!isLocalChange(options, userId) || !OPTION_TYPES.includes(item.type)) return;
    const actor = item.parent;
    if (!(actor instanceof Actor) || (actor.type !== "character")) return;
    const previous = actor.items.filter(i => (i.type === item.type) && (i.id !== item.id)).map(i => i.id);
    if (previous.length) actor.deleteEmbeddedDocuments("Item", previous);
    // The skills chosen with the previous Main Class (dialog first, before the new class' ones).
    if ((item.type === "class") && previous.length && !options.eterniaMigration) {
      rollbackPicks(actor, { reason: "ETERNIA.SkillBrowser.Undo.HintClass" });
    }
    // Not for migrated characters: they already have their stats and skills.
    if (options.eterniaMigration) return;
    (async () => {
      // The undo dialog of the previous Main Class' skills comes first.
      if (item.type === "class") await waitForRollback(actor);
      // Human: the two stats of its +1
      if (isHumanRace(item)) await chooseHumanStats(item);
      // Starting skills of the new Race / Class / Subclass
      await offerGrants(actor, item);
      // Bonus points and skills of a new character, chosen with the class
      if (item.type === "class") {
        await offerBonusPoints(actor);
        await offerClassSkills(actor);
      }
    })();
  });

  // Main Class removed (not replaced): offer to undo the skills chosen with it. Without a class the
  // character has no picks left to choose.
  Hooks.on("deleteItem", (item, options, userId) => {
    if (!isLocalChange(options, userId) || (item.type !== "class")) return;
    const actor = item.parent;
    if (!(actor instanceof Actor) || (actor.type !== "character")) return;
    if (!actor.items.some(i => i.type === "class")) rollbackPicks(actor, { reason: "ETERNIA.SkillBrowser.Undo.HintClass" });
  });
}
