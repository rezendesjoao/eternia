/**
 * Token look in the style of the sheet: the resource bars and the nameplate drawn here (the system's Token class,
 * extended), with the fonts of the sheet loaded for the canvas.
 *
 * - HP bar (the "health" attribute): a slim pill with a gold edge, resting on the bottom edge of the token. The fill
 *   is the crimson of the sheet; the Fatigue is a hatched stretch at its end (the maximum HP it takes away); the
 *   Barrier a steel-blue sliver just above (it absorbs the damage first). Faint marks at each quarter.
 * - Fate (the "fate" attribute, or any small count): gold diamonds on the top edge, filled or hollow.
 * - Any other attribute: the same pill in green.
 * - Class Motor (module/classes/): a small row of gold diamonds just above the HP bar with a disc for its state
 *   (green sheathed, crimson drawn, for the Samurai), the diamonds glowing when the next strike is a Perfect Cut.
 *   It follows the core redraw of the status icons, which every change of the actor or its items sets off.
 * - Nameplate: the name in Eczar small caps on a small band in the colour of the disposition (green friendly, wine
 *   hostile, bronze neutral, grey secret), with a gold hairline and two gold diamonds at its ends; long names end in
 *   "…". The elevation tooltip uses the same font.
 * - Who sees the HP bar (setting "tokenBars"): everyone always; everyone, but the players see an enemy's only once it
 *   is [Identified]; or each token's own setting. The second bar always follows each token's own setting.
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

/** Band of the nameplate by token disposition (CONST.TOKEN_DISPOSITIONS). */
const BANDS = { 1: 0x1f5137, 0: 0x5c4a22, [-1]: 0x6b2420, [-2]: 0x3a3836 };

const styled = () => setting("tokenStyle") !== false;

/** Call during the `init` hook, after the settings. */
export function registerTokens() {
  // The fonts of the sheet, loaded before the canvas draws (the CSS ones only load when a page uses them).
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
    { refreshBars: true, refreshNameplate: true, refreshState: true, refreshTooltip: true }));
}

/** Ask these tokens to refresh some of their parts. */
function redraw(tokens, flags) {
  for (const token of tokens) token?.renderFlags?.set(flags);
}

/* -------------------------------------------- */
/*  Who sees the HP bar                         */
/* -------------------------------------------- */

/**
 * Whether the user sees a token's HP bar: true / false, or null to follow the token's own setting.
 * @param {Token} token
 */
