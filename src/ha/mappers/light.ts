import type { HassEntity } from "../types";
import type { LightEntity } from "../../domains/light/types";
import { finiteNumber, stringList, stringValue } from "../util";
import { formatHaTime } from "../time";

export interface LightMapOptions {
  /** The clock the timestamps are formatted against (the tile's minute clock). */
  now?: Date;
  name?: string;
  area?: string;
  /** Explicit last-reachable metadata; `last_changed` is not a last-seen timestamp. */
  lastSeen?: string;
}

const percent = (value: number) => value >= 0 && value <= 255 ? Math.min(100, Math.max(1, Math.round((value / 255) * 100))) : undefined;
const BRIGHTNESS_MODES = new Set(["brightness", "color_temp", "hs", "xy", "rgb", "rgbw", "rgbww", "white"]);
const COLOR_MODES = new Set(["hs", "xy", "rgb", "rgbw", "rgbww"]);

/** A reported `hs_color`, or undefined unless both channels are finite and in range. */
function hsColor(value: unknown): [number, number] | undefined {
  if (!Array.isArray(value) || value.length !== 2) return undefined;
  const [h, s] = value.map(finiteNumber);
  return h != null && s != null && h >= 0 && h <= 360 && s >= 0 && s <= 100 ? [h, s] : undefined;
}

/** Map one raw Home Assistant light state to the existing presentational model. */
export function lightFromHass(raw: HassEntity | undefined, entityId: string, options: LightMapOptions = {}): LightEntity {
  const attributes = raw?.attributes ?? {};
  const supportedModes = stringList(attributes.supported_color_modes);
  const supportsBrightness = supportedModes.some((mode) => BRIGHTNESS_MODES.has(mode));
  const supportsColorTemp = supportedModes.includes("color_temp");
  const supportsColor = supportedModes.some((mode) => COLOR_MODES.has(mode));
  const state = raw?.state === "on" ? "on" : raw?.state === "off" ? "off" : "unavailable";
  const hasMeasuredState = state !== "unavailable";
  const rawBrightness = finiteNumber(attributes.brightness);
  const brightness = hasMeasuredState && supportsBrightness && rawBrightness != null ? percent(rawBrightness) : undefined;
  const friendlyName = stringValue(attributes.friendly_name);
  const changed = formatHaTime(raw?.last_changed, options.now);
  const rawMinKelvin = supportsColorTemp ? finiteNumber(attributes.min_color_temp_kelvin) : undefined;
  const rawMaxKelvin = supportsColorTemp ? finiteNumber(attributes.max_color_temp_kelvin) : undefined;
  const boundsAreConsistent = rawMinKelvin == null || rawMaxKelvin == null || rawMinKelvin <= rawMaxKelvin;
  const minKelvin = boundsAreConsistent ? rawMinKelvin : undefined;
  const maxKelvin = boundsAreConsistent ? rawMaxKelvin : undefined;
  const rawKelvin = hasMeasuredState && supportsColorTemp ? finiteNumber(attributes.color_temp_kelvin) : undefined;
  const kelvin = rawKelvin != null
    && boundsAreConsistent
    && (minKelvin == null || rawKelvin >= minKelvin)
    && (maxKelvin == null || rawKelvin <= maxKelvin)
    ? rawKelvin
    : undefined;
  // A lamp showing a colour temperature still reports the hs it converts to; only a colour mode has a colour.
  const hs = hasMeasuredState && supportsColor && stringValue(attributes.color_mode) !== "color_temp" ? hsColor(attributes.hs_color) : undefined;

  return {
    entityId,
    name: options.name ?? friendlyName ?? entityId,
    area: options.area,
    state,
    supportsBrightness,
    brightness,
    supportsColorTemp,
    kelvin,
    minKelvin,
    maxKelvin,
    supportsColor,
    hs,
    lastChanged: changed,
    lastSeen: state === "unavailable" ? options.lastSeen ?? formatHaTime(stringValue(attributes.last_seen), options.now) : undefined,
  };
}
