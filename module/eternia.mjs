// Import document classes.
import { EterniaActor } from "./documents/actor.mjs";
import { EterniaItem } from "./documents/item.mjs";
import { EterniaCombat, registerCombatPhases } from "./documents/eterniaCombat.mjs";
import { ATTRIBUTES_PHASE, EterniaActiveEffect } from "./documents/eterniaActiveEffect.mjs"
// Import sheet classes.
import { registerCharacterSheet } from "./sheets/character-sheet.mjs";
import { registerMonsterSheet } from "./sheets/monster-sheet.mjs";
import { EterniaItemSheet } from "./sheets/item-sheet.mjs";
import { EterniaActiveEffectConfig } from "./apps/effect-config.mjs";
// Import helper/utility classes and constants.
import { preloadHandlebarsTemplates } from "./helpers/templates.mjs";
import { ETERNIA } from "./helpers/config.mjs";
import { registerStatuses } from "./helpers/statuses.mjs";
import { registerTags } from "./helpers/tags.mjs";
import { EterniaToken } from "./canvas/eterniaToken.mjs";
import { registerPiles } from "./piles/piles.mjs";
import { registerCharacterOptions } from "./helpers/character-options.mjs";
import { registerRankGrants } from "./apps/rank-grants.mjs";
import { OptionBrowser, registerOptionBrowser } from "./apps/option-browser.mjs";
import { registerSkillBrowser } from "./apps/skill-browser.mjs";
import { registerLevelFlow } from "./apps/rank-up.mjs";
import { registerSkillRefresh } from "./apps/skill-refresh.mjs";
import { rollSkill } from "./helpers/skill-rolls.mjs";
import { registerCombatCards } from "./helpers/combat-cards.mjs";
import { registerItemUse, useItem } from "./helpers/item-use.mjs";
import { registerEffectTargets } from "./helpers/effect-targets.mjs";
import { registerEffectConditions } from "./helpers/effect-conditions.mjs";
import { registerEffectDurations } from "./helpers/effect-durations.mjs";
import { registerMigrations, runMigrations } from "./helpers/migrations.mjs";
import { registerSustained, onApplySkillEffects } from "./helpers/sustained.mjs";
import { registerClients } from "./helpers/clients.mjs";
// Table automation, the parchment look and the action HUD.
import { registerClientSettings, registerSettings } from "./settings.mjs";
import { registerUse, undoUse } from "./automation/use.mjs";
import { registerHate } from "./automation/hate.mjs";
import { registerRound } from "./automation/round.mjs";
import { registerFate, removeBadStatus, spendFate } from "./automation/fate.mjs";
import { endScene, registerScenes } from "./automation/scenes.mjs";
import { registerReach } from "./automation/reach.mjs";
import { registerTurn } from "./automation/turn.mjs";
import { registerCards, rollCheck, rollDamage } from "./chat/cards.mjs";
import { registerChat } from "./chat/chat.mjs";
import { giveEffects, registerStatusLinks, statusEffectData } from "./chat/status-links.mjs";
import { registerTextChips } from "./helpers/text-chips.mjs";
import { registerQuickEffect } from "./chat/quick-effect.mjs";
import { fillWorld, registerContent, syncItemSkills } from "./content/content.mjs";
import { parseMonsterDamage } from "./content/monster-damage.mjs";
import { registerPortugueseDisplay } from "./i18n/display.mjs";
import { registerWindows } from "./apps/window-theme.mjs";
import { registerNotice } from "./apps/notice.mjs";
import { actionHud, registerHud, rollActorCheck } from "./hud/hud.mjs";
import { registerTokens } from "./canvas/token-style.mjs";
import { registerConditions } from "./conditions/index.mjs";
import { recover } from "./conditions/recovery.mjs";
import { takeDamage } from "./conditions/damage.mjs";
import { professionsApi, registerProfessions } from "./professions/index.mjs";
import { MOTOR_API, registerClasses } from "./classes/index.mjs";
import { registerClassProgression } from "./classes/progression.mjs";
import { registerClassSheet } from "./classes/sheet.mjs";
import { iconsApi, registerIcons } from "./icons/index.mjs";
import { registerPackIndex } from "./helpers/pack-index.mjs";
import { registerMagicCatalog } from "./apps/magic-catalog.mjs";
import { registerPrewarm } from "./helpers/prewarm.mjs";
import { CreationWizard, registerCreationWizard } from "./apps/creation-wizard.mjs";
import { registerCreationCatalog } from "./apps/creation-catalog.mjs";

