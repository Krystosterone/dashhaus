import type { HumidifierEntity } from "@dashhaus/core/entities/humidifier/types";

const STROKE = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round" } as const;

/**
 * The humidifier's domain glyph, on its key (24 x 24, stroked): mist rising from the unit, or a dehumidifier's
 * grille over its tank, so a column of them tells the two apart.
 */
export function IconHumidifier({ kind }: { kind?: HumidifierEntity["kind"] }) {
  if (kind === "dehumidifier") {
    return (
      <svg viewBox="0 0 24 24" {...STROKE}>
        <rect x="5.5" y="3" width="13" height="18" rx="2" />
        <path d="M9 6.5h6M9 9h6" />
        <path d="M12 12.5s2.5 2.5 2.5 4.2a2.5 2.5 0 0 1-5 0c0-1.7 2.5-4.2 2.5-4.2Z" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" {...STROKE}>
      <path d="M6.5 12h11v7.5a2 2 0 0 1-2 2h-7a2 2 0 0 1-2-2Z" />
      <path d="M10 16h4" />
      <path d="M9.5 9c-1-1-1-2 0-3s1-2 0-3M14.5 9c-1-1-1-2 0-3s1-2 0-3" />
    </svg>
  );
}

/** A drop, for the screen's pictogram (20 x 26): humidity, filled from the bottom to its level. */
export const DROP = <path d="M10 2.5c3.6 5 6.5 8.5 6.5 13a6.5 6.5 0 0 1-13 0c0-4.5 2.9-8 6.5-13Z" />;
