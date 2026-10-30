// Copied from orb's card by `npm run new-card -- sound --skin field`: field's own seeds from here.
import { useMemo, useState } from "react";
import type { HourSample } from "@dashhaus/core/entities/history";
import type { SoundEntity, SoundHistory } from "@dashhaus/core/entities/sound/types";

/** Example data for stories. The clock is fixed at 11:54 so screenshots stay stable. */
const NOW = { hour: 11, minute: 54 };
const stamp = `${NOW.hour}:${String(NOW.minute).padStart(2, "0")}`;

export interface SoundSeed {
  entity: SoundEntity;
  /** Hours 0 to NOW.hour - 1: share of each hour it was on. */
  past: HourSample[];
}

export const SOUND_SEEDS = {
  /** The nursery sound machine's white noise, on through the night and the morning nap. */
  on: {
    entity: { entityId: "switch.nova_sound_machine_music", name: "White noise", area: "Nursery", state: "on", volume: 62, lastChanged: "10:58" },
    past: [1, 1, 1, 1, 1, 1, 1, 0.2, 0, 0, 0.1],
  },
  off: {
    entity: { entityId: "switch.nova_sound_machine_music", name: "White noise", area: "Nursery", state: "off", volume: 62, lastChanged: "07:12" },
    past: [1, 1, 1, 1, 1, 1, 1, 0.2, 0, 0, 0],
  },
  /** A sound with no volume entity: the switch alone. */
  noVolume: {
    entity: { entityId: "switch.office_fan_noise", name: "Fan noise", area: "Office", state: "on", lastChanged: "09:40" },
    past: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0.3, 1],
  },
  unavailable: {
    entity: { entityId: "switch.guest_sound_machine_music", name: "Sound machine", area: "Guest room", state: "unavailable", lastSeen: "08:20" },
    past: [0, 0, 0, 0, 0, 0, 0, 0, "unavailable", "unavailable", "unavailable"],
  },
  /** Worst case: names and areas long enough to truncate at every width, the volume at its widest (break-ui skill). */
  long: {
    entity: { entityId: "switch.landing", name: "Upstairs landing sound machine by the nursery door", area: "Primary bedroom en-suite and walk-in closet", state: "on", volume: 100, lastChanged: "Fri 18:30" },
    past: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  },
} satisfies Record<string, SoundSeed>;

export type SoundSeedName = keyof typeof SOUND_SEEDS;

/** Worst-case data: the card's Worst case story and Orb → Foundations → Worst case both draw these. */
export const SOUND_WORST_CASE: SoundSeed[] = [SOUND_SEEDS.long];

/** Local state that behaves like a sound `switch` and its volume `number`, for stories and prototypes. */
export function useDemoSound(seed: SoundSeed) {
  const [entity, setEntity] = useState<SoundEntity>(seed.entity);
  const history = useMemo<SoundHistory>(() => {
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
    // Setting the volume never switches the sound.
    onVolumeChange: entity.volume == null ? undefined : (volume: number) => setEntity((e) => (e.state === "unavailable" ? e : { ...e, volume })),
  };
}
