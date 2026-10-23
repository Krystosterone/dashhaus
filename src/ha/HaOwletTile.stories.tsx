import { useMemo } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { HaOwletTile } from "./HaOwletTile";
import { HaProvider } from "./provider";
import { createHaStore } from "./store";
import { createDemoOwletHaTransport } from "./demo/owlet";

const meta = {
  title: "Home Assistant/Owlet tile",
  parameters: { layout: "centered" },
} satisfies Meta;
export default meta;

type Story = StoryObj<typeof meta>;

/** The real store, mapper and history path over an injected demo transport: one sock, three sensors. */
function DemoConnectedOwlet({ defaultOpen }: { defaultOpen?: boolean }) {
  const store = useMemo(() => createHaStore(createDemoOwletHaTransport()), []);
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
