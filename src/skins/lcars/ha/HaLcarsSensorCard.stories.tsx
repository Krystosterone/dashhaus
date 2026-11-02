import { useMemo } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { HaProvider } from "@dashhaus/core";
import { createHaStore } from "@dashhaus/core";
import { createDemoSensorHaTransport } from "@dashhaus/core/demo";
import { HaLcarsSensorCard } from "./HaLcarsSensorCard";

const meta = { title: "Studies/Lcars/Connected/Sensor", parameters: { layout: "centered" } } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

function Connected() {
  const store = useMemo(() => createHaStore(createDemoSensorHaTransport()), []);
  return <HaProvider store={store}><div style={{ width: 420, maxWidth: "90vw", display: "grid", gap: 8 }}><HaLcarsSensorCard entityId="sensor.living_room_temperature" /><HaLcarsSensorCard entityId="sensor.living_room_temperature" footprint="compact" /></div></HaProvider>;
}

export const InjectedTransport: Story = { render: () => <Connected /> };
