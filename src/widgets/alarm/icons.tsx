import type { AlarmMode } from "../../domains/alarm/types";

const P = { fill: "none", stroke: "currentColor" } as const;
const SHIELD = "M10 2.8 4.5 5v4.6c0 3.4 2.3 6.2 5.5 7.6 3.2-1.4 5.5-4.2 5.5-7.6V5Z";

/** The badge: a shield, checked when armed, struck through when disarmed, with a mark when it needs attention. */
export function ShieldIcon({ kind }: { kind: "off" | "armed" | "alert" | "unavailable" }) {
  const extra = kind === "armed" ? "M7.6 10l1.7 1.7 3.2-3.4" : kind === "alert" ? "M10 7v3.4M10 13h.01" : "M3.5 3.5l13 13";
  return <svg viewBox="0 0 20 20" aria-hidden="true" {...P}><path d={SHIELD} /><path d={extra} /></svg>;
}

const MODE_PATH: Record<AlarmMode | "off", string> = {
  off: "M10 3.5v6M6.3 6.2a5.4 5.4 0 1 0 7.4 0",
  home: "M3.5 9.5 10 4l6.5 5.5M5.5 8v8.5h9V8",
  away: "M8.5 3.5h7v13h-7M12 10H3.5M6 7.5 3.5 10 6 12.5",
  night: "M15.2 12.6A6 6 0 0 1 7.4 4.8a6 6 0 1 0 7.8 7.8Z",
  vacation: "M3.5 7h13v8.5h-13ZM7.5 7V5.6a1.4 1.4 0 0 1 1.4-1.4h2.2a1.4 1.4 0 0 1 1.4 1.4V7",
  custom_bypass: "M4 6h12M4 10h12M4 14h12M7 4.5v3M13 8.5v3M9 12.5v3",
};
export function ModeIcon({ mode }: { mode: AlarmMode | "off" }) {
  return <svg viewBox="0 0 20 20" aria-hidden="true" {...P}><path d={MODE_PATH[mode]} /></svg>;
}

export const MODE_LABEL: Record<AlarmMode | "off", string> = { off: "Off", home: "Home", away: "Away", night: "Night", vacation: "Vacation", custom_bypass: "Custom" };
/** What each mode watches, for the sheet. */
export const MODE_HINT: Record<AlarmMode, string> = {
  home: "Doors and windows",
  away: "Everything",
  night: "Doors, windows, downstairs",
  vacation: "Everything, lights on a schedule",
  custom_bypass: "Everything except the zones you bypassed",
};
