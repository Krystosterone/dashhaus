import { useMemo } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { HaWeatherModule } from "./HaWeatherModule";
import { HaProvider } from "@scope/core";
import { createHaStore } from "@scope/core";
import { createDemoWeatherHaTransport } from "@scope/core/demo";

const meta = {
  title: "Field/Connected/Weather",
  parameters: { layout: "centered" },
} satisfies Meta;
export default meta;

type Story = StoryObj<typeof meta>;

function DemoConnectedWeather() {
  const store = useMemo(() => createHaStore(createDemoWeatherHaTransport()), []);
  return (
    <HaProvider store={store}>
      <div style={{ width: 340, maxWidth: "90vw", display: "grid", gap: 8 }}>
        <HaWeatherModule entityId="weather.home" aqiEntityId="sensor.home_aqi" aqiScale="US" sunEntityId="sun.sun" />
        <HaWeatherModule entityId="weather.home" aqiEntityId="sensor.home_aqi" aqiScale="US" sunEntityId="sun.sun" footprint="compact" />
      </div>
    </HaProvider>
  );
}

/** The same skin-free hook orb's weather tile uses, with its AQI and sun companions and forecasts, over the demo transport: both modules follow the store. */
export const InjectedTransport: Story = { render: () => <DemoConnectedWeather /> };
