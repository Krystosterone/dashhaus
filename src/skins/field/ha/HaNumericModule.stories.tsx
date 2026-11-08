import { useMemo } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { HaNumericModule } from "./HaNumericModule";
import { HaProvider } from "@dashhaus/core";
import { createHaStore } from "@dashhaus/core";
import { createDemoNumericHaTransport } from "@dashhaus/core/demo";

const meta = {
  title: "Field/Connected/Numeric",
  parameters: { layout: "centered" },
} satisfies Meta;
export default meta;

type Story = StoryObj<typeof meta>;

function DemoConnectedNumeric() {
  const store = useMemo(() => createHaStore(createDemoNumericHaTransport()), []);
  return (
    <HaProvider store={store}>
      <div style={{ width: 340, maxWidth: "90vw", display: "grid", gap: 8 }}>
        <HaNumericModule entityId="sensor.living_room_co2" />
        <HaNumericModule entityId="sensor.dishwasher_power" footprint="compact" warnAbove={1500} />
        <HaNumericModule entityId="sensor.house_energy" footprint="compact" />
        <HaNumericModule entityId="sensor.grid_power" footprint="compact" />
      </div>
    </HaProvider>
  );
}

/** The same skin-free hook orb's numeric tile uses, over the demo transport: both modules follow the store. */
export const InjectedTransport: Story = { render: () => <DemoConnectedNumeric /> };
