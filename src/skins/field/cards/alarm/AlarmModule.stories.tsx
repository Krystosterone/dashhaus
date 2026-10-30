import type { Meta, StoryObj } from "@storybook/react";
import { AlarmModule } from "./AlarmModule";
import type { AlarmAction } from "@dashhaus/core/entities/alarm/types";
import type { FieldFootprint } from "../../shared/ui";
import { ALARM_SEEDS, ALARM_WORST_CASE, useDemoAlarm } from "./demo/useDemoAlarm";
import type { AlarmSeed, AlarmSeedName } from "./demo/useDemoAlarm";

const SIZES = { S: 200, M: 340, L: 464 } as const;
const SEEDS = Object.keys(ALARM_SEEDS) as AlarmSeedName[];

function DemoAlarm({ seed, width, footprint, defaultOpen, defaultAction }: { seed: AlarmSeed; width?: number; footprint?: FieldFootprint; defaultOpen?: boolean; defaultAction?: AlarmAction }) {
  const demo = useDemoAlarm(seed);
  return (
    <div style={{ width, maxWidth: "100%" }}>
      <AlarmModule
        entity={demo.entity}
        history={demo.history}
        onArm={seed.readOnly ? undefined : demo.onArm}
        onDisarm={seed.readOnly ? undefined : demo.onDisarm}
        footprint={footprint}
        defaultOpen={defaultOpen}
        defaultAction={defaultAction}
      />
    </div>
  );
}

function StoryAlarm({ alarm, ...props }: { alarm: AlarmSeedName; width?: number; footprint?: FieldFootprint; defaultOpen?: boolean; defaultAction?: AlarmAction }) {
  return <DemoAlarm seed={ALARM_SEEDS[alarm]} {...props} />;
}

const meta = {
  title: "Field/Cards/Alarm",
  component: StoryAlarm,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "A security alarm (Home Assistant alarm_control_panel) as a field module. The screen says ON or OFF beside a shield lit while armed, and counts exit and entry delays down in its place. " +
          "The row is a key for Off and each mode, the current one chosen; where they don't fit, and through a delay, one key says what pressing it does. Whatever needs the code opens the panel on its keypad " +
          "(demo code: 1234; a physical keyboard types too). A view-only panel is a reading: its glyph and today. Standard modules are 160 px, compact rows 64 px.",
      },
    },
  },
  argTypes: {
    alarm: { control: "select", options: SEEDS, description: "Example panel" },
    width: { control: { type: "range", min: 180, max: 640, step: 2 }, description: "Container width in px" },
    footprint: { control: "inline-radio", options: ["compact", "standard"], description: "Module height" },
    defaultOpen: { control: "boolean", description: "Open the detail panel on load" },
  },
  args: { alarm: "disarmed", width: SIZES.M, footprint: "standard" },
  render: (args) => <StoryAlarm key={`${args.alarm}-${args.defaultOpen}`} {...args} />,
} satisfies Meta<typeof StoryAlarm>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Disarmed: OFF in the dim ink, and Off chosen among the mode keys. Arming asks for the code. */
export const Disarmed: Story = {};
/** Disarmed with doors open: how many and which, behind the warning marker. */
export const DoorOpen: Story = { name: "Disarmed, door open", args: { alarm: "openDoor" } };
/** Armed away: the shield lit, ON, and Away chosen. */
export const Armed: Story = { args: { alarm: "away" } };
/** Armed in a mode the panel doesn't list, custom bypass: it is shown, never read as Off. Five choices, so glyphs. */
export const CustomBypass: Story = { name: "Custom bypass", args: { alarm: "custom" } };
/** The exit delay counting down in the figure's place, and one key that cancels it. */
export const Arming: Story = { args: { alarm: "arming" } };
/** Home Assistant's core entity arming: no delay length and no target mode, so blank segments and no timer. */
export const ArmingUnknown: Story = { name: "Arming, no timer", args: { alarm: "armingUnknown" } };
/** The entry delay: what set it off behind the warning marker, the time left, and Disarm. */
export const EntryDelay: Story = { name: "Entry delay", args: { alarm: "pending" } };
/** Disarming: nothing to press until it is done. */
export const Disarming: Story = { args: { alarm: "disarming" } };
/** Triggered: what set it off behind the marker, and Disarm. No warning colour and no glow, as everywhere in field. */
export const Triggered: Story = { args: { alarm: "triggered" } };
/** No code to arm, only to disarm: a mode key arms at once. */
export const ArmFree: Story = { name: "Code to disarm only", args: { alarm: "armFree" } };
/** One arm mode and no code: one key that arms it, and disarms it. */
export const OneMode: Story = { name: "One mode, no code", args: { alarm: "noCode" } };
/** A panel Home Assistant reads but can't control: a reading, its glyph and today where the keys would be. */
export const ViewOnly: Story = { name: "View only", args: { alarm: "ring" } };
/** Blank segments on the screen, and when it was last seen. */
export const Unavailable: Story = { args: { alarm: "unavailable" } };

