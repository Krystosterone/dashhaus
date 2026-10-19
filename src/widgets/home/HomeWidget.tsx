import { useId, useLayoutEffect, useRef } from "react";
import type { ReactNode } from "react";
import type { WeatherEntity, WeatherHistory, HourlyForecast, DailyForecast, Condition } from "./types";
import { CONDITION_LABEL, SKY, ConditionIcon, nextChange, compass, toKmh, aqiBand, uvBand } from "./conditions";
import type { Sky } from "./conditions";
import { Scene } from "./Scene";
import { AlertStatus, CircleButton, IconOpen, IconClose, UnavailableSlot, TodayStrip, Sheet, fmt1, paint } from "../../shared/ui";
import type { Vars, HourSample, ColorProp } from "../../shared/ui";
import "./HomeWidget.css";

export interface HomeWidgetProps {
  entity: WeatherEntity;
  history?: WeatherHistory;
  hourly?: HourlyForecast[];
  daily?: DailyForecast[];
  variant?: "card" | "sheet";
  density?: "regular" | "thin";
  /**
   * Thin only. false: no control in the row (no pill, bar, stepper or switch); the value shows as text in
   * its place and tapping the row opens the details sheet, where every control is. The orb still switches
   * and holds as usual. Default true.
   */
  showControl?: boolean;
  /** Card only: the house, the today bar and the arrow open the details sheet. */
  onOpenDetails?: () => void;
  onClose?: () => void;
  /** The orb's colour, if any. Default: none (a neutral badge). */
  color?: ColorProp;
}

/** How much sun reaches the house: the card's glow, in the house rule "glow is energy flowing". */
const SUN: Record<Sky, number> = { clear: 0.9, partly: 0.55, wind: 0.45, cloudy: 0.15, fog: 0.1, rain: 0.05, snow: 0.08, storm: 0 };

const deg = (t: number) => `${fmt1(t).replace(/\.0$/, "")}°`;

