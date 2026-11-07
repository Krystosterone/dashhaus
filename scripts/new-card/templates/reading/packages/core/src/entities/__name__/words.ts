import { fmt1 } from "../format";

/**
 * What the __label__ says, the same in every skin (spec/cards.md → What every card says): a skin draws these words and
 * never writes its own. Before a first value every reading says `No reading yet`.
 */

/** Whole numbers as they are, anything else to one decimal: `42`, `7.5`. */
export const fmt__Name__ = (n: number) => (Number.isInteger(n) ? String(n) : fmt1(n));

/** The value with its unit: symbols sit on the figure (`42%`, `21.4°C`), words keep a space (`650 ppm`). */
export const with__Name__Unit = (n: number, unit = "") => `${fmt__Name__(n)}${unit && !/^[%°]/.test(unit) ? " " : ""}${unit}`;
