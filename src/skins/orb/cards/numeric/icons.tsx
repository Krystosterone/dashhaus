import type { ReactNode } from "react";
import type { NumericPicture } from "@dashhaus/core/entities/numeric/words";

/**
 * The domain icon, every compact row's identity (row-identity skill): the picture its device class names
 * (`numericWords`), so a column tells air from power from a meter: a cloud with a particle for the air, a bolt for
 * power now, a meter's dial and counter for a running total, and a gauge for any other reading. A reading's state is
 * its figure, so the icon keeps one shape.
 */
export function NumericIcon({ picture }: { picture: NumericPicture }) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" fill="none" stroke="currentColor">
      {PATHS[picture]}
    </svg>
  );
}

const PATHS: Record<NumericPicture, ReactNode> = {
  air: <><path d="M5.6 14.5h8.6a3.3 3.3 0 0 0 .4-6.6 4.6 4.6 0 0 0-8.8 1.2 2.7 2.7 0 0 0-.2 5.4Z" /><path d="M8.2 11.4h.01M11.6 10.2h.01M10.6 12.8h.01" /></>,
  power: <path d="M11.2 2.8 4.8 11.3h4.6l-.8 5.9 6.4-8.5h-4.6l.8-5.9Z" />,
  meter: <><rect x="3.5" y="3.5" width="13" height="13" rx="2.5" /><path d="M6.5 13h7" /><path d="M10 10.2l2.2-2.8" /><path d="M6.6 9.6a3.4 3.4 0 0 1 6.8 0" /></>,
  gauge: <><path d="M3.5 14a6.5 6.5 0 1 1 13 0" /><path d="M10 14l3.2-4.2" /></>,
};
