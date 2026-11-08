import type { Meta, StoryObj } from "@storybook/react";
import { LockModule } from "./LockModule";
import type { FieldFootprint } from "../../shared/ui";
import { LOCK_SEEDS, LOCK_WORST_CASE, useDemoLock } from "@dashhaus/core/seeds/lock";
import { onHourCycle } from "@dashhaus/core/seeds/clock";
import { HourCycleProvider } from "@dashhaus/core/hooks";
import type { LockSeed, LockSeedName } from "@dashhaus/core/seeds/lock";
import type { LockAction } from "@dashhaus/core/entities/lock/types";

const SIZES = { S: 200, M: 340, L: 464 } as const;
const SEEDS = Object.keys(LOCK_SEEDS) as LockSeedName[];

interface DemoProps { width?: number; footprint?: FieldFootprint; defaultOpen?: boolean; defaultAction?: LockAction; readOnly?: boolean }

function DemoLock({ seed, width, ...props }: DemoProps & { seed: LockSeed }) {
  const demo = useDemoLock(seed);
  return (
    <div style={{ width, maxWidth: "100%" }}>
      <LockModule {...demo} {...props} />
    </div>
  );
}

function StoryLock({ lock, ...props }: DemoProps & { lock: LockSeedName }) {
  return <DemoLock seed={LOCK_SEEDS[lock]} {...props} />;
}

const meta = {
  title: "Field/Cards/Lock",
  component: StoryLock,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "A door lock as a field module, with its device's battery. The key prints what pressing it does: Lock locks at once; " +
          "Unlock never unlocks, it opens the detail panel on its question, or its keypad when the lock asks for a code (the demo's is 1234). " +
          "Its LED is lit while locked; the screen says LOCK, OPEN or JAM. A jam is urgent, an inverted block; a low battery is printed on the plate. " +
          "Tap the name, or press and hold the key, for the panel: Open door where the lock can unlatch it, and the last change.",
      },
    },
  },
  argTypes: {
    lock: { control: "select", options: SEEDS, description: "Example lock" },
    width: { control: { type: "range", min: 180, max: 640, step: 2 }, description: "Container width in px" },
    footprint: { control: "inline-radio", options: ["compact", "standard"], description: "Module height" },
    defaultOpen: { control: "boolean", description: "Open the detail panel on load" },
    defaultAction: { control: "inline-radio", options: [undefined, "unlock", "open", "lock"], description: "Open the panel on this action's question" },
    readOnly: { control: "boolean", description: "View only: nothing pressed" },
  },
  args: { lock: "locked", width: SIZES.M, footprint: "standard" },
  render: (args) => <StoryLock key={`${args.lock}-${args.defaultOpen}-${args.defaultAction}`} {...args} />,
} satisfies Meta<typeof StoryLock>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Locked: LOCK, the padlock lit, the LED on; the key says Unlock, and only asks. */
export const Locked: Story = {};
/** Unlocked: OPEN in the dim ink; the key locks at once. */
export const Unlocked: Story = { args: { lock: "unlocked" } };
/** On its way: blank segments, the state in words, and the key lies flat until it lands. */
export const Locking: Story = { args: { lock: "locking" } };
/** Jammed: urgent, an inverted block on the screen and the alert line; the key locks again. */
export const Jammed: Story = { args: { lock: "jammed" } };
/** A lock that asks for a code and can unlatch the door, its battery low on the plate. */
export const CodeRequired: Story = { name: "Code required", args: { lock: "code" } };
/** A lock that supports open, with the door unlatched. */
export const Open: Story = { args: { lock: "open" } };
/** View only: the key lies flat; the screen and the panel still say everything. */
export const ViewOnly: Story = { name: "View only", args: { readOnly: true } };
/**
 * On a 12-hour dashboard (YAML `hour_cycle: h12`): every state and the worst case, each time the
 * module says on that clock, from the seeds as the mapper writes them there (`onHourCycle`).
 * Drawn at the chosen width and again at the narrowest, where a line that clips drops a time whole.
 */
