import type { HumidifierAction, HumidifierEntity } from "./types";

/** What the unit is doing, in words. */
export const ACTION_LABEL: Record<HumidifierAction, string> = { humidifying: "Humidifying", drying: "Drying", idle: "Idle", off: "Off" };

/** Home Assistant sets and reports humidity in whole percent. */
export const fmtHumidity = (h: number) => String(Math.round(h));

/** A mode as words: "comfort_night" → "Comfort night". */
export const modeLabel = (m: string) => m.charAt(0).toUpperCase() + m.slice(1).replace(/_/g, " ");

/** What its target does: a humidifier humidifies up to it, a dehumidifier dries down to it. */
export const targetVerb = (kind: HumidifierEntity["kind"]) => (kind === "dehumidifier" ? "Dry to" : "Humidify to");
