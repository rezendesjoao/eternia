import { HIDDEN_STATUS } from "../helpers/statuses.mjs";

/**
 * Token with support for the [Hidden] status: the token disappears for every user that does not
 * own it, and is drawn semi-transparent for its owners and the GM.
 * @extends {foundry.canvas.placeables.Token}
 */
export class EterniaToken extends foundry.canvas.placeables.Token {

  /** Is the token under the [Hidden] status? */
  get isLHHidden() {
    return !!this.document.hasStatusEffect(HIDDEN_STATUS);
  }

  /** @override */
  get isVisible() {
    if (this.isLHHidden && !game.user.isGM && !this.document.isOwner) return false;
    return super.isVisible;
  }

  /** @override */
  _onClickLeft2(event) {
    // Players open piles (loot, chests, merchants) through the pile API, which
    // checks the interaction distance first. A merchant opens its counter for the GM too.
    const actor = this.actor;
    if ((actor?.type === "pile") && (!game.user.isGM || (actor.system.mode === "merchant"))) {
      if (!this._propagateLeftClick(event)) event.stopPropagation();
      return game.eternia.piles.openPile(this.actor);
    }
    return super._onClickLeft2(event);
  }

  /**
   * @override
   * A right-click on someone else's character (a player's) opens the duel's bubble (duels/ui.mjs) instead of nothing.
   */
  _canHUD(user, event) {
    if (super._canHUD(user, event)) return true;
    if (!this.layer.active || this.layer._draggedToken || canvas.regions?._placementContext || canvas.controls.ruler.active) return false;
    if (CONFIG.Canvas.rulerClass.canMeasure && (event?.type === "pointerdown")) return false;
    return !!game.eternia?.duels?.bubbleFor?.(this, user);
  }

  /** @override */
  _onClickRight(event) {
    if (!this.isOwner && game.eternia?.duels?.bubbleFor?.(this)) return game.eternia.duels.openBubble(this);
    return super._onClickRight(event);
  }

  /** @override: the bubble's right-click still reaches the canvas (a drag from it pans, as before) */
  _propagateRightClick(event) {
    return !this.isOwner || super._propagateRightClick(event);
  }

  /** @override */
  _getTargetAlpha() {
    const alpha = super._getTargetAlpha();
    return this.isLHHidden ? Math.min(alpha, 0.5) : alpha;
  }
}
