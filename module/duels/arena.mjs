/**
 * The Arena: the duel ranking for everyone (the "Duelos" button of the token controls, after the Hall of Fame), a
 * parchment window like the Market's and the Hall of Fame's (css/duels.css). The champion on top, the table of every duelist (the points, the title
 * they give, wins and losses, the streak and the last five results), and beside it the duels going on now, who the user
 * can challenge on the scene (each with its points) and the latest duels; the GM voids a duel (the standings are
 * replayed without it) or empties the ranking.
 */
import { L } from "../settings.mjs";
import { escape } from "../helpers/utils.mjs";
import { duelHistory, resetRanking, standings, tierOf, voidDuel, START_RATING } from "./ranking.mjs";
import { duelOf, liveDuels } from "./state.mjs";
import { duelTime } from "./duels.mjs";
import { MODE_ICON, challenge, challengerToken, pictureOf } from "./ui.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

/** How many of the latest duels the Arena lists. */
const RECENT = 12;

/** "a moment ago", "3 min ago"… */
function ago(at) {
  const minutes = Math.floor(Math.max(0, Date.now() - (at ?? 0)) / 60000);
  if (minutes < 1) return L("Duel.Ago.Now");
  if (minutes < 60) return L("Duel.Ago.Minutes", { n: minutes });
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return L("Duel.Ago.Hours", { n: hours });
  return L("Duel.Ago.Days", { n: Math.floor(hours / 24) });
}

const signed = n => `${(n >= 0) ? "+" : "−"}${Math.abs(n)}`;

export class DuelArena extends HandlebarsApplicationMixin(ApplicationV2) {

  static ID = "eternia-arena";

  /** Open the Arena, or bring it to the front. */
  static open() {
    let app = foundry.applications.instances.get(this.ID);
    if (!app) app = new this();
    if (app.rendered) app.bringToFront?.();
    app.render({ force: true });
    return app;
  }

  /** The button of the token controls: opens the Arena, or closes it when it is open. */
  static toggle() {
    const existing = foundry.applications.instances.get(this.ID);
    if (existing?.rendered) return existing.close();
    return this.open();
  }

  /** Draw the open Arena again (soon: a burst of changes draws it once). */
  static refresh() {
    const app = foundry.applications.instances.get(this.ID);
    if (!app?.rendered) return;
    clearTimeout(app._refreshTimer);
    app._refreshTimer = setTimeout(() => app.render(), 150);
  }

  constructor(options = {}) {
    const width = Math.min(1120, window.innerWidth - 40);
    const height = Math.min(780, window.innerHeight - 40);
    super({ ...options, id: DuelArena.ID, position: { width, height, left: (window.innerWidth - width) / 2, top: (window.innerHeight - height) / 2 } });
  }

  static DEFAULT_OPTIONS = {
    classes: ["eternia", "eternia-arena"],
    tag: "div",
    window: { icon: "fa-solid fa-swords", resizable: true },
    actions: {
      challenge: DuelArena.#onChallenge,
      voidDuel: DuelArena.#onVoid,
      reset: DuelArena.#onReset
    }
  };

  static PARTS = {
    main: { template: "systems/eternia/templates/duels/arena.hbs", scrollable: [".dl-table", ".dl-side"] }
  };

  /** @override */
  get title() {
    return L("Duel.Arena.Title");
  }

