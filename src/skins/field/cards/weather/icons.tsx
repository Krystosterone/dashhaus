import type { ReactNode } from "react";
import type { Condition } from "@dashhaus/core/entities/weather/types";
import { SKY } from "@dashhaus/core/entities/weather/conditions";
import type { Sky } from "@dashhaus/core/entities/weather/conditions";

/** A sun behind a cloud, on the module's glyph plate: the weather's domain glyph, whatever the sky does. */
export function IconWeather() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8.5" cy="8.5" r="3" />
      <path d="M8.5 2.5v1.2M2.5 8.5h1.2M4.3 4.3l.9.9M12.7 4.3l-.9.9" />
      <path d="M9 19.5h8.5a3.5 3.5 0 0 0 .4-7 5 5 0 0 0-9.6 1.4A2.8 2.8 0 0 0 9 19.5Z" />
    </svg>
  );
}

/*
 * The sky as solid shapes for the screen's pictogram (20 x 26), one per kind of sky, drawn lit in full: the
 * condition, where a light's bulb shows its level.
 */

const CLOUD = "M6.2 15.5h8a3.2 3.2 0 0 0 .4-6.4 4.4 4.4 0 0 0-8.5 1.1 2.7 2.7 0 0 0 .1 5.3Z";
const MOON = "M9.22 6.55A6.5 6.5 0 1 0 16.45 13.78A5.2 5.2 0 0 1 9.22 6.55Z";

/** Rays around (cx, cy) as thin bars from radius `r` out by `len`, at the given angles (degrees, 0 = up). */
function rays(cx: number, cy: number, r: number, len: number, angles: number[], w = 1.6) {
  const p = (x: number, y: number) => `${x.toFixed(2)} ${y.toFixed(2)}`;
  return angles.map((deg) => {
    const a = (deg * Math.PI) / 180, dx = Math.sin(a), dy = -Math.cos(a);
    const nx = (-dy * w) / 2, ny = (dx * w) / 2;
    const [x0, y0, x1, y1] = [cx + dx * r, cy + dy * r, cx + dx * (r + len), cy + dy * (r + len)];
    return `M${p(x0 + nx, y0 + ny)}L${p(x1 + nx, y1 + ny)}L${p(x1 - nx, y1 - ny)}L${p(x0 - nx, y0 - ny)}Z`;
  }).join("");
}

const SUN = <><circle cx="10" cy="13" r="4" /><path d={rays(10, 13, 5.6, 2.6, [0, 45, 90, 135, 180, 225, 270, 315])} /></>;
const SMALL_SUN = <><circle cx="6.5" cy="7.5" r="2.8" /><path d={rays(6.5, 7.5, 4, 1.8, [0, 45, 270, 315, 225], 1.4)} /></>;
const SMALL_MOON = <path d={MOON} transform="translate(1.5 1) scale(0.5)" />;
/** A cloud high on the screen, leaving room for what falls from it. */
const HIGH_CLOUD = <path d={CLOUD} transform="translate(0 -0.5)" />;

const SKY_PICT: Record<Sky, ReactNode> = {
  clear: SUN,
  partly: <>{SMALL_SUN}<path d={CLOUD} transform="translate(1.5 6)" /></>,
  cloudy: <path d={CLOUD} transform="translate(0 3)" />,
  fog: <>{HIGH_CLOUD}<rect x="3" y="17.5" width="14" height="2" rx="1" /><rect x="5" y="21" width="10" height="2" rx="1" /></>,
  rain: <>{HIGH_CLOUD}{[6.5, 10, 13.5].map((x) => <rect key={x} x={x} y="17" width="1.8" height="5" rx="0.9" transform={`rotate(20 ${x + 0.9} 19.5)`} />)}</>,
  snow: <>{HIGH_CLOUD}<circle cx="6.8" cy="18.8" r="1.3" /><circle cx="10" cy="21.8" r="1.3" /><circle cx="13.2" cy="18.8" r="1.3" /></>,
  storm: <>{HIGH_CLOUD}<path d="M11 16.2 7.8 20.8h2.5l-1.3 4.2 4.3-5.8h-2.6l1.4-3Z" /></>,
  wind: <><rect x="2" y="8" width="11" height="2" rx="1" /><rect x="2" y="12.5" width="16" height="2" rx="1" /><rect x="2" y="17" width="8" height="2" rx="1" /></>,
};

/** A condition's pictogram, a moon where the sun would be by night; a cloud for no reading, drawn unlit. */
export function conditionPict(condition: Condition | null, night = false): ReactNode {
  if (!condition) return <path d={CLOUD} transform="translate(0 3)" />;
  const sky = SKY[condition];
  const dark = night || condition === "clear-night";
  if (dark && sky === "clear") return <path d={MOON} />;
  if (dark && sky === "partly") return <>{SMALL_MOON}<path d={CLOUD} transform="translate(1.5 6)" /></>;
  return SKY_PICT[sky];
}
