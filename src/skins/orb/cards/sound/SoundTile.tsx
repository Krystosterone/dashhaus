import { detailsTile } from "../../shared/ui";
import type { TileProps } from "../../shared/ui";
import { SoundCard, SoundSheet } from "./SoundCard";
import type { SoundCardProps } from "./SoundCard";

export type SoundTileProps = TileProps<SoundCardProps>;

/** A dashboard-ready sound: the card in its size container, plus its detail sheet. */
export const SoundTile = detailsTile(SoundCard, SoundSheet);
