import type { Meta, StoryObj } from "@storybook/react";
import { DemoFanTile as DemoTile } from "./demo/DemoFanTile";
import { FAN_WORST_CASE } from "./demo/useDemoFan";

const SIZES = { S: 174, M: 360, L: 464 } as const;
const SEEDS = ["on", "ceiling", "off", "onOff", "unavailable", "long"] as const;

const meta = {
  title: "Orb/Cards/Fan",
  component: DemoTile,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "One fan (`fan.*`). Tap the orb to switch it, drag the groove to set its speed (one stop per speed on a stepped fan), " +
          "press and hold the orb or tap the name for its presets, oscillation, direction and today. A fan without speeds has the On/Off pill. " +
          "Same sizes and heights as the other cards.",
      },
    },
  },
  argTypes: {
    seed: { control: "select", options: SEEDS, description: "Example entity" },
    width: { control: { type: "range", min: 160, max: 640, step: 2 }, description: "Container width in px" },
    footprint: { control: "inline-radio", options: ["compact", "standard", "featured"] },
    showControl: { control: "boolean", description: "Compact only: show the control in the row (off: the row opens details)" },
    defaultOpen: { control: "boolean", description: "Open the detail sheet on load" },
  },
  args: { seed: "on", width: SIZES.M, footprint: "standard" },
  render: (args) => <DemoTile key={`${args.seed}-${args.defaultOpen}`} {...args} />,
} satisfies Meta<typeof DemoTile>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A three-speed tower fan at speed 2, sweeping. The groove has one stop per speed. */
export const On: Story = {};
export const Off: Story = { args: { seed: "off" } };
/** A stepless ceiling fan at 40%, turning in reverse; its direction is set in the sheet. */
export const Ceiling: Story = { args: { seed: "ceiling" } };
/** A fan without speeds (an extractor): the slot is the On/Off pill. */
export const OnOffOnly: Story = { name: "On / off only", args: { seed: "onOff" } };
export const Unavailable: Story = { args: { seed: "unavailable" } };
/** Realistic worst-case data from the demo seeds (FAN_WORST_CASE): long names, values at their limits. */
export const WorstCase: Story = {
  name: "Worst case",
  parameters: { layout: "padded", controls: { include: ["width", "footprint"] } },
  render: ({ width, footprint }) => (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-start" }}>
      {FAN_WORST_CASE.map((seed, index) => <DemoTile key={index} seed={seed} width={width} footprint={footprint} />)}
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
/** A ceiling fan's sheet: its direction, and no presets or oscillation it doesn't have. */
export const DetailsCeiling: Story = { name: "Details, ceiling", args: { seed: "ceiling", defaultOpen: true } };
export const DetailsUnavailable: Story = { name: "Details, unavailable", args: { seed: "unavailable", defaultOpen: true } };
export const DetailsPhone: Story = {
  name: "Details, phone",
  args: { defaultOpen: true },
  parameters: { viewport: { defaultViewport: "mobile2" } },
};
