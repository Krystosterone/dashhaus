import type { ReactNode } from "react";
import type { BinarySensorPicture } from "@dashhaus/core/entities/binarySensor/words";

const STROKE = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round" } as const;

/**
 * The binary sensor's glyph, on its flat plate (24 x 24, stroked): the picture its device class names (`pictureOf`),
 * so a column tells a door from a leak sensor. It stays one shape whatever the state: the screen says the state.
 */
export function IconBinarySensor({ picture }: { picture: BinarySensorPicture }) {
  return <svg viewBox="0 0 24 24" {...STROKE}>{GLYPH[picture]}</svg>;
}

const GLYPH: Record<BinarySensorPicture, ReactNode> = {
  door: <><path d="M6 20.5V4h12v16.5M4 20.5h16" /><path d="M14.6 12.5h.01" /></>,
  window: <><path d="M5 4h14v16.5H5z" /><path d="M12 4v16.5M5 12.2h14" /></>,
  leak: <path d="M12 3.8c3.4 4.1 5.4 7.2 5.4 9.8a5.4 5.4 0 0 1-10.8 0c0-2.6 2-5.7 5.4-9.8Z" />,
  smoke: <><path d="M4 5h16" /><path d="M6.6 5a5.4 4.2 0 0 0 10.8 0" /><path d="M8.5 14c-1 1.4 1 2.4 0 3.9M12 14c-1 1.4 1 2.4 0 3.9M15.5 14c-1 1.4 1 2.4 0 3.9" /></>,
  motion: <><circle cx="12" cy="12" r="1.9" /><path d="M8.5 8.5a5 5 0 0 0 0 7M15.5 8.5a5 5 0 0 1 0 7M5.4 5.4a9.3 9.3 0 0 0 0 13.2M18.6 5.4a9.3 9.3 0 0 1 0 13.2" /></>,
  sensor: <><circle cx="12" cy="12" r="7.5" /><circle cx="12" cy="12" r="2.6" /></>,
};

/**
 * The picture as a solid shape for the screen's pictogram (20 x 26), lit while on (open, wet, detecting), in the
 * figure's ink, unlit while off.
 */
export const BINARY_SENSOR_PICT: Record<BinarySensorPicture, ReactNode> = {
  door: <path d="M3 24V3.5A1.5 1.5 0 0 1 4.5 2h11A1.5 1.5 0 0 1 17 3.5V24Zm10.2-11.4a1.2 1.2 0 1 0 0 .01Z" fillRule="evenodd" />,
  window: <path d="M2 3.5A1.5 1.5 0 0 1 3.5 2h13A1.5 1.5 0 0 1 18 3.5v19a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 2 22.5ZM4.5 4.5v7.3h4.3V4.5Zm6.7 0v7.3h4.3V4.5ZM4.5 14.2v7.3h4.3v-7.3Zm6.7 0v7.3h4.3v-7.3Z" fillRule="evenodd" />,
  leak: <path d="M10 2.5c4.4 5.3 7 9.4 7 12.8a7 7 0 0 1-14 0c0-3.4 2.6-7.5 7-12.8Z" />,
  smoke: <path d="M1.5 3h17v2.2h-1.8a6.7 5.2 0 0 1-13.4 0H1.5ZM5 15.5h2.4v8.5H5Zm3.8-1.5h2.4v10H8.8Zm3.8 1.5H15v8.5h-2.4Z" />,
  motion: <path d="M10 10.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5ZM4.3 6.6l1.7 1.7a6.5 6.5 0 0 0 0 9.4l-1.7 1.7a8.9 8.9 0 0 1 0-12.8Zm11.4 0a8.9 8.9 0 0 1 0 12.8L14 17.7a6.5 6.5 0 0 0 0-9.4Z" />,
  sensor: <path d="M10 5a8 8 0 1 1 0 16 8 8 0 0 1 0-16Zm0 4.8a3.2 3.2 0 1 0 0 6.4 3.2 3.2 0 0 0 0-6.4Z" fillRule="evenodd" />,
};
