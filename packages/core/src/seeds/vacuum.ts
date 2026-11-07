import { useMemo, useState } from "react";
import type { HourSample } from "../entities/history";
import type { VacuumEntity, VacuumHistory } from "../entities/vacuum/types";

/** Example data for stories. The clock is fixed at 11:54 so screenshots stay stable. */
const NOW = { hour: 11, minute: 54 };
const stamp = `${NOW.hour}:${String(NOW.minute).padStart(2, "0")}`;

export interface VacuumSeed {
  entity: VacuumEntity;
  /** Hours 0 to NOW.hour - 1: share of each hour it was cleaning. */
  past: HourSample[];
}

/** A vacuum that does everything Home Assistant names: start, pause, the dock, locate and four fan speeds. */
const FULL = {
  supportsStart: true, supportsPause: true, supportsReturn: true, supportsLocate: true, supportsFanSpeed: true,
  fanSpeeds: ["quiet", "standard", "strong", "turbo"],
} as const;
const full = () => ({ ...FULL, fanSpeeds: [...FULL.fanSpeeds] });
/** A morning run, 08:00 to 09:15. */
const MORNING: HourSample[] = [0, 0, 0, 0, 0, 0, 0, 0, 1, 0.25, 0];

export const VACUUM_SEEDS = {
  /** Cleaning since 11:20: the accent, and a press pauses it. */
  cleaning: {
    entity: { entityId: "vacuum.downstairs", name: "Robot vacuum", area: "Hall", state: "cleaning", ...full(), fanSpeed: "standard", battery: 72, lastChanged: "11:20" },
    past: MORNING,
  },
  /** Back on its dock, charging after the morning run. */
  docked: {
    entity: { entityId: "vacuum.upstairs", name: "Upstairs vacuum", area: "Landing", state: "docked", ...full(), fanSpeed: "quiet", battery: 64, charging: true, status: "Charging", lastChanged: "09:15" },
    past: MORNING,
  },
  /** On its way back to the dock: a transition, said as one. */
  returning: {
    entity: { entityId: "vacuum.kitchen", name: "Kitchen vacuum", area: "Kitchen", state: "returning", ...full(), fanSpeed: "strong", battery: 31, lastChanged: "11:51" },
    past: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0.5, 1],
  },
  /** Paused part way: a press resumes it. */
  paused: {
    entity: { entityId: "vacuum.living_room", name: "Living room vacuum", area: "Living room", state: "paused", ...full(), fanSpeed: "standard", battery: 54, lastChanged: "11:42" },
    past: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.7],
  },
  /** Stopped with an error: urgent, the warn marker with what went wrong, never more glow. */
  error: {
    entity: { entityId: "vacuum.bedroom", name: "Bedroom vacuum", area: "Bedroom", state: "error", ...full(), fanSpeed: "standard", battery: 41, error: "Main brush jammed", lastChanged: "10:40" },
    past: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.65],
  },
  /** Idle away from its dock with a low battery: advisory, about the device. */
  lowBattery: {
    entity: { entityId: "vacuum.study", name: "Study vacuum", area: "Study", state: "idle", ...full(), fanSpeed: "quiet", battery: 9, lastChanged: "10:05" },
    past: [0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0.1],
  },
  /** A state Home Assistant doesn't name, from its integration: said in its own words. */
  other: {
    entity: { entityId: "vacuum.utility", name: "Utility vacuum", area: "Utility room", state: "other", stateText: "Emptying the bin", supportsStart: true, supportsReturn: true, battery: 88, lastChanged: "11:50" },
    past: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.8],
  },
  /** A basic vacuum with no pause: cleaning, a press sends it to the dock. */
  basic: {
    entity: { entityId: "vacuum.guest_room", name: "Guest room vacuum", area: "Guest room", state: "cleaning", supportsStart: true, supportsReturn: true, battery: 47, lastChanged: "11:35" },
    past: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.3],
  },
  unavailable: {
    entity: { entityId: "vacuum.garage", name: "Garage vacuum", area: "Garage", state: "unavailable", ...full(), lastSeen: "08:20" },
    past: [0, 0, 0, 0, 0, 0, 0, 0, "unavailable", "unavailable", "unavailable"],
  },
  /** Worst case: names and areas long enough to truncate at every width, an error at length, a battery near empty (break-ui skill). */
  long: {
    entity: {
      entityId: "vacuum.basement_playroom", name: "Basement robot vacuum by the bulkhead stairs", area: "Utility room behind the laundry and boiler",
      state: "error", ...full(), fanSpeed: "turbo", battery: 3, error: "Robot is stuck under furniture, move it to open floor", status: "Stuck under the sofa near the bulkhead door", lastChanged: "Fri 18:30",
    },
    past: Array<HourSample>(11).fill(0.4),
  },
} satisfies Record<string, VacuumSeed>;

