import type { __Name__Entity, __Name__History } from "@dashhaus/core/entities/__name__/types";
import { lastChangedFact, lastSeenFact, sinceFact, unavailableSince } from "@dashhaus/core/entities/facts";
import { todaySummary } from "@dashhaus/core/entities/today";
import { __Name__Icon } from "./icons";
import { Orb, CardTitle, SheetClose, TogglePill, UnavailableSlot, TodayStrip, paint, useCard, detailsSheet, Facts } from "../../shared/ui";
import type { CardProps, SheetProps } from "../../shared/ui";
import "./__Name__Card.css";

export interface __Name__CardProps extends CardProps {
  entity: __Name__Entity;
  /** Shown in the featured footprint and in the sheet. */
  history?: __Name__History;
  onToggle: () => void;
}

/**
 * One __label__ (`__domain__.*`), switched on and off. It uses the same card anatomy and footprint matrix
 * as every other card: the orb and the pill toggle it; the name, or a press and hold on the orb, opens the sheet.
 */
export function __Name__Card({ entity: e, history, variant, footprint, showControl, onToggle, onOpenDetails, onClose, color }: __Name__CardProps) {
  const { nameId, sheet, compact, bare, article } = useCard("__code__", { variant, footprint, showControl });
  const unav = e.state === "unavailable";
  const on = e.state === "on";
  // A state: on is the accent, with no glow. "energy" (bloom and glow) is for light, heat or daylight; see the attention-budget skill.
  const colors = paint("state", 0, null, color);
  // The control carries the state word; the status line never repeats it.
  const word = unav ? "Unavailable" : on ? "On" : "Off";
  // The pill's second voice: what tapping does, or how long it has been on.
  const cue = on ? sinceFact(e.lastChanged) : "Turn on";

  return (
    <article {...article} data-state={e.state} {...colors}>
      <header className="hd-head">
        <Orb label={e.name} pressed={on} unavailable={unav} intensity={0.7} onToggle={onToggle} onLongPress={sheet ? undefined : onOpenDetails}>
          <__Name__Icon />
        </Orb>
        <CardTitle id={nameId} name={e.name} onOpen={sheet ? undefined : onOpenDetails}>
          <p className="hd-area">{e.area}</p>
          {compact && <p className="hd-sub">{word}</p>}
        </CardTitle>
        <p className="hd-num" aria-hidden="true">{unav ? null : word}</p>
        {sheet && <SheetClose label={`Close ${e.name}`} onClick={onClose} />}
      </header>

      <div className="hd-slot">
        {bare ? <p className="hd-val">{word}</p> : unav
          ? <UnavailableSlot lastSeen={e.lastSeen} />
          : <TogglePill label={`${e.name}: ${word}${cue ? ` · ${cue}` : ""}`} on={on} onToggle={onToggle} extra={cue}>{word}</TogglePill>}
      </div>

      {history && (
        <TodayStrip
          samples={history.samples}
          currentHour={history.currentHour}
          summary={unav ? unavailableSince(e.lastSeen) : todaySummary("on", history.onMinutes)}
        />
      )}

      {sheet && (
        <Facts start={unav ? lastSeenFact(e.lastSeen) : lastChangedFact(e.lastChanged)} end={unav && e.area ? e.area : ""} />
      )}
    </article>
  );
}

export type __Name__SheetProps = SheetProps<__Name__CardProps>;

export const __Name__Sheet = detailsSheet(__Name__Card);
