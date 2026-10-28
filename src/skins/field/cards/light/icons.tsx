/** A bulb, drawn on the power key: the light's domain glyph and its switch in one. */
export function IconBulb() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3Z" />
    </svg>
  );
}

/** The bulb as a solid shape, for the screen's pictogram (20 x 26). */
export const BULB = <path d="M10 1a8 8 0 0 0-4.6 14.5c.9.7 1.4 1.6 1.4 2.6V19h6.4v-.9c0-1 .5-1.9 1.4-2.6A8 8 0 0 0 10 1ZM6.8 20.5h6.4V22H6.8zM8 23.5h4V25H8z" />;
/** A sun, for warmth's pictogram (20 x 26). */
export const SUN = (
  <>
    <circle cx="10" cy="13" r="4.2" />
    {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => <rect key={a} x="9.2" y="3" width="1.6" height="3.2" rx="0.8" transform={`rotate(${a} 10 13)`} />)}
  </>
);

/** A round lens, for a colour lamp's colour on the screen (20 x 26). */
export const LENS = <><circle cx="10" cy="13" r="7.5" /></>;
