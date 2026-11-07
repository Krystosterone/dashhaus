import type { Meta, StoryObj } from "@storybook/react";
import { DemoMediaPlayerTile as DemoTile } from "./demo/DemoMediaPlayerTile";
import { MEDIA_PLAYER_WORST_CASE } from "@dashhaus/core/seeds/mediaPlayer";

const SIZES = { S: 174, M: 360, L: 464 } as const;
const SEEDS = ["playing", "paused", "buffering", "muted", "stream", "idle", "on", "standby", "off", "other", "unavailable", "long"] as const;

const meta = {
  title: "Orb/Cards/MediaPlayer",
  component: DemoTile,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "One media player (`media_player.*`): a control. What it is doing in words (Playing, Paused, Buffering, Idle, On, Standby, Off, or " +
          "the integration's own), what is playing on the status line, the title first, and one press for what it can do now: Pause while " +
          "it plays, Play while it doesn't, Turn on while it is off or asleep. Playing is the accent, and it never glows. Featured, the " +
          "artwork, the title and artist, and how far in: a line and a clock that run on by themselves, with no re-render. Tap the name, or " +
          "press and hold the orb, for skip, the volume, mute, the source, turning it off and today's playing. Same sizes " +
          "and heights as the other cards.",
      },
    },
  },
  argTypes: {
    seed: { control: "select", options: SEEDS, description: "Example player" },
    width: { control: { type: "range", min: 160, max: 640, step: 2 }, description: "Container width in px" },
    footprint: { control: "inline-radio", options: ["compact", "standard", "featured"] },
    showControl: { control: "boolean", description: "Compact only: show the control in the row (off: the row opens details)" },
    defaultOpen: { control: "boolean", description: "Open the detail sheet on load" },
  },
  args: { seed: "playing", width: SIZES.M, footprint: "standard" },
  render: (args) => <DemoTile key={`${args.seed}-${args.defaultOpen}`} {...args} />,
} satisfies Meta<typeof DemoTile>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playing: Story = {};
/** Paused part way: the clock holds where it was; the pill plays it. */
export const Paused: Story = { args: { seed: "paused" } };
/** Buffering: the verb, never a guessed end. It is on its way to playing, so the accent stays and the pill pauses it. */
export const Buffering: Story = { args: { seed: "buffering" } };
/** Muted while it plays: said after what is playing, and as the readout where the volume would be. */
export const Muted: Story = { args: { seed: "muted" } };
/** A radio stream: no duration, so no progress is drawn, never a guessed one; no artwork, so no empty well. */
export const Stream: Story = { args: { seed: "stream", footprint: "featured" } };
export const Idle: Story = { args: { seed: "idle" } };
/** A TV that is on with nothing it reports as playing: the room on the status line. */
export const On: Story = { args: { seed: "on" } };
export const Standby: Story = { args: { seed: "standby" } };
export const Off: Story = { args: { seed: "off" } };
/** A state Home Assistant doesn't name, said in the integration's own words, never guessed onto one it does. */
export const OtherState: Story = { name: "Other state", args: { seed: "other" } };
/** Featured: the artwork in its well, the title and artist, and how far in, the line and clock running on their own. */
export const Featured: Story = { args: { footprint: "featured" } };
export const Unavailable: Story = { args: { seed: "unavailable" } };
/**
 * Realistic worst-case data from the demo seeds (MEDIA_PLAYER_WORST_CASE): long everything on an hour-long track with art
 * that isn't square, a stream with no duration and no artwork, a one-letter player, every feature off, a long source
 * list, an integration's long state, gone and never seen.
 */
export const WorstCase: Story = {
  name: "Worst case",
  parameters: { layout: "padded", controls: { include: ["width", "footprint"] } },
  render: ({ width, footprint }) => (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-start" }}>
      {MEDIA_PLAYER_WORST_CASE.map((seed, index) => <DemoTile key={index} seed={seed} width={width} footprint={footprint} />)}
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
/** A TV's details: nothing playing, its sources, and turning it off. */
export const DetailsSources: Story = { name: "Details, sources", args: { seed: "on", defaultOpen: true } };
export const DetailsUnavailable: Story = { name: "Details, unavailable", args: { seed: "unavailable", defaultOpen: true } };
export const DetailsPhone: Story = {
  name: "Details, phone",
  args: { defaultOpen: true },
  parameters: { viewport: { defaultViewport: "mobile2" } },
};
