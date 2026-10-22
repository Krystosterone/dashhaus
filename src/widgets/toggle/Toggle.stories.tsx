import type { Meta, StoryObj } from "@storybook/react";
import { DemoToggleTile as DemoTile } from "./demo/DemoToggleTile";

const SIZES = { S: 174, M: 360, L: 464 } as const;
const MODES = ["dnd", "quiet", "guest", "away", "unavailable"] as const;

const meta = {
  title: "Widgets/Toggle",
  component: DemoTile,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "A mode you switch on and off: Do Not Disturb, Quiet, Guest, Away. One input_boolean or switch. Tap the orb or the pill to switch it; " +
          "the pill is a raised button when off and the accent when on, and says when it ends. Press and hold the orb, or tap the name, " +
          "to turn it on for a while (30 min, 1 hour, until morning, until off). Same sizes and heights as the other widgets.",
      },
    },
  },
  argTypes: {
    mode: { control: "select", options: MODES, description: "Example mode" },
    width: { control: { type: "range", min: 160, max: 640, step: 2 }, description: "Container width in px" },
    footprint: { control: "inline-radio", options: ["compact", "standard", "featured"] },
    showControl: { control: "boolean", description: "Compact only: show the control in the row (off: the row opens details)" },
    defaultOpen: { control: "boolean", description: "Open the detail sheet on load" },
  },
  args: { mode: "dnd", width: SIZES.M, footprint: "standard" },
  render: (args) => <DemoTile key={`${args.mode}-${args.defaultOpen}`} {...args} />,
} satisfies Meta<typeof DemoTile>;

export default meta;
type Story = StoryObj<typeof meta>;

export const DoNotDisturb: Story = { name: "Do Not Disturb, on for an hour" };
export const QuietOff: Story = { name: "Quiet mode, off", args: { mode: "quiet" } };
export const GuestOn: Story = { name: "Guest mode, on until turned off", args: { mode: "guest" } };
export const Unavailable: Story = { args: { mode: "unavailable" } };

export const AllStates: Story = {
  name: "All states",
  parameters: { layout: "padded", controls: { include: ["width", "footprint"] } },
  render: ({ width, footprint }) => (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-start" }}>
      {MODES.map((mode) => <DemoTile key={mode} mode={mode} width={width} footprint={footprint} />)}
    </div>
  ),
};

export const Sizes: Story = {
  parameters: { layout: "padded", controls: { include: ["mode", "footprint"] } },
  render: ({ mode, footprint }) => (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 24, alignItems: "flex-start" }}>
      {(Object.entries(SIZES) as [keyof typeof SIZES, number][]).map(([label, width]) => (
        <figure key={label} style={{ margin: 0, display: "grid", gap: 8 }}>
          <figcaption style={{ font: "500 13px var(--font)", color: "var(--ink-3)" }}>{label} · {width} px</figcaption>
          <DemoTile key={`${mode}-${footprint}`} mode={mode} width={width} footprint={footprint} />
        </figure>
      ))}
    </div>
  ),
};

export const CompactAllStates: Story = {
  name: "Compact, all states",
  parameters: { layout: "padded", controls: { include: ["width"] } },
  args: { width: 360 },
  render: ({ width }) => (
    <div style={{ display: "grid", gap: 8, width, maxWidth: "100%" }}>
      {MODES.map((mode) => <DemoTile key={mode} mode={mode} footprint="compact" />)}
    </div>
  ),
};

/** Compact cards keep the shared row anatomy even when arranged as a mode grid. */
export const CompactGrid: Story = {
  parameters: { layout: "padded", controls: { include: [] } },
  render: () => (
    <div style={{ display: "grid", gap: 28 }}>
      {[{ cols: 2, w: 358, label: "Phone, 2 across" }, { cols: 4, w: 760, label: "Tablet, 4 across" }].map(({ cols, w, label }) => (
        <figure key={cols} style={{ margin: 0, display: "grid", gap: 8, width: w, maxWidth: "100%" }}>
          <figcaption style={{ font: "500 13px var(--font)", color: "var(--ink-3)" }}>{label}</figcaption>
          <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, gap: 8 }}>
            {MODES.map((mode) => <DemoTile key={mode} mode={mode} footprint="compact" />)}
          </div>
        </figure>
      ))}
    </div>
  ),
};

export const DetailsSheet: Story = { name: "Details sheet", args: { defaultOpen: true } };
export const DetailsSheetPhone: Story = {
  name: "Details sheet, phone",
  args: { defaultOpen: true },
  parameters: { viewport: { defaultViewport: "mobile2" } },
};
