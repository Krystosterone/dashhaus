import type { CoverEntity } from "../../entities/cover/types";
import type { HaActionError, HaStore } from "../types";
import { serviceRunner } from "./run";
import type { ActionKinds } from "./kinds";

type CoverServiceCaller = Pick<HaStore, "callService">;

export interface CoverHandlers {
  onOpenCover: () => void;
  onCloseCover: () => void;
  onStopCover: () => void;
  onSetPosition?: (position: number) => void;
  onSetTilt?: (tilt: number) => void;
}

/** What each handler is, for a card drawing cover without knowing it (`ActionKind`). */
export const COVER_ACTIONS = {
  onOpenCover: { takes: "nothing" },
  onCloseCover: { takes: "nothing" },
  onStopCover: { takes: "nothing" },
  onSetPosition: { takes: "level", field: "position" },
  onSetTilt: { takes: "level", field: "tilt" },
} as const satisfies ActionKinds<CoverHandlers, CoverEntity>;

export interface CoverHandlerOptions {
  onError?: (error: HaActionError) => void;
}

/** Create safe callback handlers for the existing CoverTile contract. */
export function createCoverHandlers(caller: CoverServiceCaller, entity: CoverEntity, options: CoverHandlerOptions = {}): CoverHandlers {
  const { run, unsupported, invalidInput, actionable } = serviceRunner(caller, "cover", entity, options.onError);

  const clampPercent = (value: number) => Math.min(100, Math.max(0, value));

  return {
    onOpenCover: () => {
      if (actionable()) run("open_cover");
    },
    onCloseCover: () => {
      if (actionable()) run("close_cover");
    },
    onStopCover: () => {
      if (!actionable()) return;
      if (!entity.supportsStop) {
        unsupported(`${entity.entityId} does not support stopping`);
        return;
      }
      run("stop_cover");
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
    onSetTilt: entity.supportsTilt
      ? (tilt) => {
        if (!actionable()) return;
        if (!Number.isFinite(tilt)) {
          invalidInput(`${entity.entityId} tilt must be finite`);
          return;
        }
        run("set_cover_tilt_position", { tilt_position: clampPercent(tilt) });
      }
      : undefined,
  };
}
