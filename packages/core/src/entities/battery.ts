/**
 * A device's battery, as a composed model carries it: a percentage from 0 to 100, or nothing when the device doesn't
 * say. Shared by every card that composes a same-device battery (a room sensor, a lock), so "low" means one thing.
 */

/** At or under this percentage, a battery is low: a card shows it behind the warning marker (advisory). */
export const LOW_BATTERY = 15;

/** A known battery level at or under LOW_BATTERY. */
export const isLowBattery = (level: number | undefined): level is number => level != null && level <= LOW_BATTERY;
