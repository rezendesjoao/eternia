/**
 * Action HUD: a parchment bar above the macro hotbar for the selected token (or, for a player with nothing
 * selected, their character), to roll the checks, use the skills, the Kuden pieces and the items, and follow
 * HP, Barrier, Fate, Hate, Fatigue and the turn without opening the sheet.
 *
 * - The bar: portrait (opens the sheet), resources, the combat state (join the combat, the actions left in the
 *   Main Process, end it, Standby), the Dodge Checks still to roll, the panel buttons and up to 8 pinned
 *   shortcuts.
 * - A panel opens above the bar: checks, skills by Timing, Kuden, items, statuses. Click uses or rolls; Shift
 *   rolls a skill's Check right after its card (or asks a check's modifier); right click opens the item; the pin
 *   fixes it on the bar. Clicking the board or Escape closes the panel.
 * - Skills go through EterniaItem#ItemThrow, so use.mjs checks and records them as from the sheet; usable items
 *   through the system's useItem (after their Character Rank lock); a Dodge Check through the attack card's own
 *   button (rendered off-screen with its listeners).
 * The data is built in data.mjs; the bar re-renders (debounced) when the actor, its items and effects, its
 * token, the combats, the attack cards or the scene change.
 *
 * The core macro hotbar can give its place to the HUD (client setting "hotbar"): hidden, or hidden only while the
 * HUD is on screen. It is only hidden with CSS, so the macro keys (1–0) keep working.
 */
import { recover } from "../conditions/recovery.mjs";
import { removeStatuses } from "../conditions/rules.mjs";
import { applyModifier, checkModifier, consumeAfterRoll } from "../conditions/rolls.mjs";
import { L, SYSTEM_ID, setting } from "../settings.mjs";
import { diceFormula } from "../helpers/dice.mjs";
import { useItem } from "../helpers/item-use.mjs";
import { checkUsable } from "../automation/use.mjs";
import { rollCheck } from "../chat/cards.mjs";
import { removeBadStatus } from "../automation/fate.mjs";
import { resourceOf, setResource } from "../kuden/pieces.mjs";
import { checkOf, descriptionHTML, hudContext, MAX_PINS, PANELS, pinHolder, pinsOf } from "./data.mjs";
import { combatantOf, combatOf, toInt } from "../helpers/utils.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;
const DIR = `systems/eternia/templates/hud`;

export class ActionHud extends HandlebarsApplicationMixin(ApplicationV2) {

  static DEFAULT_OPTIONS = {
    id: "lhauto-hud",
    tag: "aside",
    classes: ["lhauto-hud", "themed", "theme-light"],
    window: { frame: false, positioned: false },
    actions: {
      "lhh-panel": ActionHud.#onPanel,
      "lhh-close": ActionHud.#onClose,
      "lhh-collapse": ActionHud.#onCollapse,
      "lhh-sheet": ActionHud.#onSheet,
      "lhh-check": ActionHud.#onCheck,
      "lhh-use": ActionHud.#onUse,
      "lhh-pin": ActionHud.#onPin,
      "lhh-fate": ActionHud.#onFate,
      "lhh-join": ActionHud.#onJoin,
      "lhh-end": ActionHud.#onEndTurn,
      "lhh-standby": ActionHud.#onStandby,
      "lhh-dodge": ActionHud.#onDodge,
      "lhh-remove-bad": ActionHud.#onRemoveBad,
      "lhh-status-off": ActionHud.#onStatusOff,
      "lhh-status-recover": ActionHud.#onStatusRecover,
      "lhh-effect-off": ActionHud.#onEffectOff,
      "lhh-resource": ActionHud.#onResource
    }
  };

  static PARTS = {
    hud: { template: `${DIR}/hud.hbs`, scrollable: [".lhh-panel-body"] }
  };

  /** The token (may be null for a character without one on the scene) and the actor shown. */
  token = null;
  actor = null;

  /** The open panel, if any. */
  panel = null;

  /** Only the portrait (client setting). */
  get collapsed() {
    return !!setting("hudCollapsed");
  }

  /** Enriched item descriptions for the tooltips, by item uuid and modification time. */
  #descriptions = new Map();

