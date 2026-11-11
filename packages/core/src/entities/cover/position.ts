import type { CoverClass, CoverEntity } from "./types";

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
 * someone: every skin's tap or press opens its details on the question, stopping it is one press, and its position
 * is shown, never set (`COVER_ACTIONS`, spec/cards.md → Using the cover card). A garage door Home Assistant gives no
 * `device_class` is mapped to a shade, so it moves on one press until it has one.
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

/** Magnetic ends: within 3% of either end means fully closed or fully open, never a stray 1%. */
export const snapEnds = (raw: number) => (raw <= 3 ? 0 : raw >= 97 ? 100 : raw);

export const isMoving = (e: CoverEntity) => e.state === "opening" || e.state === "closing";

/** How open it is, 0-100: its position, else all or nothing by its state. */
export const openness = (e: CoverEntity) => e.position ?? (e.state === "open" || e.state === "opening" ? 100 : 0);

/** Whether a position can be set and read, rather than only open and closed. */
export const hasPosition = (e: CoverEntity) => e.supportsPosition && e.position != null;
