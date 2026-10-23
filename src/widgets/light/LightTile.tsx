import { detailsTile } from "../../shared/ui";
import type { TileProps } from "../../shared/ui";
import { LightWidget, LightSheet } from "./LightWidget";
import type { LightWidgetProps } from "./LightWidget";

/** `defaultOpen`: start with the detail sheet open. */
export type LightTileProps = TileProps<LightWidgetProps>;

/** A dashboard-ready light: the card in its size container, plus its detail sheet. */
export const LightTile = detailsTile(LightWidget, LightSheet);
