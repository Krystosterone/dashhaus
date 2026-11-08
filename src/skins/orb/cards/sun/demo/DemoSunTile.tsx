import { SunTile } from "../SunTile";
import { SUN_SEEDS } from "@dashhaus/core/seeds/sun";
import type { SunSeedName, SunSeed } from "@dashhaus/core/seeds/sun";
import type { CardFootprint } from "../../../shared/ui";

export interface DemoSunTileProps {
  /** Which example to show. */
  seed: SunSeedName | SunSeed;
  /** Container width in px. Width changes anatomy; the selected footprint keeps its height. */
  width?: number;
  footprint?: CardFootprint;
  /** Compact only: false hides the reading; the row opens the detail sheet. */
  showControl?: boolean;
  defaultOpen?: boolean;
}

/** A SunTile with example data. */
export function DemoSunTile({ seed, width, footprint, showControl, defaultOpen }: DemoSunTileProps) {
  const s = (typeof seed === "string" ? SUN_SEEDS[seed] : seed);
  return (
    <div style={{ width, maxWidth: "100%" }}>
      <SunTile entity={s.entity} history={s.history} footprint={footprint} showControl={showControl} defaultOpen={defaultOpen} />
    </div>
  );
}
