/**
 * World data migrations.
 *
 * Each migration is described by its module ({ id, setting, version, run }) and recorded in its own
 * world setting, so worlds that already ran it under the old per-module hooks don't run it again.
 * They run one after the other, in the order below, on the active GM once the world is ready:
 * later migrations may rely on the data left by earlier ones (e.g. tags are normalized after
 * Gear -> Usable rewrites the item's system data).
 *
 * `run(from)` receives the version already done (0 = never run) and returns true when finished;
 * anything else (false, or an error) leaves the migration pending, to be retried on the next load.
 */
import { MONSTER_CHECKS_MIGRATION } from "./monster-checks.mjs";
import { STATUSES_MIGRATION } from "./statuses.mjs";
import { USABLE_MIGRATION } from "./item-use.mjs";
import { TAGS_MIGRATION } from "./tags.mjs";
import { HANDS_MIGRATION } from "./hands.mjs";
import { EFFECTS_MIGRATION } from "./effect-targets.mjs";
import { ON_USE_SKILLS_MIGRATION } from "./sustained.mjs";
import { KUDEN_CLEANUP_MIGRATION } from "../classes/migration.mjs";
import { TOKENS_MIGRATION } from "../canvas/token-defaults.mjs";
import { RACE_STAGES_MIGRATION } from "../races/migration.mjs";
import { clientsDiscovered, isPrimaryGM } from "./clients.mjs";

export const MIGRATIONS = [
  MONSTER_CHECKS_MIGRATION,      // legacy text Evasion/Resistance -> { dice, mod }
  STATUSES_MIGRATION,            // legacy status effects/fields -> Eternia status effects
  USABLE_MIGRATION,              // usable Gear -> "usable" type (replaces the item's system data)
  TAGS_MIGRATION,                // canonical tags
  HANDS_MIGRATION,               // Two-Handed + off hand, equipped non-equipment
  EFFECTS_MIGRATION,             // broken active effect keys -> valid effect targets
  ON_USE_SKILLS_MIGRATION,       // skills whose effects apply on use (transfer: false)
  KUDEN_CLEANUP_MIGRATION,       // what the Kuden and the archetypes left, the class icons, the Magia slots, the renamed classes and Magia, the Dragon Slayer's new elements, the Magias of the review (classes/migration.mjs)
  TOKENS_MIGRATION,              // the characters' tokens see and are linked, every name shows, core's turn marker off (canvas/token-defaults.mjs)
  RACE_STAGES_MIGRATION          // the race items take the stages of their compendium race again (races/migration.mjs)
];

/** Register the world setting of every migration. Call during the `init` hook. */
export function registerMigrations() {
  for (const { setting } of MIGRATIONS) {
    game.settings.register("eternia", setting, { scope: "world", config: false, type: Number, default: 0 });
  }
}

/** Migrations that still have to run in this world. */
export function pendingMigrations() {
  return MIGRATIONS.filter(m => game.settings.get("eternia", m.setting) < m.version);
}

let running = null;

/**
 * Run the pending migrations in order (active GM only). Call on `ready`.
 * @returns {Promise<string[]>}   Ids of the migrations still pending afterwards
 */
export function runMigrations() {
  if (!game.user.isActiveGM) return Promise.resolve([]);
  // Once the other windows of this GM are known: only one of them migrates.
  running ??= clientsDiscovered().then(() => isPrimaryGM() ? _run() : []).finally(() => running = null);
  return running;
}

async function _run() {
  const pending = pendingMigrations();
  if (!pending.length) return [];

  const notice = ui.notifications.info(game.i18n.localize("ETERNIA.Migration.Running"), { permanent: true });
  const left = [];
  for (const migration of pending) {
    const from = game.settings.get("eternia", migration.setting);
    let done = false;
    try {
      done = (await migration.run(from)) === true;
    } catch (err) {
      console.error(`Eternia | Migration "${migration.id}" failed`, err);
    }
    if (done) await game.settings.set("eternia", migration.setting, migration.version);
    else left.push(migration.id);
  }
  ui.notifications.remove(notice);

  if (left.length) {
    console.warn(`Eternia | Migrations left pending: ${left.join(", ")}`);
    ui.notifications.warn(game.i18n.format("ETERNIA.Migration.Pending", { list: left.join(", ") }), { permanent: true });
  } else {
    ui.notifications.info(game.i18n.localize("ETERNIA.Migration.Done"));
  }
  return left;
}
