import type { HourSample, Reading } from "../history";

/** The sleep states an Owlet Dream Sock reports. */
export type SleepState = "deep_sleep" | "light_sleep" | "awake";

/**
 * The alerts the sock's base station raises. Vitals alerts (oxygen, heart rate) are the alarm going off;
 * the rest are problems with the sock or the base station.
 */
export type OwletAlert =
  | "critical_oxygen" | "low_oxygen" | "high_oxygen" | "low_heart_rate" | "high_heart_rate"
  | "sock_off" | "sock_disconnected" | "lost_power" | "critical_battery" | "low_battery";

export type { Reading };

/**
 * Mirrors one Owlet Smart Sock in Home Assistant (the `owlet` custom integration): its sleep state sensor,
 * composed with its heart rate and oxygen saturation sensors. The sock reports none of them while it charges.
 */
export interface OwletEntity {
  /** The sleep state sensor, `sensor.*_sleep_state`. */
  entityId: string;
  /** Usually the baby's name. */
  name: string;
  area?: string;
  /** "unavailable" while the sock charges, is off, or can't tell yet. */
  state: SleepState | "unavailable";
  /** Beats per minute; omitted while there is no reading. */
  heartRate?: number;
  /** Oxygen saturation, 0-100 %; omitted while there is no reading. */
  oxygen?: number;
  /**
   * Whether readings are still arriving: true while one has changed recently, false once none has for a while
   * (the figures shown are then old). Omitted when the host can't tell.
   */
  live?: boolean;
  /** The alerts sounding now, in any order. */
  alerts?: OwletAlert[];
  /** On its charger: the reason it reports nothing. */
  charging?: boolean;
  /**
   * The base station's switch: false while it is off and sounds no alarm (the sock may still send readings).
   * Omitted when the host has no such switch or can't tell.
   */
  baseOn?: boolean;
  /** When the newest reading arrived ("11:54"). */
  lastUpdated?: string;
  lastSeen?: string;
}

export interface OwletHistory {
  /** Per hour: 1 deep sleep, 0.5 light sleep, 0 awake, "unavailable", null for hours ahead. */
  sleep: HourSample[];
  heartRate?: Reading[];
  oxygen?: Reading[];
  currentHour: number;
  /** Minutes asleep today (light or deep), including the current hour. */
  asleepMinutes: number;
}
