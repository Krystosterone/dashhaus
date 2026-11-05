import { useHaHumidifier } from "@dashhaus/core";
import type { HaHumidifierOptions } from "@dashhaus/core";
import type { HumidifierHandlers } from "@dashhaus/core";
import { HumidifierTile } from "../cards/humidifier/HumidifierTile";
import type { HumidifierTileProps } from "../cards/humidifier/HumidifierTile";

export interface HaHumidifierTileProps extends HaHumidifierOptions, Omit<HumidifierTileProps, "entity" | "history" | keyof HumidifierHandlers> {
  /** The Home Assistant entity id. */
  entityId: string;
}

/** A live humidifier tile: the useHaHumidifier hook above the presentational tile. */
export function HaHumidifierTile({ entityId, name, area, lastSeen, history, loadHistory, onActionError, ...props }: HaHumidifierTileProps) {
  const humidifier = useHaHumidifier(entityId, { name, area, lastSeen, history, loadHistory, onActionError });
  return <HumidifierTile {...props} entity={humidifier.entity} history={humidifier.history} {...humidifier.actions} />;
}
