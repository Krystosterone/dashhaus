import type { Meta, StoryObj } from "@storybook/react";
import { WeatherModule } from "./WeatherModule";
import type { FieldFootprint } from "../../shared/ui";
import { WEATHER_SEEDS, WEATHER_WORST_CASE } from "@dashhaus/core/seeds/weather";
import { onHourCycle } from "@dashhaus/core/seeds/clock";
import { HourCycleProvider } from "@dashhaus/core/hooks";
import type { WeatherSeed, WeatherSeedName } from "@dashhaus/core/seeds/weather";

const SIZES = { S: 200, M: 340, L: 464 } as const;
const SEEDS = Object.keys(WEATHER_SEEDS) as WeatherSeedName[];

function DemoWeather({ seed, width, footprint, defaultOpen }: { seed: WeatherSeed; width?: number; footprint?: FieldFootprint; defaultOpen?: boolean }) {
  const { entity, history, hourly, daily } = seed;
  return (
    <div style={{ width, maxWidth: "100%" }}>
      <WeatherModule entity={entity} history={history} hourly={hourly} daily={daily} footprint={footprint} defaultOpen={defaultOpen} />
    </div>
  );
}

function StoryWeather({ weather, ...props }: { weather: WeatherSeedName; width?: number; footprint?: FieldFootprint; defaultOpen?: boolean }) {
  return <DemoWeather seed={WEATHER_SEEDS[weather]} {...props} />;
}

const meta = {
  title: "Field/Cards/Weather",
  component: StoryWeather,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "The home's outdoor conditions as a field module: a reading, so nothing on it is pressed. Its glyph lies flat where a key " +
          "would be, and today's temperatures take the fader's place with today's low and high. The screen reads the temperature under " +
          "the sky's pictogram, then a warning, rain on its way or the condition, and how it feels; a compact row puts that first line " +
          "under the name. Tap the name for the detail panel: how it feels on the screen's second channel, every warning, today, the " +
          "next hours and days, every reading. Standard modules are 160 px, compact rows 64 px.",
      },
    },
  },
  argTypes: {
    weather: { control: "select", options: SEEDS, description: "Example weather" },
    width: { control: { type: "range", min: 180, max: 640, step: 2 }, description: "Container width in px" },
    footprint: { control: "inline-radio", options: ["compact", "standard"], description: "Module height" },
    defaultOpen: { control: "boolean", description: "Open the detail panel on load" },
  },
  args: { weather: "partly", width: SIZES.M, footprint: "standard" },
  render: (args) => <StoryWeather key={`${args.weather}-${args.defaultOpen}`} {...args} />,
} satisfies Meta<typeof StoryWeather>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Partly cloudy, with rain on its way: when it starts takes the condition's line, and the pictogram keeps the sky. */
export const Partly: Story = {};
/** Falling rain names itself by when it stops. */
export const Rain: Story = { args: { weather: "rain" } };
/** After dark the sun becomes a moon, and a sunny night reads clear. */
export const Night: Story = { args: { weather: "night" } };
/** Below zero, today's range is spelled out, so a dash never meets a minus. */
export const Snow: Story = { args: { weather: "snow" } };
/** Poor air and very high UV: the most urgent leads behind the warning marker, with a count of the rest. */
export const Warnings: Story = { args: { weather: "summer" } };
/**
 * On a 12-hour dashboard (YAML `hour_cycle: h12`): every state and the worst case, each time the
 * module says on that clock, from the seeds as the mapper writes them there (`onHourCycle`).
 * Drawn at the chosen width and again at the narrowest, where a line that clips drops a time whole.
 */
export const TwelveHourClock: Story = {
  name: "12-hour clock",
  decorators: [(Story) => <HourCycleProvider hourCycle="h12"><Story /></HourCycleProvider>],
  parameters: { layout: "padded", controls: { include: ["width", "footprint"] } },
  render: ({ width, footprint }) => (
    <div style={{ display: "grid", gap: 24 }}>
      {[width, footprint === "compact" ? 260 : SIZES.S].map((at, row) => (
        <div key={row} style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-start" }}>
          {[...SEEDS.map((name) => WEATHER_SEEDS[name]), ...WEATHER_WORST_CASE].map((seed, index) => <DemoWeather key={index} seed={onHourCycle(seed, "h12")} width={at} footprint={footprint} />)}
        </div>
      ))}
    </div>
  ),
};

