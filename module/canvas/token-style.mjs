/**
 * Token look in the style of the sheet: the resource bars and the nameplate drawn here (the system's Token class,
 * extended).
 *
 * - HP bar (the "health" attribute): an arc with a gold edge along the top of the token's gold ring, filling from left
 *   to right, so nothing sticks out of the token for its neighbours to cover. The fill is the crimson of the sheet; the
 *   Fatigue is a hatched stretch at its end (the maximum HP it takes away); the Barrier a steel-blue sliver just outside
 *   (it absorbs the damage first). Faint marks at each quarter.
 * - The first bar goes on the top of the token and the second on the bottom: a value bar as an arc along the ring,
 *   Fate (the "fate" attribute, or a small count on the second bar) as gold diamonds on the edge, filled or hollow. With
 *   the system's bars (HP and Fate), the HP arc on top and the Fate diamonds on the bottom edge.
 * - Any other attribute: the same arc in green.
 * - Class Motor (module/classes/): a small row of gold diamonds near the bottom of the token with a disc for its state
 *   (green sheathed, crimson drawn, for the Samurai), the diamonds glowing when the next strike is a Perfect Cut.
 *   It follows the core redraw of the status icons, which every change of the actor or its items sets off.
 * - Nameplate: the name small and light right under the token's edge (under the Fate diamonds when they show), with a
 *   soft dark edge that keeps it easy to read on any map; long names end in "…". The elevation tooltip has the same
 *   look. Whether it shows is the token's own setting (canvas/token-defaults.mjs makes it "always").
 * - Who sees the HP bar (setting "tokenBars"): everyone always; everyone, but the players see an enemy's only once it
 *   is [Identified]; or each token's own setting. The second bar always follows each token's own setting.
 * - Out of combat (setting "tokenBarsCombat") the HP bar and the Motor hide: they show on the tokens in the combat.
 * Everything is redrawn when the settings change; the core look comes back with "tokenStyle" off.
 */
import { SYSTEM_ID, setting } from "../settings.mjs";
import { motorData, motorMax, motorsOf } from "../classes/motor.mjs";
import { hideLanding } from "./status-animation.mjs";

const FONT = "Eternia Eczar";
const COLORS = {
  ink: 0x0d0906,
  track: 0x2a1813,
  hp: 0xb8261b,
  hpLow: 0xd8402a,
  fatigue: 0x4b4136,
  hatch: 0x8f8170,
  barrier: 0xa9cfe0,
  gold: 0xcdb879,
  goldBright: 0xe5c25a,
  goldDeep: 0x4a3510,
  green: 0x2f7a52,
  text: 0xf4ead0
};
/** Colour of the state disc of a class Motor (the first state is the resting one). */
const MOTOR_STATES = { sheathed: COLORS.green, drawn: COLORS.hp };

/** The arc bars: the radius they run on (a share of the token's radius: over the gold ring of the frame) and half the
 * angle they span, around the top or the bottom of the token. */
const ARC_RADIUS = 0.955;
const ARC_HALF = 0.34 * Math.PI;
/** Half the height of a Fate diamond (drawPips), at UI scale 1. */
const PIP_RADIUS = 3.6;
/** How far under the token's edge the capitals of the name start, at UI scale 1. */
const NAME_GAP = 2;

const styled = () => setting("tokenStyle") !== false;

/** Whether a token shows its HP bar and Motor now: always, or only while it is in the combat ("tokenBarsCombat"). */
const inPlay = token => (setting("tokenBarsCombat") === false) || !!token.inCombat;

