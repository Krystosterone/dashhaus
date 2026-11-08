/**
 * A device's battery, as a composed model carries it: a percentage from 0 to 100, or nothing when the device doesn't
 * say. Shared by every card that composes a same-device battery (a room sensor, a lock), so "low" means one thing.
 */

/** At or under this percentage, a battery is low: a card shows it behind the warning marker (advisory). */
export const LOW_BATTERY = 15;

/** A known battery level at or under LOW_BATTERY. */
export const isLowBattery = (level: number | undefined): level is number => level != null && level <= LOW_BATTERY;

/** A battery's level in words, as every card says it: "Battery 12%". */
export const batteryText = (level: number) => `Battery ${level}%`;

/** What a low battery asks for, after its level: "replace soon". */
export const BATTERY_ADVICE = "replace soon";

/** A low battery's level and what it asks for, in small print and a hint: "Battery 12%, replace soon". */
export const batteryAdvice = (level: number) => `${batteryText(level)}, ${BATTERY_ADVICE}`;

/** A low battery said in full, for a screen reader: "battery 12% on Hall sensor, replace soon". */
export const batterySaid = (level: number, name: string) => `battery ${level}% on ${name}, ${BATTERY_ADVICE}`;
