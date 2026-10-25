import { fmt1 } from "../format";
import type { HvacAction, HvacMode } from "./types";

/** Label per mode. Heat or cool is told by the mode icon and the action words, never by a colour. */
export const MODE_META: Record<HvacMode, { label: string }> = {
  off: { label: "Off" },
  heat: { label: "Heat" },
  cool: { label: "Cool" },
  heat_cool: { label: "Heat/\u200bCool" },
  auto: { label: "Auto" },
  dry: { label: "Dry" },
  fan_only: { label: "Fan only" },
};

export const ACTION_LABEL: Record<HvacAction, string> = {
  heating: "Heating",
  cooling: "Cooling",
  idle: "Idle",
  off: "Off",
  drying: "Drying",
  fan: "Fan",
};

export const fmtTarget = (t: number) => (Number.isInteger(t) ? String(t) : fmt1(t));
export const fmtCurrent = (t: number) => fmt1(t);
export const titleCase = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, " ");

/** HA heat_cool requires target_temp_low <= target_temp_high; order whatever the caller gives. */
export const orderedRange = (lo: number, hi: number): [number, number] => [Math.min(lo, hi), Math.max(lo, hi)];
