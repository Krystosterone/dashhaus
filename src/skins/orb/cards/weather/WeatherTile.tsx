import { detailsTile } from "../../shared/ui";
import type { TileProps } from "../../shared/ui";
import { WeatherCard, WeatherSheet } from "./WeatherCard";
import type { WeatherCardProps } from "./WeatherCard";

export type WeatherTileProps = TileProps<WeatherCardProps>;

/** A dashboard-ready weather card: the card in its size container, plus its detail sheet. */
export const WeatherTile = detailsTile(WeatherCard, WeatherSheet);
