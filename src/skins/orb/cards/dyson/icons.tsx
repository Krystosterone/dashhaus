/** The domain icon: every compact row carries one (row-identity skill). A bladeless loop on its base, as a Dyson stands. */
export function DysonIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" fill="none" stroke="currentColor">
      <path d="M10 2.5c2.8 0 4.5 2.1 4.5 4.8S12.8 12 10 12 5.5 9.9 5.5 7.3 7.2 2.5 10 2.5z" />
      <path d="M10 5c1.3 0 2 1 2 2.3S11.3 9.5 10 9.5 8 8.6 8 7.3 8.7 5 10 5z" />
      <path d="M7.5 12.5v4.2c0 .4.3.8.8.8h3.4c.5 0 .8-.4.8-.8v-4.2" />
    </svg>
  );
}

/**
 * The fan seen from above, in the middle of its dial (the dial's units): its round base and the cable out of its back
 * fixed, its head, the loop across its front, turned `turned` degrees from ahead with the dial's knob.
 */
export function DysonFromAbove({ turned, back }: { turned: number; back: number }) {
  const at = (deg: number, r: number) => {
    const rad = (deg * Math.PI) / 180;
    return `${+(r * Math.sin(rad)).toFixed(2)} ${+(-r * Math.cos(rad)).toFixed(2)}`;
  };
  return (
    <>
      <path className="dy-cable" d={`M${at(back, 16)}Q${at(back - 6, 60)} ${at(back, 100)}`} />
      <circle className="dy-base" r="16" />
      <g className="hd-dial-turn" style={{ transform: `rotate(${turned}deg)` }}>
        <rect className="dy-head" x="-15" y="-22" width="30" height="10" rx="5" />
      </g>
    </>
  );
}
