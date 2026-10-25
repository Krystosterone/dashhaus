import type { Sky } from "../domains/weather/conditions";
import type { ReactElement } from "react";
import type { ToggleIcon } from "../domains/toggle/types";

/* Glass icons: 24-unit strokes in currentColor, decorative (a name or a label always carries the meaning). */
const P = { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true } as const;

export const IconPower = () => <svg {...P} strokeWidth={2}><path d="M12 3.5v8" /><path d="M7.1 6.6a7 7 0 1 0 9.8 0" /></svg>;
export const IconMinus = () => <svg {...P} strokeWidth={2}><path d="M6 12h12" /></svg>;
export const IconPlus = () => <svg {...P} strokeWidth={2}><path d="M6 12h12M12 6v12" /></svg>;

/* ---------- Devices ---------- */
export const IconAirConditioner = () => <svg {...P}><rect x="3" y="5" width="18" height="8" rx="2" /><path d="M7 10h10" /><path d="M8 16.5c0 1.2-1 1.6-1 2.8M12 16.5c0 1.2-1 1.6-1 2.8M16 16.5c0 1.2-1 1.6-1 2.8" /></svg>;
export const IconBulb = () => <svg {...P}><path d="M9 17.5h6M10 20.5h4" /><path d="M8.2 14.2A6 6 0 1 1 15.8 14.2c-.7.6-.8 1.3-.8 2.3H9c0-1-.1-1.7-.8-2.3Z" /></svg>;

/* ---------- Climate controls ---------- */
export const IconMode = () => <svg {...P}><path d="M10 13.6V5a2 2 0 1 1 4 0v8.6a4 4 0 1 1-4 0Z" /><path d="M12 10.5v5" /></svg>;
export const IconFan = () => <svg {...P}><circle cx="12" cy="12" r="1.6" /><path d="M12 10.4c-.8-3.9.5-6.4 2.9-6.4s2.2 4-2.9 6.4ZM13.6 12.8c3.6 1.4 5.3 3.9 4.1 6s-4.6.1-4.1-6ZM10.4 12.8c-3 2.4-5.8 2.8-7 .7s2.3-3.7 7-.7Z" /></svg>;
export const IconPreset = () => <svg {...P}><path d="M5 19c0-8 5-13 14-14-.5 9-5.5 14-14 14Z" /><path d="M5 19l7-7" /></svg>;

/* ---------- Weather ---------- */
export const IconDrop = () => <svg {...P}><path d="M12 3.5s6 6.2 6 10.2a6 6 0 0 1-12 0c0-4 6-10.2 6-10.2Z" /></svg>;
export const IconWind = () => <svg {...P}><path d="M3 9h11a3 3 0 1 0-3-3M3 15h15a3 3 0 1 1-3 3M3 12h7" /></svg>;

const CLOUD = "M7.5 19h9.5a4 4 0 0 0 .5-8 5.5 5.5 0 0 0-10.6 1.4A3.3 3.3 0 0 0 7.5 19Z";
const SKY_ICON: Record<Sky, ReactElement> = {
  clear: <><circle cx="12" cy="12" r="4" /><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4" /></>,
  partly: <><path d="M9 3v1.3M3.5 8.5h1.3M5.1 4.6l.9.9M13 4.6l-.9.9" /><path d="M6.2 10.6a3.5 3.5 0 0 1 6.3-2.9" /><path d={CLOUD} /></>,
  cloudy: <path d={CLOUD} />,
  fog: <><path d="M7.5 14h9.5a4 4 0 0 0 .5-8 5.5 5.5 0 0 0-10.6 1.4A3.3 3.3 0 0 0 7.5 14Z" /><path d="M4 17.5h16M6 21h12" /></>,
  rain: <><path d="M7.5 15h9.5a4 4 0 0 0 .5-8 5.5 5.5 0 0 0-10.6 1.4A3.3 3.3 0 0 0 7.5 15Z" /><path d="M8.5 18l-1 2.5M12.5 18l-1 2.5M16.5 18l-1 2.5" /></>,
  snow: <><path d="M7.5 15h9.5a4 4 0 0 0 .5-8 5.5 5.5 0 0 0-10.6 1.4A3.3 3.3 0 0 0 7.5 15Z" /><path d="M8 19h.01M12 20.5h.01M16 19h.01" strokeWidth={2.4} /></>,
  storm: <><path d="M7.5 15h9.5a4 4 0 0 0 .5-8 5.5 5.5 0 0 0-10.6 1.4A3.3 3.3 0 0 0 7.5 15Z" /><path d="M12.5 15l-2 3.5h3l-2 3.5" /></>,
  wind: <path d="M3 9h11a3 3 0 1 0-3-3M3 15h15a3 3 0 1 1-3 3M3 12h7" />,
};
const MOON = <path d="M19 14.5A7.5 7.5 0 0 1 9.5 5a7.5 7.5 0 1 0 9.5 9.5Z" />;

/** A condition's sky: the moon stands in for the sun on a clear night. */
export function SkyIcon({ sky, night }: { sky: Sky; night?: boolean }) {
  return <svg {...P}>{sky === "clear" && night ? MOON : SKY_ICON[sky]}</svg>;
}

/* ---------- Toggles: the host's icon names, drawn the glass way ---------- */
const TOGGLE_ICON: Record<ToggleIcon, ReactElement> = {
  power: <><path d="M12 3.5v8" /><path d="M7.1 6.6a7 7 0 1 0 9.8 0" /></>,
  moon: MOON,
  "bell-off": <><path d="M9.5 19.5a2.5 2.5 0 0 0 5 0" /><path d="M6.5 9a5.5 5.5 0 0 1 9.3-4M18 10.5c0 4 1.5 5.5 2 6H6" /><path d="M3.5 3.5l17 17" /></>,
  "volume-off": <><path d="M6.5 9.5h-2a1 1 0 0 0-1 1v3a1 1 0 0 0 1 1h2l4.5 4v-13Z" /><path d="M15.5 9.5l5 5M20.5 9.5l-5 5" /></>,
  guest: <><circle cx="12" cy="8" r="3.5" /><path d="M5 20a7 7 0 0 1 14 0" /></>,
  away: <><path d="M4 11l8-6.5 8 6.5" /><path d="M6.5 9.5V19h11V9.5" /><path d="M14 15h-4M11.5 13l-2 2 2 2" /></>,
  waves: <path d="M3 9c2-1.5 4-1.5 6 0s4 1.5 6 0 4-1.5 6 0M3 15c2-1.5 4-1.5 6 0s4 1.5 6 0 4-1.5 6 0" />,
};

export function ToggleGlyph({ icon = "power" }: { icon?: ToggleIcon }) {
  return <svg {...P}>{TOGGLE_ICON[icon]}</svg>;
}
