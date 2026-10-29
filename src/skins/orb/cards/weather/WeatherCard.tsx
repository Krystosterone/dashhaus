import type { ReactNode } from "react";
import type { WeatherEntity, WeatherHistory, HourlyForecast, DailyForecast, Condition } from "../../../../domains/weather/types";
import { CONDITION_LABEL, precipitation, isWet, clock, compass } from "../../../../domains/weather/conditions";
import { aqiBand, airWarns, conditionLabel, deg0, gustWarns, isNight, rangeText, todayRange, uvBand, uvWarns, weatherWarnings } from "../../../../domains/weather/readings";
import { ConditionIcon } from "./conditions";
import { AlertStatus, CardTitle, Readout, UnavailableSlot, fmt1, paint, SheetClose, useCard, detailsSheet } from "../../shared/ui";
import type { ColorProp, CardProps, SheetProps } from "../../shared/ui";
import "./WeatherCard.css";

export interface WeatherCardProps extends CardProps {
  entity: WeatherEntity;
  /** Today's readings so far. With the forecast, they make today's low–high. */
  history?: WeatherHistory;
  /** Shown as the next hours in the featured footprint and in the sheet; also tells when rain starts or stops. */
  hourly?: HourlyForecast[];
  /** Shown in the sheet. */
  daily?: DailyForecast[];
  /**
   * Compact only. false removes the inline reading, shows its value in its place, and makes the row open
   * the detail sheet. Default true.
   */
  showControl?: boolean;
  /** Card only: the name and the reading open the details sheet. */
  onOpenDetails?: () => void;
  onClose?: () => void;
  /** The orb's colour, if any. Default: none (a neutral badge). */
  color?: ColorProp;
}

const deg = (t: number) => `${fmt1(t).replace(/\.0$/, "")}°`;
/** Hours ahead the forecast row can show; the row shows as many as its width fits. */
const HOURS_AHEAD = 12;

/** Now, then feels-like on its baseline: one metric in the shared bar. A readout: no container. */
function Reading({ now, feels, label, onOpen }: { now: number; feels?: number; label: string; onOpen?: () => void }) {
  const read = (
    <span className="hd-bar wx-bar">
      <span className="hd-metric wx-rd">
        <span className="wx-rd-t">{fmt1(now)}°</span>
        {feels != null && <span className="wx-rd-f">Feels {deg0(feels)}</span>}
      </span>
    </span>
  );
  return <Readout label={label} onOpen={onOpen}>{read}</Readout>;
}

/** The coming hours, one column each, as many as the width fits. */
function NextHours({ hours, empty }: { hours: HourlyForecast[]; empty: string }) {
  const spoken = hours.map((h) => [
    clock(h.hour),
    CONDITION_LABEL[h.condition],
    `${Math.round(h.temperature)} degrees`,
    h.precipitationProbability != null && h.precipitationProbability >= 20 ? `${Math.round(h.precipitationProbability)}% chance of precipitation` : null,
  ].filter(Boolean).join(", ")).join("; ");
  return (
    <div className="hd-blk wx-hrs">
      <p className="hd-blk-h"><span>Next hours</span></p>
      {hours.length === 0
        ? <p className="wx-hrs-none">{empty}</p>
        : (
          <div role="img" aria-label={spoken}>
            <ol className="wx-hr-l" aria-hidden="true">
              {hours.map((h) => (
                <li key={h.hour} className="wx-hr">
                  <span className="wx-hr-t">{String(h.hour % 24).padStart(2, "0")}</span>
                  <span className="wx-hr-i"><ConditionIcon condition={h.condition} /></span>
                  <span className="wx-hr-v">{deg0(h.temperature)}</span>
                  <span className="wx-hr-p">{h.precipitationProbability != null && h.precipitationProbability >= 20 ? `${Math.round(h.precipitationProbability)}%` : ""}</span>
                </li>
              ))}
            </ol>
          </div>
        )}
    </div>
  );
}

