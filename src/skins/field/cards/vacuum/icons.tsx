const STROKE = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round" } as const;

/**
 * The vacuum's domain glyph, on its key (24 x 24, stroked): a robot vacuum from above, its round body, the bumper's
 * seam across the front and the button at its middle. The key prints what a press does; the glyph names it.
 */
export function IconVacuum() {
  return (
    <svg viewBox="0 0 24 24" {...STROKE}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M4.8 7.5h14.4" />
      <circle cx="12" cy="13.4" r="2.2" />
    </svg>
  );
}

/** Home, for the Return key (24 x 24, stroked): it goes back to its dock, as Home Assistant's return home says. */
export function IconDock() {
  return <svg viewBox="0 0 24 24" {...STROKE}><path d="M4 11.5 12 4.5l8 7M6.5 9.5V19.5h11V9.5M10 19.5v-5h4v5" /></svg>;
}

/** A sound going out, for the Locate key (24 x 24, stroked): it plays a sound to be found. */
export function IconLocate() {
  return <svg viewBox="0 0 24 24" {...STROKE}><circle cx="12" cy="12" r="2" /><path d="M8 8a5.7 5.7 0 0 0 0 8M16 8a5.7 5.7 0 0 1 0 8M5.2 5.2a9.6 9.6 0 0 0 0 13.6M18.8 5.2a9.6 9.6 0 0 1 0 13.6" /></svg>;
}

/** The vacuum as a solid shape for the screen's pictogram (20 x 26): its round body and its button, lit while it cleans. */
export const VACUUM_PICT = <path d="M10 6.5a8.5 8.5 0 1 1 0 17 8.5 8.5 0 0 1 0-17Zm0 6.4a2.6 2.6 0 1 0 0 5.2 2.6 2.6 0 0 0 0-5.2Z" fillRule="evenodd" />;
