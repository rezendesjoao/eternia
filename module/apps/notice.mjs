/**
 * What's new: once per user and release line, a short window with the news of this version (0.35: the rest of the
 * Empire's bestiary, the raiding goblins, the Hollow, the Falls, the Stray to be saved and the Mother Rift; 0.34: the
 * Empire's bestiary, the automatic drops and the named beast; 0.33: the race tab of the sheet; 0.32: the six races of the world, the five stages of the form and the world compendium; 0.31: the new
 * Biography tab, the tokens ready to play, the automatic dodge and the creation wizard redone; 0.30: the starting gear
 * and the suggested attributes of the creation wizard; 0.29: the new character sheet, the creation wizard and the
 * windows that open at once; 0.28: twenty Magias of the high categories and eleven new conditions; 0.27: four Magias of
 * the high categories (the Sun, the Counter, the Purgatory Flames and the Theft) and five new conditions; 0.26: the
 * review of the Magias, a Trait for each one and five new conditions; 0.25: three Dragon Slayer elements, sixteen more
 * Magias and the seven Curses; 0.24: four more Magias; 0.23: four more Magias; 0.22: the 14 classes, physical and
 * magic, all with Magias; 0.21: four more Magias; 0.20: four Holder Magias; 0.19: four more Magias; 0.18: the Magia
 * picker, the class tab without scrolling and three more Magias; 0.17: three Lost Magias; 0.16: the elemental Magias,
 * and the Sorcerer leaves the list; 0.15: the Blue Mage and the Take Over Magias; 0.14: the White Mage in the Weaver's
 * place and three more Magias; 0.13: the Summoner as a magic class and three more Magias; 0.12: the Pictomancer and
 * three more Magias; 0.11: the Red Mage and four more Magias; 0.10: the Black Mage and the Magias; 0.9: the Dragon
 * Slayer;
 * 0.8: the sixteen classes;
 * 0.7: the classes and the Samurai; 0.6: the Sword Art Online items; 0.5: the item icons; 0.4: the professions; 0.3: the races; 0.2: the conditions; 0.1: the HUD in place of the macro hotbar, the turn helpers, the status links),
 * so the players know what changed.
 */
import { L, SYSTEM_ID, setting } from "../settings.mjs";

/** The release line the notice speaks about. */
const NOTICE = "0.35";

/** Call during the `init` hook. */
export function registerNotice() {
  Hooks.once("ready", () => {
    if (setting("noticeSeen") === NOTICE) return;
    const version = game.system.version;
    foundry.applications.api.DialogV2.prompt({
      window: { title: L("Notice.Title", { version }), icon: "fa-solid fa-scroll" },
      classes: ["lhauto-dialog", "lhauto-notice"],
      position: { width: 520 },
      content: L("Notice.Body"),
      ok: { label: L("Notice.Ok"), icon: "fa-solid fa-check" },
      rejectClose: false
    }).finally(() => game.settings.set(SYSTEM_ID, "noticeSeen", NOTICE));
  });
}
