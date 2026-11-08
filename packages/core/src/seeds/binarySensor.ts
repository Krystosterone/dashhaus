import { useState } from "react";
import type { HourSample } from "../entities/history";
import type { BinarySensorEntity, BinarySensorHistory } from "../entities/binarySensor/types";

/** Example data for stories. The clock is fixed at 11:54 so screenshots stay stable. */
const NOW = { hour: 11 };

/**
 * Hours 0 to 10, then the current hour, then hours ahead: the share of each hour it was on (open, wet, detecting),
 * and the minutes that adds up to.
 */
const day = (past: HourSample[], now: HourSample): BinarySensorHistory => {
  const samples = [...past, now, ...Array<null>(24 - past.length - 1).fill(null)];
  const onMinutes = Math.round(samples.reduce<number>((sum, s) => sum + (typeof s === "number" ? s * 60 : 0), 0));
  return { samples, currentHour: NOW.hour, onMinutes };
};
const QUIET: HourSample[] = Array<HourSample>(11).fill(0);

export interface BinarySensorSeed {
  /** `changedAt` here is seconds ago, made absolute when the story mounts (`useDemoBinarySensor`). */
  entity: BinarySensorEntity;
  history: BinarySensorHistory;
}

export const BINARY_SENSOR_SEEDS = {
  /** Closed, opened a few times this morning. */
  closed: {
    entity: { entityId: "binary_sensor.front_door", name: "Front door", area: "Hall", state: "off", deviceClass: "door", lastChanged: "08:16", battery: 64 },
    history: day([0, 0, 0, 0, 0, 0, 0, 0.1, 0.05, 0, 0], 0),
  },
  /** Open for the last 23 minutes: a state, not a warning. */
  open: {
    entity: { entityId: "binary_sensor.patio_door", name: "Patio door", area: "Kitchen", state: "on", deviceClass: "door", lastChanged: "11:31" },
    history: day([0, 0, 0, 0, 0, 0, 0, 0, 0.25, 0, 0], 0.4),
  },
  window: {
    entity: { entityId: "binary_sensor.bedroom_window", name: "Bedroom window", area: "Bedroom", state: "on", deviceClass: "window", lastChanged: "07:05", battery: 81 },
    history: day([0, 0, 0, 0, 0, 0, 0, 0.9, 1, 1, 1], 1),
  },
  /** Wet: a leak is urgent, the warn marker. */
  leak: {
    entity: { entityId: "binary_sensor.kitchen_sink_leak", name: "Under the sink", area: "Kitchen", state: "on", deviceClass: "moisture", lastChanged: "11:48", battery: 92 },
    history: day(QUIET, 0.1),
  },
  /** Smoke: an alarm, Orb's slot filled in warn and Field's screen inverted, never more glow. */
  smoke: {
    entity: { entityId: "binary_sensor.hallway_smoke", name: "Hallway smoke", area: "Upstairs", state: "on", deviceClass: "smoke", lastChanged: "11:52", changedAt: 120 },
    history: day(QUIET, 0.05),
  },
  /** Clear, with its device's battery low: advisory, about the device. */
  lowBattery: {
    entity: { entityId: "binary_sensor.kitchen_smoke", name: "Kitchen smoke", area: "Kitchen", state: "off", deviceClass: "smoke", lastChanged: "Mon 06:12", battery: 9 },
    history: day(QUIET, 0),
  },
  unavailable: {
    entity: { entityId: "binary_sensor.garage_door", name: "Garage door", area: "Garage", state: "unavailable", deviceClass: "garage_door", lastSeen: "08:20" },
    history: day([0, 0, 0, 0, 0, 0, 0, 0.5, "unavailable", "unavailable", "unavailable"], "unavailable"),
  },
  /** Worst case: names and areas long enough to truncate at every width, a garage door open all day (its warning leads the low battery), a battery near empty (break-ui skill). */
  long: {
    entity: {
      entityId: "binary_sensor.basement_bulkhead_door_contact", name: "Basement bulkhead door to the garden stairs", area: "Utility room behind the laundry and boiler",
      state: "on", deviceClass: "garage_door", lastChanged: "Fri 18:30", battery: 3,
    },
    history: day(Array<HourSample>(11).fill(1), 1),
  },
} satisfies Record<string, BinarySensorSeed>;

export type BinarySensorSeedName = keyof typeof BINARY_SENSOR_SEEDS;

/*
 * Worst-case data: values real Home Assistant installs produce. Long names and areas with an alarm and a low
 * battery at once, a plain sensor with no class, no area and no history, a long name in another language, a battery
 * exactly at the warning line, a long name gone and never seen, and an urgent warning at length. Every skin's Worst
 * case story draws these.
 */
export const BINARY_SENSOR_WORST_CASE: BinarySensorSeed[] = [
  BINARY_SENSOR_SEEDS.long,
  { // Carbon monoxide, and its battery low too: the alarm leads, the battery waits for the sheet
    entity: { entityId: "binary_sensor.chambre_principale_monoxyde", name: "Détecteur de monoxyde de carbone – chambre principale", area: "Chambre principale et salle de bain attenante", state: "on", deviceClass: "carbon_monoxide", lastChanged: "23:58", battery: 4 },
    history: day(Array<HourSample>(11).fill(0), 1),
  },
  { // No class, no area, never changed, nothing read today
    entity: { entityId: "binary_sensor.x", name: "X", state: "off" },
    history: day(Array<HourSample>(11).fill(null), null),
  },
  { // A long compound name, closed, the battery exactly at the warning line: it warns
    entity: { entityId: "binary_sensor.arbeitszimmer_fenster", name: "Arbeitszimmer-Fensterkontakt", area: "Arbeitszimmer", state: "off", deviceClass: "window", lastChanged: "Mon 06:12", battery: 15 },
    history: day(QUIET, 0),
  },
  { // Gone with its long name, never seen: "Last seen unknown" and the dashed slot at length
    entity: { entityId: "binary_sensor.basement_bulkhead_door_contact_2", name: BINARY_SENSOR_SEEDS.long.entity.name, area: BINARY_SENSOR_SEEDS.long.entity.area, state: "unavailable", deviceClass: "door" },
    history: day(Array<HourSample>(11).fill("unavailable"), "unavailable"),
  },
  { // Tampered with, a long name: the urgent path at its worst, with the battery low behind it
    entity: { entityId: "binary_sensor.boiler_room_water_heater_tamper", name: "Water heater flood sensor, boiler room", area: "Utility room behind the laundry and boiler", state: "on", deviceClass: "tamper", lastChanged: "Sun 03:07", battery: 7 },
    history: day(QUIET, 1),
  },
];

/** A seed as a card draws it: its `changedAt`, seconds ago in the seed, made absolute from `now`. */
export const atTime = (seed: BinarySensorSeed, now: number): BinarySensorSeed => ({
  entity: { ...seed.entity, changedAt: seed.entity.changedAt != null ? now - seed.entity.changedAt * 1000 : undefined },
  history: seed.history,
});

/** A seed made absolute once, when the story mounts, as the alarm's demo is. */
export function useDemoBinarySensor(seed: BinarySensorSeed): BinarySensorSeed {
  const [demo] = useState(() => atTime(seed, Date.now()));
  return demo;
}
