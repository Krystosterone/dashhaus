import { useHaGuestWifi } from "@dashhaus/core";
import type { GuestWifiHandlers, HaGuestWifiOptions } from "@dashhaus/core";
import { GuestWifiTile } from "../cards/guestWifi/GuestWifiTile";
import type { GuestWifiTileProps } from "../cards/guestWifi/GuestWifiTile";

export interface HaGuestWifiTileProps extends HaGuestWifiOptions, Omit<GuestWifiTileProps, "entity" | keyof GuestWifiHandlers> {
  /** What holds the code or password: UniFi Hotspot Manager's `sensor.<site>_voucher`, or a `sensor.*`, `input_text.*` or `text.*`. */
  entityId: string;
}

/** A live guest Wi-Fi tile: the useHaGuestWifi hook above the presentational tile, its two buttons in the sheet. */
export function HaGuestWifiTile({ entityId, access, network, qrEntityId, newCodeEntityId, refreshEntityId, name, area, lastSeen, onActionError, ...props }: HaGuestWifiTileProps) {
  const wifi = useHaGuestWifi(entityId, { access, network, qrEntityId, newCodeEntityId, refreshEntityId, name, area, lastSeen, onActionError });
  return <GuestWifiTile {...props} entity={wifi.entity} {...wifi.actions} />;
}
