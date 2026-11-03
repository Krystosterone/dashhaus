import type { Meta, StoryObj } from "@storybook/react";
import { ToggleModule } from "./ToggleModule";
import type { FieldFootprint } from "../../shared/ui";
import { TOGGLE_SEEDS, TOGGLE_WORST_CASE, useDemoToggle } from "@dashhaus/core/seeds/toggle";
import type { ToggleSeed, ToggleSeedName } from "@dashhaus/core/seeds/toggle";

const SIZES = { S: 200, M: 340, L: 464 } as const;
const TOGGLES = Object.keys(TOGGLE_SEEDS) as ToggleSeedName[];

function DemoToggle({ toggle, seed, width, footprint, defaultOpen }: { toggle: ToggleSeedName; seed?: ToggleSeed; width?: number; footprint?: FieldFootprint; defaultOpen?: boolean }) {
  const demo = useDemoToggle(seed ?? TOGGLE_SEEDS[toggle]);
  return (
    <div style={{ width, maxWidth: "100%" }}>
      <ToggleModule {...demo} footprint={footprint} defaultOpen={defaultOpen} />
    </div>
  );
}

const meta = {
  title: "Field/Cards/Toggle",
  component: DemoToggle,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "A mode you switch on and off, such as Do Not Disturb, Quiet or Guest, as a field module: one input_boolean or switch. Press " +
          "the key, which carries the mode's glyph, to switch it; its LED is lit while the mode is on. The screen says ON or OFF, " +
          "then until when or since when. Tap the name, or press and hold the key, for the detail panel: what the mode does, ways " +
          "to turn it on for a while, and today. Standard modules are 160 px, compact rows 64 px.",
      },
    },
  },
  argTypes: {
    toggle: { control: "select", options: TOGGLES, description: "Example mode" },
    width: { control: { type: "range", min: 180, max: 640, step: 2 }, description: "Container width in px" },
    footprint: { control: "inline-radio", options: ["compact", "standard"], description: "Module height" },
    defaultOpen: { control: "boolean", description: "Open the detail panel on load" },
  },
  args: { toggle: "dnd", width: SIZES.M, footprint: "standard" },
  render: (args) => <DemoToggle key={`${args.toggle}-${args.defaultOpen}`} {...args} />,
} satisfies Meta<typeof DemoToggle>;

export default meta;
type Story = StoryObj<typeof meta>;

/** On for an hour: the screen says until when, then since when. */
export const OnUntil: Story = { name: "On, until", args: { toggle: "dnd" } };
/** On with no end: since when alone. */
export const On: Story = { args: { toggle: "guest" } };
export const Off: Story = { args: { toggle: "quiet" } };
/** A switch rather than a helper: the same module, its power glyph. */
export const Switch: Story = { args: { toggle: "soundMachine" } };
/** Blank segments and when it was last seen; the key lies flat. */
export const Unavailable: Story = { args: { toggle: "unavailable" } };

/** A long name with no area, on until tomorrow; a long name and area; one letter, no icon, never changed. */
export const WorstCase: Story = {
  name: "Worst case",
  parameters: { layout: "padded", controls: { include: ["width", "footprint"] } },
  render: ({ width, footprint }) => (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-start" }}>
      {TOGGLE_WORST_CASE.map((seed) => <DemoToggle key={seed.entity.entityId} toggle="dnd" seed={seed} width={width} footprint={footprint} />)}
    </div>
  ),
};

/** Every mode at one width, each with its own glyph. Heights match, whatever the state. */
export const AllStates: Story = {
  name: "All states",
  parameters: { layout: "padded", controls: { include: ["width", "footprint"] } },
  render: ({ width, footprint }) => (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-start" }}>
      {TOGGLES.map((toggle) => <DemoToggle key={toggle} toggle={toggle} width={width} footprint={footprint} />)}
    </div>
  ),
};

/** The same mode at S, M and L container widths. */
export const Sizes: Story = {
  parameters: { layout: "padded", controls: { include: ["toggle", "footprint"] } },
  render: ({ toggle, footprint }) => (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 24, alignItems: "flex-start" }}>
      {(Object.entries(SIZES) as [keyof typeof SIZES, number][]).map(([label, width]) => (
        <figure key={label} style={{ margin: 0, display: "grid", gap: 8 }}>
          <figcaption style={{ font: "600 11px var(--fd-sans)", letterSpacing: "0.06em", color: "var(--fd-ink-2)" }}>{label} · {width} PX</figcaption>
          <DemoToggle key={toggle} toggle={toggle} width={width} footprint={footprint} />
        </figure>
      ))}
    </div>
  ),
};

/** The same entity at both footprints, the 64 px row and the 160 px module, at one width. */
export const Footprints: Story = {
  parameters: { layout: "padded", controls: { include: ["toggle", "width"] } },
  render: ({ toggle, width }) => (
    <div style={{ display: "grid", gap: 8, width, maxWidth: "100%" }}>
      {(["compact", "standard"] as const).map((footprint) => <DemoToggle key={footprint} toggle={toggle} footprint={footprint} />)}
    </div>
  ),
};

/** Every mode as a 64 px row, stacked as a phone's modes column would be: the glyph on each key tells them apart. */
export const Compact: Story = {
  args: { footprint: "compact" },
  parameters: { layout: "padded", controls: { include: ["width"] } },
  render: ({ width }) => (
    <div style={{ display: "grid", gap: 8, width, maxWidth: "100%" }}>
      {TOGGLES.map((toggle) => <DemoToggle key={toggle} toggle={toggle} footprint="compact" />)}
    </div>
  ),
};

/** The detail panel: when it turns off on the screen's second channel, what it does, the duration it was turned on with, today. */
export const Details: Story = { args: { defaultOpen: true } };

/** Off: ways to turn it on, none chosen. */
export const DetailsOff: Story = { name: "Details, off", args: { toggle: "quiet", defaultOpen: true } };

/** Unavailable: blank screen, every key flat, the hours it was gone dashed on the meter. */
export const DetailsUnavailable: Story = { name: "Details, unavailable", args: { toggle: "unavailable", defaultOpen: true } };

/** On a phone the panel is a bottom sheet, its durations two by two: drag its header down to close. */
export const DetailsPhone: Story = {
  name: "Details, phone",
  args: { defaultOpen: true },
  parameters: { viewport: { defaultViewport: "mobile2" } },
};
