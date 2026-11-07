import { useEffect, useMemo, useRef } from "react";
import { useHaEntities, useHaEntity } from "../provider";
import { CALENDAR_DAYS, calendarEventsFromHass, calendarFromHass } from "../mappers/calendar";
import { useHaArea } from "../registry";
import { useHaRequest } from "../useHaRequest";
import { checkEntityId } from "../dev";
import { stringValue } from "../util";
import { useNow } from "../../hooks/useNow";
import type { HaStore } from "../types";
import { calendarDay } from "../../entities/calendar/agenda";
import { dayAfter, dayStart } from "../../entities/calendar/words";
import type { CalendarEntity, CalendarEvent, CalendarHistory } from "../../entities/calendar/types";

export interface HaCalendarOptions {
  /** More `calendar.*` entities read beside it, their events merged into its own and named by their calendar. */
  calendarEntityIds?: readonly string[];
  /** How many days to look ahead, today included. Default 7. */
  days?: number;
  /** Overrides Home Assistant's friendly name. */
  name?: string;
  /** Overrides the area Home Assistant's registries resolve. */
  area?: string;
  /** Overrides when the entity was last reachable, shown while it is unavailable. */
  lastSeen?: string;
  /** Host-owned events override (every calendar's, merged); when omitted, they are read with `calendar.get_events`. */
  events?: readonly CalendarEvent[];
  /** Set false when the events are supplied by another application-owned query: the entity's own event stands in. */
  loadEvents?: boolean;
  onEventsError?: (error: unknown) => void;
  /** Set false to leave out today's plan by hour (YAML `history: false`): `history` is then undefined. */
  loadHistory?: boolean;
}

export interface HaCalendarResult {
  entity: CalendarEntity;
  /** Today's plan by hour, from the events: no recorder read. Undefined with `loadHistory: false`. */
  history: CalendarHistory | undefined;
}

/**
 * Every calendar's events from today's local midnight to the horizon's end: one `calendar.get_events` call per
 * calendar, so a transport routes each by its one target. The primary's failure fails the read; another calendar's
 * leaves its events out.
 */
const fetchEvents = (store: HaStore, entityIds: readonly string[], from: number, to: number) => Promise.all(entityIds.map((id, i) => {
  const read = store.query("calendar", "get_events", {
    start_date_time: new Date(from).toISOString(),
    end_date_time: new Date(to).toISOString(),
  }, {
    target: { entity_id: id },
    returnResponse: true,
  });
  return i === 0 ? read : read.catch(() => undefined);
}));

/**
 * One live, read-only calendar for any UI: the mapped entity composed with its events, and those of any other
 * calendars read beside it, from today's start to the horizon; and today's plan by hour. The events are their own
 * ranged read, `calendar.get_events` through the store's query, as the weather's forecasts are: read again each hour,
 * on a new day, and whenever the calendar itself changes (an event starts or ends), the last events staying up while
 * the next read loads. Today's plan is computed from those events, never read from the recorder; `loadHistory: false`
 * leaves it out. It sends no services.
 */
export function useHaCalendar(entityId: string, {
  calendarEntityIds = [],
  days = CALENDAR_DAYS,
  name,
  area,
  lastSeen,
  events: providedEvents,
  loadEvents = true,
  onEventsError,
  loadHistory = true,
}: HaCalendarOptions = {}): HaCalendarResult {
  checkEntityId(entityId, ["calendar"], "useHaCalendar");
  const raw = useHaEntity(entityId);
  const registryArea = useHaArea(entityId);
  const now = useNow();
  const onErrorRef = useRef(onEventsError);
  onErrorRef.current = onEventsError;

  const ids = useMemo(() => [entityId, ...calendarEntityIds.filter((id) => id !== entityId)], [entityId, calendarEntityIds]);
  const idsKey = ids.join(",");
  const span = Math.max(1, Math.round(days));
  const from = dayStart(now.getTime());
  const to = dayAfter(from, span);
  const hour = Math.floor(now.getTime() / 3_600_000);
  // The minute clock never refetches: the hour, the day and the calendar's own change do.
  const key = loadEvents && providedEvents === undefined && raw ? `calendar:${idsKey}:${span}:${hour}:${raw.last_updated}` : undefined;
  const { value, error } = useHaRequest(key, (store) => fetchEvents(store, ids, from, to), { keepPrevious: true });
  useEffect(() => {
    if (error !== undefined) onErrorRef.current?.(error);
  }, [error]);

  const calendars = useHaEntities(ids);
  const names = ids.map((id, i) => stringValue(calendars[i]?.attributes.friendly_name) ?? id).join("\u0000");
  const read = useMemo(
    () => (value === undefined ? undefined : calendarEventsFromHass(value, ids.map((id, i) => ({ entityId: id, name: names.split("\u0000")[i] })))),
    // `ids` is keyed by `idsKey`, and `names` by its joined text, so a new array of the same calendars reads nothing again.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [value, idsKey, names],
  );

  const entity = useMemo(() => calendarFromHass(raw, entityId, {
    name,
    area: area ?? registryArea,
    lastSeen,
    now,
    events: providedEvents ?? read,
    days: span,
    calendars: ids.length,
  }), [raw, entityId, name, area, registryArea, lastSeen, now, providedEvents, read, span, ids.length]);
  const history = useMemo(() => (loadHistory ? calendarDay(entity.events, entity.now) : undefined), [loadHistory, entity.events, entity.now]);
  return { entity, history };
}
