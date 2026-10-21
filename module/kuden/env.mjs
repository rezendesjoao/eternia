/**
 * Scene environment for the Kuden (house rule): the hour of the day, open sky, darkness and miasma of
 * each scene (`flags.eternia.env`). The GM sets them in the scene configuration (Environment tab)
 * or in the GM tools; the Kuden conditions (conditions.mjs) and the Resources that follow the hour
 * (pieces.mjs) read them.
 *
 * An actor reads the scene it is in: its token's scene when unlinked, else the scene of the combat it
 * fights in, the viewed scene when its token is there, or any scene with its token.
 */
import { L, SYSTEM_ID } from "../settings.mjs";
import { combatOf, escape } from "../helpers/utils.mjs";

export const ENV_FLAG = "env";

/** Hours of the day, in order. */
export const HOURS = ["lateNight", "dawn", "morning", "noon", "afternoon", "dusk", "night"];

/** Hours with the sun up. */
export const DAY_HOURS = new Set(["dawn", "morning", "noon", "afternoon", "dusk"]);

/** A scene without an environment of its own: a morning under the open sky. */
const DEFAULT_ENV = Object.freeze({ hour: "morning", openSky: true, darkness: false, miasma: false });

/** The environment of a scene, with the defaults filled in. */
export function sceneEnv(scene) {
  const env = scene?.flags?.[SYSTEM_ID]?.[ENV_FLAG] ?? {};
  return {
    hour: HOURS.includes(env.hour) ? env.hour : DEFAULT_ENV.hour,
    openSky: (env.openSky ?? DEFAULT_ENV.openSky) !== false,
    darkness: env.darkness === true,
    miasma: env.miasma === true
  };
}

/** The scene an actor is in (see the module comment), or null. */
export function sceneOf(actor) {
  if (!actor) return null;
  try {
    if (actor.isToken) return actor.token?.parent ?? null;
    const combat = combatOf(actor);
    if (combat?.scene) return combat.scene;
    const scenes = game.scenes;
    if (!scenes) return null;
    const has = scene => !!scene?.tokens?.some(t => t.actorLink && (t.actorId === actor.id));
    if (has(scenes.viewed)) return scenes.viewed;
    return scenes.find(has) ?? scenes.viewed ?? scenes.active ?? null;
  }
  catch {
    return null;
  }
}

/** The environment where an actor is. */
export const envOf = actor => sceneEnv(sceneOf(actor));

/** The distinct actors of a scene's tokens. */
export function actorsOnScene(scene) {
  const actors = new Map();
  for (const token of scene?.tokens ?? []) {
    const actor = token.actor;
    if (actor) actors.set(actor.uuid, actor);
  }
  return [...actors.values()];
}

/** "Manhã · céu aberto · escuridão" */
export function envLabel(env) {
  const parts = [L(`Kuden.Hour.${env.hour}`), L(env.openSky ? "Kuden.Env.OpenSkyShort" : "Kuden.Env.CoveredShort")];
  if (env.darkness) parts.push(L("Kuden.Env.DarknessShort"));
  if (env.miasma) parts.push(L("Kuden.Env.MiasmaShort"));
  return parts.join(" · ");
}

/**
 * Fields of the environment form.
 * @param {object} env
 * @param {string} prefix   Form name of the environment ("flags.eternia.env" in the scene configuration)
 */
export function envFieldsHTML(env, prefix) {
  const hours = HOURS.map(h => `<option value="${h}"${(h === env.hour) ? " selected" : ""}>${escape(L(`Kuden.Hour.${h}`))}</option>`).join("");
  const check = (key, label) => `<div class="form-group">
      <label>${escape(L(label))}</label>
      <div class="form-fields"><input type="checkbox" name="${prefix}.${key}"${env[key] ? " checked" : ""}></div>
    </div>`;
  return `<div class="form-group">
      <label>${escape(L("Kuden.Env.Hour"))}</label>
      <div class="form-fields"><select name="${prefix}.hour">${hours}</select></div>
    </div>
    ${check("openSky", "Kuden.Env.OpenSky")}${check("darkness", "Kuden.Env.Darkness")}${check("miasma", "Kuden.Env.Miasma")}`;
}

/** The Kuden fieldset in the Environment tab of the scene configuration (saved with the scene). */
function onRenderSceneConfig(app, element) {
  const scene = app.document;
  if (!(scene instanceof Scene) || element.querySelector(".lhauto-kuden-env")) return;
  const tab = element.querySelector(".tab[data-tab='environment']");
  if (!tab) return;
  const fieldset = document.createElement("fieldset");
  fieldset.className = "lhauto-kuden-env";
  fieldset.innerHTML = `<legend>${escape(L("Kuden.Env.Title"))}</legend>
    <p class="hint">${escape(L("Kuden.Env.Hint"))}</p>
    ${envFieldsHTML(sceneEnv(scene), `flags.${SYSTEM_ID}.${ENV_FLAG}`)}`;
  tab.append(fieldset);
}

/** The environment section of the GM tools (scenes.mjs): the viewed scene. */
export function envToolsHTML() {
  const scene = game.scenes.viewed;
  if (!scene) return `<p>${escape(L("Kuden.Env.NoScene"))}</p>`;
  return `<p>${escape(L("Kuden.Env.Viewed", { name: scene.name }))}</p>
    <div class="lhauto-kuden-env">${envFieldsHTML(sceneEnv(scene), "env")}</div>`;
}

/** Save the environment of the viewed scene from the GM tools' fields. */
export async function applyEnvFromTools(root) {
  const scene = game.scenes.viewed;
  if (!scene) return ui.notifications.warn(L("Kuden.Env.NoScene"));
  const field = name => root.querySelector(`[name="env.${name}"]`);
  const env = {
    hour: field("hour")?.value ?? DEFAULT_ENV.hour,
    openSky: !!field("openSky")?.checked,
    darkness: !!field("darkness")?.checked,
    miasma: !!field("miasma")?.checked
  };
  await scene.setFlag(SYSTEM_ID, ENV_FLAG, env);
  ui.notifications.info(L("Kuden.Env.Applied", { name: scene.name, env: envLabel(sceneEnv(scene)) }));
}

/** Call during the `init` hook. */
export function registerEnv() {
  Hooks.on("renderSceneConfig", onRenderSceneConfig);
}
