import type { FanEntity } from "./types";
import { namedSpeeds, percentOf } from "./speed";

/** A preset as a word: "breeze" → "Breeze", "smart_mode" → "Smart mode". */
export const presetLabel = (preset: string) => preset.charAt(0).toUpperCase() + preset.slice(1).replace(/_/g, " ");

/** The direction as a word. */
export const DIRECTION_LABEL = { forward: "Forward", reverse: "Reverse" } as const;

/** What it runs as, while on: its preset, or that it sweeps. Null while off, or running plain. */
export const fanMode = (e: FanEntity) =>
  e.state !== "on" ? null : e.presetMode ? presetLabel(e.presetMode) : e.oscillating ? "Oscillating" : null;

/** A speed control's spoken value: "Speed 2 of 3" or "40 percent", and "Off. Last set to …" while off. */
export function speedValueText(speed: number, count: number, on: boolean) {
  const said = namedSpeeds(count) ? `speed ${speed} of ${count}` : `${percentOf(speed, count)} percent`;
  return on ? said.charAt(0).toUpperCase() + said.slice(1) : `Off. Last set to ${said}`;
}

/** What the fan can do, for its details: "3 speeds, presets, oscillates", or "On / off". */
export function fanAbilities(e: FanEntity) {
  const count = e.speedCount ?? 0;
  const parts = [
    e.supportsSpeed && count >= 2 ? (namedSpeeds(count) ? `${count} speeds` : "variable speed") : null,
    e.supportsPreset ? "presets" : null,
    e.supportsOscillate ? "oscillates" : null,
    e.supportsDirection ? "reverses" : null,
  ].filter(Boolean).join(", ");
  return parts ? parts.charAt(0).toUpperCase() + parts.slice(1) : "On / off";
}
