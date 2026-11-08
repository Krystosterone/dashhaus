import type { HassEntity } from "../types";
import { formatHaTime, parseHaTime } from "../time";
import { isRecord, stringValue } from "../util";
import type { CalendarEntity, CalendarEvent } from "../../entities/calendar/types";
import { CALENDAR_WORDS, dayAfter, dayStart } from "../../entities/calendar/words";

/** How many days a calendar card looks ahead when the host doesn't say, today included. */
export const CALENDAR_DAYS = 7;

export interface CalendarMapOptions {
  /** The clock the events are counted from and the timestamps formatted against (the tile's minute clock). */
  now?: Date;
  name?: string;
  area?: string;
  /** Explicit last-reachable metadata; `last_changed` is not a last-seen timestamp. */
  lastSeen?: string;
  /**
   * The events read with `calendar.get_events` (`calendarEventsFromHass`), every calendar's. Omitted while unread: the
   * entity's own current or next event stands in, as its attributes name it.
   */
  events?: readonly CalendarEvent[];
  /** How many days it looks ahead, today included. Default 7. */
  days?: number;
  /** How many calendars the events come from, this one included. Default 1. */
  calendars?: number;
}

/** A date alone ("2026-10-19"): an all-day event's day, at local midnight. */
function localDay(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return undefined;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day ? date.getTime() : undefined;
}

/** A time as Home Assistant writes it: ISO with a "T", or the calendar attributes' "2026-10-19 14:00:00". */
const instant = (value: string) => parseHaTime(value.replace(" ", "T"))?.getTime();

/**
 * One event from a raw record: `get_events`' `{ start, end, summary, location }`, or the entity's own attributes
 * (`start_time`, `end_time`, `message`, `all_day`). A date alone is all-day; an event that ends before it starts, or
 * whose times don't parse, is left out rather than guessed.
 */
function eventFromRecord(record: Record<string, unknown>, calendar?: string): CalendarEvent | undefined {
  const startText = stringValue(record.start) ?? stringValue(record.start_time);
  const endText = stringValue(record.end) ?? stringValue(record.end_time);
  if (!startText || !endText) return undefined;
  const dayStartAt = localDay(startText);
  const allDay = dayStartAt != null || record.all_day === true;
  const start = dayStartAt ?? instant(startText);
  let end = localDay(endText) ?? instant(endText);
  if (start == null || end == null) return undefined;
  // An all-day event that names its last day rather than the day after (some integrations do) still covers that day.
  if (allDay && end <= start) end = dayAfter(start);
  if (end <= start) return undefined;
  const title = (stringValue(record.summary) ?? stringValue(record.message))?.trim() || CALENDAR_WORDS.untitled;
  const location = stringValue(record.location)?.trim() || undefined;
  return { title, start, end, allDay, ...(location && { location }), ...(calendar && { calendar }) };
}

/** The events list in a `get_events` response for one calendar, whatever wrapper the transport adds. */
function eventRecords(response: unknown, entityId: string): Record<string, unknown>[] {
  if (Array.isArray(response)) return response.flatMap((one) => eventRecords(one, entityId));
  if (!isRecord(response)) return [];
  const result = isRecord(response.result) ? response.result : undefined;
  const root = (isRecord(result?.response) ? result.response : undefined) ?? (isRecord(response.response) ? response.response : undefined) ?? response;
  const entry = root[entityId];
  const events = isRecord(entry) ? entry.events : undefined;
  return Array.isArray(events) ? events.filter(isRecord) : [];
}

/**
 * Map the response `calendar.get_events` gives for one or more calendars (or a list of responses, one per call) into
 * one list of events, by start. Each
 * calendar is named on its events when there is more than one (`names` beside each id), so a card can say whose.
 */
export function calendarEventsFromHass(response: unknown, calendars: ReadonlyArray<{ entityId: string; name?: string }>): CalendarEvent[] {
  const named = calendars.length > 1;
  return calendars
    .flatMap(({ entityId, name }) => eventRecords(response, entityId).flatMap((record) => eventFromRecord(record, named ? name ?? entityId : undefined) ?? []))
    .sort((a, b) => a.start - b.start || a.end - b.end);
}

/**
 * Map one raw Home Assistant `calendar.*` entity to the card model, with the events read beside it. `unknown`,
 * `unavailable` and a missing entity are unavailable; `on` (an event under way) and `off` are both available, the
 * events saying which. Events are kept from today's local midnight to the horizon's end.
 */
export function calendarFromHass(raw: HassEntity | undefined, entityId: string, options: CalendarMapOptions = {}): CalendarEntity {
  const attributes = raw?.attributes ?? {};
  const state = raw && raw.state !== "unavailable" && raw.state !== "unknown" ? "ok" : "unavailable";
  const now = options.now ?? new Date();
  const days = Math.max(1, Math.round(options.days ?? CALENDAR_DAYS));
  const from = dayStart(now.getTime());
  const to = dayAfter(from, days);
  const own = state === "ok" ? eventFromRecord(attributes) : undefined;
  const read = options.events ?? (own ? [own] : undefined);
  const events = state === "ok" && read ? read.filter((event) => event.end > from && event.start < to) : undefined;

  return {
    entityId,
    name: options.name ?? stringValue(attributes.friendly_name) ?? entityId,
    area: options.area,
    state,
    events,
    now: now.getTime(),
    days,
    calendars: Math.max(1, options.calendars ?? 1),
    lastUpdated: state === "ok" ? formatHaTime(raw?.last_updated, now) : undefined,
    lastSeen: state === "unavailable" ? options.lastSeen : undefined,
  };
}
