import { useMemo } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { HaWeatherTile } from "./HaWeatherTile";
import { createDemoWeatherHaTransport } from "../../../ha/demo";
import { HaProvider } from "../../../ha/provider";
import { createHaStore } from "../../../ha/store";

const meta = {
  title: "Orb/Home Assistant/Weather",
  parameters: { layout: "centered" },
} satisfies Meta;
export default meta;

type Story = StoryObj<typeof meta>;

function DemoConnectedWeather() {
  const store = useMemo(() => createHaStore(createDemoWeatherHaTransport()), []);
  return (
    <HaProvider store={store}>
      <div style={{ width: 420, maxWidth: "90vw" }}>
        <HaWeatherTile entityId="weather.home" aqiEntityId="sensor.home_aqi" aqiScale="US" sunEntityId="sun.sun" />
      </div>
    </HaProvider>
  );
}

export const InjectedTransport: Story = { render: () => <DemoConnectedWeather /> };
