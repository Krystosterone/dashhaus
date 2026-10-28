import { detailsTile } from "../../shared/ui";
import type { TileProps } from "../../shared/ui";
import { SensorCard, SensorSheet } from "./SensorCard";
import type { SensorCardProps } from "./SensorCard";

export type SensorTileProps = TileProps<SensorCardProps>;

/** A dashboard-ready sensor: the card in its size container, plus its detail sheet. */
export const SensorTile = detailsTile(SensorCard, SensorSheet);
