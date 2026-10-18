import { CoverTile } from "../CoverTile";
import { COVER_SEEDS, useDemoCover } from "./useDemoCover";
import type { CoverSeedName } from "./useDemoCover";

export interface DemoCoverTileProps {
  /** Which example cover to show. */
  cover: CoverSeedName;
  /** Container width in px. The widget picks its size from this. */
  width?: number;
  density?: "regular" | "thin";
  /** Thin only: false hides the control; the row opens the details sheet. */
  showControl?: boolean;
  defaultOpen?: boolean;
}

/** A CoverTile wired to local demo state, travel included. */
export function DemoCoverTile({ cover, width, density, showControl, defaultOpen }: DemoCoverTileProps) {
  const demo = useDemoCover(COVER_SEEDS[cover]);
  return (
    <div style={{ width, maxWidth: "100%" }}>
      <CoverTile {...demo} density={density} showControl={showControl} defaultOpen={defaultOpen} />
    </div>
  );
}
