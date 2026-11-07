import type { HourSample } from "../history";
import type { CalendarEvent, CalendarHistory } from "./types";
import { dayAfter, dayStart, daysBetween, isOver } from "./words";

/** A calendar's events from `now`, as a card shows them: the one it leads with, today's, and what's coming after. */
export interface CalendarAgenda {
  /**
   * The event the card leads with: one under way, else the next to start. Within a day a timed event comes before an
   * all-day one, so bin day never hides the dentist at 14:00; an all-day event leads only when the day has nothing
   * timed left. None when nothing is left to the horizon.
   */
  next?: CalendarEvent;
  /** Every event on today, those already over included: all-day ones first, then by start. */
  today: CalendarEvent[];
  /** Today's events not yet over, `next` among them when it is today's. */
  left: CalendarEvent[];
  /** Events starting after today, by start. */
  later: CalendarEvent[];
}

const byStart = (a: CalendarEvent, b: CalendarEvent) => a.start - b.start || a.end - b.end || a.title.localeCompare(b.title);

/** The day an event counts on, from `now`: today for one under way or still to come today, else the day it starts. */
const countsOn = (event: CalendarEvent, now: number) => Math.max(0, daysBetween(now, Math.max(event.start, now)));

/** Read a calendar's events (`CalendarEntity.events`) against `now`. */
export function calendarAgenda(events: readonly CalendarEvent[] = [], now: number): CalendarAgenda {
  const todayStart = dayStart(now);
  const tomorrow = dayAfter(now);
  const today = events
    .filter((event) => event.start < tomorrow && event.end > todayStart)
    .sort((a, b) => Number(b.allDay) - Number(a.allDay) || byStart(a, b));
  const left = today.filter((event) => !isOver(event, now));
  const later = events.filter((event) => event.start >= tomorrow).sort(byStart);
  const next = events
    .filter((event) => !isOver(event, now))
    .sort((a, b) => countsOn(a, now) - countsOn(b, now) || Number(a.allDay) - Number(b.allDay) || byStart(a, b))[0];
  return { next, today, left, later };
}

/**
 * Today's plan by hour, as the Today strip draws it: the share of each hour taken by timed events (overlaps counted
 * once), the hours ahead included, since a calendar knows them. All-day events take no hours.
 */
export function calendarDay(events: readonly CalendarEvent[] = [], now: number): CalendarHistory {
  const start = dayStart(now);
  const timed = events.filter((event) => !event.allDay);
  const samples: HourSample[] = [];
  let busy = 0;
  for (let hour = 0; hour < 24; hour++) {
    // Local hours, so a DST day's hours are still 0 to 23 on the strip.
    const from = new Date(start).setHours(hour);
    const to = new Date(start).setHours(hour + 1);
    const spans = timed
      .map((event) => [Math.max(from, event.start), Math.min(to, event.end)] as const)
      .filter(([a, b]) => b > a)
      .sort((a, b) => a[0] - b[0]);
    let taken = 0;
    let reach = from;
    for (const [a, b] of spans) {
      const lo = Math.max(a, reach);
      if (b > lo) { taken += b - lo; reach = b; }
    }
    busy += taken;
    samples.push(to > from ? Math.min(1, taken / (to - from)) : 0);
  }
  return { samples, currentHour: new Date(now).getHours(), busyMinutes: Math.round(busy / 60_000) };
}
