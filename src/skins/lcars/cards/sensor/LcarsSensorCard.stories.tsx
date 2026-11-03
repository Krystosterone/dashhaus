import type { Meta, StoryObj } from "@storybook/react";
import { LcarsSensorCard } from "./LcarsSensorCard";
import type { LcarsFootprint } from "../../shared/ui";
import { SENSOR_SEEDS, SENSOR_WORST_CASE } from "@dashhaus/core/seeds/sensor";
import type { SensorSeed, SensorSeedName } from "@dashhaus/core/seeds/sensor";

const SIZES = { S: 200, M: 340, L: 464 } as const;
const SEED_NAMES = Object.keys(SENSOR_SEEDS) as SensorSeedName[];

function DemoSensor({ seed, width, footprint, defaultOpen }: { seed: SensorSeed; width?: number; footprint?: LcarsFootprint; defaultOpen?: boolean }) {
  const demo = seed;
  return <div style={{ width, maxWidth: "100%" }}><LcarsSensorCard entity={demo.entity} history={demo.history} footprint={footprint} defaultOpen={defaultOpen} /></div>;
}

function StorySensor({ sensor, ...props }: { sensor: SensorSeedName; width?: number; footprint?: LcarsFootprint; defaultOpen?: boolean }) {
  return <DemoSensor seed={SENSOR_SEEDS[sensor]} {...props} />;
}

const meta = {
  title: "Studies/Lcars/Cards/Sensor",
  component: StorySensor,
  parameters: { layout: "centered" },
  argTypes: {
    sensor: { control: "select", options: SEED_NAMES },
    width: { control: { type: "range", min: 180, max: 640, step: 2 } },
    footprint: { control: "inline-radio", options: ["compact", "standard"] },
    defaultOpen: { control: "boolean" },
  },
  args: { sensor: "living", width: SIZES.M, footprint: "standard" },
  render: (args) => <StorySensor key={`${args.sensor}-${args.defaultOpen}`} {...args} />,
} satisfies Meta<typeof StorySensor>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Unavailable: Story = { args: { sensor: "garage" } };
export const WorstCase: Story = { name: "Worst case", parameters: { layout: "padded" }, render: ({ width, footprint }) => <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>{SENSOR_WORST_CASE.map((seed) => <DemoSensor key={seed.entity.entityId} seed={seed} width={width} footprint={footprint} />)}</div> };
export const AllStates: Story = { name: "All states", parameters: { layout: "padded" }, render: ({ width, footprint }) => <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>{SEED_NAMES.map((name) => <StorySensor key={name} sensor={name} width={width} footprint={footprint} />)}</div> };
export const Sizes: Story = { parameters: { layout: "padded" }, render: ({ sensor, footprint }) => <div style={{ display: "flex", flexWrap: "wrap", gap: 20 }}>{Object.entries(SIZES).map(([label, width]) => <figure key={label} style={{ margin: 0 }}><figcaption>{label} · {width}px</figcaption><StorySensor sensor={sensor} width={width} footprint={footprint} /></figure>)}</div> };
export const Footprints: Story = { render: ({ sensor, width }) => <div style={{ display: "grid", gap: 8, width }}>{(["compact", "standard"] as const).map((footprint) => <StorySensor key={footprint} sensor={sensor} footprint={footprint} />)}</div> };
export const Compact: Story = { args: { footprint: "compact" }, render: ({ width }) => <div style={{ display: "grid", gap: 8, width }}>{SEED_NAMES.map((name) => <StorySensor key={name} sensor={name} footprint="compact" />)}</div> };
export const Details: Story = { args: { defaultOpen: true } };
export const DetailsUnavailable: Story = { name: "Details, unavailable", args: { sensor: "garage", defaultOpen: true } };
export const DetailsPhone: Story = { name: "Details, phone", args: { defaultOpen: true }, parameters: { viewport: { defaultViewport: "mobile2" } } };
