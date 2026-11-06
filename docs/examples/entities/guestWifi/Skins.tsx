import { HaGuestWifiTile } from "@dashhaus/orb";
import { HaGuestWifiModule } from "@dashhaus/field";

/** Featured, the tile carries the join QR code: a hall or a wall panel's guest corner. */
export function OrbGuestWifi() {
  return <HaGuestWifiTile entityId="sensor.67d9d6d6ad84e044caf4621c_voucher" footprint="featured" />;
}

/** A code sensor whose companions aren't named after it: name them. */
export function FieldGuestWifi() {
  return (
    <HaGuestWifiModule
      entityId="sensor.visitors_code"
      name="Visitors"
      qrEntityId="image.visitors_join"
      newCodeEntityId="button.visitors_new_code"
      refreshEntityId="button.visitors_fetch"
    />
  );
}
