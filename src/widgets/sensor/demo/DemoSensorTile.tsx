import { SensorTile } from "../SensorTile";
import { SENSOR_SEEDS } from "./sensors";
import type { SensorSeedName } from "./sensors";

export interface DemoSensorTileProps {
  /** Which example sensor to show. */
  sensor: SensorSeedName;
  /** Container width in px. The widget picks its size from this. */
  width?: number;
  density?: "regular" | "thin";
  /** Override the sensor's name. */
  name?: string;
  defaultOpen?: boolean;
}

export function DemoSensorTile({ sensor, width, density, name, defaultOpen }: DemoSensorTileProps) {
  const s = SENSOR_SEEDS[sensor];
  const entity = name ? { ...s.entity, name } : s.entity;
  return (
    <div style={{ width, maxWidth: "100%" }}>
      <SensorTile entity={entity} history={s.history} density={density} defaultOpen={defaultOpen} />
    </div>
  );
}
