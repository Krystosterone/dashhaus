import { useMemo } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { HaProvider } from "@dashhaus/core";
import { createHaStore } from "@dashhaus/core";
import { createDemoWeatherHaTransport } from "@dashhaus/core/demo";
import { HaFuturaWeatherCard } from "./HaFuturaWeatherCard";

const meta = { title: "Studies/Futura/Connected/Weather", parameters: { layout: "centered" } } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

function Connected() {
  const store = useMemo(() => createHaStore(createDemoWeatherHaTransport()), []);
  return <HaProvider store={store}><div style={{ width: 420, maxWidth: "90vw", display: "grid", gap: 8 }}><HaFuturaWeatherCard entityId="weather.home" /><HaFuturaWeatherCard entityId="weather.home" footprint="compact" /></div></HaProvider>;
}

export const InjectedTransport: Story = { render: () => <Connected /> };
