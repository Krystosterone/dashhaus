import type { Meta, StoryObj } from "@storybook/react";
import { DemoCoverTile as DemoTile } from "./demo/DemoCoverTile";
import { COVER_WORST_CASE } from "@dashhaus/core/seeds/cover";

/** The worst case's door with the longest name and area, for the question at its widest. */
const LONG_DOOR = COVER_WORST_CASE.find(({ entity }) => entity.entityId === "cover.garage_side")!;

const SIZES = { S: 174, M: 360, L: 464 } as const;
const COVERS = ["curtains", "blind", "venetian", "slats", "shade", "moving", "garage", "gate", "frontGate", "unknown", "assumed", "unavailable"] as const;

const meta = {
  title: "Orb/Cards/Cover",
  component: DemoTile,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Curtains, blinds, shades and garage doors (Home Assistant covers; position 0 is closed, 100 open). The slot is the window: " +
          "the groove is the fabric, the accent is the daylight let through. Curtains close in from both ends; drag away from the middle to pull them apart. " +
          "Blinds and shades cover from one side. Covers without a position get Close and Open buttons at the ends of a groove. " +
          "The orb opens or closes, and becomes Stop while the cover moves. A garage door, door or gate never moves on one tap: the orb or either end of its groove " +
          "opens the sheet on the question, Stop is one tap, and its bar asks once let go. A garage door left open shows as a warning. Same sizes and heights as every card.",
      },
    },
  },
  argTypes: {
    cover: { control: "select", options: COVERS, description: "Example cover" },
    width: { control: { type: "range", min: 160, max: 640, step: 2 }, description: "Container width in px" },
    footprint: { control: "inline-radio", options: ["compact", "standard", "featured"] },
    showControl: { control: "boolean", description: "Compact only: show the control in the row (off: the row opens details)" },
    defaultOpen: { control: "boolean", description: "Open the detail sheet on load" },
    defaultAction: { control: "inline-radio", options: ["open", "close"], description: "With defaultOpen: open the sheet on this action's question (a garage door, door or gate)" },
  },
  args: { cover: "curtains", width: SIZES.M, footprint: "standard" },
  render: (args) => <DemoTile key={`${typeof args.cover === "string" ? args.cover : args.cover.entity.entityId}-${args.defaultOpen}-${args.defaultAction}`} {...args} />,
} satisfies Meta<typeof DemoTile>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Curtains: Story = {};
export const BlindWithTilt: Story = { name: "Blind with tilt", args: { cover: "blind" } };
/** A blind that lifts to a position, and whose slats only open and close: the sheet's Slats are Closed and Open. */
export const Venetian: Story = { name: "Venetian blind", args: { cover: "venetian" } };
/** Slats and nothing else: Close and Open move the slats, since the cover has no open_cover of its own. */
export const SlatsOnly: Story = { name: "Slats only", args: { cover: "slats" } };
export const ShadeClosed: Story = { name: "Shade, closed", args: { cover: "shade" } };
export const Moving: Story = { name: "Moving", args: { cover: "moving" } };
/** A garage door left open: the warning leads the status line, and the orb and either end of the groove ask first. */
export const GarageDoor: Story = { name: "Garage door", args: { cover: "garage" } };
/**
 * A gate with a position: its bar sets it, and asks once a tap or a drag lets go ("Move Front gate to 40%?"); on Cancel
 * the bar is back where the gate is. Its quick positions are its ends alone, each asking.
 */
export const FrontGate: Story = { name: "Front gate", args: { cover: "frontGate" } };
/**
 * Unknown: an RF blind Home Assistant drives on an assumed state, so it never says where it is. Not unavailable, so
 * nothing is dashed: it says Unknown, both Close and Open act, and the orb opens it, as Home Assistant's own toggle does.
 */
