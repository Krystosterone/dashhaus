import type { Meta, StoryObj } from "@storybook/react";
import { Demo__Name__Tile as DemoTile } from "./demo/Demo__Name__Tile";

const SIZES = { S: 174, M: 360, L: 464 } as const;
const SEEDS = ["normal", "low", "waiting", "unavailable", "long"] as const;

const meta = {
  title: "Widgets/__Name__",
  component: DemoTile,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "One __label__ (`__domain__.*`): a reading. A bare icon, the figure as a readout with no container, and no glow. " +
          "Tap the reading or the name for today's readings. Same sizes and heights as the other widgets.",
      },
    },
  },
  argTypes: {
    seed: { control: "select", options: SEEDS, description: "Example reading" },
    width: { control: { type: "range", min: 160, max: 640, step: 2 }, description: "Container width in px" },
    footprint: { control: "inline-radio", options: ["compact", "standard", "featured"] },
    showControl: { control: "boolean", description: "Compact only: show the reading in the row (off: the row opens details)" },
    defaultOpen: { control: "boolean", description: "Open the detail sheet on load" },
  },
  args: { seed: "normal", width: SIZES.M, footprint: "standard" },
  render: (args) => <DemoTile key={`${args.seed}-${args.defaultOpen}`} {...args} />,
} satisfies Meta<typeof DemoTile>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Normal: Story = {};
export const Low: Story = { args: { seed: "low" } };
export const NoReadingYet: Story = { name: "No reading yet", args: { seed: "waiting" } };
export const Unavailable: Story = { args: { seed: "unavailable" } };
export const Featured: Story = { args: { footprint: "featured" } };
export const WorstCase: Story = { name: "Worst case, long names", args: { seed: "long" } };

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
          <figcaption style={{ font: "500 13px var(--font)", color: "var(--ink-3)" }}>{label} · {width} px</figcaption>
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

export const CompactAllStates: Story = {
  name: "Compact, all states",
  parameters: { layout: "padded", controls: { include: ["width"] } },
  args: { width: 360 },
  render: ({ width }) => (
    <div style={{ display: "grid", gap: 8, width, maxWidth: "100%" }}>
      {SEEDS.map((seed) => <DemoTile key={seed} seed={seed} footprint="compact" />)}
      {SEEDS.map((seed) => <DemoTile key={`${seed}-bare`} seed={seed} footprint="compact" showControl={false} />)}
    </div>
  ),
};

export const DetailsSheet: Story = { name: "Details sheet", args: { defaultOpen: true } };
export const DetailsSheetPhone: Story = {
  name: "Details sheet, phone",
  args: { defaultOpen: true },
  parameters: { viewport: { defaultViewport: "mobile2" } },
};