/** Call during the `init` hook, after the settings. */
export function registerTokens() {
  // The serif of the sheet, loaded with the game, so the HUD shows it at once (the CSS ones only load when a page
  // uses them).
  const url = file => `systems/eternia/assets/fonts/eczar/${file}`;
  CONFIG.fontDefinitions[FONT] ??= {
    editor: false,
    fonts: [
      { urls: [url("Eczar-Regular.woff2")], weight: "400" },
      { urls: [url("Eczar-Medium.woff2")], weight: "500" },
      { urls: [url("Eczar-SemiBold.woff2")], weight: "600" },
      { urls: [url("Eczar-Bold.woff2")], weight: "700" }
    ]
  };

  CONFIG.Token.objectClass = tokenClass(CONFIG.Token.objectClass);

  // Barrier and Fatigue are not the bar's attribute: redraw the bars when they change.
  Hooks.on("updateActor", (actor, changes) => {
    const bad = foundry.utils.hasProperty(changes, "system.bad-status.barrier");
    const fatigue = foundry.utils.hasProperty(changes, "system.infos.fatigue");
    if (bad || fatigue) redraw(actor.getActiveTokens(), { refreshBars: true });
  });
  // [Identified] shows an enemy's HP bar to the players (setting "tokenBars").
  const onStatus = effect => {
    if (!effect.statuses?.has("identified")) return;
    const actor = effect.parent;
    if (actor instanceof Actor) redraw(actor.getActiveTokens(), { refreshState: true, refreshNameplate: true });
  };
  Hooks.on("createActiveEffect", onStatus);
  Hooks.on("deleteActiveEffect", onStatus);
  // Settings changed (settings.mjs): every token again.
  Hooks.on("eterniaTokenStyle", () => redraw(canvas?.tokens?.placeables ?? [],
    { refreshBars: true, refreshNameplate: true, refreshState: true, refreshTooltip: true, refreshEffects: true }));
  // Joining or leaving the combat shows or hides the HP bar and the Motor (setting "tokenBarsCombat").
  const combatChanged = () => redraw(canvas?.tokens?.placeables ?? [], { refreshState: true });
  for (const hook of ["createCombat", "deleteCombat", "createCombatant", "deleteCombatant"]) Hooks.on(hook, combatChanged);
  Hooks.on("updateCombat", (combat, changes) => {
    if (("active" in changes) || ("scene" in changes)) combatChanged();
  });
}

/** Ask these tokens to refresh some of their parts. */
function redraw(tokens, flags) {
  for (const token of tokens) token?.renderFlags?.set(flags);
}

/* -------------------------------------------- */
/*  Who sees the HP bar                         */
/* -------------------------------------------- */

/**
 * Whether the user sees a token's HP bar: true / false, or null to follow the token's own setting. Never out of combat
 * while "tokenBarsCombat" is on.
 * @param {Token} token
 */
function hpBarPolicy(token) {
  if (!inPlay(token)) return false;
  const mode = setting("tokenBars");
  if (mode === "always") return true;
  if (mode !== "identified") return null;
  const actor = token.actor;
  if (game.user.isGM || token.document.isOwner || (actor?.type === "character")) return true;
  return !!actor?.statuses?.has("identified");
}

/* -------------------------------------------- */
/*  Drawing                                     */
/* -------------------------------------------- */

/** A diamond centred on (x, y) with a half-diagonal of r. */
function diamond(g, x, y, r) {
  g.drawPolygon([x, y - r, x + r, y, x, y + r, x - r, y]);
}

/** A stroke along a circle from angle a0 to a1 (either way round), with round ends; nothing when it has no length. */
function strokeArc(g, cx, cy, r, a0, a1, width, color, alpha = 1) {
  if ((Math.abs(a1 - a0) < 1e-3) || (width <= 0)) return;
  g.lineStyle({ width, color, alpha, cap: PIXI.LINE_CAP.ROUND });
  g.moveTo(cx + (r * Math.cos(a0)), cy + (r * Math.sin(a0)));
  g.arc(cx, cy, r, a0, a1, a1 < a0);
  g.lineStyle(0);
}

