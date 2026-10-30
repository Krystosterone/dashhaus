import { useMemo, useState } from "react";
import type { ClimateEntity, ClimateHistory, HvacAction, HvacMode } from "../entities/climate/types";
import type { HourSample } from "../entities/history";

/** Fixed story time so screenshots and activity totals stay stable. */
const NOW = { hour: 11, minute: 54 };

export interface ClimateSeed {
  entity: ClimateEntity;
  /** Share of each past hour (0 to NOW.hour - 1) the unit ran. */
  past: HourSample[];
  activity: ClimateHistory["activity"];
}

/** What the unit would be doing, given its mode, setpoints and room temperature. */
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

/** UI-free local climate state shared by every skin's interactive stories. */
export function useDemoClimate(seed: ClimateSeed) {
  const [entity, setEntity] = useState<ClimateEntity>(seed.entity);
  const [lastMode, setLastMode] = useState<HvacMode>(
    seed.entity.state !== "off" && seed.entity.state !== "unavailable"
      ? seed.entity.state
      : (seed.entity.hvacModes.find((mode) => mode !== "off") ?? "heat"),
  );

  const update = (patch: Partial<ClimateEntity>) => setEntity((current) => {
    if (current.state === "unavailable") return current;
    const next = { ...current, ...patch, lastChanged: `${NOW.hour}:${String(NOW.minute).padStart(2, "0")}` };
    if (next.state === "heat_cool" && next.targetLow == null) {
      next.targetLow = (next.targetTemperature ?? 21) - 2;
      next.targetHigh = (next.targetTemperature ?? 21) + 2;
    }
    if ((next.state === "heat" || next.state === "cool" || next.state === "auto") && next.targetTemperature == null) {
      next.targetTemperature = next.targetLow ?? 21;
    }
    return { ...next, hvacAction: deriveAction(next) };
  });

  const history = useMemo<ClimateHistory>(() => {
    const running = entity.hvacAction === "heating" || entity.hvacAction === "cooling" || entity.hvacAction === "drying" || entity.hvacAction === "fan";
    const current: HourSample = entity.state === "unavailable" ? "unavailable" : running ? 0.9 : 0;
    const samples = [...seed.past, current, ...Array<HourSample>(24 - seed.past.length - 1).fill(null)];
    const pastMinutes = seed.past.reduce<number>((total, sample) => total + (typeof sample === "number" ? Math.round(sample * 60) : 0), 0);
    return {
      samples,
      currentHour: NOW.hour,
      activeMinutes: pastMinutes + (running ? Math.round(NOW.minute * 0.9) : 0),
      activity: seed.activity,
    };
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
    onTargetChange: (targetTemperature: number) => update({ targetTemperature }),
    onRangeChange: (targetLow: number, targetHigh: number) => update({ targetLow, targetHigh }),
    onModeChange: (mode: HvacMode) => {
      if (mode !== "off") setLastMode(mode);
      update({ state: mode });
    },
    onPresetChange: (presetMode: string) => update({ presetMode }),
    onFanChange: (fanMode: string) => update({ fanMode }),
  };
}
