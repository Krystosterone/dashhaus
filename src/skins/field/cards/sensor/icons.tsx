/** A thermometer, on the module's glyph plate: the sensor's domain glyph. */
export function IconThermo() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 14.2V5a2 2 0 1 1 4 0v9.2a4 4 0 1 1-4 0Z" />
      <path d="M12 10.5v6" />
    </svg>
  );
}

/** The thermometer as a solid shape, for the screen's pictogram (20 x 26): its bulb fills first. */
export const THERMO = <path d="M7 4a3 3 0 0 1 6 0v11.1A5.5 5.5 0 1 1 7 15.1Z" />;

/** A drop, for humidity's pictogram on the panel's screen (20 x 26). */
export const DROP = <path d="M10 2.5c3.6 5 6.5 8.5 6.5 13a6.5 6.5 0 0 1-13 0c0-4.5 2.9-8 6.5-13Z" />;