/* -------------------------------------------- */
/*  Init Hook                                   */
/* -------------------------------------------- */

Hooks.once('init', async function () {

  console.log(`Eternia | Initializing the system...\n${ETERNIA.ASCII}`);

  // Add utility classes to the global game object so that they're more easily
  // accessible in global contexts.
  game.eternia = {
    EterniaActor,
    EterniaItem,
    rollItemMacro,
    EterniaCombat,
    EterniaActiveEffect,
    OptionBrowser,
    // The creation wizard of a character (apps/creation-wizard.mjs)
    createCharacter: actor => CreationWizard.open(actor),
    // For macros: scenes, checks, Fate, statuses and conditions, the HUD and the class Motors.
    endScene,
    endScenario: actors => endScene(actors, { scenario: true }),
    fillWorld,
    parseMonsterDamage,
    rollCheck,
    rollDamage,
    rollActorCheck,
    spendFate,
    removeBadStatus,
    syncItemSkills,
    undoUse,
    applyStatus: (actor, id, { value = null, tag = "", expires = "endOfScene", from = null } = {}) =>
      giveEffects(actor, [statusEffectData(id, value, tag, { expires, caster: from })]),
    conditions: { recover, damage: takeDamage },
    professions: professionsApi,
    motor: MOTOR_API,
    icons: iconsApi,
    hud: actionHud
  };

  // Add custom constants for configuration.
  CONFIG.ETERNIA = ETERNIA;

  /**
   * Set an initiative formula for the system
   * @type {String}
   */
  CONFIG.Combat.initiative = {
    formula: "0d6",
    decimals: 0
  };

  // Define custom Document classes
  CONFIG.Actor.documentClass = EterniaActor;
  CONFIG.Item.documentClass = EterniaItem;
  CONFIG.Combat.documentClass = EterniaCombat;
  CONFIG.ActiveEffect.documentClass = EterniaActiveEffect;
  // Changes applied once the attribute modifiers are computed (see EterniaActiveEffect#shouldApplyChange)
  CONFIG.ActiveEffect.phases[ATTRIBUTES_PHASE] = {
    label: "ETERNIA.Effect.Phase.attributes.label",
    hint: "ETERNIA.Effect.Phase.attributes.hint"
  };
  CONFIG.Token.objectClass = EterniaToken;

  // Eternia statuses (Token HUD, token icons, sheet sync, [Hidden])
  registerStatuses();
  // Tag catalog, tag editor helper and tag normalization
  registerTags();
  // Effect targets catalog and summary helper
  registerEffectTargets();
  registerEffectConditions();
  // Eternia effect durations and expiry engine
  registerEffectDurations();
  // Browser windows of the same user (a GM logged in twice acts once)
  registerClients();
  // World data migrations: run in order on the active GM when the world is ready
  registerMigrations();
  // By default, track hate and skip defeated combatants
  CONFIG.combatTrackerConfig = {resource: 'infos.hate', skipDefeated: true};
  // Time passing per round
  CONFIG.time.roundTime = 6;

  // Register sheet application classes: the parchment character and monster sheets
  foundry.documents.collections.Actors.unregisterSheet("core", foundry.appv1.sheets.ActorSheet);
  registerCharacterSheet();
  registerMonsterSheet();
  foundry.documents.collections.Items.unregisterSheet("core", foundry.appv1.sheets.ItemSheet);
  foundry.documents.collections.Items.registerSheet("eternia", EterniaItemSheet, { makeDefault: true });

  foundry.applications.apps.DocumentSheetConfig.registerSheet(ActiveEffect, "eternia", EterniaActiveEffectConfig, {
    makeDefault: true,
    label: "ETERNIA.EffectConfig.Title"
  });

  // Loot, chests, merchants and item/gold transfers between players
  registerPiles();

  // Race / Class / Subclass items: single copy per character, core compendium, legacy migration
  registerCharacterOptions();
  registerRankGrants();
  registerOptionBrowser();
  registerSkillBrowser();
  registerLevelFlow();
  // GM tool: refresh the skills characters own from the system compendiums
  registerSkillRefresh();

  // Attack / damage chat cards: opposed Hit vs Dodge Checks and damage application
  registerCombatCards();

  // Usable items (potions, scrolls…): Use button, use card, effects, [Consumable]
  registerItemUse();

  // Sustained skills (Harmony, Servant Summon, Enchantment): limits, replacement, expiry
  registerSustained();

  // Round Progression: Briefing / Setup / Main / Cleanup phases in the tracker
  registerCombatPhases();

  // Table automation (each part has its own setting): costs, limits and actions of the skills, Hate per
  // combat, Cleanup, Fate, scenes, reach, turn helpers, attack and damage cards, statuses written in the
  // chat, effects from a card, and the content of the items and monsters. Then the look: the parchment
  // windows and chat, the token bars and nameplates and the action HUD.
  registerSettings();
  registerTokens();
  registerScenes();
  registerUse();
  registerHate();
  registerRound();
  registerCards();
  registerFate();
  registerContent();
  registerConditions();
  registerPortugueseDisplay();
  registerChat();
  registerWindows();
  registerReach();
  registerHud();
  registerClientSettings();
  registerTurn();
  registerStatusLinks();
  registerTextChips();
  registerQuickEffect();
  registerNotice();
  // Professions (the subclasses): the profession tab, the bench, the traps
  registerProfessions();
  // Classes: the Motors, the class tab, the Path and Apex by Character Rank, the Dedications
  registerClasses();
  registerClassProgression();
  registerClassSheet();
  // Item icons: the frame of the magic grade and the effects of the level
  registerIcons();
  // The compendium indexes with every field the windows read, the Magia catalog, and both prepared when idle
  registerPackIndex();
  registerMagicCatalog();
  registerPrewarm();
  // The creation wizard: race, class, Magia, profession, attributes and skills, step by step
  registerCreationCatalog();
  registerCreationWizard();

  // Preload Handlebars templates.
  return preloadHandlebarsTemplates();
});

