import type { ReactNode } from "react";
import type { SunEntity, SunHistory } from "@dashhaus/core/entities/sun/types";
import { SUN_WORDS, daylightSummary, degrees, isActive, positionFact, scheduleTime, sunAllDay, sunEventName, sunIn, sunNext, sunSaid, sunSchedule, sunTime, sunWhen } from "@dashhaus/core/entities/sun/words";
import { lastSeenFact, updatedFact } from "@dashhaus/core/entities/facts";
import { Blank, Channel, Glyph, Legend, ModuleFrame, ModuleRow, Pictogram, Today, useDetails } from "../../shared/ui";
import type { FieldFootprint } from "../../shared/ui";
import { IconSun, SUN_PICT } from "./icons";
import "./SunModule.css";

export interface SunModuleProps {
  entity: SunEntity;
  footprint?: FieldFootprint;
  /** Today's path, the sun's height by hour, on the module's meter and in the panel. Omit and its hours stay dark. */
  history?: SunHistory;
  /** Open the detail panel on first render (stories). */
  defaultOpen?: boolean;
}

/** The meter said aloud: the sun's height by hour, the hours ahead included, since the day's path is known. */
const SAID = "The sun's height by hour today, the hours ahead included.";

/**
 * The sun as a field module: a reading, so nothing on it is pressed but its name. Where a control has its key and
 * fader, it has its glyph on a flat plate, its arrow the way the sun goes next, and today's meter of the sun's height
 * by hour, the hours ahead dim as the calendar's plan is. The screen is a clock: what comes next, the sunset while the
 * sun is up and the sunrise while it is down (20:30), its pictogram lit while the sun is up; the meta lines name it and
 * count down to it (Sunset, In 4h 35m). With no sunset or sunrise reported, as at the poles, the screen says UP or
 * DOWN. A row's line counts down (Sets in 4h 35m). It has no actions and no warnings. The panel's second channel is
 * the sun's elevation; it lists every time to come.
 */
export function SunModule({ entity: e, history, footprint = "standard", defaultOpen = false }: SunModuleProps) {
  const details = useDetails(defaultOpen);
  const unav = e.state === "unavailable";
  const next = sunNext(e);
  const allDay = sunAllDay(e);
  const waiting = !unav && !next && !allDay;
  const up = isActive(e);
  // Down is no resting state, since a sunrise is to come: "ok", so the figure stays bright (off always rests).
  const state = unav ? "unavailable" : up ? "on" : "ok";

  const pict = <Pictogram param="neutral" lit={up}>{SUN_PICT}</Pictogram>;
  const read: ReactNode = unav ? <Blank places={4} label="Unavailable" />
    : waiting ? <Blank places={4} label={SUN_WORDS.noReading} />
    : next ? <><span aria-hidden="true">{sunTime(next)}</span><span className="fd-sr">{sunSaid(next, e.now)}</span></>
    : <><span aria-hidden="true">{e.up ? "UP" : "DOWN"}</span><span className="fd-sr">{allDay}</span></>;
  const meta: [ReactNode, ReactNode?] = unav ? ["Unavailable", e.lastSeen ? lastSeenFact(e.lastSeen) : undefined]
    : waiting ? [SUN_WORDS.noReading]
    : next ? [sunEventName(next.kind), sunIn(next, e.now)]
    : [allDay];
  // A row has no meta lines: its line counts down, as orb's status line does; up or down all day says so.
  const line = unav || waiting ? undefined : next ? sunWhen(next, e.now) : allDay;

  const glyph = <Glyph unavailable={unav}><IconSun rising={next ? next.kind === "rising" : e.up === false} /></Glyph>;
  const summary = history && (unav ? "Unavailable" : daylightSummary(history));
  const today = (
    <Today
      summary={summary}
      label={SAID}
      tone="neutral"
      samples={history?.samples}
      currentHour={history?.currentHour}
      aheadFrom={history && history.currentHour + 1}
    />
  );
  const aside = !unav && e.elevation !== undefined
    ? <Channel pict={<Pictogram param="neutral" lit={up} level={Math.max(0, e.elevation) / 90}>{SUN_PICT}</Pictogram>} sub={SUN_WORDS.elevation}>{degrees(e.elevation)}</Channel>
    : undefined;
  const schedule = sunSchedule(e);

  return (
    <ModuleFrame
      kind="fd-su"
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
      row={<ModuleRow className="fd-su-row">{glyph}{today}</ModuleRow>}
      aside={aside}
      facts={{ start: unav ? lastSeenFact(e.lastSeen) : updatedFact(e.lastUpdated), end: unav ? undefined : positionFact(e) }}
    >
      {schedule.length > 0 && (
        <div className="fd-block">
          <Legend>{SUN_WORDS.next}</Legend>
          <ol className="fd-su-list">
            {schedule.map((event) => (
              <li key={event.kind} className="fd-su-ev" data-lead={event.kind === next?.kind || undefined}>
                <span className="fd-su-ev-n">{sunEventName(event.kind)}</span>
                <span className="fd-su-ev-t">{scheduleTime(event, e.now)}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
      {history && today}
    </ModuleFrame>
  );
}
