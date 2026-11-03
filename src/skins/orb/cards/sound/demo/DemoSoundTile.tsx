import { SoundTile } from "../SoundTile";
import { SOUND_SEEDS, useDemoSound } from "@dashhaus/core/seeds/sound";
import type { SoundSeedName, SoundSeed } from "@dashhaus/core/seeds/sound";
import type { CardFootprint } from "../../../shared/ui";

export interface DemoSoundTileProps {
  /** Which example to show. */
  seed: SoundSeedName | SoundSeed;
  /** Container width in px. Width changes anatomy; the selected footprint keeps its height. */
  width?: number;
  footprint?: CardFootprint;
  /** Compact only: false hides the control; the row opens the detail sheet. */
  showControl?: boolean;
  defaultOpen?: boolean;
}

/** A SoundTile wired to local demo state. */
export function DemoSoundTile({ seed, width, footprint, showControl, defaultOpen }: DemoSoundTileProps) {
  const demo = useDemoSound((typeof seed === "string" ? SOUND_SEEDS[seed] : seed));
  return (
    <div style={{ width, maxWidth: "100%" }}>
      <SoundTile {...demo} footprint={footprint} showControl={showControl} defaultOpen={defaultOpen} />
    </div>
  );
}
