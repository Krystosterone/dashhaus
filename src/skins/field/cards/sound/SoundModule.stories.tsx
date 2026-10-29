import type { Meta, StoryObj } from "@storybook/react";
import { SoundModule } from "./SoundModule";
import type { FieldFootprint } from "../../shared/ui";
import { SOUND_SEEDS, SOUND_WORST_CASE, useDemoSound } from "./demo/useDemoSound";
import type { SoundSeed, SoundSeedName } from "./demo/useDemoSound";

const SIZES = { S: 200, M: 340, L: 464 } as const;
const SEEDS = Object.keys(SOUND_SEEDS) as SoundSeedName[];

function DemoSound({ seed, width, footprint, defaultOpen }: { seed: SoundSeed; width?: number; footprint?: FieldFootprint; defaultOpen?: boolean }) {
  const demo = useDemoSound(seed);
  return (
    <div style={{ width, maxWidth: "100%" }}>
      <SoundModule
        entity={demo.entity}
        history={demo.history}
        onToggle={demo.onToggle}
        onVolumeChange={demo.onVolumeChange}
        footprint={footprint}
        defaultOpen={defaultOpen}
      />
    </div>
  );
}

function StorySound({ sound, ...props }: { sound: SoundSeedName; width?: number; footprint?: FieldFootprint; defaultOpen?: boolean }) {
  return <DemoSound seed={SOUND_SEEDS[sound]} {...props} />;
}

const meta = {
  title: "Field/Cards/Sound",
  component: StorySound,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "A sound machine's sound as a field module. Press the key to switch it; its LED is lit while it's on, and the screen leads with the volume. The volume is set in the detail panel only, so a stray tap beside a sleeping baby never jumps it: tap the name, or press and hold the key, for its fader and today. Standard modules are 160 px, compact rows 64 px.",
      },
    },
  },
  argTypes: {
    sound: { control: "select", options: SEEDS, description: "Example sound" },
    width: { control: { type: "range", min: 180, max: 640, step: 2 }, description: "Container width in px" },
    footprint: { control: "inline-radio", options: ["compact", "standard"], description: "Module height" },
    defaultOpen: { control: "boolean", description: "Open the detail panel on load" },
  },
  args: { sound: "on", width: SIZES.M, footprint: "standard" },
  render: (args) => <StorySound key={`${args.sound}-${args.defaultOpen}`} {...args} />,
} satisfies Meta<typeof StorySound>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Playing: the volume on the screen, a speaker filled to it. */
export const Playing: Story = {};
/** Off: the screen says OFF, with the volume on the meta line. */
export const Off: Story = { args: { sound: "off" } };
/** A sound with no volume entity: the switch alone, its screen saying ON in neutral ink. */
export const NoVolume: Story = { name: "No volume", args: { sound: "noVolume" } };
/** Blank segments on the screen, and when it was last seen. */
export const Unavailable: Story = { args: { sound: "unavailable" } };

/** Every slot at its widest: the worst-case seeds. */
export const WorstCase: Story = {
  name: "Worst case",
  parameters: { layout: "padded", controls: { include: ["width", "footprint"] } },
  render: ({ width, footprint }) => (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-start" }}>
      {SOUND_WORST_CASE.map((seed) => <DemoSound key={seed.entity.entityId} seed={seed} width={width} footprint={footprint} />)}
    </div>
  ),
};

/** Every example at one width. Heights match, whatever the state. */
export const AllStates: Story = {
  name: "All states",
  parameters: { layout: "padded", controls: { include: ["width", "footprint"] } },
  render: ({ width, footprint }) => (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-start" }}>
      {SEEDS.map((name) => <StorySound key={name} sound={name} width={width} footprint={footprint} />)}
    </div>
  ),
};

/** The same sound at S, M and L container widths. */
export const Sizes: Story = {
  parameters: { layout: "padded", controls: { include: ["sound", "footprint"] } },
  render: ({ sound, footprint }) => (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 24, alignItems: "flex-start" }}>
      {(Object.entries(SIZES) as [keyof typeof SIZES, number][]).map(([label, width]) => (
        <figure key={label} style={{ margin: 0, display: "grid", gap: 8 }}>
          <figcaption style={{ font: "600 11px var(--fd-sans)", letterSpacing: "0.06em", color: "var(--fd-ink-2)" }}>{label} · {width} PX</figcaption>
          <StorySound key={sound} sound={sound} width={width} footprint={footprint} />
        </figure>
      ))}
    </div>
  ),
};

/** The same entity at both footprints, the 64 px row and the 160 px module, at one width. */
export const Footprints: Story = {
  parameters: { layout: "padded", controls: { include: ["sound", "width"] } },
  render: ({ sound, width }) => (
    <div style={{ display: "grid", gap: 8, width, maxWidth: "100%" }}>
      {(["compact", "standard"] as const).map((footprint) => <StorySound key={footprint} sound={sound} footprint={footprint} />)}
    </div>
  ),
};

/** Every example as a 64 px row, stacked as a phone's column would be. */
export const Compact: Story = {
  args: { footprint: "compact" },
  parameters: { layout: "padded", controls: { include: ["width"] } },
  render: ({ width }) => (
    <div style={{ display: "grid", gap: 8, width, maxWidth: "100%" }}>
      {SEEDS.map((name) => <StorySound key={name} sound={name} footprint="compact" />)}
    </div>
  ),
};

/** The detail panel: the key, the volume fader, which never switches the sound, and today. */
export const Details: Story = { args: { defaultOpen: true } };

/** Unavailable: blank segments, no fader, and the unavailable hours dashed on the meter. */
export const DetailsUnavailable: Story = { name: "Details, unavailable", args: { sound: "unavailable", defaultOpen: true } };

/** On a phone the panel is a bottom sheet: drag its header down to close. */
export const DetailsPhone: Story = {
  name: "Details, phone",
  args: { defaultOpen: true },
  parameters: { viewport: { defaultViewport: "mobile2" } },
};