/* -------------------------------------------- */
/*  Handlebars Helpers                          */
/* -------------------------------------------- */

Handlebars.registerHelper('toUpperCase', function (str) {
  return str.toUpperCase();
});

// Used by templates/apps/option-browser.hbs (search index)
Handlebars.registerHelper('toLowerCase', function (str) {
  return String(str ?? "").toLowerCase();
});

/* -------------------------------------------- */
/*  Ready Hook                                  */
/* -------------------------------------------- */

Hooks.once("ready", async function () {
  // Wait to register hotbar drop hook on ready so that modules could register earlier if they want to
  // Core only skips its own "Display <item>" macro if the hook returns false synchronously.
  Hooks.on("hotbarDrop", (bar, data, slot) => {
    if (data.type !== "Item") return;
    createItemMacro(data, slot);
    return false;
  });
  runMigrations();
});

/* -------------------------------------------- */
/*  Skill chat cards: Check / Damage / Effects  */
/* -------------------------------------------- */

Hooks.on("renderChatMessageHTML", (message, html) => {
  html.querySelectorAll(".skill-card-roll").forEach(button => button.addEventListener("click", async event => {
    event.preventDefault();
    const uuid = button.closest("[data-item-uuid]")?.dataset.itemUuid;
    const item = uuid ? await fromUuid(uuid).catch(() => null) : null;
    if (!item) return ui.notifications.warn(game.i18n.localize("ETERNIA.Skill.Notif.Missing"));
    rollSkill(item, button.dataset.roll);
  }));

  html.querySelectorAll(".skill-card-effects").forEach(button => button.addEventListener("click", async event => {
    event.preventDefault();
    await onApplySkillEffects(message, button);
  }));
});


