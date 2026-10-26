import { ToggleTile } from "../ToggleTile";
import { TOGGLE_SEEDS, useDemoToggle } from "./useDemoToggle";
import type { ToggleSeedName } from "./useDemoToggle";

export interface DemoToggleTileProps {
  /** Which example mode to show. */
  mode: ToggleSeedName;
  /** Container width in px. Width changes anatomy; the selected footprint keeps its height. */
  width?: number;
  footprint?: "compact" | "standard" | "featured";
  /** Compact only: false hides the control; the row opens the detail sheet. */
  showControl?: boolean;
  defaultOpen?: boolean;
}

/** A ToggleTile wired to local demo state. */
export function DemoToggleTile({ mode, width, footprint, showControl, defaultOpen }: DemoToggleTileProps) {
  const demo = useDemoToggle(TOGGLE_SEEDS[mode]);
  return (
    <div style={{ width, maxWidth: "100%" }}>
      <ToggleTile {...demo} footprint={footprint} showControl={showControl} defaultOpen={defaultOpen} />
    </div>
  );
}
