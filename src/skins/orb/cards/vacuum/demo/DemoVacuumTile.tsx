import { VacuumTile } from "../VacuumTile";
import { VACUUM_SEEDS, useDemoVacuum } from "@dashhaus/core/seeds/vacuum";
import type { VacuumSeedName, VacuumSeed } from "@dashhaus/core/seeds/vacuum";
import type { CardFootprint } from "../../../shared/ui";

export interface DemoVacuumTileProps {
  /** Which example to show. */
  seed: VacuumSeedName | VacuumSeed;
  /** Container width in px. Width changes anatomy; the selected footprint keeps its height. */
  width?: number;
  footprint?: CardFootprint;
  /** Compact only: false hides the control; the row opens the detail sheet. */
  showControl?: boolean;
  defaultOpen?: boolean;
}

/** A VacuumTile wired to local demo state: start, pause, the dock and fan speed answer as a vacuum does. */
export function DemoVacuumTile({ seed, width, footprint, showControl, defaultOpen }: DemoVacuumTileProps) {
  const demo = useDemoVacuum((typeof seed === "string" ? VACUUM_SEEDS[seed] : seed));
  return (
    <div style={{ width, maxWidth: "100%" }}>
      <VacuumTile {...demo} footprint={footprint} showControl={showControl} defaultOpen={defaultOpen} />
    </div>
  );
}
