import { useMemo } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { HaBinarySensorTile } from "./HaBinarySensorTile";
import { HaProvider } from "@dashhaus/core";
import { createHaStore } from "@dashhaus/core";
import { createDemoBinarySensorHaTransport } from "@dashhaus/core/demo";

const meta = {
  title: "Orb/Connected/BinarySensor",
  parameters: { layout: "centered" },
} satisfies Meta;
export default meta;

type Story = StoryObj<typeof meta>;

/** The real store, mapper and history path over an injected demo transport, with the door's battery beside it. */
function DemoConnectedBinarySensor() {
  const store = useMemo(() => createHaStore(createDemoBinarySensorHaTransport()), []);
  return (
    <HaProvider store={store}>
      <div style={{ width: 420, maxWidth: "90vw", display: "grid", gap: 8 }}>
        <HaBinarySensorTile entityId="binary_sensor.patio_door" batteryEntityId="sensor.patio_door_battery" footprint="featured" />
        <HaBinarySensorTile entityId="binary_sensor.bedroom_window" footprint="compact" />
        <HaBinarySensorTile entityId="binary_sensor.kitchen_leak" footprint="compact" />
        <HaBinarySensorTile entityId="binary_sensor.hallway_smoke" footprint="compact" />
      </div>
    </HaProvider>
  );
}

export const InjectedTransport: Story = { render: () => <DemoConnectedBinarySensor /> };