/** A short line across the bar at angle a, from radius r0 to r1 (r1 at angle a1, for a slant). */
function crossLine(g, cx, cy, a, r0, r1, a1 = a) {
  g.moveTo(cx + (r0 * Math.cos(a)), cy + (r0 * Math.sin(a))).lineTo(cx + (r1 * Math.cos(a1)), cy + (r1 * Math.sin(a1)));
}

/**
 * The HP bar (or any value / max bar) as an arc along the token's ring, filling from left to right: gold edge, track,
 * Fatigue, fill, quarter marks, Barrier.
 * @param {PIXI.Graphics} g
 * @param {number} cx       The token's centre, x
 * @param {number} cy       The token's centre, y
 * @param {number} r        The radius the bar runs on
 * @param {number} w        Thickness of the track (the gold edge adds one UI unit on each side)
 * @param {number} s        UI scale
 * @param {boolean} top     Around the top of the token (else around the bottom)
 * @param {object} data     { value, max, fatigue, barrier, color, low }
 * @returns {number}        The outermost radius drawn
 */
function drawArcBar(g, cx, cy, r, w, s, top, { value, max, fatigue = 0, barrier = 0, color = COLORS.hp, low = COLORS.hpLow }) {
  const full = Math.max(1, max + fatigue);
  const hp = Math.clamp(value, 0, max);
  // Left end to right end: clockwise over the top, counterclockwise under the bottom
  const mid = top ? 1.5 * Math.PI : 0.5 * Math.PI;
  const a0 = top ? mid - ARC_HALF : mid + ARC_HALF;
  const span = (top ? 2 : -2) * ARC_HALF;
  const at = f => a0 + (span * f);
  const iw = w - (2 * s);

  // Shadow, gold edge, track
  strokeArc(g, cx, cy + s, r, a0, at(1), w + (2 * s), 0x000000, 0.45);
  strokeArc(g, cx, cy, r, a0, at(1), w + (2 * s), COLORS.gold, 0.9);
  strokeArc(g, cx, cy, r, a0, at(1), w, COLORS.track, 0.95);

  // Fatigue: the end of the track, hatched
  const fatigueShare = fatigue / full;
  if (fatigueShare > 0) {
    const from = at(1 - fatigueShare);
    strokeArc(g, cx, cy, r, from, at(1), iw, COLORS.fatigue, 0.95);
    g.lineStyle(Math.max(1, 0.75 * s), COLORS.hatch, 0.55);
    const step = (3 * s) / r, slant = iw / r;
    const dir = Math.sign(span);
    // Slanted lines across the stretch, while their far end stays inside it
    for (let a = from; ((a + (dir * slant)) - at(1)) * dir <= 0; a += dir * step) {
      crossLine(g, cx, cy, a, r - (iw / 2), r + (iw / 2), a + (dir * slant));
    }
    g.lineStyle(0);
  }

  // Fill, with a faint light on its upper side (the outside on the top, the inside on the bottom)
  const share = hp / full;
  const fill = (max && (hp <= max / 4)) ? low : color;
  strokeArc(g, cx, cy, r, a0, at(share), iw, fill, 1);
  strokeArc(g, cx, cy, r + ((top ? 1 : -1) * iw * 0.22), a0, at(share), iw * 0.3, 0xffffff, 0.16);

  // Quarter marks
  if (r * Math.abs(span) >= 48 * s) {
    g.lineStyle(Math.max(1, 0.75 * s), COLORS.ink, 0.35);
    for (const q of [0.25, 0.5, 0.75]) crossLine(g, cx, cy, at(q), r - (iw / 2) + s, r + (iw / 2) - s);
    g.lineStyle(0);
  }

  // Barrier: a sliver just outside, as long as its share of the maximum HP
  let outer = r + (w / 2) + s;
  if (barrier > 0) {
    const h = 3 * s;
    const rb = outer + (1.5 * s) + (h / 2);
    const length = Math.max(Math.min(1, barrier / Math.max(1, max)), (6 * s) / (r * Math.abs(span)));
    strokeArc(g, cx, cy, rb, a0, at(length), h + (1.5 * s), COLORS.ink, 0.8);
    strokeArc(g, cx, cy, rb, a0, at(length), h, COLORS.barrier, 1);
    outer = rb + (h / 2) + s;
  }
  return outer;
}

