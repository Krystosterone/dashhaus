import type { HourSample } from "../entities/history";
import type { OwletEntity, OwletHistory, Reading, SleepState } from "../entities/owlet/types";
import { SLEEP_SAMPLE } from "../entities/owlet/sleep";

/** Example data for stories. The clock is fixed at 11:54 so screenshots stay stable. */
const NOW = { hour: 11, minute: 54 };

/** A night and a morning nap, hour by hour from midnight to 10:00, with the current hour last. */
const NIGHT: SleepState[] = ["deep_sleep", "deep_sleep", "light_sleep", "deep_sleep", "deep_sleep", "light_sleep", "light_sleep", "awake", "awake", "light_sleep", "deep_sleep"];
const HEART: number[] = [118, 116, 124, 117, 119, 126, 129, 142, 150, 131, 121];
const OXYGEN: number[] = [98, 98, 97, 98, 99, 97, 97, 98, 99, 98, 98];

function ahead<T>(past: T[], now: T): (T | null)[] {
  return [...past, now, ...Array<null>(24 - past.length - 1).fill(null)];
}

function day(now: SleepState | "unavailable", hr?: number, o2?: number, past: SleepState[] = NIGHT): OwletHistory {
  const sleep: HourSample[] = ahead<HourSample>(past.map((s) => SLEEP_SAMPLE[s]), now === "unavailable" ? "unavailable" : SLEEP_SAMPLE[now]);
  const asleep = past.filter((s) => s !== "awake").length * 60 + (now !== "unavailable" && now !== "awake" ? NOW.minute : 0);
  return {
    sleep,
    heartRate: ahead<Reading>(HEART, hr ?? "unavailable"),
    oxygen: ahead<Reading>(OXYGEN, o2 ?? "unavailable"),
    currentHour: NOW.hour,
    asleepMinutes: asleep,
  };
}

export interface OwletSeed { entity: OwletEntity; history: OwletHistory }

const sock = (entity: Omit<OwletEntity, "entityId">): OwletEntity => ({ entityId: "sensor.owlet_sock_ac000w0123_sleep_state", ...entity });

export const OWLET_SEEDS = {
  deep: { entity: sock({ name: "Nova", area: "Nursery", state: "deep_sleep", heartRate: 121, oxygen: 98, live: true, lastUpdated: "11:54" }), history: day("deep_sleep", 121, 98) },
  light: { entity: sock({ name: "Nova", area: "Nursery", state: "light_sleep", heartRate: 133, oxygen: 97, live: true, lastUpdated: "11:54" }), history: day("light_sleep", 133, 97) },
  awake: { entity: sock({ name: "Nova", area: "Nursery", state: "awake", heartRate: 152, oxygen: 99, live: true, lastUpdated: "11:54" }), history: day("awake", 152, 99) },
  /** The sock is on and reading, but hasn't settled on a sleep state yet. */
  unknown: { entity: sock({ name: "Nova", area: "Nursery", state: "unavailable", heartRate: 138, oxygen: 98, live: true, lastUpdated: "11:54" }), history: day("unavailable", 138, 98) },
  /** The base station is switched off: the sock still reads, but no alarm would sound. */
  baseOff: { entity: sock({ name: "Nova", area: "Nursery", state: "light_sleep", heartRate: 129, oxygen: 98, live: true, lastUpdated: "11:54", baseOn: false }), history: day("light_sleep", 129, 98) },
  /** Readings stopped arriving at 11:49: the figures are old. */
  stale: { entity: sock({ name: "Nova", area: "Nursery", state: "deep_sleep", heartRate: 119, oxygen: 98, live: false, lastUpdated: "11:49" }), history: day("deep_sleep", 119, 98) },
  /** The base station is sounding: oxygen dropped. */
  lowOxygen: { entity: sock({ name: "Nova", area: "Nursery", state: "light_sleep", heartRate: 131, oxygen: 84, live: true, lastUpdated: "11:54", alerts: ["low_oxygen"] }), history: day("light_sleep", 131, 84) },
  /** Two vitals alerts at once, and a device problem besides. */
  critical: { entity: sock({ name: "Nova", area: "Nursery", state: "light_sleep", heartRate: 72, oxygen: 79, live: true, lastUpdated: "11:54", alerts: ["low_heart_rate", "critical_oxygen", "low_battery"] }), history: day("light_sleep", 72, 79) },
  /** The sock slipped: no readings, and the base says so. */
  sockOff: { entity: sock({ name: "Nova", area: "Nursery", state: "unavailable", lastSeen: "11:41", alerts: ["sock_off"] }), history: day("unavailable") },
  /** Reading fine, but the battery needs a charge soon. */
  lowBattery: { entity: sock({ name: "Nova", area: "Nursery", state: "deep_sleep", heartRate: 118, oxygen: 98, live: true, lastUpdated: "11:54", alerts: ["low_battery"] }), history: day("deep_sleep", 118, 98) },
  /** On its charger: the sock reports nothing, and says why. */
  charging: { entity: sock({ name: "Nova", area: "Nursery", state: "unavailable", lastSeen: "07:12", charging: true }), history: day("unavailable") },
  /** Home Assistant can't reach the sock: no readings, no alert, no reason given. */
  unavailable: { entity: sock({ name: "Nova", area: "Nursery", state: "unavailable", lastSeen: "10:42" }), history: day("unavailable") },
  /** Worst case: a long name and area, and three-digit figures everywhere (break-ui skill). */
  long: {
    entity: sock({ name: "Anastasia-Josephine Wolfeschlegel", area: "Upstairs nursery and playroom", state: "light_sleep", heartRate: 188, oxygen: 100, live: false, lastUpdated: "Fri 18:30" }),
    history: day("light_sleep", 188, 100),
  },
} satisfies Record<string, OwletSeed>;

export type OwletSeedName = keyof typeof OWLET_SEEDS;

/**
 * Worst-case data, every slot at its widest: a long name and area with three-digit figures and a reading that stopped
 * on another day; every alert sounding at once, with the base off; a sock that reads without a sleep state, oxygen or
 * area; and two-digit figures (break-ui skill).
 */
export const OWLET_WORST_CASE: OwletSeed[] = [
  OWLET_SEEDS.long,
  {
    entity: {
      entityId: "sensor.owlet_sock_ac000w0456_sleep_state", name: "Maximilian-Alexander", area: "Grandparents' guest room", state: "awake", heartRate: 196, oxygen: 82, live: true, lastUpdated: "11:54", baseOn: false,
      alerts: ["critical_oxygen", "low_oxygen", "high_oxygen", "low_heart_rate", "high_heart_rate", "sock_off", "sock_disconnected", "lost_power", "critical_battery", "low_battery"],
    },
    history: day("awake", 196, 82),
  },
  { entity: { entityId: "sensor.owlet_sock_ac000w0789_sleep_state", name: "Bo", state: "unavailable", heartRate: 99, live: false, lastUpdated: "Thu 23:58" }, history: day("unavailable", 99) },
  { entity: { entityId: "sensor.owlet_sock_ac000w0999_sleep_state", name: "Li", area: "Nursery", state: "deep_sleep", heartRate: 64, oxygen: 88, live: true, lastUpdated: "11:54" }, history: day("deep_sleep", 64, 88) },
];
