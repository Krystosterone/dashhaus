const P = { fill: "none", stroke: "currentColor" } as const;

/** The sock: a cuff, the leg, and the foot turning forward. Crossed out while it isn't reporting. */
export function OwletIcon({ off }: { off?: boolean }) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" {...P}>
      <path d="M7 2.5h5.2v7.4l3 2.9a2.5 2.5 0 0 1-3.5 3.6L7.9 12.7A3 3 0 0 1 7 10.6Z" />
      <path d="M7 5.3h5.2" />
      {off && <path d="M3.5 3.5l13 13" />}
    </svg>
  );
}

/** The outlined heart beside the heart-rate label. It beats while readings are arriving. */
export function HeartIcon() {
  return (
    <svg className="ow-heart-i" viewBox="0 0 16 16" aria-hidden="true">
      <path d="M8 13.6S2.2 10.1 2.2 6.1A3 3 0 0 1 8 4.7a3 3 0 0 1 5.8 1.4c0 4-5.8 7.5-5.8 7.5Z" />
    </svg>
  );
}
