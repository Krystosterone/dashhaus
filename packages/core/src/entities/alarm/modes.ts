import type { AlarmAction, AlarmEntity, AlarmMode, AlarmState } from "./types";

/** The mode an armed state is in; undefined for every other state. */
export const ARMED_MODE: Partial<Record<AlarmState, AlarmMode>> = { armed_home: "home", armed_away: "away", armed_night: "night", armed_vacation: "vacation", armed_custom_bypass: "custom_bypass" };

/** Each mode in one word, and Off for disarmed. */
export const MODE_LABEL: Record<AlarmMode | "off", string> = { off: "Off", home: "Home", away: "Away", night: "Night", vacation: "Vacation", custom_bypass: "Custom" };

/** An armed mode in words: "Armed away". */
export const ARMED_LABEL: Record<AlarmMode, string> = { home: "Armed home", away: "Armed away", night: "Armed night", vacation: "Armed vacation", custom_bypass: "Armed custom" };

/** What each mode watches, for the details. */
export const MODE_HINT: Record<AlarmMode, string> = {
  home: "Doors and windows",
  away: "Everything",
  night: "Doors, windows, downstairs",
  vacation: "Everything, lights on a schedule",
  custom_bypass: "Everything except the zones you bypassed",
};

/** Off, then each arm mode. Armed in a mode the list leaves out (custom bypass, set from the panel itself): show it rather than Off. */
export const modeChoices = (modes: AlarmMode[], current: AlarmMode | "off"): (AlarmMode | "off")[] =>
  ["off", ...modes, ...(current !== "off" && !modes.includes(current) ? [current] : [])];

/** Whether an action asks for the code. Home Assistant asks to arm too unless the integration says otherwise. */
export const needsCode = (e: Pick<AlarmEntity, "codeFormat" | "codeArmRequired">, action: AlarmAction) =>
  !!e.codeFormat && (action.kind === "disarm" || (e.codeArmRequired ?? true));

/** A delay's time left, as a panel's display shows it: 0:42, 10:00. */
export const mmss = (s: number) => `${Math.floor(Math.max(0, s) / 60)}:${String(Math.max(0, Math.ceil(s)) % 60).padStart(2, "0")}`;

/** Ranked once, in `./severity.ts`; here too for the modules that read it beside the modes. */
export { alarmSeverity } from "./severity";
