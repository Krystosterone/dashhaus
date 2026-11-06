import { GuestWifiTile } from "../GuestWifiTile";
import { GUEST_WIFI_SEEDS, useDemoGuestWifi } from "@dashhaus/core/seeds/guestWifi";
import type { GuestWifiSeedName, GuestWifiSeed } from "@dashhaus/core/seeds/guestWifi";
import type { CardFootprint } from "../../../shared/ui";

export interface DemoGuestWifiTileProps {
  /** Which example to show. */
  seed: GuestWifiSeedName | GuestWifiSeed;
  /** Container width in px. Width changes anatomy; the selected footprint keeps its height. */
  width?: number;
  footprint?: CardFootprint;
  /** Compact only: false hides the code; the row opens the detail sheet. */
  showControl?: boolean;
  defaultOpen?: boolean;
}

/** A GuestWifiTile wired to local demo state: New code makes one, Refresh says when it last checked. */
export function DemoGuestWifiTile({ seed, width, footprint, showControl, defaultOpen }: DemoGuestWifiTileProps) {
  const demo = useDemoGuestWifi(typeof seed === "string" ? GUEST_WIFI_SEEDS[seed] : seed);
  return (
    <div style={{ width, maxWidth: "100%" }}>
      <GuestWifiTile {...demo} footprint={footprint} showControl={showControl} defaultOpen={defaultOpen} />
    </div>
  );
}
