import { detailsTile } from "../../shared/ui";
import type { TileProps } from "../../shared/ui";
import { ToggleWidget, ToggleSheet } from "./ToggleWidget";
import type { ToggleWidgetProps } from "./ToggleWidget";

export type ToggleTileProps = TileProps<ToggleWidgetProps>;

/** A dashboard-ready toggle: the card in its size container, plus its detail sheet. */
export const ToggleTile = detailsTile(ToggleWidget, ToggleSheet);
