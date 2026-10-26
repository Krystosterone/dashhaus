import { detailsTile } from "../../shared/ui";
import type { TileProps } from "../../shared/ui";
import { OwletWidget, OwletSheet } from "./OwletWidget";
import type { OwletWidgetProps } from "./OwletWidget";

export type OwletTileProps = TileProps<OwletWidgetProps>;

/** A dashboard-ready owlet: the card in its size container, plus its detail sheet. */
export const OwletTile = detailsTile(OwletWidget, OwletSheet);
