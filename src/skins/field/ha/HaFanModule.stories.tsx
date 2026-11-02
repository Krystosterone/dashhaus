import { useMemo } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { HaFanModule } from "./HaFanModule";
import { HaProvider } from "@dashhaus/core";
import { createHaStore } from "@dashhaus/core";
import { createDemoFanHaTransport } from "@dashhaus/core/demo";

const meta = {
  title: "Field/Connected/Fan",
  parameters: { layout: "centered" },
} satisfies Meta;
export default meta;

type Story = StoryObj<typeof meta>;

function DemoConnectedFan() {
  const store = useMemo(() => createHaStore(createDemoFanHaTransport()), []);
  return (
    <HaProvider store={store}>
      <div style={{ width: 340, maxWidth: "90vw", display: "grid", gap: 8 }}>
        <HaFanModule entityId="fan.living_room_ceiling" />
        <HaFanModule entityId="fan.bedroom" />
        <HaFanModule entityId="fan.bathroom_extractor" footprint="compact" />
      </div>
    </HaProvider>
  );
}

/** The same skin-free hook orb's fan tile uses, over the demo transport: both modules follow the store. */
export const InjectedTransport: Story = { render: () => <DemoConnectedFan /> };
