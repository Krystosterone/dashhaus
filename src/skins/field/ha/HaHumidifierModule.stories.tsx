import { useMemo } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { HaHumidifierModule } from "./HaHumidifierModule";
import { HaProvider } from "@dashhaus/core";
import { createHaStore } from "@dashhaus/core";
import { createDemoHumidifierHaTransport } from "@dashhaus/core/demo";

const meta = {
  title: "Field/Connected/Humidifier",
  parameters: { layout: "centered" },
} satisfies Meta;
export default meta;

type Story = StoryObj<typeof meta>;

function DemoConnectedHumidifier() {
  const store = useMemo(() => createHaStore(createDemoHumidifierHaTransport()), []);
  return (
    <HaProvider store={store}>
      <div style={{ width: 340, maxWidth: "90vw", display: "grid", gap: 8 }}>
        <HaHumidifierModule entityId="humidifier.bedroom" />
        <HaHumidifierModule entityId="humidifier.bedroom" footprint="compact" />
      </div>
    </HaProvider>
  );
}

/** The same skin-free hook orb's humidifier tile uses, over the demo transport: both modules follow the store. */
export const InjectedTransport: Story = { render: () => <DemoConnectedHumidifier /> };
