import { useHaMediaPlayer, useHaMoreInfo } from "@dashhaus/core";
import type { HaMediaPlayerOptions } from "@dashhaus/core";
import type { MediaPlayerHandlers } from "@dashhaus/core";
import { MediaPlayerTile } from "../cards/mediaPlayer/MediaPlayerTile";
import type { MediaPlayerTileProps } from "../cards/mediaPlayer/MediaPlayerTile";

export interface HaMediaPlayerTileProps extends HaMediaPlayerOptions, Omit<MediaPlayerTileProps, "entity" | "history" | "onOpenMore" | keyof MediaPlayerHandlers> {
  entityId: string;
}

/**
 * A live media player tile: the useHaMediaPlayer hook above the presentational tile, its artwork included. Its sheet's
 * Open in Home Assistant pill opens Home Assistant's own player (`useHaMoreInfo`) where the host has it. `quiet` is the
 * dashboard's: no progress line and no clock.
 */
export function HaMediaPlayerTile({ entityId, name, area, lastSeen, history, loadHistory, onActionError, ...props }: HaMediaPlayerTileProps) {
  const live = useHaMediaPlayer(entityId, { name, area, lastSeen, history, loadHistory, onActionError });
  const openMore = useHaMoreInfo(entityId);
  return <MediaPlayerTile {...props} entity={live.entity} history={live.history} {...live.actions} onOpenMore={openMore} />;
}
