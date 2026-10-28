import { detailsTile } from "../../shared/ui";
import type { TileProps } from "../../shared/ui";
import { ToggleCard, ToggleSheet } from "./ToggleCard";
import type { ToggleCardProps } from "./ToggleCard";

export type ToggleTileProps = TileProps<ToggleCardProps>;

/** A dashboard-ready toggle: the card in its size container, plus its detail sheet. */
export const ToggleTile = detailsTile(ToggleCard, ToggleSheet);
