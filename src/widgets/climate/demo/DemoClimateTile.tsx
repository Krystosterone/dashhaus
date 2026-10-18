import { ClimateTile } from "../ClimateTile";
import { CLIMATE_SEEDS, useDemoClimate } from "./useDemoClimate";
import type { ClimateSeedName } from "./useDemoClimate";

export interface DemoClimateTileProps {
  /** Which example climate entity to show. */
  unit: ClimateSeedName;
  /** Container width in px. The widget picks its size from this. */
  width?: number;
  density?: "regular" | "thin";
  /** Thin only: false hides the control; the row opens the details sheet. */
  showControl?: boolean;
  defaultOpen?: boolean;
}

/** A ClimateTile wired to local demo state. */
export function DemoClimateTile({ unit, width, density, showControl, defaultOpen }: DemoClimateTileProps) {
  const demo = useDemoClimate(CLIMATE_SEEDS[unit]);
  return (
    <div style={{ width, maxWidth: "100%" }}>
      <ClimateTile {...demo} density={density} showControl={showControl} defaultOpen={defaultOpen} />
    </div>
  );
}
