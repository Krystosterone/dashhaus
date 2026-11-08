import { detailsTile } from "../../shared/ui";
import type { TileProps } from "../../shared/ui";
import { NumericCard, NumericSheet } from "./NumericCard";
import type { NumericCardProps } from "./NumericCard";

export type NumericTileProps = TileProps<NumericCardProps>;

/** A dashboard-ready numeric: the card in its size container, plus its detail sheet. */
export const NumericTile = detailsTile(NumericCard, NumericSheet);
