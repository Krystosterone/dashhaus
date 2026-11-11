import type { CoverAsk, CoverClass, CoverEntity } from "./types";

/** Each device class in words. */
export const CLASS_LABEL: Record<CoverClass, string> = {
  curtain: "Curtain", blind: "Blind", shade: "Shade", shutter: "Shutter", awning: "Awning", window: "Window", garage: "Garage door", door: "Door", gate: "Gate",
};

/**
 * Covers that let a person in, rather than light: an access point that is normally closed and that the dashboard can
 * close, so left open it warns, as advisory (`coverSeverity`). A garage door, a gate and a door (a motorised one: a
 * cover is one the dashboard drives). A garage door's contact sensor warns the same way (`garage_door` in the binary
 * sensor's `ON_SEVERITY`); a plain door contact never does, since people walk through doors all day and a time it may
 * stay open would be a threshold the card invented (spec/cards.md → A door or gate left open).
 */
export const isAccess = (kind: CoverClass) => kind === "garage" || kind === "door" || kind === "gate";

/**
 * Whether opening and closing it ask first: a garage door, a door or a gate, which lets a person in (`isAccess`). It
 * never moves on one press, so a stray tap or a brush across a wall panel can't open the house or close a door on
 * someone: every skin's tap or press opens its details on the question, stopping it is one press, and setting its
 * position asks too (`coverAskTo`; `COVER_ACTIONS`, spec/cards.md → Using the cover card). A garage door Home Assistant
 * gives no `device_class` is mapped to a shade, so it moves on one press until it has one, or the card's YAML gives it
 * one (`device_class`, the `deviceClass` option of `useHaCover`).
 */
export const coverAsksFirst = (e: Pick<CoverEntity, "deviceClass">) => isAccess(e.deviceClass);

/**
 * How its slats are set, where it has them: to a tilt position (`SET_TILT_POSITION`), or only opened and closed on their
 * own services (`OPEN_TILT` and `CLOSE_TILT`, `ends`). None for a cover without slats.
 */
export const slatsBy = (e: Pick<CoverEntity, "supportsTilt" | "supportsTiltOpen" | "supportsTiltClose">): "position" | "ends" | undefined =>
  e.supportsTilt ? "position" : e.supportsTiltOpen && e.supportsTiltClose ? "ends" : undefined;

/** Quick positions, closed to open. */
export const QUICK_POSITIONS = [
  { value: 0, label: "Closed" },
  { value: 25, label: "25%" },
  { value: 50, label: "Half" },
  { value: 100, label: "Open" },
];

/**
 * Quick positions for a cover that asks first (`coverAsksFirst`): its ends alone, each asking. A position between them
 * is set on the bar or the fader, and asks too.
 */
export const QUICK_ENDS = QUICK_POSITIONS.filter((q) => q.value === 0 || q.value === 100);

/** Magnetic ends: within 3% of either end means fully closed or fully open, never a stray 1%. */
export const snapEnds = (raw: number) => (raw <= 3 ? 0 : raw >= 97 ? 100 : raw);

export const isMoving = (e: CoverEntity) => e.state === "opening" || e.state === "closing";

/** How open it is, 0-100: its position, else all or nothing by its state. */
export const openness = (e: Pick<CoverEntity, "state" | "position">) => e.position ?? (e.state === "open" || e.state === "opening" ? 100 : 0);

/** Whether a position can be set and read, rather than only open and closed. */
export const hasPosition = (e: CoverEntity) => e.supportsPosition && e.position != null;

/**
 * What setting a position asks, on a cover that asks first: at an end, to close or open it, the same question its
 * Close and Open ask; between them, to move there.
 */
export const coverAskTo = (position: number): CoverAsk => (position <= 0 ? "close" : position >= 100 ? "open" : { position });

/** Whether answering yes lets more through: opening it, or a position above where it is now. */
export const coverAskOpens = (action: CoverAsk, e: Pick<CoverEntity, "state" | "position">) =>
  typeof action === "string" ? action === "open" : action.position > openness(e);

/**
 * Whether the question no longer stands: it went unavailable, or it got there by itself (done elsewhere counts). Open
 * and close are answered once it is on its way; a position, once it is there.
 */
export function coverAskSettled(action: CoverAsk, e: Pick<CoverEntity, "state" | "position">): boolean {
  if (e.state === "unavailable") return true;
  if (action === "open") return e.state === "open" || e.state === "opening";
  if (action === "close") return e.state === "closed" || e.state === "closing";
  return e.position === action.position;
}

/** Where a position that asks first is drawn while it is asked: the position it asks for, an end for open or close. */
export const coverAskPosition = (action: CoverAsk) => (typeof action === "string" ? (action === "open" ? 100 : 0) : action.position);
