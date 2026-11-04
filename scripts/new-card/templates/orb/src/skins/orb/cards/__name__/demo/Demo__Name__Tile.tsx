import { __Name__Tile } from "../__Name__Tile";
import { __CONST___SEEDS__demoImport__ } from "__seeds__";
import type { __Name__Seed, __Name__SeedName } from "__seeds__";
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

/** A __Name__Tile on the domain's demo seeds. */
export function Demo__Name__Tile({ seed: named, width, footprint, showControl, defaultOpen }: Demo__Name__TileProps) {
  const seed = typeof named === "string" ? __CONST___SEEDS[named] : named;
  const demo = __DEMO__;
  return (
    <div style={{ width, maxWidth: "100%" }}>
      <__Name__Tile
        entity={demo.entity}
__historyDemo__
        __demoProps__
        footprint={footprint}
        showControl={showControl}
        defaultOpen={defaultOpen}
      />
    </div>
  );
}
