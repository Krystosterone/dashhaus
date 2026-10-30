import type { ReactNode } from "react";
import type { ToggleIcon } from "@dashhaus/core/entities/toggle/types";

/*
 * A mode's glyph, on its key (20 x 20, stroked): the mode's own, so the key names the row. Power when the mode
 * has none.
 */
const GLYPHS: Record<ToggleIcon, ReactNode> = {
  "bell-off": <><path d="M6.2 6.6A3.9 3.9 0 0 1 13.8 8v2.9l1.4 2.3H6.5" /><path d="M5.9 9.2v1.7l-1.4 2.3" /><path d="M8.4 15.6a1.7 1.7 0 0 0 3.2 0" /><path d="M3.5 3.5l13 13" /></>,
  moon: <path d="M15.2 12.6A6 6 0 0 1 7.4 4.8a6 6 0 1 0 7.8 7.8Z" />,
  "volume-off": <><path d="M3.8 8h2.7l3.6-3v10l-3.6-3H3.8Z" /><path d="M13 8l4 4M17 8l-4 4" /></>,
  guest: <><circle cx="8" cy="7" r="2.6" /><path d="M3.4 15.5a4.6 4.6 0 0 1 9.2 0" /><path d="M13.2 5.2a2.4 2.4 0 0 1 0 4.4M14.6 11.6a4.2 4.2 0 0 1 2 3.9" /></>,
  away: <><rect x="3.5" y="7" width="13" height="8.5" rx="2" /><path d="M7.5 7V5.6a1.4 1.4 0 0 1 1.4-1.4h2.2a1.4 1.4 0 0 1 1.4 1.4V7M3.5 11h13" /></>,
  power: <><path d="M10 3.5v6" /><path d="M6.3 6.2a5.4 5.4 0 1 0 7.4 0" /></>,
  waves: <><path d="M3 7.5c1.2-1.3 2.3-1.3 3.5 0s2.3 1.3 3.5 0 2.3-1.3 3.5 0 2.3 1.3 3.5 0" /><path d="M3 12.5c1.2-1.3 2.3-1.3 3.5 0s2.3 1.3 3.5 0 2.3-1.3 3.5 0 2.3 1.3 3.5 0" /></>,
};

export function IconMode({ icon = "power" }: { icon?: ToggleIcon }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      {GLYPHS[icon]}
    </svg>
  );
}

/*
 * The mode as solid shapes for the screen's pictogram (20 x 26), drawn lit in full while it is on. A line through
 * a shape is cut out of it (even-odd), the way a segment display leaves a gap.
 */

const p = (x: number, y: number) => `${x.toFixed(2)} ${y.toFixed(2)}`;

/** A bar from (x0, y0) to (x1, y1), `w` wide, as a closed subpath. */
function bar(x0: number, y0: number, x1: number, y1: number, w: number) {
  const len = Math.hypot(x1 - x0, y1 - y0);
  const nx = (-(y1 - y0) / len) * (w / 2), ny = ((x1 - x0) / len) * (w / 2);
  return `M${p(x0 + nx, y0 + ny)}L${p(x1 + nx, y1 + ny)}L${p(x1 - nx, y1 - ny)}L${p(x0 - nx, y0 - ny)}Z`;
}

/** A wave across the screen, `w` thick, its middle at `y`. */
function wave(y: number, w: number) {
  const xs = Array.from({ length: 33 }, (_, i) => 2 + i * 0.5);
  const at = (x: number) => y + 1.4 * Math.sin(((x - 2) / 7) * 2 * Math.PI);
  const top = xs.map((x) => p(x, at(x) - w / 2));
  const bottom = xs.reverse().map((x) => p(x, at(x) + w / 2));
  return `M${top.join("L")}L${bottom.join("L")}Z`;
}

const BELL = "M10 4a1.3 1.3 0 0 1 1.3 1.3v.5A5.2 5.2 0 0 1 15.2 11v3.6l1.6 2.6H3.2l1.6-2.6V11a5.2 5.2 0 0 1 3.9-5.2v-.5A1.3 1.3 0 0 1 10 4ZM7.9 18.6h4.2a2.1 2.1 0 0 1-4.2 0Z";
/** A ring open at the top, around (10, 14), and its bar. */
const RING = "M14.02 8.27A7 7 0 1 1 5.98 8.27L7.02 9.74A5.2 5.2 0 1 0 12.98 9.74Z";

const PICTS: Record<ToggleIcon, ReactNode> = {
  "bell-off": <path fillRule="evenodd" d={BELL + bar(3.5, 4.5, 16.5, 21.5, 1.8)} />,
  moon: <path d="M9.22 6.55A6.5 6.5 0 1 0 16.45 13.78A5.2 5.2 0 0 1 9.22 6.55Z" />,
  "volume-off": <path d={"M2 10.5h3.5L10 6.5v13l-4.5-4H2Z" + bar(12.4, 10.9, 16.6, 15.1, 1.6) + bar(16.6, 10.9, 12.4, 15.1, 1.6)} />,
  guest: (
    <>
      <circle cx="8" cy="9" r="3.2" />
      <path d="M1.5 21.5a6.5 6.5 0 0 1 13 0Z" />
      <circle cx="15" cy="8.5" r="2.5" />
      <path d="M15.6 13.2a4.4 4.4 0 0 1 3.9 4.4V20h-3.2a8.2 8.2 0 0 0-2.6-6.1 4.4 4.4 0 0 1 1.9-.7Z" />
    </>
  ),
  away: <path d="M4.5 9h11a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-11a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2ZM7 9V6.8A1.8 1.8 0 0 1 8.8 5h2.4A1.8 1.8 0 0 1 13 6.8V9h-1.6V6.8a.2.2 0 0 0-.2-.2H8.8a.2.2 0 0 0-.2.2V9Z" />,
  power: <path d={RING + bar(10, 4.4, 10, 11.6, 1.8)} />,
  waves: <path d={wave(10, 1.8) + wave(16, 1.8)} />,
};

/** The mode's pictogram for the screen; power when the mode has no icon. */
export const modePict = (icon: ToggleIcon = "power") => PICTS[icon];

/** A clock, for when a mode switches itself off (20 x 26): its hands cut out of the face. */
export const CLOCK = <path fillRule="evenodd" d={"M10 6a7 7 0 1 0 0 14a7 7 0 1 0 0-14Z" + bar(10, 13.8, 10, 8.6, 1.6) + bar(10.8, 13, 13.8, 13, 1.6)} />;
