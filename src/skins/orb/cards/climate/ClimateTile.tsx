import { detailsTile } from "../../shared/ui";
import type { TileProps } from "../../shared/ui";
import { ClimateCard, ClimateSheet } from "./ClimateCard";
import type { ClimateCardProps } from "./ClimateCard";

export type ClimateTileProps = TileProps<ClimateCardProps>;

/** A dashboard-ready climate entity: the card in its size container, plus its detail sheet. */
export const ClimateTile = detailsTile(ClimateCard, ClimateSheet);
