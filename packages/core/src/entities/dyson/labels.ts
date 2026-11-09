import type { FanDirection } from "../fan/types";
import { namedSpeeds } from "../fan/speed";
import type { DysonEntity } from "./types";

/** Dyson's word for the fan's direction: its airflow out of the front, or out of the back (diffused). */
export const AIRFLOW_LABEL: Record<FanDirection, string> = { forward: "Front", reverse: "Back" };

/** The ranges a Pure Cool sweeps, as its app offers them, in degrees. */
export const DYSON_SWEEPS = [45, 90, 180, 350] as const;

/** The narrowest and widest a Pure Cool's oscillation angles go. */
export const DYSON_ANGLE_MIN = 5;
export const DYSON_ANGLE_MAX = 355;

/** Straight out of the front of the base: where Dyson's own presets centre their sweeps. */
export const DYSON_AHEAD = 180;

/** The narrowest sweep the fan takes; narrower, it holds still at one angle. */
export const DYSON_MIN_SWEEP = 30;

/** How it may oscillate on its angles: still, pointing one way (0), or one of its app's sweeps. */
export const DYSON_SPREADS = [0, ...[45, 90, 180, 350]] as const;

/** A spread in words: 0 → "Still", 90 → "90°". */
export const spreadLabel = (spread: number) => (spread === 0 ? "Still" : `${spread}°`);

/**
 * The angles that aim it at `aim` with `spread` around it, inside what it turns to: one angle twice to hold still,
 * else a sweep at least `DYSON_MIN_SWEEP` wide, moved whole to stay inside 5-355°.
 */
export function aimAngles(aim: number, spread: number): { angle_low: number; angle_high: number } {
  const span = spread <= 0 ? 0 : Math.min(DYSON_ANGLE_MAX - DYSON_ANGLE_MIN, Math.max(DYSON_MIN_SWEEP, Math.round(spread)));
  const low = Math.min(DYSON_ANGLE_MAX - span, Math.max(DYSON_ANGLE_MIN, Math.round(aim - span / 2)));
  return { angle_low: low, angle_high: low + span };
}

/** Where it points, from its angles: the middle of its sweep, or the angle it holds. */
export const aimOf = (low: number, high: number) => Math.round((low + high) / 2);

/** Where it points in words, against ahead: "ahead", "40° from ahead". The base says no left or right, so neither does this. */
export const aimWords = (aim: number) => (Math.abs(aim - DYSON_AHEAD) < 3 ? "ahead" : `${Math.abs(aim - DYSON_AHEAD)}° from ahead`);

/** A sweep in Dyson's words: 90 → "90°". */
export const sweepLabel = (degrees: number) => `${degrees}°`;

/**
 * The angles a sweep of `degrees` takes around `centre`, kept inside what the fan turns to: `set_angle`'s
 * `angle_low` and `angle_high`.
 */
export function sweepAngles(degrees: number, centre = 180): { angle_low: number; angle_high: number } {
  const span = Math.min(DYSON_ANGLE_MAX - DYSON_ANGLE_MIN, Math.max(0, Math.round(degrees)));
  const low = Math.min(DYSON_ANGLE_MAX - span, Math.max(DYSON_ANGLE_MIN, Math.round(centre - span / 2)));
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
    return `Points ${aimWords(e.oscillationLow)}`;
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