  /** Re-read who to show and render, at most once per burst of changes. */
  refresh = foundry.utils.debounce(() => this.#sync(), 60);

  /** Whether the HUD shows this actor (or the base actor of the unlinked token it shows). */
  shows(actor) {
    const shown = this.actor;
    if (!actor || !shown) return false;
    return (actor === shown) || (actor.uuid === shown.uuid) || (shown.isToken && (shown.token?.baseActor === actor));
  }

  #sync() {
    const { token, actor } = pickActor();
    if (!actor || !setting("hud")) {
      this.token = this.actor = null;
      if (this.rendered) this.close({ animate: false });
      return;
    }
    this.token = token;
    this.actor = actor;
    this.render({ force: true });
  }

  /* -------------------------------------------- */
  /*  Rendering                                   */
  /* -------------------------------------------- */

  /** @override Above the macro hotbar, in the bottom column of the interface. */
  async _insertElement(element) {
    const existing = document.getElementById(element.id);
    if (existing) return existing.replaceWith(element);
    const bottom = document.getElementById("ui-bottom");
    if (!bottom) return document.body.append(element);
    const hotbar = document.getElementById("hotbar");
    bottom.insertBefore(element, (hotbar?.parentElement === bottom) ? hotbar : null);
  }

  /** @override */
  async _prepareContext() {
    return hudContext(this.actor, this.token, { panel: this.panel, collapsed: this.collapsed });
  }

  /** @override */
  async _onFirstRender(context, options) {
    await super._onFirstRender(context, options);
    const root = this.element;
    // Right click: the item's sheet, a check's modifier, one Fate Point less.
    root.addEventListener("contextmenu", event => this.#onContext(event));
    // The description joins the tooltip on hover (built once per item version).
    root.addEventListener("pointerenter", event => this.#onHover(event), { capture: true });
    // Buttons don't keep the focus: the core shortcuts (Escape, the hotbar numbers…) keep working.
    root.addEventListener("click", () => setTimeout(() => {
      if (root.contains(document.activeElement)) document.activeElement.blur();
    }));
  }

  /** @override */
  async _onRender(context, options) {
    await super._onRender(context, options);
    this.panel = context.panel?.id ?? null;
    this.element.classList.toggle("collapsed", this.collapsed);
    this.element.classList.toggle("open", !!context.panel);
    syncHotbar();
    this.fit();
  }

  /**
   * Fit the bar in the free space of the bottom column: between the players list and the chat box that floats in the
   * corner when the sidebar is collapsed, when they sit at the bar's height (with the macro hotbar hidden, the bar is
   * at the bottom of the screen), and short of the open sidebar. Narrower layouts first (icon-only panel buttons, then the name in the portrait,
   * then fewer pins); if it still doesn't fit beside them, the bar rises above them with the whole column; then it
   * stays centered, or slides into the free space.
   */
  fit() {
    const el = this.element;
    if (!el?.isConnected) return;
    el.style.translate = el.style.maxWidth = el.style.marginBottom = "";
    // The interface may be scaled (--ui-scale): page pixels → layout pixels.
    const scale = (el.getBoundingClientRect().width / el.offsetWidth) || 1;
    let span = freeSpan(el);
    if (!this.#fitIn((span.right - span.left) / scale, !span.lift) && span.lift) {
      const margin = parseFloat(getComputedStyle(el).marginBottom) || 0;
      el.style.marginBottom = `${Math.ceil(margin + (span.lift / scale))}px`;
      span = freeSpan(el);
      this.#fitIn((span.right - span.left) / scale, true);
    }
    // Centered when it fits between the neighbours, else slid into the free space.
    const box = el.getBoundingClientRect();
    const left = Math.clamp(box.left, span.left, Math.max(span.left, span.right - box.width));
    if (Math.abs(left - box.left) > 0.5) el.style.translate = `${Math.round((left - box.left) / scale)}px 0`;
  }

  /**
   * Fit the bar in a width (layout pixels): narrow, then tiny, then fewer pins, then (squeeze) without the column of
   * Fate, Hate and Fatigue.
   * @param {number} room
   * @param {boolean} squeeze   Whether this is the last try (the bar can't rise any higher).
   * @returns {boolean}   Whether it fits.
   */
  #fitIn(room, squeeze) {
    const el = this.element;
    room = Math.max(0, Math.floor(room));
    el.style.maxWidth = `${room}px`;
    el.classList.remove("narrow", "tiny", "micro");
    const bar = el.querySelector(".lhh-bar");
    const name = el.querySelector(".lhh-name");
    // The bar is as wide as its content up to the room; past that its parts are squeezed (scrollWidth grows).
    const overflows = () => (el.offsetWidth > room + 1) || (bar && (bar.scrollWidth > bar.clientWidth + 1))
      || [...el.querySelectorAll(".lhh-side, .lhh-main")].some(part => part.scrollWidth > part.clientWidth + 1)
      || (name && (name.offsetParent !== null) && (name.scrollWidth > name.clientWidth + 1));
    for (const size of ["narrow", "tiny"]) {
      if (!overflows()) break;
      el.classList.add(size);
    }
    // Still too wide: the last pinned shortcuts wait off the bar.
    const pins = [...el.querySelectorAll(".lhh-pinned")];
    for (const pin of pins) pin.hidden = false;
    while (pins.length && overflows()) pins.pop().hidden = true;
    // Last resort (the smallest screens with the sidebar open): the resources stay on the sheet.
    if (squeeze && overflows()) el.classList.add("micro");
    return !overflows();
  }

  /** @override */
  _onClose(options) {
    super._onClose(options);
    syncHotbar();
    const active = game.tooltip.element;
    if (active && !document.body.contains(active)) game.tooltip.deactivate();
  }

  async #onHover(event) {
    const row = event.target.closest?.("[data-tip-item]");
    if (!row || row.dataset.tipFull) return;
    const item = this.actor?.items.get(row.dataset.tipItem);
    if (!item) return;
    const key = `${item.uuid}@${item._stats?.modifiedTime ?? 0}`;
    let description = this.#descriptions.get(key);
    if (description === undefined) {
      description = await descriptionHTML(item);
      this.#descriptions.set(key, description);
      if (this.#descriptions.size > 200) this.#descriptions.delete(this.#descriptions.keys().next().value);
    }
    if (!row.isConnected) return;
    const html = `${row.dataset.tooltipHtml ?? ""}${description}`;
    row.dataset.tooltipHtml = html;
    row.dataset.tipFull = "1";
    if (game.tooltip.element === row) game.tooltip.activate(row, { html });
  }

  /** Open a panel (or close it when it is the open one). */
  togglePanel(id) {
    if (!this.actor) return false;
    this.panel = (this.panel === id) ? null : id;
    if (this.collapsed) game.settings.set(SYSTEM_ID, "hudCollapsed", false);
    this.render();
    return true;
  }

  /** Close the panel (clicks on the board, Escape). */
  closePanel() {
    if (!this.panel) return false;
    this.panel = null;
    this.render();
    return true;
  }

  /* -------------------------------------------- */
  /*  Actions                                     */
  /* -------------------------------------------- */

  static #onPanel(event, target) {
    this.togglePanel(target.dataset.panel);
  }

