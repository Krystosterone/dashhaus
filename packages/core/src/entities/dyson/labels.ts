import type { FanDirection } from "../fan/types";
import { namedSpeeds } from "../fan/speed";
import type { DysonEntity } from "./types";

/** Dyson's word for the fan's direction: its airflow out of the front, or out of the back (diffused). */
export const AIRFLOW_LABEL: Record<FanDirection, string> = { forward: "Front", reverse: "Back" };

/** The ranges a Pure Cool sweeps, as its app offers them, in degrees. */
export const DYSON_SWEEPS = [45, 90, 180, 350] as const;

/**
 * Where a Pure Cool or Hot+Cool turns, as its integration counts it, round its own base: the lowest and highest angle,
 * and the one straight out of the front of the base, opposite its cable, where its presets centre their sweeps. A lower
 * angle turns it to its left, seen from behind.
 */
export interface DysonAngles {
  min: number;
  max: number;
  ahead: number;
}

/** `dyson_local` (ha-dyson, on libdyson): 5-355°, 180° ahead. */
export const DYSON_LOCAL_ANGLES: DysonAngles = { min: 5, max: 355, ahead: 180 };
/** `hass_dyson` (hass-dyson): 0-350°, 175° ahead, the middle of its widest sweep. */
export const HASS_DYSON_ANGLES: DysonAngles = { min: 0, max: 350, ahead: 175 };

/** The narrowest sweep the fan takes; narrower, it holds still at one angle. */
export const DYSON_MIN_SWEEP = 30;

/** How it may oscillate on its angles: still, pointing one way (0), or one of its app's sweeps. */
export const DYSON_SPREADS = [0, ...[45, 90, 180, 350]] as const;

/** A spread in words: 0 → "Still", 90 → "90°". */
export const spreadLabel = (spread: number) => (spread === 0 ? "Still" : `${spread}°`);

/**
 * The angles that aim it at `aim` with `spread` around it, inside what it turns to: one angle twice to hold still,
 * else a sweep at least `DYSON_MIN_SWEEP` wide, moved whole to stay inside its range.
 */
export function aimAngles(aim: number, spread: number, range: DysonAngles = DYSON_LOCAL_ANGLES): { angle_low: number; angle_high: number } {
  const span = spread <= 0 ? 0 : Math.min(range.max - range.min, Math.max(DYSON_MIN_SWEEP, Math.round(spread)));
  const low = Math.min(range.max - span, Math.max(range.min, Math.round(aim - span / 2)));
  return { angle_low: low, angle_high: low + span };
}

/** Where it points, from its angles: the middle of its sweep, or the angle it holds. */
export const aimOf = (low: number, high: number) => Math.round((low + high) / 2);

/**
 * Where it points in words, seen from behind the fan: "ahead", "58° right", "55° left". A lower angle turns it left
 * (checked on a hass-dyson Pure Cool: from 175° to 120° its head turned to its left).
 */
export function aimWords(aim: number, ahead = DYSON_LOCAL_ANGLES.ahead) {
  const off = Math.round(aim - ahead);
  if (Math.abs(off) < 3) return "ahead";
  return `${Math.abs(off)}° ${off < 0 ? "left" : "right"}`;
}

/** A sweep in Dyson's words: 90 → "90°". */
export const sweepLabel = (degrees: number) => `${degrees}°`;

/**
 * The angles a sweep of `degrees` takes around `centre`, kept inside what the fan turns to: `set_angle`'s
 * `angle_low` and `angle_high`.
 */
export function sweepAngles(degrees: number, centre?: number, range: DysonAngles = DYSON_LOCAL_ANGLES): { angle_low: number; angle_high: number } {
  const span = Math.min(range.max - range.min, Math.max(0, Math.round(degrees)));
  const low = Math.min(range.max - span, Math.max(range.min, Math.round((centre ?? range.ahead) - span / 2)));
  return { angle_low: low, angle_high: low + span };
}

/** The sweep a Pure Cool's angles make, where it is one its app offers (within two degrees). */
export function sweepOf(low: number, high: number): number | undefined {
  return DYSON_SWEEPS.find((s) => Math.abs(high - low - s) <= 2);
}

/** The oscillation chips' value: Off, else the range it sweeps (none while it sweeps one of its own), else On. */
export function oscillationChoice(e: Pick<DysonEntity, "oscillating" | "oscillationModes" | "oscillationMode">): string | null {
  if (e.oscillating == null) return null;
  if (!e.oscillating) return "off";
  return e.oscillationModes?.length ? e.oscillationMode ?? null : "on";
}

/**
 * What it runs as, while on, for its status line: heating to its target first, then Auto, Night, or that it sweeps.
 * Null while off, or running plain.
 */
export function dysonMode(e: DysonEntity): string | null {
  if (e.state !== "on") return null;
  if (e.heatOn && e.heatTarget != null) return `Heat ${e.heatTarget}${e.heatUnit === "°F" ? "°F" : "°"}`;
  if (e.auto) return "Auto";
  if (e.nightMode) return "Night";
  if (e.oscillating && e.oscillationLow != null && e.oscillationHigh != null && e.oscillationLow === e.oscillationHigh) {
    return `Points ${aimWords(e.oscillationLow, e.angles?.ahead)}`;
  }
  if (e.oscillating) return e.oscillationMode ? `Sweeps ${e.oscillationMode}` : "Oscillating";
  return null;
}

/** What it can do, for its details: "10 speeds, auto, oscillates 45-350°, night mode, heats". */
export function dysonAbilities(e: DysonEntity) {
  const count = e.speedCount ?? 0;
  const modes = e.oscillationModes ?? [];
  const parts = [
    e.supportsSpeed && count >= 2 ? (namedSpeeds(count) ? `${count} speeds` : "variable speed") : null,
    e.supportsAuto ? "auto" : null,
    e.supportsOscillate ? (modes.length ? `oscillates ${modes.join(", ")}` : "oscillates") : null,
    e.supportsDirection ? "front or back airflow" : null,
    e.supportsNightMode ? "night mode" : null,
    e.supportsHeat ? "heats" : null,
  ].filter(Boolean).join(", ");
  return parts ? parts.charAt(0).toUpperCase() + parts.slice(1) : "On / off";
}
