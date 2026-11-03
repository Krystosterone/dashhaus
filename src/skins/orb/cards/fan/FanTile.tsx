import { detailsTile } from "../../shared/ui";
import type { TileProps } from "../../shared/ui";
import { FanCard, FanSheet } from "./FanCard";
import type { FanCardProps } from "./FanCard";

export type FanTileProps = TileProps<FanCardProps>;

/** A dashboard-ready fan: the card in its size container, plus its detail sheet. */
export const FanTile = detailsTile(FanCard, FanSheet);
