import { useMemo, useState } from "react";
import type { ClimateEntity, ClimateHistory, HvacAction, HvacMode } from "../../../../../domains/climate/types";
import type { HourSample } from "../../../../../domains/history";

const NOW = { hour: 11, minute: 54 };

interface ClimateSeed {
  entity: ClimateEntity;
  past: HourSample[];
  activity: ClimateHistory["activity"];
}

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

function deriveAction(entity: ClimateEntity): HvacAction {
  const current = entity.currentTemperature ?? 20;
  switch (entity.state) {
    case "heat": return (entity.targetTemperature ?? 0) > current + 0.2 ? "heating" : "idle";
    case "cool": return (entity.targetTemperature ?? 99) < current - 0.2 ? "cooling" : "idle";
    case "heat_cool":
    case "auto":
      if (entity.targetLow != null && current < entity.targetLow - 0.2) return "heating";
      if (entity.targetHigh != null && current > entity.targetHigh + 0.2) return "cooling";
      return "idle";
    case "dry": return "drying";
    case "fan_only": return "fan";
    default: return "off";
  }
}

/** Local state that behaves like a Home Assistant climate entity for interactive stories. */
export function useDemoClimate(name: ClimateSeedName) {
  const seed = CLIMATE_SEEDS[name];
  const [entity, setEntity] = useState<ClimateEntity>(seed.entity);
  const [lastMode, setLastMode] = useState<HvacMode>(seed.entity.state !== "off" && seed.entity.state !== "unavailable" ? seed.entity.state : (seed.entity.hvacModes.find((mode) => mode !== "off") ?? "heat"));

  const update = (patch: Partial<ClimateEntity>) => setEntity((current) => {
    if (current.state === "unavailable") return current;
    const next = { ...current, ...patch, lastChanged: `${NOW.hour}:${String(NOW.minute).padStart(2, "0")}` };
    if (next.state === "heat_cool" && next.targetLow == null) {
      next.targetLow = (next.targetTemperature ?? 21) - 2;
      next.targetHigh = (next.targetTemperature ?? 21) + 2;
    }
    if ((next.state === "heat" || next.state === "cool" || next.state === "auto") && next.targetTemperature == null) next.targetTemperature = next.targetLow ?? 21;
    return { ...next, hvacAction: deriveAction(next) };
  });

  const history = useMemo<ClimateHistory>(() => {
    const running = entity.hvacAction === "heating" || entity.hvacAction === "cooling" || entity.hvacAction === "drying" || entity.hvacAction === "fan";
    const current: HourSample = entity.state === "unavailable" ? "unavailable" : running ? 0.9 : 0;
    const samples = [...seed.past, current, ...Array<HourSample>(24 - seed.past.length - 1).fill(null)];
    const pastMinutes = seed.past.reduce<number>((total, sample) => total + (typeof sample === "number" ? Math.round(sample * 60) : 0), 0);
    return { samples, currentHour: NOW.hour, activeMinutes: pastMinutes + (running ? Math.round(NOW.minute * 0.9) : 0), activity: seed.activity };
  }, [entity, seed]);

  return {
    entity,
    history,
    onToggle: () => {
      if (entity.state === "unavailable") return;
      if (entity.state === "off") update({ state: lastMode });
      else {
        setLastMode(entity.state);
        update({ state: "off" });
      }
    },
    onTargetChange: (temperature: number) => update({ targetTemperature: temperature }),
    onRangeChange: (low: number, high: number) => update({ targetLow: low, targetHigh: high }),
    onModeChange: (mode: HvacMode) => {
      if (mode !== "off") setLastMode(mode);
      update({ state: mode });
    },
    onPresetChange: (presetMode: string) => update({ presetMode }),
    onFanChange: (fanMode: string) => update({ fanMode }),
  };
}
