import { useMemo } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { HaNumericTile } from "./HaNumericTile";
import { HaProvider } from "@dashhaus/core";
import { createHaStore } from "@dashhaus/core";
import { createDemoNumericHaTransport } from "@dashhaus/core/demo";

const meta = {
  title: "Orb/Connected/Numeric",
  parameters: { layout: "centered" },
} satisfies Meta;
export default meta;

type Story = StoryObj<typeof meta>;

/** The real store, mapper and history path over an injected demo transport: a CO₂ reading, then power, a meter and the grid as rows. */
function DemoConnectedNumeric() {
  const store = useMemo(() => createHaStore(createDemoNumericHaTransport()), []);
  return (
    <HaProvider store={store}>
      <div style={{ width: 420, maxWidth: "90vw", display: "grid", gap: 8 }}>
        <HaNumericTile entityId="sensor.living_room_co2" footprint="featured" />
        <HaNumericTile entityId="sensor.dishwasher_power" footprint="compact" />
        <HaNumericTile entityId="sensor.house_energy" footprint="compact" />
        <HaNumericTile entityId="sensor.grid_power" footprint="compact" />
      </div>
    </HaProvider>
  );
}

export const InjectedTransport: Story = { render: () => <DemoConnectedNumeric /> };
