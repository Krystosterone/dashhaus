import { useMemo } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { HaSensorTile } from "./HaSensorTile";
import { HaProvider } from "../../../ha/provider";
import { createHaStore } from "../../../ha/store";
import { createDemoSensorHaTransport } from "../../../ha/demo";

const meta = {
  title: "Orb/Home Assistant/Sensor",
  parameters: { layout: "centered" },
} satisfies Meta;
export default meta;

type Story = StoryObj<typeof meta>;

function DemoConnectedSensor() {
  const store = useMemo(() => createHaStore(createDemoSensorHaTransport()), []);
  return (
    <HaProvider store={store}>
      <div style={{ width: 420, maxWidth: "90vw" }}>
        <HaSensorTile
          entityId="sensor.living_room_temperature"
          humidityEntityId="sensor.living_room_humidity"
          batteryEntityId="sensor.living_room_battery"
        />
      </div>
    </HaProvider>
  );
}

export const InjectedTransport: Story = { render: () => <DemoConnectedSensor /> };
