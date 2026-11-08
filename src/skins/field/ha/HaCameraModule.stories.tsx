import { useMemo } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { HaCameraModule } from "./HaCameraModule";
import { HaProvider } from "@dashhaus/core";
import { createHaStore } from "@dashhaus/core";
import { createDemoCameraHaTransport } from "@dashhaus/core/demo";

const meta = {
  title: "Field/Connected/Camera",
  parameters: { layout: "centered" },
} satisfies Meta;
export default meta;

type Story = StoryObj<typeof meta>;

function DemoConnectedCamera() {
  const store = useMemo(() => createHaStore(createDemoCameraHaTransport()), []);
  return (
    <HaProvider store={store}>
      <div style={{ width: 340, maxWidth: "90vw", display: "grid", gap: 8 }}>
        <HaCameraModule entityId="camera.front_door" />
        <HaCameraModule entityId="camera.nursery" />
        <HaCameraModule entityId="camera.nursery" footprint="compact" />
      </div>
    </HaProvider>
  );
}

/**
 * The same skin-free hook orb's camera tile uses, over the demo transport: Home Assistant's signed `entity_picture`
 * resolved by the transport to a local still. Storybook has no more-info dialog, so a press opens the panel.
 */
export const InjectedTransport: Story = { render: () => <DemoConnectedCamera /> };
