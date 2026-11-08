import type { HumidifierAction, HumidifierEntity } from "./types";

/** What the unit is doing, in words. */
export const ACTION_LABEL: Record<HumidifierAction, string> = { humidifying: "Humidifying", drying: "Drying", idle: "Idle", off: "Off" };

/** Home Assistant sets and reports humidity in whole percent. */
export const fmtHumidity = (h: number) => String(Math.round(h));

/** A mode as words: "comfort_night" → "Comfort night". */
export const modeLabel = (m: string) => m.charAt(0).toUpperCase() + m.slice(1).replace(/_/g, " ");

/** What it is, in small print: a humidifier, or by its device class a dehumidifier. */
export const kindLabel = (kind: HumidifierEntity["kind"]) => (kind === "dehumidifier" ? "Dehumidifier" : "Humidifier");

/**
 * What the unit is, after when, in small print, the same in every skin: its kind and the range it can be set across
 * ("Humidifier · 30–80%"); its kind alone while unavailable, when the range is the mapper's default, not the unit's.
 */
export const humidifierFacts = (e: Pick<HumidifierEntity, "kind" | "minHumidity" | "maxHumidity">, unavailable = false) =>
  unavailable ? kindLabel(e.kind) : `${kindLabel(e.kind)} · ${fmtHumidity(e.minHumidity)}–${fmtHumidity(e.maxHumidity)}%`;

/** What its target does: a humidifier humidifies up to it, a dehumidifier dries down to it. */
export const targetVerb = (kind: HumidifierEntity["kind"]) => (kind === "dehumidifier" ? "Dry to" : "Humidify to");