export type VacuumSeedName = keyof typeof VACUUM_SEEDS;

/*
 * Worst-case data: values real Home Assistant installs produce. A long name and area in error with a long reason and
 * a near-empty battery, a long name in another language with every fan speed a vacuum lists, a one-letter vacuum
 * that says nothing and supports nothing, a battery exactly at the warning line, an integration's own long state, and
 * a long name gone and never seen. Every skin's Worst case story draws these.
 */
export const VACUUM_WORST_CASE: VacuumSeed[] = [
  VACUUM_SEEDS.long,
  { // Accented, long, cleaning on the strongest of seven speeds, said as the integration says them
    entity: {
      entityId: "vacuum.salle_de_sejour", name: "Aspirateur robot – salle de séjour et coin repas", area: "Rez-de-chaussée, côté jardin d'hiver",
      state: "cleaning", ...full(), fanSpeeds: ["silent", "quiet", "balanced", "standard", "strong", "turbo", "max_plus"], fanSpeed: "max_plus", battery: 100, lastChanged: "23:58",
    },
    past: Array<HourSample>(11).fill(1),
  },
  { // No area, no battery, no features, never changed, nothing read today
    entity: { entityId: "vacuum.x", name: "X", state: "idle" },
    past: Array<HourSample>(11).fill(null),
  },
  { // Paused out in the room, the battery exactly at the warning line: it warns
    entity: { entityId: "vacuum.arbeitszimmer", name: "Arbeitszimmer-Saugroboter", area: "Arbeitszimmer", state: "paused", ...full(), fanSpeed: "standard", battery: 15, lastChanged: "Mon 06:12" },
    past: [0, 0, 0, 0, 0, 0, 1, 0.2, 0, 0, 0],
  },
  { // An integration's own state at length, with nothing to press
    entity: { entityId: "vacuum.robot_firmware", name: "Robot vacuum", area: "Hall", state: "other", stateText: "Updating firmware, do not move", battery: 50, lastChanged: "11:53" },
    past: Array<HourSample>(11).fill(0),
  },
  { // Gone with its long name, never seen: "Last seen unknown" and the dashed slot at length
    entity: { entityId: "vacuum.basement_playroom_2", name: "Basement robot vacuum by the bulkhead stairs", area: "Utility room behind the laundry and boiler", state: "unavailable" },
    past: Array<HourSample>(11).fill("unavailable"),
  },
];

/** Local state that behaves like a `vacuum` entity, for stories and prototypes: start, pause, the dock, fan speed. */
export function useDemoVacuum(seed: VacuumSeed) {
  const [entity, setEntity] = useState<VacuumEntity>(seed.entity);
  const history = useMemo<VacuumHistory>(() => {
    const cleaning = entity.state === "cleaning";
    const now: HourSample = entity.state === "unavailable" ? "unavailable" : cleaning ? 0.9 : seed.entity.state === "cleaning" ? 0.5 : 0;
    const samples: HourSample[] = [...seed.past, now, ...Array(24 - seed.past.length - 1).fill(null)];
    const pastMin = seed.past.reduce<number>((a, x) => a + (typeof x === "number" ? Math.round(x * 60) : 0), 0);
    return { samples, currentHour: NOW.hour, cleaningMinutes: pastMin + (cleaning ? NOW.minute : 0) };
  }, [entity, seed.past, seed.entity.state]);

  const go = (state: VacuumEntity["state"], when: boolean | undefined) => setEntity((e) => (
    e.state === "unavailable" || !when ? e : { ...e, state, stateText: undefined, status: undefined, error: undefined, charging: state === "docked" ? e.charging : false, lastChanged: stamp }
  ));

  return {
    entity,
    history,
    onStart: () => go("cleaning", entity.supportsStart),
    onPause: () => go("paused", entity.supportsPause),
    onReturnToBase: () => go("returning", entity.supportsReturn),
    onLocate: () => undefined,
    onFanSpeedChange: (fanSpeed: string) => setEntity((e) => (e.state === "unavailable" || !e.fanSpeeds?.includes(fanSpeed) ? e : { ...e, fanSpeed })),
  };
}
