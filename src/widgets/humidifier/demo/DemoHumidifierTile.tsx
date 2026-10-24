import { HumidifierTile } from "../HumidifierTile";
import { HUMIDIFIER_SEEDS, useDemoHumidifier } from "./useDemoHumidifier";
import type { HumidifierSeedName } from "./useDemoHumidifier";
import type { WidgetFootprint } from "../../../shared/ui";

export interface DemoHumidifierTileProps {
  /** Which example to show. */
  seed: HumidifierSeedName;
  /** Container width in px. Width changes anatomy; the selected footprint keeps its height. */
  width?: number;
  footprint?: WidgetFootprint;
  /** Compact only: false hides the control; the row opens the detail sheet. */
  showControl?: boolean;
  defaultOpen?: boolean;
}

/** A HumidifierTile wired to local demo state. */
export function DemoHumidifierTile({ seed, width, footprint, showControl, defaultOpen }: DemoHumidifierTileProps) {
  const demo = useDemoHumidifier(HUMIDIFIER_SEEDS[seed]);
  return (
    <div style={{ width, maxWidth: "100%" }}>
      <HumidifierTile {...demo} footprint={footprint} showControl={showControl} defaultOpen={defaultOpen} />
    </div>
  );
}
