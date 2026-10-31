/**
 * Mounts (Montarias): the earth dragons and whatever else a character rides. Data and pure helpers only.
 *
 * A mount is an item of type `mount`: its level, price, Speed (`speed`), saddlebag space (`bagSpace`), Initiative
 * and Defenses count while the character rides it, which is the item being "equipped" (one at a time; the numbers
 * in documents/actor.mjs). Its rules are in `flags.eternia.mount`:
 *   blessing   "wind": the Wind-Repelling Blessing of the earth dragons (mounted, the Dash spends no Minor Action)
 *   token      the mount's token, in the bestiary's frame (assets/tokens/mounts/): the portrait of its sheet; its icon
 *              (`img`) stays in the inventory, the HUD and the shops
 * Its skills are trigger powers (`flags.eternia.powers`, content/content.mjs) that only work mounted, and its
 * [Mounted] effect (statuses ["mounted"]) shows on the rider's token while it rides.
 */

export const MOUNT_TYPE = "mount";
/** The status of a rider (an effect of the mount, transferred while it rides). */
export const MOUNTED = "mounted";
/** Statuses that throw a rider off its mount: a fall, death, the ground. */
export const THROWN_BY = ["incapacitated", "dying", "dead", "prone"];
/** The Wind-Repelling Blessing of the earth dragons. */
export const WIND = "wind";
/** The icon of the [Mounted] status. */
export const MOUNTED_IMG = "systems/eternia/assets/ui/status/mounted.svg";

/**
 * The [Mounted] effect a mount gives its rider (the item's own effect, transferred while equipped). It has no duration:
 * its icon shows on the token always (CONST.ACTIVE_EFFECT_SHOW_ICON.ALWAYS), while the mount is ridden.
 */
export function mountedEffect(name) {
  return {
    name, img: MOUNTED_IMG, type: "base", transfer: true, disabled: false, statuses: [MOUNTED], showIcon: 2,
    system: { changes: [] }, description: "", flags: { eternia: { mounted: true } }
  };
}
