/**
 * Scenes and scenarios (Rules III.a, VI.a).
 *
 * Usage limits per scene / scenario count per character, because a big table runs several stories
 * at once: each actor keeps how many scenes and scenarios it has finished (flags `scene` / `scenario`),
 * and a use counts in the current ones (see use.mjs).
 * - The end of a started combat is the end of a scene for everyone who fought in it (round.mjs).
 * - The GM tools end the scene or the scenario of the selected tokens, or the scenario of every character.
 *
 * End of a scene: Bad and Combat Statuses end (Life Statuses such as Fatigue and Weakness stay), the Extra Breaths
 * spent come back; an Incapacitated Adventurer gets back up with full HP, one still [Dying] makes its last Death Check
 * and one in its Last Act dies (automation/death.mjs); the dead stay dead. An Incapacitated enemy dies.
 */
import { L, SYSTEM_ID, setting } from "../settings.mjs";
import { actorName, confirm, escape, isAdventurer, postSummary, toInt } from "../helpers/utils.mjs";
import { fillWorld } from "../content/content.mjs";
import { LH_STATUSES } from "../helpers/statuses.mjs";
import { END_OF_SCENE_GROUPS, END_OF_SCENE_OTHERS } from "../conditions/catalog.mjs";
import { fallAtSceneEnd } from "../conditions/transformations.mjs";
import { deathAtSceneEnd } from "./death.mjs";
import { reaperAtSceneEnd } from "../conditions/reaper.mjs";

/** The statuses that end with the scene: the Bad and Combat Statuses, and a few others ([Hidden], [Bond]). */
const endsWithScene = s => END_OF_SCENE_GROUPS.includes(s.group) || END_OF_SCENE_OTHERS.includes(s.id);

/** How many scenes / scenarios this actor has finished. */
export const counter = (actor, name) => toInt(actor?.getFlag(SYSTEM_ID, name));

/** One more finished scene / scenario. */
export async function bumpCounter(actor, name) {
  await actor.setFlag(SYSTEM_ID, name, counter(actor, name) + 1);
}

/**
 * End the scene for one actor: statuses, Incapacitated, Dying and the Last Act (see the module comment).
 * @param {Actor} actor
 * @param {TokenDocument} [token]   The token it fought with (its side: helpers/utils.mjs isAdventurer)
 * @returns {Promise<string|null>}   A line for the summary card, if something worth telling happened.
 */
export async function endOfSceneFor(actor, token = null) {
  // A soul promised to the death god: the scene's end takes it (conditions/reaper.mjs)
  const taken = await reaperAtSceneEnd(actor);
  // A transformation that ends with the scene drops its bearer, and this end doesn't lift it (conditions/transformations.mjs)
  const fallen = await fallAtSceneEnd(actor);
  const updates = {};
  const ending = [];
  // The Extra Breaths spent in the scene (conditions/damage.mjs)
  if (actor._source.flags?.[SYSTEM_ID]?.reviveSpent !== undefined) updates[`flags.${SYSTEM_ID}.-=reviveSpent`] = null;
  for (const status of LH_STATUSES.filter(endsWithScene)) {
    if (status.path) {
      const value = foundry.utils.getProperty(actor._source.system ?? {}, status.path);
      const set = status.list ? (Array.isArray(value) && value.length) : (status.rated ? toInt(value) : !!value);
      if (set) updates[`system.${status.path}`] = status.list ? [] : (status.rated ? 0 : false);
    }
    else if (actor.statuses.has(status.id)) ending.push(status.id);
  }

  const statuses = actor.statuses;
  const off = [];
  const on = [];
  let line = null;
  // Adventurers: the Last Act ends in death, one still [Dying] makes its last Death Check, the fallen get up, and the
  // dead stay dead. Enemies (monsters, a ready NPC on a hostile token) die.
  if (taken) line = taken;
  else if (isAdventurer(actor, token)) {
    const death = await deathAtSceneEnd(actor);
    if (death) line = death;
    else if (statuses.has("incapacitated") && !statuses.has("dead") && !fallen) {
      updates["system.health.value"] = toInt(actor.system.health?.max);
      off.push("incapacitated");
      line = L("Scene.Recovered", { name: actorName(actor) });
    }
  }
  else if (statuses.has("incapacitated") && !statuses.has("dead")) {
    on.push("dead");
    line = L("Scene.Died", { name: actorName(actor) });
  }

  if (!foundry.utils.isEmpty(updates)) await actor.update(updates);
  const effects = actor.effects.filter(e => ending.some(id => e.statuses.has(id))).map(e => e.id);
  if (effects.length) await actor.deleteEmbeddedDocuments("ActiveEffect", effects);
  for (const id of off) if (actor.statuses.has(id)) await actor.toggleStatusEffect(id, { active: false });
  for (const id of on) if (!actor.statuses.has(id)) await actor.toggleStatusEffect(id, { active: true });
  return line;
}

