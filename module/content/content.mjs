/**
 * Content: what the data of the items and monsters does at the table.
 *
 * - The items and monsters of the system compendiums carry their own data: damage, effects, the healing
 *   of potions and jewels (flags.eternia.heal), the Fatigue food removes (fatigue), the Character Rank
 *   lock (crLock), the statuses items give at the start of the scene (sceneStatuses) and the trigger
 *   powers of the items (powers).
 * - Monsters made by hand get the damage of their attacks read from their text (monster-damage.mjs,
 *   English or Portuguese) when they are created; the GM tool does it for those already in the world.
 * - Trigger powers ("[Trigger: Initiative] You gain [Barrier:60]. Once per scenario."): a character
 *   carrying the item gets one Item skill per power, with its fields, effects and the power's text in
 *   the language of the item; the first is the item's linked skill (its icon in the inventory). The
 *   skills leave with the item. use.mjs checks and counts their use like any skill.
 * - Statuses "at the start of the scene": given by the equipped items when a combat starts.
 * - Food: using it removes Fatigue from whoever eats it (the user, or the targeted characters).
 * - Healing items (potions, jewels): using one heals whoever drinks it the same way.
 *
 * Only missing data is filled: what a GM edited by hand is never replaced.
 */
import { parseMonsterDamage } from "./monster-damage.mjs";
import { L, SYSTEM_ID, setting } from "../settings.mjs";
import { canonicalTag } from "../helpers/tag-catalog.mjs";
import { diceFormula } from "../helpers/dice.mjs";
import { evaluateFormula, formulaData } from "../helpers/effect-formulas.mjs";
import { registerHandler, request } from "../piles/pile-socket.mjs";
import { actorName, combatActors, escape, toInt } from "../helpers/utils.mjs";

const EQUIPMENT = ["weapon", "armor", "shield", "accessory", "bag"];
/** Item types whose trigger powers become skills (gear is carried, never equipped). */
const POWER_TYPES = [...EQUIPMENT, "gear"];
/** Flag of an item skill: the id of the item it comes from (on the same actor) and which of its powers. */
export const ITEM_SKILL = "itemSkill";

/** Call during the `init` hook. */
export function registerContent() {
  Hooks.on("preCreateItem", onPreCreateItem);
  Hooks.on("preCreateActor", onPreCreateActor);
  Hooks.on("createItem", onCreateItem);
  Hooks.on("deleteItem", onDeleteItem);
  Hooks.on("createActor", onCreateActor);
  Hooks.on("combatStart", combat => {
    if (setting("content")) sceneStatuses(combat).catch(err => console.error(`${SYSTEM_ID} | Scene statuses failed`, err));
  });
  Hooks.on("createChatMessage", onCreateMessage);
  Hooks.on("renderChatMessageHTML", renderFood);
  Hooks.on("renderChatMessageHTML", renderHeal);
  registerHandler("eterniaFood", onFoodRequest);
  registerHandler("eterniaHeal", onHealRequest);
}

/* -------------------------------------------- */
/*  Monster attacks                             */
/* -------------------------------------------- */

/** Whether damage data is set (a number, a formula or a type). */
function hasDamage(damage) {
  const set = value => !!value && (String(value).trim() !== "0");
  return !!damage && (set(damage.dice) || set(damage.mod) || !!damage.type);
}

/** The damage of a monster attack without any, read from its text (null when the text gives none). */
function textDamage(itemSource) {
  if ((itemSource?.type !== "skill") || hasDamage(itemSource.system?.damage)) return null;
  const damage = parseMonsterDamage(itemSource.system?.description, { tags: itemSource.system?.tags });
  return damage ? { ...damage, recovery: false, noPower: false } : null;
}

/** A skill given to a monster gets the damage its text gives, when it has none. */
function onPreCreateItem(item) {
  if (!setting("content") || (item.parent?.type !== "monster")) return;
  const damage = textDamage(item._source);
  if (damage) item.updateSource({ "system.damage": damage });
}

