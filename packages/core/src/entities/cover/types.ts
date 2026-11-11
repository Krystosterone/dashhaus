import type { HourSample } from "../history";

/** Home Assistant cover device classes the card draws. */
export type CoverClass = "curtain" | "blind" | "shade" | "shutter" | "awning" | "window" | "garage" | "door" | "gate";

/**
 * What a garage door, door or gate asks first for (`coverAsksFirst`): the details open on its question, never one
 * press. Stopping never asks.
 */
export type CoverAction = "open" | "close";

/**
 * Everything a garage door, door or gate asks first for: opening or closing it, or moving it to a position between its
 * ends (a gate's opening for people on foot). A position at an end asks to open or close it (`coverAskTo`).
 */
export type CoverAsk = CoverAction | { position: number };

/** Mirrors the parts of a Home Assistant `cover.*` entity the card needs. Position: 0 closed, 100 open. */
export interface CoverEntity {
  /** The Home Assistant entity id. */
  entityId: string;
  /** Its name: the `name` option, else Home Assistant's friendly name, else its entity id. */
  name: string;
  /** Its area: the `area` option, else the one Home Assistant's registries resolve; none when neither has one. */
  area?: string;
  /**
   * `unknown` is reachable but not reporting where it is: an RF blind or a garage door with no sensor, which Home
   * Assistant drives on an assumed state. It can be opened, closed and stopped, and it is never drawn as closed or as
   * unavailable.
   */
  state: "open" | "closed" | "opening" | "closing" | "unknown" | "unavailable";
  deviceClass: CoverClass;
  /** current_position, 0-100. Omit when the cover only opens and closes. */
  position?: number;
  /** current_tilt_position, 0-100, for blinds with slats. */
  tilt?: number;
  supportsPosition: boolean;
  /**
   * Whether it stops: `stop_cover` (`STOP`), or a cover that only tilts, `stop_cover_tilt` (`STOP_TILT`).
   */
  supportsStop: boolean;
  /** Its slats take a tilt position (`SET_TILT_POSITION`). */
  supportsTilt?: boolean;
  /**
   * Whether it declares `open_cover` (`OPEN`) and `close_cover` (`CLOSE`). `false` where it doesn't, so opening and
   * closing go to the end of its position, else its slats' (`onOpenCover`); omitted, it does.
   */
  supportsOpen?: boolean;
  supportsClose?: boolean;
  /** Whether its slats open, close and stop on their own services (`OPEN_TILT`, `CLOSE_TILT`, `STOP_TILT`). */
  supportsTiltOpen?: boolean;
  supportsTiltClose?: boolean;
  supportsTiltStop?: boolean;
  /**
   * Home Assistant assumes where it is rather than hearing it (`assumed_state`: an RF blind, a garage door with no
   * sensor), so what it shows may be wrong: both ends act, as they do while it is unknown.
   */
  assumedState?: boolean;
  lastChanged?: string;
  /** While it is unavailable, when it was last reachable: the `lastSeen` option, else what Home Assistant reports. */
  lastSeen?: string;
}

export interface CoverHistory {
  /** How open each hour was, 0-1; "unavailable"; null for hours ahead. */
  samples: HourSample[];
  currentHour: number;
}