/**
 * Fate (or any small count): gold diamonds centred on y = 0.
 * @returns {number}   The width of the row
 */
function drawPips(g, value, max, s) {
  const r = PIP_RADIUS * s, gap = 2.6 * s;
  const n = Math.clamp(Math.max(max, value), 0, 10);
  const width = (n * 2 * r) + ((n - 1) * gap);
  for (let i = 0; i < n; i++) {
    const x = r + (i * ((2 * r) + gap));
    if (i < value) {
      g.lineStyle(Math.max(1, s), COLORS.goldDeep, 0.95).beginFill(COLORS.goldBright, 1);
      diamond(g, x, 0, r);
      g.endFill().lineStyle(0).beginFill(0xffffff, 0.35);
      diamond(g, x, -r * 0.35, r * 0.35);
      g.endFill();
    }
    else {
      g.lineStyle(Math.max(1, s), COLORS.gold, 0.85).beginFill(COLORS.track, 0.7);
      diamond(g, x, 0, r * 0.85);
      g.endFill().lineStyle(0);
    }
  }
  return width;
}

/** The text style of the nameplate and the elevation tooltip: small and light, with a soft dark edge. */
function nameStyle() {
  return new PIXI.TextStyle({
    fontFamily: ["Signika", "Roboto", "sans-serif"],
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: 0.3,
    fill: COLORS.text,
    stroke: COLORS.ink,
    strokeThickness: 3,
    lineJoin: "round",
    dropShadow: true,
    dropShadowColor: 0x000000,
    dropShadowAlpha: 0.45,
    dropShadowBlur: 4,
    dropShadowDistance: 0,
    align: "center",
    padding: 4
  });
}

/** The name cut with "…" to fit a width (in text pixels). */
function fitName(name, style, width) {
  const measure = text => PIXI.TextMetrics.measureText(text, style).width;
  if (measure(name) <= width) return name;
  let text = name;
  while (text.length > 1 && (measure(`${text}…`) > width)) text = text.slice(0, -1).trimEnd();
  return `${text}…`;
}

/* -------------------------------------------- */
/*  Token class                                 */
/* -------------------------------------------- */

/**
 * The styled Token class, on top of the class already configured (EterniaToken).
 * @param {typeof foundry.canvas.placeables.Token} Base
 */
