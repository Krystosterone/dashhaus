import type { Meta, StoryObj } from "@storybook/react";
import { DemoCameraTile as DemoTile } from "./demo/DemoCameraTile";
import { CAMERA_SEEDS, CAMERA_WORST_CASE } from "@dashhaus/core/seeds/camera";
import { onHourCycle } from "@dashhaus/core/seeds/clock";
import { HourCycleProvider } from "@dashhaus/core/hooks";

const SIZES = { S: 174, M: 360, L: 464 } as const;
const SEEDS = ["idle", "recording", "streaming", "other", "noStill", "failed", "tall", "unavailable", "long"] as const;

const meta = {
  title: "Orb/Cards/Camera",
  component: DemoTile,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "One camera (`camera.*`), a doorbell or a nursery's: a reading. A bare camera that says its state without colour, " +
          "its state in words, and its still in a neutral well: beside the words on a standard card, across a featured card, " +
          "whole in the sheet, never in a compact row. The still loads and refreshes only while it is seen. The name and the " +
          "reading open the details, as on every card; the still opens Home Assistant's live stream inside Home Assistant " +
          "(here, with no stream to open, the details), and the sheet carries a Live view pill to it.",
      },
    },
  },
  argTypes: {
    seed: { control: "select", options: SEEDS, description: "Example camera" },
    width: { control: { type: "range", min: 160, max: 640, step: 2 }, description: "Container width in px" },
    footprint: { control: "inline-radio", options: ["compact", "standard", "featured"] },
    showControl: { control: "boolean", description: "Compact only: show the reading in the row (off: the row opens details)" },
    still: { control: "boolean", description: "False: no still, as `stills: false` on the dashboard" },
    paused: { control: "boolean", description: "Hold the still, as a `quiet` dashboard does" },
    defaultOpen: { control: "boolean", description: "Open the detail sheet on load" },
    live: { control: "boolean", description: "Give it a live stream to open, as inside Home Assistant (here it opens nothing)" },
  },
  args: { seed: "idle", width: SIZES.M, footprint: "standard" },
  render: (args) => <DemoTile key={`${args.seed}-${args.defaultOpen}-${args.live}`} {...args} />,
} satisfies Meta<typeof DemoTile>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Idle: Story = {};
export const Recording: Story = { args: { seed: "recording" } };
export const Streaming: Story = { args: { seed: "streaming" } };
/** A state Home Assistant doesn't name, said in the integration's own words, never guessed onto one it does. */
export const OtherState: Story = { name: "Other state", args: { seed: "other" } };
/** Home Assistant has given no still yet: the well holds the camera, and the status line says No picture. */
export const NoStill: Story = { name: "No still", args: { seed: "noStill" } };
/** The still fails to load with no frame to keep: the same, never a broken image. */
export const StillFails: Story = { name: "Still fails", args: { seed: "failed" } };
/** A `quiet` dashboard holds the still: it loads once seen, never on a timer, and says when it is from. */
export const Quiet: Story = { args: { paused: true } };
/** `stills: false`: no still is fetched or drawn; the card is its state and its glyph, and its sheet's Live view pill still opens the stream. */
export const StillsOff: Story = { name: "Stills off", args: { still: false } };
/**
 * On a 12-hour dashboard (YAML `hour_cycle: h12`): every state and the worst case, each time the
 * card says on that clock, from the seeds as the mapper writes them there (`onHourCycle`).
 */
export const TwelveHourClock: Story = {
  name: "12-hour clock",
  decorators: [(Story) => <HourCycleProvider hourCycle="h12"><Story /></HourCycleProvider>],
  parameters: { layout: "padded", controls: { include: ["width", "footprint"] } },
  render: ({ width, footprint }) => (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-start" }}>
      {[...SEEDS.map((name) => CAMERA_SEEDS[name]), ...CAMERA_WORST_CASE].map((seed, index) => <DemoTile key={index} seed={onHourCycle(seed, "h12")} width={width} footprint={footprint} paused />)}
    </div>
  ),
};
export const Unavailable: Story = { args: { seed: "unavailable" } };
export const Featured: Story = { args: { footprint: "featured" } };
/** Realistic worst-case data from the demo seeds (CAMERA_WORST_CASE): no still, a failed one, wide and tall stills, a long name. */
export const WorstCase: Story = {
  name: "Worst case",
  parameters: { layout: "padded", controls: { include: ["width", "footprint"] } },
  render: ({ width, footprint }) => (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-start" }}>
      {CAMERA_WORST_CASE.map((seed, index) => <DemoTile key={index} seed={seed} width={width} footprint={footprint} />)}
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
/** Where the host has a live stream (Home Assistant's more-info), one raised Live view pill under the header opens it. */
export const DetailsLive: Story = { name: "Details, live view", args: { defaultOpen: true, live: true } };
/** A portrait doorbell's still, whole in the sheet, the well's sides left empty. */
export const DetailsTall: Story = { name: "Details, tall still", args: { seed: "tall", defaultOpen: true } };
export const DetailsUnavailable: Story = { name: "Details, unavailable", args: { seed: "unavailable", defaultOpen: true } };
export const DetailsPhone: Story = {
  name: "Details, phone",
  args: { defaultOpen: true },
  parameters: { viewport: { defaultViewport: "mobile2" } },
};
