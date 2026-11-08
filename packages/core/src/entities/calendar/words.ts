import { clockParts, hourCycleOf, timeOfDay } from "../clock";
import type { HourCycle } from "../clock";
import { fmtDuration } from "../format";
import type { CalendarEvent } from "./types";

/**
 * What a calendar card says, the same on every card and in every skin. Times are on the dashboard's hour cycle, as
 * the weather's hours are ("14:00", or "2:00 PM"; each function's `hourCycle`, the card's `useHourCycle`, the browser
 * locale's when left out); days are English, as the rest of the card's words are ("Tomorrow", "Thu", "Oct 26").
 * Every word here is counted from the card's `now` (the entity's minute clock), never from a timer of its own.
 */
export const CALENDAR_WORDS = {
  /** An event under way. */
  now: "Now",
  allDay: "All day",
  today: "Today",
  tomorrow: "Tomorrow",
  /** Nothing on any calendar from now to the horizon. */
  free: "Free",
  /** The events haven't been read yet: the readout's and a compact row's cue. */
  waiting: "Waiting…",
  /** The events haven't been read yet: the status line, a screen's words and what a screen reader hears, as every reading says it. */
  noReading: "No reading yet",
  /** An event with no summary, as a shared calendar shows someone else's. */
  untitled: "Busy",
  /** The state `todaySummary` takes for the day's plan: "Busy 3h 30m", "Not busy today". */
  busy: "busy",
  /** Today's plan said aloud, a meter whose hours ahead are known. */
  busySaid: "Hours busy by hour today, those ahead included.",
  /** The details' lists: today's events, then the next after today. */
  eventsToday: "Events today",
  comingUp: "Coming up",
} as const;

const DAY = 86_400_000;

/** Local midnight of the day `ms` falls on. */
export const dayStart = (ms: number) => {
  const d = new Date(ms);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
};

/** Local midnight `days` days after the day `ms` falls on, counted by the calendar, so a DST day is 23 or 25 hours. */
export const dayAfter = (ms: number, days = 1) => {
  const d = new Date(ms);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + days).getTime();
};

/** Whole calendar days from the day `from` falls on to the day `to` falls on. */
export const daysBetween = (from: number, to: number) => Math.round((dayStart(to) - dayStart(from)) / DAY);

/** A time on the dashboard's hour cycle: "09:30", "14:00"; "9:30 AM", "2:00 PM". */
export const clockTime = (ms: number, hourCycle: HourCycle = hourCycleOf()) => {
  const d = new Date(ms);
  return timeOfDay(d.getHours(), d.getMinutes(), hourCycle);
};

/**
 * A time as a segment screen draws it, in its parts: "14:00", or "2:00" and its period ("PM") apart, which the
 * screen's words say since its four places can't (`clockParts`).
 */
export const clockFigure = (ms: number, hourCycle: HourCycle = hourCycleOf()) => {
  const d = new Date(ms);
  return clockParts(d.getHours(), d.getMinutes(), hourCycle);
};

