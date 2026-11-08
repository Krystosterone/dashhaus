const STROKE = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round" } as const;

/**
 * The sun's glyph, on its flat plate (24 x 24, stroked): the sun on the horizon, an arrow over it the way it goes next,
 * down to its sunset or up to its sunrise.
 */
export function IconSun({ rising = false }: { rising?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" {...STROKE}>
      <path d="M7.5 17a4.5 4.5 0 0 1 9 0" />
      <path d="M3 17h2.2M18.8 17H21M5.6 11.6l1.5 1.5M18.4 11.6l-1.5 1.5M4 20.5h16" />
      <path d={rising ? "M12 9V3.5M9.8 5.7 12 3.5l2.2 2.2" : "M12 3.5V9M9.8 6.8 12 9l2.2-2.2"} />
    </svg>
  );
}

/**
 * The sun on the horizon as a solid shape for the screen's pictogram (20 x 26): its disc over the horizon's bar, lit
 * in the figure's ink while it is up, unlit while it is down.
 */
export const SUN_PICT = (
  <path d="M10 9.5a6.5 6.5 0 0 1 6.5 6.5h-13A6.5 6.5 0 0 1 10 9.5ZM9 3h2v4H9ZM2.6 6.4l1.4-1.4 2.6 2.6-1.4 1.4Zm14.8 0L16 5l-2.6 2.6 1.4 1.4ZM0 18h20v2H0Zm3 4h14v2H3Z" />
);
