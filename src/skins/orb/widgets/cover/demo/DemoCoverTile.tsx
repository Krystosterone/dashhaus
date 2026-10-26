import { CoverTile } from "../CoverTile";
import { COVER_SEEDS, useDemoCover } from "./useDemoCover";
import type { CoverSeedName } from "./useDemoCover";

export interface DemoCoverTileProps {
  /** Which example cover to show. */
  cover: CoverSeedName;
  /** Container width in px. Width changes anatomy; the selected footprint keeps its height. */
  width?: number;
  footprint?: "compact" | "standard" | "featured";
  /** Compact only: false hides the control; the row opens the detail sheet. */
  showControl?: boolean;
  defaultOpen?: boolean;
}

/** A CoverTile wired to local demo state, travel included. */
export function DemoCoverTile({ cover, width, footprint, showControl, defaultOpen }: DemoCoverTileProps) {
  const demo = useDemoCover(COVER_SEEDS[cover]);
  return (
    <div style={{ width, maxWidth: "100%" }}>
      <CoverTile {...demo} footprint={footprint} showControl={showControl} defaultOpen={defaultOpen} />
    </div>
  );
}
