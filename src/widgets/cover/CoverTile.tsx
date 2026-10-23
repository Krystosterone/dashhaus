import { detailsTile } from "../../shared/ui";
import type { TileProps } from "../../shared/ui";
import { CoverWidget, CoverSheet } from "./CoverWidget";
import type { CoverWidgetProps } from "./CoverWidget";

export type CoverTileProps = TileProps<CoverWidgetProps>;

/** A dashboard-ready cover: the card in its size container, plus its detail sheet. */
export const CoverTile = detailsTile(CoverWidget, CoverSheet);