  static #onClose() {
    this.closePanel();
  }

  static async #onCollapse() {
    this.panel = null;
    await game.settings.set(SYSTEM_ID, "hudCollapsed", !this.collapsed);
    this.render();
  }

  static #onSheet() {
    this.actor?.sheet?.render({ force: true });
  }

  /** Roll a check; Shift asks for a modifier first (as the sheet does). */
  static #onCheck(event, target) {
    return rollActorCheck(this.actor, this.token, target.dataset.check, { ask: event.shiftKey });
  }

  /** Use a skill (Shift: and roll its Check) or a usable item. */
  static async #onUse(event, target) {
    const item = this.actor?.items.get(target.closest("[data-item-id]")?.dataset.itemId);
    if (!item) return;
    if (item.type === "usable") {
      if (await checkUsable(item)) await useItem(item);
      return;
    }
    const message = await item.ItemThrow();
    if (message && event.shiftKey && (item.type === "skill")) await rollCheck(item, message);
  }

  /** Pin / unpin a shortcut on the bar. */
  static async #onPin(event, target) {
    const holder = pinHolder(this.actor);
    if (!holder?.isOwner) return;
    const pin = target.dataset.pin;
    const pins = pinsOf(this.actor);
    const next = pins.includes(pin) ? pins.filter(p => p !== pin) : [...pins, pin];
    if (next.length > MAX_PINS) return ui.notifications.warn(L("Hud.PinsFull", { n: MAX_PINS }));
    await holder.setFlag(SYSTEM_ID, "hud", { pins: next });
  }

  /** Fate stars: click +1 (up to the maximum), right click −1, as on the sheet. */
  static #onFate() {
    return setFate(this.actor, 1);
  }

  /** Join the combat of the scene, with the actor's Initiative. */
  static async #onJoin() {
    const token = this.token;
    if (!token?.document) return ui.notifications.warn(L("Hud.NoToken"));
    try {
      await token.document.toggleCombatant({ active: true });
      const combat = game.combats.viewed;
      const combatant = combat && combatantOf(combat, this.actor);
      if (combatant && (combatant.initiative === null)) await combat.rollInitiative([combatant.id]);
    }
    catch (err) {
      console.error(`${SYSTEM_ID} | Could not join the combat`, err);
      ui.notifications.warn(L("Hud.JoinFailed"));
    }
  }

  /** End the Main Process (the GM carries out a player's request). */
  static #onEndTurn() {
    return combatOf(this.actor)?.nextTurn();
  }

  static #onStandby() {
    return combatOf(this.actor)?.declareStandby?.();
  }

  /**
   * Roll a pending Dodge Check through the attack card's own button: the card is rendered off-screen, which runs
   * the system's listeners, and its button rolls and records the dodge as from the chat.
   */
  static async #onDodge(event, target) {
    const message = game.messages.get(target.dataset.messageId);
    if (!message) return;
    target.disabled = true;
    const html = await message.renderHTML();
    const button = html.querySelector(`.lh-target[data-index="${target.dataset.index}"] .lh-roll-dodge`);
    if (!button) {
      target.disabled = false;
      return ui.notifications.warn(L("Hud.DodgeMissing"));
    }
    button.click();
    // The card is updated through the GM: if none answers, the button comes back.
    setTimeout(() => { if (target.isConnected) target.disabled = false; }, 4000);
  }

  static #onRemoveBad() {
    return removeBadStatus(this.actor);
  }

  static async #onStatusOff(event, target) {
    const actor = this.actor;
    const id = target.closest("[data-status]")?.dataset.status;
    if (!actor?.isOwner || !id) return;
    if (id === "fatigue") return actor.update({ "system.infos.fatigue": 0 });
    return removeStatuses(actor, [id]);
  }

  /** End a status with the action of the Main Process it takes (conditions/recovery.mjs). */
  static async #onStatusRecover(event, target) {
    const id = target.closest("[data-status]")?.dataset.status;
    if (this.actor?.isOwner && id) return recover(this.actor, id);
  }

  static async #onEffectOff(event, target) {
    const effect = await fromUuid(target.closest("[data-effect-uuid]")?.dataset.effectUuid ?? "");
    if (effect?.isOwner) return effect.delete();
  }

  /** The manual Kuden Resource: a pip sets the value (the last lit one takes one off). */
  static #onResource(event, target) {
    const actor = this.actor;
    const current = resourceOf(actor)?.value ?? 0;
    const value = Number(target.dataset.value) || 0;
    return setResource(actor, (value === current) ? value - 1 : value);
  }

  /** Right click: the sheet of an item; the modifier of a check; one Fate Point less. */
  #onContext(event) {
    if (event.target.closest(".lhh-fate")) {
      event.preventDefault();
      return setFate(this.actor, -1);
    }
    const check = event.target.closest("[data-action='lhh-check']");
    if (check) {
      event.preventDefault();
      return rollActorCheck(this.actor, this.token, check.dataset.check, { ask: true });
    }
    const row = event.target.closest("[data-item-id]");
    const item = row && this.actor?.items.get(row.dataset.itemId);
    if (item) {
      event.preventDefault();
      item.sheet?.render({ force: true });
    }
  }
}

