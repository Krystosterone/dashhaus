import { DysonTile } from "../DysonTile";
import { DYSON_SEEDS, useDemoDyson } from "@dashhaus/core/seeds/dyson";
import type { DysonSeedName, DysonSeed } from "@dashhaus/core/seeds/dyson";
import type { CardFootprint } from "../../../shared/ui";

export interface DemoDysonTileProps {
  /** Which example to show. */
  seed: DysonSeedName | DysonSeed;
  /** Container width in px. Width changes anatomy; the selected footprint keeps its height. */
  width?: number;
  footprint?: CardFootprint;
  /** Compact only: false hides the control; the row opens the detail sheet. */
  showControl?: boolean;
  defaultOpen?: boolean;
}

/** A DysonTile wired to local demo state. */
export function DemoDysonTile({ seed, width, footprint, showControl, defaultOpen }: DemoDysonTileProps) {
  const demo = useDemoDyson((typeof seed === "string" ? DYSON_SEEDS[seed] : seed));
  return (
    <div style={{ width, maxWidth: "100%" }}>
      <DysonTile {...demo} footprint={footprint} showControl={showControl} defaultOpen={defaultOpen} />
    </div>
  );
}
