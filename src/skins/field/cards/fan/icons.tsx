/** One blade from the hub at (12, 12), pointing up; the glyph turns it three times. One blade up and two down puts
 *  the shape's box 0.9 above the hub, so the glyph moves down by that much to sit centred on its key. */
const BLADE = "M11.9 10C9.2 9.2 7.6 5.7 9.2 3.5a3.5 3.5 0 0 1 5.5.2c1.6 2.4-.1 5.3-1.9 6.3";

/** A fan, drawn on the power key: three blades round a hub, the fan's domain glyph and its switch in one. */
export function IconFan() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <g transform="translate(0 0.9)">
        {[0, 120, 240].map((turn) => <path key={turn} d={BLADE} transform={`rotate(${turn} 12 12)`} />)}
        <circle cx="12" cy="12" r="2" />
      </g>
    </svg>
  );
}

/** Oscillation, on its latching key: an arc swept both ways. */
export function IconSweep() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 14a8 8 0 0 1 14 0" />
      <path d="M4 10.5 5 14l3.5-1M20 10.5 19 14l-3.5-1" />
      <circle cx="12" cy="15.5" r="1.5" />
    </svg>
  );
}

/** Which way the blades turn: forward clockwise, reverse anticlockwise, seen from below. */
export function IconTurn({ direction }: { direction: "forward" | "reverse" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <g transform={direction === "reverse" ? "matrix(-1 0 0 1 24 0)" : undefined}>
        <path d="M18.5 9A7 7 0 1 0 19 13" />
        <path d="M19 4.5V9h-4.5" />
      </g>
    </svg>
  );
}

/** The fan as a solid shape, for the screen's pictogram (20 x 26), filled from the bottom with its speed. */
export const FAN_PICT = (
  <g transform="translate(0 0.8)">
    {[0, 120, 240].map((turn) => (
      <path key={turn} d="M10 11.6C7.7 10.6 6.5 7.6 7.7 5.4a3.1 3.1 0 0 1 5-.6c1.5 2 .7 5-1.2 6.8Z" transform={`rotate(${turn} 10 13)`} />
    ))}
    <circle cx="10" cy="13" r="2.4" />
  </g>
);
