import type { Meta, StoryObj } from "@storybook/react";
import { SensorModule } from "./SensorModule";
import type { FieldFootprint } from "../../shared/ui";
import { SENSOR_SEEDS, SENSOR_WORST_CASE } from "@dashhaus/core/seeds/sensor";
import type { SensorSeed, SensorSeedName } from "@dashhaus/core/seeds/sensor";

const SIZES = { S: 200, M: 340, L: 464 } as const;
const SENSORS = Object.keys(SENSOR_SEEDS) as SensorSeedName[];

function DemoSensor({ sensor, seed, width, footprint, defaultOpen }: { sensor: SensorSeedName; seed?: SensorSeed; width?: number; footprint?: FieldFootprint; defaultOpen?: boolean }) {
  const { entity, history } = seed ?? SENSOR_SEEDS[sensor];
  return (
    <div style={{ width, maxWidth: "100%" }}>
      <SensorModule entity={entity} history={history} footprint={footprint} defaultOpen={defaultOpen} />
    </div>
  );
}

const meta = {
  title: "Field/Cards/Sensor",
  component: DemoSensor,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "One temperature and humidity sensor as a field module: a reading, so nothing on it is pressed. Its glyph lies flat where a " +
          "key would be, and today's meter takes the fader's place. The screen reads the temperature, then the humidity, comfort and " +
          "trend; a low battery takes the area's line under the name. Tap the name for the detail panel: humidity on the screen's second channel, today's temperature and " +
          "humidity, the battery. Standard modules are 160 px, compact rows 64 px.",
      },
    },
  },
  argTypes: {
    sensor: { control: "select", options: SENSORS, description: "Example sensor" },
    width: { control: { type: "range", min: 180, max: 640, step: 2 }, description: "Container width in px" },
    footprint: { control: "inline-radio", options: ["compact", "standard"], description: "Module height" },
    defaultOpen: { control: "boolean", description: "Open the detail panel on load" },
  },
  args: { sensor: "living", width: SIZES.M, footprint: "standard" },
  render: (args) => <DemoSensor key={`${args.sensor}-${args.defaultOpen}`} {...args} />,
} satisfies Meta<typeof DemoSensor>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Indoor: Story = {};
/** Past the humid band: comfort says so in words, never in colour. */
export const Humid: Story = { args: { sensor: "bathroom" } };
/** Outdoors there is no comfort to report, so the trend takes its line. */
export const Outdoor: Story = { args: { sensor: "outdoor" } };
/** 15% or less: the warning marker and the battery take the area's line under the name. */
export const LowBattery: Story = { name: "Low battery", args: { sensor: "basement" } };
/** No humidity companion: comfort and trend fill the meta lines. */
export const TemperatureOnly: Story = { name: "Temperature only", args: { sensor: "office" } };
/** No temperature: humidity becomes the figure, behind a drop. */
export const HumidityOnly: Story = { name: "Humidity only", args: { sensor: "humidityOnly" } };
/** Blank segments and when it was last seen; the meter dashes the hours it was gone. */
export const Unavailable: Story = { args: { sensor: "garage" } };

/** Readings at their limits, raw floats, no reading yet, no area, long names: every slot at its widest. */
export const WorstCase: Story = {
  name: "Worst case",
  parameters: { layout: "padded", controls: { include: ["width", "footprint"] } },
  render: ({ width, footprint }) => (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-start" }}>
      {SENSOR_WORST_CASE.map((seed) => <DemoSensor key={seed.entity.entityId} sensor="living" seed={seed} width={width} footprint={footprint} />)}
    </div>
  ),
};

/** Every sensor at one width. Heights match, whatever the readings. */
export const AllStates: Story = {
  name: "All states",
  parameters: { layout: "padded", controls: { include: ["width", "footprint"] } },
  render: ({ width, footprint }) => (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-start" }}>
      {SENSORS.map((sensor) => <DemoSensor key={sensor} sensor={sensor} width={width} footprint={footprint} />)}
    </div>
  ),
};

/** The same sensor at S, M and L container widths. */
export const Sizes: Story = {
  parameters: { layout: "padded", controls: { include: ["sensor", "footprint"] } },
  render: ({ sensor, footprint }) => (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 24, alignItems: "flex-start" }}>
      {(Object.entries(SIZES) as [keyof typeof SIZES, number][]).map(([label, width]) => (
        <figure key={label} style={{ margin: 0, display: "grid", gap: 8 }}>
          <figcaption style={{ font: "600 11px var(--fd-sans)", letterSpacing: "0.06em", color: "var(--fd-ink-2)" }}>{label} · {width} PX</figcaption>
          <DemoSensor key={sensor} sensor={sensor} width={width} footprint={footprint} />
        </figure>
      ))}
    </div>
  ),
};

/** The same entity at both footprints, the 64 px row and the 160 px module, at one width. */
export const Footprints: Story = {
  parameters: { layout: "padded", controls: { include: ["sensor", "width"] } },
  render: ({ sensor, width }) => (
    <div style={{ display: "grid", gap: 8, width, maxWidth: "100%" }}>
      {(["compact", "standard"] as const).map((footprint) => <DemoSensor key={footprint} sensor={sensor} footprint={footprint} />)}
    </div>
  ),
};

/** Every sensor as a 64 px row. A low battery takes the area's place under the name. */
export const Compact: Story = {
  args: { footprint: "compact" },
  parameters: { layout: "padded", controls: { include: ["width"] } },
  render: ({ width }) => (
    <div style={{ display: "grid", gap: 8, width, maxWidth: "100%" }}>
      {SENSORS.map((sensor) => <DemoSensor key={sensor} sensor={sensor} footprint="compact" />)}
    </div>
  ),
};

/** The detail panel: humidity on the screen's second channel, today's temperature and humidity, the battery. */
export const Details: Story = { args: { defaultOpen: true } };

/** A low battery: the warning leads the facts, with what to do about it. */
export const DetailsLowBattery: Story = { name: "Details, low battery", args: { sensor: "basement", defaultOpen: true } };

/** No humidity: the screen keeps its meta lines, and there is one meter. */
export const DetailsTemperatureOnly: Story = { name: "Details, temperature only", args: { sensor: "office", defaultOpen: true } };

/** Unavailable: blank screen, the hours it was gone dashed on both meters. */
export const DetailsUnavailable: Story = { name: "Details, unavailable", args: { sensor: "garage", defaultOpen: true } };

/** On a phone the panel is a bottom sheet: drag its header down to close. */
export const DetailsPhone: Story = {
  name: "Details, phone",
  args: { defaultOpen: true },
  parameters: { viewport: { defaultViewport: "mobile2" } },
};
