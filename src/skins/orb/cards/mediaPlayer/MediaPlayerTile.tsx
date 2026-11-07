import { detailsTile } from "../../shared/ui";
import type { TileProps } from "../../shared/ui";
import { MediaPlayerCard, MediaPlayerSheet } from "./MediaPlayerCard";
import type { MediaPlayerCardProps } from "./MediaPlayerCard";

export type MediaPlayerTileProps = TileProps<MediaPlayerCardProps>;

/** A dashboard-ready media player: the card in its size container, plus its detail sheet. */
export const MediaPlayerTile = detailsTile(MediaPlayerCard, MediaPlayerSheet);
