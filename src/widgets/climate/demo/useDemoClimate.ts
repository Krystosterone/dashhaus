import { useMemo, useState } from "react";
import type { ClimateEntity, ClimateHistory, HvacAction, HvacMode } from "../types";
import type { HourSample } from "../../../shared/ui";

/** Example data for stories. Times are fixed so screenshots stay stable. */
const NOW = { hour: 11, minute: 54 };

export interface ClimateSeed {
  entity: ClimateEntity;
  /** Share of each past hour (0 to NOW.hour - 1) the unit ran. */
  past: HourSample[];
  activity: ClimateHistory["activity"];
}

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

/** What the unit would be doing, given its mode, setpoints and the room temperature. */
function deriveAction(e: ClimateEntity): HvacAction {
  const t = e.currentTemperature ?? 20;
  switch (e.state) {
    case "heat": return (e.targetTemperature ?? 0) > t + 0.2 ? "heating" : "idle";
    case "cool": return (e.targetTemperature ?? 99) < t - 0.2 ? "cooling" : "idle";
    case "heat_cool": case "auto":
      if (e.targetLow != null && t < e.targetLow - 0.2) return "heating";
      if (e.targetHigh != null && t > e.targetHigh + 0.2) return "cooling";
      return "idle";
    case "dry": return "drying";
    case "fan_only": return "fan";
    default: return "off";
  }
}

const stamp = () => `${NOW.hour}:${String(NOW.minute).padStart(2, "0")}`;

/** Local state that behaves like a Home Assistant climate entity, for stories and prototypes. */
export function useDemoClimate(seed: ClimateSeed) {
  const [entity, setEntity] = useState<ClimateEntity>(seed.entity);
  const [lastMode, setLastMode] = useState<HvacMode>(
    seed.entity.state !== "off" && seed.entity.state !== "unavailable" ? seed.entity.state : (seed.entity.hvacModes.find((m) => m !== "off") ?? "heat"),
  );

  const update = (patch: Partial<ClimateEntity>) =>
    setEntity((e) => {
      if (e.state === "unavailable") return e;
      const next = { ...e, ...patch, lastChanged: stamp() };
      if (next.state === "heat_cool" && next.targetLow == null) { next.targetLow = (next.targetTemperature ?? 21) - 2; next.targetHigh = (next.targetTemperature ?? 21) + 2; }
      if ((next.state === "heat" || next.state === "cool" || next.state === "auto") && next.targetTemperature == null) next.targetTemperature = next.targetLow ?? 21;
      return { ...next, hvacAction: deriveAction(next) };
    });

  const history = useMemo<ClimateHistory>(() => {
    const running = entity.hvacAction === "heating" || entity.hvacAction === "cooling" || entity.hvacAction === "drying" || entity.hvacAction === "fan";
    const now: HourSample = entity.state === "unavailable" ? "unavailable" : running ? 0.9 : 0;
    const samples: HourSample[] = [...seed.past, now, ...Array(24 - seed.past.length - 1).fill(null)];
    const pastMin = seed.past.reduce<number>((a, x) => a + (typeof x === "number" ? Math.round(x * 60) : 0), 0);
    return { samples, currentHour: NOW.hour, activeMinutes: pastMin + (running ? Math.round(NOW.minute * 0.9) : 0), activity: seed.activity };
  }, [entity, seed]);

  return {
    entity,
    history,
    onToggle: () => {
      if (entity.state === "unavailable") return;
      if (entity.state === "off") update({ state: lastMode });
      else { setLastMode(entity.state); update({ state: "off" }); }
    },
    onTargetChange: (t: number) => update({ targetTemperature: t }),
    onRangeChange: (low: number, high: number) => update({ targetLow: low, targetHigh: high }),
    onModeChange: (m: HvacMode) => { if (m !== "off") setLastMode(m); update({ state: m }); },
    onPresetChange: (p: string) => update({ presetMode: p }),
    onFanChange: (f: string) => update({ fanMode: f }),
  };
}
