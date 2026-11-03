import type { Meta, StoryObj } from "@storybook/react";
import { HumidifierModule } from "./HumidifierModule";
import type { FieldFootprint } from "../../shared/ui";
import { HUMIDIFIER_SEEDS, HUMIDIFIER_WORST_CASE, useDemoHumidifier } from "@dashhaus/core/seeds/humidifier";
import type { HumidifierSeed, HumidifierSeedName } from "@dashhaus/core/seeds/humidifier";

const SIZES = { S: 200, M: 340, L: 464 } as const;
const SEEDS = Object.keys(HUMIDIFIER_SEEDS) as HumidifierSeedName[];

function DemoHumidifier({ seed, width, footprint, defaultOpen }: { seed: HumidifierSeed; width?: number; footprint?: FieldFootprint; defaultOpen?: boolean }) {
  const demo = useDemoHumidifier(seed);
  return (
    <div style={{ width, maxWidth: "100%" }}>
      <HumidifierModule
        entity={demo.entity}
        history={demo.history}
        onToggle={demo.onToggle}
        onTargetChange={demo.onTargetChange}
        onModeChange={demo.onModeChange}
        footprint={footprint}
        defaultOpen={defaultOpen}
      />
    </div>
  );
}

function StoryHumidifier({ humidifier, ...props }: { humidifier: HumidifierSeedName; width?: number; footprint?: FieldFootprint; defaultOpen?: boolean }) {
  return <DemoHumidifier seed={HUMIDIFIER_SEEDS[humidifier]} {...props} />;
}

const meta = {
  title: "Field/Cards/Humidifier",
  component: StoryHumidifier,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "One humidifier or dehumidifier as a field module. Press the key to switch it; its LED is lit while it's on. The screen leads with the room's humidity, and while it is on the fader sets its target. Tap the name, or press and hold the key, for the detail panel: exact steps, modes and today. Standard modules are 160 px, compact rows 64 px.",
      },
    },
  },
  argTypes: {
    humidifier: { control: "select", options: SEEDS, description: "Example humidifier" },
    width: { control: { type: "range", min: 180, max: 640, step: 2 }, description: "Container width in px" },
    footprint: { control: "inline-radio", options: ["compact", "standard"], description: "Module height" },
    defaultOpen: { control: "boolean", description: "Open the detail panel on load" },
  },
  args: { humidifier: "on", width: SIZES.M, footprint: "standard" },
  render: (args) => <StoryHumidifier key={`${args.humidifier}-${args.defaultOpen}`} {...args} />,
} satisfies Meta<typeof StoryHumidifier>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Humidifying to its target: the room's humidity on the screen, the target on the fader. */
export const Humidifying: Story = {};
/** Off: the room's humidity on the meta line, and one wide key to turn it on. */
export const Off: Story = { args: { humidifier: "off" } };
/** A dehumidifier dries down to its target, and its key carries the tank. */
export const Dehumidifier: Story = { args: { humidifier: "dehumidifier" } };
/** No setpoint and no room reading: the screen says ON, and the key spans the row with the mode. */
export const ModeOnly: Story = { name: "Mode only", args: { humidifier: "modeOnly" } };
/** Blank segments on the screen, and when it was last seen. */
export const Unavailable: Story = { args: { humidifier: "unavailable" } };

/** Every slot at its widest: the worst-case seeds. */
export const WorstCase: Story = {
  name: "Worst case",
  parameters: { layout: "padded", controls: { include: ["width", "footprint"] } },
  render: ({ width, footprint }) => (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-start" }}>
      {HUMIDIFIER_WORST_CASE.map((seed) => <DemoHumidifier key={seed.entity.entityId} seed={seed} width={width} footprint={footprint} />)}
    </div>
  ),
};

/** Every example at one width. Heights match, whatever the state. */
export const AllStates: Story = {
  name: "All states",
  parameters: { layout: "padded", controls: { include: ["width", "footprint"] } },
  render: ({ width, footprint }) => (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-start" }}>
      {SEEDS.map((name) => <StoryHumidifier key={name} humidifier={name} width={width} footprint={footprint} />)}
    </div>
  ),
};

/** The same humidifier at S, M and L container widths. */
export const Sizes: Story = {
  parameters: { layout: "padded", controls: { include: ["humidifier", "footprint"] } },
  render: ({ humidifier, footprint }) => (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 24, alignItems: "flex-start" }}>
      {(Object.entries(SIZES) as [keyof typeof SIZES, number][]).map(([label, width]) => (
        <figure key={label} style={{ margin: 0, display: "grid", gap: 8 }}>
          <figcaption style={{ font: "600 11px var(--fd-sans)", letterSpacing: "0.06em", color: "var(--fd-ink-2)" }}>{label} · {width} PX</figcaption>
          <StoryHumidifier key={humidifier} humidifier={humidifier} width={width} footprint={footprint} />
        </figure>
      ))}
    </div>
  ),
};

/** The same entity at both footprints, the 64 px row and the 160 px module, at one width. */
export const Footprints: Story = {
  parameters: { layout: "padded", controls: { include: ["humidifier", "width"] } },
  render: ({ humidifier, width }) => (
    <div style={{ display: "grid", gap: 8, width, maxWidth: "100%" }}>
      {(["compact", "standard"] as const).map((footprint) => <StoryHumidifier key={footprint} humidifier={humidifier} footprint={footprint} />)}
    </div>
  ),
};

/** Every example as a 64 px row, stacked as a phone's column would be. */
export const Compact: Story = {
  args: { footprint: "compact" },
  parameters: { layout: "padded", controls: { include: ["width"] } },
  render: ({ width }) => (
    <div style={{ display: "grid", gap: 8, width, maxWidth: "100%" }}>
      {SEEDS.map((name) => <StoryHumidifier key={name} humidifier={name} footprint="compact" />)}
    </div>
  ),
};

/** The detail panel: the target on the screen's second channel, exact steps, modes, today. */
export const Details: Story = { args: { defaultOpen: true } };

/** A dehumidifier's panel: "Dry to", and no mode keys for a unit without modes. */
export const DetailsDehumidifier: Story = { name: "Details, dehumidifier", args: { humidifier: "dehumidifier", defaultOpen: true } };

/** Unavailable: blank segments, and the unavailable hours dashed on the meter. */
export const DetailsUnavailable: Story = { name: "Details, unavailable", args: { humidifier: "unavailable", defaultOpen: true } };

/** On a phone the panel is a bottom sheet: drag its header down to close. */
export const DetailsPhone: Story = {
  name: "Details, phone",
  args: { defaultOpen: true },
  parameters: { viewport: { defaultViewport: "mobile2" } },
};
