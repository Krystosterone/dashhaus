import { HaGuestWifiTile } from "@dashhaus/orb";

/**
 * A network with a Wi-Fi password, kept in an `input_text`: name its network, its QR code image if it has one, and
 * what changes the password. New password asks first, since devices already joined then need it.
 */
export function GuestPassword() {
  return (
    <HaGuestWifiTile
      entityId="input_text.guest_wifi_password"
      network="Maple Guests 5G"
      qrEntityId="image.guest_wifi_qr"
      newCodeEntityId="script.new_guest_wifi_password"
    />
  );
}
