import { LAMP_COLORS as NAMED, lampColorOf as nameOf } from "../../../../domains/light/color";
import type { Hs, LampColor as NamedColor, LampColorName } from "../../../../domains/light/color";

export type { Hs };

/** A named lamp colour with orb's swatch for it. */
export interface LampColor extends NamedColor {
  /** The swatch in the sheet, as OKLCH chroma and hue; lightness comes from the theme. */
  swatch: { c: number; h: number };
}

const SWATCHES: Record<LampColorName, LampColor["swatch"]> = {
  Red: { c: 0.2, h: 29 },
  Amber: { c: 0.17, h: 62 },
  Yellow: { c: 0.17, h: 98 },
  Green: { c: 0.2, h: 145 },
  Blue: { c: 0.16, h: 255 },
  Purple: { c: 0.17, h: 310 },
  White: { c: 0.012, h: 90 },
};

const withSwatch = (c: NamedColor): LampColor => ({ ...c, swatch: SWATCHES[c.name] });

/** The colours a lamp's sheet offers (src/domains/light/color.ts), each with its swatch. */
export const LAMP_COLORS: LampColor[] = NAMED.map(withSwatch);

/** The colour an `hs_color` is nearest, with its swatch. */
export const lampColorOf = (hs: Hs): LampColor => withSwatch(nameOf(hs));

/** CSS colour for a swatch. Lightness comes from the theme token --accent-strong-l. */
export const swatchColor = ({ c, h }: LampColor["swatch"]) => `oklch(var(--accent-strong-l) ${c} ${h})`;
