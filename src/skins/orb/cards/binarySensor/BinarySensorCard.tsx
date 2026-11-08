import type { BinarySensorEntity, BinarySensorHistory } from "@dashhaus/core/entities/binarySensor/types";
import { alertSaid, alertText, alertWord, pictureOf, stateWord, wordsOf } from "@dashhaus/core/entities/binarySensor/words";
import { binarySensorSeverity, stateSeverity } from "@dashhaus/core/entities/binarySensor/severity";
import { batteryAdvice, batteryText, isLowBattery } from "@dashhaus/core/entities/battery";
import { lastChangedFact, lastSeenFact } from "@dashhaus/core/entities/facts";
import { todaySummary } from "@dashhaus/core/entities/today";
import { BinarySensorIcon } from "./icons";
import { AlarmPill, AlertStatus, CardFrame, Readout, Today, detailsSheet, paint, useCard } from "../../shared/ui";
import type { CardProps, SheetProps } from "../../shared/ui";
import "./BinarySensorCard.css";

export interface BinarySensorCardProps extends CardProps {
  entity: BinarySensorEntity;
  /** Today's hours on (open, wet, detecting), on the featured footprint and in the sheet. */
  history?: BinarySensorHistory;
  /** Card only: the name and the reading open the details sheet. */
  onOpenDetails?: () => void;
}

/**
 * One binary sensor (`binary_sensor.*`: a door, a window, a leak, smoke), with its device's battery: a reading.
 * Neutral, the bare icon its device class names in place of an orb, its state in that class's words (Open, Wet,
 * Smoke) as a readout with no container, and since when. It never glows (attention-budget skill). Smoke, gas and carbon
 * monoxide are an alarm going off: the slot fills in warn with the alarm and since when, in every footprint, as the
 * Owlet's vitals do. A leak (urgent), a garage door left open, and a low battery (advisory) lead the status line
 * behind the warn marker, in words; the figure itself stays in ink. An open door is a state, not a warning. The name
 * or the reading opens the sheet with today's hours on and the battery.
 */
export function BinarySensorCard({ entity: e, history, variant, footprint, showControl, onOpenDetails, onClose }: BinarySensorCardProps) {
  const card = useCard("bs", { variant, footprint, showControl, area: e.area });
  const { sheet, area } = card;
  const unav = e.state === "unavailable";
  const on = e.state === "on";
  const colors = paint("reading", 0);
  const word = stateWord(e);
  const words = wordsOf(e.deviceClass);

  // The state's own warning (smoke, a leak, a garage door left open) leads; a low battery only when the state has none.
  const severity = binarySensorSeverity(e);
  const stateLevel = stateSeverity(e);
  const alarm = stateLevel === "alarm";
  const stateAlert = stateLevel ? alertText(e) : undefined;
  const lowBattery = !unav && isLowBattery(e.battery);
  const warning = stateAlert ?? (severity ? batteryText(e.battery!) : undefined);
  const alertLabel = warning
    ? `${alarm ? "Alert" : "Warning"}: ${e.name}: ${stateAlert ? alertSaid(e) : batteryAdvice(e.battery!)}`
    : null;
  const since = !unav && e.lastChanged ? e.lastChanged : undefined;
  const sinceText = since ? `Since ${since}` : undefined;
  // The area, or since when without one. The sheet's small print says when it last changed, so its status line doesn't.
  const plain = area ?? sinceText;
  // An alarm fills the slot, so the status line keeps its plain words and no second marker.
  const status = unav ? "Unavailable"
    : alertLabel && !alarm ? <AlertStatus label={alertLabel}>{warning}</AlertStatus>
    : plain;
  const spoken = `${word}${since ? `, since ${since}` : ""}`;

  const bar = (
    <span className="hd-bar hd-bar--pair bs-bar">
      <span className="hd-metric hd-metric-w bs-f">{word}</span>
      {since && (
        <span className="hd-metric hd-metric--sub bs-since">
          <span className="hd-label">Since</span>
          <span className="hd-metric-t">{since}</span>
        </span>
      )}
    </span>
  );

  return (
    <CardFrame
      card={card}
      name={e.name}
      attrs={{ "data-state": e.state, ...colors }}
      level={severity}
      glyph={<BinarySensorIcon picture={pictureOf(e.deviceClass)} on={on} />}
      unavailable={unav}
      lastSeen={e.lastSeen}
      onOpen={onOpenDetails}
      status={status}
      value={warning ?? word}
      alert={alertLabel}
      bareValue={word}
      readout={{ value: unav ? null : word, label: sheet && !unav ? spoken : undefined, word: true }}
      onClose={onClose}
      // The sheet's header already says the state; it keeps the slot only for an alarm, or the dashed unavailable.
      slot={!sheet || unav || alarm}
      urgent={alarm ? <AlarmPill alert={alertWord(e)} value={since && <><span className="bs-al-k">Since </span>{since}</>} /> : undefined}
      control={sheet || !onOpenDetails ? <Readout label={spoken}>{bar}</Readout>
        : <Readout label={`${e.name}: ${spoken}`} onOpen={onOpenDetails}>{bar}</Readout>}
      // When first, what the device is after it; `Facts`' `warn` marks the start, so a low battery marks its own end.
      facts={{
        start: unav ? lastSeenFact(e.lastSeen) : lastChangedFact(e.lastChanged),
        end: e.battery == null || unav ? "" : lowBattery ? <span className="hd-warn">{batteryAdvice(e.battery)}</span> : batteryText(e.battery),
      }}
    >
      {history && (
        <Today samples={history.samples} currentHour={history.currentHour} summary={todaySummary(words.today, history.onMinutes)} />
      )}
    </CardFrame>
  );
}

export type BinarySensorSheetProps = SheetProps<BinarySensorCardProps>;

export const BinarySensorSheet = detailsSheet(BinarySensorCard);
