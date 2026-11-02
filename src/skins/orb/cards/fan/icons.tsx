/** One blade, pointing up from the hub at (10, 10); the icon turns it three times. */
const BLADE = "M10 8.3C8.4 7.5 7.6 5.5 8.4 4a2.1 2.1 0 0 1 3.4-.4c1 1.3.4 3.3-.9 4.6";

/** The domain icon: every compact row carries one (row-identity skill). Three blades around a hub. */
export function FanIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" fill="none" stroke="currentColor">
      {[0, 120, 240].map((turn) => <path key={turn} d={BLADE} transform={`rotate(${turn} 10 10)`} />)}
      <circle cx="10" cy="10" r="1.7" />
    </svg>
  );
}
