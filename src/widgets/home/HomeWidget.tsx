import { useId } from "react";
import type { ReactNode } from "react";
import type { WeatherEntity, WeatherHistory, HourlyForecast, DailyForecast, Condition } from "./types";
import { CONDITION_LABEL, SKY, ConditionIcon, nextChange, compass, toKmh, aqiBand, uvBand } from "./conditions";
import type { Sky } from "./conditions";
import { Scene } from "./Scene";
import { AlertStatus, CardTitle, CircleButton, IconClose, UnavailableSlot, TodayStrip, Sheet, fmt1, paint } from "../../shared/ui";
import type { HourSample, ColorProp, WidgetFootprint } from "../../shared/ui";
import "./HomeWidget.css";

export interface HomeWidgetProps {
  entity: WeatherEntity;
  /** Shown in the featured footprint and in the sheet. */
  history?: WeatherHistory;
  hourly?: HourlyForecast[];
  daily?: DailyForecast[];
  variant?: "card" | "sheet";
  /** Shared card footprint. */
  footprint?: WidgetFootprint;
  /**
   * Compact only. false removes the inline reading, shows its value in its place, and makes the row open
   * the detail sheet. Default true.
   */
  showControl?: boolean;
  /** Card only: the house, the today bar and the name open the details sheet. */
  onOpenDetails?: () => void;
  onClose?: () => void;
  /** The orb's colour, if any. Default: none (a neutral badge). */
  color?: ColorProp;
}

/** How much sun reaches the house: the card's glow, in the house rule "glow is energy flowing". */
const SUN: Record<Sky, number> = { clear: 0.9, partly: 0.55, wind: 0.45, cloudy: 0.15, fog: 0.1, rain: 0.05, snow: 0.08, storm: 0 };

const deg = (t: number) => `${fmt1(t).replace(/\.0$/, "")}°`;

/** Today's temperatures as a readout: now, then today's low to high. */
function TodayRange({ low, high, now, label, onOpen }: { low: number; high: number; now: number; label: string; onOpen?: () => void }) {
  // No spread yet (no history, no forecast): just now.
  const flat = high - low < 0.05;
  const bar = (
    <span className="hw-tr">
      <span className="hw-tr-k">{fmt1(now)}°</span>
      {!flat && <><span className="hw-tr-end">{deg(low)}</span><span className="hw-tr-end">{deg(high)}</span></>}
    </span>
  );
  // The aria-label sentence already contains the numbers; the visual bar is its stylized rendering.
  return onOpen
    ? <button type="button" className="hw-read" aria-label={`${label}. Open details`} onClick={onOpen}><span aria-hidden="true">{bar}</span></button>
    : <div className="hw-read" role="img" aria-label={label}><span aria-hidden="true">{bar}</span></div>;
}

/** A read-only reading in the sheet, shaped like a chip. */
function Stat({ label, value, sub, warn }: { label: string; value: ReactNode; sub?: string; warn?: boolean }) {
  return (
    <div className="hw-stat">
      <span className="hw-stat-l">{label}</span>
      <span className={warn ? "hw-stat-v hd-warn" : "hw-stat-v"}>{value}</span>
      {sub && <span className="hw-stat-s">{sub}</span>}
    </div>
  );
}

/**
 * The home's outdoor conditions. Standard adds the house scene; featured also adds the large temperature
 * and Today strip. Compact uses the same one-row anatomy as every other widget.
 */
