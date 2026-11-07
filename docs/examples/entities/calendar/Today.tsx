import { useHaCalendar } from "@dashhaus/core";
import { calendarAgenda } from "@dashhaus/core/entities/calendar/agenda";
import { eventSpan, isOver, leftToday } from "@dashhaus/core/entities/calendar/words";

/** Today's events, all-day first, those already over struck through, and how many are left. */
export function Today() {
  const { entity } = useHaCalendar("calendar.family", { days: 1 });
  const { today, left } = calendarAgenda(entity.events, entity.now);
  return (
    <section>
      <h2>Today · {leftToday(left.length, today.length)}</h2>
      <ol>
        {today.map((event) => (
          <li key={`${event.start}-${event.title}`} style={{ textDecoration: isOver(event, entity.now) ? "line-through" : undefined }}>
            {eventSpan(event, entity.now)} {event.title}
          </li>
        ))}
      </ol>
    </section>
  );
}
