import { useDemoClimate } from "../../../../../hooks/useDemoClimate";
import type { ClimateSeed } from "../../../../../hooks/useDemoClimate";

export { useDemoClimate };
export type { ClimateSeed };

export const CLIMATE_SEEDS = {
  heating: {
    entity: {
      entityId: "climate.living_room", name: "Thermostat", area: "Living room", state: "heat", hvacAction: "heating",
      hvacModes: ["off", "heat", "cool", "heat_cool"], currentTemperature: 20.4, currentHumidity: 41, targetTemperature: 21.5,
      minTemp: 7, maxTemp: 30, step: 0.5, unit: "°C", presetMode: "home", presetModes: ["home", "away", "sleep", "eco"], lastChanged: "10:31",
    },
    past: [0.2, 0.15, 0.1, 0.1, 0.15, 0.3, 0.8, 0.9, 0.5, 0.3, 0.4],
    activity: "heating",
  },
  cooling: {
    entity: {
      entityId: "climate.bedroom_ac", name: "Air conditioner", area: "Bedroom", state: "cool", hvacAction: "idle",
      hvacModes: ["off", "cool", "dry", "fan_only"], currentTemperature: 22.1, currentHumidity: 48, targetTemperature: 22,
      minTemp: 16, maxTemp: 30, step: 0.5, unit: "°C", fanMode: "auto", fanModes: ["auto", "low", "medium", "high"], lastChanged: "09:05",
    },
    past: [0, 0, 0, 0, 0, 0, 0, 0, 0.2, 0.6, 0.3],
    activity: "cooling",
  },
  range: {
    entity: {
      entityId: "climate.office_heat_pump", name: "Heat pump", area: "Office", state: "heat_cool", hvacAction: "idle",
      hvacModes: ["off", "heat", "cool", "heat_cool"], currentTemperature: 21.2, currentHumidity: 39, targetLow: 19, targetHigh: 24,
      minTemp: 10, maxTemp: 30, step: 0.5, unit: "°C", lastChanged: "07:40",
    },
    past: [0, 0, 0, 0, 0, 0, 0.4, 0.6, 0.2, 0, 0.1],
    activity: "running",
  },
  off: {
    entity: {
      entityId: "climate.basement", name: "Baseboard", area: "Basement", state: "off", hvacAction: "off",
      hvacModes: ["off", "heat"], currentTemperature: 17.8, targetTemperature: 19, minTemp: 5, maxTemp: 28, step: 0.5, unit: "°C", lastChanged: "08:12",
    },
    past: [0.5, 0.6, 0.6, 0.5, 0.5, 0.7, 0.8, 0.4, 0, 0, 0],
    activity: "heating",
  },
  secondFloor: {
    entity: {
      entityId: "climate.second_floor", name: "2nd floor", area: "Upstairs", state: "heat", hvacAction: "heating",
      hvacModes: ["off", "heat", "cool", "heat_cool"], currentTemperature: 20.5, currentHumidity: 38, targetTemperature: 21,
      minTemp: 7, maxTemp: 30, step: 0.5, unit: "°C", presetMode: "home", presetModes: ["home", "away", "sleep", "eco"], lastChanged: "06:30",
    },
    past: [0.3, 0.3, 0.3, 0.3, 0.4, 0.5, 0.8, 0.7, 0.4, 0.3, 0.4],
    activity: "heating",
  },
  nurseryDyson: {
    entity: {
      entityId: "climate.nursery_dyson", name: "Dyson heater", area: "Nursery", state: "heat", hvacAction: "heating",
      hvacModes: ["off", "heat", "cool"], currentTemperature: 21.6, targetTemperature: 23,
      minTemp: 1, maxTemp: 37, step: 1, unit: "°C", fanMode: "auto", fanModes: ["auto", "quiet"], lastChanged: "10:58",
    },
    past: [0.6, 0.6, 0.5, 0.5, 0.6, 0.6, 0.4, 0, 0, 0, 0.3],
    activity: "heating",
  },
  unavailable: {
    entity: {
      entityId: "climate.garage", name: "Garage heater", area: "Garage", state: "unavailable",
      hvacModes: ["off", "heat"], targetTemperature: 12, minTemp: 5, maxTemp: 25, step: 1, unit: "°C", lastSeen: "08:20",
    },
    past: [0.3, 0.3, 0.4, 0.3, 0.3, 0.2, 0.2, 0.1, "unavailable", "unavailable", "unavailable"],
    activity: "heating",
  },
} satisfies Record<string, ClimateSeed>;

export type ClimateSeedName = keyof typeof CLIMATE_SEEDS;

/*
 * Worst-case data: values real Home Assistant installs produce, not random strings. Long and compound names,
 * missing areas, readings at and past their limits, raw floats from integrations, no readings yet. The card's
 * Worst case story and Orb → Foundations → Worst case both draw these.
 */
const H = 11;
const zeros = (n: number) => Array<number>(n).fill(0);
const fullClimate: Pick<ClimateSeed["entity"], "hvacModes" | "presetModes" | "fanModes"> = {
  hvacModes: ["off", "heat", "cool", "heat_cool", "auto", "dry", "fan_only"],
  presetModes: ["none", "eco", "away", "boost", "comfort", "home", "sleep", "activity"],
  fanModes: ["auto", "low", "medium", "high", "top", "middle", "focus", "diffuse"],
};
export const CLIMATE_WORST_CASE: ClimateSeed[] = [
  { // Fahrenheit, whole-degree steps, both thresholds on the same value, no room reading, every mode
    entity: { entityId: "climate.zone_3", name: "Mitsubishi Hyper-Heat, zone 3", area: "Finished basement & guest suite", state: "heat_cool", hvacAction: "idle", ...fullClimate, currentHumidity: 45.333333, targetLow: 68, targetHigh: 68, minTemp: 45, maxTemp: 95, step: 1, unit: "°F", presetMode: "activity", fanMode: "diffuse", lastChanged: "11:02" },
    past: zeros(H), activity: "running",
  },
  { // Stacked diacritics, at the top of its range, heating all day
    entity: { entityId: "climate.office", name: "Đặng Thị Ngọc Hân’s office", area: "Office", state: "heat", hvacAction: "heating", hvacModes: ["off", "heat"], currentTemperature: 29.96, currentHumidity: 61.7, targetTemperature: 30, minTemp: 7, maxTemp: 30, step: 0.5, unit: "°C", lastChanged: "00:01" },
    past: Array<number>(H).fill(1), activity: "heating",
  },
  { // A raw fan mode from the integration
    entity: { entityId: "climate.dehumidifier", name: "Dehumidifier", area: "Laundry", state: "dry", hvacAction: "drying", hvacModes: ["off", "dry"], currentTemperature: 18.04, minTemp: 16, maxTemp: 30, step: 1, unit: "°C", fanMode: "quiet_night", fanModes: ["quiet_night", "auto"], lastChanged: "09:30" },
    past: [0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1], activity: "running",
  },
];
