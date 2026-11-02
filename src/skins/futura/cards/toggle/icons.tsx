import type { ToggleIcon } from "@dashhaus/core/entities/toggle/types";

const PATHS: Record<ToggleIcon, string> = {
  power: "M12 3.5v8M7.2 6.6a7 7 0 1 0 9.6 0",
  moon: "M18.5 14.5A7.5 7.5 0 0 1 9.5 5.5a7.5 7.5 0 1 0 9 9Z",
  "bell-off": "M9.5 19.5a2.5 2.5 0 0 0 5 0M6.5 15.5c1-1.2 1.5-2.5 1.5-4.5V10a4 4 0 0 1 6.8-2.9M16 10.5v.5c0 2 .5 3.3 1.5 4.5h-11M4 4l16 16",
  "volume-off": "M4.5 9.5h3l4-3.5v12l-4-3.5h-3ZM15.5 9.5l5 5M20.5 9.5l-5 5",
  guest: "M12 11.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM5.5 19.5c.8-3.3 3.3-5 6.5-5s5.7 1.7 6.5 5",
  away: "M13.5 4.5h5v15h-5M10 8.5l-4 3.5 4 3.5M6 12h10",
  waves: "M3.5 9c2.8-2 5.7 2 8.5 0s5.7-2 8.5 0M3.5 15c2.8-2 5.7 2 8.5 0s5.7-2 8.5 0",
};

/** The toggle's own glyph from its entity's icon; a power symbol when it names none. */
export function IconToggle({ icon = "power" }: { icon?: ToggleIcon }) {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d={PATHS[icon] ?? PATHS.power} /></svg>;
}
