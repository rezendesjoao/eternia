/**
 * Define a set of template paths to pre-load
 * Pre-loaded templates are compiled and cached for fast access when rendering
 * @return {Promise}
 */
 export const preloadHandlebarsTemplates = async function() {
  return foundry.applications.handlebars.loadTemplates([

    // Actor partials.
    "systems/eternia/templates/actor/parts/actor-stats.html",
    "systems/eternia/templates/actor/parts/actor-effects.html",
    "systems/eternia/templates/actor/parts/actor-inventory.html",
    "systems/eternia/templates/actor/parts/actor-tickets.html",
    "systems/eternia/templates/actor/parts/inventory/inventory-ticket-ranked-slot.html",
    "systems/eternia/templates/item/parts/item-subclass-skills.html",
    "systems/eternia/templates/actor/parts/actor-biography.html",
    "systems/eternia/templates/actor/parts/actor-bio-connections.html",
    "systems/eternia/templates/actor/parts/actor-bio-unions.html",
    "systems/eternia/templates/actor/parts/actor-skills-basic.html",
    "systems/eternia/templates/actor/parts/actor-skills-combat.html",
    "systems/eternia/templates/actor/parts/actor-skills-general.html",
    "systems/eternia/templates/actor/parts/actor-status.html",
    "systems/eternia/templates/actor/parts/actor-status-panel.html",
    "systems/eternia/templates/actor/parts/actor-option.html",

    "systems/eternia/templates/actor/parts/inventory/inventory-itemlist.html",
    "systems/eternia/templates/actor/parts/inventory/inventory-equip-slot.html",
    "systems/eternia/templates/actor/parts/inventory/inventory-ticket-slot.html",
    "systems/eternia/templates/actor/parts/inventory/inventory-ticket-evolution.html",
    "systems/eternia/templates/actor/parts/skills/skills-grid.html",

    "systems/eternia/templates/actor/parts/monster-skills.html",
    "systems/eternia/templates/actor/parts/monster-effects.html",

    //Items partials
    "systems/eternia/templates/item/parts/item-effects.html",
    "systems/eternia/templates/item/parts/item-header.html",
    "systems/eternia/templates/parts/tag-input.html",
    "systems/eternia/templates/item/parts/item-linked-skill.html",
    "systems/eternia/templates/item/parts/item-grants.html",
    "systems/eternia/templates/item/parts/skill-field.html",
    "systems/eternia/templates/item/parts/roll-check.html",
    "systems/eternia/templates/item/parts/roll-damage.html",

    // Combat chat cards
    "systems/eternia/templates/chat/attack-card.hbs",
    "systems/eternia/templates/chat/damage-card.hbs",
    "systems/eternia/templates/chat/damage-applied.hbs",
    "systems/eternia/templates/chat/use-card.hbs",
    "systems/eternia/templates/chat/rank-up-card.hbs",

    // The Magia browser (the Magia picker and the creation wizard)
    "systems/eternia/templates/apps/magic-browser.hbs",
    "systems/eternia/templates/apps/magic-page.hbs",
    // The rolls of the Awakening (the creation wizard and the Magia picker)
    "systems/eternia/templates/apps/awakening-bar.hbs",

    // The creation wizard's steps
    ...["race", "class", "magic", "profession", "attributes", "skills", "items", "summary", "decree"]
      .map(step => `systems/eternia/templates/apps/creation/${step}.hbs`),

    // ActiveEffect sheets
    "systems/eternia/templates/effects/effect-changes.hbs",
    "systems/eternia/templates/effects/effect-status.hbs",
    "systems/eternia/templates/effects/effect-duration.hbs",
    "systems/eternia/templates/effects/effect-conditions.hbs",
    "systems/eternia/templates/effects/effect-roll-filter.hbs"
  ]);
};
