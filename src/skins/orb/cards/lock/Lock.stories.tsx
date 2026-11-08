import type { Meta, StoryObj } from "@storybook/react";
import { DemoLockTile as DemoTile } from "./demo/DemoLockTile";
import { LOCK_SEEDS, LOCK_WORST_CASE } from "@dashhaus/core/seeds/lock";
import { onHourCycle } from "@dashhaus/core/seeds/clock";
import { HourCycleProvider } from "@dashhaus/core/hooks";

const SIZES = { S: 174, M: 360, L: 464 } as const;
const SEEDS = ["locked", "unlocked", "locking", "jammed", "code", "open", "unavailable", "long"] as const;

const meta = {
  title: "Orb/Cards/Lock",
  component: DemoTile,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "A door lock (`lock.*`), with its device's battery. A tap on the orb or the pill locks it. A tap on a locked lock " +
          "never unlocks it: the sheet opens on a confirmation, or on the keypad when the lock asks for a code (the demo's is 1234). " +
          "Press and hold the orb, or tap the name, for the sheet: the last change, the battery, and Open door where the lock can " +
          "unlatch it. A jam or a low battery is a warn marker on the status line; a lock never glows.",
      },
    },
  },
  argTypes: {
    seed: { control: "select", options: SEEDS, description: "Example entity" },
    width: { control: { type: "range", min: 160, max: 640, step: 2 }, description: "Container width in px" },
    footprint: { control: "inline-radio", options: ["compact", "standard", "featured"] },
    showControl: { control: "boolean", description: "Compact only: show the control in the row (off: the row opens details)" },
    defaultOpen: { control: "boolean", description: "Open the detail sheet on load" },
    defaultAction: { control: "inline-radio", options: [undefined, "unlock", "open", "lock"], description: "With defaultOpen: open on this action's confirmation" },
    readOnly: { control: "boolean", description: "View only: nothing to lock or unlock" },
  },
  args: { seed: "locked", width: SIZES.M, footprint: "standard" },
  render: (args) => <DemoTile key={`${args.seed}-${args.defaultOpen}-${args.defaultAction}`} {...args} />,
} satisfies Meta<typeof DemoTile>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Locked: Story = {};
export const Unlocked: Story = { args: { seed: "unlocked" } };
/** On its way: the pill gives way to the verb, and a tap does nothing until it lands. */
export const Locking: Story = { args: { seed: "locking" } };
/** The bolt didn't throw: a warn marker on the status line, never glow, and the pill offers to lock again. */
export const Jammed: Story = { args: { seed: "jammed" } };
/** A lock that asks for a code, and can unlatch the door; its battery is low. */
export const CodeRequired: Story = { name: "Code required", args: { seed: "code" } };
/** A lock that supports open, with the door unlatched. */
export const Open: Story = { args: { seed: "open" } };
/** View only: the state and who changed it, nothing to press. */
export const ViewOnly: Story = { name: "View only", args: { readOnly: true } };
/**
 * On a 12-hour dashboard (YAML `hour_cycle: h12`): every state and the worst case, each time the
 * card says on that clock, from the seeds as the mapper writes them there (`onHourCycle`).
 * Drawn at the chosen width and again at the narrowest, where a line that clips drops a time whole.
 */
