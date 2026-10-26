import { SoundTile } from "../SoundTile";
import { SOUND_SEEDS, useDemoSound } from "./useDemoSound";
import type { SoundSeedName } from "./useDemoSound";
import type { WidgetFootprint } from "../../../shared/ui";

export interface DemoSoundTileProps {
  /** Which example to show. */
  seed: SoundSeedName;
  /** Container width in px. Width changes anatomy; the selected footprint keeps its height. */
  width?: number;
  footprint?: WidgetFootprint;
  /** Compact only: false hides the control; the row opens the detail sheet. */
  showControl?: boolean;
  defaultOpen?: boolean;
}

/** A SoundTile wired to local demo state. */
export function DemoSoundTile({ seed, width, footprint, showControl, defaultOpen }: DemoSoundTileProps) {
  const demo = useDemoSound(SOUND_SEEDS[seed]);
  return (
    <div style={{ width, maxWidth: "100%" }}>
      <SoundTile {...demo} footprint={footprint} showControl={showControl} defaultOpen={defaultOpen} />
    </div>
  );
}
