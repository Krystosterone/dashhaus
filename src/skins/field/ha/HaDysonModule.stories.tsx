import { useMemo } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { HaDysonModule } from "./HaDysonModule";
import { HaProvider } from "@dashhaus/core";
import { createHaStore } from "@dashhaus/core";
import { createDemoDysonHaTransport } from "@dashhaus/core/demo";

const meta = {
  title: "Field/Connected/Dyson",
  parameters: { layout: "centered" },
} satisfies Meta;
export default meta;

type Story = StoryObj<typeof meta>;

function DemoConnectedDyson() {
  const store = useMemo(() => createHaStore(createDemoDysonHaTransport()), []);
  return (
    <HaProvider store={store}>
      <div style={{ width: 340, maxWidth: "90vw", display: "grid", gap: 8 }}>
        <HaDysonModule entityId="fan.bedroom_purifier" />
        <HaDysonModule entityId="fan.bedroom_purifier" footprint="compact" />
      </div>
    </HaProvider>
  );
}

/** The same skin-free hook orb's dyson tile uses, over the demo transport: both modules follow the store. */
export const InjectedTransport: Story = { render: () => <DemoConnectedDyson /> };