/* -------------------------------------------- */
/*  Helpers                                     */
/* -------------------------------------------- */

/**
 * Who the HUD shows: the last controlled token the user owns, else (players) their character.
 * @returns {{token: Token|null, actor: Actor|null}}
 */
function pickActor() {
  const token = canvas?.ready ? canvas.tokens.controlled.at(-1) : null;
  if (token?.actor?.isOwner) return { token, actor: token.actor };
  if (!game.user.isGM && setting("hudCharacter")) {
    const actor = game.user.character;
    if (actor?.isOwner) return { token: actor.getActiveTokens()[0] ?? null, actor };
  }
  return { token: null, actor: null };
}

/** Gap kept between the bar and its neighbours, in page pixels. */
const GAP = 10;

/**
 * The free horizontal span of the bottom column at the bar's height (page pixels): the column, minus the players
 * list on the left and the chat box on the right when they overlap the bar's band, and short of the sidebar; `lift`
 * is how much higher the bar must go to clear the first two (0 when nothing is beside it).
 * @param {HTMLElement} el   The HUD element
 */
function freeSpan(el) {
  const column = el.parentElement?.getBoundingClientRect() ?? { left: 0, right: window.innerWidth };
  const band = el.getBoundingClientRect();
  let left = column.left, right = column.right, lift = 0;
  const beside = rect => rect && rect.width && rect.height && (rect.top < band.bottom) && (rect.bottom > band.top);
  const chat = document.getElementById("chat-message")?.getBoundingClientRect();
  if (beside(chat) && (chat.left < right)) {
    right = Math.min(right, chat.left - GAP);
    lift = Math.max(lift, band.bottom - chat.top + GAP);
  }
  const players = document.getElementById("players")?.getBoundingClientRect();
  if (beside(players) && (players.right > left)) {
    left = Math.max(left, players.right + GAP);
    lift = Math.max(lift, band.bottom - players.top + GAP);
  }
  // The middle column doesn't shrink for the open sidebar, which covers its right end (it runs the full height: no lift).
  const sidebar = document.getElementById("sidebar")?.getBoundingClientRect();
  if (sidebar?.width && (sidebar.left < right)) right = Math.min(right, sidebar.left - GAP);
  return { left, right: Math.max(left, right), lift };
}

