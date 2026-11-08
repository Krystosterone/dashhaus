import type { Meta, StoryObj } from "@storybook/react";
import { NumericModule } from "./NumericModule";
import type { FieldFootprint } from "../../shared/ui";
import { NUMERIC_SEEDS, NUMERIC_WORST_CASE } from "@dashhaus/core/seeds/numeric";
import type { NumericSeed, NumericSeedName } from "@dashhaus/core/seeds/numeric";

const SIZES = { S: 200, M: 340, L: 464 } as const;
const SEEDS = Object.keys(NUMERIC_SEEDS) as NumericSeedName[];

function DemoNumeric({ seed, width, footprint, defaultOpen }: { seed: NumericSeed; width?: number; footprint?: FieldFootprint; defaultOpen?: boolean }) {
  const demo = seed;
  return (
    <div style={{ width, maxWidth: "100%" }}>
      <NumericModule
        entity={demo.entity}
        history={demo.history}
        footprint={footprint}
        defaultOpen={defaultOpen}
      />
    </div>
  );
}

function StoryNumeric({ numeric, ...props }: { numeric: NumericSeedName; width?: number; footprint?: FieldFootprint; defaultOpen?: boolean }) {
  return <DemoNumeric seed={NUMERIC_SEEDS[numeric]} {...props} />;
}

const meta = {
  title: "Field/Cards/Numeric",
  component: StoryNumeric,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "One numeric reading (`sensor.*`: CO₂ in ppm, power in W, energy in kWh) as a field module. A reading, so nothing on it is pressed: " +
          "the glyph its device class names lies flat where a key would be, and today's meter takes the fader's place. The screen says the figure " +
          "in five places with its unit, scaled with an SI letter beyond; the meta lines what it measures and when it reported. Today is the low " +
          "and high, or a meter's rise. It has no warning of its own. Tap the name for the detail panel. Standard modules are 160 px, compact rows 64 px.",
      },
    },
  },
  argTypes: {
    numeric: { control: "select", options: SEEDS, description: "Example numeric" },
    width: { control: { type: "range", min: 180, max: 640, step: 2 }, description: "Container width in px" },
    footprint: { control: "inline-radio", options: ["compact", "standard"], description: "Module height" },
    defaultOpen: { control: "boolean", description: "Open the detail panel on load" },
  },
  args: { numeric: "co2", width: SIZES.M, footprint: "standard" },
  render: (args) => <StoryNumeric key={`${args.numeric}-${args.defaultOpen}`} {...args} />,
} satisfies Meta<typeof StoryNumeric>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A measurement: CO₂ in ppm, its leading places unlit, today's low and high over the meter. */
export const Co2: Story = { name: "CO₂" };
export const Power: Story = { args: { numeric: "power" } };
/** A meter that only climbs (`total_increasing`): today says how far it rose, not a low and a high. */
export const Energy: Story = { args: { numeric: "energy" } };
/** Negative: the grid's power while solar panels export. The sign takes a place, never a warning. */
export const Negative: Story = { args: { numeric: "export" } };
/** No unit and no device class: a count, with the gauge glyph and when it reported on the meta line. */
export const NoUnit: Story = { name: "No unit", args: { numeric: "count" } };
/** Reachable, no reading yet: blank segments, said on the meta line. */
export const NoReadingYet: Story = { name: "No reading yet", args: { numeric: "waiting" } };
/** Blank segments on the screen, and when it was last seen. */
export const Unavailable: Story = { args: { numeric: "unavailable" } };

/** Every slot at its widest: the worst-case seeds. */
export const WorstCase: Story = {
  name: "Worst case",
  parameters: { layout: "padded", controls: { include: ["width", "footprint"] } },
  render: ({ width, footprint }) => (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-start" }}>
      {NUMERIC_WORST_CASE.map((seed) => <DemoNumeric key={seed.entity.entityId} seed={seed} width={width} footprint={footprint} />)}
    </div>
  ),
};

/** Every example at one width. Heights match, whatever the state. */
export const AllStates: Story = {
  name: "All states",
  parameters: { layout: "padded", controls: { include: ["width", "footprint"] } },
  render: ({ width, footprint }) => (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-start" }}>
      {SEEDS.map((name) => <StoryNumeric key={name} numeric={name} width={width} footprint={footprint} />)}
    </div>
  ),
};

/** The same numeric at S, M and L container widths. */
export const Sizes: Story = {
  parameters: { layout: "padded", controls: { include: ["numeric", "footprint"] } },
  render: ({ numeric, footprint }) => (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 24, alignItems: "flex-start" }}>
      {(Object.entries(SIZES) as [keyof typeof SIZES, number][]).map(([label, width]) => (
        <figure key={label} style={{ margin: 0, display: "grid", gap: 8 }}>
          <figcaption style={{ font: "600 11px var(--fd-sans)", letterSpacing: "0.06em", color: "var(--fd-ink-2)" }}>{label} · {width} PX</figcaption>
          <StoryNumeric key={numeric} numeric={numeric} width={width} footprint={footprint} />
        </figure>
      ))}
    </div>
  ),
};

/** The same entity at both footprints, the 64 px row and the 160 px module, at one width. */
export const Footprints: Story = {
  parameters: { layout: "padded", controls: { include: ["numeric", "width"] } },
  render: ({ numeric, width }) => (
    <div style={{ display: "grid", gap: 8, width, maxWidth: "100%" }}>
      {(["compact", "standard"] as const).map((footprint) => <StoryNumeric key={footprint} numeric={numeric} footprint={footprint} />)}
    </div>
  ),
};

/** Every example as a 64 px row, stacked as a phone's column would be. Rows keep the pictogram from 280 px, and the unit where it fits whole beside the figure. */
export const Compact: Story = {
  args: { footprint: "compact" },
  parameters: { layout: "padded", controls: { include: ["width"] } },
  render: ({ width }) => (
    <div style={{ display: "grid", gap: 8, width, maxWidth: "100%" }}>
      {SEEDS.map((name) => <StoryNumeric key={name} numeric={name} footprint="compact" />)}
    </div>
  ),
};

/** The detail panel: the screen and today. */
export const Details: Story = { args: { defaultOpen: true } };

/** A meter's panel: today's meter climbs, and its summary says how far. */
export const DetailsMeter: Story = { name: "Details, meter", args: { numeric: "energy", defaultOpen: true } };

/** Unavailable: blank segments, and the unavailable hours dashed on the meter. */
export const DetailsUnavailable: Story = { name: "Details, unavailable", args: { numeric: "unavailable", defaultOpen: true } };

/** On a phone the panel is a bottom sheet: drag its header down to close. */
export const DetailsPhone: Story = {
  name: "Details, phone",
  args: { defaultOpen: true },
  parameters: { viewport: { defaultViewport: "mobile2" } },
};
