import { useMemo } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { HaSensorModule } from "./HaSensorModule";
import { HaProvider } from "../../../ha/provider";
import { createHaStore } from "../../../ha/store";
import { createDemoSensorHaTransport } from "../../../ha/demo";

const meta = {
  title: "Field/Connected/Sensor",
  parameters: { layout: "centered" },
} satisfies Meta;
export default meta;

type Story = StoryObj<typeof meta>;

function DemoConnectedSensor() {
  const store = useMemo(() => createHaStore(createDemoSensorHaTransport()), []);
  const companions = { humidityEntityId: "sensor.living_room_humidity", batteryEntityId: "sensor.living_room_battery" };
  return (
    <HaProvider store={store}>
      <div style={{ width: 340, maxWidth: "90vw", display: "grid", gap: 8 }}>
        <HaSensorModule entityId="sensor.living_room_temperature" {...companions} />
        <HaSensorModule entityId="sensor.living_room_temperature" {...companions} footprint="compact" />
      </div>
    </HaProvider>
  );
}

/** The same skin-free hook orb's sensor tile uses, over the demo transport: the temperature with its humidity and battery companions. */
export const InjectedTransport: Story = { render: () => <DemoConnectedSensor /> };
