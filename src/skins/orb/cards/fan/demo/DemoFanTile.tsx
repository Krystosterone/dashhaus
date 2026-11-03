import { FanTile } from "../FanTile";
import { FAN_SEEDS, useDemoFan } from "./useDemoFan";
import type { FanSeedName, FanSeed } from "./useDemoFan";
import type { CardFootprint } from "../../../shared/ui";

export interface DemoFanTileProps {
  /** Which example to show. */
  seed: FanSeedName | FanSeed;
  /** Container width in px. Width changes anatomy; the selected footprint keeps its height. */
  width?: number;
  footprint?: CardFootprint;
  /** Compact only: false hides the control; the row opens the detail sheet. */
  showControl?: boolean;
  defaultOpen?: boolean;
}

/** A FanTile wired to local demo state. */
export function DemoFanTile({ seed, width, footprint, showControl, defaultOpen }: DemoFanTileProps) {
  const demo = useDemoFan((typeof seed === "string" ? FAN_SEEDS[seed] : seed));
  return (
    <div style={{ width, maxWidth: "100%" }}>
      <FanTile {...demo} footprint={footprint} showControl={showControl} defaultOpen={defaultOpen} />
    </div>
  );
}
