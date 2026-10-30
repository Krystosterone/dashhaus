import { useHaLight } from "@scope/core";
import type { HaLightOptions } from "@scope/core";
import type { LightHandlers } from "@scope/core";
import { LightTile } from "../cards/light/LightTile";
import type { LightTileProps } from "../cards/light/LightTile";

export interface HaLightTileProps extends HaLightOptions, Omit<LightTileProps, "entity" | "history" | keyof LightHandlers> {
  entityId: string;
}

/** A live light tile: the useHaLight hook above the presentational tile. */
export function HaLightTile({ entityId, name, area, lastSeen, history, loadHistory, onActionError, ...props }: HaLightTileProps) {
  const light = useHaLight(entityId, { name, area, lastSeen, history, loadHistory, onActionError });
  return <LightTile {...props} entity={light.entity} history={light.history} {...light.actions} />;
}
