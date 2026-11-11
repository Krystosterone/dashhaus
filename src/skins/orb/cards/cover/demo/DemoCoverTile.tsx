import { CoverTile } from "../CoverTile";
import { COVER_SEEDS, useDemoCover } from "@dashhaus/core/seeds/cover";
import type { CoverSeedName, CoverSeed } from "@dashhaus/core/seeds/cover";
import type { CoverAsk } from "@dashhaus/core/entities/cover/types";

export interface DemoCoverTileProps {
  /** Which example cover to show. */
  cover: CoverSeedName | CoverSeed;
  /** Container width in px. Width changes anatomy; the selected footprint keeps its height. */
  width?: number;
  footprint?: "compact" | "standard" | "featured";
  /** Compact only: false hides the control; the row opens the detail sheet. */
  showControl?: boolean;
  defaultOpen?: boolean;
  /** With defaultOpen: the sheet opens on this action's question (a garage door, door or gate). */
  defaultAction?: CoverAsk;
}

/** A CoverTile wired to local demo state, travel included. */
export function DemoCoverTile({ cover, width, footprint, showControl, defaultOpen, defaultAction }: DemoCoverTileProps) {
  const demo = useDemoCover((typeof cover === "string" ? COVER_SEEDS[cover] : cover));
  return (
    <div style={{ width, maxWidth: "100%" }}>
      <CoverTile {...demo} footprint={footprint} showControl={showControl} defaultOpen={defaultOpen} defaultAction={defaultAction} />
    </div>
  );
}
