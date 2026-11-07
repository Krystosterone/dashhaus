import type { LightEntity } from "./types";

/**
 * Its state in words, the same on every card and in every skin: On, Off, Unknown while Home Assistant can drive it but
 * hasn't said whether it is lit (a group, an optimistic or RF light), or Unavailable while it is.
 */
export const lightWord = (e: Pick<LightEntity, "state">) =>
  e.state === "unavailable" ? "Unavailable" : e.state === "unknown" ? "Unknown" : e.state === "on" ? "On" : "Off";

/** The quick levels, low to high: each one's name and its brightness. */
export const QUICK_LEVELS = [
  { value: 5, label: "Night", sub: "5%" },
  { value: 25, label: "Dim", sub: "25%" },
  { value: 50, label: "Half", sub: "50%" },
  { value: 100, label: "Full", sub: "100%" },
];

/** What the light can do, in small print after when: "Dimmable, warmth, colour", or "On / off". */
export const lightAbilities = (e: Pick<LightEntity, "supportsBrightness" | "supportsColorTemp" | "supportsColor">) =>
  e.supportsBrightness ? `Dimmable${e.supportsColorTemp ? ", warmth" : ""}${e.supportsColor ? ", colour" : ""}` : "On / off";
