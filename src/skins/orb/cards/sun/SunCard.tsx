import type { SunEntity, SunHistory } from "@dashhaus/core/entities/sun/types";
import { sunPathDrawing } from "@dashhaus/core/entities/sun/drawing";
import { clockTime } from "@dashhaus/core/entities/calendar/words";
import { SUN_WORDS, daylightSummary, degrees, isActive, positionFact, scheduleTime, sunAfter, sunAllDay, sunEventName, sunNext, sunSaid, sunSchedule, sunTime, sunWhen } from "@dashhaus/core/entities/sun/words";
import { lastSeenFact, unavailableSince, updatedFact } from "@dashhaus/core/entities/facts";
import { SunIcon } from "./icons";
import { CardFrame, Readout, SheetBlock, detailsSheet, paint, useCard } from "../../shared/ui";
import type { CardProps, SheetProps, Vars } from "../../shared/ui";
import "./SunCard.css";

export interface SunCardProps extends CardProps {
  entity: SunEntity;
  /** Today's path, on the featured footprint and in the sheet; without it, neither draws one. */
  history?: SunHistory;
  /** Card only: the name and the reading open the details sheet. */
  onOpenDetails?: () => void;
}

const pct = (x: number) => `${(x * 100).toFixed(2)}%`;

/**
 * Today's path, a readout: the day from midnight to midnight on its horizon, the day so far in ink and the rest of it
 * in the third ink, the night a fainter line (never dashed: dashed is unavailable), today's sunrise and sunset ticked
 * and timed under it, and now the accent's stick, the sun a ring on its path. While unavailable the path stays, since
 * it is the place's, but neither now nor the sun is drawn.
 */
function SunPath({ day, unavailable, lastSeen }: { day: SunHistory; unavailable: boolean; lastSeen?: string }) {
  const drawing = sunPathDrawing(day);
  const line = (points: Array<[number, number]>) => points.map(([x, y], i) => `${i ? "L" : "M"}${(x * 240).toFixed(1)} ${(y * 100).toFixed(1)}`).join("");
  const marks = [
    day.riseAt !== undefined && day.rise !== undefined ? { at: day.riseAt, time: clockTime(day.rise), word: SUN_WORDS.sunrise } : undefined,
    day.setAt !== undefined && day.set !== undefined ? { at: day.setAt, time: clockTime(day.set), word: SUN_WORDS.sunset } : undefined,
  ].filter((m) => m !== undefined);
  const said = [
    SUN_WORDS.pathSaid,
    ...marks.map((m) => `${m.word.toLowerCase()} ${m.time}`),
    `highest ${degrees(day.peak)}`,
    unavailable ? undefined : drawing.up ? "up now" : "down now",
  ].filter(Boolean).join(", ");
  return (
    <div className="hd-blk su-path">
      <p className="hd-blk-h"><span>Today</span><span className="hd-blk-v">{unavailable ? unavailableSince(lastSeen) : daylightSummary(day)}</span></p>
      <div className="su-plot" role="img" aria-label={said} data-unavailable={unavailable || undefined}>
        <svg viewBox="0 0 240 100" preserveAspectRatio="none" aria-hidden="true">
          <path className="su-hz" d={`M0 ${(drawing.horizon * 100).toFixed(1)}H240`} />
          {drawing.pieces.map((piece, i) => <path key={i} className="su-line" data-part={unavailable ? "night" : piece.part} d={line(piece.points)} />)}
        </svg>
        {marks.map((m) => (
          <span key={m.word} className="su-mark" style={{ "--x": pct(m.at), "--y": pct(drawing.horizon) } as Vars}>
            <span className="su-mark-t">{m.time}</span>
          </span>
        ))}
        {!unavailable && (
          <>
            <span className="su-now" style={{ "--x": pct(drawing.sun[0]) } as Vars} />
            <span className="su-sun" data-up={drawing.up || undefined} style={{ "--x": pct(drawing.sun[0]), "--y": pct(drawing.sun[1]) } as Vars} />
          </>
        )}
      </div>
    </div>
  );
}

