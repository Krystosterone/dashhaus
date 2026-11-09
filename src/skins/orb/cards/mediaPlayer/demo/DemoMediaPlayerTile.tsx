import { MediaPlayerTile } from "../MediaPlayerTile";
import { MEDIA_PLAYER_SEEDS, useDemoMediaPlayer } from "@dashhaus/core/seeds/mediaPlayer";
import type { MediaPlayerSeedName, MediaPlayerSeed } from "@dashhaus/core/seeds/mediaPlayer";
import type { CardFootprint } from "../../../shared/ui";

export interface DemoMediaPlayerTileProps {
  /** Which example to show. */
  seed: MediaPlayerSeedName | MediaPlayerSeed;
  /** Container width in px. Width changes anatomy; the selected footprint keeps its height. */
  width?: number;
  footprint?: CardFootprint;
  /** Compact only: false hides the control; the row opens the detail sheet. */
  showControl?: boolean;
  /** The dashboard's `quiet`: no progress line and no clock. */
  quiet?: boolean;
  defaultOpen?: boolean;
  /** Give it Home Assistant's own player to open, as inside Home Assistant: the sheet's last pill opens it (here, nothing). */
  more?: boolean;
}

const openNothing = () => {};

/**
 * A MediaPlayerTile wired to local demo state. Storybook has no Home Assistant player to open, so the sheet has no
 * pill to one; with `more`, it stands in for one that opens nothing.
 */
export function DemoMediaPlayerTile({ seed, width, footprint, showControl, quiet, defaultOpen, more }: DemoMediaPlayerTileProps) {
  const demo = useDemoMediaPlayer((typeof seed === "string" ? MEDIA_PLAYER_SEEDS[seed] : seed));
  return (
    <div style={{ width, maxWidth: "100%" }}>
      <MediaPlayerTile {...demo} footprint={footprint} showControl={showControl} quiet={quiet} defaultOpen={defaultOpen} onOpenMore={more ? openNothing : undefined} />
    </div>
  );
}
