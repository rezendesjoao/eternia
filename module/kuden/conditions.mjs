/**
 * Kuden conditions on top of the system's condition engine (helpers/effect-conditions.mjs). They are added
 * to its list of types, so they show in the same editor (effect Conditions tab, skill conditions) and in
 * the same "condition not met" list of the sheet:
 *   kudenResource (≥ value), kudenResourceFull     the Resource of the actor's Core (pieces.mjs)
 *   sceneDay, sceneNight, sceneNoon, sceneOpenSky,
 *   sceneDarkness, sceneMiasma, sceneNoMiasma      the environment of the actor's scene (env.mjs)
 *   targetBossRaid                                 one of this user's targets is a [Boss] or a [Raid]
 *   hpAtMost (value %)                             the HP is at most that share of the maximum
 *
 * The system's tests are private, so ActiveEffect#determineSuppression is wrapped: after the system's own
 * decision, an effect still active is suppressed by the first Kuden condition that is not met. The HP and
 * the manual Resource are actor data (an update prepares the actor again); this module re-prepares the
 * actors when the scene environment or the targets change. Kuden pieces also check the conditions of the
 * skill itself when they are used (use.mjs).
 */
import { L, SYSTEM_ID, setting } from "../settings.mjs";
import { CONDITION_TYPES, conditionLabel, effectConditions, unmetCondition } from "../helpers/effect-conditions.mjs";
import { toInt, wrap } from "../helpers/utils.mjs";
import { actorsOnScene, DAY_HOURS, ENV_FLAG, envOf, sceneOf } from "./env.mjs";
import { isKuden, resourceOf } from "./pieces.mjs";

/** The Kuden condition types (same shape as the system's CONDITION_TYPES). */
const KUDEN_TYPES = [
  { id: "kudenResource", param: "number" },
  { id: "kudenResourceFull" },
  { id: "sceneDay" },
  { id: "sceneNight" },
  { id: "sceneNoon" },
  { id: "sceneOpenSky" },
  { id: "sceneDarkness" },
  { id: "sceneMiasma" },
  { id: "sceneNoMiasma" },
  { id: "targetBossRaid" },
  { id: "hpAtMost", param: "number" }
];
const KUDEN_IDS = new Set(KUDEN_TYPES.map(t => t.id));
const SCENE_IDS = new Set(["sceneDay", "sceneNight", "sceneNoon", "sceneOpenSky", "sceneDarkness", "sceneMiasma", "sceneNoMiasma"]);
const RESOURCE_IDS = new Set(["kudenResource", "kudenResourceFull"]);
const TARGET_IDS = new Set(["targetBossRaid"]);

const number = value => Number(value) || 0;
const plain = tag => String(tag ?? "").replace(/[[\]]/g, "").trim();

/** Whether an actor is a [Boss] or a [Raid] (tags in English, as the system keeps them, or in Portuguese). */
export function isBossOrRaid(actor) {
  return (actor?.system?.tags ?? []).some(tag => /^(boss|raid|chefe|raide)\b/i.test(plain(tag)));
}

/** The maximum HP of the last preparation: the conditions are tested before the derived data. */
const hpMaxOf = actor => toInt(actor?._lhautoHpMax ?? actor?.system?.health?.max);

const TESTS = {
  kudenResource: (c, actor) => (resourceOf(actor)?.value ?? 0) >= number(c.value),
  kudenResourceFull: (c, actor) => {
    const resource = resourceOf(actor);
    return !!resource && (resource.value >= resource.max);
  },
  sceneDay: (c, actor, env) => DAY_HOURS.has(env().hour),
  sceneNight: (c, actor, env) => !DAY_HOURS.has(env().hour),
  sceneNoon: (c, actor, env) => env().hour === "noon",
  sceneOpenSky: (c, actor, env) => env().openSky,
  sceneDarkness: (c, actor, env) => env().darkness,
  sceneMiasma: (c, actor, env) => env().miasma,
  sceneNoMiasma: (c, actor, env) => !env().miasma,
  targetBossRaid: () => [...(game.user?.targets ?? [])].some(token => isBossOrRaid(token.actor)),
  hpAtMost: (c, actor) => {
    const max = hpMaxOf(actor);
    return (max > 0) && ((toInt(actor.system?.health?.value) * 100) <= (number(c.value) * max));
  }
};

/**
 * The first Kuden condition that is not met, or null.
 * @param {object[]} conditions
 * @param {Actor} actor
 */
export function unmetKudenCondition(conditions, actor) {
  if (!conditions?.length || !actor) return null;
  let env;
  const envFn = () => env ??= envOf(actor);
  return conditions.find(c => KUDEN_IDS.has(c?.type) && !TESTS[c.type](c, actor, envFn)) ?? null;
}

/** The skill conditions of an item, as a list. */
const skillConditions = item => {
  const list = item?.system?.conditions;
  return Array.isArray(list) ? list : Object.values(list ?? {});
};

/**
 * Issues of a Kuden piece when used: the conditions of the skill itself (the system's and the Kuden's)
 * that are not met now. Restrictions such as "only against a Boss or a Raid" live there.
 * @param {Item} item
 * @param {Actor} actor
 * @returns {string[]}
 */