/**
 * The sun (`sun.*`): a reading. Neutral, a bare icon in place of an orb, and no glow; it has no actions and no warnings.
 * The readout leads with what comes next on the 24-hour clock, the sunset while it is up and the sunrise while it is
 * down, and the other beside it under its caption; the status line counts down to it ("Sets in 4h 35m"). Its icon
 * points the way the sun goes next, its disc filled while it is up. The featured card and the sheet draw today's path
 * with the sun on it; the sheet lists every time to come and where the sun is.
 */
export function SunCard({ entity: e, history, variant, footprint, showControl, onOpenDetails, onClose }: SunCardProps) {
  const card = useCard("su", { variant, footprint, showControl, area: e.area });
  const { sheet, compact, area } = card;
  const unav = e.state === "unavailable";
  const colors = paint("reading", 0);
  const next = sunNext(e);
  const after = sunAfter(e);
  const allDay = sunAllDay(e);
  const waiting = !unav && !next && !allDay;
  const active = isActive(e);

  const figure = unav ? "Unavailable" : next ? sunTime(next) : allDay ?? SUN_WORDS.waiting;
  const when = next ? sunWhen(next, e.now) : undefined;
  const spoken = next ? sunSaid(next, e.now) : allDay ?? SUN_WORDS.noReading;
  // The countdown is its own cue, said once; up or down all day is the figure, so the line keeps the area.
  const status = unav ? "Unavailable"
    : waiting ? [area, SUN_WORDS.noReading].filter(Boolean).join(" · ")
    : sheet ? [area, when].filter(Boolean).join(" · ") || undefined
    : when ?? area;
  // Down is no resting state, since a sunrise is to come: "ok", as a calendar's next event to come is.
  const state = unav ? "unavailable" : active ? "on" : "ok";

  const bar = (
    <span className="hd-bar hd-bar--pair su-bar">
      {waiting ? <span className="hd-none">{SUN_WORDS.waiting}</span> : (
        <>
          <span className={`hd-metric ${next ? "hd-metric-n" : "hd-metric-w"} su-f`}>{figure}</span>
          {next && after && (
            <span className="hd-metric hd-metric--sub su-after">
              <span className="hd-label">{sunEventName(after.kind)}</span>
              <span className="hd-metric-t">{sunTime(after)}</span>
            </span>
          )}
        </>
      )}
    </span>
  );

  const schedule = sunSchedule(e);
  return (
    <CardFrame
      card={card}
      name={e.name}
      attrs={{ "data-state": state, ...colors }}
      glyph={<SunIcon rising={next ? next.kind === "rising" : e.up === false} up={active} />}
      unavailable={unav}
      lastSeen={e.lastSeen}
      onOpen={onOpenDetails}
      status={status}
      value={when ? `${when} · ${figure}` : figure}
      bareValue={figure}
      onClose={onClose}
      control={sheet || !onOpenDetails ? <Readout label={spoken}>{bar}</Readout>
        : <Readout label={`${e.name}: ${spoken}`} onOpen={onOpenDetails}>{bar}</Readout>}
      facts={{ start: unav ? lastSeenFact(e.lastSeen) : updatedFact(e.lastUpdated), end: unav ? undefined : positionFact(e) }}
    >
      {history && !compact && <SunPath day={history} unavailable={unav} lastSeen={e.lastSeen} />}
      <SheetBlock>
        {schedule.length > 0 && (
          <section className="hd-blk" aria-labelledby={`${card.nameId}-next`}>
            <h3 className="hd-blk-h" id={`${card.nameId}-next`}>{SUN_WORDS.next}</h3>
            <ol className="su-list">
              {schedule.map((event) => (
                <li key={event.kind} className="su-ev" data-lead={event.kind === next?.kind || undefined}>
                  <span className="su-ev-n">{sunEventName(event.kind)}</span>
                  <span className="su-ev-t">{scheduleTime(event, e.now)}</span>
                </li>
              ))}
            </ol>
          </section>
        )}
      </SheetBlock>
    </CardFrame>
  );
}

export type SunSheetProps = SheetProps<SunCardProps>;

export const SunSheet = detailsSheet(SunCard);
