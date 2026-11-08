import type { Meta, StoryObj } from "@storybook/react";
import { CalendarModule } from "./CalendarModule";
import type { FieldFootprint } from "../../shared/ui";
import { CALENDAR_SEEDS, CALENDAR_WORST_CASE } from "@dashhaus/core/seeds/calendar";
import { onHourCycle } from "@dashhaus/core/seeds/clock";
import { HourCycleProvider } from "@dashhaus/core/hooks";
import type { CalendarSeed, CalendarSeedName } from "@dashhaus/core/seeds/calendar";

const SIZES = { S: 200, M: 340, L: 464 } as const;
const SEEDS: CalendarSeedName[] = ["normal", "underWay", "allDay", "tomorrow", "free", "waiting", "unavailable", "long"];

function DemoCalendar({ seed, width, footprint, defaultOpen }: { seed: CalendarSeed; width?: number; footprint?: FieldFootprint; defaultOpen?: boolean }) {
  const demo = seed;
  return (
    <div style={{ width, maxWidth: "100%" }}>
      <CalendarModule
        entity={demo.entity}
        history={demo.history}
        footprint={footprint}
        defaultOpen={defaultOpen}
      />
    </div>
  );
}

function StoryCalendar({ calendar, ...props }: { calendar: CalendarSeedName; width?: number; footprint?: FieldFootprint; defaultOpen?: boolean }) {
  return <DemoCalendar seed={CALENDAR_SEEDS[calendar]} {...props} />;
}

const meta = {
  title: "Field/Cards/Calendar",
  component: StoryCalendar,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "One calendar as a field module, with its events to its horizon and any calendars read beside it. A reading, so nothing on it is pressed: " +
          "its glyph lies flat where a key would be, and today's meter of the hours busy, those ahead included, takes the fader's place. The screen " +
          "leads with the next event: NOW while one is under way, else the clock it starts at or an all-day event's weekday, the meta lines its title " +
          "and when. With nothing to the horizon it says FREE in the dim ink. It has no actions and no warnings. Tap the name for the detail panel: " +
          "today's events and what's coming. Standard modules are 160 px, compact rows 64 px.",
      },
    },
  },
  argTypes: {
    calendar: { control: "select", options: Object.keys(CALENDAR_SEEDS), description: "Example calendar" },
    width: { control: { type: "range", min: 180, max: 640, step: 2 }, description: "Container width in px" },
    footprint: { control: "inline-radio", options: ["compact", "standard"], description: "Module height" },
    defaultOpen: { control: "boolean", description: "Open the detail panel on load" },
  },
  args: { calendar: "normal", width: SIZES.M, footprint: "standard" },
  render: (args) => <StoryCalendar key={`${args.calendar}-${args.defaultOpen}`} {...args} />,
} satisfies Meta<typeof StoryCalendar>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The next event still to come today: the clock it starts at, its title and how long until it, from the module's minute clock. */
export const Next: Story = {};
/** An event under way: NOW, its pictogram lit, and until when. */
export const UnderWay: Story = { name: "Under way", args: { calendar: "underWay" } };
/** An all-day event leads only when the day has nothing timed left: NOW, all day. */
export const AllDay: Story = { name: "All day", args: { calendar: "allDay" } };
/** Today is done: the next is tomorrow's, its day on a row's line. */
export const Tomorrow: Story = { args: { calendar: "tomorrow" } };
/** Nothing to the horizon: FREE in the dim ink, never blank segments. */
export const Free: Story = { args: { calendar: "free" } };
/** Reachable, its events not read yet: blank segments, and No reading yet. */
export const NoReadingYet: Story = { name: "No reading yet", args: { calendar: "waiting" } };
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
          {[...SEEDS.map((name) => CALENDAR_SEEDS[name]), ...CALENDAR_WORST_CASE].map((seed, index) => <DemoCalendar key={index} seed={onHourCycle(seed, "h12")} width={at} footprint={footprint} />)}
        </div>
      ))}
    </div>
  ),
};