function hpBarPolicy(token) {
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

/** A rounded rectangle whose radius never exceeds half its size; nothing when it has no width. */
function pill(g, x, y, w, h, color, alpha = 1) {
  if ((w <= 0) || (h <= 0)) return;
  g.beginFill(color, alpha).drawRoundedRect(x, y, w, h, Math.min(h / 2, w / 2)).endFill();
}

/** A diamond centred on (x, y) with a half-diagonal of r. */
function diamond(g, x, y, r) {
  g.drawPolygon([x, y - r, x + r, y, x, y + r, x - r, y]);
}

/**
 * The HP bar (or any value / max bar): track, Fatigue, fill, quarter marks, gold edge, Barrier.
 * @param {PIXI.Graphics} g
 * @param {number} bw   Width
 * @param {number} bh   Height
 * @param {number} s    UI scale
 * @param {object} data { value, max, fatigue, barrier, color }
 */
function drawPillBar(g, bw, bh, s, { value, max, fatigue = 0, barrier = 0, color = COLORS.hp, low = COLORS.hpLow }) {
  const full = Math.max(1, max + fatigue);
  const inset = s;
  const iw = bw - (2 * inset), ih = bh - (2 * inset);
  const hp = Math.clamp(value, 0, max);

  // Shadow and track
  pill(g, 0, s, bw, bh, 0x000000, 0.45);
  pill(g, 0, 0, bw, bh, COLORS.track, 0.95);

  // Fatigue: the end of the track, hatched
  const fw = iw * (fatigue / full);
  if (fw >= 1) {
    const left = inset + iw - fw;
    pill(g, left, inset, fw, ih, COLORS.fatigue, 0.95);
    g.lineStyle(Math.max(1, 0.75 * s), COLORS.hatch, 0.55);
    const step = 3 * s;
    for (let x0 = left - ih; x0 < left + fw; x0 += step) {
      const a = Math.max(x0, left), b = Math.min(x0 + ih, left + fw);
      if (b <= a) continue;
      g.moveTo(a, inset + ih - (a - x0)).lineTo(b, inset + ih - (b - x0));
    }
    g.lineStyle(0);
  }

  // Fill, with a faint light on its upper half
  const hw = iw * (hp / full);
  const fill = (max && (hp <= max / 4)) ? low : color;
  pill(g, inset, inset, hw, ih, fill, 1);
  pill(g, inset + s, inset, hw - (2 * s), ih * 0.45, 0xffffff, 0.16);

  // Quarter marks
  if (bw >= 48 * s) {
    g.lineStyle(Math.max(1, 0.75 * s), COLORS.ink, 0.35);
    for (const q of [0.25, 0.5, 0.75]) {
      const x = inset + (iw * q);
      g.moveTo(x, inset + s).lineTo(x, inset + ih - s);
    }
    g.lineStyle(0);
  }

  // Gold edge
  g.lineStyle(Math.max(1, s), COLORS.gold, 0.9).drawRoundedRect(s / 2, s / 2, bw - s, bh - s, (bh - s) / 2).lineStyle(0);

  // Barrier: a sliver just above, as long as its share of the maximum HP
  if (barrier > 0) {
    const w = bw * Math.min(1, barrier / Math.max(1, max));
    const h = 3 * s;
    g.lineStyle(Math.max(1, 0.75 * s), COLORS.ink, 0.8);
    pill(g, 0, -h - (1.5 * s), Math.max(w, 6 * s), h, COLORS.barrier, 1);
    g.lineStyle(0);
  }
}

/**
 * Fate (or any small count): gold diamonds centred on y = 0.
 * @returns {number}   The width of the row
 */
function drawPips(g, value, max, s) {
  const r = 3.6 * s, gap = 2.6 * s;
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

/** The text style of the nameplate (Eczar small caps on the band) at the core size. */
function nameStyle() {
  return new PIXI.TextStyle({
    fontFamily: [FONT, "Eczar", "Georgia", "serif"],
    fontSize: 17,
    fontWeight: "600",
    fontVariant: "small-caps",
    letterSpacing: 0.4,
    lineHeight: 20,
    fill: COLORS.text,
    align: "center",
    padding: 2
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

    /** The band behind the nameplate. */
    lhPlate = null;

    /** Height of the HP bar as drawn (0 when hidden), for the nameplate below it. */
    lhBarHeight = 0;

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
      hideLanding(this);
      this.#drawMotor();
    }

    /** The first class Motor of a character: its points as diamonds above the HP bar, its state as a disc. */
    #drawMotor() {
      if (!this.lhMotor || this.lhMotor.destroyed) this.lhMotor = this.addChild(new PIXI.Graphics());
      const g = this.lhMotor;
      g.clear();
      g.zIndex = 4;
      const motor = (styled() && (this.actor?.type === "character")) ? motorsOf(this.actor)[0] : null;
      const max = motor ? motorMax(this.actor, motor.def.id) : 0;
      g.visible = !!max && !this.document.isSecret;
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
      bar.clear();

      // Fate, or a small count on the second bar: diamonds on the top edge.
      if ((data.attribute === "fate") || ((index === 1) && Number.isInteger(max) && (max <= 10))) {
        const w = drawPips(bar, value, max, s);
        bar.position.set((width - w) / 2, 0);
        if (index === 0) this.lhBarHeight = 0;
        return;
      }

      const bw = Math.round(width * 0.82);
      const bh = Math.round((this.document.height >= 2 ? 10 : 8) * s);
      const health = data.attribute === "health";
      const system = this.actor?.system ?? {};
      drawPillBar(bar, bw, bh, s, {
        value, max,
        fatigue: health ? Math.max(0, Number(system.infos?.fatigue) || 0) : 0,
        barrier: health ? Math.max(0, Number(system["bad-status"]?.barrier) || 0) : 0,
        color: health ? COLORS.hp : COLORS.green,
        low: health ? COLORS.hpLow : COLORS.green
      });
      // The first bar rests on the bottom edge of the token, the second on the top one.
      bar.position.set((width - bw) / 2, (index === 0) ? height - (bh / 2) : -bh / 2);
      if (index === 0) this.lhBarHeight = bh;
    }

    /** @override */
    _refreshNameplate() {
      if (!styled()) {
        if (this.lhPlate) this.lhPlate.visible = false;
        return super._refreshNameplate();
      }
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
        if (this.lhPlate) this.lhPlate.visible = false;
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

    /** @override The elevation tooltip in the font of the sheet. */
    _getTextStyle() {
      const style = super._getTextStyle();
      if (!styled()) return style;
      style.fontFamily = [FONT, "Eczar", "Georgia", "serif"];
      style.fontWeight = "600";
      style.fontVariant = "small-caps";
      style.fill = COLORS.text;
      return style;
    }

    /**
     * The band of the nameplate, under the HP bar when it shows: in the colour of the disposition, a gold hairline
     * (brighter on hover or when controlled) and a gold diamond at each end.
     */
    #layoutNameplate() {
      if (!this.nameplate || !this.bars) return;
      const plate = this.lhPlate ??= this.addChild(new PIXI.Graphics());
      plate.clear();
      this.bars.zIndex = 4;
      this.nameplate.zIndex = 3;
      plate.zIndex = 2;
      const show = styled() && this.nameplate.visible && !!this.nameplate.text;
      plate.visible = show;
      if (!show) return;

      const s = canvas.dimensions.uiScale;
      const { width, height } = this.document.getSize();
      const barShown = this.bars.visible && this.bars.bar1?.visible && this.bars.bar1?.renderable;
      const below = barShown ? (this.lhBarHeight / 2) : 0;
      const bounds = this.nameplate.getLocalBounds();
      const tw = bounds.width * s, th = 20 * s;
      const padX = 9 * s, padY = 2 * s;
      const w = tw + (2 * padX), h = th + (2 * padY);
      const x = (width - w) / 2, y = height + below + (3 * s);
      const r = 2.5 * s;
      const band = BANDS[this.document.disposition] ?? BANDS[0];
      const lit = this.hover || this.controlled;

      plate.beginFill(0x000000, 0.35).drawRoundedRect(x, y + (1.5 * s), w, h, r).endFill();
      plate.lineStyle(Math.max(1, s), COLORS.ink, 0.75).beginFill(band, 0.94).drawRoundedRect(x, y, w, h, r).endFill();
      plate.lineStyle(Math.max(1, s), COLORS.gold, lit ? 1 : 0.65)
        .drawRoundedRect(x + (2 * s), y + (2 * s), w - (4 * s), h - (4 * s), Math.max(0, r - s));
      const d = 3.2 * s;
      plate.lineStyle(Math.max(1, s), COLORS.ink, 0.85).beginFill(COLORS.gold, 1);
      diamond(plate, x, y + (h / 2), d);
      diamond(plate, x + w, y + (h / 2), d);
      plate.endFill().lineStyle(0);

      // The text centred on the band (its box starts at its padding).
      this.nameplate.position.set(width / 2, y + padY + ((th - (bounds.height * s)) / 2) - (bounds.y * s));
    }
  };
}
