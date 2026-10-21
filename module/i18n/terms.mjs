/**
 * The skill fields (Timing, Target, Range, Cost, Limit, Check) and the tags as the table reads them. The system
 * stores and reads them in English; in Portuguese they are shown through the translators of pt-br.mjs, in any
 * other language as they are stored. The character sheet, the monster sheet and the action HUD use these.
 */
import { FIELD_TRANSLATORS, translateTag } from "./pt-br.mjs";

/** Whether the values are shown in Portuguese. */
const portuguese = () => game.i18n?.lang === "pt-BR";

/** A skill field as the table reads it ("Hate 2" → "Ódio 2"). */
export const term = (field, value) => ((portuguese() && FIELD_TRANSLATORS[field]) ? FIELD_TRANSLATORS[field](value) : value);

/** A tag as the table reads it. */
export const tagLabel = tag => (portuguese() ? translateTag(tag) : tag);

/** Whether a skill field is empty ("", "-", "—"). */
export const isEmpty = value => !value || /^[\p{Pd}−\s]*$/u.test(String(value));
