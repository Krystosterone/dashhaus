import { useMemo } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { HaProvider } from "@dashhaus/core";
import { createHaStore } from "@dashhaus/core";
import { createDemoSensorHaTransport } from "@dashhaus/core/demo";
import { HaGlasshouseSensorCard } from "./HaGlasshouseSensorCard";

const meta = { title: "Studies/Glasshouse/Connected/Sensor", parameters: { layout: "centered" } } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

function Connected() {
  const store = useMemo(() => createHaStore(createDemoSensorHaTransport()), []);
  return <HaProvider store={store}><div style={{ width: 420, maxWidth: "90vw", display: "grid", gap: 8 }}><HaGlasshouseSensorCard entityId="sensor.living_room_temperature" /><HaGlasshouseSensorCard entityId="sensor.living_room_temperature" footprint="compact" /></div></HaProvider>;
}

export const InjectedTransport: Story = { render: () => <Connected /> };
