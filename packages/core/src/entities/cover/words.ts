import { asksFirst, waitingFor } from "../guard";
import { CLASS_LABEL, openness } from "./position";
import type { CoverAction, CoverEntity } from "./types";

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

const VERB: Record<CoverAction, string> = { open: "Open", close: "Close" };

/** The question a garage door, door or gate asks before it moves (`coverAsksFirst`): "Close Garage door?". */
export const coverQuestion = (action: CoverAction, name: string) => `${VERB[action]} ${name}?`;

/**
 * What answering yes means, under the question: it moves now, who that lets in or what it could close on; where it
 * is isn't known (`unknown`), and it can't be stopped from here when it can't stop.
 */
export function coverAskDetail(action: CoverAction, e: Pick<CoverEntity, "state" | "supportsStop">): string {
  return [
    action === "open" ? "It opens now, and anyone outside can come in." : "It closes now. Check nothing is in its way.",
    e.state === "unknown" ? "Where it is isn't known." : null,
    e.supportsStop ? null : "It can't be stopped from here.",
  ].filter(Boolean).join(" ");
}

/**
 * The yes, naming the thing it moves, never a bare Close beside the details' own close: "Close garage door",
 * "Open gate".
 */
export const coverAskAction = (action: CoverAction, e: Pick<CoverEntity, "deviceClass">) => `${VERB[action]} ${CLASS_LABEL[e.deviceClass].toLowerCase()}`;

/** What the details say while the yes is on its way, naming the thing: "Waiting for the garage door". A skin adds its end punctuation. */
export const coverAskWaiting = (e: Pick<CoverEntity, "deviceClass">) => waitingFor(CLASS_LABEL[e.deviceClass].toLowerCase());

/** The details' line for a cover that asks first, so the rule can be learnt there. */
export const COVER_ASKS_HINT = asksFirst(["Opening", "closing"])!;
