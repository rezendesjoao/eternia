/**
 * What's new: once per user and release line, a short window with the news of this version (0.13: the Summoner as a
 * magic class and three more Magias; 0.12: the Pictomancer and three more Magias; 0.11: the Red Mage and four more
 * Magias; 0.10: the Black Mage and the Magias; 0.9: the Dragon Slayer;
 * 0.8: the sixteen classes;
 * 0.7: the classes and the Samurai; 0.6: the Sword Art Online items; 0.5: the item icons; 0.4: the professions; 0.3: the races; 0.2: the conditions; 0.1: the HUD in place of the macro hotbar, the turn helpers, the status links),
 * so the players know what changed.
 */
import { L, SYSTEM_ID, setting } from "../settings.mjs";

/** The release line the notice speaks about. */
const NOTICE = "0.13";

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
