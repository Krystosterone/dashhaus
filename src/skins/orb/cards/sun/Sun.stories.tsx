import type { Meta, StoryObj } from "@storybook/react";
import { DemoSunTile as DemoTile } from "./demo/DemoSunTile";
import { SUN_SEEDS, SUN_WORST_CASE } from "@dashhaus/core/seeds/sun";
import { onHourCycle } from "@dashhaus/core/seeds/clock";
import { HourCycleProvider } from "@dashhaus/core/hooks";

const SIZES = { S: 174, M: 360, L: 464 } as const;
const SEEDS = ["normal", "evening", "dawn", "summer", "polarDay", "waiting", "unavailable", "long"] as const;

const meta = {
  title: "Orb/Cards/Sun",
  component: DemoTile,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "The sun (`sun.sun`): a reading. A bare icon pointing the way the sun goes next, what comes next on the dashboard's " +
          "clock as the readout, and no glow. The featured card and the sheet draw today's path with the sun on it, worked " +
          "out from the home's location. Tap the reading or the name for every time to come. Same sizes and heights as the other cards.",
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

/** Up: it sets at the end of the afternoon, and rises again tomorrow. */
export const Normal: Story = {};
/** Down since sunset: it rises tomorrow morning, its icon pointing up. */
export const Evening: Story = { name: "After sunset", args: { seed: "evening" } };
/** Down in the dawn: a countdown of minutes to the sunrise. */
export const Dawn: Story = { name: "Before sunrise", args: { seed: "dawn" } };
/** A long summer day. */
export const Summer: Story = { args: { seed: "summer", footprint: "featured" } };
/** High in the Arctic in June: no sunset reported, so it says so in words. */
export const PolarDay: Story = { name: "Up all day", args: { seed: "polarDay", footprint: "featured" } };
export const NoReadingYet: Story = { name: "No reading yet", args: { seed: "waiting" } };
export const Featured: Story = { args: { footprint: "featured" } };
/**
 * On a 12-hour dashboard (YAML `hour_cycle: h12`): every state, the worst case among them, each time the card says
 * on that clock, from the seeds as the mapper writes them there (`onHourCycle`).
 */
export const TwelveHourClock: Story = {
  name: "12-hour clock",
  decorators: [(Story) => <HourCycleProvider hourCycle="h12"><Story /></HourCycleProvider>],
  parameters: { layout: "padded", controls: { include: ["width", "footprint"] } },
  render: ({ width, footprint }) => (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-start" }}>
      {SEEDS.map((name) => <DemoTile key={name} seed={onHourCycle(SUN_SEEDS[name], "h12")} width={width} footprint={footprint} />)}
    </div>
  ),
};
export const Unavailable: Story = { args: { seed: "unavailable" } };
/** Realistic worst-case data from the demo seeds (SUN_WORST_CASE): long names, a polar night and a polar day. */
export const WorstCase: Story = {
  name: "Worst case",
  parameters: { layout: "padded", controls: { include: ["width", "footprint"] } },
  render: ({ width, footprint }) => (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-start" }}>
      {SUN_WORST_CASE.map((seed, index) => <DemoTile key={index} seed={seed} width={width} footprint={footprint} />)}
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
/** The details on a 12-hour clock: every time in them with its period, today's sunrise and sunset under the path. */
export const DetailsTwelveHourClock: Story = { name: "Details, 12-hour clock", decorators: [(Story) => <HourCycleProvider hourCycle="h12"><Story /></HourCycleProvider>],
  render: ({ seed, width, footprint }) => <DemoTile seed={onHourCycle(typeof seed === "string" ? SUN_SEEDS[seed] : seed, "h12")} width={width} footprint={footprint} defaultOpen />,
};
export const DetailsUnavailable: Story = { name: "Details, unavailable", args: { seed: "unavailable", defaultOpen: true } };
export const DetailsPhone: Story = {
  name: "Details, phone",
  args: { defaultOpen: true },
  parameters: { viewport: { defaultViewport: "mobile2" } },
};
