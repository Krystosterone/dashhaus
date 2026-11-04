import { useMemo, useState } from "react";
import type { HourSample } from "../entities/history";
import type { HumidifierEntity, HumidifierHistory } from "../entities/humidifier/types";

/** Example data for stories. The clock is fixed at 11:54 so screenshots stay stable. */
const NOW = { hour: 11, minute: 54 };
const stamp = `${NOW.hour}:${String(NOW.minute).padStart(2, "0")}`;
const MODES = ["normal", "eco", "sleep", "boost"];

export interface HumidifierSeed {
  entity: HumidifierEntity;
  /** Hours 0 to NOW.hour - 1: share of each hour it was on. */
  past: HourSample[];
}

export const HUMIDIFIER_SEEDS = {
  on: {
    entity: { entityId: "humidifier.bedroom", name: "Bedroom humidifier", area: "Upstairs", state: "on", action: "humidifying", currentHumidity: 38, targetHumidity: 45, minHumidity: 30, maxHumidity: 80, mode: "normal", modes: MODES, lastChanged: "10:58" },
    past: [1, 1, 1, 1, 1, 1, 0.5, 0, 0, 0, 0.2],
  },
  off: {
    entity: { entityId: "humidifier.office", name: "Office", area: "Ground floor", state: "off", action: "off", currentHumidity: 47, targetHumidity: 40, minHumidity: 30, maxHumidity: 80, mode: "eco", modes: MODES, lastChanged: "07:15" },
    past: [0, 0, 0, 0, 0, 0, 0, 0.25, 0, 0, 0],
  },
  dehumidifier: {
    entity: { entityId: "humidifier.basement", name: "Basement", area: "Lower level", kind: "dehumidifier", state: "on", action: "idle", currentHumidity: 49, targetHumidity: 50, minHumidity: 35, maxHumidity: 70, lastChanged: "09:12" },
    past: [0.6, 0.4, 0.3, 0.3, 0.2, 0.4, 0.5, 0.6, 0.8, 0.4, 0.1],
  },
  /** No setpoint and no room reading: a unit that only runs in a mode. */
  modeOnly: {
    entity: { entityId: "humidifier.diffuser", name: "Diffuser", area: "Living room", state: "on", minHumidity: 0, maxHumidity: 100, mode: "sleep", modes: ["low", "sleep", "high"], lastChanged: "06:40" },
    past: [0, 0, 0, 0, 0, 0, 0.3, 1, 1, 1, 1],
  },
  unavailable: {
    entity: { entityId: "humidifier.nursery", name: "Nursery", area: "Upstairs", state: "unavailable", minHumidity: 0, maxHumidity: 100, lastSeen: "08:20" },
    past: [1, 1, 1, 1, 1, 1, 1, 1, "unavailable", "unavailable", "unavailable"],
  },
  /** Worst case: names and areas long enough to truncate at every width, the extreme setpoint and long mode names (break-ui skill). */
  long: {
    entity: { entityId: "humidifier.landing", name: "Upstairs landing by the nursery door", area: "Primary bedroom en-suite and walk-in closet", state: "on", action: "humidifying", currentHumidity: 100, targetHumidity: 100, minHumidity: 0, maxHumidity: 100, mode: "comfort_continuous_night", modes: ["comfort_continuous_night", "auto", "baby", "away", "home", "boost", "sleep"], lastChanged: "Fri 18:30" },
    past: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  },
} satisfies Record<string, HumidifierSeed>;

export type HumidifierSeedName = keyof typeof HUMIDIFIER_SEEDS;

/**
 * Worst case: a unit with no setpoint whose device names its own mode at length, so the mode itself is what a screen
 * shows, and must truncate (break-ui skill).
 */
export const HUMIDIFIER_LONG_MODE: HumidifierSeed = {
  entity: { entityId: "humidifier.hallway_diffuser", name: "Hallway diffuser", area: "Upstairs", state: "on", minHumidity: 0, maxHumidity: 100, mode: "comfort_continuous_night_quiet", modes: ["comfort_continuous_night_quiet", "auto", "boost"], lastChanged: "Fri 22:10" },
  past: [0, 0, 0, 0, 0, 0, 0.3, 1, 1, 1, 1],
};

/** Worst-case data: every skin's Worst case story draws these. */
export const HUMIDIFIER_WORST_CASE: HumidifierSeed[] = [HUMIDIFIER_SEEDS.long, HUMIDIFIER_LONG_MODE];

/** Local state that behaves like a `humidifier` entity, for stories and prototypes. */
export function useDemoHumidifier(seed: HumidifierSeed) {
  const [entity, setEntity] = useState<HumidifierEntity>(seed.entity);
  const history = useMemo<HumidifierHistory>(() => {
    const on = entity.state === "on";
    const now: HourSample = entity.state === "unavailable" ? "unavailable" : on ? 0.9 : 0;
    const samples: HourSample[] = [...seed.past, now, ...Array(24 - seed.past.length - 1).fill(null)];
    const pastMin = seed.past.reduce<number>((a, x) => a + (typeof x === "number" ? Math.round(x * 60) : 0), 0);
    return { samples, currentHour: NOW.hour, onMinutes: pastMin + (on ? NOW.minute : 0) };
  }, [entity, seed.past]);

  // Working is the gap between the room and the target: a humidifier works below it, a dehumidifier above.
  const working = (e: HumidifierEntity): HumidifierEntity["action"] => {
    if (e.state !== "on") return "off";
    if (e.currentHumidity == null || e.targetHumidity == null) return e.action;
    if (e.kind === "dehumidifier") return e.currentHumidity > e.targetHumidity ? "drying" : "idle";
    return e.currentHumidity < e.targetHumidity ? "humidifying" : "idle";
  };
  const update = (change: (e: HumidifierEntity) => Partial<HumidifierEntity>) =>
    setEntity((e) => {
      if (e.state === "unavailable") return e;
      const next = { ...e, ...change(e) };
      return { ...next, action: working(next) };
    });

  return {
    entity,
    history,
    onToggle: () => update((e) => ({ state: e.state === "on" ? "off" : "on", lastChanged: stamp })),
    onTargetChange: (humidity: number) => update(() => ({ targetHumidity: humidity })),
    onModeChange: (mode: string) => update(() => ({ mode })),
  };
}