/** A monster made by hand (or an older copy) gets the damage of its attacks from their text. */
function onPreCreateActor(actor) {
  if (!setting("content") || (actor.type !== "monster")) return;
  let changed = false;
  const items = (actor._source.items ?? []).map(item => {
    const damage = textDamage(item);
    if (!damage) return item;
    changed = true;
    return foundry.utils.mergeObject(foundry.utils.deepClone(item), { system: { damage } });
  });
  if (changed) actor.updateSource({ items });
}

/**
 * Fill the documents already in the world: the damage of the monster attacks without any (world actors and
 * unlinked tokens), and the skills of the trigger powers of the items the characters carry (see syncItemSkills).
 * @param {object} [options]
 * @param {boolean} [options.dryRun]   Only count.
 * @returns {Promise<{documents: number, damage: number, skills: number, links: number, removed: number}>}
 */
export async function fillWorld({ dryRun = false } = {}) {
  const counts = { documents: 0, damage: 0, skills: 0, links: 0, removed: 0 };
  // Monsters with all their skills; unlinked tokens only with the skills they change (the others
  // come from their actor, filled with it).
  const owners = game.actors.filter(actor => actor.type === "monster").map(actor => [actor, [...actor.items]]);
  for (const scene of game.scenes) {
    for (const token of scene.tokens) {
      if (token.actorLink || (token.actor?.type !== "monster")) continue;
      // The delta's source holds only the items the token overrides (its collection also lists the inherited ones).
      const own = (token.delta?._source?.items ?? []).map(i => token.actor.items.get(i._id)).filter(Boolean);
      if (own.length) owners.push([token.actor, own]);
    }
  }
  for (const [, items] of owners) {
    for (const item of items) {
      try {
        const damage = textDamage(item._source);
        if (!damage) continue;
        counts.documents++;
        counts.damage++;
        if (!dryRun) await item.update({ "system.damage": damage });
      }
      catch (err) {
        console.error(`${SYSTEM_ID} | Could not fill ${item.uuid}`, err);
      }
    }
  }
  // Characters (their tokens are linked: the skills go to the actor).
  for (const actor of game.actors) {
    if (actor.type !== "character") continue;
    try {
      const done = await syncItemSkills(actor, { dryRun });
      for (const key of ["skills", "links", "removed"]) counts[key] += done[key];
    }
    catch (err) {
      console.error(`${SYSTEM_ID} | Could not give ${actor.uuid} the skills of its items`, err);
    }
  }
  return counts;
}

/* -------------------------------------------- */
/*  Trigger powers of items                     */
/* -------------------------------------------- */

/** The trigger powers of an item (flags.eternia.powers), or null. */
export function powersOf(item) {
  if (!POWER_TYPES.includes(item?.type)) return null;
  const powers = item.flags?.[SYSTEM_ID]?.powers;
  return powers?.length ? powers : null;
}

/** The skills an actor has from the powers of its items, by the id of the item. */
export function itemSkillsOf(actor) {
  const skills = new Map();
  for (const skill of actor?.items ?? []) {
    const link = (skill.type === "skill") ? skill.getFlag(SYSTEM_ID, ITEM_SKILL) : null;
    if (!link?.item) continue;
    if (!skills.has(link.item)) skills.set(link.item, []);
    skills.get(link.item).push(skill);
  }
  for (const list of skills.values()) list.sort((a, b) => toInt(a.getFlag(SYSTEM_ID, ITEM_SKILL).power) - toInt(b.getFlag(SYSTEM_ID, ITEM_SKILL).power));
  return skills;
}

/**
 * The skill an item is linked to (`system.linkedSkillUuid`): the skill with that id on the item's own actor
 * first (a copied character keeps the ids of its items, but its links still point at the original), else
 * the linked document.
 * @param {Item} item
 * @returns {Item|object|null}
 */
export function linkedSkill(item) {
  const uuid = item?.system?.linkedSkillUuid;
  if (!uuid) return null;
  const own = item.actor?.items.get(String(uuid).split(".").at(-1));
  if (own?.type === "skill") return own;
  try {
    return fromUuidSync(uuid) ?? null;
  }
  catch {
    return null;
  }
}