export const TwelveHourClock: Story = {
  name: "12-hour clock",
  decorators: [(Story) => <HourCycleProvider hourCycle="h12"><Story /></HourCycleProvider>],
  parameters: { layout: "padded", controls: { include: ["width", "footprint"] } },
  render: ({ width, footprint }) => (
    <div style={{ display: "grid", gap: 24 }}>
      {[width, SIZES.S].map((at, row) => (
        <div key={row} style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-start" }}>
          {[...SEEDS.map((name) => LOCK_SEEDS[name]), ...LOCK_WORST_CASE].map((seed, index) => <DemoTile key={index} seed={onHourCycle(seed, "h12")} width={at} footprint={footprint} />)}
        </div>
      ))}
    </div>
  ),
};
export const Unavailable: Story = { args: { seed: "unavailable" } };
/** Realistic worst-case data from the demo seeds (LOCK_WORST_CASE): long names, a long changed-by, a battery near empty. */
export const WorstCase: Story = {
  name: "Worst case",
  parameters: { layout: "padded", controls: { include: ["width", "footprint"] } },
  render: ({ width, footprint }) => (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-start" }}>
      {LOCK_WORST_CASE.map((seed, index) => <DemoTile key={index} seed={seed} width={width} footprint={footprint} />)}
    </div>
  ),
};

export const AllStates: Story = {
  name: "All states",
  parameters: { layout: "padded", controls: { include: ["width", "footprint"] } },
  render: ({ width, footprint }) => (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-start" }}>
      {SEEDS.map((seed) => <DemoTile key={seed} seed={seed} width={width} footprint={footprint} />)}
    </div>
  ),
};

export const Sizes: Story = {
  parameters: { layout: "padded", controls: { include: ["seed", "footprint"] } },
  render: ({ seed, footprint }) => (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 24, alignItems: "flex-start" }}>
      {(Object.entries(SIZES) as [keyof typeof SIZES, number][]).map(([label, width]) => (
        <figure key={label} style={{ margin: 0, display: "grid", gap: 8 }}>
          <figcaption style={{ font: "500 13px var(--font)", color: "var(--ink-2)" }}>{label} · {width} px</figcaption>
          <DemoTile key={`${seed}-${footprint}`} seed={seed} width={width} footprint={footprint} />
        </figure>
      ))}
    </div>
  ),
};

export const Footprints: Story = {
  parameters: { layout: "padded", controls: { include: ["seed", "width"] } },
  render: ({ seed, width }) => (
    <div style={{ display: "grid", gap: 8, width, maxWidth: "100%" }}>
      {(["compact", "standard", "featured"] as const).map((footprint) => <DemoTile key={footprint} seed={seed} footprint={footprint} />)}
    </div>
  ),
};

export const Compact: Story = {
  name: "Compact",
  parameters: { layout: "padded", controls: { include: ["width"] } },
  args: { width: 360 },
  render: ({ width }) => (
    <div style={{ display: "grid", gap: 8, width, maxWidth: "100%" }}>
      {SEEDS.map((seed) => <DemoTile key={seed} seed={seed} footprint="compact" />)}
      {SEEDS.map((seed) => <DemoTile key={`${seed}-bare`} seed={seed} footprint="compact" showControl={false} />)}
    </div>
  ),
};

export const Details: Story = { name: "Details", args: { defaultOpen: true } };
/** What a tap on a locked lock opens: the question, Cancel focused, Unlock in the inverse. */
export const DetailsUnlock: Story = { name: "Details, unlock", args: { defaultOpen: true, defaultAction: "unlock" } };
/** A lock that asks for a code: typing it is the confirmation. The demo's code is 1234. */
export const DetailsCode: Story = { name: "Details, code", args: { seed: "code", defaultOpen: true, defaultAction: "unlock" } };
/** A text code: letters work too, so the keypad types into a field that brings up a touch screen's keyboard. The demo's code is 1234. */
export const DetailsTextCode: Story = { name: "Details, text code", args: { seed: "textCode", defaultOpen: true, defaultAction: "unlock" } };
/** Open door, for a lock that can unlatch it, behind the same confirmation. */
export const DetailsOpenDoor: Story = { name: "Details, open door", args: { defaultOpen: true, defaultAction: "open" } };
export const DetailsUnavailable: Story = { name: "Details, unavailable", args: { seed: "unavailable", defaultOpen: true } };
export const DetailsPhone: Story = {
  name: "Details, phone",
  args: { defaultOpen: true },
  parameters: { viewport: { defaultViewport: "mobile2" } },
};
