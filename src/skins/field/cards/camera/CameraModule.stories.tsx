import type { Meta, StoryObj } from "@storybook/react";
import { CameraModule } from "./CameraModule";
import type { FieldFootprint } from "../../shared/ui";
import { CAMERA_SEEDS, CAMERA_WORST_CASE } from "@dashhaus/core/seeds/camera";
import { onHourCycle } from "@dashhaus/core/seeds/clock";
import { HourCycleProvider } from "@dashhaus/core/hooks";
import type { CameraSeed, CameraSeedName } from "@dashhaus/core/seeds/camera";

const SIZES = { S: 200, M: 340, L: 464 } as const;
const SEEDS = Object.keys(CAMERA_SEEDS) as CameraSeedName[];

interface DemoProps { width?: number; footprint?: FieldFootprint; still?: boolean; paused?: boolean; defaultOpen?: boolean; live?: boolean }

const openNothing = () => {};

/**
 * Storybook has no live stream to open, so the still opens the panel, as the name does; with `live`, it stands in for
 * one that opens nothing.
 */
function DemoCamera({ seed, width, live, ...props }: DemoProps & { seed: CameraSeed }) {
  return (
    <div style={{ width, maxWidth: "100%" }}>
      <CameraModule entity={seed.entity} {...props} onOpenLive={live ? openNothing : undefined} />
    </div>
  );
}

function StoryCamera({ camera, ...props }: DemoProps & { camera: CameraSeedName }) {
  return <DemoCamera seed={CAMERA_SEEDS[camera]} {...props} />;
}

const meta = {
  title: "Field/Cards/Camera",
  component: StoryCamera,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "One camera as a field module, a doorbell or a nursery's: a reading. Its body is the screen, the still a window in it " +
          "beside the screen's words (IDLE, REC, LIVE). The still loads and refreshes only while it is seen; a row has none. " +
          "The name opens the detail panel, as on every module; the still opens Home Assistant's live stream inside Home " +
          "Assistant (here, the panel), and the panel carries a Live key to it.",
      },
    },
  },
  argTypes: {
    camera: { control: "select", options: SEEDS, description: "Example camera" },
    width: { control: { type: "range", min: 180, max: 640, step: 2 }, description: "Container width in px" },
    footprint: { control: "inline-radio", options: ["compact", "standard"], description: "Module height" },
    still: { control: "boolean", description: "False: no still, as `stills: false` on the dashboard" },
    paused: { control: "boolean", description: "Hold the still, as a `quiet` dashboard does" },
    defaultOpen: { control: "boolean", description: "Open the detail panel on load" },
    live: { control: "boolean", description: "Give it a live stream to open, as inside Home Assistant (here it opens nothing)" },
  },
  args: { camera: "idle", width: SIZES.M, footprint: "standard" },
  render: (args) => <StoryCamera key={`${args.camera}-${args.defaultOpen}-${args.live}`} {...args} />,
} satisfies Meta<typeof StoryCamera>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Idle: Story = {};
export const Recording: Story = { args: { camera: "recording" } };
export const Streaming: Story = { args: { camera: "streaming" } };
/** A state Home Assistant doesn't name: blank segments, the meta line saying it in the integration's own words. */
export const OtherState: Story = { name: "Other state", args: { camera: "other" } };
/** Home Assistant has given no still yet: the window is the screen with the camera unlit, the meta line No picture. */
export const NoStill: Story = { name: "No still", args: { camera: "noStill" } };
/** The still fails to load with no frame to keep: the same, never a broken image. */
export const StillFails: Story = { name: "Still fails", args: { camera: "failed" } };
/** A `quiet` dashboard holds the still: it loads once seen, never on a timer, and the meta line says when it is from. */
export const Quiet: Story = { args: { paused: true } };
/** `stills: false`: no still is fetched or drawn; the body is the screen alone, and the panel's Live key still opens the stream. */
export const StillsOff: Story = { name: "Stills off", args: { still: false } };
/**
 * On a 12-hour dashboard (YAML `hour_cycle: h12`): every state and the worst case, each time the
 * module says on that clock, from the seeds as the mapper writes them there (`onHourCycle`).
 * Drawn at the chosen width and again at the narrowest, where a line that clips drops a time whole.
 */
