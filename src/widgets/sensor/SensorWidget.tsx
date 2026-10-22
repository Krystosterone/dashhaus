import { Fragment, useId } from "react";
import type { ReactNode } from "react";
import type { SensorEntity, SensorHistory } from "./types";
import { toCelsius, comfortLabel, trendOf, normalize, fmtTemp, fmtHum, IconThermo, IconThermoOff, IconDrop, TrendIcon } from "./readings";
import { AlertStatus, CircleButton, IconOpen, IconClose, UnavailableSlot, TodayStrip, Sheet, paint } from "../../shared/ui";
import type { ColorProp, WidgetFootprint } from "../../shared/ui";
import "./SensorWidget.css";

export interface SensorWidgetProps {
  entity: SensorEntity;
  /** Shown in the featured footprint and in the sheet. */
  history?: SensorHistory;
  variant?: "card" | "sheet";
  /** Shared card footprint. */
  footprint?: WidgetFootprint;
  /**
   * Compact only. false removes the inline reading, shows its value in its place, and makes the row open
   * the detail sheet. Default true.
   */
  showControl?: boolean;
  /** Card only: the arrow and the readings open the details sheet. */
  onOpenDetails?: () => void;
  onClose?: () => void;
  /** The orb's colour, if any. Default: none (a neutral badge). */
  color?: ColorProp;
}

const TREND_WORD = { rising: "Rising", falling: "Falling", steady: "Steady" } as const;
const LOW_BATTERY = 15;

/**
 * A read-only temperature and humidity sensor using the shared modular footprint matrix.
 * Its tone follows the temperature; it has no glow because nothing is running.
 */
export function SensorWidget({ entity: e, history, variant = "card", footprint = "standard", showControl = true, onOpenDetails, onClose, color }: SensorWidgetProps) {
  const uid = useId();
  const sheet = variant === "sheet";
  const compact = !sheet && footprint === "compact";
  const featured = !sheet && footprint === "featured";
  const bare = compact && !showControl;
  const unav = e.state === "unavailable";
  const t = unav ? undefined : e.temperature;
  const h = unav ? undefined : e.humidity;
  const empty = !unav && t == null && h == null;
  const tC = t != null ? toCelsius(t, e.unit) : undefined;
  // A reading: neutral. "Cool" or "Warm" is said in words; a colour only if the dashboard asks for one.
  const colors = paint("reading", 0, null, color);

  const trend = history ? trendOf(history.temperature, history.currentHour) : null;
  const lowBattery = !unav && e.battery != null && e.battery <= LOW_BATTERY;
  const batteryText = lowBattery ? `Battery ${e.battery}%` : null;
  const alertLabel = batteryText ? `Warning: ${batteryText} on ${e.name}, replace soon` : null;
  const comfort = comfortLabel(tC, h, e.outdoor);
  const readout = [t != null ? `${fmtTemp(t)}°` : null, h != null ? `${fmtHum(h)}%` : null].filter(Boolean).join(" · ");
  const spoken = empty ? "no reading yet" : [t != null ? `${fmtTemp(t)} degrees` : null, h != null ? `humidity ${fmtHum(h)} percent` : null].filter(Boolean).join(", ");

  // Status line, most important first: a low battery, then comfort (or the location for outdoor sensors), then the trend.
  const parts: ReactNode[] = unav ? ["Not responding"] : empty ? [batteryText, "No reading yet"].filter(Boolean) : [
    batteryText,
    sheet && e.area && !e.outdoor ? e.area : null,
    e.outdoor ? e.area ?? "Outside" : comfort,
    trend && !compact && !lowBattery ? TREND_WORD[trend] : null,
  ].filter(Boolean);
  const status = parts.map((part, i) => <Fragment key={i}>{i > 0 && " · "}{i === 0 && alertLabel ? <AlertStatus label={alertLabel}>{part}</AlertStatus> : part}</Fragment>);

  const bar = (
    <span className="sw-bar">
      {t != null && <span className="sw-t"><IconThermo />{fmtTemp(t)}<small>°</small>{trend && <TrendIcon trend={trend} />}</span>}
      {h != null && <span className="sw-h"><IconDrop />{fmtHum(h)}<small>%</small></span>}
      {empty && <span className="sw-none">Waiting…</span>}
    </span>
  );

  const tempSeries = history ? normalize(history.temperature) : null;
  const humSeries = history?.humidity ? normalize(history.humidity) : null;

  // The compact value appears under the name, or in place of a hidden reading.
  const subText = unav ? "Unavailable" : batteryText ?? (empty ? "No reading yet" : readout);
  return (
    <article className={`hd sw${sheet ? " hd--sheet" : ""}${compact ? " hd--compact" : ""}${featured ? " hd--featured" : ""}`} data-control={bare ? "off" : undefined} data-state={unav ? "unavailable" : "ok"} data-alert={lowBattery ? "warn" : undefined} {...colors} aria-labelledby={`${uid}-n`}>
      <header className="hd-head">
        <span className="hd-orb hd-orb--static" aria-hidden="true" aria-disabled={unav || undefined}>
          <span className="hd-orb-i">{unav ? <IconThermoOff /> : <IconThermo />}</span>
        </span>
        <div className="hd-title">
          <h2 className="hd-name" id={`${uid}-n`} title={e.name}>{e.name}</h2>
          <p className="hd-area">{status}</p>
          {compact && <p className="hd-sub">{alertLabel ? <AlertStatus label={alertLabel}>{subText}</AlertStatus> : subText}</p>}
        </div>
        <p className="hd-num" aria-hidden="true">{t != null ? <>{fmtTemp(t)}<span>°</span></> : null}</p>
        {sheet
          ? <CircleButton
            label={`Close ${e.name}`}
            onClick={onClose}
            // Focus lands on the sheet's close button when it opens: dialog focus management, not page-load focus theft.
            // eslint-disable-next-line jsx-a11y/no-autofocus
            autoFocus
          ><IconClose /></CircleButton>
          : onOpenDetails && <CircleButton label={`${e.name} details`} onClick={onOpenDetails}><IconOpen /></CircleButton>}
      </header>

      <div className="hd-slot">
        {bare ? <p className="hd-val">{subText}</p> : unav ? <UnavailableSlot lastSeen={e.lastSeen} />
          : sheet || !onOpenDetails
            ? <div className="sw-read" role="img" aria-label={spoken}><span aria-hidden="true">{bar}</span></div>
            : <button type="button" className="sw-read" aria-label={`${e.name}: ${spoken}. Open details`} onClick={onOpenDetails}><span aria-hidden="true">{bar}</span></button>}
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

export interface SensorSheetProps extends Omit<SensorWidgetProps, "variant" | "footprint" | "onOpenDetails" | "onClose"> {
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
