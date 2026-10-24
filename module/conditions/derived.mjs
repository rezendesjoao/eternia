/**
 * The numbers the conditions change, worked out last in the actor's derived data (the sheets show them):
 * - [Exposed]: Physical and Magic Defense 0; [Fissured]: −2 to both per stack; [Sun]: + its Rating to both;
 * - [Freezing]: −1 Speed and −1 Initiative per stack;
 * - [Rooted], [Grappled], [Paralyzed], [Asleep]: Speed 0.
 * Characters keep their values in `battle-status.<x>.total`, monsters directly in `battle-status.<x>`.
 */
import { has, rating, rulesOn } from "./rules.mjs";

const STILL = ["rooted", "grappled", "paralyzed", "asleep"];

/** The value of a battle status (a character's total, a monster's number). */
function read(holder, key) {
  const value = holder?.[key];
  return Number((value && (typeof value === "object")) ? value.total : value) || 0;
}

function write(holder, key, value) {
  if (!holder || !(key in holder)) return;
  if (holder[key] && (typeof holder[key] === "object")) holder[key].total = value;
  else holder[key] = value;
}

/** Call at the end of the actor's prepareDerivedData. */
export function applyConditionStats(actor) {
  const battle = actor.system?.["battle-status"];
  if (!battle || !rulesOn() || !actor.statuses?.size) return;

  const defense = battle.defense;
  if (defense) {
    const fissured = rating(actor, "fissured");
    const sun = rating(actor, "sun");
    for (const key of ["phys", "magic"]) {
      if (has(actor, "exposed")) {
        write(defense, key, 0);
        continue;
      }
      // [Fissured] stops at 0; the [Sun] adds on top (a Taboo may have left the Defense below 0)
      let value = read(defense, key);
      if (fissured) value = Math.max(0, value - (2 * fissured));
      if (fissured || sun) write(defense, key, value + sun);
    }
  }

  const freezing = rating(actor, "freezing");
  if (freezing) {
    write(battle, "speed", Math.max(0, read(battle, "speed") - freezing));
    write(battle, "initiative", Math.max(0, read(battle, "initiative") - freezing));
  }
  if (STILL.some(id => has(actor, id))) write(battle, "speed", 0);
}