  /** @override */
  async _prepareContext(options) {
    const history = duelHistory();
    const { records, deltas } = standings(history);
    const owned = key => !game.user.isGM && !!fromUuidSync(key)?.isOwner;
    const rows = records.map(r => {
      const actor = fromUuidSync(r.key);
      return {
        ...r,
        name: actor?.name ?? r.name,
        img: actor ? pictureOf(actor) : r.img,
        tier: L(`Duel.Tier.${tierOf(r.rating)}`),
        tierId: tierOf(r.rating),
        medal: (r.rank <= 3) && r.wins ? r.rank : 0,
        pct: r.duels ? Math.round((r.wins / r.duels) * 100) : 0,
        streakText: (r.streak > 1) ? L("Duel.Arena.StreakWins", { n: r.streak }) : ((r.streak < -1) ? L("Duel.Arena.StreakLosses", { n: -r.streak }) : ""),
        hot: r.streak >= 3,
        form: r.form.map(f => ({ result: f, label: L(`Duel.Arena.Form.${f}`) })),
        mine: owned(r.key)
      };
    });
    const champion = rows.find(r => r.rank === 1 && r.wins) ?? null;
    const recent = [...history].sort((x, y) => (y.at ?? 0) - (x.at ?? 0)).slice(0, RECENT).map(d => {
      const change = deltas.get(d.id) ?? { a: 0, b: 0 };
      const winner = ["a", "b"].includes(d.winner) ? d.winner : null;
      const loser = winner ? ((winner === "a") ? "b" : "a") : null;
      return {
        id: d.id,
        mode: d.mode,
        modeIcon: MODE_ICON[d.mode],
        modeLabel: L(`Duel.Mode.${d.mode}`),
        draw: !winner,
        winner: winner ? d[winner].name : d.a.name,
        loser: loser ? d[loser].name : d.b.name,
        winnerImg: winner ? d[winner].img : d.a.img,
        delta: winner ? signed(change[winner]) : "",
        line: L(`Duel.Arena.Recent.${winner ? d.reason : "draw"}`, { winner: winner ? d[winner].name : d.a.name, loser: loser ? d[loser].name : d.b.name }),
        meta: `${duelTime(d.ms)} · ${ago(d.at)}`
      };
    });
    const live = liveDuels().map(c => {
      const duel = duelOf(c);
      return {
        a: duel.a.name, b: duel.b.name, mode: L(`Duel.Mode.${duel.mode}`), modeIcon: MODE_ICON[duel.mode],
        state: c.started ? L("Duel.UI.Round", { n: c.round }) : L("Duel.UI.Ready"),
        scene: game.scenes.get(duel.sceneId)?.name ?? ""
      };
    });
    const mine = challengerToken();
    const ratingOf = key => records.find(r => r.key === key)?.rating ?? START_RATING;
    const opponents = (canvas?.ready ? canvas.scene.tokens.contents : [])
      .filter(t => (t.actor?.type === "character") && (game.user.isGM || !t.hidden) && (t.actor.uuid !== mine?.actor?.uuid))
      .map(t => ({ uuid: t.uuid, name: t.name || t.actor.name, img: pictureOf(t.actor, t), rating: ratingOf(t.actor.uuid), tier: L(`Duel.Tier.${tierOf(ratingOf(t.actor.uuid))}`) }))
      .sort((x, y) => y.rating - x.rating || x.name.localeCompare(y.name, game.i18n.lang));
    return {
      gm: game.user.isGM,
      rows,
      champion,
      recent,
      live,
      opponents,
      mine: mine ? { name: mine.name || mine.actor.name, img: pictureOf(mine.actor, mine), rating: ratingOf(mine.actor.uuid) } : null,
      totals: { duels: history.length, duelists: records.length, live: live.length },
      lead: L("Duel.Arena.Lead"),
      tiers: ["legend", "master", "veteran", "duelist", "aspirant"].map(id => ({ id, label: L(`Duel.Tier.${id}`), hint: L(`Duel.TierHint.${id}`) }))
    };
  }

  static #onChallenge(event, target) {
    const token = fromUuidSync(target.dataset.uuid);
    if (token) challenge(token);
  }

  static async #onVoid(event, target) {
    const id = target.dataset.id;
    const duel = duelHistory().find(d => d.id === id);
    if (!duel) return;
    const ok = await foundry.applications.api.DialogV2.confirm({
      window: { title: L("Duel.Arena.VoidTitle"), icon: "fa-solid fa-eraser" },
      content: `<p>${escape(L("Duel.Arena.VoidConfirm", { a: duel.a.name, b: duel.b.name }))}</p>`
    });
    if (ok) await voidDuel(id);
  }

  static async #onReset() {
    const ok = await foundry.applications.api.DialogV2.confirm({
      window: { title: L("Duel.Arena.ResetTitle"), icon: "fa-solid fa-trash" },
      content: `<p>${escape(L("Duel.Arena.ResetConfirm", { n: duelHistory().length }))}</p>`
    });
    if (ok) await resetRanking();
  }
}

