import type { Meta, StoryObj } from "@storybook/react";
import { DemoHomeTile as DemoTile } from "./demo/DemoHomeTile";

const SIZES = { S: 174, M: 360, L: 464 } as const;
const WEATHER = ["partly", "rain", "night", "snow", "summer", "unavailable"] as const;

const meta = {
  title: "Widgets/Home",
  component: DemoTile,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "The home's outdoor conditions, beside the house drawn as a white architectural model. Built from the same parts as the other widgets: " +
          "the glow is the sunshine, the icon is the condition, the bar runs from today's low to today's high (cold to warm) with now on the knob. " +
          "A coming dry/wet change replaces the condition in the status line; poor air and strong gusts show as warnings. " +
          "L adds the big temperature and today's hours, forecast hours lighter. The sheet has every reading as tiles and the next days.",
      },
    },
  },
  argTypes: {
    weather: { control: "select", options: WEATHER, description: "Example weather" },
    width: { control: { type: "range", min: 160, max: 640, step: 2 }, description: "Container width in px" },
    density: { control: "inline-radio", options: ["regular", "thin"] },
    showControl: { control: "boolean", description: "Thin only: show the control in the row (off: the row opens the details sheet)" },
    defaultOpen: { control: "boolean", description: "Open the detail sheet on load" },
  },
  args: { weather: "partly", width: SIZES.L, density: "regular" },
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
  parameters: { layout: "padded", controls: { include: ["width", "density"] } },
  render: ({ width, density }) => (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-start" }}>
      {WEATHER.map((w) => <DemoTile key={w} weather={w} width={width} density={density} />)}
    </div>
  ),
};

export const Sizes: Story = {
  parameters: { layout: "padded", controls: { include: ["weather", "density"] } },
  render: ({ weather, density }) => (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 24, alignItems: "flex-start" }}>
      {(Object.entries(SIZES) as [keyof typeof SIZES, number][]).map(([label, w]) => (
        <figure key={label} style={{ margin: 0, display: "grid", gap: 8 }}>
          <figcaption style={{ font: "500 13px var(--font)", color: "var(--ink-3)" }}>{label} · {w} px</figcaption>
          <DemoTile key={`${weather}-${density}`} weather={weather} width={w} density={density} />
        </figure>
      ))}
    </div>
  ),
};

export const ThinAllStates: Story = {
  name: "Thin, all states",
  parameters: { layout: "padded", controls: { include: ["width"] } },
  args: { width: 360 },
  render: ({ width }) => (
    <div style={{ display: "grid", gap: 8, width, maxWidth: "100%" }}>
      {WEATHER.map((w) => <DemoTile key={w} weather={w} density="thin" />)}
    </div>
  ),
};

export const DetailsSheet: Story = { name: "Details sheet", args: { defaultOpen: true } };
export const DetailsSheetPhone: Story = {
  name: "Details sheet, phone",
  args: { defaultOpen: true },
  parameters: { viewport: { defaultViewport: "mobile2" } },
};
