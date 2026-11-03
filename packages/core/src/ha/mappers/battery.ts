import type { HassEntity } from "../types";
import { finiteNumber, isRecord, stringValue } from "../util";

/*
 * A device's battery level, wherever Home Assistant puts it: a companion `sensor.*` on the same device
 * (`device_class: battery`, the common case), or a `battery_level` / `battery` attribute on the entity itself (older
 * integrations). Shared by every composed model with a same-device battery: the room sensor, the lock, and next the
 * binary sensor. Finding the companion is the layout's job (`deviceCompanion` in `@dashhaus/dashboard/layout`); this
 * only reads it.
 */

const percent = (value: number | undefined) => (value != null && value >= 0 && value <= 100 ? value : undefined);

function available(raw: HassEntity | undefined): raw is HassEntity {
  return isRecord(raw?.attributes) && typeof raw?.state === "string" && raw.state !== "unknown" && raw.state !== "unavailable";
}

/** A battery companion: `device_class: battery`, or no class and a percentage unit. */
export function isBatteryEntity(raw: HassEntity | undefined): boolean {
  if (!isRecord(raw?.attributes)) return false;
  const cls = stringValue(raw.attributes.device_class);
  return cls === "battery" || (cls == null && (raw.attributes.unit_of_measurement === "%" || raw.attributes.native_unit_of_measurement === "%"));
}

/** A battery companion's level, 0–100; nothing while it is unavailable, isn't a battery or reads out of range. */
export function batteryFromHass(companion: HassEntity | undefined): number | undefined {
  if (!available(companion) || !isBatteryEntity(companion) || companion.state.trim() === "") return undefined;
  const value = Number(companion.state);
  return Number.isFinite(value) ? percent(value) : undefined;
}

/** An entity's own battery attribute (`battery_level`, else `battery`), 0–100. */
export function inlineBattery(attributes: Record<string, unknown> | undefined): number | undefined {
  return percent(finiteNumber(attributes?.battery_level) ?? finiteNumber(attributes?.battery));
}
