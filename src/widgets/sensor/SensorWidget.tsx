import { Fragment, useId } from "react";
import type React from "react";
import type { SensorEntity, SensorHistory } from "./types";
import { temperatureTone, toCelsius, comfortLabel, trendOf, normalize, fmtTemp, fmtHum, HUMIDITY_TONE, IconThermo, IconThermoOff, IconDrop, TrendIcon } from "./readings";
import { CircleButton, IconOpen, IconClose, UnavailableSlot, TodayStrip, Sheet } from "../../shared/ui";
import type { Vars } from "../../shared/ui";
import "./SensorWidget.css";

export interface SensorWidgetProps {
  entity: SensorEntity;
  /** Shown at L size and in the sheet. */
  history?: SensorHistory;
  variant?: "card" | "sheet";
  density?: "regular" | "thin";
  /** Card only: the arrow and the readings open the details sheet. */
  onOpenDetails?: () => void;
  onClose?: () => void;
}

const TREND_WORD = { rising: "Rising", falling: "Falling", steady: "Steady" } as const;
const LOW_BATTERY = 15;

/**
 * A read-only temperature and humidity sensor. Same sizes and heights as the other widgets.
 * Its tone follows the temperature; it has no glow because nothing is running.
 */
export function SensorWidget({ entity: e, history, variant = "card", density = "regular", onOpenDetails, onClose }: SensorWidgetProps) {
  const uid = useId();
  const sheet = variant === "sheet";
  const thin = !sheet && density === "thin";
  const unav = e.state === "unavailable";
  const t = unav ? undefined : e.temperature;
  const h = unav ? undefined : e.humidity;
  const empty = !unav && t == null && h == null;
  const tC = t != null ? toCelsius(t, e.unit) : undefined;
  const tone = temperatureTone(tC, e.outdoor);
  const style = { "--accent-c": tone.c, "--accent-h": tone.h, "--hd-glow": 0 } as Vars;

  const trend = history ? trendOf(history.temperature, history.currentHour) : null;
  const lowBattery = e.battery != null && e.battery <= LOW_BATTERY;
  const comfort = comfortLabel(tC, h, e.outdoor);
  const readout = [t != null ? `${fmtTemp(t)}°` : null, h != null ? `${fmtHum(h)}%` : null].filter(Boolean).join(" · ");
  const spoken = empty ? "no reading yet" : [t != null ? `${fmtTemp(t)} degrees` : null, h != null ? `humidity ${fmtHum(h)} percent` : null].filter(Boolean).join(", ");

  // Status line, most important first: a low battery, then comfort (or the location for outdoor sensors), then the trend.
  const parts: React.ReactNode[] = unav ? ["Not responding"] : empty ? [lowBattery ? <span key="b" className="hd-warn">Battery {e.battery}%</span> : null, "No reading yet"].filter(Boolean) : [
    lowBattery ? <span key="b" className="hd-warn">Battery {e.battery}%</span> : null,
    sheet && e.area && !e.outdoor ? e.area : null,
    e.outdoor ? e.area ?? "Outside" : comfort,
    trend && !thin && !lowBattery ? TREND_WORD[trend] : null,
  ].filter(Boolean);
  const status = parts.map((p, i) => <Fragment key={i}>{i > 0 && " · "}{p}</Fragment>);

  const bar = (
    <span className="sw-bar">
      {t != null && <span className="sw-t"><IconThermo />{fmtTemp(t)}<small>°</small>{trend && <TrendIcon trend={trend} />}</span>}
      {h != null && <span className="sw-h"><IconDrop />{fmtHum(h)}<small>%</small></span>}
      {empty && <span className="sw-none">Waiting…</span>}
    </span>
  );

  const tempSeries = history ? normalize(history.temperature) : null;
  const humSeries = history?.humidity ? normalize(history.humidity) : null;

  return (
    <article className={`hd sw${sheet ? " hd--sheet" : ""}${thin ? " hd--thin" : ""}`} data-state={unav ? "unavailable" : "ok"} style={style} aria-labelledby={`${uid}-n`}>
      <header className="hd-head">
        <span className="hd-orb hd-orb--static" aria-hidden="true" aria-disabled={unav || undefined}>
          <span className="hd-orb-i">{unav ? <IconThermoOff /> : <IconThermo />}</span>
        </span>
        <div className="hd-title">
          <h2 className="hd-name" id={`${uid}-n`} title={e.name}>{e.name}</h2>
          <p className="hd-area">{status}</p>
          {thin && <p className="hd-sub" aria-hidden="true">{unav ? "Unavailable" : empty ? "No reading yet" : readout}</p>}
        </div>
        <p className="hd-num" aria-hidden="true">{t != null ? <>{fmtTemp(t)}<span>°</span></> : null}</p>
        {sheet
          ? <CircleButton label={`Close ${e.name}`} onClick={onClose} autoFocus><IconClose /></CircleButton>
          : onOpenDetails && <CircleButton label={`${e.name} details`} onClick={onOpenDetails}><IconOpen /></CircleButton>}
      </header>

      <div className="hd-slot">
        {unav ? <UnavailableSlot lastSeen={e.lastSeen} />
          : sheet || !onOpenDetails
            ? <div className="sw-read" role="img" aria-label={spoken}>{bar}</div>
            : <button type="button" className="sw-read" aria-label={`${e.name}: ${spoken}. Open details`} onClick={onOpenDetails}>{bar}</button>}
      </div>

      {tempSeries && (
        <TodayStrip
          title={sheet ? "Temperature today" : "Today"}
          samples={tempSeries.samples}
          currentHour={history!.currentHour}
          summary={unav ? `Unreachable since ${e.lastSeen ?? "earlier"}` : tempSeries.min == null || tempSeries.max == null ? "No readings yet today" : `Low ${fmtTemp(tempSeries.min)}° · High ${fmtTemp(tempSeries.max)}°`}
        />
      )}

      {sheet && humSeries && (
        <div className="hd-extra">
          <TodayStrip title="Humidity today" tone={HUMIDITY_TONE} samples={humSeries.samples} currentHour={history!.currentHour} summary={humSeries.min == null || humSeries.max == null ? "No readings yet today" : `Low ${fmtHum(humSeries.min)}% · High ${fmtHum(humSeries.max)}%`} />
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

export interface SensorSheetProps extends Omit<SensorWidgetProps, "variant" | "density" | "onOpenDetails" | "onClose"> {
  open: boolean;
  onClose: () => void;
}

export function SensorSheet({ open, onClose, ...props }: SensorSheetProps) {
  return (
    <Sheet open={open} onClose={onClose} label={`${props.entity.name} details`}>
      <SensorWidget {...props} variant="sheet" onClose={onClose} />
    </Sheet>
  );
}
