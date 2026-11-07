import type { ReactNode } from "react";
import type { CalendarEntity, CalendarEvent, CalendarHistory } from "@dashhaus/core/entities/calendar/types";
import { calendarAgenda } from "@dashhaus/core/entities/calendar/agenda";
import { CALENDAR_WORDS, clockTime, dayWord, daysBetween, eventDay, eventDetail, eventSpan, eventWhen, freeFor, horizonFact, isOver, isUnderWay, leftToday } from "@dashhaus/core/entities/calendar/words";
import { lastSeenFact, updatedFact } from "@dashhaus/core/entities/facts";
import { todaySummary } from "@dashhaus/core/entities/today";
import { Blank, Glyph, Legend, ModuleFrame, ModuleRow, Pictogram, Today, useDetails } from "../../shared/ui";
import type { FieldFootprint } from "../../shared/ui";
import { CALENDAR_PICT, IconCalendar } from "./icons";
import "./CalendarModule.css";

export interface CalendarModuleProps {
  entity: CalendarEntity;
  footprint?: FieldFootprint;
  /** Today's plan by hour, on the module's meter and in the panel. Omit and its hours stay dark. */
  history?: CalendarHistory;
  /** Open the detail panel on first render (stories). */
  defaultOpen?: boolean;
}

/** How many of the events after today the panel lists. */
const LATER = 5;

/**
 * The screen's figure for the event it leads with, at four places or fewer like a segment display's, the same in
 * every footprint: NOW while one is under way, the clock it starts at (14:00, a clock's four digits), or the weekday
 * of an all-day event to come (THU). The meta lines say the rest in the core's words.
 */
function figureOf(event: CalendarEvent, now: number) {
  if (isUnderWay(event, now)) return CALENDAR_WORDS.now.toUpperCase();
  if (!event.allDay) return clockTime(event.start);
  return new Date(event.start).toLocaleDateString("en-US", { weekday: "short" }).toUpperCase();
}

/** One event in the panel's lists, printed on the plate: when, then what, where and on which calendar. */
function EventRow({ event, now, when }: { event: CalendarEvent; now: number; when: string }) {
  const under = isUnderWay(event, now);
  const detail = eventDetail(event);
  return (
    <li className="fd-ca-ev" data-when={under ? "now" : isOver(event, now) ? "over" : "ahead"}>
      <span className="fd-ca-ev-t">{when}</span>
      <span className="fd-ca-ev-n">
        <span className="fd-ca-ev-title">{under && !event.allDay && <span className="fd-ca-ev-now">{CALENDAR_WORDS.now} </span>}{event.title}</span>
        {detail && <span className="fd-ca-ev-d">{detail}</span>}
      </span>
    </li>
  );
}

/**
 * One calendar, composed with its events to its horizon and those of any calendars read beside it, as a field module:
 * a reading, so nothing on it is pressed but its name. Where a control has its key and fader, it has its glyph on a
 * flat plate and today's meter of the hours busy, those ahead included. The screen leads with the next event, a timed
 * one before the day's all-day ones: NOW while it is under way, lit, else the clock it starts at or an all-day event's
 * weekday; the meta lines its title and when (In 2h 6m, Until 12:15, Tomorrow 09:30). With nothing to the horizon the
 * screen says FREE in the dim ink. A row's line names the event, and its day when it isn't today's. It has no actions
 * and no warnings. The panel lists today's events and what's coming.
 */
export function CalendarModule({ entity: e, history, footprint = "standard", defaultOpen = false }: CalendarModuleProps) {
  const details = useDetails(defaultOpen);
  const unav = e.state === "unavailable";
  const agenda = calendarAgenda(e.events, e.now);
  const next = unav ? undefined : agenda.next;
  const waiting = !unav && e.events === undefined;
  const free = freeFor(e.days);
  const under = next != null && isUnderWay(next, e.now);
  const when = next ? eventWhen(next, e.now) : undefined;
  const left = waiting || unav ? undefined : leftToday(agenda.left.length, agenda.today.length);
  const state = unav ? "unavailable" : !next ? "off" : under ? "on" : "ok";

  const pict = <Pictogram param="neutral" lit={under}>{CALENDAR_PICT}</Pictogram>;
  const read: ReactNode = unav ? <Blank places={4} label="Unavailable" />
    : waiting ? <Blank places={4} label="Waiting for events" />
    : next ? <><span aria-hidden="true">{figureOf(next, e.now)}</span><span className="fd-sr">{`${next.title}, ${when!.line}`}</span></>
    : <><span aria-hidden="true">{CALENDAR_WORDS.free.toUpperCase()}</span><span className="fd-sr">{free.line}</span></>;
  // A timed event on another day: the figure already says its clock, so the words say its day alone.
  const otherDay = next != null && !under && !next.allDay && daysBetween(e.now, next.start) > 0 ? dayWord(next.start, e.now) : undefined;
  const meta: [ReactNode, ReactNode?] = unav ? ["Unavailable", e.lastSeen ? `Seen ${e.lastSeen}` : undefined]
    : waiting ? [CALENDAR_WORDS.waiting]
    : next ? [next.title, otherDay ?? when!.line]
    : [free.line, left];
  // A row has no meta lines: its line names the event, after its day when its clock is another day's.
  const line = unav || waiting ? undefined
    : next ? (otherDay ? `${otherDay} · ${next.title}` : next.title)
    : free.line;

  const glyph = <Glyph unavailable={unav}><IconCalendar /></Glyph>;
  const summary = history && (unav ? "Unavailable" : todaySummary(CALENDAR_WORDS.busy, history.busyMinutes));
  const label = "Hours busy by hour today, those ahead included.";

  return (
    <ModuleFrame
      kind="fd-ca"
      name={e.name}
      area={e.area}
      footprint={footprint}
      state={state}
      details={details}
      pict={pict}
      read={read}
      meta={meta}
      line={line}
      lead={glyph}
      row={(
        <ModuleRow className="fd-ca-row">
          {glyph}
          <Today summary={summary} label={label} tone="neutral" samples={history?.samples} currentHour={history?.currentHour} />
        </ModuleRow>
      )}
      facts={{ start: unav ? lastSeenFact(e.lastSeen) : updatedFact(e.lastUpdated), end: horizonFact(e.days, e.calendars) }}
    >
      {!unav && agenda.today.length > 0 && (
        <div className="fd-block">
          <Legend value={left}>Events today</Legend>
          <ol className="fd-ca-list">{agenda.today.map((event, i) => <EventRow key={i} event={event} now={e.now} when={eventSpan(event, e.now)} />)}</ol>
        </div>
      )}
      {!unav && agenda.later.length > 0 && (
        <div className="fd-block">
          <Legend>Coming up</Legend>
          <ol className="fd-ca-list">{agenda.later.slice(0, LATER).map((event, i) => <EventRow key={i} event={event} now={e.now} when={eventDay(event, e.now)} />)}</ol>
        </div>
      )}
      {history && <Today summary={summary} label={label} tone="neutral" samples={history.samples} currentHour={history.currentHour} />}
    </ModuleFrame>
  );
}
