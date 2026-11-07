import { useHaCalendar } from "@dashhaus/core";
import type { HaCalendarOptions } from "@dashhaus/core";
import { CalendarTile } from "../cards/calendar/CalendarTile";
import type { CalendarTileProps } from "../cards/calendar/CalendarTile";

export interface HaCalendarTileProps extends HaCalendarOptions, Omit<CalendarTileProps, "entity" | "history"> {
  /** The Home Assistant entity id. */
  entityId: string;
}

/**
 * A live, read-only calendar tile: the useHaCalendar hook, with its events and any calendars read beside it, above
 * the presentational tile. It sends no services.
 */
export function HaCalendarTile({ entityId, calendarEntityIds, days, name, area, lastSeen, events, loadEvents, onEventsError, loadHistory, ...props }: HaCalendarTileProps) {
  const live = useHaCalendar(entityId, { calendarEntityIds, days, name, area, lastSeen, events, loadEvents, onEventsError, loadHistory });
  return <CalendarTile {...props} entity={live.entity} history={live.history} />;
}
