import { detailsTile } from "../../shared/ui";
import type { TileProps } from "../../shared/ui";
import { WeatherWidget, WeatherSheet } from "./WeatherWidget";
import type { WeatherWidgetProps } from "./WeatherWidget";

export type WeatherTileProps = TileProps<WeatherWidgetProps>;

/** A dashboard-ready weather card: the card in its size container, plus its detail sheet. */
export const WeatherTile = detailsTile(WeatherWidget, WeatherSheet);
