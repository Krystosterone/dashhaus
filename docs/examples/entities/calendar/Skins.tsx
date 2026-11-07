import { HaCalendarTile } from "@dashhaus/orb";
import { HaCalendarModule } from "@dashhaus/field";

/** The family's calendar with the school's beside it, looking two weeks ahead. */
export function OrbFamily() {
  return <HaCalendarTile entityId="calendar.family" calendarEntityIds={["calendar.school"]} days={14} />;
}

/** The same as a compact row: the next event's title on the row's line, the clock it starts at on the screen. */
export function FieldFamily() {
  return <HaCalendarModule entityId="calendar.family" footprint="compact" />;
}
