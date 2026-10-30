import { useHaHumidifier } from "@scope/core";
import type { HaHumidifierOptions } from "@scope/core";
import type { HumidifierHandlers } from "@scope/core";
import { HumidifierTile } from "../cards/humidifier/HumidifierTile";
import type { HumidifierTileProps } from "../cards/humidifier/HumidifierTile";

export interface HaHumidifierTileProps extends HaHumidifierOptions, Omit<HumidifierTileProps, "entity" | "history" | keyof HumidifierHandlers> {
  entityId: string;
}

/** A live humidifier tile: the useHaHumidifier hook above the presentational tile. */
export function HaHumidifierTile({ entityId, name, area, lastSeen, history, loadHistory, onActionError, ...props }: HaHumidifierTileProps) {
  const humidifier = useHaHumidifier(entityId, { name, area, lastSeen, history, loadHistory, onActionError });
  return <HumidifierTile {...props} entity={humidifier.entity} history={humidifier.history} {...humidifier.actions} />;
}
