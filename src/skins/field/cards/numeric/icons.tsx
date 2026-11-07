import type { ReactNode } from "react";
import type { NumericPicture } from "@dashhaus/core/entities/numeric/words";

const STROKE = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round" } as const;

/**
 * The numeric reading's glyph, on its flat plate (24 x 24, stroked): the picture its device class names
 * (`numericWords`), so a column tells air from power from a meter: a cloud with particles, a bolt, a meter's dial over
 * its counter, a gauge for any other reading. One shape whatever the value: the screen says the value.
 */
export function IconNumeric({ picture }: { picture: NumericPicture }) {
  return <svg viewBox="0 0 24 24" {...STROKE}>{GLYPH[picture]}</svg>;
}

const GLYPH: Record<NumericPicture, ReactNode> = {
  air: <><path d="M7 17.5h10.2a3.9 3.9 0 0 0 .5-7.8 5.4 5.4 0 0 0-10.4 1.4A3.2 3.2 0 0 0 7 17.5Z" /><path d="M10 13.8h.01M14 12.4h.01M12.8 15.4h.01" /></>,
  power: <path d="M13.4 3 5.8 13.2h5.6l-1 7.8 7.8-10.4h-5.6Z" />,
  meter: <><rect x="4" y="4" width="16" height="16" rx="3" /><path d="M8 16h8" /><path d="M12 12.4l2.6-3.4" /><path d="M8 11.6a4 4 0 0 1 8 0" /></>,
  gauge: <><path d="M4 17a8 8 0 1 1 16 0" /><path d="M12 17l3.8-5" /></>,
};

/**
 * The picture as a solid shape for the screen's pictogram (20 x 26), lit while there is a reading, in the figure's ink.
 */
export const NUMERIC_PICT: Record<NumericPicture, ReactNode> = {
  air: <path d="M4.5 20h11a4.4 4.4 0 0 0 .6-8.8A6.2 6.2 0 0 0 4.2 12.8 3.6 3.6 0 0 0 4.5 20Z" />,
  power: <path d="M12 2 2.5 15h6.2L7.5 24 17.5 11h-6.2Z" />,
  meter: <path d="M3.5 4h13A1.5 1.5 0 0 1 18 5.5v15a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 2 20.5v-15A1.5 1.5 0 0 1 3.5 4Zm1.5 13v2h10v-2Zm5-9.5a5 5 0 0 0-5 5h2.2a2.8 2.8 0 0 1 4.3-2.4l-1.6 2.1 1.8 1.3 2.5-3.3A5 5 0 0 0 10 7.5Z" fillRule="evenodd" />,
  gauge: <path d="M10 6a9 9 0 0 1 9 9v5H1v-5a9 9 0 0 1 9-9Zm3.6 4.6-4.3 5.6 1.6 1.2 4.3-5.6Z" fillRule="evenodd" />,
};
