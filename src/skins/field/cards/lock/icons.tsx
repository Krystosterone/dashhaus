const STROKE = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round" } as const;

/**
 * The lock's domain glyph, on its key (24 x 24, stroked): a padlock, its shackle shut while locked or locking and
 * lifted while unlocked or open, so the key reads without its LED; a jam marks the body.
 */
export function IconLock({ open, alert }: { open: boolean; alert?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" {...STROKE}>
      <rect x="5.5" y="10.5" width="13" height="9.5" rx="2" />
      <path d={open ? "M8.5 10.5V7.4a3.5 3.5 0 0 1 6.9-.9" : "M8.5 10.5V7.8a3.5 3.5 0 0 1 7 0v2.7"} />
      <path d={alert ? "M12 13v3M12 18h.01" : "M12 14.2v2.2"} />
    </svg>
  );
}

/** A door ajar, for the panel's Open door key (24 x 24, stroked). */
export function IconDoor() {
  return <svg viewBox="0 0 24 24" {...STROKE}><path d="M6 20.5V4h12v16.5M4 20.5h16M6 4l7 2v14.5M10.8 12.5h.01" /></svg>;
}



/** A padlock, as a solid shape for the screen's pictogram (20 x 26): lit while locked, in the figure's ink. */
export const LOCK_PICT = <path d="M4.5 11V7.5a5.5 5.5 0 0 1 11 0V11h1.5a1.5 1.5 0 0 1 1.5 1.5v10A1.5 1.5 0 0 1 17 24H3a1.5 1.5 0 0 1-1.5-1.5v-10A1.5 1.5 0 0 1 3 11Zm2.6 0h5.8V7.5a2.9 2.9 0 0 0-5.8 0Z" />;
