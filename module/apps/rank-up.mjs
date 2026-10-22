/**
 * Character Rank Up (Log Ticket): +1 CR. Base Stats (+1 each) and Max HP (+ class HP Modifier)
 * follow on their own in EterniaActor#prepareDerivedData; this confirms the change and records it
 * in the chat, and opens the skill selection for the skills the character can now acquire or rank up.
 */

import { classStats, getOption } from "../helpers/character-options.mjs";
import { offerGrants } from "./option-grants.mjs";
import { SkillBrowser, rankUpSkills, startSkillProgress } from "./skill-browser.mjs";
import { confirmBox } from "../helpers/dialogs.mjs";

/**
 * Raise the Character Rank of a character by one, after confirmation.
 * @param {Actor} actor
 * @returns {Promise<boolean>} The rank was raised
 */
export async function rankUp(actor) {
  const from = Number(actor.system.infos.crank) || 1;
  const to = from + 1;
  const hp = classStats(actor)?.hpPerRank ?? 0;
  const skills = rankUpSkills(to);
  const gains = [
    game.i18n.format("ETERNIA.RankUp.GainHP", { hp }),
    game.i18n.localize("ETERNIA.RankUp.GainStats"),
    game.i18n.format("ETERNIA.RankUp.GainSkills", skills)
  ];
  const list = `<ul>${gains.map(g => `<li>${g}</li>`).join("")}</ul>`;

  const confirmed = await confirmBox({
    title: game.i18n.localize("ETERNIA.RankUp.Window"),
    icon: "fa-solid fa-angles-up",
    classes: ["rank-up-dialog"],
    img: actor.img,
    eyebrow: game.i18n.localize("ETERNIA.RankUp.Button"),
    heading: actor.name,
    lead: game.i18n.format("ETERNIA.RankUp.Confirm", { from, to }),
    lines: gains.map((text, i) => ({ text, kind: "gain", icon: ["fa-solid fa-heart", "fa-solid fa-chart-simple", "fa-solid fa-book-open"][i] })),
    yes: game.i18n.localize("ETERNIA.RankUp.Button"),
    yesIcon: "fa-solid fa-angles-up",
    no: game.i18n.localize("ETERNIA.Use.Cancel")
  });
  if (!confirmed) return false;

  // The skill picks owed follow the CR (see skill-browser.mjs).
  await startSkillProgress(actor);
  await actor.update({ "system.infos.crank": to }, { eterniaRankUp: true });
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content: `<div class="eternia rank-up-card"><h3><i class="fa-solid fa-angles-up"></i> `
      + `${game.i18n.format("ETERNIA.RankUp.Chat", { name: actor.name, to })}</h3>${list}</div>`
  });
  // What the class gives at this CR (its Path at CR 3, its Apex at CR 10), before the picks.
  const job = getOption(actor, "class");
  if (job) await offerGrants(actor, job, { above: 1, withStale: false });
  SkillBrowser.open(actor);
  return true;
}