/** Today's low to high on one bar, with now on the knob. */
function TodayRange({ low, high, now, label, onOpen }: { low: number; high: number; now: number; label: string; onOpen?: () => void }) {
  // No spread yet (no history, no forecast): just now, centred.
  const flat = high - low < 0.05;
  const p = flat ? 0.5 : Math.min(1, Math.max(0, (now - low) / (high - low)));
  const style = { "--p": p.toFixed(4) } as Vars;
  // Hide an end label while the knob covers it. Measured, since it depends on the bar's width.
  const ref = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    const bar = ref.current;
    if (!bar) return;
    const check = () => {
      const k = bar.querySelector(".hw-tr-k")!.getBoundingClientRect();
      bar.querySelectorAll<HTMLElement>(".hw-tr-end").forEach((el) => {
        el.removeAttribute("data-hidden");
        const r = el.getBoundingClientRect();
        if (r.right + 4 > k.left && r.left - 4 < k.right) el.setAttribute("data-hidden", "");
      });
    };
    check();
    const ro = new ResizeObserver(check);
    ro.observe(bar);
    return () => ro.disconnect();
  }, [low, high, now]);
  const bar = (
    <span className="hw-tr" style={style} ref={ref}>
      {!flat && <span className="hw-tr-end">{deg(low)}</span>}
      {!flat && <span className="hw-tr-end">{deg(high)}</span>}
      <span className="hw-tr-rail"><span className="hw-tr-at"><span className="hw-tr-k">{fmt1(now)}°</span></span></span>
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
 * The home's outdoor conditions, beside the house. Read-only, like the sensor widget, and built from the
 * same parts: a status line, one bar, the today strip, a sheet of chip-shaped readings.
 * S and thin: condition badge, status, today bar. M: the house on the left. L: adds the big temperature
 * and today's hours (forecast hours lighter). Glow = sunshine; windows lit = night.
 */
export function HomeWidget({ entity: e, history, hourly, daily, variant = "card", density = "regular", showControl = true, onOpenDetails, onClose, color }: HomeWidgetProps) {
  const uid = useId();
  const sheet = variant === "sheet";
  const thin = !sheet && density === "thin";
  const bare = thin && !showControl;
  const unav = e.state === "unavailable";
  const cond = unav ? null : (e.state as Condition);
  const night = cond === "clear-night" || e.isDay === false;
  const t = unav ? undefined : e.temperature;
  const glow = !cond || night ? 0 : SUN[SKY[cond]];
  const colors = paint("reading", glow, null, color);

  // Today's range: what happened so far, what's forecast for the rest of today, and now.
  const hour = history?.currentHour ?? 0;
  const seen = (history?.temperature ?? []).filter((x): x is number => typeof x === "number");
  const ahead = (hourly ?? []).filter((h) => h.hour > hour && h.hour < 24).map((h) => h.temperature);
  const today = unav ? [] : [...seen, ...ahead, ...(t != null ? [t] : []), ...(daily?.[0] ? [daily[0].low, daily[0].high] : [])];
  const low = today.length ? Math.min(...today) : undefined;
  const high = today.length ? Math.max(...today) : undefined;

  const label = cond ? (night && cond === "sunny" ? "Clear" : CONDITION_LABEL[cond]) : "Not responding";
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
  const alertLabel = warningText ? `Weather warning: ${warnings.join(", ")}` : null;

  // Status: the condition, or the next dry/wet change when one is coming. At L and in the sheet the
  // change moves to the today strip, beside the hours it's about.
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
      summary: unav ? `Unreachable since ${e.lastSeen ?? "earlier"}` : change ?? feels ?? (nums.length ? `Low ${deg(mn)} · High ${deg(Math.max(...nums))}` : "No readings yet"),
    };
  }

  const scene = <Scene night={night} off={unav} />;

  // The value in words: under the name in narrow thin rows, and in place of the control when it's hidden.
  const subText = unav ? "Unavailable" : warningSummary ?? [t != null ? `${fmt1(t)}°` : null, change ?? label].filter(Boolean).join(" · ");
  // In place of the control the status line already says the condition or the coming change: just the temperature.
  const valText = unav ? "Unavailable" : t != null ? `${fmt1(t)}°` : label;
  return (
    <article
      className={`hd hw${sheet ? " hd--sheet" : ""}${thin ? " hd--thin" : ""}`} data-control={bare ? "off" : undefined}
      data-state={unav ? "unavailable" : "ok"} data-change={change ? "" : undefined} data-alert={warnings.length ? "warn" : undefined}
      {...colors} aria-labelledby={`${uid}-n`}
    >
      {!sheet && (onOpenDetails
        ? <button type="button" className="hw-scene" tabIndex={-1} aria-hidden="true" onClick={onOpenDetails}>{scene}</button>
        : <div className="hw-scene">{scene}</div>)}

      <header className="hd-head">
        <span className="hd-orb hd-orb--static" aria-hidden="true" aria-disabled={unav || undefined}>
          <span className="hd-orb-i"><ConditionIcon condition={cond ?? "unavailable"} night={night} /></span>
        </span>
        <div className="hd-title">
          <h2 className="hd-name" id={`${uid}-n`} title={e.name}>{e.name}</h2>
          <p className="hd-area hw-st">{status}</p>
          {thin && <p className="hd-sub">{alertLabel ? <AlertStatus label={alertLabel}>{subText}</AlertStatus> : subText}</p>}
        </div>
        <p className="hd-num" aria-hidden="true">{t != null ? <>{fmt1(t)}<span>°</span></> : null}</p>
        {sheet
          ? <CircleButton
            label={`Close ${e.name}`}
            onClick={onClose}
            // Focus lands on the sheet's close button when it opens: dialog focus management, not page-load focus theft.
            // eslint-disable-next-line jsx-a11y/no-autofocus
            autoFocus
          ><IconClose /></CircleButton>
          : onOpenDetails && <CircleButton label={`${e.name} weather details`} onClick={onOpenDetails}><IconOpen /></CircleButton>}
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

export interface HomeSheetProps extends Omit<HomeWidgetProps, "variant" | "density" | "onOpenDetails" | "onClose"> {
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
