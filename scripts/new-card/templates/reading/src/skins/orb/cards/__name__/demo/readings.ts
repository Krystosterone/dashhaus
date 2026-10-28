import type { Reading } from "../../../shared/ui";
import type { __Name__Entity, __Name__History } from "../../../../../domains/__name__/types";

/** Example data for stories. The clock is fixed at 11:54 so screenshots stay stable. */
const NOW = { hour: 11 };

/** Hours 0 to 10, then the current hour, then hours ahead. */
const day = (past: Reading[], now: Reading): __Name__History => ({
  readings: [...past, now, ...Array<null>(24 - past.length - 1).fill(null)],
  currentHour: NOW.hour,
});
const MORNING: Reading[] = [38, 37, 36, 36, 35, 36, 39, 44, 47, 45, 43];

export interface __Name__Seed { entity: __Name__Entity; history: __Name__History }

export const __CONST___SEEDS = {
  normal: {
    entity: { entityId: "__domain__.living_room", name: "Living room", area: "Ground floor", state: "ok", value: 42, unit: "__unit__", lastUpdated: "11:54" },
    history: day(MORNING, 42),
  },
  low: {
    entity: { entityId: "__domain__.office", name: "Office", area: "Upstairs", state: "ok", value: 7.5, unit: "__unit__", lastUpdated: "11:52" },
    history: day([9, 9, 8, 8, 8, 8, 8, 7.5, 7.5, 7.5, 7.5], 7.5),
  },
  /** Reachable, but no reading has come in yet. */
  waiting: {
    entity: { entityId: "__domain__.porch", name: "Porch", area: "Outside", state: "ok", unit: "__unit__" },
    history: day(Array<Reading>(11).fill(null), null),
  },
  unavailable: {
    entity: { entityId: "__domain__.garage", name: "Garage", area: "Outside", state: "unavailable", unit: "__unit__", lastSeen: "08:20" },
    history: day([30, 30, 31, 31, 30, 30, 30, 30, "unavailable", "unavailable", "unavailable"], "unavailable"),
  },
  /** Worst case: names and areas long enough to truncate at every width, and a long raw value (break-ui skill). */
  long: {
    entity: { entityId: "__domain__.landing", name: "Upstairs landing by the nursery door", area: "Primary bedroom en-suite and walk-in closet", state: "ok", value: 12345.678, unit: "__unit__", lastUpdated: "Fri 18:30" },
    history: day(MORNING, 12345.678),
  },
} satisfies Record<string, __Name__Seed>;

export type __Name__SeedName = keyof typeof __CONST___SEEDS;

/** Worst-case data: the card's Worst case story and Orb → Foundations → Worst case both draw these. */
export const __CONST___WORST_CASE: __Name__Seed[] = [__CONST___SEEDS.long];
