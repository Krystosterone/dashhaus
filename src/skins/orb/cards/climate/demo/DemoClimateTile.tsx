import { ClimateTile } from "../ClimateTile";
import { CLIMATE_SEEDS, useDemoClimate } from "./useDemoClimate";
import type { ClimateSeedName, ClimateSeed } from "./useDemoClimate";

export interface DemoClimateTileProps {
  /** Which example climate entity to show. */
  unit: ClimateSeedName | ClimateSeed;
  /** Container width in px. Width changes anatomy; the selected footprint keeps its height. */
  width?: number;
  footprint?: "compact" | "standard" | "featured";
  /** Compact only: false hides the control; the row opens the detail sheet. */
  showControl?: boolean;
  defaultOpen?: boolean;
}

/** A ClimateTile wired to local demo state. */
export function DemoClimateTile({ unit, width, footprint, showControl, defaultOpen }: DemoClimateTileProps) {
  const demo = useDemoClimate((typeof unit === "string" ? CLIMATE_SEEDS[unit] : unit));
  return (
    <div style={{ width, maxWidth: "100%" }}>
      <ClimateTile {...demo} footprint={footprint} showControl={showControl} defaultOpen={defaultOpen} />
    </div>
  );
}
