import { CameraTile } from "../CameraTile";
import { CAMERA_SEEDS } from "@dashhaus/core/seeds/camera";
import type { CameraSeedName, CameraSeed } from "@dashhaus/core/seeds/camera";
import type { CardFootprint } from "../../../shared/ui";

export interface DemoCameraTileProps {
  /** Which example to show. */
  seed: CameraSeedName | CameraSeed;
  /** Container width in px. Width changes anatomy; the selected footprint keeps its height. */
  width?: number;
  footprint?: CardFootprint;
  /** Compact only: false hides the reading; the row opens the detail sheet. */
  showControl?: boolean;
  /** False: no still, as a dashboard's `stills: false` or a card's `still: false`. */
  still?: boolean;
  /** Hold the still, as a `quiet` dashboard does. */
  paused?: boolean;
  defaultOpen?: boolean;
  /** Give it a live stream to open, as Home Assistant does: the still and the sheet's Live view pill open it (here, nothing). */
  live?: boolean;
}

const openNothing = () => {};

/**
 * A CameraTile with example data. Storybook has no live stream to open, so the still opens the details, as the name
 * does; with `live`, it stands in for one that opens nothing.
 */
export function DemoCameraTile({ seed, width, footprint, showControl, still, paused, defaultOpen, live }: DemoCameraTileProps) {
  const s = (typeof seed === "string" ? CAMERA_SEEDS[seed] : seed);
  return (
    <div style={{ width, maxWidth: "100%" }}>
      <CameraTile entity={s.entity} footprint={footprint} showControl={showControl} still={still} paused={paused} defaultOpen={defaultOpen} onOpenLive={live ? openNothing : undefined} />
    </div>
  );
}
