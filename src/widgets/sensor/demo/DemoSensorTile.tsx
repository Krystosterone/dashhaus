import { SensorTile } from "../SensorTile";
import { SENSOR_SEEDS } from "./sensors";
import type { SensorSeedName } from "./sensors";

export interface DemoSensorTileProps {
  /** Which example sensor to show. */
  sensor: SensorSeedName;
  /** Container width in px. Width changes anatomy; the selected footprint keeps its height. */
  width?: number;
  footprint?: "compact" | "standard" | "featured";
  /** Compact only: false hides the reading; the row opens the detail sheet. */
  showControl?: boolean;
  /** Override the sensor's name. */
  name?: string;
  defaultOpen?: boolean;
}

export function DemoSensorTile({ sensor, width, footprint, showControl, name, defaultOpen }: DemoSensorTileProps) {
  const s = SENSOR_SEEDS[sensor];
  const entity = name ? { ...s.entity, name } : s.entity;
  return (
    <div style={{ width, maxWidth: "100%" }}>
      <SensorTile entity={entity} history={s.history} footprint={footprint} showControl={showControl} defaultOpen={defaultOpen} />
    </div>
  );
}
