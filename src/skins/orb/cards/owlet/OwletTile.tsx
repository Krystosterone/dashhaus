import { detailsTile } from "../../shared/ui";
import type { TileProps } from "../../shared/ui";
import { OwletCard, OwletSheet } from "./OwletCard";
import type { OwletCardProps } from "./OwletCard";

export type OwletTileProps = TileProps<OwletCardProps>;

/** A dashboard-ready owlet: the card in its size container, plus its detail sheet. */
export const OwletTile = detailsTile(OwletCard, OwletSheet);
