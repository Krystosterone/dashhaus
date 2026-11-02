import type { HvacMode } from "@dashhaus/core/entities/climate/types";

/** A thermostat face: the mode-free glyph, for off and auto. */
export function IconClimate() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 4.5a2 2 0 0 1 4 0v9.2a4 4 0 1 1-4 0Z" /><path d="M12 10v6" /></svg>;
}

/** Heat: a flame. */
export function IconHeat() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3c.5 3 4.5 5 4.5 9.5a4.5 4.5 0 0 1-9 0c0-2 1-3.5 2-4.5.3 1.5 1 2.3 2 2.5-.6-2.6-.2-5 .5-7.5Z" /></svg>;
}

/** Cool: a six-armed snowflake. */
export function IconCool() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9M9.5 4.5 12 6l2.5-1.5M9.5 19.5 12 18l2.5 1.5" /></svg>;
}

/** Dry: a drop. */
export function IconDry() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.5c3 4 5.5 7 5.5 10a5.5 5.5 0 0 1-11 0c0-3 2.5-6 5.5-10Z" /></svg>;
}

/** Fan: three blades round a hub. */
export function IconFan() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="1.6" /><path d="M12 10.4c-1-3.4 0-6.4 2.6-6.4 2 0 2.4 2.6.4 4.4M13.4 12.8c3.4.9 5.4 3.3 4.1 5.5-1 1.7-3.4.8-4-1.8M10.6 12.8c-2.5 2.5-5.6 3-6.9.8-1-1.7 1-3.4 3.6-2.6" /></svg>;
}

export function IconMode({ mode }: { mode: HvacMode | "unavailable" }) {
  if (mode === "heat") return <IconHeat />;
  if (mode === "cool") return <IconCool />;
  if (mode === "dry") return <IconDry />;
  if (mode === "fan_only") return <IconFan />;
  return <IconClimate />;
}
