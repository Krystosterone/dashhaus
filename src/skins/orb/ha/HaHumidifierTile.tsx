import { useHaHumidifier } from "../../../ha/hooks/humidifier";
import type { HaHumidifierOptions } from "../../../ha/hooks/humidifier";
import type { HumidifierHandlers } from "../../../ha/actions/humidifier";
import { HumidifierTile } from "../widgets/humidifier/HumidifierTile";
import type { HumidifierTileProps } from "../widgets/humidifier/HumidifierTile";

export interface HaHumidifierTileProps extends HaHumidifierOptions, Omit<HumidifierTileProps, "entity" | "history" | keyof HumidifierHandlers> {
  entityId: string;
}

/** A live humidifier tile: the useHaHumidifier hook above the presentational tile. */
export function HaHumidifierTile({ entityId, name, area, lastSeen, history, loadHistory, onActionError, ...props }: HaHumidifierTileProps) {
  const humidifier = useHaHumidifier(entityId, { name, area, lastSeen, history, loadHistory, onActionError });
  return <HumidifierTile {...props} entity={humidifier.entity} history={humidifier.history} {...humidifier.actions} />;
}
