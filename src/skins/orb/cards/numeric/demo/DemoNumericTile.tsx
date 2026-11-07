import { NumericTile } from "../NumericTile";
import { NUMERIC_SEEDS } from "@dashhaus/core/seeds/numeric";
import type { NumericSeedName, NumericSeed } from "@dashhaus/core/seeds/numeric";
import type { CardFootprint } from "../../../shared/ui";

export interface DemoNumericTileProps {
  /** Which example to show. */
  seed: NumericSeedName | NumericSeed;
  /** Container width in px. Width changes anatomy; the selected footprint keeps its height. */
  width?: number;
  footprint?: CardFootprint;
  /** Compact only: false hides the reading; the row opens the detail sheet. */
  showControl?: boolean;
  defaultOpen?: boolean;
}

/** A NumericTile with example data. */
export function DemoNumericTile({ seed, width, footprint, showControl, defaultOpen }: DemoNumericTileProps) {
  const s = (typeof seed === "string" ? NUMERIC_SEEDS[seed] : seed);
  return (
    <div style={{ width, maxWidth: "100%" }}>
      <NumericTile entity={s.entity} history={s.history} footprint={footprint} showControl={showControl} defaultOpen={defaultOpen} />
    </div>
  );
}
