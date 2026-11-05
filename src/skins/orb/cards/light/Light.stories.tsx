import type { Meta, StoryObj } from "@storybook/react";
import { DemoLightTile as DemoTile } from "./demo/DemoLightTile";
import { LIGHT_WORST_CASE } from "@dashhaus/core/seeds/light";

const SIZES = { S: 174, M: 360, L: 464 } as const;

const meta = {
  title: "Orb/Cards/Light",
  component: DemoTile,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "One light entity per card. Tap the bulb to switch it, drag the bar to dim, press and hold the bulb or tap the name for details. " +
          "Every card uses the same modular footprints at every width: compact 60px, standard 128px, and featured 264px.",
      },
    },
  },
  argTypes: {
    light: {
      control: "select",
      options: ["dimmable", "dimmableOff", "dimmableNoWarmth", "whiteAndColour", "noReading", "onOff", "unknown", "unavailable"],
      description: "Example light",
    },
    width: { control: { type: "range", min: 160, max: 640, step: 2 }, description: "Container width in px" },
    footprint: { control: "inline-radio", options: ["compact", "standard", "featured"], description: "Shared dashboard footprint" },
    showControl: { control: "boolean", description: "Compact only: show the control in the row (off: the row opens details)" },
    name: { control: "text" },
    area: { control: "text" },
    defaultOpen: { control: "boolean", description: "Open the detail sheet on load" },
  },
  args: { light: "dimmable", width: SIZES.M, footprint: "standard" },
  render: (args) => <DemoTile key={`${args.light}-${args.defaultOpen}`} {...args} />,
} satisfies Meta<typeof DemoTile>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Dimmable: Story = {};
/** Off, as Home Assistant reports it, with no brightness: the bar keeps its slot and says Off, and sliding it turns the light on. */
export const Off: Story = { args: { light: "dimmableOff" } };
/** A colour lamp: the nursery night light, amber at 3%. The status line names the colour; the orb stays the accent. */
export const Colour: Story = { args: { light: "nightLight" } };
export const DimmableWithoutWarmth: Story = { name: "Dimmable, no warmth", args: { light: "dimmableNoWarmth" } };
export const OnOffOnly: Story = { name: "On / off only", args: { light: "onOff" } };
/**
 * Unknown: reachable but not reported yet (an optimistic light before its first command, a group before its first
 * state). Not unavailable, so nothing is dashed: it says Unknown, and the bulb and the bar still switch and dim it.
 */
export const Unknown: Story = { args: { light: "unknown" } };
export const Unavailable: Story = { args: { light: "unavailable" } };

/** Realistic worst-case data from the demo seeds (LIGHT_WORST_CASE): long and compound names, missing areas, values at their limits. */
export const WorstCase: Story = {
  name: "Worst case",
  parameters: { layout: "padded", controls: { include: ["width", "footprint"] } },
  render: ({ width, footprint }) => (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-start" }}>
      {LIGHT_WORST_CASE.map((seed, index) => <DemoTile key={index} light={seed} width={width} footprint={footprint} />)}
    </div>
  ),
};

/** Every light type and state at one size. Heights match, whatever the type or state. */
export const AllStates: Story = {
  name: "All states",
  args: { width: SIZES.M },
  parameters: { layout: "padded", controls: { include: ["width", "footprint"] } },
  render: ({ width, footprint }) => (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-start" }}>
      {(["dimmable", "nightLight", "whiteAndColour", "dimmableOff", "onOff", "noReading", "unknown", "unavailable"] as const).map((light) => (
        <DemoTile key={light} light={light} width={width} footprint={footprint} />
      ))}
    </div>
  ),
};

/** The same light at S, M and L container widths. */
export const Sizes: Story = {
  parameters: { layout: "padded", controls: { include: ["light", "footprint"] } },
  render: ({ light, footprint }) => (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 24, alignItems: "flex-start" }}>
      {(Object.entries(SIZES) as [keyof typeof SIZES, number][]).map(([label, width]) => (
        <figure key={label} style={{ margin: 0, display: "grid", gap: 8 }}>
          <figcaption style={{ font: "500 13px var(--font)", color: "var(--ink-2)" }}>{label} · {width} px</figcaption>
          <DemoTile key={label} light={light} width={width} footprint={footprint} />
        </figure>
      ))}
    </div>
  ),
};

/** The same entity at every footprint, compact, standard and featured, at one width. */
export const Footprints: Story = {
  parameters: { layout: "padded", controls: { include: ["light", "width"] } },
  render: ({ light, width }) => (
    <div style={{ display: "grid", gap: 8, width, maxWidth: "100%" }}>
      {(["compact", "standard", "featured"] as const).map((footprint) => <DemoTile key={footprint} light={light} footprint={footprint} />)}
    </div>
  ),
};

/** Every light type as a 60px compact row, stacked the way a phone dashboard would. The control strip keeps one width, so rows line up. */
export const Compact: Story = {
  name: "Compact",
  args: { width: SIZES.M, footprint: "compact" },
  parameters: { layout: "padded", controls: { include: ["width"] } },
  render: ({ width }) => (
    <div style={{ display: "grid", gap: 8, width, maxWidth: "100%" }}>
      {(["dimmable", "nightLight", "dimmableOff", "onOff", "unknown", "unavailable"] as const).map((light) => (
        <DemoTile key={light} light={light} footprint="compact" />
      ))}
    </div>
  ),
};

/** Compact at S, M and L widths. Under 320px the strip yields to a readout under the name. */
export const CompactSizes: Story = {
  name: "Compact, sizes",
  args: { footprint: "compact" },
  parameters: { layout: "padded", controls: { include: ["light"] } },
  render: ({ light }) => (
    <div style={{ display: "grid", gap: 20 }}>
      {(Object.entries(SIZES) as [keyof typeof SIZES, number][]).map(([label, width]) => (
        <figure key={label} style={{ margin: 0, display: "grid", gap: 8 }}>
          <figcaption style={{ font: "500 13px var(--font)", color: "var(--ink-2)" }}>{label} · {width} px</figcaption>
          <DemoTile key={label} light={light} width={width} footprint="compact" />
        </figure>
      ))}
    </div>
  ),
};

/** The detail sheet: quick levels, warmth, today's history. */
export const Details: Story = {
  name: "Details",
  args: { defaultOpen: true },
};

/** A colour lamp's sheet: quick levels, then a chip per colour with its swatch, the lamp's own selected. */
export const DetailsColour: Story = {
  name: "Details, colour",
  args: { light: "nightLight", defaultOpen: true },
};

/** Unavailable: what the details still say when Home Assistant can't reach the entity. */
export const DetailsUnavailable: Story = { name: "Details, unavailable", args: { light: "unavailable", defaultOpen: true } };

/** The detail sheet on a phone: a bottom sheet with a grab handle. Drag the header down to dismiss. */
export const DetailsPhone: Story = {
  name: "Details, phone",
  args: { defaultOpen: true },
  parameters: { viewport: { defaultViewport: "mobile2" } },
};
