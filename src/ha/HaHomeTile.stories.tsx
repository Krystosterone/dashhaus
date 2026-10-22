import { useMemo } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { HaHomeTile } from "./HaHomeTile";
import { createDemoWeatherHaTransport } from "./demo";
import { HaProvider } from "./provider";
import { createHaStore } from "./store";

const meta = {
  title: "Home Assistant/Home weather tile",
  parameters: { layout: "centered" },
} satisfies Meta;
export default meta;

type Story = StoryObj<typeof meta>;

function DemoConnectedHome() {
  const store = useMemo(() => createHaStore(createDemoWeatherHaTransport()), []);
  return (
    <HaProvider store={store}>
      <div style={{ width: 420, maxWidth: "90vw" }}>
        <HaHomeTile entityId="weather.home" aqiEntityId="sensor.home_aqi" aqiScale="US" sunEntityId="sun.sun" />
      </div>
    </HaProvider>
  );
}

export const InjectedTransport: Story = { render: () => <DemoConnectedHome /> };
