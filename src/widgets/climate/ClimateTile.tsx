import { detailsTile } from "../../shared/ui";
import type { TileProps } from "../../shared/ui";
import { ClimateWidget, ClimateSheet } from "./ClimateWidget";
import type { ClimateWidgetProps } from "./ClimateWidget";

export type ClimateTileProps = TileProps<ClimateWidgetProps>;

/** A dashboard-ready climate entity: the card in its size container, plus its detail sheet. */
export const ClimateTile = detailsTile(ClimateWidget, ClimateSheet);
