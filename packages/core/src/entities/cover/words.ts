import { openness } from "./position";
import type { CoverEntity } from "./types";

/** Whether it lets anything through: a position above closed, or open by its state. Never while unavailable. */
export const isOpen = (e: Pick<CoverEntity, "state" | "position">) => e.state !== "unavailable" && (openness(e as CoverEntity) > 0 || e.state === "open");

/**
 * Its state in words, the same on every card and in every skin: the verb while it travels (Opening, Closing), Unknown
 * while Home Assistant can drive it but hasn't said where it is, else Open or Closed; Unavailable while it is.
 */
export function coverWord(e: Pick<CoverEntity, "state" | "position">): string {
  if (e.state === "unavailable") return "Unavailable";
  if (e.state === "opening") return "Opening";
  if (e.state === "closing") return "Closing";
  if (e.state === "unknown") return "Unknown";
  return isOpen(e) ? "Open" : "Closed";
}

/** A position in words, for screen readers and a position's value: "Closed", "Half open", "40% open", "Open". */
export const positionText = (v: number) => (v === 0 ? "Closed" : v === 100 ? "Open" : v === 50 ? "Half open" : `${v}% open`);

/** A blind's slats, closed to open, as the sheet's choices name them. */
export const SLAT_POSITIONS = [
  { value: 0, label: "Closed" },
  { value: 50, label: "Angled" },
  { value: 100, label: "Open" },
];

/** The warning's word for a door left open: 13 characters at most, so a row keeps it whole. */
export const LEFT_OPEN_WORD = "Open";

/**
 * A door left open as a card prints it, with since when: "Open since 18:30", or "Open". The same words for a garage
 * door's `cover` and its `binary_sensor` (spec/cards.md → the same physical thing gets the same warning).
 */
export const leftOpenText = (lastChanged?: string) => `${LEFT_OPEN_WORD}${lastChanged ? ` since ${lastChanged}` : ""}`;

/** A door left open said in full, for a screen reader: "Garage door has been open since 18:30". */
export const leftOpenSentence = (name: string, lastChanged?: string) => `${name} has been open${lastChanged ? ` since ${lastChanged}` : ""}`;
