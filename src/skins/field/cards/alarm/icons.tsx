import type { AlarmMode } from "../../../../domains/alarm/types";

const STROKE = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round" } as const;
const SHIELD = "M12 3.2 5 6v5.6c0 4.2 2.9 7.6 7 9.2 4.1-1.6 7-5 7-9.2V6Z";

/**
 * The alarm's domain glyph, on its key or its view-only plate (24 x 24, stroked): a shield, checked while armed, with
 * a mark while it needs attention (an entry delay, triggered). Plain while disarmed or unavailable.
 */
export function IconShield({ kind }: { kind: "off" | "armed" | "alert" }) {
  const mark = kind === "armed" ? "M9 12l2.2 2.2L15.2 10" : kind === "alert" ? "M12 8.6v4M12 15.8h.01" : "";
  return <svg viewBox="0 0 24 24" {...STROKE}><path d={SHIELD} />{mark && <path d={mark} />}</svg>;
}

const MODE_PATH: Record<AlarmMode | "off", string> = {
  off: "M12 4v7M7.6 7.2a6.5 6.5 0 1 0 8.8 0",
  home: "M4 11.5 12 5l8 6.5M6.5 10v9.5h11V10",
  away: "M10 4h8.5v16H10M14.5 12H4M7 9l-3 3 3 3",
  night: "M18.4 15.2A7.2 7.2 0 0 1 8.8 5.6a7.2 7.2 0 1 0 9.6 9.6Z",
  vacation: "M4 8.5h16v10.5H4ZM9 8.5V6.8A1.8 1.8 0 0 1 10.8 5h2.4A1.8 1.8 0 0 1 15 6.8v1.7",
  custom_bypass: "M5 7h14M5 12h14M5 17h14M8.5 5v4M15.5 10v4M10.5 15v4",
};

/** Off and each arm mode, on its mode key (24 x 24, stroked): power, a house, a door left by, a moon, a suitcase, zones. */
export function IconMode({ mode }: { mode: AlarmMode | "off" }) {
  return <svg viewBox="0 0 24 24" {...STROKE}><path d={MODE_PATH[mode]} /></svg>;
}

/** Delete and enter, on the keypad. */
export function IconDelete() {
  return <svg viewBox="0 0 24 24" {...STROKE}><path d="M9 6h10.5v12H9l-5-6ZM11.5 9.5l5 5M16.5 9.5l-5 5" /></svg>;
}
export function IconEnter() {
  return <svg viewBox="0 0 24 24" {...STROKE}><path d="M6 12.5 10 16.5 18 8" /></svg>;
}

/** A shield, as a solid shape for the screen's pictogram (20 x 26): lit while armed, in the figure's ink. */
export const SHIELD_PICT = <path d="M10 1.5 18.5 5v7.2c0 5.6-3.6 9.9-8.5 12.3-4.9-2.4-8.5-6.7-8.5-12.3V5Z" />;
