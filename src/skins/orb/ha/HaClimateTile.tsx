import { useHaClimate } from "@dashhaus/core";
import type { HaClimateOptions } from "@dashhaus/core";
import type { ClimateHandlers } from "@dashhaus/core";
import { ClimateTile } from "../cards/climate/ClimateTile";
import type { ClimateTileProps } from "../cards/climate/ClimateTile";

export interface HaClimateTileProps extends HaClimateOptions, Omit<ClimateTileProps, "entity" | "history" | keyof ClimateHandlers> {
  entityId: string;
}

/** A live climate tile: the useHaClimate hook above the presentational tile. */
export function HaClimateTile({ entityId, name, area, lastSeen, unit, history, loadHistory, onActionError, ...props }: HaClimateTileProps) {
  const climate = useHaClimate(entityId, { name, area, lastSeen, unit, history, loadHistory, onActionError });
  return <ClimateTile {...props} entity={climate.entity} history={climate.history} {...climate.actions} />;
}
