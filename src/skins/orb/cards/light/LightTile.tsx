import { detailsTile } from "../../shared/ui";
import type { TileProps } from "../../shared/ui";
import { LightCard, LightSheet } from "./LightCard";
import type { LightCardProps } from "./LightCard";

/** `defaultOpen`: start with the detail sheet open. */
export type LightTileProps = TileProps<LightCardProps>;

/** A dashboard-ready light: the card in its size container, plus its detail sheet. */
export const LightTile = detailsTile(LightCard, LightSheet);
