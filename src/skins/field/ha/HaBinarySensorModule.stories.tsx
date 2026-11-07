import { useMemo } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { HaBinarySensorModule } from "./HaBinarySensorModule";
import { HaProvider } from "@dashhaus/core";
import { createHaStore } from "@dashhaus/core";
import { createDemoBinarySensorHaTransport } from "@dashhaus/core/demo";

const meta = {
  title: "Field/Connected/BinarySensor",
  parameters: { layout: "centered" },
} satisfies Meta;
export default meta;

type Story = StoryObj<typeof meta>;

function DemoConnectedBinarySensor() {
  const store = useMemo(() => createHaStore(createDemoBinarySensorHaTransport()), []);
  return (
    <HaProvider store={store}>
      <div style={{ width: 340, maxWidth: "90vw", display: "grid", gap: 8 }}>
        <HaBinarySensorModule entityId="binary_sensor.patio_door" batteryEntityId="sensor.patio_door_battery" />
        <HaBinarySensorModule entityId="binary_sensor.bedroom_window" footprint="compact" />
        <HaBinarySensorModule entityId="binary_sensor.kitchen_leak" footprint="compact" />
        <HaBinarySensorModule entityId="binary_sensor.hallway_smoke" footprint="compact" />
      </div>
    </HaProvider>
  );
}

/** The same skin-free hook orb's binary sensor tile uses, over the demo transport: every module follows the store, the door with its battery beside it. */
export const InjectedTransport: Story = { render: () => <DemoConnectedBinarySensor /> };
