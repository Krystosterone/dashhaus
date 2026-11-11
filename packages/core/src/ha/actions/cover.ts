import type { CoverEntity } from "../../entities/cover/types";
import type { HaActionError, HaStore } from "../types";
import { slatsBy } from "../../entities/cover/position";
import { serviceRunner } from "./run";
import type { ActionKinds } from "./kinds";

type CoverServiceCaller = Pick<HaStore, "callService">;

export interface CoverHandlers {
  /**
   * Opens it the way it declares: `cover.open_cover` (`OPEN`), else its position to 100 (`set_cover_position`), else its
   * slats (`open_cover_tilt`, then `set_cover_tilt_position` to 100), so a cover that only tilts opens them. A cover with
   * none of these reports `unsupported`.
   */
  onOpenCover: () => void;
  /** Closes it as `onOpenCover` opens it: `cover.close_cover`, else its position or its slats to 0. */
  onCloseCover: () => void;
  /**
   * Calls `cover.stop_cover`, or `cover.stop_cover_tilt` for a cover that only tilts. A cover that can't stop reports
   * `unsupported`.
   */
  onStopCover: () => void;
  /**
   * Only for a cover that reports a position. Calls `cover.set_cover_position`, held between 0 (closed) and 100
   * (open).
   */
  onSetPosition?: (position: number) => void;
  /**
   * Only for a cover with slats (`slatsBy`). Calls `cover.set_cover_tilt_position`, held between 0 and 100; slats that
   * only open and close take 0 (`close_cover_tilt`) or 100 (`open_cover_tilt`), and any other value reports
   * `invalid_input`.
   */
  onSetTilt?: (tilt: number) => void;
}

/**
 * What each handler is, for a card drawing cover without knowing it (`ActionKind`). A garage door, door or gate
 * (`coverAsksFirst`) never moves on one press: opening and closing it ask first, and its position is shown, never set
 * (no skin asks before a level yet). Stopping never asks. Each `when` is written out, one per line, so a generator's
 * reader (scripts/domains.js) sees it; `cover.test.ts` holds it to `isAccess`.
 */
export const COVER_ACTIONS = {
  onOpenCover: { takes: "nothing", asks: true, when: { deviceClass: ["garage", "door", "gate"] } },
  onCloseCover: { takes: "nothing", asks: true, when: { deviceClass: ["garage", "door", "gate"] } },
  onStopCover: { takes: "nothing" },
  onSetPosition: { takes: "level", field: "position", asks: true, when: { deviceClass: ["garage", "door", "gate"] } },
  onSetTilt: { takes: "level", field: "tilt" },
} as const satisfies ActionKinds<CoverHandlers, CoverEntity>;

export interface CoverHandlerOptions {
  onError?: (error: HaActionError) => void;
}

/** Create safe callback handlers for the existing CoverTile contract. */
export function createCoverHandlers(caller: CoverServiceCaller, entity: CoverEntity, options: CoverHandlerOptions = {}): CoverHandlers {
  const { run, unsupported, invalidInput, actionable } = serviceRunner(caller, "cover", entity, options.onError);

  const clampPercent = (value: number) => Math.min(100, Math.max(0, value));

  // Each end, by the first way the cover declares: its own service, its position, its slats' service, its slats.
  const toEnd = (end: "open" | "close") => {
    if (!actionable()) return;
    const at = end === "open" ? 100 : 0;
    if ((end === "open" ? entity.supportsOpen : entity.supportsClose) !== false) run(`${end}_cover`);
    else if (entity.supportsPosition) run("set_cover_position", { position: at });
    else if (end === "open" ? entity.supportsTiltOpen : entity.supportsTiltClose) run(`${end}_cover_tilt`);
    else if (entity.supportsTilt) run("set_cover_tilt_position", { tilt_position: at });
    else unsupported(`${entity.entityId} does not support ${end === "open" ? "opening" : "closing"}`);
  };
  const slats = slatsBy(entity);
  const onlyTilts = entity.supportsOpen === false && entity.supportsClose === false && !entity.supportsPosition;

  return {
    onOpenCover: () => toEnd("open"),
    onCloseCover: () => toEnd("close"),
    onStopCover: () => {
      if (!actionable()) return;
      if (!entity.supportsStop) {
        unsupported(`${entity.entityId} does not support stopping`);
        return;
      }
      run(onlyTilts && entity.supportsTiltStop ? "stop_cover_tilt" : "stop_cover");
    },
    onSetPosition: entity.supportsPosition
      ? (position) => {
        if (!actionable()) return;
        if (!Number.isFinite(position)) {
          invalidInput(`${entity.entityId} position must be finite`);
          return;
        }
        run("set_cover_position", { position: clampPercent(position) });
      }
      : undefined,
    onSetTilt: slats
      ? (tilt) => {
        if (!actionable()) return;
        if (!Number.isFinite(tilt)) {
          invalidInput(`${entity.entityId} tilt must be finite`);
          return;
        }
        if (slats === "ends") {
          if (tilt === 0 || tilt === 100) run(tilt === 100 ? "open_cover_tilt" : "close_cover_tilt");
          else invalidInput(`${entity.entityId} slats only open and close`);
          return;
        }
        run("set_cover_tilt_position", { tilt_position: clampPercent(tilt) });
      }
      : undefined,
  };
}
