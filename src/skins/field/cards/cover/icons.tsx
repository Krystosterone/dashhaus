import type { CoverClass } from "../../../../domains/cover/types";

const STROKE = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round" } as const;

/**
 * The cover's domain glyph, on its key (24 x 24, stroked), open or shut by its kind: curtains on a rail, a door
 * under its roof, a window, or a blind; so a column of covers tells them apart. Shut, the fabric is drawn down;
 * open, a blind is rolled up over the empty window and its sill.
 */
export function IconCover({ kind, open }: { kind: CoverClass; open: boolean }) {
  let d: string;
  switch (kind) {
    case "curtain":
      d = open
        ? "M3.5 4.5h17M5.5 4.5v15h3.2c-.8-4.2-.8-10.2.4-15M18.5 4.5v15h-3.2c.8-4.2.8-10.2-.4-15"
        : "M3.5 4.5h17M5.5 4.5v15h6.3v-15M18.5 4.5v15h-6.3v-15M8.5 7v10M15.5 7v10";
      break;
    case "garage": case "door": case "gate":
      d = open
        ? "M3.5 10 12 4.5l8.5 5.5v9.5M3.5 10v9.5M7 19.5v-7.5h10v7.5M7 14.5h10"
        : "M3.5 10 12 4.5l8.5 5.5v9.5M3.5 10v9.5M7 12h10v7.5H7ZM7 14.5h10M7 17h10";
      break;
    case "window":
      d = "M5.5 4h13v16h-13ZM12 4v16M5.5 12h13";
      break;
    default: // blind, shade, shutter, awning
      d = open
        ? "M4 4.5h16M6 4.5v3h12v-3M6 10.5v9M18 10.5v9M4 19.5h16"
        : "M4 4.5h16M6 4.5v15h12v-15M6 8.5h12M6 12.5h12M6 16h12";
  }
  return <svg viewBox="0 0 24 24" {...STROKE}><path d={d} /></svg>;
}

/** Stop, on the key while the cover travels. */
export function IconStop() {
  return <svg viewBox="0 0 24 24"><rect x="7.5" y="7.5" width="9" height="9" rx="1.2" fill="currentColor" /></svg>;
}

/** Close and open, for the transport keys of a cover that only opens and closes. */
export function IconDown() {
  return <svg viewBox="0 0 24 24" {...STROKE}><path d="M7 10l5 5 5-5" /></svg>;
}
export function IconUp() {
  return <svg viewBox="0 0 24 24" {...STROKE}><path d="M7 14l5-5 5 5" /></svg>;
}

/**
 * A window under its rail, as a solid shape for the screen's pictogram (20 x 26). Lit from the bottom up to how
 * open it is, as daylight under a blind that rolls up; the rail lights only fully open.
 */
export const WINDOW = <path d="M1.5 1.5h17v2.5h-17zM2.5 5.5h7v19h-7zM10.5 5.5h7v19h-7z" />;

/** Slats, for a blind's tilt on the panel's second channel (20 x 26). */
export const SLATS = <path d="M2 4h16l-1.5 3h-13zM2 10h16l-1.5 3h-13zM2 16h16l-1.5 3h-13zM2 22h16l-1.5 3h-13z" />;
