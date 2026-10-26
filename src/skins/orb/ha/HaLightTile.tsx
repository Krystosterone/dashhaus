import { useHaLight } from "../../../ha/hooks/light";
import type { HaLightOptions } from "../../../ha/hooks/light";
import type { LightHandlers } from "../../../ha/actions/light";
import { LightTile } from "../widgets/light/LightTile";
import type { LightTileProps } from "../widgets/light/LightTile";

export interface HaLightTileProps extends HaLightOptions, Omit<LightTileProps, "entity" | "history" | keyof LightHandlers> {
  entityId: string;
}

/** A live light tile: the useHaLight hook above the presentational tile. */
export function HaLightTile({ entityId, name, area, lastSeen, history, loadHistory, onActionError, ...props }: HaLightTileProps) {
  const light = useHaLight(entityId, { name, area, lastSeen, history, loadHistory, onActionError });
  return <LightTile {...props} entity={light.entity} history={light.history} {...light.actions} />;
}