function tokenClass(Base) {
  return class EterniaStyledToken extends Base {

    /** How far the second bar hangs below the token's edge (the Fate diamonds), for the nameplate under it. */
    lhBottom = 0;

    /** The class Motor's diamonds (module/classes/). */
    lhMotor = null;

    /** @override Each status icon knows its picture: the one still flying in (canvas/status-animation.mjs) waits hidden. */
    async _drawEffect(src, tint) {
      const icon = await super._drawEffect(src, tint);
      if (icon) icon.lhSrc = src;
      return icon;
    }

    /** @override Core redraws the status icons on every change of the actor or its items: the Motor follows. */
    _refreshEffects() {
      super._refreshEffects();
      if (styled()) this.#layoutEffects();
      hideLanding(this);
      this.#drawMotor();
    }

    /** Where the arc bars run on this token: its centre, the radius and the thickness of the track. */
    #arcShape() {
      const { width, height } = this.document.getSize();
      const s = canvas.dimensions.uiScale;
      return {
        cx: width / 2, cy: height / 2,
        r: ARC_RADIUS * Math.min(width, height) / 2,
        w: (this.document.height >= 2 ? 9 : 7.2) * s
      };
    }

    /**
     * The status icons in columns from the left edge, as core lays them out, but starting under the left end of the HP
     * arc (core starts them at the top-left corner, where the arc runs). Always there, so they don't move when the
     * token joins a combat and the arc shows.
     */
    #layoutEffects() {
      const s = canvas.dimensions.uiScale;
      const size = 20 * s;
      const { height } = this.document.getSize();
      const { cy, r, w } = this.#arcShape();
      const top = Math.ceil(cy - (r * Math.cos(ARC_HALF)) + (w / 2) + (2 * s));
      const rows = Math.max(1, Math.floor(((height - top) / size) + 1e-6));
      const bg = this.effects.bg.clear().beginFill(0x000000, 0.40).lineStyle(s, 0x000000);
      let i = 0;
      for (const effect of this.effects.children) {
        if ((effect === bg) || (effect === this.effects.overlay)) continue;
        effect.x = Math.floor(i / rows) * size;
        effect.y = top + ((i % rows) * size);
        bg.drawRoundedRect(effect.x + s, effect.y + s, size - (2 * s), size - (2 * s), 2 * s);
        i++;
      }
    }

    /** The first class Motor of a character: its points as diamonds near the bottom of the token, its state as a disc. */
    #drawMotor() {
      if (!this.lhMotor || this.lhMotor.destroyed) this.lhMotor = this.addChild(new PIXI.Graphics());
      const g = this.lhMotor;
      g.clear();
      g.zIndex = 4;
      const motor = (styled() && (this.actor?.type === "character")) ? motorsOf(this.actor)[0] : null;
      const max = motor ? motorMax(this.actor, motor.def.id) : 0;
      g.visible = !!max && !this.document.isSecret && inPlay(this);
      if (!g.visible) return;
      const data = motorData(this.actor, motor.def.id);
      const ready = !!motor.def.display?.(this.actor, { lesser: motor.lesser, data, max })?.ready;
      const s = canvas.dimensions.uiScale;
      const { width, height } = this.document.getSize();
      const pips = new PIXI.Graphics();
      const w = drawPips(pips, Math.clamp(Number(data.value) || 0, 0, max), max, s);
      const d = 4.2 * s;
      // State disc at the left end of the row
      g.lineStyle(Math.max(1, s), COLORS.ink, 0.85).beginFill(COLORS.gold, 1).drawCircle(d, 0, d).endFill();
      g.lineStyle(0).beginFill(motor.def.stateColors?.[data.state] ?? MOTOR_STATES[data.state] ?? COLORS.green, 1).drawCircle(d, 0, d * 0.62).endFill();
      if (ready) {
        g.lineStyle(Math.max(1, 1.4 * s), COLORS.goldBright, 0.9).drawRoundedRect((2 * d) + (2 * s), -5 * s, w + (6 * s), 10 * s, 5 * s);
        g.lineStyle(0);
      }
      pips.position.set((2 * d) + (5 * s), 0);
      g.addChild(pips);
      for (const child of g.children.slice(0, -1)) child.destroy();
      const bh = Math.round((this.document.height >= 2 ? 10 : 8) * s);
      const total = (2 * d) + (5 * s) + w;
      g.position.set((width - total) / 2, height - (bh / 2) - (10 * s));
    }

    /** @override Every bar with data is drawn; who sees them is decided in _refreshState. */
    drawBars() {
      if (!styled()) return super.drawBars();
      if (!this.actor) return;
      this.lhBottom = 0;
      for (const [index, key] of ["bar1", "bar2"].entries()) {
        const bar = this.bars[key];
        const data = this.document[key];
        if (!data?.max) {
          bar.visible = false;
          continue;
        }
        this._drawBar(index, bar, data);
        bar.visible = true;
      }
      this.#layoutNameplate();
    }

    /** @override */
    _drawBar(index, bar, data) {
      if (!styled()) return super._drawBar(index, bar, data);
      const { width, height } = this.document.getSize();
      const s = canvas.dimensions.uiScale;
      const value = Number(data.value) || 0, max = Number(data.max) || 0;
      const bottom = index === 1;
      bar.clear();

      // Fate, or a small count on the second bar: diamonds, the first bar's on the top edge, the second's on the bottom
      if ((data.attribute === "fate") || (bottom && Number.isInteger(max) && (max <= 10))) {
        const w = drawPips(bar, value, max, s);
        bar.position.set((width - w) / 2, bottom ? height : 0);
        if (bottom) this.lhBottom = (PIP_RADIUS + 1) * s;
        return;
      }

      // A value bar: an arc along the ring, the first bar's over the top, the second's under the bottom
      const { cx, cy, r, w } = this.#arcShape();
      const health = data.attribute === "health";
      const system = this.actor?.system ?? {};
      const outer = drawArcBar(bar, cx, cy, r, w, s, !bottom, {
        value, max,
        fatigue: health ? Math.max(0, Number(system.infos?.fatigue) || 0) : 0,
        barrier: health ? Math.max(0, Number(system["bad-status"]?.barrier) || 0) : 0,
        color: health ? COLORS.hp : COLORS.green,
        low: health ? COLORS.hpLow : COLORS.green
      });
      bar.position.set(0, 0);
      if (bottom) this.lhBottom = Math.max(0, cy + outer - height) + s;
    }

    /** @override */
    _refreshNameplate() {
      if (!styled()) return super._refreshNameplate();
      const style = nameStyle();
      const s = canvas.dimensions.uiScale;
      const { width } = this.document.getSize();
      this.nameplate.style = style;
      this.nameplate.text = fitName(this.document.name ?? "", style, Math.max(width * 1.8, 120 * s) / s);
      this.#layoutNameplate();
    }

    /** @override */
    _refreshState() {
      super._refreshState();
      if (!styled()) {
        if (this.lhMotor) this.lhMotor.visible = false;
        return;
      }
      this.#drawMotor();
      // The HP bar by the system setting; the second bar by the token's own.
      const secret = this.document.isSecret;
      const own = this._canViewMode(this.document.displayBars);
      const policy = hpBarPolicy(this);
      const bar1 = this.bars.bar1, bar2 = this.bars.bar2;
      if (bar1) bar1.renderable = (policy ?? own);
      if (bar2) bar2.renderable = own;
      this.bars.visible = !secret && !!this.actor && !!(bar1?.renderable || bar2?.renderable);
      this.#layoutNameplate();
    }

    /** @override The elevation tooltip with the look of the nameplate. */
    _getTextStyle() {
      const style = super._getTextStyle();
      if (!styled()) return style;
      return Object.assign(nameStyle(), { wordWrapWidth: style.wordWrapWidth });
    }

    /** @override Core puts the nameplate back at its own place on a resize. */
    _refreshSize() {
      super._refreshSize();
      this.#layoutNameplate();
    }

    /**
     * The nameplate right under the token's edge, or under the second bar when it shows (the Fate diamonds): the
     * capitals start NAME_GAP below it. The text's box starts above them by half its outline and the room the font
     * keeps over the capitals (about 0.7 of the font size high).
     */
    #layoutNameplate() {
      if (!this.nameplate || !this.bars) return;
      this.bars.zIndex = 4;
      this.nameplate.zIndex = 3;
      if (!styled()) return;
      const s = canvas.dimensions.uiScale;
      const { width, height } = this.document.getSize();
      const bar2 = this.bars.bar2;
      const below = (this.bars.visible && bar2?.visible && bar2?.renderable) ? this.lhBottom : 0;
      const style = this.nameplate.style;
      const ascent = PIXI.TextMetrics.measureFont(style.toFontString()).ascent;
      const lift = ((style.strokeThickness ?? 0) / 2) + ascent - (0.7 * style.fontSize);
      this.nameplate.position.set(width / 2, height + below + ((NAME_GAP - lift) * s));
    }
  };
}
