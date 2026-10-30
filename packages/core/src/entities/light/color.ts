/** A lamp colour as Home Assistant's `hs_color`: hue 0-360, saturation 0-100. */
export type Hs = [number, number];

export type LampColorName = "Red" | "Amber" | "Yellow" | "Green" | "Blue" | "Purple" | "White";

export interface LampColor {
  name: LampColorName;
  /** What choosing it sends. */
  hs: Hs;
}

/**
 * The colours a lamp offers, warm to cool, then white. Each also names the hues nearest it, so a colour set
 * elsewhere (the device's own app) still has a name. Amber is the night light's colour. Each skin draws its own
 * swatch for a name.
 */
export const LAMP_COLORS: LampColor[] = [
  { name: "Red", hs: [0, 100] },
  { name: "Amber", hs: [31, 94.5] },
  { name: "Yellow", hs: [52, 100] },
  { name: "Green", hs: [120, 100] },
  { name: "Blue", hs: [220, 100] },
  { name: "Purple", hs: [285, 85] },
  { name: "White", hs: [0, 0] },
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
