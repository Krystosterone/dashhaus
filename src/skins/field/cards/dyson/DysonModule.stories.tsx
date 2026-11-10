import type { Meta, StoryObj } from "@storybook/react";
import { DysonModule } from "./DysonModule";
import type { FieldFootprint } from "../../shared/ui";
import { DYSON_SEEDS, DYSON_WORST_CASE, useDemoDyson } from "@dashhaus/core/seeds/dyson";
import type { DysonSeed, DysonSeedName } from "@dashhaus/core/seeds/dyson";

const SIZES = { S: 200, M: 340, L: 464 } as const;
const SEEDS = ["on", "pointing", "heating", "heatingWarning", "off", "poorAir", "filter", "unavailable"] as const satisfies readonly DysonSeedName[];

function DemoDyson({ seed, width, footprint, defaultOpen }: { seed: DysonSeed; width?: number; footprint?: FieldFootprint; defaultOpen?: boolean }) {
  const demo = useDemoDyson(seed);
  return (
    <div style={{ width, maxWidth: "100%" }}>
      <DysonModule {...demo} footprint={footprint} defaultOpen={defaultOpen} />
    </div>
  );
}

function StoryDyson({ dyson, ...props }: { dyson: DysonSeedName; width?: number; footprint?: FieldFootprint; defaultOpen?: boolean }) {
  return <DemoDyson seed={DYSON_SEEDS[dyson]} {...props} />;
}

const meta = {
  title: "Field/Cards/Dyson",
  component: StoryDyson,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "One Dyson purifier fan as a field module (`fan.*` from `dyson_local`), composed with its device's air sensors, " +
          "filters, night mode and, on a Hot+Cool, its heater. The key switches it; the fader sets one of its ten speeds, " +
          "and has no thumb while it runs in Auto. The screen says the step, AUTO or OFF, then what it runs as or how the " +
          "air is, behind the warning marker while the air is poor or a filter is worn. Tap the name, or press and hold the " +
          "key, for the panel: the air, mode, oscillation and its range, airflow, night mode, heat, readings, filters and " +
          "today. Standard modules are 160 px, compact rows 64 px.",
      },
    },
  },
  argTypes: {
    dyson: { control: "select", options: SEEDS, description: "Example dyson" },
    width: { control: { type: "range", min: 180, max: 640, step: 2 }, description: "Container width in px" },
    footprint: { control: "inline-radio", options: ["compact", "standard"], description: "Module height" },
    defaultOpen: { control: "boolean", description: "Open the detail panel on load" },
  },
  args: { dyson: "on", width: SIZES.M, footprint: "standard" },
  render: (args) => <StoryDyson key={`${args.dyson}-${args.defaultOpen}`} {...args} />,
} satisfies Meta<typeof StoryDyson>;

export default meta;
type Story = StoryObj<typeof meta>;

export const On: Story = {};
/** Held still, pointing 58° right: no sweep, the screen says where it points. */
export const Pointing: Story = { args: { dyson: "pointing" } };
/** A Hot+Cool in Auto, heating to 23°: AUTO on the screen, and the fader without its thumb. */
export const Heating: Story = { args: { dyson: "heating" } };
/** A Hot+Cool heating to 21° through a worn filter: the warning leads the screen, its heat latched in the panel. */
export const HeatingWarning: Story = { name: "Heating, warning", args: { dyson: "heatingWarning" } };
export const Off: Story = { args: { dyson: "off" } };
/** Fine particles past Dyson's Poor band: the screen's first line leads with the warning. */
export const PoorAir: Story = { name: "Poor air", args: { dyson: "poorAir" } };
/** Both filters under 10%: it says to change them. */
export const Filter: Story = { name: "Change filter", args: { dyson: "filter" } };
/** Blank segments on the screen, and when it was last seen. */
export const Unavailable: Story = { args: { dyson: "unavailable" } };

/** Every slot at its widest: the worst-case seeds. */
export const WorstCase: Story = {
  name: "Worst case",
  parameters: { layout: "padded", controls: { include: ["width", "footprint"] } },
  render: ({ width, footprint }) => (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-start" }}>
      {DYSON_WORST_CASE.map((seed) => <DemoDyson key={seed.entity.entityId} seed={seed} width={width} footprint={footprint} />)}
    </div>
  ),
};

/** Every example at one width. Heights match, whatever the state. */
export const AllStates: Story = {
  name: "All states",
  parameters: { layout: "padded", controls: { include: ["width", "footprint"] } },
  render: ({ width, footprint }) => (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-start" }}>
      {SEEDS.map((name) => <StoryDyson key={name} dyson={name} width={width} footprint={footprint} />)}
    </div>
  ),
};

/** The same dyson at S, M and L container widths. */
export const Sizes: Story = {
  parameters: { layout: "padded", controls: { include: ["dyson", "footprint"] } },
  render: ({ dyson, footprint }) => (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 24, alignItems: "flex-start" }}>
      {(Object.entries(SIZES) as [keyof typeof SIZES, number][]).map(([label, width]) => (
        <figure key={label} style={{ margin: 0, display: "grid", gap: 8 }}>
          <figcaption style={{ font: "600 11px var(--fd-sans)", letterSpacing: "0.06em", color: "var(--fd-ink-2)" }}>{label} · {width} PX</figcaption>
          <StoryDyson key={dyson} dyson={dyson} width={width} footprint={footprint} />
        </figure>
      ))}
    </div>
  ),
};

/** The same entity at both footprints, the 64 px row and the 160 px module, at one width. */
export const Footprints: Story = {
  parameters: { layout: "padded", controls: { include: ["dyson", "width"] } },
  render: ({ dyson, width }) => (
    <div style={{ display: "grid", gap: 8, width, maxWidth: "100%" }}>
      {(["compact", "standard"] as const).map((footprint) => <StoryDyson key={footprint} dyson={dyson} footprint={footprint} />)}
    </div>
  ),
};

/** Every example as a 64 px row, stacked as a phone's column would be. */
export const Compact: Story = {
  args: { footprint: "compact" },
  parameters: { layout: "padded", controls: { include: ["width"] } },
  render: ({ width }) => (
    <div style={{ display: "grid", gap: 8, width, maxWidth: "100%" }}>
      {SEEDS.map((name) => <StoryDyson key={name} dyson={name} footprint="compact" />)}
    </div>
  ),
};

/** The detail panel: the air on its second channel, every control the Dyson has, its readings, filters and today. */
export const Details: Story = { args: { defaultOpen: true } };
/** A Hot+Cool's panel: heat latched on, its target in exact steps, formaldehyde among the readings. */
/** Where it points, on the dial: turn it, or step it with the arrow keys; Still or a width on the keys. */
export const DetailsPointing: Story = { name: "Details, pointing", args: { dyson: "pointing", defaultOpen: true } };
export const DetailsHeating: Story = { name: "Details, heating", args: { dyson: "heating", defaultOpen: true } };
/** A Humidify+Cool's panel: its ranges from its own select, Breeze among them. */
export const DetailsHumidifyCool: Story = { name: "Details, Humidify+Cool", args: { dyson: "off", defaultOpen: true } };

/** Unavailable: blank segments, and the unavailable hours dashed on the meter. */
export const DetailsUnavailable: Story = { name: "Details, unavailable", args: { dyson: "unavailable", defaultOpen: true } };

/** On a phone the panel is a bottom sheet: drag its header down to close. */
export const DetailsPhone: Story = {
  name: "Details, phone",
  args: { defaultOpen: true },
  parameters: { viewport: { defaultViewport: "mobile2" } },
};
