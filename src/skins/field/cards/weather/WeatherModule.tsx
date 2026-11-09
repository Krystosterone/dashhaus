import type { CSSProperties, ReactNode } from "react";
import { useHourCycle } from "@dashhaus/core/hooks";
import { hourLabel } from "@dashhaus/core/entities/clock";
import type { Condition, DailyForecast, HourlyForecast, WeatherEntity, WeatherHistory } from "@dashhaus/core/entities/weather/types";
import { CONDITION_LABEL, clock, compass, isWet, precipitation } from "@dashhaus/core/entities/weather/conditions";
import { aqiBand, airWarns, conditionLabel, deg0, gustWarns, isNight, rangeText, todayRange, uvBand, uvWarns, weatherWarnings, weatherWarningsSaid } from "@dashhaus/core/entities/weather/readings";
import { weatherSeverity } from "@dashhaus/core/entities/weather/severity";
import { NO_READINGS_TODAY, rangeSummary } from "@dashhaus/core/entities/today";
import { normalizeReadings } from "@dashhaus/core/entities/history";
import { fmt1 } from "@dashhaus/core/entities/format";
import { lastSeenFact, updatedFact } from "@dashhaus/core/entities/facts";
import { Blank, Digits, Glyph, Legend, ModuleFrame, Pictogram, Today, Warn, useDetails, Temperature, ModuleRow, Notices, Channel } from "../../shared/ui";
import type { FieldFootprint } from "../../shared/ui";
import { IconWeather, conditionPict } from "./icons";
import "./WeatherModule.css";

export interface WeatherModuleProps {
  entity: WeatherEntity;
  footprint?: FieldFootprint;
  /** Today's temperatures so far, on the module's meter and in the panel. Omit and the meter's hours stay dark. */
  history?: WeatherHistory;
  /** Tells when rain starts or stops, completes today's low and high, and is the panel's next hours. */
  hourly?: HourlyForecast[];
  /** Completes today's low and high, and is the panel's next days. */
  daily?: DailyForecast[];
  /** Open the detail panel on first render (stories). */
  defaultOpen?: boolean;
}

/** Hours the panel's strip shows, one column each: as many as a phone's panel holds. */
const HOURS = 8;
/** Days the panel's strip shows, today first. */
const DAYS = 5;
/** A chance of rain from this much is printed. */
const RAIN_SHOWN = 20;

const rainText = (p?: number) => (p != null && p >= RAIN_SHOWN ? `${Math.round(p)}%` : "");

/**
 * The home's outdoor conditions as a field module: a reading, so nothing on it is pressed but its name. Its glyph
 * lies flat where a key would be, and today's temperatures take the fader's place, with today's low and high. The
 * screen leads with the temperature under the sky's pictogram; its meta lines say, most urgent first, a warning,
 * rain or snow on its way, or the condition, then how it feels. A compact row has no meta lines, so that first line
 * takes the area's place under the name. The name opens the panel: how it feels on the screen's second channel,
 * every warning, today, the next hours and days, then every reading.
 */
