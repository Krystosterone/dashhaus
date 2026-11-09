import { detailsTile } from "../../shared/ui";
import type { TileProps } from "../../shared/ui";
import { DysonCard, DysonSheet } from "./DysonCard";
import type { DysonCardProps } from "./DysonCard";

export type DysonTileProps = TileProps<DysonCardProps>;

/** A dashboard-ready dyson: the card in its size container, plus its detail sheet. */
export const DysonTile = detailsTile(DysonCard, DysonSheet);
