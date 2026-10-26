import { useMemo, useState } from "react";
import type { HourSample } from "../../../shared/ui";
import type { __Name__Entity, __Name__History } from "../../../../../domains/__name__/types";

/** Example data for stories. The clock is fixed at 11:54 so screenshots stay stable. */
const NOW = { hour: 11, minute: 54 };
const stamp = `${NOW.hour}:${String(NOW.minute).padStart(2, "0")}`;

export interface __Name__Seed {
  entity: __Name__Entity;
  /** Hours 0 to NOW.hour - 1: share of each hour it was on. */
  past: HourSample[];
}

export const __CONST___SEEDS = {
  on: {
    entity: { entityId: "__domain__.bedroom", name: "Bedroom", area: "Upstairs", state: "on", lastChanged: "10:58" },
    past: [0, 0, 0, 0, 0, 0, 0, 0.5, 1, 0, 0.2],
  },
  off: {
    entity: { entityId: "__domain__.office", name: "Office", area: "Ground floor", state: "off", lastChanged: "07:15" },
    past: [0, 0, 0, 0, 0, 0, 0, 0.25, 0, 0, 0],
  },
  unavailable: {
    entity: { entityId: "__domain__.garage", name: "Garage", area: "Outside", state: "unavailable", lastSeen: "08:20" },
    past: [0, 0, 0, 0, 0, 0, 0, 0, "unavailable", "unavailable", "unavailable"],
  },
  /** Worst case: names and areas long enough to truncate at every width (break-ui skill). */
  long: {
    entity: { entityId: "__domain__.landing", name: "Upstairs landing by the nursery door", area: "Primary bedroom en-suite and walk-in closet", state: "on", lastChanged: "Fri 18:30" },
    past: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  },
} satisfies Record<string, __Name__Seed>;

export type __Name__SeedName = keyof typeof __CONST___SEEDS;

/** Local state that behaves like a `__domain__` entity, for stories and prototypes. */
export function useDemo__Name__(seed: __Name__Seed) {
  const [entity, setEntity] = useState<__Name__Entity>(seed.entity);
  const history = useMemo<__Name__History>(() => {
    const on = entity.state === "on";
    const now: HourSample = entity.state === "unavailable" ? "unavailable" : on ? 0.9 : 0;
    const samples: HourSample[] = [...seed.past, now, ...Array(24 - seed.past.length - 1).fill(null)];
    const pastMin = seed.past.reduce<number>((a, x) => a + (typeof x === "number" ? Math.round(x * 60) : 0), 0);
    return { samples, currentHour: NOW.hour, onMinutes: pastMin + (on ? NOW.minute : 0) };
  }, [entity, seed.past]);

  return {
    entity,
    history,
    onToggle: () => setEntity((e) => (e.state === "unavailable" ? e : { ...e, state: e.state === "on" ? "off" : "on", lastChanged: stamp })),
  };
}
