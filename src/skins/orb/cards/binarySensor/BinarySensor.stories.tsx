import type { Meta, StoryObj } from "@storybook/react";
import { DemoBinarySensorTile as DemoTile } from "./demo/DemoBinarySensorTile";
import { BINARY_SENSOR_WORST_CASE } from "@dashhaus/core/seeds/binarySensor";

const SIZES = { S: 174, M: 360, L: 464 } as const;
const SEEDS = ["closed", "open", "window", "leak", "smoke", "lowBattery", "unavailable", "long"] as const;

const meta = {
  title: "Orb/Cards/BinarySensor",
  component: DemoTile,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "One binary sensor (`binary_sensor.*`: a door, a window, a leak, smoke), with its device's battery: a reading. The icon its device class names, " +
          "its state in that class's words (Open, Wet, Smoke) with since when, and no glow. Smoke, gas and carbon monoxide, a leak and a low battery " +
          "lead the status line behind the warn marker. Tap the reading or the name for today's hours on. Same sizes and heights as the other cards.",
      },
    },
  },
  argTypes: {
    seed: { control: "select", options: SEEDS, description: "Example sensor" },
    width: { control: { type: "range", min: 160, max: 640, step: 2 }, description: "Container width in px" },
    footprint: { control: "inline-radio", options: ["compact", "standard", "featured"] },
    showControl: { control: "boolean", description: "Compact only: show the state in the row (off: the row opens details)" },
    defaultOpen: { control: "boolean", description: "Open the detail sheet on load" },
  },
  args: { seed: "closed", width: SIZES.M, footprint: "standard" },
  render: (args) => <DemoTile key={`${args.seed}-${args.defaultOpen}`} {...args} />,
} satisfies Meta<typeof DemoTile>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Closed: Story = {};
export const Open: Story = { args: { seed: "open" } };
export const Window: Story = { args: { seed: "window" } };
/** A leak is urgent: the warn marker leads the status line, and Wet is said in the warn colour. Never a glow. */
export const Leak: Story = { args: { seed: "leak" } };
/** Smoke is an alarm: the same marker, in words, never more glow (attention-budget skill). */
export const Smoke: Story = { args: { seed: "smoke" } };
/** Clear, with its device's battery low: advisory, about the device. */
export const LowBattery: Story = { name: "Low battery", args: { seed: "lowBattery" } };
export const Unavailable: Story = { args: { seed: "unavailable" } };
export const Featured: Story = { args: { footprint: "featured" } };
/** Realistic worst-case data from the demo seeds (BINARY_SENSOR_WORST_CASE): long names, an alarm and a low battery at once, no class. */
export const WorstCase: Story = {
  name: "Worst case",
  parameters: { layout: "padded", controls: { include: ["width", "footprint"] } },
  render: ({ width, footprint }) => (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-start" }}>
      {BINARY_SENSOR_WORST_CASE.map((seed, index) => <DemoTile key={index} seed={seed} width={width} footprint={footprint} />)}
    </div>
  ),
};

export const AllStates: Story = {
  name: "All states",
  parameters: { layout: "padded", controls: { include: ["width", "footprint"] } },
  render: ({ width, footprint }) => (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-start" }}>
      {SEEDS.map((seed) => <DemoTile key={seed} seed={seed} width={width} footprint={footprint} />)}
    </div>
  ),
};

export const Sizes: Story = {
  parameters: { layout: "padded", controls: { include: ["seed", "footprint"] } },
  render: ({ seed, footprint }) => (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 24, alignItems: "flex-start" }}>
      {(Object.entries(SIZES) as [keyof typeof SIZES, number][]).map(([label, width]) => (
        <figure key={label} style={{ margin: 0, display: "grid", gap: 8 }}>
          <figcaption style={{ font: "500 13px var(--font)", color: "var(--ink-2)" }}>{label} · {width} px</figcaption>
          <DemoTile key={`${seed}-${footprint}`} seed={seed} width={width} footprint={footprint} />
        </figure>
      ))}
    </div>
  ),
};

export const Footprints: Story = {
  parameters: { layout: "padded", controls: { include: ["seed", "width"] } },
  render: ({ seed, width }) => (
    <div style={{ display: "grid", gap: 8, width, maxWidth: "100%" }}>
      {(["compact", "standard", "featured"] as const).map((footprint) => <DemoTile key={footprint} seed={seed} footprint={footprint} />)}
    </div>
  ),
};

export const Compact: Story = {
  name: "Compact",
  parameters: { layout: "padded", controls: { include: ["width"] } },
  args: { width: 360 },
  render: ({ width }) => (
    <div style={{ display: "grid", gap: 8, width, maxWidth: "100%" }}>
      {SEEDS.map((seed) => <DemoTile key={seed} seed={seed} footprint="compact" />)}
      {SEEDS.map((seed) => <DemoTile key={`${seed}-bare`} seed={seed} footprint="compact" showControl={false} />)}
    </div>
  ),
};

export const Details: Story = { name: "Details", args: { defaultOpen: true } };
export const DetailsUnavailable: Story = { name: "Details, unavailable", args: { seed: "unavailable", defaultOpen: true } };
export const DetailsPhone: Story = {
  name: "Details, phone",
  args: { defaultOpen: true },
  parameters: { viewport: { defaultViewport: "mobile2" } },
};
