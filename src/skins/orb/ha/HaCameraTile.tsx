import { useHaCamera, useHaMoreInfo } from "@dashhaus/core";
import type { HaCameraOptions } from "@dashhaus/core";
import { CameraTile } from "../cards/camera/CameraTile";
import type { CameraTileProps } from "../cards/camera/CameraTile";

export interface HaCameraTileProps extends HaCameraOptions, Omit<CameraTileProps, "entity" | "onOpenLive"> {
  /** The Home Assistant entity id. */
  entityId: string;
}

/**
 * A live camera tile: the useHaCamera hook, with its still from Home Assistant's signed picture, above the
 * presentational tile; its name and still open Home Assistant's own live stream (`useHaMoreInfo`) where the host has
 * it, else the details. It sends no services.
 */
export function HaCameraTile({ entityId, name, area, lastSeen, still = true, ...props }: HaCameraTileProps) {
  const live = useHaCamera(entityId, { name, area, lastSeen, still });
  const openLive = useHaMoreInfo(entityId);
  return <CameraTile {...props} still={still} entity={live.entity} onOpenLive={openLive} />;
}
