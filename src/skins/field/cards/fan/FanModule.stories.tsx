import type { Meta, StoryObj } from "@storybook/react";
import { FanModule } from "./FanModule";
import type { FieldFootprint } from "../../shared/ui";
import { FAN_SEEDS, FAN_WORST_CASE, useDemoFan } from "@dashhaus/core/seeds/fan";
import type { FanSeed, FanSeedName } from "@dashhaus/core/seeds/fan";

const SIZES = { S: 200, M: 340, L: 464 } as const;
const SEEDS = Object.keys(FAN_SEEDS) as FanSeedName[];

function DemoFan({ seed, width, footprint, defaultOpen }: { seed: FanSeed; width?: number; footprint?: FieldFootprint; defaultOpen?: boolean }) {
  const demo = useDemoFan(seed);
  return (
    <div style={{ width, maxWidth: "100%" }}>
      <FanModule
        entity={demo.entity}
        history={demo.history}
        onToggle={demo.onToggle}
        onPercentageChange={demo.onPercentageChange}
        onPresetChange={demo.onPresetChange}
        onOscillateChange={demo.onOscillateChange}
        onDirectionChange={demo.onDirectionChange}
        footprint={footprint}
        defaultOpen={defaultOpen}
      />
    </div>
  );
}

function StoryFan({ fan, ...props }: { fan: FanSeedName; width?: number; footprint?: FieldFootprint; defaultOpen?: boolean }) {
  return <DemoFan seed={FAN_SEEDS[fan]} {...props} />;
}

const meta = {
  title: "Field/Cards/Fan",
  component: StoryFan,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "One fan as a field module. Press the key to switch it; its LED is lit while it's on. Slide the fader to set its speed, one stop per speed on a stepped fan; " +
          "sliding it while off turns the fan on. A fan without speeds has one wide key. Tap the name, or press and hold the key, for the detail panel: " +
          "presets, oscillation, direction and today. Standard modules are 160 px, compact rows 64 px.",
      },
    },
  },
  argTypes: {
    fan: { control: "select", options: SEEDS, description: "Example fan" },
    width: { control: { type: "range", min: 180, max: 640, step: 2 }, description: "Container width in px" },
    footprint: { control: "inline-radio", options: ["compact", "standard"], description: "Module height" },
    defaultOpen: { control: "boolean", description: "Open the detail panel on load" },
  },
  args: { fan: "on", width: SIZES.M, footprint: "standard" },
  render: (args) => <StoryFan key={`${args.fan}-${args.defaultOpen}`} {...args} />,
} satisfies Meta<typeof StoryFan>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A three-speed tower fan at speed 2, sweeping: 067% on the screen, "Speed 2 of 3" beside it. */
export const On: Story = {};
export const Off: Story = { args: { fan: "off" } };
/** A stepless ceiling fan at 40%, turning in reverse; its panel sets the direction. */
export const Ceiling: Story = { args: { fan: "ceiling" } };
/** A fan without speeds (an extractor): one wide key with its state word, no fader. */
export const OnOffOnly: Story = { name: "On / off only", args: { fan: "onOff" } };
/** An IR fan before its first command: it says Unknown, never Off, and a press turns it on. */
export const Unknown: Story = { args: { fan: "unknown" } };
/** An RF ceiling fan Home Assistant never hears back from: drawn as it is assumed to be, with on and off apart in the panel. */
export const AssumedState: Story = { name: "Assumed state", args: { fan: "assumed" } };
/** Blank segments on the screen, and when it was last seen. */
export const Unavailable: Story = { args: { fan: "unavailable" } };

/** Every slot at its widest: the worst-case seeds. */
export const WorstCase: Story = {
  name: "Worst case",
  parameters: { layout: "padded", controls: { include: ["width", "footprint"] } },
  render: ({ width, footprint }) => (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-start" }}>
      {FAN_WORST_CASE.map((seed) => <DemoFan key={seed.entity.entityId} seed={seed} width={width} footprint={footprint} />)}
    </div>
  ),
};

/** Every example at one width. Heights match, whatever the state. */
export const AllStates: Story = {
  name: "All states",
  parameters: { layout: "padded", controls: { include: ["width", "footprint"] } },
  render: ({ width, footprint }) => (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-start" }}>
      {SEEDS.map((name) => <StoryFan key={name} fan={name} width={width} footprint={footprint} />)}
    </div>
  ),
};

/** The same fan at S, M and L container widths. */
export const Sizes: Story = {
  parameters: { layout: "padded", controls: { include: ["fan", "footprint"] } },
  render: ({ fan, footprint }) => (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 24, alignItems: "flex-start" }}>
      {(Object.entries(SIZES) as [keyof typeof SIZES, number][]).map(([label, width]) => (
        <figure key={label} style={{ margin: 0, display: "grid", gap: 8 }}>
          <figcaption style={{ font: "600 11px var(--fd-sans)", letterSpacing: "0.06em", color: "var(--fd-ink-2)" }}>{label} · {width} PX</figcaption>
          <StoryFan key={fan} fan={fan} width={width} footprint={footprint} />
        </figure>
      ))}
    </div>
  ),
};

/** The same entity at both footprints, the 64 px row and the 160 px module, at one width. */
export const Footprints: Story = {
  parameters: { layout: "padded", controls: { include: ["fan", "width"] } },
  render: ({ fan, width }) => (
    <div style={{ display: "grid", gap: 8, width, maxWidth: "100%" }}>
      {(["compact", "standard"] as const).map((footprint) => <StoryFan key={footprint} fan={fan} footprint={footprint} />)}
    </div>
  ),
};

/** Every example as a 64 px row, stacked as a phone's column would be. */
export const Compact: Story = {
  args: { footprint: "compact" },
  parameters: { layout: "padded", controls: { include: ["width"] } },
  render: ({ width }) => (
    <div style={{ display: "grid", gap: 8, width, maxWidth: "100%" }}>
      {SEEDS.map((name) => <StoryFan key={name} fan={name} footprint="compact" />)}
    </div>
  ),
};

/** The detail panel: the screen, the key and speed fader, presets, the oscillation key, and today. */
export const Details: Story = { args: { defaultOpen: true } };

/** A ceiling fan's panel: its direction on the screen's second channel and on two keys. */
export const DetailsCeiling: Story = { name: "Details, ceiling", args: { fan: "ceiling", defaultOpen: true } };

/** Its state assumed: Turn Off and On, either sent whatever it shows, since what it shows may be wrong. */
export const DetailsAssumedState: Story = { name: "Details, assumed state", args: { fan: "assumed", defaultOpen: true } };
/** Unavailable: blank segments, and the unavailable hours dashed on the meter. */
export const DetailsUnavailable: Story = { name: "Details, unavailable", args: { fan: "unavailable", defaultOpen: true } };

/** On a phone the panel is a bottom sheet: drag its header down to close. */
export const DetailsPhone: Story = {
  name: "Details, phone",
  args: { defaultOpen: true },
  parameters: { viewport: { defaultViewport: "mobile2" } },
};
