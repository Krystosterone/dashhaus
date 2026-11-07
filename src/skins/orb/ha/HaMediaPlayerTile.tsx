import { useHaMediaPlayer } from "@dashhaus/core";
import type { HaMediaPlayerOptions } from "@dashhaus/core";
import type { MediaPlayerHandlers } from "@dashhaus/core";
import { MediaPlayerTile } from "../cards/mediaPlayer/MediaPlayerTile";
import type { MediaPlayerTileProps } from "../cards/mediaPlayer/MediaPlayerTile";

export interface HaMediaPlayerTileProps extends HaMediaPlayerOptions, Omit<MediaPlayerTileProps, "entity" | "history" | keyof MediaPlayerHandlers> {
  entityId: string;
}

/** A live media player tile: the useHaMediaPlayer hook above the presentational tile, its artwork included. */
export function HaMediaPlayerTile({ entityId, name, area, lastSeen, history, loadHistory, onActionError, ...props }: HaMediaPlayerTileProps) {
  const live = useHaMediaPlayer(entityId, { name, area, lastSeen, history, loadHistory, onActionError });
  return <MediaPlayerTile {...props} entity={live.entity} history={live.history} {...live.actions} />;
}
