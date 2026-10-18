import type { Meta, StoryObj } from "@storybook/react";
import { DemoSensorTile as DemoTile } from "./demo/DemoSensorTile";

const SIZES = { S: 174, M: 360, L: 464 } as const;
const SENSORS = ["living", "bathroom", "outdoor", "basement", "office", "garage"] as const;

const meta = {
  title: "Widgets/Sensor",
  component: DemoTile,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "A read-only temperature and humidity sensor. The tone follows the temperature (blue when cool, butter when comfortable, apricot when warm). " +
          "Tap the readings or the arrow for today's temperature and humidity. Same sizes and heights as the other widgets.",
      },
    },
  },
  argTypes: {
    sensor: { control: "select", options: [...SENSORS, "bedroom"], description: "Example sensor" },
    width: { control: { type: "range", min: 160, max: 640, step: 2 }, description: "Container width in px" },
    density: { control: "inline-radio", options: ["regular", "thin"] },
    showControl: { control: "boolean", description: "Thin only: show the control in the row (off: the row opens the details sheet)" },
    name: { control: "text" },
    defaultOpen: { control: "boolean", description: "Open the detail sheet on load" },
  },
  args: { sensor: "living", width: SIZES.M, density: "regular" },
  render: (args) => <DemoTile key={`${args.sensor}-${args.defaultOpen}`} {...args} />,
} satisfies Meta<typeof DemoTile>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Comfortable: Story = {};
export const Humid: Story = { args: { sensor: "bathroom" } };
export const Outside: Story = { args: { sensor: "outdoor" } };
export const LowBattery: Story = { name: "Low battery", args: { sensor: "basement" } };
export const TemperatureOnly: Story = { name: "Temperature only", args: { sensor: "office" } };
export const Unavailable: Story = { args: { sensor: "garage" } };

export const AllStates: Story = {
  name: "All states",
  parameters: { layout: "padded", controls: { include: ["width", "density"] } },
  render: ({ width, density }) => (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-start" }}>
      {SENSORS.map((s) => <DemoTile key={s} sensor={s} width={width} density={density} />)}
    </div>
  ),
};

export const Sizes: Story = {
  parameters: { layout: "padded", controls: { include: ["sensor", "density"] } },
  render: ({ sensor, density }) => (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 24, alignItems: "flex-start" }}>
      {(Object.entries(SIZES) as [keyof typeof SIZES, number][]).map(([label, w]) => (
        <figure key={label} style={{ margin: 0, display: "grid", gap: 8 }}>
          <figcaption style={{ font: "500 13px var(--font)", color: "var(--ink-3)" }}>{label} · {w} px</figcaption>
          <DemoTile key={`${sensor}-${density}`} sensor={sensor} width={w} density={density} />
        </figure>
      ))}
    </div>
  ),
};

export const ThinAllStates: Story = {
  name: "Thin, all states",
  parameters: { layout: "padded", controls: { include: ["width"] } },
  render: ({ width }) => (
    <div style={{ display: "grid", gap: 8, width, maxWidth: "100%" }}>
      {SENSORS.map((s) => <DemoTile key={s} sensor={s} density="thin" />)}
    </div>
  ),
};

export const DetailsSheet: Story = { name: "Details sheet", args: { sensor: "bathroom", defaultOpen: true } };
export const DetailsSheetPhone: Story = {
  name: "Details sheet, phone",
  args: { sensor: "bathroom", defaultOpen: true },
  parameters: { viewport: { defaultViewport: "mobile2" } },
};