/** A read-only reading in the sheet, shaped like a chip. */
function Stat({ label, value, sub, warn }: { label: string; value: ReactNode; sub?: string; warn?: boolean }) {
  return (
    <div className="wx-stat">
      <span className="wx-stat-l">{label}</span>
      <span className={warn ? "wx-stat-v hd-warn" : "wx-stat-v"}>{value}</span>
      {sub && <span className="wx-stat-s">{sub}</span>}
    </div>
  );
}

/**
 * Outdoor conditions now. A reading: neutral and without glow, with the condition as its badge at every
 * size. The status line puts warnings and rain first, then the condition and today's low–high; the reading
 * is the temperature with feels-like beside it. Featured adds the next hours; the sheet has every reading,
 * the next hours and the next days.
 */
export function WeatherCard({ entity: e, history, hourly, daily, variant, footprint, showControl, onOpenDetails, onClose, color }: WeatherCardProps) {
  const { nameId, sheet, compact, featured, bare, article } = useCard("wx", { variant, footprint, showControl });
  const unav = e.state === "unavailable";
  const cond = unav ? null : (e.state as Condition);
  const night = isNight(e);
  const t = unav ? undefined : e.temperature;
  const feels = unav ? undefined : e.apparentTemperature;
  const colors = paint("reading", 0, null, color);

  // Today's range: what happened so far, what's forecast for the rest of today, and now.
  const hour = history?.currentHour ?? 0;
  const range = unav ? null : rangeText(todayRange(t, history, hourly, daily));

  const label = cond ? conditionLabel(cond, night) : "Unavailable";
  const precip = cond ? precipitation(cond, hourly, hour) : null;
  // Falling rain that stops soon already names itself ("Rain until 15:00").
  const condition = precip && cond && isWet(cond) ? null : label;

  // Warnings come first, in the warn colour, like a sensor's low battery.
  const band = e.aqi != null ? aqiBand(e.aqi) : null;
  const warnings = weatherWarnings(e);
  // On a card the most urgent warning leads with a count of the rest ("Hazardous air +2"), so an ellipsis
  // never hides that more exist; under 260 px, where even that clips, the count alone ("3 warnings"). The
  // sheet names them all, and the alert label always speaks all of them.
  const warningSummary = warnings.length > 1
    ? <><span className="wx-warn-l">{`${warnings[0]} +${warnings.length - 1}`}</span><span className="wx-warn-s">{`${warnings.length} warnings`}</span></>
    : warnings[0] ?? null;
  const warningText = sheet ? warnings.join(" · ") : warningSummary;
  const alertLabel = warnings.length ? `Warning: ${e.name}: ${warnings.join(", ")}` : null;

  // Most urgent first: warnings, rain or snow, then the condition and today's low–high.
  const rest = [precip, condition, range].filter(Boolean).join(" · ");
  const status = alertLabel
    ? <><AlertStatus label={alertLabel}>{warningText}</AlertStatus>{rest && ` · ${rest}`}</>
    : rest;

  const readLabel = t == null ? "" : `${fmt1(t)} degrees now${feels != null ? `, feels like ${Math.round(feels) || 0}` : ""}`;
  let slot;
  if (unav) slot = <UnavailableSlot lastSeen={e.lastSeen} />;
  else if (t == null) slot = <div className="hd-unav"><span>No temperature yet</span></div>;
  else slot = <Reading now={t} feels={feels} label={readLabel} onOpen={sheet ? undefined : onOpenDetails} />;

  const nextHours = (hourly ?? []).filter((h) => h.hour > hour && h.hour <= hour + HOURS_AHEAD);
  const hoursEmpty = unav ? `Unavailable since ${e.lastSeen ?? "earlier"}` : "No forecast yet";

  const now = t != null ? `${fmt1(t)}°` : null;
  const feelsText = feels != null ? `Feels ${deg0(feels)}` : null;
  // The compact value appears under the name, or in place of a hidden reading.
  const subText: ReactNode = unav ? "Unavailable" : warningSummary ?? [now, feelsText, precip ?? label].filter(Boolean).join(" · ");
  // The status line already says the condition: the replacement value is the reading.
  const valText = unav ? "Unavailable" : now ? [now, feelsText].filter(Boolean).join(" · ") : label;
  return (
    <article
      {...article}
      data-state={unav ? "unavailable" : "ok"} data-alert={warnings.length ? "warn" : undefined}
      {...colors}
    >
      <header className="hd-head">
        <span className="hd-orb hd-orb--static" aria-hidden="true" aria-disabled={unav || undefined}>
          <span className="hd-orb-i"><ConditionIcon condition={cond ?? "unavailable"} night={night} /></span>
        </span>
        <CardTitle id={nameId} name={e.name} onOpen={sheet ? undefined : onOpenDetails} openHint="weather details">
          <p className="hd-area">{status}</p>
          {compact && <p className="hd-sub">{alertLabel ? <AlertStatus label={alertLabel}>{subText}</AlertStatus> : subText}</p>}
        </CardTitle>
        {/* In the sheet the large figure stands in for the reading, so it is spoken there. */}
        <p className="hd-num" {...(sheet && t != null ? { role: "img", "aria-label": readLabel } : { "aria-hidden": true })}>{t != null ? <>{fmt1(t)}<span>°</span></> : null}</p>
        {sheet && <SheetClose label={`Close ${e.name}`} onClick={onClose} />}
      </header>

      {/* The sheet already says now (the large figure) and feels-like (its tile); its slot only reports a missing reading. */}
      {!(sheet && t != null) && <div className="hd-slot">{bare ? <p className="hd-val">{valText}</p> : slot}</div>}

      {sheet && !unav && (
        <div className="hd-extra">
          <div className="wx-stats">
            {e.apparentTemperature != null && <Stat label="Feels like" value={deg(e.apparentTemperature)} sub={e.dewPoint != null ? `Dew point ${deg(e.dewPoint)}` : undefined} />}
            {e.humidity != null && <Stat label="Humidity" value={<>{Math.round(e.humidity)}<small>%</small></>} />}
            {e.windSpeed != null && <Stat label="Wind" value={<>{Math.round(e.windSpeed)}<small> {e.windSpeedUnit}</small></>}
              sub={[e.windBearing != null ? compass(e.windBearing) : null, e.windGustSpeed != null ? `gusts ${Math.round(e.windGustSpeed)}` : null].filter(Boolean).join(", ") || undefined} warn={gustWarns(e)} />}
            {band && <Stat label="Air quality" value={Math.round(e.aqi!)} sub={band.label} warn={airWarns(e)} />}
            {e.uvIndex != null && <Stat label="UV index" value={Math.round(e.uvIndex)} sub={uvBand(e.uvIndex).label} warn={uvWarns(e)} />}
            {e.pressure != null && <Stat label="Pressure" value={<>{e.pressureUnit === "inHg" ? e.pressure.toFixed(2) : Math.round(e.pressure)}<small> {e.pressureUnit}</small></>} />}
          </div>
        </div>
      )}

      {(featured || sheet) && <NextHours hours={unav ? [] : nextHours} empty={hoursEmpty} />}

      {sheet && daily && daily.length > 0 && !unav && (
        <div className="hd-extra">
          <div className="hd-blk">
            <p className="hd-blk-h"><span>Next days</span></p>
            <ol className="wx-days">
              {daily.slice(0, 5).map((d, i) => (
                <li key={i} className="wx-day">
                  <span className="wx-day-n">{i === 0 ? "Today" : d.day}</span>
                  <span className="wx-day-i" title={CONDITION_LABEL[d.condition]}><ConditionIcon condition={d.condition} /></span>
                  <span className="wx-day-t"><b>{Math.round(d.high)}°</b> {Math.round(d.low)}°</span>
                  <span className="wx-day-p">{d.precipitationProbability != null && d.precipitationProbability >= 20 ? `${d.precipitationProbability}%` : ""}</span>
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

export type WeatherSheetProps = SheetProps<WeatherCardProps>;

export const WeatherSheet = detailsSheet(WeatherCard, (name) => `${name} weather details`);
