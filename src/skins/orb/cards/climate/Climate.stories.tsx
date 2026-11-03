import type { Meta, StoryObj } from "@storybook/react";
import { DemoClimateTile as DemoTile } from "./demo/DemoClimateTile";
import { CLIMATE_WORST_CASE } from "@dashhaus/core/seeds/climate";

const SIZES = { S: 174, M: 360, L: 464 } as const;
const UNITS = ["heating", "cooling", "range", "dry", "fan", "off", "unavailable"] as const;

const meta = {
  title: "Orb/Cards/Climate",
  component: DemoTile,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "One climate entity per card. Tap the round mode button to switch it off or back to its last mode, use − and + to set the target, " +
          "press and hold the mode button or tap the name for modes, presets, fan and today's history. Same sizes and heights as the light card.",
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
/** Realistic worst-case data from the demo seeds (CLIMATE_WORST_CASE): long and compound names, missing areas, values at their limits. */
export const WorstCase: Story = {
  name: "Worst case",
  parameters: { layout: "padded", controls: { include: ["width", "footprint"] } },
  render: ({ width, footprint }) => (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-start" }}>
      {CLIMATE_WORST_CASE.map((seed, index) => <DemoTile key={index} unit={seed} width={width} footprint={footprint} />)}
    </div>
  ),
};

/** Every state at one size. Heights match the light card's. */
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

/** The same entity at every footprint, compact, standard and featured, at one width. */
export const Footprints: Story = {
  parameters: { layout: "padded", controls: { include: ["unit", "width"] } },
  render: ({ unit, width }) => (
    <div style={{ display: "grid", gap: 8, width, maxWidth: "100%" }}>
      {(["compact", "standard", "featured"] as const).map((footprint) => <DemoTile key={footprint} unit={unit} footprint={footprint} />)}
    </div>
  ),
};

export const Compact: Story = {
  name: "Compact",
  parameters: { layout: "padded", controls: { include: ["width"] } },
  render: ({ width }) => (
    <div style={{ display: "grid", gap: 8, width, maxWidth: "100%" }}>
      {UNITS.map((unit) => <DemoTile key={unit} unit={unit} footprint="compact" />)}
    </div>
  ),
};

/** Modes, presets, fan speed and today's history. */
export const Details: Story = { name: "Details", args: { defaultOpen: true } };
export const DetailsRange: Story = { name: "Details, range", args: { unit: "range", defaultOpen: true } };

/** Unavailable: what the details still say when Home Assistant can't reach the entity. */
export const DetailsUnavailable: Story = { name: "Details, unavailable", args: { unit: "unavailable", defaultOpen: true } };
/** The detail sheet on a phone: a bottom sheet with a grab handle. Drag the header down to dismiss. */
export const DetailsPhone: Story = {
  name: "Details, phone",
  args: { defaultOpen: true },
  parameters: { viewport: { defaultViewport: "mobile2" } },
};
