import { useMemo } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { createDemoClimateHaTransport } from "@dashhaus/core/demo";
import { HaProvider } from "@dashhaus/core";
import { createHaStore } from "@dashhaus/core";
import { HaClimateModule } from "./HaClimateModule";

const meta = {
  title: "Field/Connected/Climate",
  parameters: { layout: "centered" },
} satisfies Meta;
export default meta;

type Story = StoryObj<typeof meta>;

function DemoConnectedClimate() {
  const store = useMemo(() => createHaStore(createDemoClimateHaTransport()), []);
  return (
    <HaProvider store={store}>
      <div style={{ width: 340, maxWidth: "90vw", display: "grid", gap: 8 }}>
        <HaClimateModule entityId="climate.living_room" />
        <HaClimateModule entityId="climate.living_room" footprint="compact" />
      </div>
    </HaProvider>
  );
}

/** The shared climate hook over the demo transport: key, target and both modules stay in sync. */
export const InjectedTransport: Story = { render: () => <DemoConnectedClimate /> };
