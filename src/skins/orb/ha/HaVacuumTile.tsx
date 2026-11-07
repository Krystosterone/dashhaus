import { useHaVacuum } from "@dashhaus/core";
import type { HaVacuumOptions } from "@dashhaus/core";
import type { VacuumHandlers } from "@dashhaus/core";
import { VacuumTile } from "../cards/vacuum/VacuumTile";
import type { VacuumTileProps } from "../cards/vacuum/VacuumTile";

export interface HaVacuumTileProps extends HaVacuumOptions, Omit<VacuumTileProps, "entity" | "history" | keyof VacuumHandlers> {
  entityId: string;
}

/** A live vacuum tile: the useHaVacuum hook above the presentational tile. */
export function HaVacuumTile({ entityId, name, area, lastSeen, history, loadHistory, onActionError, ...props }: HaVacuumTileProps) {
  const live = useHaVacuum(entityId, { name, area, lastSeen, history, loadHistory, onActionError });
  return <VacuumTile {...props} entity={live.entity} history={live.history} {...live.actions} />;
}
