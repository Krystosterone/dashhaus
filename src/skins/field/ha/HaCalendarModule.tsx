import { useHaCalendar } from "@dashhaus/core";
import type { HaCalendarOptions } from "@dashhaus/core";
import { CalendarModule } from "../cards/calendar/CalendarModule";
import type { CalendarModuleProps } from "../cards/calendar/CalendarModule";

export interface HaCalendarModuleProps extends HaCalendarOptions, Pick<CalendarModuleProps, "footprint" | "defaultOpen"> {
  entityId: string;
}

/** A live calendar module: the useHaCalendar hook, with its events and any calendars read beside it, above field's module. It sends no services. */
export function HaCalendarModule({ entityId, footprint, defaultOpen, ...options }: HaCalendarModuleProps) {
  const { entity, history } = useHaCalendar(entityId, options);
  return (
    <CalendarModule
      entity={entity}
      history={history}
      footprint={footprint}
      defaultOpen={defaultOpen}
    />
  );
}
