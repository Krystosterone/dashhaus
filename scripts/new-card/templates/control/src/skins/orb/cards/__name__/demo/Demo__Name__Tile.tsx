import { __Name__Tile } from "../__Name__Tile";
import { __CONST___SEEDS, useDemo__Name__ } from "@dashhaus/core/seeds/__name__";
import type { __Name__SeedName, __Name__Seed } from "@dashhaus/core/seeds/__name__";
import type { CardFootprint } from "../../../shared/ui";

export interface Demo__Name__TileProps {
  /** Which example to show. */
  seed: __Name__SeedName | __Name__Seed;
  /** Container width in px. Width changes anatomy; the selected footprint keeps its height. */
  width?: number;
  footprint?: CardFootprint;
  /** Compact only: false hides the control; the row opens the detail sheet. */
  showControl?: boolean;
  defaultOpen?: boolean;
}

/** A __Name__Tile wired to local demo state. */
export function Demo__Name__Tile({ seed, width, footprint, showControl, defaultOpen }: Demo__Name__TileProps) {
  const demo = useDemo__Name__((typeof seed === "string" ? __CONST___SEEDS[seed] : seed));
  return (
    <div style={{ width, maxWidth: "100%" }}>
      <__Name__Tile {...demo} footprint={footprint} showControl={showControl} defaultOpen={defaultOpen} />
    </div>
  );
}
