import { fmt1 } from "../../shared/ui";
import type { HvacAction, HvacMode } from "./types";

/** Tone per mode: warm apricot for heat, cool blue for cool, the house butter for auto modes. */
export const MODE_META: Record<HvacMode, { label: string; c: number; h: number }> = {
  off: { label: "Off", c: 0.02, h: 80 },
  heat: { label: "Heat", c: 0.13, h: 52 },
  cool: { label: "Cool", c: 0.09, h: 235 },
  heat_cool: { label: "Heat/\u200bCool", c: 0.13, h: 92 },
  auto: { label: "Auto", c: 0.13, h: 92 },
  dry: { label: "Dry", c: 0.07, h: 205 },
  fan_only: { label: "Fan only", c: 0.06, h: 170 },
};

export const ACTION_LABEL: Record<HvacAction, string> = {
  heating: "Heating",
  cooling: "Cooling",
  idle: "Idle",
  off: "Off",
  drying: "Drying",
  fan: "Fan",
};

/** CSS color in a mode's tone, at the theme's accent lightness. */
export const toneColor = (m: HvacMode) => `oklch(var(--accent-l) ${MODE_META[m].c} ${MODE_META[m].h})`;

export const fmtTarget = (t: number) => (Number.isInteger(t) ? String(t) : fmt1(t));
export const fmtCurrent = (t: number) => fmt1(t);
export const titleCase = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, " ");

/** HA heat_cool requires target_temp_low <= target_temp_high; order whatever the caller gives. */
export const orderedRange = (lo: number, hi: number): [number, number] => [Math.min(lo, hi), Math.max(lo, hi)];

const P = { fill: "none", stroke: "currentColor" } as const;
export function ThermostatIcon() {
  return <svg viewBox="0 0 20 20" aria-hidden="true" {...P}><path d="M8 11.6V4.5a2 2 0 1 1 4 0v7.1a3.5 3.5 0 1 1-4 0Z" /><path d="M10 9v5" /></svg>;
}

export function ModeIcon({ mode, unavailable }: { mode: HvacMode; unavailable?: boolean }) {
  if (unavailable) return <svg viewBox="0 0 20 20" aria-hidden="true" {...P}><path d="M10 3v6M6.2 5.6a6 6 0 1 0 7.6 0" /><path d="M3.5 3.5l13 13" /></svg>;
  switch (mode) {
    case "heat":
      return <svg viewBox="0 0 20 20" aria-hidden="true" {...P}><path d="M10 17.5c-3 0-5-2.1-5-4.8 0-2.6 1.8-4 3-5.6.6 1.4 1.5 2.1 2.3 2.4C10.4 7 10 4.8 11.4 2.5c1.6 2 3.6 4.6 3.6 7.6v2.6c0 2.7-2 4.8-5 4.8Z" /></svg>;
    case "cool":
      return <svg viewBox="0 0 20 20" aria-hidden="true" {...P}><path d="M10 2.5v15M3.5 6.25l13 7.5M16.5 6.25l-13 7.5M8 3.9l2 1.5 2-1.5M8 16.1l2-1.5 2 1.5" /></svg>;
    case "heat_cool":
    case "auto":
      return <svg viewBox="0 0 20 20" aria-hidden="true" {...P}><path d="M7 14V5.5m0 0L4.6 7.9M7 5.5l2.4 2.4M13 6v8.5m0 0l-2.4-2.4m2.4 2.4l2.4-2.4" /></svg>;
    case "dry":
      return <svg viewBox="0 0 20 20" aria-hidden="true" {...P}><path d="M10 3.2s5 5.3 5 8.6a5 5 0 0 1-10 0c0-3.3 5-8.6 5-8.6Z" /></svg>;
    case "fan_only":
      return <svg viewBox="0 0 20 20" aria-hidden="true" {...P}><circle cx="10" cy="10" r="1.6" /><path d="M10 8.4c-.6-3.2.4-5.4 2.4-5.4s1.8 3.4-2.4 5.4ZM11.5 10.9c3 1.2 4.4 3.3 3.4 5s-3.8.1-3.4-5ZM8.5 10.9c-2.5 2-4.9 2.3-5.9.6s1.9-3.1 5.9-.6Z" /></svg>;
    default:
      return <svg viewBox="0 0 20 20" aria-hidden="true" {...P}><path d="M10 3v6M6.2 5.6a6 6 0 1 0 7.6 0" /></svg>;
  }
}
