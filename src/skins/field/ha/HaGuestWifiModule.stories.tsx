import { useMemo } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { HaGuestWifiModule } from "./HaGuestWifiModule";
import { HaProvider } from "@dashhaus/core";
import { createHaStore } from "@dashhaus/core";
import { createDemoGuestWifiHaTransport } from "@dashhaus/core/demo";

const meta = {
  title: "Field/Connected/GuestWifi",
  parameters: { layout: "centered" },
} satisfies Meta;
export default meta;

type Story = StoryObj<typeof meta>;

function DemoConnectedGuestWifi() {
  const store = useMemo(() => createHaStore(createDemoGuestWifiHaTransport()), []);
  return (
    <HaProvider store={store}>
      <div style={{ width: 340, maxWidth: "90vw", display: "grid", gap: 8 }}>
        <HaGuestWifiModule entityId="sensor.guest_wifi_voucher" />
        <HaGuestWifiModule entityId="sensor.guest_wifi_voucher" footprint="compact" />
        <HaGuestWifiModule entityId="input_text.guest_wifi_password" network="Maple Guests 5G" qrEntityId="image.guest_wifi_password_qr" newCodeEntityId="script.new_guest_wifi_password" />
      </div>
    </HaProvider>
  );
}

/** The same skin-free hook orb's guest wifi tile uses, over the demo transport: both modules follow the store. */
export const InjectedTransport: Story = { render: () => <DemoConnectedGuestWifi /> };