/** The core macro hotbar hidden (body class) as the "hotbar" setting says: always, or while the HUD is shown. */
function syncHotbar() {
  const mode = setting("hotbar");
  const shown = !!(hud?.rendered && hud.actor);
  document.body.classList.toggle("lhauto-no-hotbar", (mode === "hide") || ((mode === "swap") && shown));
}

/** +1 / −1 Fate Point of a character (never above its maximum). */
async function setFate(actor, delta) {
  if ((actor?.type !== "character") || !actor.isOwner) return;
  const value = toInt(actor._source.system.fate?.value), max = toInt(actor.system.fate?.max);
  const next = Math.max(0, value + delta);
  if ((delta > 0) && max && (next > max)) return;
  if (next !== value) await actor.update({ "system.fate.value": next });
}

/**
 * Roll a check of an actor as its sheet does: "Ability Score Check - Athletics", the situational modifier asked
 * first when `ask`.
 * @param {Actor} actor
 * @param {Token|null} token
 * @param {string} key
 * @param {{ask?: boolean}} [options]
 */
export async function rollActorCheck(actor, token, key, { ask = false } = {}) {
  const check = checkOf(actor, key);
  if (!check) return null;
  const title = `${game.i18n.localize("ETERNIA.WindowTitle.AbilityCheck")} - ${check.label}`;
  let mod = 0;
  if (ask) {
    mod = await foundry.applications.api.DialogV2.prompt({
      window: { title },
      content: await foundry.applications.handlebars.renderTemplate("systems/eternia/templates/dialogs/rollDialog.html"),
      ok: {
        icon: "fas fa-dice",
        label: game.i18n.localize("ETERNIA.ButtonLabel.Roll"),
        callback: (event, button) => Number(button.form.elements.mod.value) || 0
      },
      rejectClose: false
    });
    if (mod === null) return null;
  }
  // The actor's conditions (conditions/rolls.mjs)
  const condition = checkModifier(actor, { stat: key });
  const message = await new Roll(diceFormula(applyModifier({ dice: check.dice, mod: check.mod + mod }, condition))).toMessage({
    speaker: ChatMessage.getSpeaker({ actor, token: token?.document }),
    flavor: condition.text ? `${title} (${condition.text})` : title
  });
  await consumeAfterRoll(actor, condition.consume);
  return message;
}

/* -------------------------------------------- */
/*  Registration                                */
/* -------------------------------------------- */

let hud = null;

/** The HUD of this window (null before `ready`). */
export const actionHud = () => hud;

