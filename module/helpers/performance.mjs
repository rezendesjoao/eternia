/**
 * A weak computer: what the system lightens when the player sets Foundry's Performance Mode to Low (Configure
 * Settings → General; Foundry also marks the page with body.performance-low, which css/performance.css reads to stop
 * the endless decorative animations). Every other mode stays exactly as it is.
 */

/** Whether this client runs in Foundry's Low performance mode. */
export function lowPerformance() {
  try {
    return game.settings.get("core", "performanceMode") === CONST.CANVAS_PERFORMANCE_MODES.LOW;
  }
  catch {
    return false;
  }
}

/** Call during the `init` hook. */
export function registerLowPerformance() {
  // The core registers its settings after the init hook: read the mode at setup, before the chat draws
  Hooks.once("setup", () => {
    if (!lowPerformance()) return;
    // The chat draws its last 50 cards when the world opens instead of 100 (scrolling up brings the older ones, 50 at a
    // time)
    CONFIG.ChatMessage.batchSize = Math.min(CONFIG.ChatMessage.batchSize ?? 100, 50);
  });
}