export const TwelveHourClock: Story = {
  name: "12-hour clock",
  decorators: [(Story) => <HourCycleProvider hourCycle="h12"><Story /></HourCycleProvider>],
  parameters: { layout: "padded", controls: { include: ["width", "footprint"] } },
  render: ({ width, footprint }) => (
    <div style={{ display: "grid", gap: 24 }}>
      {[width, footprint === "compact" ? 260 : SIZES.S].map((at, row) => (
        <div key={row} style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-start" }}>
          {[...SEEDS.map((name) => LOCK_SEEDS[name]), ...LOCK_WORST_CASE].map((seed, index) => <DemoLock key={index} seed={onHourCycle(seed, "h12")} width={at} footprint={footprint} />)}
        </div>
      ))}
    </div>
  ),
};

/** Blank segments on the screen, and when it was last seen. */
export const Unavailable: Story = { args: { lock: "unavailable" } };

/** Every slot at its widest: the worst-case seeds. */
export const WorstCase: Story = {
  name: "Worst case",
  parameters: { layout: "padded", controls: { include: ["width", "footprint"] } },
  render: ({ width, footprint }) => (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-start" }}>
      {LOCK_WORST_CASE.map((seed, i) => <DemoLock key={i} seed={seed} width={width} footprint={footprint} />)}
    </div>
  ),
};

/** Every example at one width. Heights match, whatever the state. */
export const AllStates: Story = {
  name: "All states",
  parameters: { layout: "padded", controls: { include: ["width", "footprint"] } },
  render: ({ width, footprint }) => (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-start" }}>
      {SEEDS.map((name) => <StoryLock key={name} lock={name} width={width} footprint={footprint} />)}
    </div>
  ),
};

/** The same lock at S, M and L container widths. */
export const Sizes: Story = {
  parameters: { layout: "padded", controls: { include: ["lock", "footprint"] } },
  render: ({ lock, footprint }) => (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 24, alignItems: "flex-start" }}>
      {(Object.entries(SIZES) as [keyof typeof SIZES, number][]).map(([label, width]) => (
        <figure key={label} style={{ margin: 0, display: "grid", gap: 8 }}>
          <figcaption style={{ font: "600 11px var(--fd-sans)", letterSpacing: "0.06em", color: "var(--fd-ink-2)" }}>{label} · {width} PX</figcaption>
          <StoryLock key={lock} lock={lock} width={width} footprint={footprint} />
        </figure>
      ))}
    </div>
  ),
};

/** The same entity at both footprints, the 64 px row and the 160 px module, at one width. */
export const Footprints: Story = {
  parameters: { layout: "padded", controls: { include: ["lock", "width"] } },
  render: ({ lock, width }) => (
    <div style={{ display: "grid", gap: 8, width, maxWidth: "100%" }}>
      {(["compact", "standard"] as const).map((footprint) => <StoryLock key={footprint} lock={lock} footprint={footprint} />)}
    </div>
  ),
};

/** Every example as a 64 px row, stacked as a phone's column would be. */
export const Compact: Story = {
  args: { footprint: "compact" },
  parameters: { layout: "padded", controls: { include: ["width"] } },
  render: ({ width }) => (
    <div style={{ display: "grid", gap: 8, width, maxWidth: "100%" }}>
      {SEEDS.map((name) => <StoryLock key={name} lock={name} footprint="compact" />)}
    </div>
  ),
};

/** The detail panel: the key, Open door, and the last change. */
export const Details: Story = { args: { defaultOpen: true } };
/** What pressing Unlock opens: the question, Cancel focused, and Unlock beside it. */
export const DetailsUnlock: Story = { name: "Details, unlock", args: { defaultAction: "unlock" } };
/** A lock that asks for a code: typing it is the confirmation. The demo's code is 1234. */
export const DetailsCode: Story = { name: "Details, code", args: { lock: "code", defaultAction: "unlock" } };
/** A text code: letters work too, typed on the strip itself, a field that brings up a touch screen's keyboard. The demo's code is 1234. */
export const DetailsTextCode: Story = { name: "Details, text code", args: { lock: "textCode", defaultAction: "unlock" } };
/** Open door, behind the same question. */
export const DetailsOpenDoor: Story = { name: "Details, open door", args: { defaultAction: "open" } };
/** Unavailable: blank segments, and when it was last seen. */
export const DetailsUnavailable: Story = { name: "Details, unavailable", args: { lock: "unavailable", defaultOpen: true } };

/** On a phone the panel is a bottom sheet: drag its header down to close. */
export const DetailsPhone: Story = {
  name: "Details, phone",
  args: { defaultOpen: true },
  parameters: { viewport: { defaultViewport: "mobile2" } },
};
