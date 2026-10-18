import type { Meta, StoryObj } from "@storybook/react";
import { DemoLightTile as DemoTile } from "./demo/DemoLightTile";

const SIZES = { S: 174, M: 360, L: 464 } as const;

const meta = {
  title: "Widgets/Light",
  component: DemoTile,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "One light entity per widget. Tap the bulb to switch it, drag the bar to dim, press and hold the bulb or tap the arrow for details. " +
          "Height depends only on container width: S under 260px, M 260-439px, L 440px and up. " +
          "The thin density fits everything in one 56px row.",
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
    density: { control: "inline-radio", options: ["regular", "thin"], description: "Regular card or one-row thin variant" },
    name: { control: "text" },
    area: { control: "text" },
    defaultOpen: { control: "boolean", description: "Open the detail sheet on load" },
  },
  args: { light: "dimmable", width: SIZES.M, density: "regular" },
  render: (args) => <DemoTile key={`${args.light}-${args.defaultOpen}`} {...args} />,
} satisfies Meta<typeof DemoTile>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Dimmable: Story = {};
export const Off: Story = { args: { light: "dimmableOff" } };
export const DimmableWithoutWarmth: Story = { name: "Dimmable, no warmth", args: { light: "dimmableNoWarmth" } };
export const OnOffOnly: Story = { name: "On / off only", args: { light: "onOff" } };
export const Unavailable: Story = { args: { light: "unavailable" } };

/** Every light type at one size. Heights match, whatever the type or state. */
export const AllTypes: Story = {
  name: "All types",
  args: { width: SIZES.M },
  parameters: { layout: "padded", controls: { include: ["width", "density"] } },
  render: ({ width, density }) => (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-start" }}>
      {(["dimmable", "dimmableOff", "onOff", "unavailable"] as const).map((l) => (
        <DemoTile key={l} light={l} width={width} density={density} />
      ))}
    </div>
  ),
};

/** The same light at S, M and L. */
export const Sizes: Story = {
  parameters: { layout: "padded", controls: { include: ["light", "density"] } },
  render: ({ light, density }) => (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 24, alignItems: "flex-start" }}>
      {(Object.entries(SIZES) as [keyof typeof SIZES, number][]).map(([label, w]) => (
        <figure key={label} style={{ margin: 0, display: "grid", gap: 8 }}>
          <figcaption style={{ font: "500 13px var(--font)", color: "var(--ink-3)" }}>{label} · {w} px</figcaption>
          <DemoTile key={light} light={light} width={w} density={density} />
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

/** One 56px row. The control strip keeps one width, so stacked rows line up. */
export const Thin: Story = { args: { density: "thin" } };

/** Every light type as a thin row, stacked the way a phone dashboard would. */
export const ThinAllTypes: Story = {
  name: "Thin, all types",
  args: { width: SIZES.M, density: "thin" },
  parameters: { layout: "padded", controls: { include: ["width"] } },
  render: ({ width }) => (
    <div style={{ display: "grid", gap: 8, width, maxWidth: "100%" }}>
      {(["dimmable", "dimmableOff", "onOff", "unavailable"] as const).map((l) => (
        <DemoTile key={l} light={l} density="thin" />
      ))}
    </div>
  ),
};

/** Thin at S, M and L. Under 240px the strip gives way to a readout under the name. */
export const ThinSizes: Story = {
  name: "Thin, sizes",
  args: { density: "thin" },
  parameters: { layout: "padded", controls: { include: ["light"] } },
  render: ({ light }) => (
    <div style={{ display: "grid", gap: 20 }}>
      {(Object.entries(SIZES) as [keyof typeof SIZES, number][]).map(([label, w]) => (
        <figure key={label} style={{ margin: 0, display: "grid", gap: 8 }}>
          <figcaption style={{ font: "500 13px var(--font)", color: "var(--ink-3)" }}>{label} · {w} px</figcaption>
          <DemoTile key={light} light={light} width={w} density="thin" />
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
