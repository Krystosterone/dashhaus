import type { Meta, StoryObj } from "@storybook/react";
import { LightModule } from "./LightModule";
import type { FieldFootprint } from "../../shared/ui";
import { LIGHT_SEEDS, LIGHT_WORST_CASE, useDemoLight } from "@dashhaus/core/seeds/light";
import type { LightSeed, LightSeedName } from "@dashhaus/core/seeds/light";

const SIZES = { S: 200, M: 340, L: 464 } as const;
const LIGHTS = Object.keys(LIGHT_SEEDS) as LightSeedName[];

function DemoLight({ light, seed, width, footprint, defaultOpen }: { light: LightSeedName; seed?: LightSeed; width?: number; footprint?: FieldFootprint; defaultOpen?: boolean }) {
  const demo = useDemoLight(seed ?? LIGHT_SEEDS[light]);
  return (
    <div style={{ width, maxWidth: "100%" }}>
      <LightModule {...demo} footprint={footprint} defaultOpen={defaultOpen} />
    </div>
  );
}

const meta = {
  title: "Field/Cards/Light",
  component: DemoLight,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "One light as a field module. Press the key to switch it; its LED is lit while the light is on. The screen reads brightness, " +
          "warmth and since when. Slide the fader to dim; sliding it while off turns the light on. Tap the name, or press and hold the key, " +
          "for the detail panel: quick levels, warmth in its own colour, and today. Standard modules are 160 px, compact rows 64 px.",
      },
    },
  },
  argTypes: {
    light: { control: "select", options: LIGHTS, description: "Example light" },
    width: { control: { type: "range", min: 180, max: 640, step: 2 }, description: "Container width in px" },
    footprint: { control: "inline-radio", options: ["compact", "standard"], description: "Module height" },
    defaultOpen: { control: "boolean", description: "Open the detail panel on load" },
  },
  args: { light: "dimmable", width: SIZES.M, footprint: "standard" },
  render: (args) => <DemoLight key={`${args.light}-${args.defaultOpen}`} {...args} />,
} satisfies Meta<typeof DemoLight>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Dimmable: Story = {};
/** Off, as Home Assistant reports it, with no brightness: the fader stays, and sliding it turns the light on. */
export const Off: Story = { args: { light: "dimmableOff" } };
/** A colour lamp at 3%: the screen says Colour where a white lamp gives its warmth. */
export const Colour: Story = { args: { light: "nightLight" } };
/** No brightness: the key spans the row and carries the state word. */
export const OnOffOnly: Story = { name: "On / off only", args: { light: "onOff" } };
/** Reachable but not reported yet: blank segments and Unknown, but the key and fader still switch and dim it. */
export const Unknown: Story = { args: { light: "unknown" } };
/** Blank segments on the screen, the key and fader lie flat. */
export const Unavailable: Story = { args: { light: "unavailable" } };
/** Every slot at its widest: the worst-case seeds, a long name and area at full brightness and the coolest white first. */
export const WorstCase: Story = {
  name: "Worst case",
  parameters: { layout: "padded", controls: { include: ["width", "footprint"] } },
  render: ({ light, width, footprint }) => (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-start" }}>
      {LIGHT_WORST_CASE.map((seed) => <DemoLight key={seed.entity.entityId} light={light} seed={seed} width={width} footprint={footprint} />)}
    </div>
  ),
};

/** Every light at one width. Heights match, whatever the type or state. */
export const AllStates: Story = {
  name: "All states",
  parameters: { layout: "padded", controls: { include: ["width", "footprint"] } },
  render: ({ width, footprint }) => (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-start" }}>
      {LIGHTS.map((light) => <DemoLight key={light} light={light} width={width} footprint={footprint} />)}
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
          <figcaption style={{ font: "600 11px var(--fd-sans)", letterSpacing: "0.06em", color: "var(--fd-ink-2)" }}>{label} · {width} PX</figcaption>
          <DemoLight key={light} light={light} width={width} footprint={footprint} />
        </figure>
      ))}
    </div>
  ),
};

/** The same entity at both footprints, the 64 px row and the 160 px module, at one width. */
export const Footprints: Story = {
  parameters: { layout: "padded", controls: { include: ["light", "width"] } },
  render: ({ light, width }) => (
    <div style={{ display: "grid", gap: 8, width, maxWidth: "100%" }}>
      {(["compact", "standard"] as const).map((footprint) => <DemoLight key={footprint} light={light} footprint={footprint} />)}
    </div>
  ),
};

/** Every light as a 64 px row, stacked as a phone's controls column would be. */
export const Compact: Story = {
  args: { footprint: "compact" },
  parameters: { layout: "padded", controls: { include: ["width"] } },
  render: ({ width }) => (
    <div style={{ display: "grid", gap: 8, width, maxWidth: "100%" }}>
      {LIGHTS.map((light) => <DemoLight key={light} light={light} footprint="compact" />)}
    </div>
  ),
};

/** The detail panel: the screen with a warmth channel, the controls, quick levels, the warmth fader in its own colour, today. */
export const Details: Story = { args: { defaultOpen: true } };

/** Off: the warmth fader lies flat until the light is on; quick levels turn it on. */
export const DetailsOff: Story = { name: "Details, off", args: { light: "dimmableOff", defaultOpen: true } };

/** A colour lamp: a key per colour, the lamp's own lit; the screen names it beside a lens in that colour. */
export const DetailsColour: Story = { name: "Details, colour", args: { light: "nightLight", defaultOpen: true } };

/** A lamp with both: warmth and colour. Choosing one replaces the other on the screen, as Home Assistant reports it. */
export const DetailsWhiteAndColour: Story = { name: "Details, white and colour", args: { light: "whiteAndColour", defaultOpen: true } };

/** Unavailable: blank screen, every control flat, the unavailable hour dashed on the meter. */
export const DetailsUnavailable: Story = { name: "Details, unavailable", args: { light: "unavailable", defaultOpen: true } };

/** On a phone the panel is a bottom sheet: drag its header down to close. */
export const DetailsPhone: Story = {
  name: "Details, phone",
  args: { defaultOpen: true },
  parameters: { viewport: { defaultViewport: "mobile2" } },
};
