import type { Meta, StoryObj } from "@storybook/react";
import { VacuumModule } from "./VacuumModule";
import type { FieldFootprint } from "../../shared/ui";
import { VACUUM_SEEDS, VACUUM_WORST_CASE, useDemoVacuum } from "@dashhaus/core/seeds/vacuum";
import type { VacuumSeed, VacuumSeedName } from "@dashhaus/core/seeds/vacuum";

const SIZES = { S: 200, M: 340, L: 464 } as const;
const SEEDS = Object.keys(VACUUM_SEEDS) as VacuumSeedName[];

function DemoVacuum({ seed, width, footprint, defaultOpen }: { seed: VacuumSeed; width?: number; footprint?: FieldFootprint; defaultOpen?: boolean }) {
  const demo = useDemoVacuum(seed);
  return (
    <div style={{ width, maxWidth: "100%" }}>
      <VacuumModule
        entity={demo.entity}
        history={demo.history}
        onStart={demo.onStart} onPause={demo.onPause} onReturnToBase={demo.onReturnToBase} onLocate={demo.onLocate} onFanSpeedChange={demo.onFanSpeedChange}
        footprint={footprint}
        defaultOpen={defaultOpen}
      />
    </div>
  );
}

function StoryVacuum({ vacuum, ...props }: { vacuum: VacuumSeedName; width?: number; footprint?: FieldFootprint; defaultOpen?: boolean }) {
  return <DemoVacuum seed={VACUUM_SEEDS[vacuum]} {...props} />;
}

const meta = {
  title: "Field/Cards/Vacuum",
  component: StoryVacuum,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "One robot vacuum as a field module, its battery its own. The screen says what it is doing (RUN, DOCK, HOLD, IDLE, ERR) and the meta line the core word; two keys print what a press does: Pause while it moves, Start or Resume while it stands, its LED the cleaning signal, then Return to send it home. An error is urgent, a low battery while it stands away from the dock advisory. Tap the name, or press and hold a key, for the panel: Locate, the fan speeds and today's cleaning. Standard modules are 160 px, compact rows 64 px.",
      },
    },
  },
  argTypes: {
    vacuum: { control: "select", options: SEEDS, description: "Example vacuum" },
    width: { control: { type: "range", min: 180, max: 640, step: 2 }, description: "Container width in px" },
    footprint: { control: "inline-radio", options: ["compact", "standard"], description: "Module height" },
    defaultOpen: { control: "boolean", description: "Open the detail panel on load" },
  },
  args: { vacuum: "cleaning", width: SIZES.M, footprint: "standard" },
  render: (args) => <StoryVacuum key={`${args.vacuum}-${args.defaultOpen}`} {...args} />,
} satisfies Meta<typeof StoryVacuum>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Cleaning: RUN, the vacuum lit, and the first key's LED; it prints Pause, what a press does. */
export const Cleaning: Story = {};
/** On its dock: DOCK in the dim ink, Charging on the meta line, and Return lying flat. */
export const Docked: Story = { args: { vacuum: "docked" } };
/** On its way home: a transition, blank segments with the dock on the meta line. */
export const Returning: Story = { args: { vacuum: "returning" } };
/** Paused: HOLD, and the first key resumes it. */
export const Paused: Story = { args: { vacuum: "paused" } };
/** An error is urgent: an inverted block on the screen with what went wrong, and on the alert line. */
export const InError: Story = { name: "Error", args: { vacuum: "error" } };
/** Idle away from its dock with a low battery: advisory, the device's, on the plate in place of the area. */
export const LowBattery: Story = { name: "Low battery", args: { vacuum: "lowBattery" } };
/** A state Home Assistant doesn't name: blank segments, the integration's own words on the meta line. */
export const OtherState: Story = { name: "Other state", args: { vacuum: "other" } };
/** A vacuum that can't pause: cleaning, its one key sends it back to the dock. */
export const NoPause: Story = { name: "No pause", args: { vacuum: "basic" } };
/** Blank segments on the screen, and when it was last seen. */
export const Unavailable: Story = { args: { vacuum: "unavailable" } };

/** Every slot at its widest: the worst-case seeds. */
export const WorstCase: Story = {
  name: "Worst case",
  parameters: { layout: "padded", controls: { include: ["width", "footprint"] } },
  render: ({ width, footprint }) => (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-start" }}>
      {VACUUM_WORST_CASE.map((seed) => <DemoVacuum key={seed.entity.entityId} seed={seed} width={width} footprint={footprint} />)}
    </div>
  ),
};

/** Every example at one width. Heights match, whatever the state. */
export const AllStates: Story = {
  name: "All states",
  parameters: { layout: "padded", controls: { include: ["width", "footprint"] } },
  render: ({ width, footprint }) => (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-start" }}>
      {SEEDS.map((name) => <StoryVacuum key={name} vacuum={name} width={width} footprint={footprint} />)}
    </div>
  ),
};

/** The same vacuum at S, M and L container widths. */
export const Sizes: Story = {
  parameters: { layout: "padded", controls: { include: ["vacuum", "footprint"] } },
  render: ({ vacuum, footprint }) => (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 24, alignItems: "flex-start" }}>
      {(Object.entries(SIZES) as [keyof typeof SIZES, number][]).map(([label, width]) => (
        <figure key={label} style={{ margin: 0, display: "grid", gap: 8 }}>
          <figcaption style={{ font: "600 11px var(--fd-sans)", letterSpacing: "0.06em", color: "var(--fd-ink-2)" }}>{label} · {width} PX</figcaption>
          <StoryVacuum key={vacuum} vacuum={vacuum} width={width} footprint={footprint} />
        </figure>
      ))}
    </div>
  ),
};

/** The same entity at both footprints, the 64 px row and the 160 px module, at one width. */
export const Footprints: Story = {
  parameters: { layout: "padded", controls: { include: ["vacuum", "width"] } },
  render: ({ vacuum, width }) => (
    <div style={{ display: "grid", gap: 8, width, maxWidth: "100%" }}>
      {(["compact", "standard"] as const).map((footprint) => <StoryVacuum key={footprint} vacuum={vacuum} footprint={footprint} />)}
    </div>
  ),
};

/** Every example as a 64 px row, stacked as a phone's column would be. */
export const Compact: Story = {
  args: { footprint: "compact" },
  parameters: { layout: "padded", controls: { include: ["width"] } },
  render: ({ width }) => (
    <div style={{ display: "grid", gap: 8, width, maxWidth: "100%" }}>
      {SEEDS.map((name) => <StoryVacuum key={name} vacuum={name} footprint="compact" />)}
    </div>
  ),
};

/** The detail panel: the screen, the keys with Locate, the fan speeds and today. */
export const Details: Story = { args: { defaultOpen: true } };

/** In error: what went wrong on the screen, the first key starts it again. */
export const DetailsError: Story = { name: "Details, error", args: { vacuum: "error", defaultOpen: true } };

/** Unavailable: blank segments, and the unavailable hours dashed on the meter. */
export const DetailsUnavailable: Story = { name: "Details, unavailable", args: { vacuum: "unavailable", defaultOpen: true } };

/** On a phone the panel is a bottom sheet: drag its header down to close. */
export const DetailsPhone: Story = {
  name: "Details, phone",
  args: { defaultOpen: true },
  parameters: { viewport: { defaultViewport: "mobile2" } },
};
