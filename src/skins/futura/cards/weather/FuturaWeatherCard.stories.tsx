import type { Meta, StoryObj } from "@storybook/react";
import { FuturaWeatherCard } from "./FuturaWeatherCard";
import type { FuturaFootprint } from "../../shared/ui";
import { WEATHER_SEEDS, WEATHER_WORST_CASE } from "./demo/weather";
import type { WeatherSeed, WeatherSeedName } from "./demo/weather";

const SIZES = { S: 200, M: 340, L: 464 } as const;
const SEED_NAMES = Object.keys(WEATHER_SEEDS) as WeatherSeedName[];

function DemoWeather({ seed, width, footprint, defaultOpen }: { seed: WeatherSeed; width?: number; footprint?: FuturaFootprint; defaultOpen?: boolean }) {
  const demo = seed;
  return <div style={{ width, maxWidth: "100%" }}><FuturaWeatherCard entity={demo.entity} history={demo.history} footprint={footprint} defaultOpen={defaultOpen} /></div>;
}

function StoryWeather({ weather, ...props }: { weather: WeatherSeedName; width?: number; footprint?: FuturaFootprint; defaultOpen?: boolean }) {
  return <DemoWeather seed={WEATHER_SEEDS[weather]} {...props} />;
}

const meta = {
  title: "Studies/Futura/Cards/Weather",
  component: StoryWeather,
  parameters: { layout: "centered" },
  argTypes: {
    weather: { control: "select", options: SEED_NAMES },
    width: { control: { type: "range", min: 180, max: 640, step: 2 } },
    footprint: { control: "inline-radio", options: ["compact", "standard"] },
    defaultOpen: { control: "boolean" },
  },
  args: { weather: "partly", width: SIZES.M, footprint: "standard" },
  render: (args) => <StoryWeather key={`${args.weather}-${args.defaultOpen}`} {...args} />,
} satisfies Meta<typeof StoryWeather>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Unavailable: Story = { args: { weather: "unavailable" } };
export const WorstCase: Story = { name: "Worst case", parameters: { layout: "padded" }, render: ({ width, footprint }) => <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>{WEATHER_WORST_CASE.map((seed) => <DemoWeather key={seed.entity.entityId} seed={seed} width={width} footprint={footprint} />)}</div> };
export const AllStates: Story = { name: "All states", parameters: { layout: "padded" }, render: ({ width, footprint }) => <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>{SEED_NAMES.map((name) => <StoryWeather key={name} weather={name} width={width} footprint={footprint} />)}</div> };
export const Sizes: Story = { parameters: { layout: "padded" }, render: ({ weather, footprint }) => <div style={{ display: "flex", flexWrap: "wrap", gap: 20 }}>{Object.entries(SIZES).map(([label, width]) => <figure key={label} style={{ margin: 0 }}><figcaption>{label} · {width}px</figcaption><StoryWeather weather={weather} width={width} footprint={footprint} /></figure>)}</div> };
export const Footprints: Story = { render: ({ weather, width }) => <div style={{ display: "grid", gap: 8, width }}>{(["compact", "standard"] as const).map((footprint) => <StoryWeather key={footprint} weather={weather} footprint={footprint} />)}</div> };
export const Compact: Story = { args: { footprint: "compact" }, render: ({ width }) => <div style={{ display: "grid", gap: 8, width }}>{SEED_NAMES.map((name) => <StoryWeather key={name} weather={name} footprint="compact" />)}</div> };
export const Details: Story = { args: { defaultOpen: true } };
export const DetailsUnavailable: Story = { name: "Details, unavailable", args: { weather: "unavailable", defaultOpen: true } };
export const DetailsPhone: Story = { name: "Details, phone", args: { defaultOpen: true }, parameters: { viewport: { defaultViewport: "mobile2" } } };
