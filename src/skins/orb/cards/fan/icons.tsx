/** One blade, pointing up from the hub at (10, 10); the icon turns it three times. */
const BLADE = "M9.9 8.3C7.6 7.6 6.3 4.7 7.6 2.9a2.9 2.9 0 0 1 4.6.2c1.3 2-.1 4.4-1.6 5.3";

/** The domain icon: every compact row carries one (row-identity skill). Three blades around a hub. */
export function FanIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" fill="none" stroke="currentColor">
      {[0, 120, 240].map((turn) => <path key={turn} d={BLADE} transform={`rotate(${turn} 10 10)`} />)}
      <circle cx="10" cy="10" r="1.6" />
    </svg>
  );
}
