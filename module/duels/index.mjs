/**
 * The duels (duels.mjs: the challenges and the duel on the primary GM; ui.mjs: the screens; arena.mjs: the ranking's
 * window; ranking.mjs: the points; state.mjs: what a duel is): the world settings, the "Duelos" button of the token
 * controls (after the Hall of Fame), the Arena drawn again when a duel changes, and the API for macros
 * (`game.eternia.duels`).
 */
import { SYSTEM_ID } from "../settings.mjs";
import { DuelArena } from "./arena.mjs";
import { finish, registerDuelRules, sendChallenge, stopDuel } from "./duels.mjs";
import { HISTORY_SETTING, duelHistory, resetRanking, standings, voidDuel } from "./ranking.mjs";
import { duelOf, duelOfActor, liveDuels } from "./state.mjs";
import { bubbleFor, challenge, challengeDialog, openBubble, refreshDuelBar, registerDuelScreens } from "./ui.mjs";

/** Call during the `init` hook (after the Hall of Fame: the buttons keep that order). */
export function registerDuels() {
  const world = (key, type, value, extra = {}) => game.settings.register(SYSTEM_ID, key, {
    name: `ETERNIA.Settings.${key}.Name`,
    hint: `ETERNIA.Settings.${key}.Hint`,
    scope: "world",
    config: true,
    type,
    default: value,
    ...extra
  });
  world("duels", Boolean, true, { onChange: () => ui.controls?.render({ reset: true }) });
  world("duelDeath", Boolean, true);
  world("duelCountdown", Number, 10, { range: { min: 0, max: 60, step: 1 } });
  game.settings.register(SYSTEM_ID, HISTORY_SETTING, {
    scope: "world",
    config: false,
    type: Array,
    default: [],
    onChange: () => DuelArena.refresh()
  });

  registerDuelRules();
  registerDuelScreens();

  Hooks.on("getSceneControlButtons", controls => {
    const tokens = controls.tokens;
    if (!tokens?.tools) return;
    tokens.tools.eterniaDuels = {
      name: "eterniaDuels",
      title: "ETERNIA.Duel.Button",
      icon: "fa-solid fa-swords",
      order: Object.keys(tokens.tools).length,
      button: true,
      visible: !!game.settings.get(SYSTEM_ID, "duels") || game.user.isGM,
      onChange: () => DuelArena.toggle()
    };
  });

  // The Arena shows the duels going on and who is on the scene
  for (const hook of ["createCombat", "deleteCombat", "createToken", "deleteToken", "canvasReady", "controlToken"]) Hooks.on(hook, () => DuelArena.refresh());
  Hooks.on("updateCombat", combat => {
    if (duelOf(combat)) DuelArena.refresh();
  });

  game.eternia.duels = {
    open: () => DuelArena.open(),
    challenge,
    challengeDialog,
    send: sendChallenge,
    stop: stopDuel,
    finish,
    of: duelOfActor,
    live: liveDuels,
    history: duelHistory,
    standings,
    void: voidDuel,
    reset: resetRanking,
    refreshBar: refreshDuelBar,
    // The right-click on someone else's character (canvas/eterniaToken.mjs)
    bubbleFor,
    openBubble
  };
}
