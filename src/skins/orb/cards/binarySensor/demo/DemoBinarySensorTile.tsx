import { BinarySensorTile } from "../BinarySensorTile";
import { BINARY_SENSOR_SEEDS } from "@dashhaus/core/seeds/binarySensor";
import type { BinarySensorSeedName, BinarySensorSeed } from "@dashhaus/core/seeds/binarySensor";
import type { CardFootprint } from "../../../shared/ui";

export interface DemoBinarySensorTileProps {
  /** Which example to show. */
  seed: BinarySensorSeedName | BinarySensorSeed;
  /** Container width in px. Width changes anatomy; the selected footprint keeps its height. */
  width?: number;
  footprint?: CardFootprint;
  /** Compact only: false hides the state; the row opens the detail sheet. */
  showControl?: boolean;
  defaultOpen?: boolean;
}

/** A BinarySensorTile with example data. */
export function DemoBinarySensorTile({ seed, width, footprint, showControl, defaultOpen }: DemoBinarySensorTileProps) {
  const s = (typeof seed === "string" ? BINARY_SENSOR_SEEDS[seed] : seed);
  return (
    <div style={{ width, maxWidth: "100%" }}>
      <BinarySensorTile entity={s.entity} history={s.history} footprint={footprint} showControl={showControl} defaultOpen={defaultOpen} />
    </div>
  );
}
