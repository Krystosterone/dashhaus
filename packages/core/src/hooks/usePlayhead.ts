import { useMemo } from "react";
import { playhead } from "../entities/mediaPlayer/position";
import type { Playhead } from "../entities/mediaPlayer/position";
import type { MediaPlayerEntity } from "../entities/mediaPlayer/types";

export interface PlayheadNow extends Playhead {
  /**
   * Changes whenever what it was worked out from does: give it as the `key` of what animates from `at`, so a new
   * position, a pause or a new track starts the animation again from the right place rather than drifting.
   */
  key: string;
}

/**
 * Where a player is, worked out when its state, position or duration change, and only then: never on a timer. A card
 * draws `at` and lets CSS run on from it while `running` (`@dashhaus/core/entities/mediaPlayer/position`), so the
 * position ticks with no re-render. Nothing for a stream with no duration, or a player off, asleep or unavailable.
 */
export function usePlayhead(e: Pick<MediaPlayerEntity, "state" | "duration" | "position" | "positionAt">): PlayheadNow | undefined {
  const { state, duration, position, positionAt } = e;
  return useMemo(() => {
    const now = Date.now();
    const p = playhead({ state, duration, position, positionAt }, now);
    return p && { ...p, key: `${state}|${duration}|${position}|${positionAt ?? now}` };
  }, [state, duration, position, positionAt]);
}