/** Blank segments on the screen, and when it was last seen. */
export const Unavailable: Story = { args: { calendar: "unavailable" } };

/** Every slot at its widest: the worst-case seeds. */
export const WorstCase: Story = {
  name: "Worst case",
  parameters: { layout: "padded", controls: { include: ["width", "footprint"] } },
  render: ({ width, footprint }) => (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-start" }}>
      {CALENDAR_WORST_CASE.map((seed) => <DemoCalendar key={seed.entity.entityId} seed={seed} width={width} footprint={footprint} />)}
    </div>
  ),
};

/** Every example at one width. Heights match, whatever the state. */
export const AllStates: Story = {
  name: "All states",
  parameters: { layout: "padded", controls: { include: ["width", "footprint"] } },
  render: ({ width, footprint }) => (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-start" }}>
      {SEEDS.map((name) => <StoryCalendar key={name} calendar={name} width={width} footprint={footprint} />)}
    </div>
  ),
};

/** The same calendar at S, M and L container widths. */
export const Sizes: Story = {
  parameters: { layout: "padded", controls: { include: ["calendar", "footprint"] } },
  render: ({ calendar, footprint }) => (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 24, alignItems: "flex-start" }}>
      {(Object.entries(SIZES) as [keyof typeof SIZES, number][]).map(([label, width]) => (
        <figure key={label} style={{ margin: 0, display: "grid", gap: 8 }}>
          <figcaption style={{ font: "600 11px var(--fd-sans)", letterSpacing: "0.06em", color: "var(--fd-ink-2)" }}>{label} · {width} PX</figcaption>
          <StoryCalendar key={calendar} calendar={calendar} width={width} footprint={footprint} />
        </figure>
      ))}
    </div>
  ),
};

/** The same entity at both footprints, the 64 px row and the 160 px module, at one width. */
export const Footprints: Story = {
  parameters: { layout: "padded", controls: { include: ["calendar", "width"] } },
  render: ({ calendar, width }) => (
    <div style={{ display: "grid", gap: 8, width, maxWidth: "100%" }}>
      {(["compact", "standard"] as const).map((footprint) => <StoryCalendar key={footprint} calendar={calendar} footprint={footprint} />)}
    </div>
  ),
};

/** Every example as a 64 px row, stacked as a phone's column would be. */
export const Compact: Story = {
  args: { footprint: "compact" },
  parameters: { layout: "padded", controls: { include: ["width"] } },
  render: ({ width }) => (
    <div style={{ display: "grid", gap: 8, width, maxWidth: "100%" }}>
      {SEEDS.map((name) => <StoryCalendar key={name} calendar={name} footprint="compact" />)}
    </div>
  ),
};

/** The detail panel: the screen, today's events, what's coming, today's hours busy, and how far it looks. */
export const Details: Story = { args: { defaultOpen: true } };

/** A long day: six all-day events, the half term running on to Friday, nothing timed. */
export const DetailsAllDay: Story = { name: "Details, all day", args: { calendar: "manyAllDay", defaultOpen: true } };

/** Three calendars over a month: each event names its calendar, long titles wrap. */
export const DetailsLong: Story = { name: "Details, long", args: { calendar: "long", defaultOpen: true } };

/** The panel on a 12-hour clock: every time in it with its period. */
export const DetailsTwelveHourClock: Story = { name: "Details, 12-hour clock", decorators: [(Story) => <HourCycleProvider hourCycle="h12"><Story /></HourCycleProvider>],
  render: ({ calendar, width, footprint }) => <DemoCalendar seed={onHourCycle(CALENDAR_SEEDS[calendar], "h12")} width={width} footprint={footprint} defaultOpen />,
};

/** Unavailable: blank segments, and no events. */
export const DetailsUnavailable: Story = { name: "Details, unavailable", args: { calendar: "unavailable", defaultOpen: true } };

/** On a phone the panel is a bottom sheet: drag its header down to close. */
export const DetailsPhone: Story = {
  name: "Details, phone",
  args: { defaultOpen: true },
  parameters: { viewport: { defaultViewport: "mobile2" } },
};
