import { detailsTile } from "../../shared/ui";
import type { TileProps } from "../../shared/ui";
import { BinarySensorCard, BinarySensorSheet } from "./BinarySensorCard";
import type { BinarySensorCardProps } from "./BinarySensorCard";

export type BinarySensorTileProps = TileProps<BinarySensorCardProps>;

/** A dashboard-ready binary sensor: the card in its size container, plus its detail sheet. */
export const BinarySensorTile = detailsTile(BinarySensorCard, BinarySensorSheet);
