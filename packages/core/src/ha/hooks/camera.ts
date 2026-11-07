import { useMemo } from "react";
import { useHaEntity } from "../provider";
import { cameraFromHass } from "../mappers/camera";
import { useHaArea } from "../registry";
import { useHaPicture } from "../useHaPicture";
import { checkEntityId } from "../dev";
import { useNow } from "../../hooks/useNow";
import type { CameraEntity } from "../../entities/camera/types";

export interface HaCameraOptions {
  /** Overrides Home Assistant's friendly name. */
  name?: string;
  /** Overrides the area Home Assistant's registries resolve for the entity. */
  area?: string;
  /** Overrides when the entity was last reachable, shown while it is unavailable. */
  lastSeen?: string;
  /**
   * False: no still at all, for privacy or cost (the YAML's `still: false`, or a dashboard's `stills: false`). The
   * model then carries no picture, so nothing is ever requested, rather than a loaded one being hidden.
   */
  still?: boolean;
}

export interface HaCameraResult {
  entity: CameraEntity;
}

/**
 * One live camera for any UI: its state, and its still from Home Assistant's own signed `entity_picture`, resolved by
 * the connection (`useHaPicture`) and dropped while it is unavailable. Draw the still with `usePicture`
 * (`@dashhaus/core/hooks`), which loads it only while it is seen; open the live stream with `useHaMoreInfo`. It sends
 * no services and reads no history.
 */
export function useHaCamera(entityId: string, { name, area, lastSeen, still = true }: HaCameraOptions = {}): HaCameraResult {
  checkEntityId(entityId, ["camera"], "useHaCamera");
  const raw = useHaEntity(entityId);
  const registryArea = useHaArea(entityId);
  const now = useNow();
  const picture = useHaPicture(entityId);
  const entity = useMemo(
    () => ({ ...cameraFromHass(raw, entityId, { name, area: area ?? registryArea, lastSeen, now }), picture: still ? picture : undefined }),
    [raw, entityId, name, area, registryArea, lastSeen, now, picture, still],
  );
  return { entity };
}
