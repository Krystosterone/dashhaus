import { detailsTile } from "../../shared/ui";
import type { TileProps } from "../../shared/ui";
import { SensorWidget, SensorSheet } from "./SensorWidget";
import type { SensorWidgetProps } from "./SensorWidget";

export type SensorTileProps = TileProps<SensorWidgetProps>;

/** A dashboard-ready sensor: the card in its size container, plus its detail sheet. */
export const SensorTile = detailsTile(SensorWidget, SensorSheet);
