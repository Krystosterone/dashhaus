import type { ToggleIcon } from "./types";


const P = { fill: "none", stroke: "currentColor" } as const;
const PATHS: Record<ToggleIcon, JSX.Element> = {
  "bell-off": <><path d="M6.2 6.6A3.9 3.9 0 0 1 13.8 8v2.9l1.4 2.3H6.5" /><path d="M5.9 9.2v1.7l-1.4 2.3" /><path d="M8.4 15.6a1.7 1.7 0 0 0 3.2 0" /><path d="M3.5 3.5l13 13" /></>,
  moon: <path d="M15.2 12.6A6 6 0 0 1 7.4 4.8a6 6 0 1 0 7.8 7.8Z" />,
  "volume-off": <><path d="M3.8 8h2.7l3.6-3v10l-3.6-3H3.8Z" /><path d="M13 8l4 4M17 8l-4 4" /></>,
  guest: <><circle cx="8" cy="7" r="2.6" /><path d="M3.4 15.5a4.6 4.6 0 0 1 9.2 0" /><path d="M13.2 5.2a2.4 2.4 0 0 1 0 4.4M14.6 11.6a4.2 4.2 0 0 1 2 3.9" /></>,
  away: <><rect x="3.5" y="7" width="13" height="8.5" rx="2" /><path d="M7.5 7V5.6a1.4 1.4 0 0 1 1.4-1.4h2.2a1.4 1.4 0 0 1 1.4 1.4V7M3.5 11h13" /></>,
  power: <><path d="M10 3.5v6" /><path d="M6.3 6.2a5.4 5.4 0 1 0 7.4 0" /></>,
  waves: <><path d="M3 7.5c1.2-1.3 2.3-1.3 3.5 0s2.3 1.3 3.5 0 2.3-1.3 3.5 0 2.3 1.3 3.5 0" /><path d="M3 12.5c1.2-1.3 2.3-1.3 3.5 0s2.3 1.3 3.5 0 2.3-1.3 3.5 0 2.3 1.3 3.5 0" /></>,
};

export function ToggleIconSvg({ icon = "power" }: { icon?: ToggleIcon }) {
  return <svg viewBox="0 0 20 20" aria-hidden="true" {...P}>{PATHS[icon]}</svg>;
}
