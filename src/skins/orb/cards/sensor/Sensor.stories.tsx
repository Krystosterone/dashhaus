import type { Meta, StoryObj } from "@storybook/react";
import { DemoSensorTile as DemoTile } from "./demo/DemoSensorTile";
import { SENSOR_SEEDS, SENSOR_WORST_CASE } from "@dashhaus/core/seeds/sensor";
import { onHourCycle } from "@dashhaus/core/seeds/clock";

const SIZES = { S: 174, M: 360, L: 464 } as const;
const SENSORS = ["living", "bathroom", "outdoor", "basement", "office", "humidityOnly", "garage"] as const;

const meta = {
  title: "Orb/Cards/Sensor",
  component: DemoTile,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "A read-only temperature and humidity sensor. The readings are a readout, with no container; comfort is said in words. " +
          "Tap the readings or the name for today's temperature and humidity. Same sizes and heights as the other cards.",
      },
    },
  },
  argTypes: {
    sensor: { control: "select", options: [...SENSORS, "bedroom"], description: "Example sensor" },
    width: { control: { type: "range", min: 160, max: 640, step: 2 }, description: "Container width in px" },
    footprint: { control: "inline-radio", options: ["compact", "standard", "featured"] },
    showControl: { control: "boolean", description: "Compact only: show the reading in the row (off: the row opens details)" },
    name: { control: "text" },
    defaultOpen: { control: "boolean", description: "Open the detail sheet on load" },
  },
  args: { sensor: "living", width: SIZES.M, footprint: "standard" },
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
/** Realistic worst-case data from the demo seeds (SENSOR_WORST_CASE): long and compound names, missing areas, values at their limits. */
export const WorstCase: Story = {
  name: "Worst case",
  parameters: { layout: "padded", controls: { include: ["width", "footprint"] } },
  render: ({ width, footprint }) => (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-start" }}>
      {SENSOR_WORST_CASE.map((seed, index) => <DemoTile key={index} sensor={seed} width={width} footprint={footprint} />)}
    </div>
  ),
};

export const AllStates: Story = {
  name: "All states",
  parameters: { layout: "padded", controls: { include: ["width", "footprint"] } },
  render: ({ width, footprint }) => (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-start" }}>
      {SENSORS.map((sensor) => <DemoTile key={sensor} sensor={sensor} width={width} footprint={footprint} />)}
    </div>
  ),
};

export const Sizes: Story = {
  parameters: { layout: "padded", controls: { include: ["sensor", "footprint"] } },
  render: ({ sensor, footprint }) => (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 24, alignItems: "flex-start" }}>
      {(Object.entries(SIZES) as [keyof typeof SIZES, number][]).map(([label, width]) => (
        <figure key={label} style={{ margin: 0, display: "grid", gap: 8 }}>
          <figcaption style={{ font: "500 13px var(--font)", color: "var(--ink-2)" }}>{label} · {width} px</figcaption>
          <DemoTile key={`${sensor}-${footprint}`} sensor={sensor} width={width} footprint={footprint} />
        </figure>
      ))}
    </div>
  ),
};

/** The same entity at every footprint, compact, standard and featured, at one width. */
export const Footprints: Story = {
  parameters: { layout: "padded", controls: { include: ["sensor", "width"] } },
  render: ({ sensor, width }) => (
    <div style={{ display: "grid", gap: 8, width, maxWidth: "100%" }}>
      {(["compact", "standard", "featured"] as const).map((footprint) => <DemoTile key={footprint} sensor={sensor} footprint={footprint} />)}
    </div>
  ),
};

export const Compact: Story = {
  name: "Compact",
  parameters: { layout: "padded", controls: { include: ["width"] } },
  render: ({ width }) => (
    <div style={{ display: "grid", gap: 8, width, maxWidth: "100%" }}>
      {SENSORS.map((sensor) => <DemoTile key={sensor} sensor={sensor} footprint="compact" />)}
    </div>
  ),
};

export const Details: Story = { name: "Details", args: { sensor: "bathroom", defaultOpen: true } };
/** Unavailable: what the details still say when Home Assistant can't reach the entity. */
export const DetailsUnavailable: Story = { name: "Details, unavailable", args: { sensor: "garage", defaultOpen: true } };
export const DetailsPhone: Story = {
  name: "Details, phone",
  args: { sensor: "bathroom", defaultOpen: true },
  parameters: { viewport: { defaultViewport: "mobile2" } },
};

/**
 * On a 12-hour dashboard (YAML `hour_cycle: h12`, the toolbar's Clock): every state and the worst case, each time the
 * card says on that clock, from the seeds as the mapper writes them there (`onHourCycle`).
 */
export const TwelveHourClock: Story = {
  name: "12-hour clock",
  globals: { orbClock: "h12" },
  parameters: { layout: "padded", controls: { include: ["width", "footprint"] } },
  render: ({ width, footprint }) => (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-start" }}>
      {[...SENSORS.map((name) => SENSOR_SEEDS[name]), ...SENSOR_WORST_CASE].map((seed, index) => <DemoTile key={index} sensor={onHourCycle(seed, "h12")} width={width} footprint={footprint} />)}
    </div>
  ),
};
