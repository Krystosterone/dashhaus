import { ToggleTile } from "../ToggleTile";
import { TOGGLE_SEEDS, useDemoToggle } from "./useDemoToggle";
import type { ToggleSeedName } from "./useDemoToggle";

export interface DemoToggleTileProps {
  /** Which example mode to show. */
  mode: ToggleSeedName;
  /** Container width in px. The widget picks its size from this. */
  width?: number;
  density?: "regular" | "thin";
  defaultOpen?: boolean;
}

/** A ToggleTile wired to local demo state. */
export function DemoToggleTile({ mode, width, density, defaultOpen }: DemoToggleTileProps) {
  const demo = useDemoToggle(TOGGLE_SEEDS[mode]);
  return (
    <div style={{ width, maxWidth: "100%" }}>
      <ToggleTile {...demo} density={density} defaultOpen={defaultOpen} />
    </div>
  );
}
