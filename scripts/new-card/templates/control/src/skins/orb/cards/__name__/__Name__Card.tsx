import type { __Name__Entity, __Name__History } from "@dashhaus/core/entities/__name__/types";
import { lastChangedFact, lastSeenFact, sinceFact } from "@dashhaus/core/entities/facts";
import { todaySummary } from "@dashhaus/core/entities/today";
import { __Name__Icon } from "./icons";
import { CardFrame, Today, TogglePill, detailsSheet, paint, useCard } from "../../shared/ui";
import type { CardProps, SheetProps } from "../../shared/ui";
import "./__Name__Card.css";

export interface __Name__CardProps extends CardProps {
  entity: __Name__Entity;
  /** Shown in the featured footprint and in the sheet. */
  history?: __Name__History;
  onToggle: () => void;
}

/**
 * One __label__ (`__domain__.*`), switched on and off. It is drawn in the card frame, in the footprint matrix of
 * every other card: the orb and the pill toggle it; the name, or a press and hold on the orb, opens the sheet.
 */
export function __Name__Card({ entity: e, history, variant, footprint, showControl, onToggle, onOpenDetails, onClose }: __Name__CardProps) {
  const card = useCard("__code__", { variant, footprint, showControl });
  const unav = e.state === "unavailable";
  const on = e.state === "on";
  // A state: on is the accent, with no glow. "energy" (bloom and glow) is for light, heat or daylight; see the attention-budget skill.
  const colors = paint("state", 0);
  // The control carries the state word; the status line never repeats it.
  const word = unav ? "Unavailable" : on ? "On" : "Off";
  // The pill's second voice: what tapping does, or how long it has been on.
  const cue = on ? sinceFact(e.lastChanged) : "Turn on";

  return (
    <CardFrame
      card={card}
      name={e.name}
      attrs={{ "data-state": e.state, ...colors }}
      orb={{ label: e.name, pressed: on, intensity: 0.7, onToggle, children: <__Name__Icon /> }}
      unavailable={unav}
      lastSeen={e.lastSeen}
      onOpen={onOpenDetails}
      status={e.area}
      value={word}
      readout={{ value: unav ? null : word }}
      onClose={onClose}
      control={<TogglePill label={`${e.name}: ${word}${cue ? ` · ${cue}` : ""}`} on={on} onToggle={onToggle} extra={cue}>{word}</TogglePill>}
      facts={{ start: unav ? lastSeenFact(e.lastSeen) : lastChangedFact(e.lastChanged), end: unav && e.area ? e.area : "" }}
    >
      {history && <Today samples={history.samples} currentHour={history.currentHour} summary={todaySummary("on", history.onMinutes)} />}
    </CardFrame>
  );
}

export type __Name__SheetProps = SheetProps<__Name__CardProps>;

export const __Name__Sheet = detailsSheet(__Name__Card);
