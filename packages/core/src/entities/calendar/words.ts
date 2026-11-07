import { fmtDuration } from "../format";
import type { CalendarEvent } from "./types";

/**
 * What a calendar card says, the same on every card and in every skin. Times are on the 24-hour clock, as the
 * weather's hours are ("14:00"); days are English, as the rest of the card's words are ("Tomorrow", "Thu", "Oct 26").
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
  /** The events haven't been read yet. */
  waiting: "Waiting…",
  /** An event with no summary, as a shared calendar shows someone else's. */
  untitled: "Busy",
  /** The state `todaySummary` takes for the day's plan: "Busy 3h 30m", "Not busy today". */
  busy: "busy",
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

/** A time on the 24-hour clock: "09:30", "14:00". */
export const clockTime = (ms: number) => {
  const d = new Date(ms);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
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

export function eventWhen(event: CalendarEvent, now: number): EventWhen {
  if (isUnderWay(event, now)) {
    if (event.allDay) {
      const last = lastDay(event);
      if (daysBetween(now, last) <= 0) return { label: CALENDAR_WORDS.today, value: CALENDAR_WORDS.allDay, line: CALENDAR_WORDS.allDay };
      const until = dayWord(last, now);
      return { label: "Until", value: until, line: `Until ${until}` };
    }
    const until = daysBetween(now, event.end) === 0 ? clockTime(event.end) : `${dayWord(event.end, now)} ${clockTime(event.end)}`;
    return { label: "Until", value: until, line: `Until ${until}` };
  }
  const day = dayWord(event.start, now);
  if (event.allDay) return { label: day, value: CALENDAR_WORDS.allDay, line: day };
  if (daysBetween(now, event.start) === 0) {
    const value = fmtDuration(Math.max(1, minutesUntil(event, now)));
    return { label: "In", value, line: countdown(minutesUntil(event, now)) };
  }
  return { label: day, value: clockTime(event.start), line: `${day} ${clockTime(event.start)}` };
}

/**
 * A compact row's one cue for its event: "Now" while a timed event is under way (the row's line already names it),
 * else `eventWhen`'s line ("In 2h 10m", "All day", "Tomorrow 09:30").
 */
export const eventCue = (event: CalendarEvent, now: number) =>
  isUnderWay(event, now) && !event.allDay ? CALENDAR_WORDS.now : eventWhen(event, now).line;

/**
 * An event's span, for a list of the day's events: "09:30–10:30", "22:00–Tue 01:00" across midnight; an all-day
 * event "All day", or "Until Wed" when it runs on.
 */
export function eventSpan(event: CalendarEvent, now: number) {
  if (event.allDay) {
    const last = lastDay(event);
    return daysBetween(now, last) <= 0 || daysBetween(event.start, last) === 0 ? CALENDAR_WORDS.allDay : `Until ${dayWord(last, now)}`;
  }
  const sameDay = daysBetween(event.start, event.end - 1) === 0;
  const endDay = new Date(event.end).toLocaleDateString("en-US", { weekday: "short" });
  return `${clockTime(event.start)}–${sameDay ? "" : `${endDay} `}${clockTime(event.end)}`;
}

/** When a later event starts, for the list of what's coming: "Tomorrow 09:30", "Thu", "Oct 26 18:00". */
export const eventDay = (event: CalendarEvent, now: number) =>
  event.allDay ? dayWord(event.start, now) : `${dayWord(event.start, now)} ${clockTime(event.start)}`;

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
