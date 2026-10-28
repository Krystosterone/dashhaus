import { detailsTile } from "../../shared/ui";
import type { TileProps } from "../../shared/ui";
import { CoverCard, CoverSheet } from "./CoverCard";
import type { CoverCardProps } from "./CoverCard";

export type CoverTileProps = TileProps<CoverCardProps>;

/** A dashboard-ready cover: the card in its size container, plus its detail sheet. */
export const CoverTile = detailsTile(CoverCard, CoverSheet);
