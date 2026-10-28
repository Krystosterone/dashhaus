import { __Name__Tile } from "../__Name__Tile";
import { __CONST___SEEDS } from "./readings";
import type { __Name__SeedName, __Name__Seed } from "./readings";
import type { CardFootprint } from "../../../shared/ui";

export interface Demo__Name__TileProps {
  /** Which example to show. */
  seed: __Name__SeedName | __Name__Seed;
  /** Container width in px. Width changes anatomy; the selected footprint keeps its height. */
  width?: number;
  footprint?: CardFootprint;
  /** Compact only: false hides the reading; the row opens the detail sheet. */
  showControl?: boolean;
  defaultOpen?: boolean;
}

/** A __Name__Tile with example data. */
export function Demo__Name__Tile({ seed, width, footprint, showControl, defaultOpen }: Demo__Name__TileProps) {
  const s = (typeof seed === "string" ? __CONST___SEEDS[seed] : seed);
  return (
    <div style={{ width, maxWidth: "100%" }}>
      <__Name__Tile entity={s.entity} history={s.history} footprint={footprint} showControl={showControl} defaultOpen={defaultOpen} />
    </div>
  );
}
