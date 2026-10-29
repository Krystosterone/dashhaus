import type { HvacMode } from "../../../../domains/climate/types";

const STROKE = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round" } as const;

/**
 * Stable climate identity for the power key: a round wall thermostat, its dial and setpoint mark, so a column tells
 * it from a room sensor's thermometer.
 */
export function ThermostatIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...STROKE}>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="4.5" />
      <path d="M12 3.5v3" />
    </svg>
  );
}

/** A mode glyph for a Field key. Shape and words, never hue, distinguish heat from cool. */
export function ModeIcon({ mode }: { mode: HvacMode }) {
  switch (mode) {
    case "heat":
      return <svg viewBox="0 0 24 24" aria-hidden="true" {...STROKE}><path d="M12 21c-3.7 0-6-2.6-6-5.8 0-3.1 2.1-4.8 3.6-6.8.7 1.7 1.8 2.6 2.8 2.9.1-3-.4-5.7 1.3-8.3 2 2.5 4.3 5.6 4.3 9.3v2.9c0 3.2-2.3 5.8-6 5.8Z" /></svg>;
    case "cool":
      return <svg viewBox="0 0 24 24" aria-hidden="true" {...STROKE}><path d="M12 3v18M4.2 7.5l15.6 9M19.8 7.5l-15.6 9M9.6 4.7 12 6.5l2.4-1.8M9.6 19.3 12 17.5l2.4 1.8" /></svg>;
    case "heat_cool":
    case "auto":
      return <svg viewBox="0 0 24 24" aria-hidden="true" {...STROKE}><path d="M8 18V6m0 0L5 9m3-3 3 3M16 6v12m0 0-3-3m3 3 3-3" /></svg>;
    case "dry":
      return <svg viewBox="0 0 24 24" aria-hidden="true" {...STROKE}><path d="M12 3.5s6 6.3 6 10.3a6 6 0 0 1-12 0c0-4 6-10.3 6-10.3Z" /></svg>;
    case "fan_only":
      return <svg viewBox="0 0 24 24" aria-hidden="true" {...STROKE}><circle cx="12" cy="12" r="1.8" /><path d="M12 10.2c-.7-3.8.5-6.5 2.9-6.5s2.1 4.1-2.9 6.5ZM13.8 13.1c3.6 1.4 5.3 4 4.1 6s-4.6.2-4.1-6ZM10.2 13.1c-3 2.4-5.9 2.8-7.1.7s2.3-3.7 7.1-.7Z" /></svg>;
    default:
      return <svg viewBox="0 0 24 24" aria-hidden="true" {...STROKE}><path d="M12 3v8M7.5 6.5a7 7 0 1 0 9 0" /></svg>;
  }
}

/** Solid mode geometry for the segment-style screen pictogram. */
export function ModeShape({ mode }: { mode: HvacMode }) {
  switch (mode) {
    case "heat":
      return <path d="M10 25c-5 0-8-3.6-8-8 0-4.3 2.9-6.7 4.9-9.4 1 2.4 2.4 3.6 3.8 4.1.1-4.2-.6-7.9 1.8-11.7 2.7 3.5 5.8 7.8 5.8 12.9V17c0 4.4-3.2 8-8.3 8Z" />;
    case "cool":
      return <path d="M9 1h2v8.2l5.9-3.4 1 1.8-5.9 3.4 5.9 3.4-1 1.8-5.9-3.4V21H9v-8.2l-5.9 3.4-1-1.8L8 11 2.1 7.6l1-1.8L9 9.2V1Zm-2.8 0 3.8 2.2L13.8 1l1 1.7L11 4.9v4.3L14.8 11l-1 1.7-3.8-2.2-3.8 2.2-1-1.7L9 9.2V4.9L5.2 2.7l1-1.7Z" />;
    case "heat_cool":
    case "auto":
      return <path d="M4 2h3v15l3-3 2 2-6.5 6.5L-1 16l2-2 3 3V2Zm9 22h3V9l3 3 2-2-6.5-6.5L8 10l2 2 3-3v15Z" />;
    case "dry":
      return <path d="M10 1S2.5 9.6 2.5 16a7.5 7.5 0 0 0 15 0C17.5 9.6 10 1 10 1Zm0 21a5 5 0 0 1-5-5h2a3 3 0 0 0 3 3v2Z" />;
    case "fan_only":
      return <path d="M10 10.5C7.8 6.4 8.3 1 12 1c3.2 0 4 4.6-.7 9.8 4.7-1.3 9.4.9 7.6 4.1-1.6 2.8-6 1.1-8.9-3.5-1.2 4.8-5.4 8-7.2 4.8-1.6-2.8 2-5.7 7.2-5.7ZM10 8.8a2.2 2.2 0 1 0 0 4.4 2.2 2.2 0 0 0 0-4.4Z" fillRule="evenodd" />;
    default:
      return <path d="M8.5 1h3v11h-3V1ZM4.8 4.5l2 2A7 7 0 1 0 13.2 6.5l2-2A10 10 0 1 1 4.8 4.5Z" />;
  }
}
