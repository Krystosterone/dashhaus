import type { Meta, StoryObj } from "@storybook/react";
import { DemoVacuumTile as DemoTile } from "./demo/DemoVacuumTile";
import { VACUUM_WORST_CASE } from "@dashhaus/core/seeds/vacuum";

const SIZES = { S: 174, M: 360, L: 464 } as const;
const SEEDS = ["cleaning", "docked", "returning", "paused", "error", "lowBattery", "other", "basic", "unavailable", "long"] as const;

const meta = {
  title: "Orb/Cards/Vacuum",
  component: DemoTile,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "One robot vacuum (`vacuum.*`), its battery its own: a control. What it is doing in words (Cleaning, Docked, Returning, Paused, " +
          "or the integration's own), and one press for what it can do now: Pause while it moves, Start or Resume while it stands. Cleaning " +
          "is the accent, and it never glows. An error leads the status line behind the warn marker with what went wrong; a low battery while it " +
          "stands away from the dock does too. Tap the name, or press and hold the orb, for the dock, locate, its fan speeds and today's cleaning. Same " +
          "sizes and heights as the other cards.",
      },
    },
  },
  argTypes: {
    seed: { control: "select", options: SEEDS, description: "Example vacuum" },
    width: { control: { type: "range", min: 160, max: 640, step: 2 }, description: "Container width in px" },
    footprint: { control: "inline-radio", options: ["compact", "standard", "featured"] },
    showControl: { control: "boolean", description: "Compact only: show the control in the row (off: the row opens details)" },
    defaultOpen: { control: "boolean", description: "Open the detail sheet on load" },
  },
  args: { seed: "cleaning", width: SIZES.M, footprint: "standard" },
  render: (args) => <DemoTile key={`${args.seed}-${args.defaultOpen}`} {...args} />,
} satisfies Meta<typeof DemoTile>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Cleaning: Story = {};
export const Docked: Story = { args: { seed: "docked" } };
/** On its way back to the dock: a transition, said as one; a press pauses it where it is. */
export const Returning: Story = { args: { seed: "returning" } };
export const Paused: Story = { args: { seed: "paused" } };
/** An error is urgent: the warn marker leads the status line with what went wrong; the pill starts it again. Never more glow (attention-budget skill). */
export const InError: Story = { name: "Error", args: { seed: "error" } };
/** Idle away from its dock with a low battery: advisory, about the device. Docked or charging, it never warns. */
export const LowBattery: Story = { name: "Low battery", args: { seed: "lowBattery" } };
/** A state Home Assistant doesn't name, said in the integration's own words, never guessed onto one it does. */
export const OtherState: Story = { name: "Other state", args: { seed: "other" } };
/** A vacuum that can't pause: cleaning, its one press sends it back to the dock. */
export const NoPause: Story = { name: "No pause", args: { seed: "basic" } };
export const Featured: Story = { args: { footprint: "featured" } };
export const Unavailable: Story = { args: { seed: "unavailable" } };
/** Realistic worst-case data from the demo seeds (VACUUM_WORST_CASE): long names in error, seven fan speeds, a one-letter vacuum, a battery at the line, an integration's long state, gone and never seen. */
export const WorstCase: Story = {
  name: "Worst case",
  parameters: { layout: "padded", controls: { include: ["width", "footprint"] } },
  render: ({ width, footprint }) => (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-start" }}>
      {VACUUM_WORST_CASE.map((seed, index) => <DemoTile key={index} seed={seed} width={width} footprint={footprint} />)}
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
/** In error: what went wrong leads, the pill starts it again, and the dock waits beside locate. */
export const DetailsError: Story = { name: "Details, error", args: { seed: "error", defaultOpen: true } };
export const DetailsUnavailable: Story = { name: "Details, unavailable", args: { seed: "unavailable", defaultOpen: true } };
export const DetailsPhone: Story = {
  name: "Details, phone",
  args: { defaultOpen: true },
  parameters: { viewport: { defaultViewport: "mobile2" } },
};
