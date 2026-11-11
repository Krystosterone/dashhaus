import type { Meta, StoryObj } from "@storybook/react";
import { CoverModule } from "./CoverModule";
import type { FieldFootprint } from "../../shared/ui";
import { COVER_SEEDS, COVER_WORST_CASE, useDemoCover } from "@dashhaus/core/seeds/cover";
import type { CoverSeed, CoverSeedName } from "@dashhaus/core/seeds/cover";
import type { CoverAction } from "@dashhaus/core/entities/cover/types";

const SIZES = { S: 200, M: 340, L: 464 } as const;
const SEEDS = Object.keys(COVER_SEEDS) as CoverSeedName[];
/** The worst case's door with the longest name and area, for the question at its widest. */
const LONG_DOOR = COVER_WORST_CASE.find(({ entity }) => entity.entityId === "cover.garage_side")!;

function DemoCover({ seed, width, footprint, defaultOpen, defaultAction }: { seed: CoverSeed; width?: number; footprint?: FieldFootprint; defaultOpen?: boolean; defaultAction?: CoverAction }) {
  const demo = useDemoCover(seed);
  return (
    <div style={{ width, maxWidth: "100%" }}>
      <CoverModule
        entity={demo.entity}
        history={demo.history}
        onOpenCover={demo.onOpenCover}
        onCloseCover={demo.onCloseCover}
        onStopCover={demo.onStopCover}
        onSetPosition={demo.onSetPosition}
        onSetTilt={demo.onSetTilt}
        footprint={footprint}
        defaultOpen={defaultOpen}
        defaultAction={defaultAction}
      />
    </div>
  );
}

function StoryCover({ cover, ...props }: { cover: CoverSeedName; width?: number; footprint?: FieldFootprint; defaultOpen?: boolean }) {
  return <DemoCover seed={COVER_SEEDS[cover]} {...props} />;
}

const meta = {
  title: "Field/Cards/Cover",
  component: StoryCover,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "One cover as a field module: curtains, blinds, shades, a garage door. Press the key to open or close it, or to stop it on the way; its LED is lit while it's open. The screen leads with how open it is, and the fader moves it, its ends magnetic. A garage door, door or gate never moves on one press: its key opens the panel on the question, as the lock's Unlock does, Stop is one press, and its position is shown, not set. Tap the name, or press and hold the key, for the detail panel: quick positions, slats and today. Standard modules are 160 px, compact rows 64 px.",
      },
    },
  },
  argTypes: {
    cover: { control: "select", options: SEEDS, description: "Example cover" },
    width: { control: { type: "range", min: 180, max: 640, step: 2 }, description: "Container width in px" },
    footprint: { control: "inline-radio", options: ["compact", "standard"], description: "Module height" },
    defaultOpen: { control: "boolean", description: "Open the detail panel on load" },
  },
  args: { cover: "curtains", width: SIZES.M, footprint: "standard" },
  render: (args) => <StoryCover key={`${args.cover}-${args.defaultOpen}`} {...args} />,
} satisfies Meta<typeof StoryCover>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Open at 70%: the window lit to it, and the fader where it is. */
export const Open: Story = { name: "Curtains" };
/** A blind that lifts to a position, and whose slats only open and close: the panel's Slats are two keys. */
export const Venetian: Story = { name: "Venetian blind", args: { cover: "venetian" } };
/** Slats and nothing else: Close and Open move the slats, since the cover has no open_cover of its own. */
export const SlatsOnly: Story = { name: "Slats only", args: { cover: "slats" } };
/** Closed: 000% in the dim ink, the window unlit. */
export const Closed: Story = { name: "Shade, closed", args: { cover: "shade" } };
/** On its way: the fader's legend says where it's going, and the key stops it. */
export const Moving: Story = { args: { cover: "moving" } };
/** A garage door with no position, left open: OPEN, a warning on the screen, and one wide key whose press asks first. */
export const GarageDoor: Story = { name: "Garage door", args: { cover: "garage" } };
/** No position, on its way: blank segments, since it's neither open nor shut, and the key says Stop. */
export const GateClosing: Story = { name: "Gate, closing", args: { cover: "gate" } };
/**
 * An RF blind Home Assistant drives on an assumed state: blank segments and Unknown, since it never says where it is,
 * but nothing lies flat. The key opens it, as Home Assistant's own toggle does.
 */
export const Unknown: Story = { args: { cover: "unknown" } };
/** Blank segments on the screen, and when it was last seen. */
export const Unavailable: Story = { args: { cover: "unavailable" } };

