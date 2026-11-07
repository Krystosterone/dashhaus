import { useHaNumeric } from "@dashhaus/core";
import type { HaNumericOptions } from "@dashhaus/core";
import { NumericTile } from "../cards/numeric/NumericTile";
import type { NumericTileProps } from "../cards/numeric/NumericTile";

export interface HaNumericTileProps extends HaNumericOptions, Omit<NumericTileProps, "entity" | "history"> {
  entityId: string;
}

/** A live, read-only numeric tile: the useHaNumeric hook above the presentational tile. It sends no services. */
export function HaNumericTile({ entityId, name, area, unit, lastSeen, history, loadHistory, ...props }: HaNumericTileProps) {
  const live = useHaNumeric(entityId, { name, area, unit, lastSeen, history, loadHistory });
  return <NumericTile {...props} entity={live.entity} history={live.history} />;
}
