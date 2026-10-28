import { useMemo } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { HaOwletTile } from "./HaOwletTile";
import { HaProvider } from "../../../ha/provider";
import { createHaStore } from "../../../ha/store";
import { createDemoOwletHaTransport, owletDemoEntities } from "../../../ha/demo/owlet";
import type { HassEntities } from "../../../ha/types";

const meta = {
  title: "Orb/Home Assistant/Owlet",
  parameters: { layout: "centered" },
} satisfies Meta;
export default meta;

type Story = StoryObj<typeof meta>;

/** The real store, mapper and history path over an injected demo transport: one sock, three sensors. */
function DemoConnectedOwlet({ defaultOpen, seed }: { defaultOpen?: boolean; seed?: HassEntities }) {
  const store = useMemo(() => createHaStore(createDemoOwletHaTransport(seed)), [seed]);
  return (
    <HaProvider store={store}>
      <div style={{ width: 420, maxWidth: "90vw", display: "grid", gap: 8 }}>
        <HaOwletTile entityId="sensor.owlet_sock_ac000w0123_sleep_state" name="Nova" footprint="featured" defaultOpen={defaultOpen} />
        <HaOwletTile entityId="sensor.owlet_sock_ac000w0123_sleep_state" name="Nova" footprint="compact" />
      </div>
    </HaProvider>
  );
}

export const InjectedTransport: Story = { render: () => <DemoConnectedOwlet /> };
export const InjectedTransportSheet: Story = { name: "Injected transport, sheet", render: () => <DemoConnectedOwlet defaultOpen /> };

/** The base station sounds a low-oxygen alert, read from its binary sensor like any other entity. */
const lowOxygen = owletDemoEntities({
  "sensor.owlet_sock_ac000w0123_o2_saturation": "84",
  "binary_sensor.owlet_sock_ac000w0123_low_oxygen_alert": "on",
  "binary_sensor.owlet_sock_ac000w0123_low_battery_alert": "on",
});
export const InjectedTransportAlert: Story = { name: "Injected transport, low oxygen alert", render: () => <DemoConnectedOwlet seed={lowOxygen} /> };
