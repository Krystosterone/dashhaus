import type { ReactNode } from "react";
import type { BinarySensorPicture } from "@dashhaus/core/entities/binarySensor/words";

/**
 * The domain icon, every compact row's identity (row-identity skill): the picture its device class names
 * (`pictureOf`), so a column tells a door from a leak sensor. Each says its state without colour: a door ajar, a
 * window's sash out, a puddle under the drop, smoke under the detector, waves out from the motion sensor, the plain
 * sensor's centre filled.
 */
export function BinarySensorIcon({ picture, on = false }: { picture: BinarySensorPicture; on?: boolean }) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" fill="none" stroke="currentColor">
      {PATHS[picture](on)}
    </svg>
  );
}

const PATHS: Record<BinarySensorPicture, (on: boolean) => ReactNode> = {
  door: (on) => on
    ? <><path d="M5 17V3.5h10V17M3.5 17h13" /><path d="M5 3.5l6 1.6V17" /><path d="M9.2 10.5h.01" /></>
    : <><path d="M5 17V3.5h10V17M3.5 17h13" /><path d="M12.2 10.5h.01" /></>,
  window: (on) => on
    ? <><path d="M4 3.5h12v13H4z" /><path d="M10 3.5v13" /><path d="M10 3.5l4.5 2.5v12.5L10 16.5" /></>
    : <><path d="M4 3.5h12v13H4z" /><path d="M10 3.5v13M4 10h12" /></>,
  leak: (on) => on
    ? <><path d="M10 2.8c2.2 2.7 3.6 4.7 3.6 6.5a3.6 3.6 0 0 1-7.2 0c0-1.8 1.4-3.8 3.6-6.5Z" /><path d="M3 16.5c1.2-.9 2.3-.9 3.5 0s2.3.9 3.5 0 2.3-.9 3.5 0 2.3.9 3.5 0" /></>
    : <path d="M10 3.5c2.8 3.4 4.5 6 4.5 8.2a4.5 4.5 0 0 1-9 0c0-2.2 1.7-4.8 4.5-8.2Z" />,
  smoke: (on) => <>
    <path d="M3.5 4.5h13" /><path d="M5.5 4.5a4.5 3.6 0 0 0 9 0" /><path d="M10 6.2h.01" />
    {on && <path d="M7 11c-.9 1.2.9 2.1 0 3.4M10 11c-.9 1.2.9 2.1 0 3.4M13 11c-.9 1.2.9 2.1 0 3.4" />}
  </>,
  motion: (on) => <>
    <circle cx="10" cy="10" r="1.6" />
    <path d="M7 7a4.2 4.2 0 0 0 0 6M13 7a4.2 4.2 0 0 1 0 6" />
    {on && <path d="M4.5 4.5a7.8 7.8 0 0 0 0 11M15.5 4.5a7.8 7.8 0 0 1 0 11" />}
  </>,
  sensor: (on) => <>
    <circle cx="10" cy="10" r="6.5" />
    <circle cx="10" cy="10" r="2.5" fill={on ? "currentColor" : "none"} />
  </>,
};
