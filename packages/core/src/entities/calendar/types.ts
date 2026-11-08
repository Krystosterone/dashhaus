import type { HourSample } from "../history";

/** One event on a calendar, as Home Assistant's `calendar.get_events` answers it, normalized. */
export interface CalendarEvent {
  /** Its summary: "Dentist". An event with none is "Busy", as a shared calendar shows it. */
  title: string;
  /** When it starts, in ms since the epoch. An all-day event starts at local midnight of its first day. */
  start: number;
  /** When it ends, in ms since the epoch, exclusive. An all-day event ends at local midnight after its last day. */
  end: number;
  /** A whole day or days, with no time of its own (a birthday, bin day). */
  allDay: boolean;
  location?: string;
  /** The calendar it is on, by name, when the card reads more than one: "School". */
  calendar?: string;
}

/**
 * Mirrors one Home Assistant `calendar.*` entity, composed with its events from today's start to its horizon, and
 * those of any other calendars it reads beside it, merged. A reading: it has no actions.
 */
export interface CalendarEntity {
  /** The primary calendar. */
  entityId: string;
  name: string;
  /** Its area: the `area` option, else the one Home Assistant's registries resolve; none when neither has one. */
  area?: string;
  /** "unavailable" while the primary calendar can't be reached; "ok" otherwise, even before its events are read. */
  state: "ok" | "unavailable";
  /**
   * Every event from today's local midnight to the end of the horizon, on every calendar it reads, by start; ones
   * already over today are kept, so the details can show the whole day. Omitted until the first read settles and the
   * entity names no event of its own.
   */
  events?: CalendarEvent[];
  /**
   * The minute the card counts from, in ms since the epoch: the hook's minute clock, or a seed's fixed 11:54. "In
   * 25m", "Now" and today's events are all counted from it, so a card draws the same whenever it is drawn.
   */
  now: number;
  /** How many days it looks ahead, today included (the `days` option, default 7). */
  days: number;
  /** How many calendars it reads, itself included (1 plus the `calendars` option's). */
  calendars: number;
  /** When its events were last read ("11:54"). */
  lastUpdated?: string;
  /** While it is unavailable, when it was last reachable. */
  lastSeen?: string;
}

/** Today's plan, by hour: how busy each hour is with timed events, the hours ahead included. */
export interface CalendarHistory {
  /** Per hour, 0 to 1: the share of it taken by timed events (all-day events take none). */
  samples: HourSample[];
  currentHour: number;
  /** Minutes taken by timed events today, the whole day: those over, under way and still to come. */
  busyMinutes: number;
}
