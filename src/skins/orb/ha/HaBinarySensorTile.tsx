import { useHaBinarySensor } from "@dashhaus/core";
import type { HaBinarySensorOptions } from "@dashhaus/core";
import { BinarySensorTile } from "../cards/binarySensor/BinarySensorTile";
import type { BinarySensorTileProps } from "../cards/binarySensor/BinarySensorTile";

export interface HaBinarySensorTileProps extends HaBinarySensorOptions, Omit<BinarySensorTileProps, "entity" | "history"> {
  /** The Home Assistant entity id. */
  entityId: string;
}

/** A live, read-only binary sensor tile: the useHaBinarySensor hook, with its device's battery, above the presentational tile. It sends no services. */
export function HaBinarySensorTile({ entityId, batteryEntityId, name, area, lastSeen, history, loadHistory, ...props }: HaBinarySensorTileProps) {
  const live = useHaBinarySensor(entityId, { batteryEntityId, name, area, lastSeen, history, loadHistory });
  return <BinarySensorTile {...props} entity={live.entity} history={live.history} />;
}
