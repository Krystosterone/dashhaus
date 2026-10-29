/** The sound's domain glyph, on its key (20 x 20, stroked): a speaker and its sound, as orb's. */
export function IconSound() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3.8 8h2.7l3.6-3v10l-3.6-3H3.8Z" />
      <path d="M13 7.6a3.4 3.4 0 0 1 0 4.8" />
      <path d="M15.2 5.4a6.5 6.5 0 0 1 0 9.2" />
    </svg>
  );
}

const p = (x: number, y: number) => `${x.toFixed(2)} ${y.toFixed(2)}`;

/** A band of sound around (cx, cy): an arc `r` out, `w` thick, `deg` either side of the horizontal, as a closed subpath. */
function wave(cx: number, cy: number, r: number, w: number, deg: number) {
  const a = (deg * Math.PI) / 180;
  const at = (radius: number, sign: number) => p(cx + radius * Math.cos(a), cy + sign * radius * Math.sin(a));
  const [ro, ri] = [r + w / 2, r - w / 2];
  return `M${at(ro, -1)}A${ro} ${ro} 0 0 1 ${at(ro, 1)}L${at(ri, 1)}A${ri} ${ri} 0 0 0 ${at(ri, -1)}Z`;
}

/** A speaker and two bands of sound, for the screen's pictogram (20 x 26), filled from the bottom to the volume. */
export const SPEAKER = <path d={"M1.5 10.5h3.2L9 6.5v13l-4.3-4H1.5Z" + wave(9.5, 13, 4.2, 1.7, 42) + wave(9.5, 13, 8, 1.7, 46)} />;
