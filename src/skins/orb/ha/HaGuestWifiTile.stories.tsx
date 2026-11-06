import { useMemo } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { HaGuestWifiTile } from "./HaGuestWifiTile";
import { HaProvider } from "@dashhaus/core";
import { createHaStore } from "@dashhaus/core";
import { createDemoGuestWifiHaTransport } from "@dashhaus/core/demo";

const meta = {
  title: "Orb/Connected/GuestWifi",
  parameters: { layout: "centered" },
} satisfies Meta;
export default meta;

type Story = StoryObj<typeof meta>;

/**
 * The real store, mapper and actions over an injected demo transport: New code in the sheet presses `button.*_create`;
 * the password's New password runs its script.
 */
function DemoConnectedGuestWifi() {
  const store = useMemo(() => createHaStore(createDemoGuestWifiHaTransport()), []);
  return (
    <HaProvider store={store}>
      <div style={{ width: 420, maxWidth: "90vw", display: "grid", gap: 8 }}>
        <HaGuestWifiTile entityId="sensor.guest_wifi_voucher" area="Hall" footprint="featured" />
        <HaGuestWifiTile entityId="sensor.guest_wifi_voucher" area="Hall" footprint="compact" />
        <HaGuestWifiTile entityId="input_text.guest_wifi_password" network="Maple Guests 5G" qrEntityId="image.guest_wifi_password_qr" newCodeEntityId="script.new_guest_wifi_password" area="Hall" />
      </div>
    </HaProvider>
  );
}

export const InjectedTransport: Story = { render: () => <DemoConnectedGuestWifi /> };
