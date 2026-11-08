import type { Meta, StoryObj } from "@storybook/react";
import { SunModule } from "./SunModule";
import type { FieldFootprint } from "../../shared/ui";
import { SUN_SEEDS, SUN_WORST_CASE } from "@dashhaus/core/seeds/sun";
import type { SunSeed, SunSeedName } from "@dashhaus/core/seeds/sun";
import { onHourCycle } from "@dashhaus/core/seeds/clock";
import { HourCycleProvider } from "@dashhaus/core/hooks";

const SIZES = { S: 200, M: 340, L: 464 } as const;
const SEEDS = Object.keys(SUN_SEEDS) as SunSeedName[];

function DemoSun({ seed, width, footprint, defaultOpen }: { seed: SunSeed; width?: number; footprint?: FieldFootprint; defaultOpen?: boolean }) {
  const demo = seed;
  return (
    <div style={{ width, maxWidth: "100%" }}>
      <SunModule
        entity={demo.entity}
        history={demo.history}
        footprint={footprint}
        defaultOpen={defaultOpen}
      />
    </div>
  );
}

function StorySun({ sun, ...props }: { sun: SunSeedName; width?: number; footprint?: FieldFootprint; defaultOpen?: boolean }) {
  return <DemoSun seed={SUN_SEEDS[sun]} {...props} />;
}

const meta = {
  title: "Field/Cards/Sun",
  component: StorySun,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "The sun as a field module. A reading, so nothing on it is pressed: its glyph lies flat where a key would be, and today's meter of the sun's height by hour takes the fader's place. The screen is a clock: what comes next, its pictogram lit while the sun is up. Tap the name for the detail panel. Standard modules are 160 px, compact rows 64 px.",
      },
    },
  },
  argTypes: {
    sun: { control: "select", options: SEEDS, description: "Example sun" },
    width: { control: { type: "range", min: 180, max: 640, step: 2 }, description: "Container width in px" },
    footprint: { control: "inline-radio", options: ["compact", "standard"], description: "Module height" },
    defaultOpen: { control: "boolean", description: "Open the detail panel on load" },
  },
  args: { sun: "normal", width: SIZES.M, footprint: "standard" },
  render: (args) => <StorySun key={`${args.sun}-${args.defaultOpen}`} {...args} />,
} satisfies Meta<typeof StorySun>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Up: the screen says when it sets, lit, and counts down to it. */
export const Normal: Story = {};
/** Down since sunset: the sunrise, its pictogram unlit. */
export const Evening: Story = { name: "After sunset", args: { sun: "evening" } };
/** Down in the dawn: minutes to the sunrise. */
export const Dawn: Story = { name: "Before sunrise", args: { sun: "dawn" } };
/** A long summer day on the meter. */
export const Summer: Story = { args: { sun: "summer" } };
/** High in the Arctic in June: no sunset reported, so the screen says UP. */
export const PolarDay: Story = { name: "Up all day", args: { sun: "polarDay" } };
export const NoReadingYet: Story = { name: "No reading yet", args: { sun: "waiting" } };
/**
 * On a 12-hour dashboard (YAML `hour_cycle: h12`): every state, the worst case among them, each time the module says
 * on that clock, from the seeds as the mapper writes them there (`onHourCycle`).
 */
export const TwelveHourClock: Story = {
  name: "12-hour clock",
  decorators: [(Story) => <HourCycleProvider hourCycle="h12"><Story /></HourCycleProvider>],
  parameters: { layout: "padded", controls: { include: ["width", "footprint"] } },
  render: ({ width, footprint }) => (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-start" }}>
      {SEEDS.map((name) => <DemoSun key={name} seed={onHourCycle(SUN_SEEDS[name], "h12")} width={width} footprint={footprint} />)}
    </div>
  ),
};
/** Blank segments on the screen, and when it was last seen. */
export const Unavailable: Story = { args: { sun: "unavailable" } };

/** Every slot at its widest: the worst-case seeds. */
export const WorstCase: Story = {
  name: "Worst case",
  parameters: { layout: "padded", controls: { include: ["width", "footprint"] } },
  render: ({ width, footprint }) => (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-start" }}>
      {SUN_WORST_CASE.map((seed) => <DemoSun key={seed.entity.entityId} seed={seed} width={width} footprint={footprint} />)}
    </div>
  ),
};

/** Every example at one width. Heights match, whatever the state. */
export const AllStates: Story = {
  name: "All states",
  parameters: { layout: "padded", controls: { include: ["width", "footprint"] } },
  render: ({ width, footprint }) => (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-start" }}>
      {SEEDS.map((name) => <StorySun key={name} sun={name} width={width} footprint={footprint} />)}
    </div>
  ),
};

/** The same sun at S, M and L container widths. */
export const Sizes: Story = {
  parameters: { layout: "padded", controls: { include: ["sun", "footprint"] } },
  render: ({ sun, footprint }) => (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 24, alignItems: "flex-start" }}>
      {(Object.entries(SIZES) as [keyof typeof SIZES, number][]).map(([label, width]) => (
        <figure key={label} style={{ margin: 0, display: "grid", gap: 8 }}>
          <figcaption style={{ font: "600 11px var(--fd-sans)", letterSpacing: "0.06em", color: "var(--fd-ink-2)" }}>{label} · {width} PX</figcaption>
          <StorySun key={sun} sun={sun} width={width} footprint={footprint} />
        </figure>
      ))}
    </div>
  ),
};

/** The same entity at both footprints, the 64 px row and the 160 px module, at one width. */
export const Footprints: Story = {
  parameters: { layout: "padded", controls: { include: ["sun", "width"] } },
  render: ({ sun, width }) => (
    <div style={{ display: "grid", gap: 8, width, maxWidth: "100%" }}>
      {(["compact", "standard"] as const).map((footprint) => <StorySun key={footprint} sun={sun} footprint={footprint} />)}
    </div>
  ),
};

/** Every example as a 64 px row, stacked as a phone's column would be. */
export const Compact: Story = {
  args: { footprint: "compact" },
  parameters: { layout: "padded", controls: { include: ["width"] } },
  render: ({ width }) => (
    <div style={{ display: "grid", gap: 8, width, maxWidth: "100%" }}>
      {SEEDS.map((name) => <StorySun key={name} sun={name} footprint="compact" />)}
    </div>
  ),
};

/** The detail panel: the screen and today. */
export const Details: Story = { args: { defaultOpen: true } };

/** The panel on a 12-hour clock: every time in it with its period. */
export const DetailsTwelveHourClock: Story = { name: "Details, 12-hour clock", decorators: [(Story) => <HourCycleProvider hourCycle="h12"><Story /></HourCycleProvider>],
  render: ({ sun, width, footprint }) => <DemoSun seed={onHourCycle(SUN_SEEDS[sun], "h12")} width={width} footprint={footprint} defaultOpen />,
};

/** Unavailable: blank segments, and the unavailable hours dashed on the meter. */
export const DetailsUnavailable: Story = { name: "Details, unavailable", args: { sun: "unavailable", defaultOpen: true } };

/** On a phone the panel is a bottom sheet: drag its header down to close. */
export const DetailsPhone: Story = {
  name: "Details, phone",
  args: { defaultOpen: true },
  parameters: { viewport: { defaultViewport: "mobile2" } },
};
