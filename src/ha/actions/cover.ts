import type { CoverEntity } from "../../widgets/cover/types";
import { HaActionError } from "../types";
import type { HaStore } from "../types";

type CoverServiceCaller = Pick<HaStore, "callService">;

export interface CoverHandlers {
  onOpenCover: () => void;
  onCloseCover: () => void;
  onStopCover: () => void;
  onSetPosition?: (position: number) => void;
  onSetTilt?: (tilt: number) => void;
}

export interface CoverHandlerOptions {
  onError?: (error: HaActionError) => void;
}

/** Create safe callback handlers for the existing CoverTile contract. */
export function createCoverHandlers(caller: CoverServiceCaller, entity: CoverEntity, options: CoverHandlerOptions = {}): CoverHandlers {
  const run = (service: string, data: Record<string, unknown> = {}) => {
    void caller.callService("cover", service, { entity_id: entity.entityId, ...data }).catch((cause) => {
      const error = cause instanceof HaActionError ? cause : new HaActionError("service_failed", `Home Assistant rejected cover.${service}`, {
        domain: "cover",
        service,
        entityId: entity.entityId,
      });
      options.onError?.(error);
    });
  };
  const unsupported = (message: string) => options.onError?.(new HaActionError("unsupported", message, { domain: "cover", entityId: entity.entityId }));
  const invalidInput = (message: string) => options.onError?.(new HaActionError("invalid_input", message, { domain: "cover", entityId: entity.entityId }));
  const actionable = () => {
    if (entity.state !== "unavailable") return true;
    unsupported(`${entity.entityId} is unavailable`);
    return false;
  };

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