/** Markers of the powers in the item texts: English "[Trigger: …]" / "[Act: …]", Portuguese "[Momento: …]". */
const POWER_MARKER = /\[(?:Trigger|Act|Momento|Gatilho)\s*:[^\]]*\]/gi;
const HAS_POWER = /\[(?:Trigger|Act|Momento|Gatilho)\s*:/i;

/**
 * The text of each power in an item's description, in the language it is written in: from each marker to the
 * next one, or to the end of its line (the item's flavor text comes after). `rules`: all the rules text.
 * @param {string} html
 * @returns {{powers: string[], rules: string}}
 */
function powerTexts(html) {
  // A <template> parses without loading or running anything.
  const template = document.createElement("template");
  template.innerHTML = String(html ?? "").split(/<hr\s*\/?>/i)[0].replace(/<\/p>|<br\s*\/?>/gi, "\n");
  const text = template.content.textContent;
  const clean = s => s.replace(/\s+/g, " ").trim();
  const marks = [...text.matchAll(POWER_MARKER)];
  const powers = marks.map((m, i) => clean(text.slice(m.index, marks[i + 1]?.index ?? text.length).split("\n")[0]));
  const lines = text.split("\n");
  const last = lines.findLastIndex(line => HAS_POWER.test(line));
  return { powers, rules: clean(lines.slice(0, last + 1).join(" ")) };
}

/**
 * Source data of the skill of one power of an item.
 * @param {Item} item
 * @param {object[]} powers   The item's powers (see powersOf)
 * @param {number} index
 * @param {{powers: string[], rules: string}} texts   See powerTexts
 */
function skillData(item, powers, index, texts) {
  const power = powers[index];
  const name = (powers.length > 1) ? `${item.name} (${index + 1})` : item.name;
  // The item's own text, unless its powers can't be told apart (edited by hand): then the English one.
  const own = (texts.powers.length === powers.length) ? (power.whole ? texts.rules : texts.powers[index]) : "";
  const flags = { [ITEM_SKILL]: { item: item.id, power: index } };
  for (const key of ["crLock", "minHate", "notActed", "srOf"]) {
    if (power[key]) flags[key] = foundry.utils.deepClone(power[key]);
  }
  const system = {
    subtype: "Item",
    timing: power.timing,
    target: power.target,
    range: power.range,
    cost: power.cost,
    limit: power.limit,
    description: `<p>${escape(own || power.text)}</p>`
  };
  if (power.damage) system.damage = { ...power.damage };
  return {
    name,
    type: "skill",
    img: item.img,
    system,
    effects: (power.effects ?? []).map(e => ({ ...foundry.utils.deepClone(e), name, img: item.img })),
    flags: { [SYSTEM_ID]: flags }
  };
}

/**
 * Give a character the skills of the trigger powers of the items it carries, the first one linked to its
 * item (`system.linkedSkillUuid`: the item's icon in the inventory throws it), and remove the skills of
 * items it no longer has. An item linked by hand to a skill of its own is left as it is.
 * @param {Actor} actor
 * @param {object} [options]
 * @param {Item[]} [options.items]     Only these items (nothing is removed)
 * @param {boolean} [options.dryRun]   Only count.
 * @returns {Promise<{skills: number, links: number, removed: number}>}   Skills created, items (re)linked,
 *   skills removed.
 */
export async function syncItemSkills(actor, { items, dryRun = false } = {}) {
  const counts = { skills: 0, links: 0, removed: 0 };
  if (actor?.type !== "character") return counts;
  const byItem = itemSkillsOf(actor);
  const remove = items ? [] : [...byItem].filter(([id]) => !actor.items.has(id)).flatMap(([, skills]) => skills.map(s => s.id));
  const create = [];
  const linked = [];
  for (const item of items ?? actor.items) {
    const powers = powersOf(item);
    if (!powers) continue;
    const own = byItem.get(item.id) ?? [];
    const current = linkedSkill(item);
    if (current && !own.includes(current) && !current.getFlag?.(SYSTEM_ID, ITEM_SKILL)) continue;
    let texts = null;
    powers.forEach((power, index) => {
      if (own.some(s => s.getFlag(SYSTEM_ID, ITEM_SKILL).power === index)) return;
      texts ??= powerTexts(item.system.description);
      create.push(skillData(item, powers, index, texts));
    });
    const first = own.find(s => s.getFlag(SYSTEM_ID, ITEM_SKILL).power === 0);
    if (!first || (item.system.linkedSkillUuid !== first.uuid)) linked.push(item);
  }
  counts.skills = create.length;
  counts.removed = remove.length;
  if (dryRun) {
    counts.links = linked.length;
    return counts;
  }
  if (remove.length) await actor.deleteEmbeddedDocuments("Item", remove);
  if (create.length) await actor.createEmbeddedDocuments("Item", create);
  const now = itemSkillsOf(actor);
  const updates = linked.map(item => {
    const first = now.get(item.id)?.find(s => s.getFlag(SYSTEM_ID, ITEM_SKILL).power === 0);
    return (first && (item.system.linkedSkillUuid !== first.uuid)) ? { _id: item.id, "system.linkedSkillUuid": first.uuid } : null;
  }).filter(Boolean);
  if (updates.length) await actor.updateEmbeddedDocuments("Item", updates);
  counts.links = updates.length;
  return counts;
}

/** An item with trigger powers comes into a character's hands: its skills come with it. */
function onCreateItem(item, options, userId) {
  if ((userId !== game.user.id) || !setting("content") || (item.parent?.type !== "character") || !powersOf(item)) return;
  syncItemSkills(item.parent, { items: [item] })
    .catch(err => console.error(`${SYSTEM_ID} | Could not give ${item.parent.uuid} the skills of ${item.name}`, err));
}

/** A character made with its items (a copy, an import): the skills of their powers, linked to them. */
function onCreateActor(actor, options, userId) {
  if ((userId !== game.user.id) || !setting("content") || (actor.type !== "character")) return;
  if (!actor.items.some(item => powersOf(item))) return;
  syncItemSkills(actor).catch(err => console.error(`${SYSTEM_ID} | Could not give ${actor.uuid} the skills of its items`, err));
}

/**
 * An item leaves an actor: the skills of its powers leave with it. A skill of an item deleted by hand: the
 * item no longer links to it.
 */
function onDeleteItem(item, options, userId) {
  const actor = item.parent;
  if ((userId !== game.user.id) || !(actor instanceof Actor)) return;
  const ids = actor.items.filter(skill => skill.getFlag(SYSTEM_ID, ITEM_SKILL)?.item === item.id).map(skill => skill.id);
  if (ids.length) {
    actor.deleteEmbeddedDocuments("Item", ids)
      .catch(err => console.error(`${SYSTEM_ID} | Could not remove the skills of ${item.name}`, err));
  }
  const owner = actor.items.get(item.getFlag(SYSTEM_ID, ITEM_SKILL)?.item ?? "");
  if (owner && String(owner.system.linkedSkillUuid ?? "").endsWith(`Item.${item.id}`)) {
    owner.update({ "system.linkedSkillUuid": "" })
      .catch(err => console.error(`${SYSTEM_ID} | Could not unlink ${owner.uuid}`, err));
  }
}

/* -------------------------------------------- */
/*  Statuses at the start of the scene          */
/* -------------------------------------------- */

/**
 * A combat starts: each character gets the statuses of its equipped items ("You gain [Cancel (Cold): 15]
 * at the start of the scene"). Statuses it already has with that Rating aren't added twice.
 * @param {Combat} combat
 */
async function sceneStatuses(combat) {
  for (const actor of combatActors(combat)) {
    const entries = actor.items
      .filter(item => EQUIPMENT.includes(item.type) && (item.system.equipped !== false))
      .flatMap(item => item.getFlag(SYSTEM_ID, "sceneStatuses") ?? []);
    if (!entries.length) continue;

    const bad = actor._source.system?.["bad-status"] ?? {};
    const lists = { cancel: [...(bad.cancels ?? [])], weakness: [...(bad.weaknesses ?? [])] };
    const updates = {};
    for (const entry of entries) {
      if (lists[entry.status]) {
        const list = lists[entry.status];
        for (const raw of (entry.tags?.length ? entry.tags : [""])) {
          const tag = raw ? canonicalTag(raw) : "";
          const same = list.some(e => (String(e?.tag ?? "") === tag) && (toInt(e?.value ?? e) >= entry.value));
          if (!same) list.push({ value: entry.value, tag });
        }
      }
      else if (["barrier", "regen"].includes(entry.status)) {
        const key = `system.bad-status.${entry.status}`;
        updates[key] = Math.max(toInt(bad[entry.status]), toInt(updates[key]), entry.value);
      }
    }
    if (lists.cancel.length !== (bad.cancels ?? []).length) updates["system.bad-status.cancels"] = lists.cancel;
    if (lists.weakness.length !== (bad.weaknesses ?? []).length) updates["system.bad-status.weaknesses"] = lists.weakness;
    if (!foundry.utils.isEmpty(updates)) await actor.update(updates);
  }
}

/* -------------------------------------------- */
/*  Food                                        */
/* -------------------------------------------- */

/** The Fatigue a used item removes (its use card keeps a copy of the item). */
const foodOf = message => toInt(message.getFlag("eternia", "use")?.item?.flags?.[SYSTEM_ID]?.fatigue);

/** Someone used a food or a healing item: whoever eats or drinks it gets its effect. */
function onCreateMessage(message, options, userId) {
  if ((userId !== game.user.id) || !setting("content")) return;
  if (foodOf(message)) eat(message).catch(err => console.error(`${SYSTEM_ID} | Food failed`, err));
  if (healOf(message)) drink(message).catch(err => console.error(`${SYSTEM_ID} | Healing failed`, err));
}

/** Who gets a used item's effect: the user (Target: Self), else the targeted characters, else the user. */
function recipients(use) {
  const user = fromUuidSync(use.actorUuid);
  const targets = use.self ? [user] : [...game.user.targets].map(t => t.actor);
  return [...new Set((targets.length ? targets : [user]).filter(a => a?.type === "character"))];
}

async function eat(message) {
  const eaters = recipients(message.getFlag("eternia", "use"));
  const fed = [];
  for (const actor of eaters) {
    const result = actor.isOwner ? await feed(actor, foodOf(message))
      : await request("eterniaFood", { messageId: message.id, actorUuid: actor.uuid });
    if (result?.ok) fed.push(`${actorName(actor)} ${result.before} → ${result.after}`);
  }
  if (fed.length) await message.setFlag(SYSTEM_ID, "fed", fed);
}

async function feed(actor, amount) {
  const before = toInt(actor._source.system.infos?.fatigue);
  const after = Math.max(0, before - amount);
  if (after !== before) await actor.update({ "system.infos.fatigue": after });
  return { ok: true, before, after };
}

/** GM side: feed a character the user doesn't own, from that user's own food card, once each. */
async function onFoodRequest({ messageId, actorUuid }, user) {
  const message = game.messages.get(messageId);
  const actor = await fromUuid(actorUuid);
  if (!message || (message.author?.id !== user.id) || !foodOf(message) || (actor?.type !== "character")) return { ok: false };
  const done = message.getFlag(SYSTEM_ID, "fedActors") ?? [];
  if (done.includes(actor.uuid)) return { ok: false };
  await message.setFlag(SYSTEM_ID, "fedActors", [...done, actor.uuid]);
  return feed(actor, foodOf(message));
}

/** The use card says who ate it and their Fatigue. */
function renderFood(message, html) {
  const fed = message.getFlag(SYSTEM_ID, "fed");
  if (!fed?.length) return;
  const card = html.querySelector(".chat-card") ?? html.querySelector(".message-content");
  card?.insertAdjacentHTML("beforeend",
    `<div class="lhauto-use"><span><i class="fa-solid fa-utensils"></i> ${escape(L("Content.Fed", { amount: foodOf(message), names: fed.join(", ") }))}</span></div>`);
}

/* -------------------------------------------- */
/*  Healing items                               */
/* -------------------------------------------- */

/**
 * The healing of a used item (its use card keeps a copy of it): its own (flags.eternia.heal; the Jewels heal the target's
 * Character Rank plus `mod`), else its damage when it is a healing nobody resists ("Recovers 25 points of
 * target's [HP]").
 * @param {ChatMessage} message
 * @returns {{dice?: number, mod: number|string, targetCr?: boolean, healer?: boolean}|null}
 */
function healOf(message) {
  const item = message.getFlag("eternia", "use")?.item;
  const own = item?.flags?.[SYSTEM_ID]?.heal;
  if (own) return own;
  const damage = item?.system?.damage;
  if (!damage?.recovery || !hasDamage(damage)) return null;
  if (item.system.check?.vs || /\bvs\b/i.test(item.system.checkType ?? "")) return null;
  return { dice: toInt(damage.dice), mod: damage.mod };
}

/** The HP a healing gives a character: its roll, plus the character's own CR for the Jewels. */
const healAmount = (heal, rolled, actor) => rolled + (heal.targetCr ? toInt(actor.system.infos?.crank) : 0);

/** Someone used a healing item: it is rolled once, and heals each recipient. */
async function drink(message) {
  const heal = healOf(message);
  const use = message.getFlag("eternia", "use");
  const user = fromUuidSync(use.actorUuid);
  let rolled = toInt(heal.mod);
  if (heal.dice || (typeof heal.mod === "string")) {
    const mod = (typeof heal.mod === "string") ? (evaluateFormula(heal.mod, formulaData(user, null)) ?? 0) : toInt(heal.mod);
    rolled = (await new Roll(diceFormula({ dice: toInt(heal.dice), mod })).evaluate()).total;
  }
  await message.setFlag(SYSTEM_ID, "healRoll", rolled);
  const healed = [];
  for (const actor of recipients(use)) {
    const result = actor.isOwner ? await healActor(actor, healAmount(heal, rolled, actor), heal)
      : await request("eterniaHeal", { messageId: message.id, actorUuid: actor.uuid });
    if (result?.ok) healed.push(result.line);
  }
  if (healed.length) await message.setFlag(SYSTEM_ID, "healed", healed);
}

/** Heal a character: up to its Max HP; back on its feet if it was Incapacitated (not Dead). */
async function healActor(actor, amount, heal) {
  const name = actorName(actor);
  if (heal.healer && !actor.items.some(i => (i.type === "class") && (i.system.archetype === "healer"))) {
    return { ok: true, line: L("Content.NotHealer", { name }) };
  }
  if (actor.statuses.has("dead")) return { ok: true, line: L("Content.Dead", { name }) };
  const max = toInt(actor.system.health?.max);
  const before = toInt(actor.system.health?.value);
  const after = Math.max(before, Math.min(max, before + amount));
  if (after !== before) await actor.update({ "system.health.value": after });
  if ((after > 0) && actor.statuses.has("incapacitated")) await actor.toggleStatusEffect("incapacitated", { active: false });
  return { ok: true, line: `${name} ${before} → ${after}` };
}

/** GM side: heal a character the user doesn't own, from that user's own card, once each. */
async function onHealRequest({ messageId, actorUuid }, user) {
  const message = game.messages.get(messageId);
  const actor = await fromUuid(actorUuid);
  const heal = message && healOf(message);
  if (!heal || (message.author?.id !== user.id) || (actor?.type !== "character")) return { ok: false };
  const done = message.getFlag(SYSTEM_ID, "healedActors") ?? [];
  if (done.includes(actor.uuid)) return { ok: false };
  await message.setFlag(SYSTEM_ID, "healedActors", [...done, actor.uuid]);
  return healActor(actor, healAmount(heal, toInt(message.getFlag(SYSTEM_ID, "healRoll")), actor), heal);
}

/** The use card says who was healed and their HP; its own Damage button would heal them again. */
function renderHeal(message, html) {
  const healed = message.getFlag(SYSTEM_ID, "healed");
  if (!healed?.length) return;
  html.querySelectorAll(".item-use-roll[data-roll='damage']").forEach(button => button.remove());
  const card = html.querySelector(".chat-card") ?? html.querySelector(".message-content");
  card?.insertAdjacentHTML("beforeend",
    `<div class="lhauto-use"><span><i class="fa-solid fa-heart-pulse"></i> ${escape(L("Content.Healed", { names: healed.join(", ") }))}</span></div>`);
}
