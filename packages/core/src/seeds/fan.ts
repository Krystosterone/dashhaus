import { useMemo, useState } from "react";
import type { HourSample } from "../entities/history";
import type { FanDirection, FanEntity, FanHistory } from "../entities/fan/types";

/** Example data for stories. The clock is fixed at 11:54 so screenshots stay stable. */
const NOW = { hour: 11, minute: 54 };
const stamp = `${NOW.hour}:${String(NOW.minute).padStart(2, "0")}`;

export interface FanSeed {
  entity: FanEntity;
  /** Hours 0 to NOW.hour - 1: share of each hour it was on. */
  past: HourSample[];
}

/** A tower fan: three speeds, presets and a sweep. */
const TOWER = { supportsSpeed: true, speedCount: 3, supportsPreset: true, presetModes: ["normal", "sleep", "nature"], supportsOscillate: true } as const;

export const FAN_SEEDS = {
  on: {
    entity: { entityId: "fan.bedroom", name: "Tower fan", area: "Bedroom", state: "on", ...TOWER, presetModes: [...TOWER.presetModes], percentage: 67, oscillating: true, lastChanged: "10:58" },
    past: [0, 0, 0, 0, 0, 0, 0, 0.5, 1, 0, 0.2],
  },
  /** A ceiling fan: stepless speed and a summer/winter direction. */
  ceiling: {
    entity: { entityId: "fan.living_room_ceiling", name: "Ceiling fan", area: "Living room", state: "on", supportsSpeed: true, speedCount: 100, percentage: 40, supportsDirection: true, direction: "reverse", lastChanged: "09:30" },
    past: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0.5, 1],
  },
  off: {
    entity: { entityId: "fan.office", name: "Desk fan", area: "Office", state: "off", supportsSpeed: true, speedCount: 4, supportsPreset: true, presetModes: ["auto"], supportsOscillate: true, oscillating: false, lastChanged: "07:15" },
    past: [0, 0, 0, 0, 0, 0, 0, 0.25, 0, 0, 0],
  },
  /** On and off only: the slot is the pill, as a switch's is. */
  onOff: {
    entity: { entityId: "fan.bathroom_extractor", name: "Extractor", area: "Bathroom", state: "off", supportsSpeed: false, lastChanged: "07:40" },
    past: [0, 0, 0, 0, 0, 0, 0, 0.4, 0, 0, 0],
  },
  unavailable: {
    entity: { entityId: "fan.garage", name: "Garage fan", area: "Garage", state: "unavailable", supportsSpeed: true, speedCount: 100, lastSeen: "08:20" },
    past: [0, 0, 0, 0, 0, 0, 0, 0, "unavailable", "unavailable", "unavailable"],
  },
  /** Worst case: long names, every control, a long preset, many presets and the top speed (break-ui skill). */
  long: {
    entity: {
      entityId: "fan.landing", name: "Upstairs landing ceiling fan by the nursery door", area: "Primary bedroom en-suite and walk-in closet", state: "on",
      supportsSpeed: true, speedCount: 100, percentage: 100,
      supportsPreset: true, presetModes: ["normal", "sleep", "natural_breeze_with_gentle_variation", "smart_mode", "turbo", "eco", "auto"], presetMode: "natural_breeze_with_gentle_variation",
      supportsOscillate: true, oscillating: true, supportsDirection: true, direction: "forward", lastChanged: "Fri 18:30",
    },
    past: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  },
  /** Worst case: a long name on a fan that only switches. */
  longOnOff: {
    entity: { entityId: "fan.downstairs_bathroom", name: "Downstairs shower room extractor fan", area: "Ground floor bathroom and laundry", state: "on", supportsSpeed: false, lastChanged: "Fri 06:05" },
    past: [0, 0, 0, 0, 0, 0, 0.1, 1, 1, 1, 1],
  },
} satisfies Record<string, FanSeed>;

export type FanSeedName = keyof typeof FAN_SEEDS;

/** Worst-case data: every skin's Worst case story draws these. */
export const FAN_WORST_CASE: FanSeed[] = [FAN_SEEDS.long, FAN_SEEDS.longOnOff];

/** Local state that behaves like a `fan` entity, for stories and prototypes. */
export function useDemoFan(seed: FanSeed) {
  const [entity, setEntity] = useState<FanEntity>(seed.entity);
  // The speed it last ran at, so switching it back on resumes there, as Home Assistant's fans do.
  const [last, setLast] = useState(seed.entity.percentage ?? 100);
  const history = useMemo<FanHistory>(() => {
    const on = entity.state === "on";
    const now: HourSample = entity.state === "unavailable" ? "unavailable" : on ? 0.9 : 0;
    const samples: HourSample[] = [...seed.past, now, ...Array(24 - seed.past.length - 1).fill(null)];
    const pastMin = seed.past.reduce<number>((a, x) => a + (typeof x === "number" ? Math.round(x * 60) : 0), 0);
    return { samples, currentHour: NOW.hour, onMinutes: pastMin + (on ? NOW.minute : 0) };
  }, [entity, seed.past]);

  const update = (patch: Partial<FanEntity>) => setEntity((e) => {
    if (e.state === "unavailable") return e;
    const next = { ...e, ...patch, lastChanged: patch.state && patch.state !== e.state ? stamp : e.lastChanged };
    if (next.state === "off") return { ...next, percentage: undefined, presetMode: undefined };
    return next;
  });

  return {
    entity,
    history,
    onToggle: () => update(entity.state === "on" ? { state: "off" } : { state: "on", percentage: entity.supportsSpeed ? last : undefined }),
    onPercentageChange: (percentage: number) => { setLast(percentage); update({ state: "on", percentage, presetMode: undefined }); },
    onPresetChange: (presetMode: string) => update({ state: "on", presetMode, percentage: entity.percentage ?? (entity.supportsSpeed ? last : undefined) }),
    onOscillateChange: (oscillating: boolean) => update({ oscillating }),
    onDirectionChange: (direction: FanDirection) => update({ direction }),
  };
}
