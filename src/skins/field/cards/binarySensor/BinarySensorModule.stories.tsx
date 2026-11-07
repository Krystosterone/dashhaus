import type { Meta, StoryObj } from "@storybook/react";
import { BinarySensorModule } from "./BinarySensorModule";
import type { FieldFootprint } from "../../shared/ui";
import { BINARY_SENSOR_SEEDS, BINARY_SENSOR_WORST_CASE } from "@dashhaus/core/seeds/binarySensor";
import type { BinarySensorSeed, BinarySensorSeedName } from "@dashhaus/core/seeds/binarySensor";

const SIZES = { S: 200, M: 340, L: 464 } as const;
const SEEDS = Object.keys(BINARY_SENSOR_SEEDS) as BinarySensorSeedName[];

function DemoBinarySensor({ seed, width, footprint, defaultOpen }: { seed: BinarySensorSeed; width?: number; footprint?: FieldFootprint; defaultOpen?: boolean }) {
  const demo = seed;
  return (
    <div style={{ width, maxWidth: "100%" }}>
      <BinarySensorModule
        entity={demo.entity}
        history={demo.history}
        footprint={footprint}
        defaultOpen={defaultOpen}
      />
    </div>
  );
}

function StoryBinarySensor({ binarySensor, ...props }: { binarySensor: BinarySensorSeedName; width?: number; footprint?: FieldFootprint; defaultOpen?: boolean }) {
  return <DemoBinarySensor seed={BINARY_SENSOR_SEEDS[binarySensor]} {...props} />;
}

const meta = {
  title: "Field/Cards/BinarySensor",
  component: StoryBinarySensor,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "One binary sensor (a door, a window, a leak, smoke) as a field module, with its device's battery. A reading, so nothing on it is pressed: the glyph its device class names lies flat where a key would be, and today's meter of the hours it was on takes the fader's place. The screen says the state in its class's words. Smoke is an alarm, a leak urgent, a low battery advisory. Tap the name for the detail panel. Standard modules are 160 px, compact rows 64 px.",
      },
    },
  },
  argTypes: {
    binarySensor: { control: "select", options: SEEDS, description: "Example binary sensor" },
    width: { control: { type: "range", min: 180, max: 640, step: 2 }, description: "Container width in px" },
    footprint: { control: "inline-radio", options: ["compact", "standard"], description: "Module height" },
    defaultOpen: { control: "boolean", description: "Open the detail panel on load" },
  },
  args: { binarySensor: "closed", width: SIZES.M, footprint: "standard" },
  render: (args) => <StoryBinarySensor key={`${args.binarySensor}-${args.defaultOpen}`} {...args} />,
} satisfies Meta<typeof StoryBinarySensor>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Closed: SHUT in the dim ink, its picture unlit. */
export const Closed: Story = {};
/** Open is a state, not a warning: OPEN, its picture lit, and since when. */
export const Open: Story = { args: { binarySensor: "open" } };
export const Window: Story = { args: { binarySensor: "window" } };
/** A leak is urgent: an inverted block on the screen's first line, and on the alert line. */
export const Leak: Story = { args: { binarySensor: "leak" } };
/** Smoke is an alarm: the whole screen inverts, flashing for ten seconds, and the alert line names it. */
export const Smoke: Story = { args: { binarySensor: "smoke" } };
/** Clear, with its device's battery low: advisory, the device's, on the plate in place of the area. */
export const LowBattery: Story = { name: "Low battery", args: { binarySensor: "lowBattery" } };
/** Blank segments on the screen, and when it was last seen. */
export const Unavailable: Story = { args: { binarySensor: "unavailable" } };

/** Every slot at its widest: the worst-case seeds. */
export const WorstCase: Story = {
  name: "Worst case",
  parameters: { layout: "padded", controls: { include: ["width", "footprint"] } },
  render: ({ width, footprint }) => (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-start" }}>
      {BINARY_SENSOR_WORST_CASE.map((seed) => <DemoBinarySensor key={seed.entity.entityId} seed={seed} width={width} footprint={footprint} />)}
    </div>
  ),
};

/** Every example at one width. Heights match, whatever the state. */
export const AllStates: Story = {
  name: "All states",
  parameters: { layout: "padded", controls: { include: ["width", "footprint"] } },
  render: ({ width, footprint }) => (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-start" }}>
      {SEEDS.map((name) => <StoryBinarySensor key={name} binarySensor={name} width={width} footprint={footprint} />)}
    </div>
  ),
};

/** The same binary sensor at S, M and L container widths. */
export const Sizes: Story = {
  parameters: { layout: "padded", controls: { include: ["binarySensor", "footprint"] } },
  render: ({ binarySensor, footprint }) => (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 24, alignItems: "flex-start" }}>
      {(Object.entries(SIZES) as [keyof typeof SIZES, number][]).map(([label, width]) => (
        <figure key={label} style={{ margin: 0, display: "grid", gap: 8 }}>
          <figcaption style={{ font: "600 11px var(--fd-sans)", letterSpacing: "0.06em", color: "var(--fd-ink-2)" }}>{label} · {width} PX</figcaption>
          <StoryBinarySensor key={binarySensor} binarySensor={binarySensor} width={width} footprint={footprint} />
        </figure>
      ))}
    </div>
  ),
};

/** The same entity at both footprints, the 64 px row and the 160 px module, at one width. */
export const Footprints: Story = {
  parameters: { layout: "padded", controls: { include: ["binarySensor", "width"] } },
  render: ({ binarySensor, width }) => (
    <div style={{ display: "grid", gap: 8, width, maxWidth: "100%" }}>
      {(["compact", "standard"] as const).map((footprint) => <StoryBinarySensor key={footprint} binarySensor={binarySensor} footprint={footprint} />)}
    </div>
  ),
};

/** Every example as a 64 px row, stacked as a phone's column would be. */
export const Compact: Story = {
  args: { footprint: "compact" },
  parameters: { layout: "padded", controls: { include: ["width"] } },
  render: ({ width }) => (
    <div style={{ display: "grid", gap: 8, width, maxWidth: "100%" }}>
      {SEEDS.map((name) => <StoryBinarySensor key={name} binarySensor={name} footprint="compact" />)}
    </div>
  ),
};

/** The detail panel: the screen, today's hours on, when it last changed and its battery. */
export const Details: Story = { args: { defaultOpen: true } };

/** Unavailable: blank segments, and the unavailable hours dashed on the meter. */
export const DetailsUnavailable: Story = { name: "Details, unavailable", args: { binarySensor: "unavailable", defaultOpen: true } };

/** On a phone the panel is a bottom sheet: drag its header down to close. */
export const DetailsPhone: Story = {
  name: "Details, phone",
  args: { defaultOpen: true },
  parameters: { viewport: { defaultViewport: "mobile2" } },
};
