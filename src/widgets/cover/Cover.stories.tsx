import type { Meta, StoryObj } from "@storybook/react";
import { DemoCoverTile as DemoTile } from "./demo/DemoCoverTile";

const SIZES = { S: 174, M: 360, L: 464 } as const;
const COVERS = ["curtains", "blind", "shade", "moving", "garage", "unavailable"] as const;

const meta = {
  title: "Widgets/Cover",
  component: DemoTile,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Curtains, blinds, shades and garage doors (Home Assistant covers; position 0 is closed, 100 open). The slot is the window: " +
          "daylight is the tone, fabric is hatching. Curtains close in from both ends; drag away from the middle to pull them apart. " +
          "Blinds and shades cover from one side. Covers without a position get Close and Open at the ends of the pill. " +
          "The orb opens or closes, and becomes Stop while the cover moves. A garage door left open shows as a warning. Same sizes and heights as every widget.",
      },
    },
  },
  argTypes: {
    cover: { control: "select", options: COVERS, description: "Example cover" },
    width: { control: { type: "range", min: 160, max: 640, step: 2 }, description: "Container width in px" },
    density: { control: "inline-radio", options: ["regular", "thin"] },
    showControl: { control: "boolean", description: "Thin only: show the control in the row (off: the row opens the details sheet)" },
    defaultOpen: { control: "boolean", description: "Open the detail sheet on load" },
  },
  args: { cover: "curtains", width: SIZES.M, density: "regular" },
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

export const AllStates: Story = {
  name: "All states",
  parameters: { layout: "padded", controls: { include: ["width", "density"] } },
  render: ({ width, density }) => (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-start" }}>
      {COVERS.map((c) => <DemoTile key={c} cover={c} width={width} density={density} />)}
    </div>
  ),
};

export const Sizes: Story = {
  parameters: { layout: "padded", controls: { include: ["cover", "density"] } },
  render: ({ cover, density }) => (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 24, alignItems: "flex-start" }}>
      {(Object.entries(SIZES) as [keyof typeof SIZES, number][]).map(([label, w]) => (
        <figure key={label} style={{ margin: 0, display: "grid", gap: 8 }}>
          <figcaption style={{ font: "500 13px var(--font)", color: "var(--ink-3)" }}>{label} · {w} px</figcaption>
          <DemoTile key={`${cover}-${density}`} cover={cover} width={w} density={density} />
        </figure>
      ))}
    </div>
  ),
};

export const ThinAllStates: Story = {
  name: "Thin, all states",
  parameters: { layout: "padded", controls: { include: ["width"] } },
  args: { width: 360 },
  render: ({ width }) => (
    <div style={{ display: "grid", gap: 8, width, maxWidth: "100%" }}>
      {COVERS.map((c) => <DemoTile key={c} cover={c} density="thin" />)}
    </div>
  ),
};

export const DetailsSheet: Story = { name: "Details sheet", args: { cover: "blind", defaultOpen: true } };
export const DetailsSheetPhone: Story = {
  name: "Details sheet, phone",
  args: { cover: "blind", defaultOpen: true },
  parameters: { viewport: { defaultViewport: "mobile2" } },
};
