import type { Meta, StoryObj } from "@storybook/react";
import { DemoCoverTile as DemoTile } from "./demo/DemoCoverTile";
import { COVER_WORST_CASE } from "@dashhaus/core/seeds/cover";

const SIZES = { S: 174, M: 360, L: 464 } as const;
const COVERS = ["curtains", "blind", "shade", "moving", "garage", "gate", "unavailable"] as const;

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
          "The orb opens or closes, and becomes Stop while the cover moves. A garage door left open shows as a warning. Same sizes and heights as every card.",
      },
    },
  },
  argTypes: {
    cover: { control: "select", options: COVERS, description: "Example cover" },
    width: { control: { type: "range", min: 160, max: 640, step: 2 }, description: "Container width in px" },
    footprint: { control: "inline-radio", options: ["compact", "standard", "featured"] },
    showControl: { control: "boolean", description: "Compact only: show the control in the row (off: the row opens details)" },
    defaultOpen: { control: "boolean", description: "Open the detail sheet on load" },
  },
  args: { cover: "curtains", width: SIZES.M, footprint: "standard" },
  render: (args) => <DemoTile key={`${args.cover}-${args.defaultOpen}`} {...args} />,
} satisfies Meta<typeof DemoTile>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Curtains: Story = {};
export const BlindWithTilt: Story = { name: "Blind with tilt", args: { cover: "blind" } };
export const ShadeClosed: Story = { name: "Shade, closed", args: { cover: "shade" } };
export const Moving: Story = { name: "Moving", args: { cover: "moving" } };
export const GarageDoor: Story = { name: "Garage door, left open", args: { cover: "garage" } };
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
/** Unavailable: what the details still say when Home Assistant can't reach the entity. */
export const DetailsUnavailable: Story = { name: "Details, unavailable", args: { cover: "unavailable", defaultOpen: true } };
export const DetailsPhone: Story = {
  name: "Details, phone",
  args: { cover: "blind", defaultOpen: true },
  parameters: { viewport: { defaultViewport: "mobile2" } },
};
