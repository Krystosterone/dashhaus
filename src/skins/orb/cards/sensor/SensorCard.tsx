import { Fragment } from "react";
import type { ReactNode } from "react";
import type { SensorEntity, SensorHistory } from "@scope/core/entities/sensor/types";
import { toCelsius, comfortLabel, trendOf, normalize, fmtTemp, fmtHum, lowBattery as isLowBattery, TREND_WORD, IconThermo, IconThermoOff } from "./readings";
import { AlertStatus, CardTitle, Readout, UnavailableSlot, TodayStrip, paint, SheetClose, useCard, detailsSheet } from "../../shared/ui";
import type { ColorProp, CardProps, SheetProps } from "../../shared/ui";
import "./SensorCard.css";

export interface SensorCardProps extends CardProps {
  entity: SensorEntity;
  /** Shown in the featured footprint and in the sheet. */
  history?: SensorHistory;
  /**
   * Compact only. false removes the inline reading, shows its value in its place, and makes the row open
   * the detail sheet. Default true.
   */
  showControl?: boolean;
  /** Card only: the name and the readings open the details sheet. */
  onOpenDetails?: () => void;
  onClose?: () => void;
  /** The orb's colour, if any. Default: none (a neutral badge). */
  color?: ColorProp;
}

/**
 * A read-only temperature and humidity sensor using the shared modular footprint matrix.
 * A reading: neutral, a bare icon in place of an orb, and no glow because nothing is running.
 */