export function HomeWidget({ entity: e, history, hourly, daily, variant = "card", footprint = "standard", showControl = true, onOpenDetails, onClose, color }: HomeWidgetProps) {
  const uid = useId();
  const sheet = variant === "sheet";
  const compact = !sheet && footprint === "compact";
  const featured = !sheet && footprint === "featured";
  const bare = compact && !showControl;
  const unav = e.state === "unavailable";
  const cond = unav ? null : (e.state as Condition);
  const daylight = cond === "clear-night" || e.isDay === false ? "night" : e.isDay === true ? "day" : "unknown";
  const night = daylight === "night";
  const daylightUnknown = daylight === "unknown";
  const t = unav ? undefined : e.temperature;
  const glow = !cond || daylight !== "day" ? 0 : SUN[SKY[cond]];
  const colors = paint("reading", glow, null, color);

  // Today's range: what happened so far, what's forecast for the rest of today, and now.
  const hour = history?.currentHour ?? 0;
  const seen = (history?.temperature ?? []).filter((x): x is number => typeof x === "number");
  const ahead = (hourly ?? []).filter((h) => h.hour > hour && h.hour < 24).map((h) => h.temperature);
  const today = unav ? [] : [...seen, ...ahead, ...(t != null ? [t] : []), ...(daily?.[0] ? [daily[0].low, daily[0].high] : [])];
  const low = today.length ? Math.min(...today) : undefined;
  const high = today.length ? Math.max(...today) : undefined;

  const label = cond ? (night && cond === "sunny" ? "Clear" : CONDITION_LABEL[cond]) : "Unavailable";
  const change = cond ? nextChange(cond, hourly, hour) : null;
  const feels = e.apparentTemperature != null && t != null && Math.abs(e.apparentTemperature - t) >= 1 ? `Feels ${deg(e.apparentTemperature)}` : null;

  // Warnings come first, in the warn colour, like a sensor's low battery.
  const band = e.aqi != null ? aqiBand(e.aqi) : null;
  const gustKmh = e.windGustSpeed != null ? toKmh(e.windGustSpeed, e.windSpeedUnit) : 0;
  const warnings = unav ? [] : [
    e.aqi != null && e.aqi > 100 ? (e.aqi > 300 ? "Hazardous air" : e.aqi > 200 ? "Very poor air" : "Poor air") : null,
    gustKmh >= 50 ? `Gusts ${Math.round(e.windGustSpeed!)} ${e.windSpeedUnit}` : null,
  ].filter((x): x is string => !!x);
  const warningText = warnings.join(" · ");
  const warningSummary = warnings.length > 1 ? `${warnings[0]} +${warnings.length - 1}` : warnings[0] ?? null;
  const alertLabel = warningText ? `Warning: ${e.name}: ${warnings.join(", ")}` : null;

  // In the featured footprint and sheet, the change moves to the Today strip beside its hours.
  const status = (
    <>
      {alertLabel && <><AlertStatus label={alertLabel}>{warningText}</AlertStatus>{" · "}</>}
      {cond && <span className="hw-st-i" aria-hidden="true"><ConditionIcon condition={cond} night={night} /></span>}
      <span className="hw-st-l">{label}</span>
      {change && <span className="hw-st-n">{change}</span>}
    </>
  );

  const rangeLabel = t == null || low == null || high == null ? "" : high - low < 0.05 ? `${fmt1(t)} degrees now` : `${fmt1(t)} degrees now. Today ${fmt1(low)} to ${fmt1(high)}`;
  let slot;
  if (unav) slot = <UnavailableSlot lastSeen={e.lastSeen} />;
  else if (t == null || low == null || high == null) slot = <div className="hd-unav"><span>No temperature yet</span></div>;
  else slot = <TodayRange low={low} high={high} now={t} label={rangeLabel} onOpen={sheet ? undefined : onOpenDetails} />;

  // Today's hours: the day so far, then the forecast for the rest of it (drawn lighter).
  let strip: { samples: HourSample[]; summary: string } | null = null;
  if (history) {
    const temps: (number | "unavailable" | null)[] = Array.from({ length: 24 }, (_, i) => {
      if (i < hour) return history.temperature[i] ?? null;
      if (i === hour) return unav ? "unavailable" : t ?? history.temperature[i] ?? null;
      return unav ? null : hourly?.find((h) => h.hour === i)?.temperature ?? null;
    });
    const nums = temps.filter((x): x is number => typeof x === "number");
    const mn = nums.length ? Math.min(...nums) : 0, span = nums.length ? Math.max(Math.max(...nums) - mn, 1) : 1;
    strip = {
      samples: temps.map((x) => (typeof x === "number" ? 0.12 + (0.88 * (x - mn)) / span : x)),
      summary: unav ? `Unavailable since ${e.lastSeen ?? "earlier"}` : change ?? feels ?? (nums.length ? `Low ${deg(mn)} · High ${deg(Math.max(...nums))}` : "No readings yet"),
    };
  }

  const scene = <Scene night={night} daylightUnknown={daylightUnknown} off={unav} />;

  // The compact value appears under the name, or in place of a hidden reading.
  const subText = unav ? "Unavailable" : warningSummary ?? [t != null ? `${fmt1(t)}°` : null, change ?? label].filter(Boolean).join(" · ");
  // The status line already says the condition or coming change: the replacement value is just temperature.
  const valText = unav ? "Unavailable" : t != null ? `${fmt1(t)}°` : label;
  return (
    <article
      className={`hd hw${sheet ? " hd--sheet" : ""}${compact ? " hd--compact" : ""}${featured ? " hd--featured" : ""}`} data-control={bare ? "off" : undefined}
      data-state={unav ? "unavailable" : "ok"} data-daylight={daylight} data-change={change ? "" : undefined} data-alert={warnings.length ? "warn" : undefined}
      {...colors} aria-labelledby={`${uid}-n`}
    >
      {!sheet && (onOpenDetails
        ? <button type="button" className="hw-scene" tabIndex={-1} aria-hidden="true" onClick={onOpenDetails}>{scene}</button>
        : <div className="hw-scene">{scene}</div>)}

      <header className="hd-head">
        <span className="hd-orb hd-orb--static" aria-hidden="true" aria-disabled={unav || undefined}>
          <span className="hd-orb-i"><ConditionIcon condition={cond ?? "unavailable"} night={night} /></span>
        </span>
        <CardTitle id={`${uid}-n`} name={e.name} onOpen={sheet ? undefined : onOpenDetails} openHint="weather details">
          <p className="hd-area hw-st">{status}</p>
          {compact && <p className="hd-sub">{alertLabel ? <AlertStatus label={alertLabel}>{subText}</AlertStatus> : subText}</p>}
        </CardTitle>
        <p className="hd-num" aria-hidden="true">{t != null ? <>{fmt1(t)}<span>°</span></> : null}</p>
        {sheet && <CircleButton
          label={`Close ${e.name}`}
          onClick={onClose}
          // Focus lands on the sheet's close button when it opens: dialog focus management, not page-load focus theft.
          // eslint-disable-next-line jsx-a11y/no-autofocus
          autoFocus
        ><IconClose /></CircleButton>}
      </header>

      {sheet && <div className="hw-scene">{scene}</div>}

      <div className="hd-slot">{bare ? <p className="hd-val">{valText}</p> : slot}</div>

      {sheet && !unav && (
        <div className="hd-extra">
          <div className="hw-stats">
            {e.apparentTemperature != null && <Stat label="Feels like" value={deg(e.apparentTemperature)} sub={e.dewPoint != null ? `Dew point ${deg(e.dewPoint)}` : undefined} />}
            {e.humidity != null && <Stat label="Humidity" value={<>{Math.round(e.humidity)}<small>%</small></>} />}
            {e.windSpeed != null && <Stat label="Wind" value={<>{Math.round(e.windSpeed)}<small> {e.windSpeedUnit}</small></>}
              sub={[e.windBearing != null ? compass(e.windBearing) : null, e.windGustSpeed != null ? `gusts ${Math.round(e.windGustSpeed)}` : null].filter(Boolean).join(", ") || undefined} warn={gustKmh >= 50} />}
            {band && <Stat label="Air quality" value={Math.round(e.aqi!)} sub={band.label} warn={e.aqi! > 100} />}
            {e.uvIndex != null && <Stat label="UV index" value={Math.round(e.uvIndex)} sub={uvBand(e.uvIndex).label} warn={e.uvIndex >= 8} />}
            {e.pressure != null && <Stat label="Pressure" value={<>{e.pressureUnit === "inHg" ? e.pressure.toFixed(2) : Math.round(e.pressure)}<small> {e.pressureUnit}</small></>} />}
          </div>
        </div>
      )}

      {strip && <TodayStrip title="Today" samples={strip.samples} currentHour={hour} forecastFrom={hour + 1} summary={strip.summary} />}

      {sheet && daily && daily.length > 0 && !unav && (
        <div className="hd-extra">
          <div className="hd-blk">
            <p className="hd-blk-h"><span>Next days</span></p>
            <ol className="hw-days">
              {daily.slice(0, 5).map((d, i) => (
                <li key={i} className="hw-day">
                  <span className="hw-day-n">{i === 0 ? "Today" : d.day}</span>
                  <span className="hw-day-i" title={CONDITION_LABEL[d.condition]}><ConditionIcon condition={d.condition} /></span>
                  <span className="hw-day-t"><b>{Math.round(d.high)}°</b> {Math.round(d.low)}°</span>
                  <span className="hw-day-p">{d.precipitationProbability != null && d.precipitationProbability >= 20 ? `${d.precipitationProbability}%` : " "}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      )}

      {sheet && (
        <p className="hd-info">
          <span>{unav ? `Last seen ${e.lastSeen ?? "unknown"}` : ""}</span>
          <span>{!unav && e.lastUpdated ? `Updated ${e.lastUpdated}` : ""}</span>
        </p>
      )}
    </article>
  );
}

export interface HomeSheetProps extends Omit<HomeWidgetProps, "variant" | "footprint" | "onOpenDetails" | "onClose"> {
  open: boolean;
  onClose: () => void;
}

export function HomeSheet({ open, onClose, ...props }: HomeSheetProps) {
  return (
    <Sheet open={open} onClose={onClose} label={`${props.entity.name} weather details`}>
      <HomeWidget {...props} variant="sheet" onClose={onClose} />
    </Sheet>
  );
}
