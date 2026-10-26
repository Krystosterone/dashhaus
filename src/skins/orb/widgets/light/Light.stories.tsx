import type { Meta, StoryObj } from "@storybook/react";
import { DemoLightTile as DemoTile } from "./demo/DemoLightTile";

const SIZES = { S: 174, M: 360, L: 464 } as const;

const meta = {
  title: "Orb/Widgets/Light",
  component: DemoTile,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "One light entity per widget. Tap the bulb to switch it, drag the bar to dim, press and hold the bulb or tap the name for details. " +
          "Every widget uses the same modular footprints at every width: compact 60px, standard 128px, and featured 264px.",
      },
    },
  },
  argTypes: {
    light: {
      control: "select",
      options: ["dimmable", "dimmableOff", "dimmableNoWarmth", "onOff", "unavailable"],
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
export const Off: Story = { args: { light: "dimmableOff" } };
/** A colour lamp: the nursery night light, amber at 3%. The status line names the colour; the orb stays the accent. */
export const Colour: Story = { args: { light: "nightLight" } };
export const DimmableWithoutWarmth: Story = { name: "Dimmable, no warmth", args: { light: "dimmableNoWarmth" } };
export const OnOffOnly: Story = { name: "On / off only", args: { light: "onOff" } };
export const Unavailable: Story = { args: { light: "unavailable" } };

/** Every light type at one size. Heights match, whatever the type or state. */
export const AllTypes: Story = {
  name: "All types",
  args: { width: SIZES.M },
  parameters: { layout: "padded", controls: { include: ["width", "footprint"] } },
  render: ({ width, footprint }) => (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-start" }}>
      {(["dimmable", "nightLight", "dimmableOff", "onOff", "unavailable"] as const).map((light) => (
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
          <DemoTile key={light} light={light} width={width} footprint={footprint} />
        </figure>
      ))}
    </div>
  ),
};

/** The detail sheet: quick levels, warmth, today's history. */
export const DetailsSheet: Story = {
  name: "Details sheet",
  args: { defaultOpen: true },
};

/** A colour lamp's sheet: quick levels, then a chip per colour with its swatch, the lamp's own selected. */
export const ColourSheet: Story = {
  name: "Details sheet, colour",
  args: { light: "nightLight", defaultOpen: true },
};

/** One 60px row. The control strip keeps one width, so stacked rows line up. */
export const Compact: Story = { args: { footprint: "compact" } };

/** Every light type as a compact row, stacked the way a phone dashboard would. */
export const CompactAllTypes: Story = {
  name: "Compact, all types",
  args: { width: SIZES.M, footprint: "compact" },
  parameters: { layout: "padded", controls: { include: ["width"] } },
  render: ({ width }) => (
    <div style={{ display: "grid", gap: 8, width, maxWidth: "100%" }}>
      {(["dimmable", "nightLight", "dimmableOff", "onOff", "unavailable"] as const).map((light) => (
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
          <DemoTile key={light} light={light} width={width} footprint="compact" />
        </figure>
      ))}
    </div>
  ),
};

/** The detail sheet on a phone: a bottom sheet with a grab handle. Drag the header down to dismiss. */
export const DetailsSheetPhone: Story = {
  name: "Details sheet, phone",
  args: { defaultOpen: true },
  parameters: { viewport: { defaultViewport: "mobile2" } },
};
