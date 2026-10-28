import { useHaSensor } from "../../../ha/hooks/sensor";
import type { HaSensorOptions } from "../../../ha/hooks/sensor";
import { SensorTile } from "../cards/sensor/SensorTile";
import type { SensorTileProps } from "../cards/sensor/SensorTile";

export interface HaSensorTileProps extends HaSensorOptions, Omit<SensorTileProps, "entity" | "history"> {
  /** Primary sensor, normally the temperature entity for this device. */
  entityId: string;
}

/** A live read-only sensor tile: the useHaSensor hook above the presentational tile. */
export function HaSensorTile({ entityId, humidityEntityId, batteryEntityId, name, area, outdoor, lastSeen, unit, history, loadHistory, ...props }: HaSensorTileProps) {
  const sensor = useHaSensor(entityId, { humidityEntityId, batteryEntityId, name, area, outdoor, lastSeen, unit, history, loadHistory });
  return <SensorTile {...props} entity={sensor.entity} history={sensor.history} />;
}