/** Blank segments on the screen and when it was last seen; the meter dashes the hours it was gone. */
export const Unavailable: Story = { args: { weather: "unavailable" } };

/** Fahrenheit and mph past their limits, three warnings, a long place name, no forecast; a fog with no temperature. */
export const WorstCase: Story = {
  name: "Worst case",
  parameters: { layout: "padded", controls: { include: ["width", "footprint"] } },
  render: ({ width, footprint }) => (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-start" }}>
      {WEATHER_WORST_CASE.map((seed) => <DemoWeather key={seed.entity.entityId} seed={seed} width={width} footprint={footprint} />)}
    </div>
  ),
};

/** Every example at one width. Heights match, whatever the state. */
export const AllStates: Story = {
  name: "All states",
  parameters: { layout: "padded", controls: { include: ["width", "footprint"] } },
  render: ({ width, footprint }) => (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-start" }}>
      {SEEDS.map((name) => <StoryWeather key={name} weather={name} width={width} footprint={footprint} />)}
    </div>
  ),
};

/** The same weather at S, M and L container widths. */
export const Sizes: Story = {
  parameters: { layout: "padded", controls: { include: ["weather", "footprint"] } },
  render: ({ weather, footprint }) => (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 24, alignItems: "flex-start" }}>
      {(Object.entries(SIZES) as [keyof typeof SIZES, number][]).map(([label, width]) => (
        <figure key={label} style={{ margin: 0, display: "grid", gap: 8 }}>
          <figcaption style={{ font: "600 11px var(--fd-sans)", letterSpacing: "0.06em", color: "var(--fd-ink-2)" }}>{label} · {width} PX</figcaption>
          <StoryWeather key={weather} weather={weather} width={width} footprint={footprint} />
        </figure>
      ))}
    </div>
  ),
};

/** The same entity at both footprints, the 64 px row and the 160 px module, at one width. */
export const Footprints: Story = {
  parameters: { layout: "padded", controls: { include: ["weather", "width"] } },
  render: ({ weather, width }) => (
    <div style={{ display: "grid", gap: 8, width, maxWidth: "100%" }}>
      {(["compact", "standard"] as const).map((footprint) => <StoryWeather key={footprint} weather={weather} footprint={footprint} />)}
    </div>
  ),
};

/** Every example as a 64 px row: a warning, rain on its way or the condition takes the area's line under the name. */
export const Compact: Story = {
  args: { footprint: "compact" },
  parameters: { layout: "padded", controls: { include: ["width"] } },
  render: ({ width }) => (
    <div style={{ display: "grid", gap: 8, width, maxWidth: "100%" }}>
      {SEEDS.map((name) => <StoryWeather key={name} weather={name} footprint="compact" />)}
    </div>
  ),
};

/** The detail panel: how it feels on the screen's second channel, the sky in words, today, the next hours and days, every reading. */
export const Details: Story = { args: { defaultOpen: true } };

/** Every warning by name, and its reading behind the marker. */
export const DetailsWarnings: Story = { name: "Details, warnings", args: { weather: "summer", defaultOpen: true } };

/** The panel on a 12-hour clock: every time in it with its period. */
export const DetailsTwelveHourClock: Story = { name: "Details, 12-hour clock", decorators: [(Story) => <HourCycleProvider hourCycle="h12"><Story /></HourCycleProvider>],
  render: ({ weather, width, footprint }) => <DemoWeather seed={onHourCycle(WEATHER_SEEDS[weather], "h12")} width={width} footprint={footprint} defaultOpen />,
};

/** Unavailable: blank segments, the hours it was gone dashed on the meter, and no forecast or readings to make up. */
export const DetailsUnavailable: Story = { name: "Details, unavailable", args: { weather: "unavailable", defaultOpen: true } };

/** On a phone the panel is a bottom sheet: drag its header down to close. */
export const DetailsPhone: Story = {
  name: "Details, phone",
  args: { defaultOpen: true },
  parameters: { viewport: { defaultViewport: "mobile2" } },
};
