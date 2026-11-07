import type { CalendarEntity, CalendarEvent, CalendarHistory } from "@dashhaus/core/entities/calendar/types";
import { calendarAgenda } from "@dashhaus/core/entities/calendar/agenda";
import { CALENDAR_WORDS, eventCue, eventDay, eventDetail, eventSpan, eventWhen, freeFor, horizonFact, isOver, isUnderWay, leftToday } from "@dashhaus/core/entities/calendar/words";
import { lastSeenFact, updatedFact } from "@dashhaus/core/entities/facts";
import { todaySummary } from "@dashhaus/core/entities/today";
import { CalendarIcon } from "./icons";
import { CardFrame, Readout, SheetBlock, Today, detailsSheet, paint, useCard } from "../../shared/ui";
import type { CardProps, SheetProps } from "../../shared/ui";
import "./CalendarCard.css";

export interface CalendarCardProps extends CardProps {
  entity: CalendarEntity;
  /** Today's plan by hour, on the featured footprint and in the sheet. */
  history?: CalendarHistory;
  /** Card only: the name and the reading open the details sheet. */
  onOpenDetails?: () => void;
}

/** How many of the events after today the sheet lists. */
const LATER = 5;

/** One event in the sheet's lists: when, then what, where and on which calendar; an event over is in the third ink. */
function EventRow({ event, now, when }: { event: CalendarEvent; now: number; when: string }) {
  const under = isUnderWay(event, now);
  const detail = eventDetail(event);
  return (
    <li className="ca-ev" data-when={under ? "now" : isOver(event, now) ? "over" : "ahead"}>
      <span className="ca-ev-t">{when}</span>
      <span className="ca-ev-n">
        <span className="ca-ev-title">{under && !event.allDay && <span className="ca-ev-now">{CALENDAR_WORDS.now} </span>}{event.title}</span>
        {detail && <span className="ca-ev-d">{detail}</span>}
      </span>
    </li>
  );
}

/**
 * One calendar (`calendar.*`), composed with its events to its horizon and those of any calendars read beside it: a
 * reading. Neutral, a bare calendar icon in place of an orb, and no glow; it has no actions and no warnings. The
 * readout leads with the next event, its title as the figure and when it is beside it under its caption (In 2h 6m,
 * Until 12:15, Tomorrow 09:30), a timed event before the day's all-day ones; with nothing to the horizon it says Free,
 * and for how long. The status line counts what is left today. A compact row names the event and cues when (Now, In
 * 25m). The name or the reading opens the sheet: today's events, what's coming after, and today's plan by hour.
 */
export function CalendarCard({ entity: e, history, variant, footprint, showControl, onOpenDetails, onClose }: CalendarCardProps) {
  const card = useCard("ca", { variant, footprint, showControl, area: e.area });
  const { sheet, compact, area } = card;
  const unav = e.state === "unavailable";
  const colors = paint("reading", 0);
  const agenda = calendarAgenda(e.events, e.now);
  const next = unav ? undefined : agenda.next;
  const waiting = !unav && e.events === undefined;
  const free = freeFor(e.days);

  const title = next?.title ?? (waiting ? CALENDAR_WORDS.waiting : CALENDAR_WORDS.free);
  const when = next ? eventWhen(next, e.now) : waiting ? undefined : free;
  const cue = unav ? "Unavailable" : next ? eventCue(next, e.now) : waiting ? CALENDAR_WORDS.waiting : free.line;
  const spoken = next ? `${next.title}, ${when!.line}` : waiting ? "Waiting for events" : free.line;
  const left = waiting ? undefined : leftToday(agenda.left.length, agenda.today.length);

  // A row names the event and cues when; a card counts what's left today, its readout already naming the event. A row
  // with no event says what's left today beside its Free, and waits beside its Waiting with its area alone.
  const status = unav ? "Unavailable"
    : compact ? (next ? next.title : left ?? area)
    : sheet ? [area, left].filter(Boolean).join(" · ") || undefined
    : left ?? area;
  const state = unav ? "unavailable" : !next ? "off" : isUnderWay(next, e.now) ? "on" : "ok";

  const bar = (
    <span className="hd-bar ca-bar">
      {waiting ? <span className="hd-none">{CALENDAR_WORDS.waiting}</span> : (
        <>
          <span className="hd-metric ca-f">{title}</span>
          {when && (
            <span className="hd-metric hd-metric--sub ca-when">
              <span className="hd-label">{when.label}</span>
              <span className="ca-t">{when.value}</span>
            </span>
          )}
          <span className="ca-cue">{cue}</span>
        </>
      )}
    </span>
  );

  return (
    <CardFrame
      card={card}
      name={e.name}
      attrs={{ "data-state": state, ...colors }}
      glyph={<CalendarIcon now={next != null && isUnderWay(next, e.now) && !next.allDay} />}
      unavailable={unav}
      lastSeen={e.lastSeen}
      onOpen={onOpenDetails}
      status={status}
      value={next ? `${next.title} · ${cue}` : cue}
      bareValue={cue}
      onClose={onClose}
      control={sheet || !onOpenDetails ? <Readout label={spoken}>{bar}</Readout>
        : <Readout label={`${e.name}: ${spoken}`} onOpen={onOpenDetails}>{bar}</Readout>}
      facts={{ start: unav ? lastSeenFact(e.lastSeen) : updatedFact(e.lastUpdated), end: horizonFact(e.days, e.calendars) }}
    >
      <SheetBlock>
        {!unav && agenda.today.length > 0 && (
          <section className="hd-blk" aria-labelledby={`${card.nameId}-today`}>
            <h3 className="hd-blk-h" id={`${card.nameId}-today`}>Events today</h3>
            <ol className="ca-list">{agenda.today.map((event, i) => <EventRow key={i} event={event} now={e.now} when={eventSpan(event, e.now)} />)}</ol>
          </section>
        )}
        {!unav && agenda.later.length > 0 && (
          <section className="hd-blk" aria-labelledby={`${card.nameId}-later`}>
            <h3 className="hd-blk-h" id={`${card.nameId}-later`}>Coming up</h3>
            <ol className="ca-list">{agenda.later.slice(0, LATER).map((event, i) => <EventRow key={i} event={event} now={e.now} when={eventDay(event, e.now)} />)}</ol>
          </section>
        )}
      </SheetBlock>
      {history && (
        <Today
          samples={history.samples}
          currentHour={history.currentHour}
          forecastFrom={history.currentHour + 1}
          summary={todaySummary(CALENDAR_WORDS.busy, history.busyMinutes)}
        />
      )}
    </CardFrame>
  );
}

export type CalendarSheetProps = SheetProps<CalendarCardProps>;

export const CalendarSheet = detailsSheet(CalendarCard);