export const Unknown: Story = { args: { cover: "unknown" } };
/** Closed as Home Assistant assumes, never hears: an RF blind may not be where it's shown, so Close acts as well as Open. */
export const AssumedState: Story = { name: "Assumed state", args: { cover: "assumed" } };
export const Unavailable: Story = { args: { cover: "unavailable" } };
/** Realistic worst-case data from the demo seeds (COVER_WORST_CASE): long and compound names, missing areas, values at their limits. */
export const WorstCase: Story = {
  name: "Worst case",
  parameters: { layout: "padded", controls: { include: ["width", "footprint"] } },
  render: ({ width, footprint }) => (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-start" }}>
      {COVER_WORST_CASE.map((seed, index) => <DemoTile key={index} cover={seed} width={width} footprint={footprint} />)}
    </div>
  ),
};

export const AllStates: Story = {
  name: "All states",
  parameters: { layout: "padded", controls: { include: ["width", "footprint"] } },
  render: ({ width, footprint }) => (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-start" }}>
      {COVERS.map((cover) => <DemoTile key={cover} cover={cover} width={width} footprint={footprint} />)}
    </div>
  ),
};

export const Sizes: Story = {
  parameters: { layout: "padded", controls: { include: ["cover", "footprint"] } },
  render: ({ cover, footprint }) => (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 24, alignItems: "flex-start" }}>
      {(Object.entries(SIZES) as [keyof typeof SIZES, number][]).map(([label, width]) => (
        <figure key={label} style={{ margin: 0, display: "grid", gap: 8 }}>
          <figcaption style={{ font: "500 13px var(--font)", color: "var(--ink-2)" }}>{label} · {width} px</figcaption>
          <DemoTile key={`${cover}-${footprint}`} cover={cover} width={width} footprint={footprint} />
        </figure>
      ))}
    </div>
  ),
};

/** The same entity at every footprint, compact, standard and featured, at one width. */
export const Footprints: Story = {
  parameters: { layout: "padded", controls: { include: ["cover", "width"] } },
  render: ({ cover, width }) => (
    <div style={{ display: "grid", gap: 8, width, maxWidth: "100%" }}>
      {(["compact", "standard", "featured"] as const).map((footprint) => <DemoTile key={footprint} cover={cover} footprint={footprint} />)}
    </div>
  ),
};

export const Compact: Story = {
  name: "Compact",
  parameters: { layout: "padded", controls: { include: ["width"] } },
  args: { width: 360 },
  render: ({ width }) => (
    <div style={{ display: "grid", gap: 8, width, maxWidth: "100%" }}>
      {COVERS.map((cover) => <DemoTile key={cover} cover={cover} footprint="compact" />)}
    </div>
  ),
};

export const Details: Story = { name: "Details", args: { cover: "blind", defaultOpen: true } };
/** Slats that only open and close: two choices, never an angle Home Assistant can't set. */
export const DetailsVenetian: Story = { name: "Details, venetian blind", args: { cover: "venetian", defaultOpen: true } };
/** A garage door's sheet with no question standing: its groove asks, and the line under it says so. */
export const DetailsGarageDoor: Story = { name: "Details, garage door", args: { cover: "garage", defaultOpen: true } };
/**
 * A tap on a garage door, door or gate opens the sheet on its question: the worst case's longest name, its yes naming
 * what it moves. While it stands the bar takes no press and its quick positions make way, so one yes shows.
 */
export const DetailsClose: Story = { name: "Details, close", args: { cover: LONG_DOOR, defaultOpen: true, defaultAction: "close" } };
/**
 * A gate's bar let go between its ends: the sheet asks to move it there, the bar showing where it would go and taking no
 * press, so the second tap of a double tap can't ask again. The yes says where it goes.
 */
export const DetailsMove: Story = { name: "Details, move", args: { cover: "frontGate", defaultOpen: true, defaultAction: { position: 40 } } };
/** An unknown cover's sheet: Unknown in the readout and the slot, and Close and Open both act. */
export const DetailsUnknown: Story = { name: "Details, unknown", args: { cover: "unknown", defaultOpen: true } };
/** Unavailable: what the details still say when Home Assistant can't reach the entity. */
export const DetailsUnavailable: Story = { name: "Details, unavailable", args: { cover: "unavailable", defaultOpen: true } };
export const DetailsPhone: Story = {
  name: "Details, phone",
  args: { cover: "blind", defaultOpen: true },
  parameters: { viewport: { defaultViewport: "mobile2" } },
};