/** Call during the `init` hook. */
export function registerHud() {
  game.settings.register(SYSTEM_ID, "hud", {
    name: "ETERNIA.Settings.hud.Name",
    hint: "ETERNIA.Settings.hud.Hint",
    scope: "client",
    config: true,
    type: Boolean,
    default: true,
    onChange: () => hud?.refresh()
  });
  game.settings.register(SYSTEM_ID, "hudCharacter", {
    name: "ETERNIA.Settings.hudCharacter.Name",
    hint: "ETERNIA.Settings.hudCharacter.Hint",
    scope: "client",
    config: true,
    type: Boolean,
    default: true,
    onChange: () => hud?.refresh()
  });
  game.settings.register(SYSTEM_ID, "hotbar", {
    name: "ETERNIA.Settings.hotbar.Name",
    hint: "ETERNIA.Settings.hotbar.Hint",
    scope: "client",
    config: true,
    type: String,
    choices: {
      hide: "ETERNIA.Settings.hotbar.hide",
      swap: "ETERNIA.Settings.hotbar.swap",
      show: "ETERNIA.Settings.hotbar.show"
    },
    default: "hide",
    onChange: () => {
      syncHotbar();
      hud?.fit();
    }
  });
  game.settings.register(SYSTEM_ID, "hudCollapsed", { scope: "client", config: false, type: Boolean, default: false });
  foundry.applications.handlebars.loadTemplates([`${DIR}/hud.hbs`, `${DIR}/panel.hbs`, `${DIR}/row.hbs`]);

  // Keys: Escape closes the open panel (before the core releases the tokens); the others have no default key.
  const { PRIORITY, NORMAL } = CONST.KEYBINDING_PRECEDENCE;
  game.keybindings.register(SYSTEM_ID, "hudDismiss", {
    name: "ETERNIA.Keys.hudDismiss",
    editable: [{ key: "Escape" }],
    onDown: () => !!hud?.closePanel(),
    precedence: PRIORITY
  });
  game.keybindings.register(SYSTEM_ID, "hudToggle", {
    name: "ETERNIA.Keys.hudToggle",
    editable: [],
    onDown: () => {
      game.settings.set(SYSTEM_ID, "hudCollapsed", !setting("hudCollapsed")).then(() => hud?.refresh());
      return true;
    },
    precedence: NORMAL
  });
  for (const { id } of PANELS) {
    game.keybindings.register(SYSTEM_ID, `hudPanel.${id}`, {
      name: `ETERNIA.Keys.hudPanel.${id}`,
      editable: [],
      onDown: () => !!hud?.togglePanel(id),
      precedence: NORMAL
    });
  }

  Hooks.once("ready", () => {
    hud = new ActionHud();
    hud.refresh();
    syncHotbar();
    window.addEventListener("resize", foundry.utils.debounce(() => hud.fit(), 150));
    // The chat box floats in the corner only while the sidebar is collapsed.
    Hooks.on("collapseSidebar", () => setTimeout(() => hud.fit(), 350));
    // A click on the board closes the open panel (not while targeting: the target of the skill is being picked).
    document.getElementById("board")?.addEventListener("pointerdown", () => {
      const tool = ui.controls?.tool?.name ?? game.activeTool;
      if (tool !== "target") hud.closePanel();
    });
  });

  const refresh = () => hud?.refresh();
  const ifShown = actor => { if (hud?.shows(actor)) hud.refresh(); };
  const ownerOf = doc => ((doc?.parent instanceof Actor) ? doc.parent : ((doc?.parent?.parent instanceof Actor) ? doc.parent.parent : null));
  // Attack cards: the Dodge Checks of the actor shown.
  const onAttack = message => { if (hud?.actor && message.flags?.eternia?.attack) hud.refresh(); };

  for (const hook of ["controlToken", "canvasReady", "deleteToken", "createCombat", "updateCombat", "deleteCombat",
    "createCombatant", "updateCombatant", "deleteCombatant", "combatTurnChange", "eternia.combatPhase"]) Hooks.on(hook, refresh);
  Hooks.on("updateActor", ifShown);
  for (const hook of ["createItem", "updateItem", "deleteItem"]) Hooks.on(hook, item => ifShown(item.parent));
  for (const hook of ["createActiveEffect", "updateActiveEffect", "deleteActiveEffect"]) Hooks.on(hook, effect => ifShown(ownerOf(effect)));
  Hooks.on("updateToken", doc => { if (hud?.token?.document === doc) hud.refresh(); });
  Hooks.on("updateUser", user => { if (user.isSelf) hud?.refresh(); });
  for (const hook of ["createChatMessage", "updateChatMessage", "deleteChatMessage"]) Hooks.on(hook, onAttack);
  // The Kuden Resource may follow the hour of the scene.
  Hooks.on("updateScene", scene => { if (hud?.actor && (scene === canvas?.scene)) hud.refresh(); });
}
