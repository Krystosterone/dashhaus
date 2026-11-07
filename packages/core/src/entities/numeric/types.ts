import type { Reading } from "../history";

/**
 * The Home Assistant sensor device classes (`SensorDeviceClass`) the numeric card has words for: what the number
 * measures. Any other class, and none, is a plain reading in its unit.
 */
export type NumericClass =
  | "apparent_power"
  | "aqi"
  | "atmospheric_pressure"
  | "carbon_dioxide"
  | "carbon_monoxide"
  | "current"
  | "data_rate"
  | "data_size"
  | "distance"
  | "energy"
  | "frequency"
  | "gas"
  | "humidity"
  | "illuminance"
  | "irradiance"
  | "moisture"
  | "nitrogen_dioxide"
  | "ozone"
  | "pm1"
  | "pm10"
  | "pm25"
  | "power"
  | "power_factor"
  | "precipitation"
  | "precipitation_intensity"
  | "pressure"
  | "reactive_power"
  | "signal_strength"
  | "sound_pressure"
  | "speed"
  | "temperature"
  | "volatile_organic_compounds"
  | "volatile_organic_compounds_parts"
  | "voltage"
  | "volume"
  | "water"
  | "weight"
  | "wind_speed";

/**
 * How Home Assistant's statistics read the number (`state_class`): a `measurement` now (CO₂, power), or a running
 * `total` (`total_increasing`: an energy or water meter that only climbs, save for a reset).
 */
export type NumericStateClass = "measurement" | "total" | "total_increasing";

/**
 * Mirrors one Home Assistant `sensor.*` with a number: CO₂ in ppm, power in W, energy in kWh. A direct model, a
 * reading. `unknown`, `unavailable` and a missing entity are `unavailable`; a state that isn't a finite number is no
 * reading, never a made-up value.
 */
export interface NumericEntity {
  /** The Home Assistant entity id. */
  entityId: string;
  /** Its name: the `name` option, else Home Assistant's friendly name, else its entity id. */
  name: string;
  /** Where it is: "Living room". */
  area?: string;
  /** "unavailable" while the device can't be reached; "ok" otherwise, even before a first reading. */
  state: "ok" | "unavailable";
  /** The measured value; omitted while there is no reading. */
  value?: number;
  /** As Home Assistant reports it: "ppm", "W", "kWh", "%"; none for a bare count. */
  unit?: string;
  /** What it measures (HA `device_class`); none is a plain reading. */
  deviceClass?: NumericClass;
  /** A measurement now, or a running total (HA `state_class`). */
  stateClass?: NumericStateClass;
  /** When it last reported (HA `last_updated`), formatted. */
  lastUpdated?: string;
  /** While it is unavailable, when it was last reachable. */
  lastSeen?: string;
}

export interface NumericHistory {
  /** One reading per hour, carried forward; "unavailable", or null for hours ahead and before the first reading. */
  readings: Reading[];
  currentHour: number;
}
