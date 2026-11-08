import { useMemo, useState } from "react";
import type { HourSample } from "../entities/history";
import type { FanDirection } from "../entities/fan/types";
import type { DysonEntity, DysonHistory } from "../entities/dyson/types";

/** Example data for stories. The clock is fixed at 11:54 so screenshots stay stable. */
const NOW = { hour: 11, minute: 54 };
const stamp = `${NOW.hour}:${String(NOW.minute).padStart(2, "0")}`;

export interface DysonSeed {
  entity: DysonEntity;
  /** Hours 0 to NOW.hour - 1: share of each hour it was on. */
  past: HourSample[];
}

/** What every Dyson purifier fan has: ten speeds, Auto, an oscillation, its airflow front or back, night mode. */
const PURIFIER = {
  supportsSpeed: true, speedCount: 10, supportsAuto: true, autoPreset: "Auto", manualPreset: "Normal",
  supportsOscillate: true, supportsDirection: true, supportsNightMode: true,
} as const;
/** A Pure Cool's sweeps, set by its angles. */
const ANGLES = { oscillationModes: ["45°", "90°", "180°", "350°"], oscillationBy: "angle", oscillationCentre: 180 } as const;
/** A Hot+Cool's heater, from its `climate.*`. */
const HEATER = { supportsHeat: true, heatMin: 1, heatMax: 37, heatStep: 1, heatUnit: "°C" } as const;

export const DYSON_SEEDS = {
  /** A Pure Cool tower, running at speed 4 and sweeping 90°: the air good. */
  on: {
    entity: {
      entityId: "fan.bedroom_purifier", name: "Purifier", area: "Bedroom", state: "on", ...PURIFIER, ...ANGLES, oscillationModes: [...ANGLES.oscillationModes],
      percentage: 40, auto: false, oscillating: true, oscillationMode: "90°", direction: "forward", nightMode: false,
      temperature: 21.4, temperatureUnit: "°C", humidity: 44,
      air: [{ pollutant: "pm25", value: 8, unit: "µg/m³" }, { pollutant: "pm10", value: 12, unit: "µg/m³" }, { pollutant: "voc", value: 2 }, { pollutant: "no2", value: 1 }],
      filters: [{ kind: "hepa", percent: 72 }, { kind: "carbon", percent: 64 }],
      lastChanged: "10:58",
    },
    past: [0.6, 0.6, 0.6, 0.6, 0.6, 0.6, 0.4, 0.5, 1, 0, 0.2],
  },
  /** A Hot+Cool in Auto, heating to 23°: the air fair. */
  heating: {
    entity: {
      entityId: "fan.living_room_hot_cool", name: "Hot+Cool", area: "Living room", state: "on", ...PURIFIER, ...ANGLES, oscillationModes: [...ANGLES.oscillationModes], ...HEATER,
      auto: true, oscillating: false, direction: "forward", nightMode: false, heatOn: true, heating: true, heatTarget: 23,
      temperature: 19.8, temperatureUnit: "°C", humidity: 38,
      air: [{ pollutant: "pm25", value: 41, unit: "µg/m³" }, { pollutant: "pm10", value: 47, unit: "µg/m³" }, { pollutant: "voc", value: 3 }, { pollutant: "no2", value: 2 }, { pollutant: "hcho", value: 0.02, unit: "mg/m³" }],
      filters: [{ kind: "combined", percent: 38 }],
      lastChanged: "07:05",
    },
    past: [0, 0, 0, 0, 0, 0, 0, 0.9, 1, 1, 1],
  },
  /** A Humidify+Cool, off, its range from its select: Breeze among them. */
  off: {
    entity: {
      entityId: "fan.nursery_humidify_cool", name: "Humidify+Cool", area: "Nursery", state: "off", ...PURIFIER,
      oscillationModes: ["45°", "90°", "Breeze", "Custom"], oscillationBy: "select", oscillationMode: "Breeze", auto: false, oscillating: false, direction: "forward", nightMode: true,
      temperature: 22.1, temperatureUnit: "°C", humidity: 51,
      air: [{ pollutant: "pm25", value: 4, unit: "µg/m³" }, { pollutant: "pm10", value: 6, unit: "µg/m³" }, { pollutant: "voc", value: 1 }, { pollutant: "no2", value: 1 }],
      filters: [{ kind: "combined", percent: 81 }],
      lastChanged: "07:15",
    },
    past: [1, 1, 1, 1, 1, 1, 1, 0.25, 0, 0, 0],
  },
  /** Poor air in the kitchen: it leads with the warning, in Auto at full tilt. */
  poorAir: {
    entity: {
      entityId: "fan.kitchen_purifier", name: "Purifier", area: "Kitchen", state: "on", ...PURIFIER, ...ANGLES, oscillationModes: [...ANGLES.oscillationModes],
      auto: true, oscillating: true, oscillationMode: "180°", direction: "forward", nightMode: false,
      temperature: 24.6, temperatureUnit: "°C", humidity: 57,
      air: [{ pollutant: "pm25", value: 62, unit: "µg/m³" }, { pollutant: "pm10", value: 70, unit: "µg/m³" }, { pollutant: "voc", value: 5 }, { pollutant: "no2", value: 2 }],
      filters: [{ kind: "hepa", percent: 55 }, { kind: "carbon", percent: 40 }],
      lastChanged: "11:32",
    },
    past: [0, 0, 0, 0, 0, 0, 0, 0.2, 0, 0, 0.5],
  },
  /** A filter worn down to 6%: it says to change it. */
  filter: {
    entity: {
      entityId: "fan.office_purifier", name: "Purifier", area: "Office", state: "off", ...PURIFIER, ...ANGLES, oscillationModes: [...ANGLES.oscillationModes],
      auto: false, oscillating: false, direction: "reverse", nightMode: false,
      temperature: 20.9, temperatureUnit: "°C", humidity: 41,
      air: [{ pollutant: "pm25", value: 12, unit: "µg/m³" }, { pollutant: "pm10", value: 15, unit: "µg/m³" }, { pollutant: "voc", value: 2 }, { pollutant: "no2", value: 1 }],
      filters: [{ kind: "hepa", percent: 6 }, { kind: "carbon", percent: 4 }],
      lastChanged: "08:40",
    },
    past: [0, 0, 0, 0, 0, 0, 0, 0.5, 0, 0, 0],
  },
  unavailable: {
    entity: {
      entityId: "fan.garage_purifier", name: "Purifier", area: "Garage", state: "unavailable", ...PURIFIER, ...ANGLES, oscillationModes: [...ANGLES.oscillationModes],
      air: [], filters: [], lastSeen: "08:20",
    },
    past: [0, 0, 0, 0, 0, 0, 0, 0, "unavailable", "unavailable", "unavailable"],
  },
  /** Worst case: long names, every companion, very poor air and both filters spent (break-ui skill). */
  long: {
    entity: {
      entityId: "fan.landing", name: "Upstairs landing Purifier Hot+Cool Formaldehyde", area: "Primary bedroom en-suite and walk-in closet", state: "on",
      ...PURIFIER, ...ANGLES, oscillationModes: [...ANGLES.oscillationModes], ...HEATER, heatMax: 37,
      percentage: 100, auto: false, oscillating: true, direction: "reverse", nightMode: true, heatOn: true, heating: false, heatTarget: 37,
      temperature: 36.95, temperatureUnit: "°C", humidity: 99.9,
      air: [
        { pollutant: "pm25", value: 999, unit: "µg/m³" }, { pollutant: "pm10", value: 999, unit: "µg/m³" }, { pollutant: "voc", value: 10 },
        { pollutant: "no2", value: 10 }, { pollutant: "hcho", value: 1.234, unit: "mg/m³" },
      ],
      filters: [{ kind: "hepa", percent: 0 }, { kind: "carbon", percent: 0 }],
      lastChanged: "Fri 18:30",
    },
    past: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  },
  /** Worst case: on, but no reading sent yet, a sweep of its own, and no companions but the fan. */
  waiting: {
    entity: {
      entityId: "fan.loft", name: "Loft Pure Cool Link desk fan", area: "Loft", state: "on", supportsSpeed: true, speedCount: 10, supportsAuto: true, autoPreset: "Auto", manualPreset: "Normal",
      supportsOscillate: true, ...ANGLES, oscillationModes: [...ANGLES.oscillationModes], percentage: 10, auto: false, oscillating: true,
      air: [{ pollutant: "pm25", value: null, unit: "µg/m³" }, { pollutant: "voc", value: null }],
      filters: [{ kind: "combined", percent: null }],
      lastChanged: "11:50",
    },
    past: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.1],
  },
} satisfies Record<string, DysonSeed>;

