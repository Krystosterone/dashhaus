import { useEffect, useMemo, useState } from "react";
import type { HourSample } from "../../../shared/ui";
import type { AlarmEntity, AlarmHistory, AlarmMode } from "../../../domains/alarm/types";

/** Example data for stories. The clock is fixed at 11:54. The demo code is 1234; the panel answers after a short wait, like HA. */
const NOW = { hour: 11, minute: 54 };
const stamp = `${NOW.hour}:${String(NOW.minute).padStart(2, "0")}`;
export const DEMO_CODE = "1234";
/** Modes that give you time to leave (exit delay), as most panels do. */
const EXIT_DELAY: Partial<Record<AlarmMode, number>> = { away: 30, vacation: 30 };

export interface AlarmSeed {
  /** `changedAt` here is seconds ago, made absolute when the story mounts. */
  entity: AlarmEntity;
  /** Hours 0 to NOW.hour - 1: 1 armed, 0 disarmed. */
  past: HourSample[];
}

const base = { entityId: "alarm_control_panel.home", name: "Alarm", area: "Whole home", modes: ["home", "away", "night"] as AlarmMode[], codeFormat: "number" as const };
const nightThenOff: HourSample[] = [1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0];

export const ALARM_SEEDS = {
  disarmed: { entity: { ...base, state: "disarmed", changedBy: "Alex", lastChanged: "07:02" }, past: nightThenOff },
  openDoor: { entity: { ...base, state: "disarmed", openSensors: ["Back door", "Kitchen window"], changedBy: "Alex", lastChanged: "07:02" }, past: nightThenOff },
  away: { entity: { ...base, state: "armed_away", changedBy: "Sam", lastChanged: "08:12" }, past: [1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1] },
  arming: { entity: { ...base, state: "arming", armingTo: "away", delay: 60, changedAt: 18, changedBy: "Sam", lastChanged: "11:53" }, past: nightThenOff },
  /** HA's core entity: arming, but no delay length and no target mode. No timer. */
  armingUnknown: { entity: { ...base, state: "arming", changedBy: "Sam", lastChanged: "11:53" }, past: nightThenOff },
  pending: { entity: { ...base, state: "pending", delay: 30, changedAt: 6, triggeredBy: "Front door", lastChanged: "11:53" }, past: [1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1] },
  disarming: { entity: { ...base, state: "disarming", changedBy: "Sam", lastChanged: "11:54" }, past: [1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1] },
  custom: { entity: { ...base, modes: ["home", "away", "night", "vacation", "custom_bypass"], state: "armed_custom_bypass", changedBy: "Sam", lastChanged: "09:40" }, past: [1, 1, 1, 1, 1, 1, 1, 0, 0, 1, 1] },
  /** code_arm_required: false. Arming needs no code; disarming does. */
  armFree: { entity: { ...base, name: "Studio alarm", area: "Studio", codeArmRequired: false, state: "disarmed", changedBy: "Alex", lastChanged: "07:02" }, past: nightThenOff },
  triggered: { entity: { ...base, state: "triggered", triggeredBy: "Back door", lastChanged: "11:51" }, past: [1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1] },
  /** A Ring Alarm read through Home Assistant: its state is known, but it can't be armed or disarmed from here. */
  ring: { entity: { entityId: "alarm_control_panel.ring_alarm", name: "Ring Alarm", area: "Whole home", modes: ["home", "away"], state: "armed_home", codeFormat: null, changedBy: "Keypad", lastChanged: "22:41" }, past: [1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0] },
  noCode: { entity: { entityId: "alarm_control_panel.garage", name: "Garage alarm", area: "Garage", modes: ["away"], state: "disarmed", codeFormat: null, lastChanged: "Fri 18:02" }, past: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
  unavailable: { entity: { ...base, entityId: "alarm_control_panel.cabin", name: "Cabin alarm", area: "Cabin", state: "unavailable", lastSeen: "08:20" }, past: [1, 1, 1, 1, 1, 1, 1, 1, "unavailable", "unavailable", "unavailable"] },
} satisfies Record<string, AlarmSeed>;

export type AlarmSeedName = keyof typeof ALARM_SEEDS;

/** The round trip to Home Assistant, roughly. */
const answer = () => new Promise((r) => window.setTimeout(r, 280));

/**
 * Local state that behaves like an alarm panel: the code is 1234; Away and Vacation give a 30 s exit delay;
 * an entry delay that runs out becomes triggered; disarming works from any state.
 */
export function useDemoAlarm(seed: AlarmSeed) {
  const [entity, setEntity] = useState<AlarmEntity>(() => ({
    ...seed.entity,
    changedAt: seed.entity.changedAt != null ? Date.now() - seed.entity.changedAt * 1000 : Date.now(),
  }));
  const at = (e: AlarmEntity, patch: Partial<AlarmEntity>): AlarmEntity => ({ ...e, ...patch, changedAt: Date.now(), lastChanged: stamp });

  // Like a panel: when the delay runs out, the state moves on. The widget does its own counting.
  const ends = (entity.state === "arming" || entity.state === "pending") && entity.delay && entity.changedAt != null
    ? entity.changedAt + entity.delay * 1000 : null;
  useEffect(() => {
    if (ends == null) return;
    const t = window.setTimeout(() => setEntity((e) =>
      e.state === "arming" ? at(e, { state: `armed_${e.armingTo ?? "away"}` as AlarmEntity["state"], delay: undefined })
      : e.state === "pending" ? at(e, { state: "triggered", delay: undefined })
      : e), Math.max(0, ends - Date.now()));
    return () => window.clearTimeout(t);
  }, [ends]);

  const history = useMemo<AlarmHistory>(() => {
    const armed = entity.state.startsWith("armed") || entity.state === "pending" || entity.state === "triggered";
    const now: HourSample = entity.state === "unavailable" ? "unavailable" : armed ? 1 : 0;
    const pastMin = seed.past.reduce<number>((a, x) => a + (typeof x === "number" ? x * 60 : 0), 0);
    return { samples: [...seed.past, now, ...Array(24 - seed.past.length - 1).fill(null)], currentHour: NOW.hour, armedMinutes: pastMin + (armed ? NOW.minute : 0) };
  }, [entity, seed.past]);

  return {
    entity,
    history,
    onArm: async (mode: AlarmMode, code?: string) => {
      await answer();
      if (entity.codeFormat && (entity.codeArmRequired ?? true) && code !== DEMO_CODE) return false;
      const delay = EXIT_DELAY[mode];
      setEntity((e) => delay
        ? at(e, { state: "arming", armingTo: mode, delay, changedBy: "You" })
        : at(e, { state: `armed_${mode}` as AlarmEntity["state"], armingTo: undefined, delay: undefined, changedBy: "You" }));
      return true;
    },
    onDisarm: async (code?: string) => {
      await answer();
      if (entity.codeFormat && code !== DEMO_CODE) return false;
      setEntity((e) => at(e, { state: "disarmed", armingTo: undefined, delay: undefined, triggeredBy: undefined, changedBy: "You" }));
      return true;
    },
  };
}
