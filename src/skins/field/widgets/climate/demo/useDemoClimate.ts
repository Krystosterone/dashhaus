import { useDemoClimate } from "../../../../../hooks/useDemoClimate";
import type { ClimateSeed } from "../../../../../hooks/useDemoClimate";

export { useDemoClimate };

export const CLIMATE_SEEDS = {
  heating: {
    entity: { entityId: "climate.living_room", name: "Thermostat", area: "Living room", state: "heat", hvacAction: "heating", hvacModes: ["off", "heat", "cool", "heat_cool"], currentTemperature: 20.4, currentHumidity: 41, targetTemperature: 21.5, minTemp: 7, maxTemp: 30, step: 0.5, unit: "°C", presetMode: "home", presetModes: ["home", "away", "sleep", "eco"], fanMode: "auto", fanModes: ["auto", "low", "high"], lastChanged: "10:31" },
    past: [0.2, 0.15, 0.1, 0.1, 0.15, 0.3, 0.8, 0.9, 0.5, 0.3, 0.4], activity: "heating",
  },
  cooling: {
    entity: { entityId: "climate.bedroom_ac", name: "Air conditioner", area: "Bedroom", state: "cool", hvacAction: "idle", hvacModes: ["off", "cool", "dry", "fan_only"], currentTemperature: 22.1, currentHumidity: 48, targetTemperature: 22, minTemp: 16, maxTemp: 30, step: 0.5, unit: "°C", fanMode: "auto", fanModes: ["auto", "low", "medium", "high"], lastChanged: "09:05" },
    past: [0, 0, 0, 0, 0, 0, 0, 0, 0.2, 0.6, 0.3], activity: "cooling",
  },
  range: {
    entity: { entityId: "climate.office_heat_pump", name: "Heat pump", area: "Office", state: "heat_cool", hvacAction: "idle", hvacModes: ["off", "heat", "cool", "heat_cool"], currentTemperature: 21.2, currentHumidity: 39, targetLow: 19, targetHigh: 24, minTemp: 10, maxTemp: 30, step: 0.5, unit: "°C", lastChanged: "07:40" },
    past: [0, 0, 0, 0, 0, 0, 0.4, 0.6, 0.2, 0, 0.1], activity: "running",
  },
  dry: {
    entity: { entityId: "climate.sunroom", name: "Dehumidifying unit", area: "Sunroom", state: "dry", hvacAction: "drying", hvacModes: ["off", "cool", "dry", "fan_only"], currentTemperature: 24.8, currentHumidity: 67, minTemp: 16, maxTemp: 30, step: 1, unit: "°C", fanMode: "low", fanModes: ["low", "high"], lastChanged: "11:02" },
    past: [0, 0, 0, 0, 0, 0, 0.2, 0.3, 0.6, 0.8, 0.7], activity: "running",
  },
  fan: {
    entity: { entityId: "climate.studio_fan", name: "Studio ventilation", area: "Studio", state: "fan_only", hvacAction: "fan", hvacModes: ["off", "fan_only"], currentTemperature: 23.6, minTemp: 16, maxTemp: 30, step: 1, unit: "°C", fanMode: "medium", fanModes: ["low", "medium", "high"], lastChanged: "10:47" },
    past: [0, 0, 0, 0, 0, 0, 0.1, 0.2, 0.5, 0.6, 0.8], activity: "running",
  },
  off: {
    entity: { entityId: "climate.basement", name: "Baseboard", area: "Basement", state: "off", hvacAction: "off", hvacModes: ["off", "heat"], currentTemperature: 17.8, targetTemperature: 19, minTemp: 5, maxTemp: 28, step: 0.5, unit: "°C", lastChanged: "08:12" },
    past: [0.5, 0.6, 0.6, 0.5, 0.5, 0.7, 0.8, 0.4, 0, 0, 0], activity: "heating",
  },
  unavailable: {
    entity: { entityId: "climate.garage", name: "Garage heater", area: "Garage", state: "unavailable", hvacModes: ["off", "heat"], minTemp: 5, maxTemp: 25, step: 1, unit: "°C", lastSeen: "08:20" },
    past: [0.3, 0.3, 0.4, 0.3, 0.3, 0.2, 0.2, 0.1, "unavailable", "unavailable", "unavailable"], activity: "heating",
  },
  worstCase: {
    entity: { entityId: "climate.north_east_multizone_heat_pump", name: "North-east open-plan living and dining heat pump", area: "Ground floor · Living, dining and kitchen", state: "heat_cool", hvacAction: "cooling", hvacModes: ["off", "heat", "cool", "heat_cool", "auto", "dry", "fan_only"], currentTemperature: 102.7, currentHumidity: 100, targetLow: 44.6, targetHigh: 95, minTemp: 44.6, maxTemp: 95, step: 0.5, unit: "°F", presetMode: "extended_absence_with_pets", presetModes: ["home", "sleep", "extended_absence_with_pets"], fanMode: "maximum_ventilation", fanModes: ["auto", "quiet_night", "maximum_ventilation"], lastChanged: "23:59" },
    past: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1], activity: "cooling",
  },
} satisfies Record<string, ClimateSeed>;

export type ClimateSeedName = keyof typeof CLIMATE_SEEDS;