/**
 * End the scene of these actors (new scene for the usage limits).
 * @param {Actor[]} actors
 * @param {object} [options]
 * @param {boolean} [options.scenario]   End their scenario too.
 */
export async function endScene(actors, { scenario = false } = {}) {
  const lines = [];
  for (const actor of actors) {
    try {
      await bumpCounter(actor, "scene");
      if (scenario) await bumpCounter(actor, "scenario");
      if (setting("endOfScene")) {
        const line = await endOfSceneFor(actor);
        if (line) lines.push(line);
      }
    }
    catch (err) {
      console.error(`${SYSTEM_ID} | Could not end the scene of ${actor.uuid}`, err);
    }
  }
  if (lines.length) await postSummary(L("Scene.Title"), lines);
  return actors.length;
}

/* -------------------------------------------- */
/*  GM tools                                    */
/* -------------------------------------------- */

/** The distinct actors of the selected tokens. */
function selectedActors() {
  const actors = new Map();
  for (const token of canvas?.tokens?.controlled ?? []) {
    if (token.actor) actors.set(token.actor.uuid, token.actor);
  }
  return [...actors.values()];
}

/** Window with the GM tools (Game Settings → Configure Settings → Eternia). */
class ToolsApp extends foundry.applications.api.ApplicationV2 {
  static DEFAULT_OPTIONS = {
    id: "lhauto-tools",
    classes: ["lhauto-tools"],
    window: { title: "ETERNIA.Tools.Title", icon: "fa-solid fa-flag-checkered" },
    position: { width: 440 },
    actions: {
      sceneSelected: ToolsApp.#sceneSelected,
      scenarioSelected: ToolsApp.#scenarioSelected,
      scenarioAll: ToolsApp.#scenarioAll,
      fillWorld: ToolsApp.#fillWorld
    }
  };

  async _renderHTML() {
    const button = (action, icon, label) =>
      `<button type="button" data-action="${action}"><i class="${icon}"></i> ${escape(L(label))}</button>`;
    const div = document.createElement("div");
    div.className = "lhauto-tools-body";
    div.innerHTML = `
      <p>${escape(L("Tools.Intro"))}</p>
      ${button("sceneSelected", "fa-solid fa-film", "Tools.SceneSelected")}
      ${button("scenarioSelected", "fa-solid fa-book", "Tools.ScenarioSelected")}
      ${button("scenarioAll", "fa-solid fa-book-open", "Tools.ScenarioAll")}
      <hr>
      <p>${escape(L("Tools.FillIntro"))}</p>
      ${button("fillWorld", "fa-solid fa-wand-magic-sparkles", "Tools.FillWorld")}`;
    return div;
  }

  _replaceHTML(result, content) {
    content.replaceChildren(result);
  }

  static async #run(actors, scenario) {
    if (!actors.length) return ui.notifications.warn(L("Tools.NoTokens"));
    const n = await endScene(actors, { scenario });
    ui.notifications.info(L("Tools.Done", { what: L(scenario ? "Tools.Scenario" : "Tools.Scene"), n }));
  }

  static async #sceneSelected() {
    return ToolsApp.#run(selectedActors(), false);
  }

  static async #scenarioSelected() {
    return ToolsApp.#run(selectedActors(), true);
  }

  static async #scenarioAll() {
    return ToolsApp.#run(game.actors.filter(a => a.type === "character"), true);
  }

  /** Fill the data the world's skills, items and monsters lack, and the characters' item skills (see content.mjs). */
  static async #fillWorld() {
    const counts = await fillWorld({ dryRun: true });
    if (!counts.documents && !counts.skills && !counts.links && !counts.removed) return ui.notifications.info(L("Tools.FillNothing"));
    const ok = await confirm({
      title: L("Tools.FillWorld"),
      icon: "fa-solid fa-wand-magic-sparkles",
      content: `<p>${escape(L("Tools.FillConfirm", counts))}</p>`,
      yes: L("Tools.FillYes"),
      no: L("Use.Cancel")
    });
    if (!ok) return;
    const done = await fillWorld();
    ui.notifications.info(L("Tools.FillDone", done));
  }
}

/** Call during the `init` hook. */
export function registerScenes() {
  game.settings.registerMenu(SYSTEM_ID, "tools", {
    name: "ETERNIA.Tools.Name",
    label: "ETERNIA.Tools.Label",
    hint: "ETERNIA.Tools.Hint",
    icon: "fa-solid fa-flag-checkered",
    type: ToolsApp,
    restricted: true
  });
}
