import type { Meta, StoryObj } from "@storybook/react";
import { DemoClimateTile as DemoTile } from "./demo/DemoClimateTile";

const SIZES = { S: 174, M: 360, L: 464 } as const;
const UNITS = ["heating", "cooling", "range", "off", "unavailable"] as const;

const meta = {
  title: "Widgets/Climate",
  component: DemoTile,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "One climate entity per widget. Tap the round mode button to switch it off or back to its last mode, use − and + to set the target, " +
          "press and hold the mode button or tap the name for modes, presets, fan and today's history. Same sizes and heights as the light widget.",
      },
    },
  },
  argTypes: {
    unit: { control: "select", options: [...UNITS], description: "Example climate entity" },
    width: { control: { type: "range", min: 160, max: 640, step: 2 }, description: "Container width in px" },
    footprint: { control: "inline-radio", options: ["compact", "standard", "featured"] },
    showControl: { control: "boolean", description: "Compact only: show the control in the row (off: the row opens details)" },
    defaultOpen: { control: "boolean", description: "Open the detail sheet on load" },
  },
  args: { unit: "heating", width: SIZES.M, footprint: "standard" },
  render: (args) => <DemoTile key={`${args.unit}-${args.defaultOpen}`} {...args} />,
} satisfies Meta<typeof DemoTile>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Heating: Story = {};
export const CoolingIdle: Story = { name: "Cooling, idle", args: { unit: "cooling" } };
export const HeatCoolRange: Story = { name: "Heat/cool range", args: { unit: "range" } };
export const Off: Story = { args: { unit: "off" } };
export const Unavailable: Story = { args: { unit: "unavailable" } };

/** Every state at one size. Heights match the light widget's. */
export const AllStates: Story = {
  name: "All states",
  parameters: { layout: "padded", controls: { include: ["width", "footprint"] } },
  render: ({ width, footprint }) => (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-start" }}>
      {UNITS.map((unit) => <DemoTile key={unit} unit={unit} width={width} footprint={footprint} />)}
    </div>
  ),
};

export const Sizes: Story = {
  parameters: { layout: "padded", controls: { include: ["unit", "footprint"] } },
  render: ({ unit, footprint }) => (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 24, alignItems: "flex-start" }}>
      {(Object.entries(SIZES) as [keyof typeof SIZES, number][]).map(([label, width]) => (
        <figure key={label} style={{ margin: 0, display: "grid", gap: 8 }}>
          <figcaption style={{ font: "500 13px var(--font)", color: "var(--ink-2)" }}>{label} · {width} px</figcaption>
          <DemoTile key={`${unit}-${footprint}`} unit={unit} width={width} footprint={footprint} />
        </figure>
      ))}
    </div>
  ),
};

export const CompactAllStates: Story = {
  name: "Compact, all states",
  parameters: { layout: "padded", controls: { include: ["width"] } },
  render: ({ width }) => (
    <div style={{ display: "grid", gap: 8, width, maxWidth: "100%" }}>
      {UNITS.map((unit) => <DemoTile key={unit} unit={unit} footprint="compact" />)}
    </div>
  ),
};

/** Modes, presets, fan speed and today's history. */
export const DetailsSheet: Story = { name: "Details sheet", args: { defaultOpen: true } };
export const DetailsSheetRange: Story = { name: "Details sheet, range", args: { unit: "range", defaultOpen: true } };

/** The detail sheet on a phone: a bottom sheet with a grab handle. Drag the header down to dismiss. */
export const DetailsSheetPhone: Story = {
  name: "Details sheet, phone",
  args: { defaultOpen: true },
  parameters: { viewport: { defaultViewport: "mobile2" } },
};