/** The day `ms` falls on, from `now`: "Today", "Tomorrow", "Thu" within the week, then "Oct 26". */
export function dayWord(ms: number, now: number) {
  const days = daysBetween(now, ms);
  if (days === 0) return CALENDAR_WORDS.today;
  if (days === 1) return CALENDAR_WORDS.tomorrow;
  const date = new Date(ms);
  return days > 1 && days < 7
    ? date.toLocaleDateString("en-US", { weekday: "short" })
    : date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/** The last day an all-day event covers (its end is the midnight after it). */
const lastDay = (event: CalendarEvent) => dayAfter(event.end - 1, 0);

export const isUnderWay = (event: CalendarEvent, now: number) => event.start <= now && now < event.end;

/**
 * Its active set (spec/cards.md → One active signal): an event under way, timed or all-day, the one every skin's
 * signal follows (Orb's icon with its day filled, Field's lit pictogram and NOW). With none, or nothing to the horizon,
 * it rests.
 */
export const isActive = (next: CalendarEvent | undefined, now: number) => next != null && isUnderWay(next, now);
export const isOver = (event: CalendarEvent, now: number) => event.end <= now;

/** Minutes until it starts, rounded up, so an event a few seconds off is "In 1m", never "In 0m". */
export const minutesUntil = (event: CalendarEvent, now: number) => Math.max(0, Math.ceil((event.start - now) / 60_000));

/** How long until it starts, for a countdown: "In 25m", "In 2h 10m". */
export const countdown = (minutes: number) => `In ${fmtDuration(Math.max(1, minutes))}`;

/**
 * When an event is, from `now`: a caption over its value, as the card's second figure shows it, and the same as one
 * line. Under way it says until when ("Until" 13:00; an all-day event "Today" All day, or "Until" Wed); still to come
 * today, how long until it starts ("In" 2h 10m); another day, the day over the time ("Tomorrow" 09:30, "Thu" All day).
 */
export interface EventWhen {
  label: string;
  value: string;
  /** One line: "Until 13:00", "All day", "Until Wed", "In 2h 10m", "Tomorrow 09:30", "Thu". */
  line: string;
}

export function eventWhen(event: CalendarEvent, now: number, hourCycle: HourCycle = hourCycleOf()): EventWhen {
  if (isUnderWay(event, now)) {
    if (event.allDay) {
      const last = lastDay(event);
      if (daysBetween(now, last) <= 0) return { label: CALENDAR_WORDS.today, value: CALENDAR_WORDS.allDay, line: CALENDAR_WORDS.allDay };
      const until = dayWord(last, now);
      return { label: "Until", value: until, line: `Until ${until}` };
    }
    const end = clockTime(event.end, hourCycle);
    const until = daysBetween(now, event.end) === 0 ? end : `${dayWord(event.end, now)} ${end}`;
    return { label: "Until", value: until, line: `Until ${until}` };
  }
  const day = dayWord(event.start, now);
  if (event.allDay) return { label: day, value: CALENDAR_WORDS.allDay, line: day };
  if (daysBetween(now, event.start) === 0) {
    const value = fmtDuration(Math.max(1, minutesUntil(event, now)));
    return { label: "In", value, line: countdown(minutesUntil(event, now)) };
  }
  const start = clockTime(event.start, hourCycle);
  return { label: day, value: start, line: `${day} ${start}` };
}

/**
 * A compact row's one cue for its event: "Now" while a timed event is under way (the row's line already names it),
 * else `eventWhen`'s line ("In 2h 10m", "All day", "Tomorrow 09:30").
 */
export const eventCue = (event: CalendarEvent, now: number, hourCycle: HourCycle = hourCycleOf()) =>
  isUnderWay(event, now) && !event.allDay ? CALENDAR_WORDS.now : eventWhen(event, now, hourCycle).line;

/**
 * An event's span, for a list of the day's events: "09:30–10:30", "22:00–Tue 01:00" across midnight; on 12 hours
 * "9:30–10:30 AM", its start's period said only where it differs from its end's ("11:30 AM–12:30 PM"); an all-day
 * event "All day", or "Until Wed" when it runs on.
 */
export function eventSpan(event: CalendarEvent, now: number, hourCycle: HourCycle = hourCycleOf()) {
  if (event.allDay) {
    const last = lastDay(event);
    return daysBetween(now, last) <= 0 || daysBetween(event.start, last) === 0 ? CALENDAR_WORDS.allDay : `Until ${dayWord(last, now)}`;
  }
  const sameDay = daysBetween(event.start, event.end - 1) === 0;
  const endDay = new Date(event.end).toLocaleDateString("en-US", { weekday: "short" });
  const from = clockFigure(event.start, hourCycle);
  const to = clockFigure(event.end, hourCycle);
  const start = sameDay && from.period === to.period ? from.time : clockTime(event.start, hourCycle);
  return `${start}–${sameDay ? "" : `${endDay} `}${clockTime(event.end, hourCycle)}`;
}

/** When a later event starts, for the list of what's coming: "Tomorrow 09:30", "Thu", "Oct 26 18:00". */
export const eventDay = (event: CalendarEvent, now: number, hourCycle: HourCycle = hourCycleOf()) =>
  event.allDay ? dayWord(event.start, now) : `${dayWord(event.start, now)} ${clockTime(event.start, hourCycle)}`;

/** What an event says beside its title: where, and on which calendar: "Main St Dental · School". */
export const eventDetail = (event: CalendarEvent) => [event.location, event.calendar].filter(Boolean).join(" · ") || undefined;

/** Nothing on any calendar to the horizon, as a caption over its value: "For" 7 days, and as one line. */
export function freeFor(days: number): EventWhen {
  const value = days <= 1 ? "today" : `${days} days`;
  return { label: "For", value, line: days <= 1 ? "Free today" : `Free for ${days} days` };
}

/** How many of today's events are left, for the status line: "3 left today", "Nothing more today", "Nothing today". */
export function leftToday(left: number, today: number) {
  if (left > 0) return `${left} left today`;
  return today > 0 ? "Nothing more today" : "Nothing today";
}

/** How far it looks, and how many calendars it reads, for the small print: "Next 7 days", "3 calendars · Next 7 days". */
export function horizonFact(days: number, calendars: number) {
  const ahead = days <= 1 ? "Today only" : `Next ${days} days`;
  return calendars > 1 ? `${calendars} calendars · ${ahead}` : ahead;
}
