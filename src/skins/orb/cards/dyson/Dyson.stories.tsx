import type { Meta, StoryObj } from "@storybook/react";
import { DemoDysonTile as DemoTile } from "./demo/DemoDysonTile";
import { DYSON_WORST_CASE } from "@dashhaus/core/seeds/dyson";

const SIZES = { S: 174, M: 360, L: 464 } as const;
const SEEDS = ["on", "heating", "off", "poorAir", "filter", "unavailable"] as const;

const meta = {
  title: "Orb/Cards/Dyson",
  component: DemoTile,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "One Dyson purifier fan (`fan.*` from the `dyson_local` integration), composed with its device's air " +
          "sensors, filters, night mode and, on a Hot+Cool, its heater. Tap the orb to switch it and slide the groove " +
          "for one of its ten speeds; the groove says Auto while it picks its own. The status line names the room and " +
          "the air, or what it runs as, and leads with a warning while the air is poor or a filter is worn. Press and " +
          "hold the orb, or tap the name, for Auto, the oscillation range, the airflow, night mode, heat, every reading " +
          "in Dyson's bands, the filters and today. Same sizes and heights as the other cards.",
      },
    },
  },
  argTypes: {
    seed: { control: "select", options: SEEDS, description: "Example entity" },
    width: { control: { type: "range", min: 160, max: 640, step: 2 }, description: "Container width in px" },
    footprint: { control: "inline-radio", options: ["compact", "standard", "featured"] },
    showControl: { control: "boolean", description: "Compact only: show the control in the row (off: the row opens details)" },
    defaultOpen: { control: "boolean", description: "Open the detail sheet on load" },
  },
  args: { seed: "on", width: SIZES.M, footprint: "standard" },
  render: (args) => <DemoTile key={`${args.seed}-${args.defaultOpen}`} {...args} />,
} satisfies Meta<typeof DemoTile>;

export default meta;
type Story = StoryObj<typeof meta>;

export const On: Story = {};
/** A Hot+Cool in Auto, heating to 23°: it claims the energy bloom while it heats. */
export const Heating: Story = { args: { seed: "heating" } };
export const Off: Story = { args: { seed: "off" } };
/** Fine particles past Dyson's Poor band: the status line leads with the warning. */
export const PoorAir: Story = { name: "Poor air", args: { seed: "poorAir" } };
/** Both filters under 10%: it says to change them. */
export const Filter: Story = { name: "Change filter", args: { seed: "filter" } };
export const Unavailable: Story = { args: { seed: "unavailable" } };
/** Realistic worst-case data from the demo seeds (DYSON_WORST_CASE): long names, values at their limits. */
export const WorstCase: Story = {
  name: "Worst case",
  parameters: { layout: "padded", controls: { include: ["width", "footprint"] } },
  render: ({ width, footprint }) => (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-start" }}>
      {DYSON_WORST_CASE.map((seed, index) => <DemoTile key={index} seed={seed} width={width} footprint={footprint} />)}
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
/** A Hot+Cool's sheet: heat on, its target, and formaldehyde among the readings. */
export const DetailsHeating: Story = { name: "Details, heating", args: { seed: "heating", defaultOpen: true } };
/** A Humidify+Cool's sheet: its ranges from its own select, Breeze among them. */
export const DetailsHumidifyCool: Story = { name: "Details, Humidify+Cool", args: { seed: "off", defaultOpen: true } };
export const DetailsUnavailable: Story = { name: "Details, unavailable", args: { seed: "unavailable", defaultOpen: true } };
export const DetailsPhone: Story = {
  name: "Details, phone",
  args: { defaultOpen: true },
  parameters: { viewport: { defaultViewport: "mobile2" } },
};
