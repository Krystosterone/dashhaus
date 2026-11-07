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
}

/** A CameraTile with example data. Storybook has no live stream to open, so the name and the still open the details. */
export function DemoCameraTile({ seed, width, footprint, showControl, still, paused, defaultOpen }: DemoCameraTileProps) {
  const s = (typeof seed === "string" ? CAMERA_SEEDS[seed] : seed);
  return (
    <div style={{ width, maxWidth: "100%" }}>
      <CameraTile entity={s.entity} footprint={footprint} showControl={showControl} still={still} paused={paused} defaultOpen={defaultOpen} />
    </div>
  );
}
