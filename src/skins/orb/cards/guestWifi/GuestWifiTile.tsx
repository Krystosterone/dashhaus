import { detailsTile } from "../../shared/ui";
import type { TileProps } from "../../shared/ui";
import { GuestWifiCard, GuestWifiSheet } from "./GuestWifiCard";
import type { GuestWifiCardProps } from "./GuestWifiCard";

export type GuestWifiTileProps = TileProps<GuestWifiCardProps>;

/** A dashboard-ready guest wifi: the card in its size container, plus its detail sheet. */
export const GuestWifiTile = detailsTile(GuestWifiCard, GuestWifiSheet);