export function WeatherModule({ entity: e, footprint = "standard", history, hourly, daily, defaultOpen = false }: WeatherModuleProps) {
  const details = useDetails(defaultOpen);
  const unav = e.state === "unavailable";
  const cond = unav ? null : (e.state as Condition);
  const night = isNight(e);
  const t = unav ? undefined : e.temperature;
  const feels = unav ? undefined : e.apparentTemperature;
  const hour = history?.currentHour ?? 0;

  const warnings = weatherWarnings(e);
  // Core ranks them (any is advisory); the module draws the marker for the level it is given.
  const level = weatherSeverity(e);
  const hourCycle = useHourCycle();
  const precip = cond ? precipitation(cond, hourly, hour, hourCycle) : null;
  // Falling rain that stops soon already names itself ("Rain until 15:00").
  const sky = cond ? precip ?? conditionLabel(cond, night) : null;
  // The most urgent warning, with a count of the rest so a clipped line never hides that more exist; where even
  // that clips, the count alone. Spoken in full.
  const several = warnings.length > 1 ? (
    <>
      <span aria-hidden="true">
        <span className="fd-wx-warn-l">{`${warnings[0]} +${warnings.length - 1}`}</span>
        <span className="fd-wx-warn-s">{`${warnings.length} warnings`}</span>
      </span>
      <span className="fd-sr">{weatherWarningsSaid(e).join(", ")}</span>
    </>
  ) : null;
  const warn = !level ? null : <Warn>{several ?? warnings[0]}</Warn>;

  const pict = <Pictogram param="neutral" lit={cond != null}>{conditionPict(cond, night)}</Pictogram>;
  const read: ReactNode = unav ? <Blank places={4} label="Unavailable" />
    : t != null ? <Temperature value={t} unit={e.temperatureUnit} />
    : <Blank places={4} label="No reading yet" />;
  const meta: [ReactNode, ReactNode?] = unav
    ? ["Unavailable", e.lastSeen ? lastSeenFact(e.lastSeen) : undefined]
    : [warn || sky, feels != null ? `Feels ${deg0(feels)}` : t == null ? "No reading yet" : undefined];

  // Today's low and high: what was read, what's forecast for the rest of it, and now. While unavailable, what was read.
  const range = todayRange(t, history, unav ? undefined : hourly, unav ? undefined : daily);
  const day = history ? normalizeReadings(history.temperature, 0.5) : null;
  const glyph = <Glyph unavailable={unav}><IconWeather /></Glyph>;

  // A compact row has no meta lines: the first takes the area's line, a warning behind its marker.
  const compact = footprint === "compact";
  const line = compact ? (unav ? "Unavailable" : sky ?? undefined) : undefined;
  // On a row's line, the same: the most urgent and a count, or the count alone where even the word clips.
  const plateWarning = compact && level ? (several ?? warnings[0]) : undefined;

  // The panel's content: the screen with how it feels on its second channel, every warning and the sky in words,
  // today, the next hours and the next days on strips of screen, then every reading printed on the plate.
  // The condition, then the rain on its way; falling rain that stops soon already names itself ("Rain until 15:00").
  const words = cond ? [precip && isWet(cond) ? null : conditionLabel(cond, night), precip].filter(Boolean).join(" · ") : "";

  const aside = feels != null ? (
    <Channel sub="Feels like"><Digits value={Math.round(feels) || 0} places={2} /><small>°</small></Channel>
  ) : undefined;

  const hours = (hourly ?? []).filter((h) => h.hour > hour).slice(0, HOURS);
  const days = (daily ?? []).slice(0, DAYS);
  const reported = unav ? lastSeenFact(e.lastSeen) : updatedFact(e.lastUpdated);

  return (
    <ModuleFrame
      kind="fd-wx"
      name={e.name}
      area={line}
      footprint={footprint}
      state={e.state}
      warning={plateWarning}
      details={details}
      pict={pict}
      read={read}
      meta={meta}
      lead={glyph}
      row={(
        <ModuleRow className="fd-wx-row">
          {glyph}
          <Today summary={rangeText(range) ?? undefined} label="Temperature by hour today." tone="neutral" samples={day?.samples} currentHour={history?.currentHour} />
        </ModuleRow>
      )}
      aside={aside}
      facts={{ start: reported }}
    >
      {!unav && (warnings.length > 0 || words) && (
        <Notices className="fd-wx-say" warnings={warnings} words={words} />
      )}
      {history && (
        <Today
          legend="Temperature today"
          summary={range ? rangeSummary(range.low, range.high, deg0) : unav ? undefined : NO_READINGS_TODAY}
          label="Temperature by hour today."
          tone="neutral"
          samples={day?.samples}
          currentHour={history.currentHour}
        />
      )}
      {!unav && <Hours hours={hours} />}
      {!unav && days.length > 0 && <Days days={days} />}
      {!unav && <Readings e={e} />}
    </ModuleFrame>
  );
}

type Vars = CSSProperties & Record<`--${string}`, string | number>;

