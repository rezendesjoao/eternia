/**
 * Settings of the table automation, the look, the HUD and the Kuden: one switch per automation, so a table can
 * turn off what it doesn't want.
 * They are read when the automation runs, so changing them needs no reload.
 * The world settings come first, by theme; the client ones (HUD, turn helpers) are each player's.
 * Headers split them in Configure Settings.
 */
export const SYSTEM_ID = "eternia";

/** How a rules check reacts to an issue: off, warn (ask to go on) or block (the GM may still go on). */
const MODES = {
  off: "ETERNIA.Settings.Mode.off",
  warn: "ETERNIA.Settings.Mode.warn",
  block: "ETERNIA.Settings.Mode.block"
};

/** The first setting of each section of Configure Settings, and its header. */
const SECTIONS = {
  costs: "rules",
  conditionRules: "conditions",
  cards: "chat",
  content: "content",
  chatTheme: "look",
  hud: "hud",
  turnNotice: "turn"
};

/** Call during the `init` hook. */
export function registerSettings() {
  const toggle = (key, value = true, scope = "world") => game.settings.register(SYSTEM_ID, key, {
    name: `ETERNIA.Settings.${key}.Name`,
    hint: `ETERNIA.Settings.${key}.Hint`,
    scope,
    config: true,
    type: Boolean,
    default: value
  });
  const mode = (key, value) => game.settings.register(SYSTEM_ID, key, {
    name: `ETERNIA.Settings.${key}.Name`,
    hint: `ETERNIA.Settings.${key}.Hint`,
    scope: "world",
    config: true,
    type: String,
    choices: MODES,
    default: value
  });

  // Rules of use and combat
  toggle("costs");
  mode("limits", "warn");
  mode("actions", "warn");
  toggle("hatePerCombat");
  toggle("cleanup");
  toggle("endOfProcess");
  toggle("incapacitated");
  toggle("endOfScene");
  toggle("revive");
  toggle("closeReach");
  // The conditions of Eternia (conditions/): their automatic effects, and what they forbid
  toggle("conditionRules");
  mode("conditionLimits", "warn");
  // Cards and chat
  toggle("cards");
  toggle("fate");
  toggle("statusLinks");
  toggle("quickEffect");
  // Content and house rules
  toggle("content");
  toggle("kuden");
  // Look
  toggle("chatTheme");
  game.settings.register(SYSTEM_ID, "windowTheme", {
    name: "ETERNIA.Settings.windowTheme.Name",
    hint: "ETERNIA.Settings.windowTheme.Hint",
    scope: "world",
    config: true,
    type: Boolean,
    default: true,
    requiresReload: true
  });
  // Item icons (icons/index.mjs): each player may keep them still.
  game.settings.register(SYSTEM_ID, "iconEffects", {
    name: "ETERNIA.Settings.iconEffects.Name",
    hint: "ETERNIA.Settings.iconEffects.Hint",
    scope: "client",
    config: true,
    type: Boolean,
    default: true,
    requiresReload: true
  });
  // Tokens (tokens.mjs): their bars and nameplate redrawn when these change.
  const tokens = () => Hooks.callAll("eterniaTokenStyle");
  game.settings.register(SYSTEM_ID, "tokenStyle", {
    name: "ETERNIA.Settings.tokenStyle.Name",
    hint: "ETERNIA.Settings.tokenStyle.Hint",
    scope: "world",
    config: true,
    type: Boolean,
    default: true,
    onChange: tokens
  });
  game.settings.register(SYSTEM_ID, "tokenBars", {
    name: "ETERNIA.Settings.tokenBars.Name",
    hint: "ETERNIA.Settings.tokenBars.Hint",
    scope: "world",
    config: true,
    type: String,
    choices: {
      always: "ETERNIA.Settings.tokenBars.always",
      identified: "ETERNIA.Settings.tokenBars.identified",
      core: "ETERNIA.Settings.tokenBars.core"
    },
    default: "always",
    onChange: tokens
  });
}

/** The turn helpers (turn.mjs): each player's, after the HUD settings (hud.mjs). Call during `init`. */
export function registerClientSettings() {
  const toggle = (key, value) => game.settings.register(SYSTEM_ID, key, {
    name: `ETERNIA.Settings.${key}.Name`,
    hint: `ETERNIA.Settings.${key}.Hint`,
    scope: "client",
    config: true,
    type: Boolean,
    default: value
  });
  toggle("turnNotice", true);
  toggle("turnSelect", false);
  toggle("turnPan", false);
  toggle("turnUntarget", true);
  // The release notice already seen (notice.mjs).
  game.settings.register(SYSTEM_ID, "noticeSeen", { scope: "client", config: false, type: String, default: "" });

  Hooks.on("renderSettingsConfig", addSectionHeaders);
}

/** Headers before the first setting of each section in Configure Settings. */
function addSectionHeaders(app, html) {
  const root = html instanceof HTMLElement ? html : html?.[0];
  if (!root) return;
  for (const [key, section] of Object.entries(SECTIONS)) {
    const group = root.querySelector(`[name="${SYSTEM_ID}.${key}"]`)?.closest(".form-group");
    if (!group || group.previousElementSibling?.classList.contains("lhauto-settings-section")) continue;
    const header = document.createElement("h4");
    header.className = "lhauto-settings-section";
    header.textContent = game.i18n.localize(`ETERNIA.Settings.Section.${section}`);
    group.before(header);
  }
}

/** A setting's value (null before the settings exist). */
export function setting(key) {
  try {
    return game.settings.get(SYSTEM_ID, key);
  }
  catch {
    return null;
  }
}

/** Localized text ("ETERNIA.<key>"). */
export const L = (key, data) => data ? game.i18n.format(`ETERNIA.${key}`, data) : game.i18n.localize(`ETERNIA.${key}`);
