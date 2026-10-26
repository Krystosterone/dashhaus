import { useHaClimate } from "../../../ha/hooks/climate";
import type { HaClimateOptions } from "../../../ha/hooks/climate";
import type { ClimateHandlers } from "../../../ha/actions/climate";
import { ClimateTile } from "../widgets/climate/ClimateTile";
import type { ClimateTileProps } from "../widgets/climate/ClimateTile";

export interface HaClimateTileProps extends HaClimateOptions, Omit<ClimateTileProps, "entity" | "history" | keyof ClimateHandlers> {
  entityId: string;
}

/** A live climate tile: the useHaClimate hook above the presentational tile. */
export function HaClimateTile({ entityId, name, area, lastSeen, unit, history, loadHistory, onActionError, ...props }: HaClimateTileProps) {
  const climate = useHaClimate(entityId, { name, area, lastSeen, unit, history, loadHistory, onActionError });
  return <ClimateTile {...props} entity={climate.entity} history={climate.history} {...climate.actions} />;
}
