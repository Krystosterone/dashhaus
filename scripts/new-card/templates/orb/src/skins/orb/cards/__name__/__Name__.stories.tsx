import type { Meta, StoryObj } from "@storybook/react";
import { Demo__Name__Tile as DemoTile } from "./demo/Demo__Name__Tile";
import { __CONST___SEEDS, __CONST___WORST_CASE } from "__seeds__";
import type { __Name__SeedName } from "__seeds__";

const SIZES = { S: 174, M: 360, L: 464 } as const;
const SEEDS = Object.keys(__CONST___SEEDS) as __Name__SeedName[];

const meta = {
  title: "Orb/Cards/__Name__",
  component: DemoTile,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component: "One __label__ (`__domains__`). __about__ Same sizes and heights as the other cards.",
      },
    },
  },
  argTypes: {
    seed: { control: "select", options: SEEDS, description: "Example __label__" },
    width: { control: { type: "range", min: 160, max: 640, step: 2 }, description: "Container width in px" },
    footprint: { control: "inline-radio", options: ["compact", "standard", "featured"] },
    showControl: { control: "boolean", description: "Compact only: show the control in the row (off: the row opens details)" },
    defaultOpen: { control: "boolean", description: "Open the detail sheet on load" },
  },
  args: { seed: "__firstSeed__", width: SIZES.M, footprint: "standard" },
  render: (args) => <DemoTile key={`${String(args.seed)}-${args.defaultOpen}`} {...args} />,
} satisfies Meta<typeof DemoTile>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The first seed, named as every skin names a story on it (AGENTS.md → Storybook: a state both skins draw has one name). */
export const Default: Story = { name: "__firstSeedWords__" };
export const Unavailable: Story = { args: { seed: "__unavailableSeed__" } };
/** Realistic worst-case data from the demo seeds (__CONST___WORST_CASE): long names, values at their limits. */
export const WorstCase: Story = {
  name: "Worst case",
  parameters: { layout: "padded", controls: { include: ["width", "footprint"] } },
  render: ({ width, footprint }) => (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-start" }}>
      {__CONST___WORST_CASE.map((seed, index) => <DemoTile key={index} seed={seed} width={width} footprint={footprint} />)}
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
          <DemoTile seed={seed} width={width} footprint={footprint} />
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
export const DetailsUnavailable: Story = { name: "Details, unavailable", args: { seed: "__unavailableSeed__", defaultOpen: true } };
export const DetailsPhone: Story = {
  name: "Details, phone",
  args: { defaultOpen: true },
  parameters: { viewport: { defaultViewport: "mobile2" } },
};
