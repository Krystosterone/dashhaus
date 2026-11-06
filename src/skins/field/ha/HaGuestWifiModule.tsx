import { useHaGuestWifi } from "@dashhaus/core";
import type { HaGuestWifiOptions } from "@dashhaus/core";
import { GuestWifiModule } from "../cards/guestWifi/GuestWifiModule";
import type { GuestWifiModuleProps } from "../cards/guestWifi/GuestWifiModule";

export interface HaGuestWifiModuleProps extends HaGuestWifiOptions, Pick<GuestWifiModuleProps, "footprint" | "defaultOpen"> {
  /** What holds the code or password: UniFi Hotspot Manager's `sensor.<site>_voucher`, or a `sensor.*`, `input_text.*` or `text.*`. */
  entityId: string;
}

/** A live guest Wi-Fi module: the useHaGuestWifi hook above field's module, its two buttons in the panel. */
export function HaGuestWifiModule({ entityId, footprint, defaultOpen, ...options }: HaGuestWifiModuleProps) {
  const { entity, actions } = useHaGuestWifi(entityId, options);
  return <GuestWifiModule entity={entity} footprint={footprint} defaultOpen={defaultOpen} {...actions} />;
}
