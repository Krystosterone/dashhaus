import type { CameraState } from "@dashhaus/core/entities/camera/types";

const STROKE = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round" } as const;

/**
 * The camera's glyph, on its flat plate (24 x 24, stroked): a camera on its mount, so a column tells it from a sensor. It
 * says what the camera is doing without colour, as orb's icon does: a dot by the lens while it records, waves while it
 * streams.
 */
export function IconCamera({ state = "idle" }: { state?: CameraState }) {
  return (
    <svg viewBox="0 0 24 24" {...STROKE}>
      <rect x="3" y="6.5" width="13" height="9.5" rx="2" />
      <circle cx="9.5" cy="11.25" r="2.4" />
      <path d="M16 10l4-2.4v7.3L16 12.5" />
      <path d="M9.5 16v3.2M6.5 19.5h6" />
      {state === "recording" && <circle cx="5.9" cy="8.9" r="1" fill="currentColor" stroke="none" />}
      {state === "streaming" && <path d="M19.4 4.1a3.6 3.6 0 0 1 1.6 2.1M18.8 2.2a6 6 0 0 1 3.4 3" />}
    </svg>
  );
}

/** A camera on its mount as a solid shape, for the screen's pictogram (20 x 26), lit while it records or streams. */
export const CAMERA_PICT = <path d="M1 8.5A1.5 1.5 0 0 1 2.5 7h10A1.5 1.5 0 0 1 14 8.5v1.2l5-2.7v10l-5-2.7v1.2a1.5 1.5 0 0 1-1.5 1.5h-4v3.5h3V22H3.5v-1.5h3V17h-4A1.5 1.5 0 0 1 1 15.5Zm6.5 1.3a2.2 2.2 0 1 0 0 4.4 2.2 2.2 0 0 0 0-4.4Z" fillRule="evenodd" />;
