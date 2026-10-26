/** A lamp colour as Home Assistant's `hs_color`: hue 0-360, saturation 0-100. */
export type Hs = [number, number];

export interface LampColor {
  name: string;
  /** What choosing it sends. */
  hs: Hs;
  /** The swatch in the sheet, as OKLCH chroma and hue; lightness comes from the theme. */
  swatch: { c: number; h: number };
}

/**
 * The colours a lamp's sheet offers, warm to cool, then white. Each also names the hues nearest it, so a
 * colour set elsewhere (the device's own app) still has a name. Amber is the night light's colour.
 */
export const LAMP_COLORS: LampColor[] = [
  { name: "Red", hs: [0, 100], swatch: { c: 0.2, h: 29 } },
  { name: "Amber", hs: [31, 94.5], swatch: { c: 0.17, h: 62 } },
  { name: "Yellow", hs: [52, 100], swatch: { c: 0.17, h: 98 } },
  { name: "Green", hs: [120, 100], swatch: { c: 0.2, h: 145 } },
  { name: "Blue", hs: [220, 100], swatch: { c: 0.16, h: 255 } },
  { name: "Purple", hs: [285, 85], swatch: { c: 0.17, h: 310 } },
  { name: "White", hs: [0, 0], swatch: { c: 0.012, h: 90 } },
];

/** Upper hue bound of each colour's family, in LAMP_COLORS order (red wraps past 345). */
const HUE_UPTO = [15, 42, 75, 165, 260, 345];
/** Below this saturation an LED reads as white whatever its hue. */
const WHITE_BELOW = 20;

/** The colour an `hs_color` is nearest: a family by hue, or White when it is barely saturated. */
export function lampColorOf([h, s]: Hs): LampColor {
  if (s < WHITE_BELOW) return LAMP_COLORS[LAMP_COLORS.length - 1];
  const hue = ((h % 360) + 360) % 360;
  if (hue >= HUE_UPTO[HUE_UPTO.length - 1]) return LAMP_COLORS[0];
  return LAMP_COLORS[HUE_UPTO.findIndex((upto) => hue < upto)];
}

/** CSS colour for a swatch. Lightness comes from the theme token --accent-strong-l. */
export const swatchColor = ({ c, h }: LampColor["swatch"]) => `oklch(var(--accent-strong-l) ${c} ${h})`;
