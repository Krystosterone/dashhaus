import type { Meta, StoryObj } from "@storybook/react";
import { DemoCalendarTile as DemoTile } from "./demo/DemoCalendarTile";
import { CALENDAR_SEEDS, CALENDAR_WORST_CASE } from "@dashhaus/core/seeds/calendar";
import { onHourCycle } from "@dashhaus/core/seeds/clock";
import { HourCycleProvider } from "@dashhaus/core/hooks";

const SIZES = { S: 174, M: 360, L: 464 } as const;
const SEEDS = ["normal", "underWay", "allDay", "tomorrow", "free", "waiting", "unavailable", "long"] as const;

const meta = {
  title: "Orb/Cards/Calendar",
  component: DemoTile,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "One calendar (`calendar.*`), with its events to its horizon and any calendars read beside it: a reading. A bare calendar icon, the next " +
          "event's title as the figure and when it is beside it under its caption (In 2h 6m, Until 12:15, Tomorrow 09:30), and no glow; a timed " +
          "event leads before the day's all-day ones, and with nothing to the horizon it says Free, and for how long. The status line counts what " +
          "is left today; a compact row names the event and cues when. It has no actions and no warnings. Tap the reading or the name for today's " +
          "events, what's coming, and today's plan by hour. Same sizes and heights as the other cards.",
      },
    },
  },
  argTypes: {
    seed: { control: "select", options: SEEDS, description: "Example calendar" },
    width: { control: { type: "range", min: 160, max: 640, step: 2 }, description: "Container width in px" },
    footprint: { control: "inline-radio", options: ["compact", "standard", "featured"] },
    showControl: { control: "boolean", description: "Compact only: show when in the row (off: the row opens details)" },
    defaultOpen: { control: "boolean", description: "Open the detail sheet on load" },
  },
  args: { seed: "normal", width: SIZES.M, footprint: "standard" },
  render: (args) => <DemoTile key={`${args.seed}-${args.defaultOpen}`} {...args} />,
} satisfies Meta<typeof DemoTile>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The next event still to come today, counted down from the card's minute clock: In 2h 6m. */
export const Next: Story = {};
/** An event under way says until when; the icon's day fills. */
export const UnderWay: Story = { name: "Under way", args: { seed: "underWay" } };
/** An all-day event leads only when the day has nothing timed left. */
export const AllDay: Story = { name: "All day", args: { seed: "allDay" } };
export const Tomorrow: Story = { args: { seed: "tomorrow" } };
/** Nothing to the horizon: Free, and for how long, in the second ink. */
export const Free: Story = { args: { seed: "free" } };
/** Reachable, its events not read yet: No reading yet on the status line, Waiting… in the readout. */
export const NoReadingYet: Story = { name: "No reading yet", args: { seed: "waiting" } };
export const Featured: Story = { args: { footprint: "featured" } };
/**
 * On a 12-hour dashboard (YAML `hour_cycle: h12`): every state and the worst case, each time the
 * card says on that clock, from the seeds as the mapper writes them there (`onHourCycle`).
 */
export const TwelveHourClock: Story = {
  name: "12-hour clock",
  decorators: [(Story) => <HourCycleProvider hourCycle="h12"><Story /></HourCycleProvider>],
  parameters: { layout: "padded", controls: { include: ["width", "footprint"] } },
  render: ({ width, footprint }) => (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-start" }}>
      {[...SEEDS.map((name) => CALENDAR_SEEDS[name]), ...CALENDAR_WORST_CASE].map((seed, index) => <DemoTile key={index} seed={onHourCycle(seed, "h12")} width={width} footprint={footprint} />)}
    </div>
  ),
};
export const Unavailable: Story = { args: { seed: "unavailable" } };
/** Realistic worst-case data from the demo seeds (CALENDAR_WORST_CASE): a long title and place over three calendars, six all-day events, a flight across midnight, accented text, nothing at all, gone and never seen. */
export const WorstCase: Story = {
  name: "Worst case",
  parameters: { layout: "padded", controls: { include: ["width", "footprint"] } },
  render: ({ width, footprint }) => (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-start" }}>
      {CALENDAR_WORST_CASE.map((seed, index) => <DemoTile key={index} seed={seed} width={width} footprint={footprint} />)}
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
/** A long day: six all-day events, the half term running on to Friday, nothing timed. */
export const DetailsAllDay: Story = { name: "Details, all day", args: { seed: "manyAllDay", defaultOpen: true } };
/** Three calendars over a month: each event names its calendar, long titles wrap. */
export const DetailsLong: Story = { name: "Details, long", args: { seed: "long", defaultOpen: true } };
/** The details on a 12-hour clock: every time in them with its period. */
export const DetailsTwelveHourClock: Story = { name: "Details, 12-hour clock", decorators: [(Story) => <HourCycleProvider hourCycle="h12"><Story /></HourCycleProvider>],
  render: ({ seed, width, footprint }) => <DemoTile seed={onHourCycle(typeof seed === "string" ? CALENDAR_SEEDS[seed] : seed, "h12")} width={width} footprint={footprint} defaultOpen />,
};
export const DetailsUnavailable: Story = { name: "Details, unavailable", args: { seed: "unavailable", defaultOpen: true } };
export const DetailsPhone: Story = {
  name: "Details, phone",
  args: { defaultOpen: true },
  parameters: { viewport: { defaultViewport: "mobile2" } },
};
