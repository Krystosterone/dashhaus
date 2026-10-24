import { detailsTile } from "../../shared/ui";
import type { TileProps } from "../../shared/ui";
import { HumidifierWidget, HumidifierSheet } from "./HumidifierWidget";
import type { HumidifierWidgetProps } from "./HumidifierWidget";

export type HumidifierTileProps = TileProps<HumidifierWidgetProps>;

/** A dashboard-ready humidifier: the card in its size container, plus its detail sheet. */
export const HumidifierTile = detailsTile(HumidifierWidget, HumidifierSheet);
