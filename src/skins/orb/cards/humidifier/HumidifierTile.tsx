import { detailsTile } from "../../shared/ui";
import type { TileProps } from "../../shared/ui";
import { HumidifierCard, HumidifierSheet } from "./HumidifierCard";
import type { HumidifierCardProps } from "./HumidifierCard";

export type HumidifierTileProps = TileProps<HumidifierCardProps>;

/** A dashboard-ready humidifier: the card in its size container, plus its detail sheet. */
export const HumidifierTile = detailsTile(HumidifierCard, HumidifierSheet);
