import { detailsTile } from "../../shared/ui";
import type { TileProps } from "../../shared/ui";
import { SunCard, SunSheet } from "./SunCard";
import type { SunCardProps } from "./SunCard";

export type SunTileProps = TileProps<SunCardProps>;

/** A dashboard-ready sun: the card in its size container, plus its detail sheet. */
export const SunTile = detailsTile(SunCard, SunSheet);