/** Every slot at its widest: the worst-case seeds. */
export const WorstCase: Story = {
  name: "Worst case",
  parameters: { layout: "padded", controls: { include: ["width", "footprint"] } },
  render: ({ width, footprint }) => (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-start" }}>
      {COVER_WORST_CASE.map((seed) => <DemoCover key={seed.entity.entityId} seed={seed} width={width} footprint={footprint} />)}
    </div>
  ),
};

/** Every example at one width. Heights match, whatever the state. */
export const AllStates: Story = {
  name: "All states",
  parameters: { layout: "padded", controls: { include: ["width", "footprint"] } },
  render: ({ width, footprint }) => (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-start" }}>
      {SEEDS.map((name) => <StoryCover key={name} cover={name} width={width} footprint={footprint} />)}
    </div>
  ),
};

/** The same cover at S, M and L container widths. */
export const Sizes: Story = {
  parameters: { layout: "padded", controls: { include: ["cover", "footprint"] } },
  render: ({ cover, footprint }) => (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 24, alignItems: "flex-start" }}>
      {(Object.entries(SIZES) as [keyof typeof SIZES, number][]).map(([label, width]) => (
        <figure key={label} style={{ margin: 0, display: "grid", gap: 8 }}>
          <figcaption style={{ font: "600 11px var(--fd-sans)", letterSpacing: "0.06em", color: "var(--fd-ink-2)" }}>{label} · {width} PX</figcaption>
          <StoryCover key={cover} cover={cover} width={width} footprint={footprint} />
        </figure>
      ))}
    </div>
  ),
};

/** The same entity at both footprints, the 64 px row and the 160 px module, at one width. */
export const Footprints: Story = {
  parameters: { layout: "padded", controls: { include: ["cover", "width"] } },
  render: ({ cover, width }) => (
    <div style={{ display: "grid", gap: 8, width, maxWidth: "100%" }}>
      {(["compact", "standard"] as const).map((footprint) => <StoryCover key={footprint} cover={cover} footprint={footprint} />)}
    </div>
  ),
};

/** Every example as a 64 px row, stacked as a phone's column would be. */
export const Compact: Story = {
  args: { footprint: "compact" },
  parameters: { layout: "padded", controls: { include: ["width"] } },
  render: ({ width }) => (
    <div style={{ display: "grid", gap: 8, width, maxWidth: "100%" }}>
      {SEEDS.map((name) => <StoryCover key={name} cover={name} footprint="compact" />)}
    </div>
  ),
};

/** The detail panel: the key and fader, quick positions, today. */
export const Details: Story = { args: { defaultOpen: true } };

/** A blind's panel: its slats on the screen's second channel and on their own fader, in the second parameter's blue. */
export const DetailsSlats: Story = { name: "Details, slats", args: { cover: "blind", defaultOpen: true } };

/** Slats that only open and close: a Closed and an Open key, never a fader for an angle Home Assistant can't set. */
export const DetailsVenetian: Story = { name: "Details, venetian blind", args: { cover: "venetian", defaultOpen: true } };

/** A garage door's panel: close, stop and open, the one that can't act lying flat, and Close and Open ask first. */
export const DetailsGarageDoor: Story = { name: "Details, garage door", args: { cover: "garage", defaultOpen: true } };

/**
 * A press on a garage door, door or gate opens the panel on its question: the worst case's longest name, its yes
 * naming what it moves, in place of the panel's controls. A door with a position has no fader and no quick positions:
 * its position is shown, not set.
 */
export const DetailsClose: Story = {
  name: "Details, close",
  render: ({ width, footprint }) => <DemoCover seed={LONG_DOOR} width={width} footprint={footprint} defaultAction="close" />,
};

/** An unknown cover's panel: close, stop and open all act, since it could be anywhere and on its way. */
export const DetailsUnknown: Story = { name: "Details, unknown", args: { cover: "unknown", defaultOpen: true } };

/** Unavailable: blank segments, and the unavailable hours dashed on the meter. */
export const DetailsUnavailable: Story = { name: "Details, unavailable", args: { cover: "unavailable", defaultOpen: true } };

/** On a phone the panel is a bottom sheet: drag its header down to close. */
export const DetailsPhone: Story = {
  name: "Details, phone",
  args: { defaultOpen: true },
  parameters: { viewport: { defaultViewport: "mobile2" } },
};
