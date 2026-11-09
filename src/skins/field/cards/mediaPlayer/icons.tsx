const STROKE = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round" } as const;

/**
 * The media player's domain glyph, on its key (24 x 24, stroked): a player's face with the play mark, as orb's, whatever
 * it plays through. The key prints what a press does; the glyph names it.
 */
export function IconMediaPlayer() {
  return (
    <svg viewBox="0 0 24 24" {...STROKE}>
      <rect x="3.5" y="5" width="17" height="14" rx="3.5" />
      <path d="M10.3 9.1v5.8l4.8-2.9Z" />
    </svg>
  );
}

/** Skip back, for the Previous key (24 x 24, stroked). */
export function IconPrevious() {
  return <svg viewBox="0 0 24 24" {...STROKE}><path d="M6.5 6v12M18 6.5v11l-8.5-5.5Z" /></svg>;
}

/** Skip on, for the Next key (24 x 24, stroked). */
export function IconNext() {
  return <svg viewBox="0 0 24 24" {...STROKE}><path d="M17.5 6v12M6 6.5v11l8.5-5.5Z" /></svg>;
}

/** A speaker struck through, for the Mute key (24 x 24, stroked). */
export function IconMute() {
  return <svg viewBox="0 0 24 24" {...STROKE}><path d="M4.5 9.5h3.2L12 6v12l-4.3-3.5H4.5Z" /><path d="M15.5 9.5l5 5M20.5 9.5l-5 5" /></svg>;
}

/** Power, for the Power key (24 x 24, stroked). */
export function IconPower() {
  return <svg viewBox="0 0 24 24" {...STROKE}><path d="M12 4v7.5" /><path d="M7.4 7.2a7 7 0 1 0 9.2 0" /></svg>;
}

/**
 * A box with an arrow leaving its corner, for the key to Home Assistant's own player (24 x 24, stroked): it leaves the
 * skin's look, as the nav's arrow marks a key that leaves the dashboard.
 */
export function IconOpenOut() {
  return <svg viewBox="0 0 24 24" {...STROKE}><path d="M10.5 5.5H7.5a2.5 2.5 0 0 0-2.5 2.5v8.5a2.5 2.5 0 0 0 2.5 2.5H16a2.5 2.5 0 0 0 2.5-2.5v-3" /><path d="M14 4.5h5.5V10M19.5 4.5 11.5 12.5" /></svg>;
}

/** The player as a solid shape for the screen's pictogram (20 x 26): its face with the play mark cut out, lit while it plays. */
export const MEDIA_PLAYER_PICT = <path d="M4 6.5h12a3 3 0 0 1 3 3v8a3 3 0 0 1-3 3H4a3 3 0 0 1-3-3v-8a3 3 0 0 1 3-3Zm4 4.2v5.6l4.7-2.8Z" fillRule="evenodd" />;
