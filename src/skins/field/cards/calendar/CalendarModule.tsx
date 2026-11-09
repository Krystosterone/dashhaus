import type { ReactNode } from "react";
import type { CalendarEntity, CalendarEvent, CalendarHistory } from "@dashhaus/core/entities/calendar/types";
import { useHourCycle } from "@dashhaus/core/hooks";
import { clockOf } from "@dashhaus/core/entities/clock";
import type { HourCycle } from "@dashhaus/core/entities/clock";
import { calendarAgenda } from "@dashhaus/core/entities/calendar/agenda";
import { CALENDAR_WORDS, clockFigure, dayWord, daysBetween, eventDay, eventDetail, eventSpan, eventWhen, freeFor, horizonFact, isActive, isOver, isUnderWay, leftToday } from "@dashhaus/core/entities/calendar/words";
import { lastSeenFact, updatedFact } from "@dashhaus/core/entities/facts";
import { todaySummary } from "@dashhaus/core/entities/today";
import { Blank, Digits, Glyph, Legend, ModuleFrame, ModuleRow, Pictogram, Today, useDetails } from "../../shared/ui";
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
 * every footprint: NOW while one is under way, the clock it starts at in its fixed places (14:00, a clock's four
 * digits; on 12 hours 2:00, its first place an unlit segment, the period said on the meta line), or the weekday of an
 * all-day event to come (THU). The meta lines say the rest in the core's words.
 */
function figureOf(event: CalendarEvent, now: number, hourCycle: HourCycle): ReactNode {
  if (isUnderWay(event, now)) return CALENDAR_WORDS.now.toUpperCase();
  if (!event.allDay) return <Digits text={clockFigure(event.start, hourCycle).time} places={5} />;
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
 * screen says FREE in the dim ink. A row's line names the event, then its day when it isn't today's (on 12 hours,
 * when first and then the event), and with none what's left today. It has no actions
 * and no warnings. The panel lists today's events and what's coming.
 */
export function CalendarModule({ entity: e, history, footprint = "standard", defaultOpen = false }: CalendarModuleProps) {
  const details = useDetails(defaultOpen);
  const unav = e.state === "unavailable";
  const agenda = calendarAgenda(e.events, e.now);
  const next = unav ? undefined : agenda.next;
  const waiting = !unav && e.events === undefined;
  const free = freeFor(e.days);
  // Its active set, the one every skin's signal follows: an event under way, timed or all-day.
  const under = isActive(next, e.now);
  const hourCycle = useHourCycle();
  const when = next ? eventWhen(next, e.now, hourCycle) : undefined;
  const left = waiting || unav ? undefined : leftToday(agenda.left.length, agenda.today.length);
  const state = unav ? "unavailable" : !next ? "off" : under ? "on" : "ok";

  const pict = <Pictogram param="neutral" lit={under}>{CALENDAR_PICT}</Pictogram>;
  const read: ReactNode = unav ? <Blank places={4} label="Unavailable" />
    : waiting ? <Blank places={4} label={CALENDAR_WORDS.noReading} />
    : next ? <><span aria-hidden="true">{figureOf(next, e.now, hourCycle)}</span><span className="fd-sr">{`${next.title}, ${when!.line}`}</span></>
    : <><span aria-hidden="true">{CALENDAR_WORDS.free.toUpperCase()}</span><span className="fd-sr">{free.line}</span></>;
  // A timed event on another day: on 24 hours the figure already says its clock, so the words say its day alone; on
  // 12 the screen's four places can't hold the period, so the words say the day and the time whole (Tomorrow 2:00 PM).
  // Today's countdown (In 2h 6m) already places its clock, on either cycle.
  const otherDay = next != null && !under && !next.allDay && daysBetween(e.now, next.start) > 0
    ? (hourCycle === "h12" ? when!.line : dayWord(next.start, e.now))
    : undefined;
  const meta: [ReactNode, ReactNode?] = unav ? ["Unavailable", e.lastSeen ? lastSeenFact(e.lastSeen) : undefined]
    : waiting ? [CALENDAR_WORDS.noReading]
    : next ? [next.title, otherDay ?? when!.line]
    : [free.line, left];
  // A row has no meta lines: its line names the event, then its day when its clock is another day's; with no event it
  // says what's left today, as orb's row does, the screen's FREE already saying for how long. On 12 hours a timed
  // event's line says when first, then the event: the screen's 9:30 can't hold its period. Another day's leads with its
  // clock, then its day (9:30 AM Tomorrow · School trip), so a narrow row's clip cuts the day and the title and the
  // period stays where a glance reaches; today's countdown (In 2h 6m · Dentist) already places it.
  const timed12 = hourCycle === "h12" && next != null && !under && !next.allDay;
  const rowWhen = timed12 && otherDay ? `${clockOf(new Date(next.start), hourCycle)} ${dayWord(next.start, e.now)}` : otherDay ?? when?.line;
  const line = unav || waiting ? undefined
    : next ? (timed12 ? `${rowWhen} · ${next.title}` : otherDay ? `${next.title} · ${otherDay}` : next.title)
    : left;

  const glyph = <Glyph unavailable={unav}><IconCalendar /></Glyph>;
  const summary = history && (unav ? "Unavailable" : todaySummary(CALENDAR_WORDS.busy, history.busyMinutes));
  const label = CALENDAR_WORDS.busySaid;

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
          <Today summary={summary} label={label} tone="neutral" samples={history?.samples} currentHour={history?.currentHour} aheadFrom={history && history.currentHour + 1} />
        </ModuleRow>
      )}
      facts={{ start: unav ? lastSeenFact(e.lastSeen) : updatedFact(e.lastUpdated), end: horizonFact(e.days, e.calendars) }}
    >
      {!unav && agenda.today.length > 0 && (
        <div className="fd-block">
          <Legend value={left}>{CALENDAR_WORDS.eventsToday}</Legend>
          <ol className="fd-ca-list">{agenda.today.map((event, i) => <EventRow key={i} event={event} now={e.now} when={eventSpan(event, e.now, hourCycle)} />)}</ol>
        </div>
      )}
      {!unav && agenda.later.length > 0 && (
        <div className="fd-block">
          <Legend>{CALENDAR_WORDS.comingUp}</Legend>
          <ol className="fd-ca-list">{agenda.later.slice(0, LATER).map((event, i) => <EventRow key={i} event={event} now={e.now} when={eventDay(event, e.now, hourCycle)} />)}</ol>
        </div>
      )}
      {history && <Today summary={summary} label={label} tone="neutral" samples={history.samples} currentHour={history.currentHour} aheadFrom={history.currentHour + 1} />}
    </ModuleFrame>
  );
}
