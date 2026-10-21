/**
 * "Create effect" from a chat card (idea from PF2e Extempore Effects, written for the durations of the eternia
 * system): right click a skill, item, use, attack or damage card → an Active Effect on the user's targets (else
 * the selected tokens), named after the card's skill, with its picture and text, lasting to the end of the
 * Process, of the Round or of the Scene (flags.eternia.expires, which the system ends).
 * It has no changes yet: it marks a buff or a debuff the skill only describes in text, and its sheet opens to add
 * them. Actors the user doesn't own get it through the GM (the system's applyItemEffects relay).
 */
import { L, SYSTEM_ID, setting } from "../settings.mjs";
import { cardItem, chosenActors, giveEffects } from "./status-links.mjs";
import { actorName, escape } from "../helpers/utils.mjs";

const DURATIONS = ["endOfProcess", "endOfRound", "endOfScene"];
const DURATION_LABELS = {
  endOfProcess: "ETERNIA.EffectDuration.EndOfProcess",
  endOfRound: "ETERNIA.EffectDuration.EndOfRound",
  endOfScene: "ETERNIA.EffectDuration.EndOfScene"
};

/** Call during the `init` hook. */
export function registerQuickEffect() {
  Hooks.on("getChatMessageContextOptions", (app, options) => {
    options.push({
      label: "ETERNIA.QuickEffect.Menu",
      icon: '<i class="fa-solid fa-wand-magic-sparkles"></i>',
      visible: li => !!setting("quickEffect") && hasCardSource(game.messages.get(li.dataset.messageId)),
      onClick: (event, li) => {
        const message = game.messages.get(li.dataset.messageId);
        if (message) createFromCard(message).catch(err => console.error(`${SYSTEM_ID} | Could not create the effect`, err));
      }
    });
  });
}

/** Whether a message comes from a skill or an item. */
function hasCardSource(message) {
  const flags = message?.flags?.eternia ?? {};
  return !!(flags.attack || flags.damage || flags.use || /data-item-uuid="/.test(String(message?.content ?? "")));
}

/** The text of the effect: the skill's own text, else the card's. */
function cardText(item, message) {
  const own = item?.system?.description;
  if (own) return own;
  const div = document.createElement("div");
  div.innerHTML = message.content ?? "";
  return div.querySelector(".card-content, .item-description, .description")?.innerHTML ?? "";
}

async function createFromCard(message) {
  const actors = chosenActors();
  if (!actors.length) return ui.notifications.warn(L("QuickEffect.NoTargets"));
  const item = await cardItem(message);
  const name = item?.name ?? message.flavor ?? L("QuickEffect.Default");

  const options = DURATIONS.map(d => `<option value="${d}"${d === "endOfScene" ? " selected" : ""}>${escape(game.i18n.localize(DURATION_LABELS[d]))}</option>`).join("");
  const single = (actors.length === 1) && actors[0].isOwner;
  const choice = await foundry.applications.api.DialogV2.prompt({
    window: { title: L("QuickEffect.Title"), icon: "fa-solid fa-wand-magic-sparkles" },
    classes: ["lhauto-dialog"],
    content: `<p>${escape(L("QuickEffect.Intro", { names: actors.map(actorName).join(", ") }))}</p>
      <div class="form-group"><label>${escape(L("QuickEffect.Name"))}</label><input type="text" name="name" value="${escape(name)}"></div>
      <div class="form-group"><label>${escape(L("QuickEffect.Duration"))}</label><select name="expires">${options}</select></div>
      ${single ? `<div class="form-group"><label>${escape(L("QuickEffect.Open"))}</label><input type="checkbox" name="open" checked></div>` : ""}`,
    ok: {
      label: L("QuickEffect.Create"),
      callback: (event, button) => ({
        name: button.form.elements.name.value.trim() || name,
        expires: button.form.elements.expires.value || "endOfScene",
        open: !!button.form.elements.open?.checked
      })
    },
    rejectClose: false
  });
  if (!choice) return;

  const caster = item?.actor ?? ChatMessage.getSpeakerActor(message.speaker);
  const effect = {
    name: choice.name,
    img: item?.img ?? "icons/svg/aura.svg",
    description: cardText(item, message),
    origin: item?.uuid ?? null,
    transfer: false,
    disabled: false,
    flags: {
      [SYSTEM_ID]: {
        expires: choice.expires, itemUse: true, quickEffect: true,
        source: { itemUuid: item?.uuid ?? "", itemName: item?.name ?? choice.name, casterUuid: caster?.uuid ?? "", useId: foundry.utils.randomID() }
      }
    }
  };

  const done = [];
  for (const actor of actors) if (await giveEffects(actor, [effect])) done.push(actorName(actor));
  if (!done.length) return;
  ui.notifications.info(L("QuickEffect.Created", { name: choice.name, names: done.join(", ") }));
  if (choice.open) {
    const created = actors[0].effects.find(e => (e.getFlag("eternia", "source")?.useId === effect.flags.eternia.source.useId));
    created?.sheet?.render({ force: true });
  }
}
