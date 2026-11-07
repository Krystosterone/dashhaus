import { useHaCamera, useHaMoreInfo } from "@dashhaus/core";
import type { HaCameraOptions } from "@dashhaus/core";
import { CameraModule } from "../cards/camera/CameraModule";
import type { CameraModuleProps } from "../cards/camera/CameraModule";

export interface HaCameraModuleProps extends HaCameraOptions, Pick<CameraModuleProps, "footprint" | "refresh" | "paused" | "defaultOpen"> {
  /** The Home Assistant entity id. */
  entityId: string;
}

/**
 * A live camera module: the useHaCamera hook, with its still from Home Assistant's signed picture, above field's
 * module; its name and still open Home Assistant's own live stream (`useHaMoreInfo`) where the host has it, else the
 * panel. It sends no services.
 */
export function HaCameraModule({ entityId, footprint, refresh, paused, defaultOpen, still = true, ...options }: HaCameraModuleProps) {
  const { entity } = useHaCamera(entityId, { ...options, still });
  const openLive = useHaMoreInfo(entityId);
  return (
    <CameraModule
      entity={entity}
      footprint={footprint}
      still={still}
      refresh={refresh}
      paused={paused}
      onOpenLive={openLive}
      defaultOpen={defaultOpen}
    />
  );
}
