import { useHaCalendar } from "@dashhaus/core";
import { useHourCycle } from "@dashhaus/core/hooks";
import { calendarAgenda } from "@dashhaus/core/entities/calendar/agenda";
import { eventWhen, freeFor } from "@dashhaus/core/entities/calendar/words";

/** The family's next event and when it is, with the school's calendar read beside it, on the page's clock. */
export function WhatsNext() {
  const { entity } = useHaCalendar("calendar.family", { calendarEntityIds: ["calendar.school"] });
  const hourCycle = useHourCycle();
  if (entity.state === "unavailable") return <p>{entity.name} is unavailable</p>;
  if (!entity.events) return <p>Reading {entity.name}…</p>;
  const { next } = calendarAgenda(entity.events, entity.now);
  if (!next) return <p>{freeFor(entity.days).line}</p>;
  return <p>{next.title}: {eventWhen(next, entity.now, hourCycle).line}</p>;
}