/* -------------------------------------------- */
/*  Ticket Stacking                             */
/* -------------------------------------------- */

// Tickets stack by subtype: receiving one (loot, trade, drag & drop, etc.)
// while the actor already carries one of that subtype adds to its quantity
// instead of creating a duplicate item. Treasure Tickets also stack by rank
// (a CR 2 ticket and a CR 3 ticket are different tickets).
Hooks.on("preCreateItem", (item, data, options, userId) => {
  if (item.type !== "ticket") return;
  const actor = item.parent;
  if (!(actor instanceof Actor)) return;
  // Merchants track their own stock per entry.
  if ((actor.type === "pile") && (actor.system.mode === "merchant")) return;

  const subtype = item.system.subtype;
  const ranked = subtype === "Treasure";
  const rank = Number(item.system.rank) || 0;
  const existing = actor.items.find(i => i.type === "ticket" && i.system.subtype === subtype
    && (!ranked || (Number(i.system.rank) || 0) === rank));
  if (!existing) return;

  const addedQuantity = Number(item.system.quantity) || 1;
  existing.update({ "system.quantity": (Number(existing.system.quantity) || 0) + addedQuantity });
  return false;
});

/* -------------------------------------------- */
/*  Linked Skills                               */
/* -------------------------------------------- */

// Equipment sheets show their linked skill's name and icon, read at render time.
// Re-render any open sheet linked to a skill when that skill's name or icon changes.
Hooks.on("updateItem", (item, changes) => {
  if (item.type !== "skill" || !(("name" in changes) || ("img" in changes))) return;
  const apps = foundry.applications?.instances?.values() ?? [];
  for (const app of apps) {
    if (app.item?.system?.linkedSkillUuid === item.uuid) app.render(false);
  }
});

/* -------------------------------------------- */
/*  Hotbar Macros                               */
/* -------------------------------------------- */

/**
 * Create a Macro from an Item drop.
 * Get an existing item macro if one exists, otherwise create a new one.
 * @param {Object} data     The dropped data
 * @param {number} slot     The hotbar slot to use
 * @returns {Promise}
 */
async function createItemMacro(data, slot) {
  const item = data.uuid ? await fromUuid(data.uuid) : null;
  if (!item?.parent) {
    ui.notifications.warn(game.i18n.localize("ETERNIA.Macro.Notif.OwnedOnly"));
    return;
  }

  // Create the macro command
  const command = `game.eternia.rollItemMacro(${JSON.stringify(item.name)});`;
  let macro = game.macros.find(m => (m.name === item.name) && (m.command === command));
  if (!macro) {
    macro = await Macro.create({
      name: item.name,
      type: "script",
      img: item.img,
      command: command,
      flags: { "eternia.itemMacro": true }
    });
  }
  game.user.assignHotbarMacro(macro, slot);
}

/**
 * Hotbar macro: use the named item of the speaker's actor. Usable items are used (Use card,
 * effects, [Consumable]); anything else is sent to chat (skills with their Check / Damage buttons).
 * @param {string} itemName
 * @return {Promise}
 */
function rollItemMacro(itemName) {
  const speaker = ChatMessage.getSpeaker();
  let actor;
  if (speaker.token) actor = game.actors.tokens[speaker.token];
  if (!actor) actor = game.actors.get(speaker.actor);
  const item = actor ? actor.items.find(i => i.name === itemName) : null;
  if (!item) return ui.notifications.warn(game.i18n.format("ETERNIA.Macro.Notif.NoItem", { item: itemName }));

  return (item.type === "usable") ? useItem(item) : item.ItemThrow();
}
