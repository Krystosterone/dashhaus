/** A Dyson, drawn on its power key: the bladeless loop on its base, its domain glyph and its switch in one. */
export function IconDyson() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="12" cy="8.5" rx="5.5" ry="6" />
      <path d="M9 14.6V20a1 1 0 0 0 1 1h4a1 1 0 0 0 1-1v-5.4" />
    </svg>
  );
}

/** Night mode, on its latching key: a crescent. */
export function IconMoon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 14.5A7.5 7.5 0 0 1 9.5 5a7.5 7.5 0 1 0 9.5 9.5z" />
    </svg>
  );
}

/** Heat, on a Hot+Cool's latching key: a flame. */
export function IconFlame() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 21a6 6 0 0 0 6-6c0-3.5-2.5-5.5-3.5-8.5-1 2-2.5 3-3.5 3 0-2-.5-4-2-6.5C8.5 6 6 9.5 6 15a6 6 0 0 0 6 6z" />
    </svg>
  );
}

/** The loop and its base as one solid shape, for the screen's pictogram (20 x 26), filled from the bottom with its speed. */
export const DYSON_PICT = (
  <path
    d="M10 1.5c3.6 0 6 3 6 6.9 0 3.2-1.7 5.8-4.2 6.6V23a1 1 0 0 1-1 1H9.2a1 1 0 0 1-1-1v-8C5.7 14.2 4 11.6 4 8.4 4 4.5 6.4 1.5 10 1.5zm0 3.2c-1.9 0-3 1.7-3 3.7S8.1 12 10 12s3-1.6 3-3.6-1.1-3.7-3-3.7z"
    fillRule="evenodd"
  />
);

/** The fan's cable, printed past the dial's scale at its back (the dial's units), where it can't turn. */
export function DysonCable({ back }: { back: number }) {
  const at = (r: number) => {
    const rad = (back * Math.PI) / 180;
    return `${+(r * Math.sin(rad)).toFixed(2)} ${+(-r * Math.cos(rad)).toFixed(2)}`;
  };
  return <path className="fd-dy-cable" d={`M${at(90)}L${at(104)}`} />;
}