export const TwelveHourClock: Story = {
  name: "12-hour clock",
  decorators: [(Story) => <HourCycleProvider hourCycle="h12"><Story /></HourCycleProvider>],
  parameters: { layout: "padded", controls: { include: ["width", "footprint"] } },
  render: ({ width, footprint }) => (
    <div style={{ display: "grid", gap: 24 }}>
      {[width, footprint === "compact" ? 260 : SIZES.S].map((at, row) => (
        <div key={row} style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-start" }}>
          {[...SEEDS.map((name) => CAMERA_SEEDS[name]), ...CAMERA_WORST_CASE].map((seed, index) => <DemoCamera key={index} paused seed={onHourCycle(seed, "h12")} width={at} footprint={footprint} />)}
        </div>
      ))}
    </div>
  ),
};

/** Blank segments on the screen and when it was last seen; the window holds no frame. */
export const Unavailable: Story = { args: { camera: "unavailable" } };

/** Every slot at its widest: the worst-case seeds. */
export const WorstCase: Story = {
  name: "Worst case",
  parameters: { layout: "padded", controls: { include: ["width", "footprint"] } },
  render: ({ width, footprint }) => (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-start" }}>
      {CAMERA_WORST_CASE.map((seed) => <DemoCamera key={seed.entity.entityId} seed={seed} width={width} footprint={footprint} />)}
    </div>
  ),
};

/** Every example at one width. Heights match, whatever the state. */
export const AllStates: Story = {
  name: "All states",
  parameters: { layout: "padded", controls: { include: ["width", "footprint"] } },
  render: ({ width, footprint }) => (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-start" }}>
      {SEEDS.map((name) => <StoryCamera key={name} camera={name} width={width} footprint={footprint} />)}
    </div>
  ),
};

/** The same camera at S, M and L container widths. */
export const Sizes: Story = {
  parameters: { layout: "padded", controls: { include: ["camera", "footprint"] } },
  render: ({ camera, footprint }) => (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 24, alignItems: "flex-start" }}>
      {(Object.entries(SIZES) as [keyof typeof SIZES, number][]).map(([label, width]) => (
        <figure key={label} style={{ margin: 0, display: "grid", gap: 8 }}>
          <figcaption style={{ font: "600 11px var(--fd-sans)", letterSpacing: "0.06em", color: "var(--fd-ink-2)" }}>{label} · {width} PX</figcaption>
          <StoryCamera key={camera} camera={camera} width={width} footprint={footprint} />
        </figure>
      ))}
    </div>
  ),
};

/** The same entity at both footprints, the 64 px row and the 160 px module, at one width. */
export const Footprints: Story = {
  parameters: { layout: "padded", controls: { include: ["camera", "width"] } },
  render: ({ camera, width }) => (
    <div style={{ display: "grid", gap: 8, width, maxWidth: "100%" }}>
      {(["compact", "standard"] as const).map((footprint) => <StoryCamera key={footprint} camera={camera} footprint={footprint} />)}
    </div>
  ),
};

/** Every example as a 64 px row, stacked as a phone's column would be: glyph, name and screen, never a picture. */
export const Compact: Story = {
  args: { footprint: "compact" },
  parameters: { layout: "padded", controls: { include: ["width"] } },
  render: ({ width }) => (
    <div style={{ display: "grid", gap: 8, width, maxWidth: "100%" }}>
      {SEEDS.map((name) => <StoryCamera key={name} camera={name} footprint="compact" />)}
    </div>
  ),
};

/** The detail panel: the whole still at the panel's width, the screen under it, then when and what. */
export const Details: Story = { args: { defaultOpen: true } };

/** Where the host has a live stream (Home Assistant's more-info), a Live key in the panel opens it. */
export const DetailsLive: Story = { name: "Details, live view", args: { defaultOpen: true, live: true } };

/** A portrait doorbell's still, whole in the panel, the window's sides left dark. */
export const DetailsTall: Story = { name: "Details, tall still", args: { camera: "tall", defaultOpen: true } };

/** Unavailable: blank segments and when it was last seen, and no picture at all. */
export const DetailsUnavailable: Story = { name: "Details, unavailable", args: { camera: "unavailable", defaultOpen: true } };

/** On a phone the panel is a bottom sheet: drag its header down to close. */
export const DetailsPhone: Story = {
  name: "Details, phone",
  args: { defaultOpen: true },
  parameters: { viewport: { defaultViewport: "mobile2" } },
};