/** The next hours on a strip of screen: the hour, its sky, its temperature, and its chance of rain from 20%. */
function Hours({ hours }: { hours: HourlyForecast[] }) {
  const hourCycle = useHourCycle();
  const spoken = hours.map((h) => [
    clock(h.hour, hourCycle),
    CONDITION_LABEL[h.condition],
    deg0(h.temperature),
    rainText(h.precipitationProbability) && `${rainText(h.precipitationProbability)} chance of precipitation`,
  ].filter(Boolean).join(", ")).join("; ");
  return (
    <div className="fd-block">
      <Legend value={hours.length ? undefined : "No forecast yet"}>Next hours</Legend>
      {hours.length > 0 && (
        <ol className="fd-wx-strip" role="img" aria-label={`Next hours: ${spoken}.`} style={{ "--fd-wx-n": HOURS } as Vars}>
          {hours.map((h) => (
            <li key={h.hour} className="fd-wx-col" aria-hidden="true">
              <span className="fd-wx-t">{hourLabel(h.hour, hourCycle)}</span>
              <Pictogram param="neutral" lit>{conditionPict(h.condition)}</Pictogram>
              <span className="fd-wx-v">{deg0(h.temperature)}</span>
              <span className="fd-wx-p">{rainText(h.precipitationProbability)}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

/** The next days on a strip of screen, today first: the day, its sky, its high over its low, its chance of rain. */
function Days({ days }: { days: DailyForecast[] }) {
  const name = (d: DailyForecast, i: number) => (i === 0 ? "Today" : d.day);
  const spoken = days.map((d, i) => [
    name(d, i),
    CONDITION_LABEL[d.condition],
    `high ${deg0(d.high)}, low ${deg0(d.low)}`,
    rainText(d.precipitationProbability) && `${rainText(d.precipitationProbability)} chance of precipitation`,
  ].filter(Boolean).join(", ")).join("; ");
  return (
    <div className="fd-block">
      <Legend>Next days</Legend>
      <ol className="fd-wx-strip fd-wx-strip--days" role="img" aria-label={`Next days: ${spoken}.`} style={{ "--fd-wx-n": DAYS } as Vars}>
        {days.map((d, i) => (
          <li key={i} className="fd-wx-col" aria-hidden="true">
            <span className="fd-wx-t">{name(d, i)}</span>
            <Pictogram param="neutral" lit>{conditionPict(d.condition)}</Pictogram>
            <span className="fd-wx-v">{deg0(d.high)}<span className="fd-wx-lo">{deg0(d.low)}</span></span>
            <span className="fd-wx-p">{rainText(d.precipitationProbability)}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

/** Every reading the entity has, printed on the plate, with what qualifies it under it: a warning's reading behind the marker. */
function Readings({ e }: { e: WeatherEntity }) {
  const deg = (x: number) => `${fmt1(x).replace(/\.0$/, "")}°`;
  const rows: [label: string, value: string, warns?: boolean, sub?: string][] = [];
  if (e.dewPoint != null) rows.push(["Dew point", deg(e.dewPoint)]);
  if (e.humidity != null) rows.push(["Humidity", `${Math.round(e.humidity)}%`]);
  if (e.windSpeed != null) {
    const how = [e.windBearing != null ? compass(e.windBearing) : null, e.windGustSpeed != null ? `gusts ${Math.round(e.windGustSpeed)}` : null].filter(Boolean).join(", ");
    rows.push(["Wind", `${Math.round(e.windSpeed)} ${e.windSpeedUnit}`, gustWarns(e), how || undefined]);
  }
  if (e.aqi != null) rows.push(["Air quality", `${Math.round(e.aqi)} ${aqiBand(e.aqi).short}`, airWarns(e)]);
  if (e.uvIndex != null) rows.push(["UV index", `${Math.round(e.uvIndex)} ${uvBand(e.uvIndex).label}`, uvWarns(e)]);
  if (e.pressure != null) rows.push(["Pressure", `${e.pressureUnit === "inHg" ? e.pressure.toFixed(2) : Math.round(e.pressure)} ${e.pressureUnit}`]);
  if (!rows.length) return null;
  return (
    <div className="fd-block">
      <Legend>Now</Legend>
      <dl className="fd-wx-facts">
        {rows.map(([label, value, warns, sub]) => (
          <div key={label} className="fd-wx-fact">
            <dt>{label}</dt>
            <dd>{warns ? <Warn>{value}</Warn> : value}{sub && <span className="fd-wx-fact-s">{sub}</span>}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
