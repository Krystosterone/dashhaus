import type { HourSample } from "../history";
export type { HourSample };

/** Mirrors the parts of a Home Assistant `light.*` entity the card needs. */
export type LightState = "on" | "off" | "unavailable";

export interface LightEntity {
  entityId: string;
  name: string;
  /** Area name, shown under the light's name. */
  area?: string;
  state: LightState;
  /** True when the light supports brightness (HA color mode other than `onoff`). */
  supportsBrightness: boolean;
  /** Brightness in percent, 1-100 (HA `brightness` / 2.55). Absent when HA has not reported a reading. */
  brightness?: number;
  supportsColorTemp?: boolean;
  /** Color temperature in Kelvin (HA `color_temp_kelvin`). */
  kelvin?: number;
  minKelvin?: number;
  maxKelvin?: number;
  /** True when the light takes a colour (an HA `hs`, `xy`, `rgb`, `rgbw` or `rgbww` colour mode). */
  supportsColor?: boolean;
  /** Its colour as HA `hs_color`: hue 0-360, saturation 0-100. Absent while off or showing a colour temperature. */
  hs?: [number, number];
  /** Local time of the last state change, e.g. "10:31". */
  lastChanged?: string;
  /** Local time the light was last reachable, shown while unavailable. */
  lastSeen?: string;
}


export interface LightHistory {
  samples: HourSample[];
  /** Index of the current hour in `samples`. */
  currentHour: number;
  /** Minutes on today, including the current hour. */
  onMinutes: number;
}