export type DysonSeedName = keyof typeof DYSON_SEEDS;

/** Worst-case data: the card's Worst case story and each skin's Foundations → Worst case draw these. */
export const DYSON_WORST_CASE: DysonSeed[] = [DYSON_SEEDS.long, DYSON_SEEDS.waiting];

/** Local state that behaves like a Dyson fan and its companions, for stories and prototypes. */
export function useDemoDyson(seed: DysonSeed) {
  const [entity, setEntity] = useState<DysonEntity>(seed.entity);
  // The speed it last ran at, so switching it back on, or leaving Auto, resumes there.
  const [last, setLast] = useState(seed.entity.percentage ?? 40);
  const history = useMemo<DysonHistory>(() => {
    const on = entity.state === "on";
    const now: HourSample = entity.state === "unavailable" ? "unavailable" : on ? 0.9 : 0;
    const samples: HourSample[] = [...seed.past, now, ...Array(24 - seed.past.length - 1).fill(null)];
    const pastMin = seed.past.reduce<number>((a, x) => a + (typeof x === "number" ? Math.round(x * 60) : 0), 0);
    return { samples, currentHour: NOW.hour, onMinutes: pastMin + (on ? NOW.minute : 0) };
  }, [entity, seed.past]);

  const update = (patch: Partial<DysonEntity>) => setEntity((e) => {
    if (e.state === "unavailable") return e;
    const next = { ...e, ...patch, lastChanged: patch.state && patch.state !== e.state ? stamp : e.lastChanged };
    if (next.state === "off") return { ...next, percentage: undefined, heating: false };
    if (next.auto) return { ...next, percentage: undefined };
    return { ...next, percentage: next.percentage ?? last, heating: !!next.heatOn && next.heatTarget != null && (next.temperature ?? 0) < next.heatTarget };
  });

  return {
    entity,
    history,
    onToggle: () => update({ state: entity.state === "on" ? "off" : "on" }),
    onPercentageChange: (percentage: number) => { setLast(percentage); update({ state: "on", auto: false, percentage }); },
    onAutoChange: (auto: boolean) => update({ state: "on", auto }),
    onOscillateChange: (oscillating: boolean) => update({ oscillating }),
    onOscillationModeChange: (oscillationMode: string) => update({ oscillating: true, oscillationMode }),
    onDirectionChange: (direction: FanDirection) => update({ direction }),
    onNightModeChange: (nightMode: boolean) => update({ nightMode }),
    onHeatChange: (heatOn: boolean) => update({ state: "on", heatOn }),
    onHeatTargetChange: (heatTarget: number) => update({ heatTarget }),
  };
}
