import { detailsTile } from "../../shared/ui";
import type { TileProps } from "../../shared/ui";
import { SoundWidget, SoundSheet } from "./SoundWidget";
import type { SoundWidgetProps } from "./SoundWidget";

export type SoundTileProps = TileProps<SoundWidgetProps>;

/** A dashboard-ready sound: the card in its size container, plus its detail sheet. */
export const SoundTile = detailsTile(SoundWidget, SoundSheet);
