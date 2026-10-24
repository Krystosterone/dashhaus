import type { Meta, StoryObj } from "@storybook/react";
import { DemoWeatherTile as DemoTile } from "./demo/DemoWeatherTile";

const SIZES = { S: 174, M: 360, L: 464 } as const;
const WEATHER = ["partly", "rain", "night", "snow", "summer", "unavailable"] as const;

const meta = {
  title: "Widgets/Weather",
  component: DemoTile,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Outdoor conditions now. A reading: neutral, no glow, the condition icon as its badge at every size. " +
          "The status line puts warnings (poor air, strong gusts, very high UV) and rain or snow first, then the condition and today's low–high. " +
          "The reading is the temperature with feels-like beside it. Featured adds the next hours; the sheet has every reading, the next hours and the next days.",
      },
    },
  },
  argTypes: {
    weather: { control: "select", options: WEATHER, description: "Example weather" },
    width: { control: { type: "range", min: 160, max: 640, step: 2 }, description: "Container width in px" },
    footprint: { control: "inline-radio", options: ["compact", "standard", "featured"] },
    showControl: { control: "boolean", description: "Compact only: show the reading in the row (off: the row opens details)" },
    defaultOpen: { control: "boolean", description: "Open the detail sheet on load" },
  },
  args: { weather: "partly", width: SIZES.L, footprint: "featured" },
  render: (args) => <DemoTile key={`${args.weather}-${args.defaultOpen}`} {...args} />,
} satisfies Meta<typeof DemoTile>;

export default meta;
type Story = StoryObj<typeof meta>;

export const PartlyCloudy: Story = { name: "Partly cloudy, rain coming" };
export const Raining: Story = { args: { weather: "rain" } };
export const Night: Story = { args: { weather: "night" } };
export const Snow: Story = { args: { weather: "snow" } };
export const HotAndHazy: Story = { name: "Hot, poor air", args: { weather: "summer" } };
export const Unavailable: Story = { args: { weather: "unavailable" } };

export const AllStates: Story = {
  name: "All states",
  parameters: { layout: "padded", controls: { include: ["width", "footprint"] } },
  render: ({ width, footprint }) => (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-start" }}>
      {WEATHER.map((weather) => <DemoTile key={weather} weather={weather} width={width} footprint={footprint} />)}
    </div>
  ),
};

export const Sizes: Story = {
  parameters: { layout: "padded", controls: { include: ["weather", "footprint"] } },
  render: ({ weather, footprint }) => (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 24, alignItems: "flex-start" }}>
      {(Object.entries(SIZES) as [keyof typeof SIZES, number][]).map(([label, width]) => (
        <figure key={label} style={{ margin: 0, display: "grid", gap: 8 }}>
          <figcaption style={{ font: "500 13px var(--font)", color: "var(--ink-2)" }}>{label} · {width} px</figcaption>
          <DemoTile key={`${weather}-${footprint}`} weather={weather} width={width} footprint={footprint} />
        </figure>
      ))}
    </div>
  ),
};

export const CompactAllStates: Story = {
  name: "Compact, all states",
  parameters: { layout: "padded", controls: { include: ["width"] } },
  args: { width: 360 },
  render: ({ width }) => (
    <div style={{ display: "grid", gap: 8, width, maxWidth: "100%" }}>
      {WEATHER.map((weather) => <DemoTile key={weather} weather={weather} footprint="compact" />)}
    </div>
  ),
};

export const DetailsSheet: Story = { name: "Details sheet", args: { defaultOpen: true } };
export const DetailsSheetPhone: Story = {
  name: "Details sheet, phone",
  args: { defaultOpen: true },
  parameters: { viewport: { defaultViewport: "mobile2" } },
};
