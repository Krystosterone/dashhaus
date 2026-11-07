import type { BinarySensorEntity, BinarySensorHistory } from "@dashhaus/core/entities/binarySensor/types";
import { alertWord, pictureOf, stateWord, wordsOf } from "@dashhaus/core/entities/binarySensor/words";
import { binarySensorSeverity, stateSeverity } from "@dashhaus/core/entities/binarySensor/severity";
import { isLowBattery } from "@dashhaus/core/entities/battery";
import { lastChangedFact, lastSeenFact } from "@dashhaus/core/entities/facts";
import { todaySummary } from "@dashhaus/core/entities/today";
import { BinarySensorIcon } from "./icons";
import { AlertStatus, CardFrame, Readout, Today, detailsSheet, paint, useCard } from "../../shared/ui";
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
 * Smoke) as a readout with no container, and since when. It never glows: smoke, gas and carbon monoxide (an alarm),
 * a leak (urgent) and a low battery (advisory) lead the status line behind the warn marker, in words, and the state's
 * own warning sets its word in the warn colour (attention-budget skill). An open door is a state, not a warning.
 * The name or the reading opens the sheet with today's hours on and the battery.
 */
export function BinarySensorCard({ entity: e, history, variant, footprint, showControl, onOpenDetails, onClose }: BinarySensorCardProps) {
  const card = useCard("bs", { variant, footprint, showControl, area: e.area });
  const { sheet, area } = card;
  const unav = e.state === "unavailable";
  const on = e.state === "on";
  const colors = paint("reading", 0);
  const word = stateWord(e);
  const words = wordsOf(e.deviceClass);

  // The state's own warning (smoke, a leak) leads; a low battery only when the state has none.
  const severity = binarySensorSeverity(e);
  const stateAlert = stateSeverity(e) ? alertWord(e) : undefined;
  const lowBattery = !unav && isLowBattery(e.battery);
  const warning = stateAlert ?? (severity ? `Battery ${e.battery}%` : undefined);
  const alertLabel = warning
    ? `${severity === "alarm" ? "Alert" : "Warning"}: ${stateAlert ? `${stateAlert} at ${e.name}` : `battery ${e.battery}% on ${e.name}, replace soon`}`
    : null;
  const since = !unav && e.lastChanged ? e.lastChanged : undefined;
  const status = alertLabel ? <AlertStatus label={alertLabel}>{warning}</AlertStatus> : area ?? (unav ? "Unavailable" : since ? `Since ${since}` : undefined);
  const spoken = `${word}${since ? `, since ${since}` : ""}`;

  const bar = (
    <span className="hd-bar bs-bar">
      <span className="hd-metric bs-f" data-warn={stateAlert ? "" : undefined}>{word}</span>
      {since && (
        <span className="hd-metric bs-since">
          <span className="hd-label">Since</span>
          <span className="bs-t">{since}</span>
        </span>
      )}
    </span>
  );

  return (
    <CardFrame
      card={card}
      name={e.name}
      attrs={{ "data-state": e.state, "data-alert": severity === "alarm" ? "alarm" : severity ? "warn" : undefined, ...colors }}
      glyph={<BinarySensorIcon picture={pictureOf(e.deviceClass)} on={on} />}
      unavailable={unav}
      lastSeen={e.lastSeen}
      onOpen={onOpenDetails}
      status={status}
      value={warning ?? word}
      alert={alertLabel}
      bareValue={word}
      readout={{ value: unav ? null : word, label: sheet && !unav ? spoken : undefined, className: stateAlert ? "bs-num-warn" : undefined }}
      onClose={onClose}
      slot={!sheet || unav}
      control={sheet || !onOpenDetails ? <Readout label={spoken}>{bar}</Readout>
        : <Readout label={`${e.name}: ${spoken}`} onOpen={onOpenDetails}>{bar}</Readout>}
      facts={{
        start: e.battery != null ? `Battery ${e.battery}%${lowBattery ? ", replace soon" : ""}` : "",
        end: unav ? lastSeenFact(e.lastSeen) : lastChangedFact(e.lastChanged),
        warn: lowBattery,
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
