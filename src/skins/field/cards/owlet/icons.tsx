/**
 * The sock, on the module's glyph plate: a cuff, the leg, and the foot turning forward, as on orb's card. Drawn on
 * orb's 20 px grid, scaled and centred on field's 24 px one.
 */
export function IconSock() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <g transform="translate(-1.9 0.3) scale(1.2)" strokeWidth="1.5">
        <path d="M7 2.5h5.2v7.4l3 2.9a2.5 2.5 0 0 1-3.5 3.6L7.9 12.7A3 3 0 0 1 7 10.6Z" />
        <path d="M7 5.3h5.2" />
      </g>
    </svg>
  );
}

/** A heart, for the heart rate's pictogram on the screen (20 x 26): lit while readings arrive. */
export const HEART = <path d="M10 22S1.5 16.6 1.5 10.4A4.4 4.4 0 0 1 10 8a4.4 4.4 0 0 1 8.5 2.4C18.5 16.6 10 22 10 22Z" />;

/** The base station, on its key in the panel: a dome on its stand, the light on top. */
export function IconBase() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 18.5h16" />
      <path d="M6 18.5a6 6 0 0 1 12 0" />
      <path d="M12 8.5V6" />
    </svg>
  );
}

/** Oxygen, for an oxygen alarm's pictogram on the screen (20 x 26): an O with a small 2, so a drop keeps meaning humidity. */
export const O2 = <path fillRule="evenodd" d="M8 3.5a7.5 7.5 0 1 1 0 15 7.5 7.5 0 0 1 0-15Zm0 3.6a3.9 3.9 0 1 0 0 7.8 3.9 3.9 0 0 0 0-7.8ZM13.5 20.5h6v2h-3.4l3.4 2v1h-6v-2h3.4l-3.4-2Z" />;
