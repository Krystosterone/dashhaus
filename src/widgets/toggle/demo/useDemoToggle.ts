import { useMemo, useState } from "react";
import type { HourSample } from "../../../shared/ui";
import type { ToggleEntity, ToggleHistory } from "../types";

/** Example data for stories. The clock is fixed at 11:54 so screenshots stay stable. */
const NOW = { hour: 11, minute: 54 };
const stamp = `${NOW.hour}:${String(NOW.minute).padStart(2, "0")}`;
/** What "turn on for" resolves to at 11:54. */
const ENDS: Record<string, string | undefined> = { "30": "12:24", "60": "12:54", morning: "07:00", manual: undefined };

export interface ToggleSeed {
  entity: ToggleEntity;
  /** Hours 0 to NOW.hour - 1: share of each hour it was on. */
  past: HourSample[];
}

export const TOGGLE_SEEDS = {
  dnd: {
    entity: { entityId: "input_boolean.do_not_disturb", name: "Do Not Disturb", area: "Whole home", state: "on", icon: "bell-off", tone: "calm", until: "12:54", duration: "60",
      description: "Silences phone notifications, the doorbell chime and speaker announcements.", lastChanged: "11:02" },
    past: [1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0],
  },
  quiet: {
    entity: { entityId: "input_boolean.quiet_mode", name: "Quiet mode", area: "Kids' rooms", state: "off", icon: "volume-off", tone: "blue",
      description: "Lowers speakers to 20% and mutes the dishwasher and washer chimes.", lastChanged: "07:15" },
    past: [1, 1, 1, 1, 1, 1, 1, 0.25, 0, 0, 0],
  },
  guest: {
    entity: { entityId: "input_boolean.guest_mode", name: "Guest mode", area: "Whole home", state: "on", icon: "guest", tone: "sage", duration: "manual",
      description: "Turns on the guest Wi-Fi and keeps the hallway lights low at night.", lastChanged: "Fri 18:30" },
    past: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  },
  away: {
    entity: { entityId: "input_boolean.away", name: "Away", area: "Whole home", state: "off", icon: "away", tone: "apricot",
      description: "Sets back the heating, turns off lights and arms the cameras.", lastChanged: "Sun 20:10" },
    past: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  },
  unavailable: {
    entity: { entityId: "switch.night_mode", name: "Night mode", area: "Bedroom", state: "unavailable", icon: "moon", tone: "calm", lastSeen: "08:20" },
    past: [1, 1, 1, 1, 1, 1, 1, 0, "unavailable", "unavailable", "unavailable"],
  },
} satisfies Record<string, ToggleSeed>;

export type ToggleSeedName = keyof typeof TOGGLE_SEEDS;

/** Local state that behaves like an input_boolean with an auto-off timer, for stories and prototypes. */
export function useDemoToggle(seed: ToggleSeed) {
  const [entity, setEntity] = useState<ToggleEntity>(seed.entity);
  const history = useMemo<ToggleHistory>(() => {
    const on = entity.state === "on";
    const now: HourSample = entity.state === "unavailable" ? "unavailable" : on ? 0.9 : 0;
    const samples: HourSample[] = [...seed.past, now, ...Array(24 - seed.past.length - 1).fill(null)];
    const pastMin = seed.past.reduce<number>((a, x) => a + (typeof x === "number" ? Math.round(x * 60) : 0), 0);
    return { samples, currentHour: NOW.hour, onMinutes: pastMin + (on ? NOW.minute : 0) };
  }, [entity, seed.past]);

  const set = (patch: Partial<ToggleEntity>) => setEntity((e) => (e.state === "unavailable" ? e : { ...e, ...patch, lastChanged: stamp }));
  return {
    entity,
    history,
    onToggle: () => set(entity.state === "on" ? { state: "off", until: undefined, duration: undefined } : { state: "on", until: undefined, duration: "manual" }),
    onTurnOnFor: (v: string) => set({ state: "on", duration: v, until: ENDS[v] }),
  };
}
