/**
 * The mounts of a character and the one it rides.
 */
import { SYSTEM_ID } from "../settings.mjs";
import { MOUNT_TYPE, WIND } from "./data.mjs";

/** The mounts a character owns. */
export const mountsOf = actor => actor?.itemTypes?.[MOUNT_TYPE] ?? [];

/** The mount the character rides, or null. */
export const riddenMount = actor => mountsOf(actor).find(item => item.system.equipped === true) ?? null;

/** The rules of a mount's breed (`flags.eternia.mount`). */
export const mountRules = item => item?.flags?.[SYSTEM_ID]?.mount ?? {};

/** Whether a character rides with the Wind-Repelling Blessing of the earth dragons. */
export const windBlessed = actor => mountRules(riddenMount(actor)).blessing === WIND;