export function SensorCard({ entity: e, history, variant, footprint, showControl, onOpenDetails, onClose, color }: SensorCardProps) {
  const { nameId, sheet, compact, bare, article, area } = useCard("sw", { variant, footprint, showControl, area: e.area });
  const unav = e.state === "unavailable";
  const t = unav ? undefined : e.temperature;
  const h = unav ? undefined : e.humidity;
  const empty = !unav && t == null && h == null;
  const tC = t != null ? toCelsius(t, e.unit) : undefined;
  // A reading: neutral. "Cool" or "Warm" is said in words; a colour only if the dashboard asks for one.
  const colors = paint("reading", 0, null, color);

  const trend = history ? trendOf(history.temperature, history.currentHour) : null;
  const lowBattery = isLowBattery(e);
  const batteryText = lowBattery ? `Battery ${e.battery}%` : null;
  const alertLabel = batteryText ? `Warning: ${batteryText} on ${e.name}, replace soon` : null;
  const comfort = comfortLabel(tC, h, e.outdoor);
  const readout = [t != null ? `${fmtTemp(t)}°` : null, h != null ? `${fmtHum(h)}%` : null].filter(Boolean).join(" · ");
  // In the sheet the large figure says the temperature, so it is spoken there and the readings below keep the humidity.
  const sheetFigure = sheet && t != null;
  const spoken = empty ? "no reading yet" : [t != null ? `${fmtTemp(t)} degrees` : null, h != null ? `humidity ${fmtHum(h)} percent` : null].filter(Boolean).join(", ");

  // Status line, most important first: a low battery, then comfort (or the location for outdoor sensors).
  // Trend is its own low-priority phrase so a narrow card can remove it cleanly instead of clipping a word.
  const statusParts: ReactNode[] = unav ? ["Unavailable"] : empty ? [batteryText, "No reading yet"].filter(Boolean) : [
    batteryText,
    sheet && area && !e.outdoor ? area : null,
    lowBattery ? null : e.outdoor ? area ?? "Outside" : comfort,
  ].filter(Boolean);
  const trendWord = trend && !compact && !lowBattery ? TREND_WORD[trend] : null;
  const status = <>
    {statusParts.map((part, i) => <Fragment key={i}>{i > 0 && " · "}{i === 0 && alertLabel ? <AlertStatus label={alertLabel}>{part}</AlertStatus> : part}</Fragment>)}
    {trendWord && <span className="sw-trend">{statusParts.length > 0 && " · "}{trendWord}</span>}
  </>;

  const bar = (
    <span className="hd-bar sw-bar">
      {t != null && <span className="hd-metric sw-t"><span className="sw-value">{fmtTemp(t)}<small>°</small></span></span>}
      {h != null && (
        <span className="hd-metric sw-h">
          <span className="hd-label"><span className="hd-label-long">Humidity</span><span className="hd-label-short">RH</span></span>
          <span className="sw-value">{fmtHum(h)}<small>%</small></span>
        </span>
      )}
      {empty && <span className="hd-none">Waiting…</span>}
    </span>
  );

  const tempSeries = history ? normalize(history.temperature) : null;
  const humSeries = history?.humidity ? normalize(history.humidity) : null;

  // The compact value appears under the name, or in place of a hidden reading.
  const subText = unav ? "Unavailable" : batteryText ?? (empty ? "No reading yet" : readout);
  return (
    <article {...article} data-state={unav ? "unavailable" : "ok"} data-alert={lowBattery ? "warn" : undefined} {...colors}>
      <header className="hd-head">
        <span className="hd-orb hd-orb--static" aria-hidden="true" aria-disabled={unav || undefined}>
          <span className="hd-orb-i">{unav ? <IconThermoOff /> : <IconThermo />}</span>
        </span>
        <CardTitle id={nameId} name={e.name} onOpen={sheet ? undefined : onOpenDetails}>
          <p className="hd-area">{status}</p>
          {compact && <p className="hd-sub">{alertLabel ? <AlertStatus label={alertLabel}>{subText}</AlertStatus> : subText}</p>}
        </CardTitle>
        <p className="hd-num" {...(sheetFigure ? { role: "img", "aria-label": `${fmtTemp(t)} degrees` } : { "aria-hidden": true })}>{t != null ? <>{fmtTemp(t)}<span>°</span></> : null}</p>
        {sheet && <SheetClose label={`Close ${e.name}`} onClick={onClose} />}
      </header>

      {!(sheetFigure && h == null) && (
        <div className="hd-slot">
          {bare ? <p className="hd-val">{subText}</p> : unav ? <UnavailableSlot lastSeen={e.lastSeen} />
            : sheet || !onOpenDetails ? <Readout label={sheetFigure ? `humidity ${fmtHum(h!)} percent` : spoken}>{bar}</Readout>
            : <Readout label={`${e.name}: ${spoken}`} onOpen={onOpenDetails}>{bar}</Readout>}
        </div>
      )}

      {tempSeries && (
        <TodayStrip
          title={sheet ? "Temperature today" : "Today"}
          samples={tempSeries.samples}
          currentHour={history!.currentHour}
          summary={unav ? `Unavailable since ${e.lastSeen ?? "earlier"}` : tempSeries.min == null || tempSeries.max == null ? "No readings yet today" : `Low ${fmtTemp(tempSeries.min)}° · High ${fmtTemp(tempSeries.max)}°`}
        />
      )}

      {sheet && humSeries && (
        <div className="hd-extra">
          <TodayStrip title="Humidity today" samples={humSeries.samples} currentHour={history!.currentHour} summary={humSeries.min == null || humSeries.max == null ? "No readings yet today" : `Low ${fmtHum(humSeries.min)}% · High ${fmtHum(humSeries.max)}%`} />
        </div>
      )}

      {sheet && (
        <p className="hd-info">
          <span className={lowBattery ? "hd-warn" : undefined}>{e.battery != null ? `Battery ${e.battery}%${lowBattery ? ", replace soon" : ""}` : ""}</span>
          <span>{unav ? `Last seen ${e.lastSeen ?? "unknown"}` : e.lastUpdated ? `Updated ${e.lastUpdated}` : ""}</span>
        </p>
      )}
    </article>
  );
}

export type SensorSheetProps = SheetProps<SensorCardProps>;

export const SensorSheet = detailsSheet(SensorCard);
