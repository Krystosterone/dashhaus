import { useHaDyson } from "@dashhaus/core";
import type { HaDysonOptions } from "@dashhaus/core";
import type { DysonHandlers } from "@dashhaus/core";
import { DysonTile } from "../cards/dyson/DysonTile";
import type { DysonTileProps } from "../cards/dyson/DysonTile";

export interface HaDysonTileProps extends HaDysonOptions, Omit<DysonTileProps, "entity" | "history" | keyof DysonHandlers> {
  entityId: string;
}

/** A live Dyson tile: the useHaDyson hook, its fan and the companions on its device, above the presentational tile. */
export function HaDysonTile({ entityId, companions, name, area, lastSeen, history, loadHistory, onActionError, ...props }: HaDysonTileProps) {
  const live = useHaDyson(entityId, { companions, name, area, lastSeen, history, loadHistory, onActionError });
  return <DysonTile {...props} entity={live.entity} history={live.history} {...live.actions} />;
}
