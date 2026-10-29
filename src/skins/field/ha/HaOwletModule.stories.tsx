import { useMemo } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { HaOwletModule } from "./HaOwletModule";
import { HaProvider } from "../../../ha/provider";
import { createHaStore } from "../../../ha/store";
import { createDemoOwletHaTransport } from "../../../ha/demo/owlet";

const meta = {
  title: "Field/Connected/Owlet",
  parameters: { layout: "centered" },
} satisfies Meta;
export default meta;

type Story = StoryObj<typeof meta>;

function DemoConnectedOwlet() {
  const store = useMemo(() => createHaStore(createDemoOwletHaTransport()), []);
  return (
    <HaProvider store={store}>
      <div style={{ width: 340, maxWidth: "90vw", display: "grid", gap: 8 }}>
        <HaOwletModule entityId="sensor.owlet_sock_ac000w0123_sleep_state" name="Nova" area="Nursery" />
        <HaOwletModule entityId="sensor.owlet_sock_ac000w0123_sleep_state" name="Nova" area="Nursery" footprint="compact" />
      </div>
    </HaProvider>
  );
}

/**
 * The same skin-free hook orb's owlet tile uses, over the demo transport: a new heart rate every 5 s, its alerts and
 * charging sensors found beside the sleep state, and the base station switched from the panel.
 */
export const InjectedTransport: Story = { render: () => <DemoConnectedOwlet /> };