export function kudenUseIssues(item, actor) {
  if (!setting("kuden") || !isKuden(item)) return [];
  const conditions = skillConditions(item);
  if (!conditions.length) return [];
  const unmet = unmetCondition(conditions, actor, item) ?? unmetKudenCondition(conditions, actor);
  return unmet ? [L("Kuden.Use.Unmet", { condition: conditionLabel(unmet) })] : [];
}

/* -------------------------------------------- */
/*  Refreshing                                  */
/* -------------------------------------------- */

/** Whether an actor has an effect (or a Kuden piece) with one of these condition types. */
function usesConditions(actor, ids) {
  try {
    for (const effect of actor.allApplicableEffects()) {
      if (effectConditions(effect, effect.sourceItem).some(c => ids.has(c?.type))) return true;
    }
    return actor.items.some(item => isKuden(item) && skillConditions(item).some(c => ids.has(c?.type)));
  }
  catch {
    return false;
  }
}

/** Whether what the scene environment changes matters to an actor. */
const dependsOnScene = actor => usesConditions(actor, SCENE_IDS)
  || ((resourceOf(actor)?.source === "hour") && (usesConditions(actor, RESOURCE_IDS) || isRendered(actor)));

/** Whether a window of the actor (or of one of its items) is open. */
function isRendered(actor) {
  for (const app of foundry.applications.instances.values()) {
    if (app.rendered && ((app.document === actor) || (app.document?.parent === actor))) return true;
  }
  return false;
}

/** Prepare these actors again and re-render their windows. */
function refresh(actors) {
  for (const actor of new Set(actors)) {
    if (!actor) continue;
    actor.reset();
    for (const app of foundry.applications.instances.values()) {
      if (app.rendered && ((app.document === actor) || (app.document?.parent === actor))) app.render();
    }
  }
}

/** The actors this user's targets matter to: assigned character, controlled tokens, open sheets. */
function targetingActors() {
  const actors = new Set();
  if (game.user.character) actors.add(game.user.character);
  for (const token of canvas?.tokens?.controlled ?? []) if (token.actor) actors.add(token.actor);
  for (const app of foundry.applications.instances.values()) {
    if (app.rendered && (app.document instanceof Actor)) actors.add(app.document);
  }
  return [...actors];
}

/* -------------------------------------------- */
/*  Registration                                */
/* -------------------------------------------- */

/** Call during the `init` hook (after the system's own `init`). */
export function registerKudenConditions() {
  // The types join the system's list (editor, labels, form parsing).
  for (const type of KUDEN_TYPES) if (!CONDITION_TYPES.some(t => t.id === type.id)) CONDITION_TYPES.push(type);

  wrap(CONFIG.ActiveEffect.documentClass?.prototype, "determineSuppression", function (original, ...args) {
    const result = original.call(this, ...args);
    if (this.disabled || this._lhSuppressed || !setting("kuden")) return result;
    const parent = this.parent;
    const actor = (parent?.documentName === "Actor") ? parent : ((parent?.parent?.documentName === "Actor") ? parent.parent : null);
    if (!actor) return result;
    const unmet = unmetKudenCondition(effectConditions(this, this.sourceItem), actor);
    if (unmet) {
      this.unmetCondition = unmet;
      this._lhSuppressed = true;
    }
    return result;
  });

  wrap(CONFIG.Actor.documentClass?.prototype, "prepareDerivedData", function (original, ...args) {
    const result = original.call(this, ...args);
    this._lhautoHpMax = toInt(this.system?.health?.max);
    return result;
  });

  // The environment of a scene changed: the actors in it (with a token there, or reading it as the viewed scene).
  Hooks.on("updateScene", (scene, changed) => {
    if (!setting("kuden") || !foundry.utils.hasProperty(changed, `flags.${SYSTEM_ID}.${ENV_FLAG}`)) return;
    const actors = new Set([...game.actors, ...actorsOnScene(scene)]);
    refresh([...actors].filter(a => dependsOnScene(a) && (sceneOf(a) === scene)));
  });
  // A token came to (or left) a scene: its actor may be somewhere else now.
  const onToken = token => {
    const actor = token.actor;
    if (setting("kuden") && actor && dependsOnScene(actor)) refresh([actor]);
  };
  Hooks.on("createToken", onToken);
  Hooks.on("deleteToken", onToken);
  // Another scene is viewed: linked actors without a combat or a token elsewhere read the viewed scene.
  Hooks.on("canvasReady", () => {
    if (setting("kuden")) refresh(game.actors.filter(dependsOnScene));
  });

  // This user's targets changed.
  Hooks.on("targetToken", user => {
    if (!setting("kuden") || (user !== game.user)) return;
    refresh(targetingActors().filter(a => usesConditions(a, TARGET_IDS)));
  });

  // The first preparation happens before the scenes and the settings exist.
  Hooks.once("ready", () => {
    if (!setting("kuden")) return;
    const ids = new Set(KUDEN_IDS);
    refresh(game.actors.filter(a => usesConditions(a, ids) || resourceOf(a)));
  });
}