/** Every slot at its widest: the worst-case seeds. */
export const WorstCase: Story = {
  name: "Worst case",
  parameters: { layout: "padded", controls: { include: ["width", "footprint"] } },
  render: ({ width, footprint }) => (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-start" }}>
      {ALARM_WORST_CASE.map((seed) => <DemoAlarm key={seed.entity.entityId} seed={seed} width={width} footprint={footprint} />)}
    </div>
  ),
};

/** Every example at one width. Heights match, whatever the state. */
export const AllStates: Story = {
  name: "All states",
  parameters: { layout: "padded", controls: { include: ["width", "footprint"] } },
  render: ({ width, footprint }) => (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-start" }}>
      {SEEDS.map((name) => <StoryAlarm key={name} alarm={name} width={width} footprint={footprint} />)}
    </div>
  ),
};

/** The same alarm at S, M and L container widths: one key at S, glyphs at M, words at L. */
export const Sizes: Story = {
  parameters: { layout: "padded", controls: { include: ["alarm", "footprint"] } },
  render: ({ alarm, footprint }) => (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 24, alignItems: "flex-start" }}>
      {(Object.entries(SIZES) as [keyof typeof SIZES, number][]).map(([label, width]) => (
        <figure key={label} style={{ margin: 0, display: "grid", gap: 8 }}>
          <figcaption style={{ font: "600 11px var(--fd-sans)", letterSpacing: "0.06em", color: "var(--fd-ink-2)" }}>{label} · {width} PX</figcaption>
          <StoryAlarm key={alarm} alarm={alarm} width={width} footprint={footprint} />
        </figure>
      ))}
    </div>
  ),
};

/** The same entity at both footprints, the 64 px row and the 160 px module, at one width. */
export const Footprints: Story = {
  parameters: { layout: "padded", controls: { include: ["alarm", "width"] } },
  render: ({ alarm, width }) => (
    <div style={{ display: "grid", gap: 8, width, maxWidth: "100%" }}>
      {(["compact", "standard"] as const).map((footprint) => <StoryAlarm key={footprint} alarm={alarm} footprint={footprint} />)}
    </div>
  ),
};

/** Every example as a 64 px row, stacked as a phone's column would be. */
export const Compact: Story = {
  args: { footprint: "compact" },
  parameters: { layout: "padded", controls: { include: ["width"] } },
  render: ({ width }) => (
    <div style={{ display: "grid", gap: 8, width, maxWidth: "100%" }}>
      {SEEDS.map((name) => <StoryAlarm key={name} alarm={name} footprint="compact" />)}
    </div>
  ),
};

/** The detail panel: the mode keys, today, and what the code is needed for. */
export const Details: Story = { args: { alarm: "away", defaultOpen: true } };

/** The keypad, open to disarm: try 1234, or a wrong code. */
export const DetailsKeypad: Story = {
  name: "Details, keypad",
  args: { alarm: "away" },
  render: (args) => <StoryAlarm {...args} defaultAction={{ kind: "disarm" }} />,
};

/** Doors open while disarmed: listed by name, with what arming would leave unguarded. */
export const DetailsDoorOpen: Story = { name: "Details, door open", args: { alarm: "openDoor", defaultOpen: true } };

/** A view-only panel's details: its state and today, nothing to press. */
export const DetailsViewOnly: Story = { name: "Details, view only", args: { alarm: "ring", defaultOpen: true } };

/** Unavailable: blank segments, the key flat, and the unavailable hours dashed on the meter. */
export const DetailsUnavailable: Story = { name: "Details, unavailable", args: { alarm: "unavailable", defaultOpen: true } };

/** On a phone the panel is a bottom sheet: drag its header down to close. The keypad keeps its keys 52 px tall. */
export const DetailsPhone: Story = {
  name: "Details, phone",
  args: { alarm: "away" },
  parameters: { viewport: { defaultViewport: "mobile2" } },
  render: (args) => <StoryAlarm {...args} defaultAction={{ kind: "disarm" }} />,
};
