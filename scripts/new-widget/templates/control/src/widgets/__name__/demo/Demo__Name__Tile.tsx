import { __Name__Tile } from "../__Name__Tile";
import { __CONST___SEEDS, useDemo__Name__ } from "./useDemo__Name__";
import type { __Name__SeedName } from "./useDemo__Name__";
import type { WidgetFootprint } from "../../../shared/ui";

export interface Demo__Name__TileProps {
  /** Which example to show. */
  seed: __Name__SeedName;
  /** Container width in px. Width changes anatomy; the selected footprint keeps its height. */
  width?: number;
  footprint?: WidgetFootprint;
  /** Compact only: false hides the control; the row opens the detail sheet. */
  showControl?: boolean;
  defaultOpen?: boolean;
}

/** A __Name__Tile wired to local demo state. */
export function Demo__Name__Tile({ seed, width, footprint, showControl, defaultOpen }: Demo__Name__TileProps) {
  const demo = useDemo__Name__(__CONST___SEEDS[seed]);
  return (
    <div style={{ width, maxWidth: "100%" }}>
      <__Name__Tile {...demo} footprint={footprint} showControl={showControl} defaultOpen={defaultOpen} />
    </div>
  );
}
