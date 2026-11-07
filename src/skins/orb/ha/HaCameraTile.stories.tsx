import { useMemo } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { HaCameraTile } from "./HaCameraTile";
import { HaProvider } from "@dashhaus/core";
import { createHaStore } from "@dashhaus/core";
import { createDemoCameraHaTransport } from "@dashhaus/core/demo";

const meta = {
  title: "Orb/Connected/Camera",
  parameters: { layout: "centered" },
} satisfies Meta;
export default meta;

type Story = StoryObj<typeof meta>;

/**
 * The real store, mapper and picture path over an injected demo transport: Home Assistant's signed `entity_picture`
 * resolved by the transport to a local still. Storybook has no more-info dialog, so a press opens the details.
 */
function DemoConnectedCamera() {
  const store = useMemo(() => createHaStore(createDemoCameraHaTransport()), []);
  return (
    <HaProvider store={store}>
      <div style={{ width: 420, maxWidth: "90vw", display: "grid", gap: 8 }}>
        <HaCameraTile entityId="camera.front_door" footprint="featured" />
        <HaCameraTile entityId="camera.nursery" />
        <HaCameraTile entityId="camera.nursery" footprint="compact" />
      </div>
    </HaProvider>
  );
}

export const InjectedTransport: Story = { render: () => <DemoConnectedCamera /> };
