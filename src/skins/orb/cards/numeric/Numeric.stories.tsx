import type { Meta, StoryObj } from "@storybook/react";
import { DemoNumericTile as DemoTile } from "./demo/DemoNumericTile";
import { NUMERIC_WORST_CASE } from "@dashhaus/core/seeds/numeric";

const SIZES = { S: 174, M: 360, L: 464 } as const;
const SEEDS = ["co2", "power", "energy", "export", "count", "waiting", "unavailable", "long"] as const;

const meta = {
  title: "Orb/Cards/Numeric",
  component: DemoTile,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "One numeric reading (`sensor.*`: CO₂ in ppm, power in W, energy in kWh): a reading, whatever it measures. The icon its device " +
          "class names, the figure in its unit (five places at most, scaled with an SI letter beyond), today's low and high (or a meter's " +
          "rise) as its second metric, and no glow. The status line says the area and what it measures. It has no warning of its own. " +
          "Tap the reading or the name for today's readings by hour. Same sizes and heights as the other cards.",
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
  args: { seed: "co2", width: SIZES.M, footprint: "standard" },
  render: (args) => <DemoTile key={`${args.seed}-${args.defaultOpen}`} {...args} />,
} satisfies Meta<typeof DemoTile>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A measurement: CO₂ in ppm, with today's low and high. */
export const Co2: Story = { name: "CO₂" };
export const Power: Story = { args: { seed: "power" } };
/** A meter that only climbs (`total_increasing`): today says how far it rose, not a low and a high. */
export const Energy: Story = { args: { seed: "energy" } };
/** Negative: the grid's power while solar panels export. The sign is part of the figure, never a warning. Today's `-1240 to 420` can't fit its track whole, so the metric is left out and the strip and the sheet say it. */
export const Negative: Story = { args: { seed: "export" } };
/** No unit and no device class: a count, with the gauge icon and the area alone on the status line. */
export const NoUnit: Story = { name: "No unit", args: { seed: "count" } };
/** Reachable, no reading yet: the sensor card's words, `No reading yet` after the area on the status line and `Waiting…` in the readout. */
export const NoReadingYet: Story = { name: "No reading yet", args: { seed: "waiting" } };
export const Featured: Story = { args: { footprint: "featured" } };
export const Unavailable: Story = { args: { seed: "unavailable" } };
/** Realistic worst-case data from the demo seeds (NUMERIC_WORST_CASE): long names, a huge and a large negative value, no unit, no class, a long unit, zero, and gone and never seen. */
export const WorstCase: Story = {
  name: "Worst case",
  parameters: { layout: "padded", controls: { include: ["width", "footprint"] } },
  render: ({ width, footprint }) => (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-start" }}>
      {NUMERIC_WORST_CASE.map((seed, index) => <DemoTile key={index} seed={seed} width={width} footprint={footprint} />)}
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
/** A meter's details: today's strip climbs, and its summary says how far. */
export const DetailsMeter: Story = { name: "Details, meter", args: { seed: "energy", defaultOpen: true } };
export const DetailsUnavailable: Story = { name: "Details, unavailable", args: { seed: "unavailable", defaultOpen: true } };
export const DetailsPhone: Story = {
  name: "Details, phone",
  args: { defaultOpen: true },
  parameters: { viewport: { defaultViewport: "mobile2" } },
};
