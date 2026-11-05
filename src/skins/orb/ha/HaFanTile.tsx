import { useHaFan } from "@dashhaus/core";
import type { HaFanOptions } from "@dashhaus/core";
import type { FanHandlers } from "@dashhaus/core";
import { FanTile } from "../cards/fan/FanTile";
import type { FanTileProps } from "../cards/fan/FanTile";

export interface HaFanTileProps extends HaFanOptions, Omit<FanTileProps, "entity" | "history" | keyof FanHandlers> {
  /** The Home Assistant entity id. */
  entityId: string;
}

/** A live fan tile: the useHaFan hook above the presentational tile. */
export function HaFanTile({ entityId, name, area, lastSeen, history, loadHistory, onActionError, ...props }: HaFanTileProps) {
  const live = useHaFan(entityId, { name, area, lastSeen, history, loadHistory, onActionError });
  return <FanTile {...props} entity={live.entity} history={live.history} {...live.actions} />;
}
