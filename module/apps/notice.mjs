/**
 * What's new: once per user and release line, a short window with the news of this version (the HUD, the turn
 * helpers, the status links, the HUD in place of the macro hotbar…), so the players know the bar at the bottom of
 * the screen is theirs to use and where the macros went.
 */
import { L, SYSTEM_ID, setting } from "../settings.mjs";

/** The release line the notice speaks about. */
const NOTICE = "0.1";

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
