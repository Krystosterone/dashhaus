import type { Meta, StoryObj } from "@storybook/react";
import type { FieldFootprint } from "../../shared/ui";
import { ClimateModule } from "./ClimateModule";
import { CLIMATE_SEEDS, useDemoClimate } from "./demo/useDemoClimate";
import type { ClimateSeedName } from "./demo/useDemoClimate";

const SIZES = { S: 200, M: 340, L: 464 } as const;
const CLIMATES = Object.keys(CLIMATE_SEEDS) as ClimateSeedName[];

function DemoClimate({ climate, width, footprint, defaultOpen }: { climate: ClimateSeedName; width?: number; footprint?: FieldFootprint; defaultOpen?: boolean }) {
  const demo = useDemoClimate(CLIMATE_SEEDS[climate]);
  return (
    <div style={{ width, maxWidth: "100%" }}>
      <ClimateModule {...demo} footprint={footprint} defaultOpen={defaultOpen} />
    </div>
  );
}

const meta = {
  title: "Field/Cards/Climate",
  component: DemoClimate,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "One climate entity as Field hardware. The screen leads with room temperature and keeps the target and HVAC action secondary. " +
          "Press the thermostat key to switch it; slide the fader to set one target or the orange/blue thumbs to set an ordered range. " +
          "Tap the name, or press and hold the key, for exact range steps, supported modes, presets, fan choices and today's neutral runtime.",
      },
    },
  },
  argTypes: {
    climate: { control: "select", options: CLIMATES, description: "Example climate entity" },
    width: { control: { type: "range", min: 180, max: 640, step: 2 }, description: "Container width in px" },
    footprint: { control: "inline-radio", options: ["compact", "standard"], description: "Module height" },
    defaultOpen: { control: "boolean", description: "Open the detail panel on load" },
  },
  args: { climate: "heating", width: SIZES.M, footprint: "standard" },
  render: (args) => <DemoClimate key={`${args.climate}-${args.defaultOpen}`} {...args} />,
} satisfies Meta<typeof DemoClimate>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Heating: Story = {};
export const Cooling: Story = { args: { climate: "cooling" } };
export const AutoRange: Story = { name: "Auto range", args: { climate: "range" } };
export const Off: Story = { args: { climate: "off" } };
export const Dry: Story = { args: { climate: "dry" } };
export const FanOnly: Story = { name: "Fan only", args: { climate: "fan" } };
export const Unavailable: Story = { args: { climate: "unavailable" } };
export const WorstCase: Story = { name: "Worst case", args: { climate: "worstCase" } };

/** Every normalized climate state at one width. Module heights stay fixed. */
export const AllStates: Story = {
  name: "All states",
  parameters: { layout: "padded", controls: { include: ["width", "footprint"] } },
  render: ({ width, footprint }) => (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-start" }}>
      {CLIMATES.map((climate) => <DemoClimate key={climate} climate={climate} width={width} footprint={footprint} />)}
    </div>
  ),
};

/** The same thermostat at the supported container widths. */
export const Sizes: Story = {
  parameters: { layout: "padded", controls: { include: ["climate", "footprint"] } },
  render: ({ climate, footprint }) => (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 24, alignItems: "flex-start" }}>
      {(Object.entries(SIZES) as [keyof typeof SIZES, number][]).map(([label, width]) => (
        <figure key={label} style={{ margin: 0, display: "grid", gap: 8 }}>
          <figcaption style={{ font: "600 11px var(--fd-sans)", letterSpacing: "0.06em", color: "var(--fd-ink-2)" }}>{label} · {width} PX</figcaption>
          <DemoClimate key={climate} climate={climate} width={width} footprint={footprint} />
        </figure>
      ))}
    </div>
  ),
};

/** The same entity at both footprints, the 64 px row and the 160 px module, at one width. */
export const Footprints: Story = {
  parameters: { layout: "padded", controls: { include: ["climate", "width"] } },
  render: ({ climate, width }) => (
    <div style={{ display: "grid", gap: 8, width, maxWidth: "100%" }}>
      {(["compact", "standard"] as const).map((footprint) => <DemoClimate key={footprint} climate={climate} footprint={footprint} />)}
    </div>
  ),
};

/** Every state as a 64 px controls-column row. */
export const Compact: Story = {
  args: { footprint: "compact" },
  parameters: { layout: "padded", controls: { include: ["width"] } },
  render: ({ width }) => (
    <div style={{ display: "grid", gap: 8, width, maxWidth: "100%" }}>
      {CLIMATES.map((climate) => <DemoClimate key={climate} climate={climate} footprint="compact" />)}
    </div>
  ),
};

export const Details: Story = { args: { defaultOpen: true } };
export const DetailsRange: Story = { name: "Details, range", args: { climate: "range", defaultOpen: true } };
export const DetailsUnavailable: Story = { name: "Details, unavailable", args: { climate: "unavailable", defaultOpen: true } };
export const DetailsPhone: Story = {
  name: "Details, phone",
  args: { defaultOpen: true },
  parameters: { viewport: { defaultViewport: "mobile2" } },
};
