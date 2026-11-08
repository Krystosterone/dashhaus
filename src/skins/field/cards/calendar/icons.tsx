const STROKE = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round" } as const;

/** The calendar's glyph, on its flat plate (24 x 24, stroked): a page with its two rings and a day marked. */
export function IconCalendar() {
  return (
    <svg viewBox="0 0 24 24" {...STROKE}>
      <rect x="4" y="5.5" width="16" height="14.5" rx="2.5" />
      <path d="M4 10h16M8.5 3.5v4M15.5 3.5v4" />
      <path d="M8 14h3" />
    </svg>
  );
}

/**
 * The page as a solid shape for the screen's pictogram (20 x 26), its day cut out: lit while an event is under way,
 * in the figure's ink, unlit otherwise.
 */
export const CALENDAR_PICT = (
  <path
    d="M5 3h2v2.5h6V3h2v2.5h1.5A1.5 1.5 0 0 1 18 7v15.5a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 2 22.5V7a1.5 1.5 0 0 1 1.5-1.5H5Zm-.5 7.5v11h11v-11Zm2 2.5h3.5v3H6.5Z"
    fillRule="evenodd"
  />
);
