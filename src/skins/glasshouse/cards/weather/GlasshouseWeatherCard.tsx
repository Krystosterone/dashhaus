import type { DailyForecast, HourlyForecast, WeatherEntity, WeatherHistory } from "@dashhaus/core/entities/weather/types";
import { SKY, clock, compass } from "@dashhaus/core/entities/weather/conditions";
import { aqiBand, airWarns, conditionLabel, deg0, isNight, rangeText, todayRange, weatherWarnings } from "@dashhaus/core/entities/weather/readings";
import { GlasshouseCardFrame, GlasshouseFacts, GlasshouseStat } from "../../shared/ui";
import type { GlasshouseFootprint } from "../../shared/ui";
import { IconWeather, SkyArt } from "./icons";
import "./GlasshouseWeatherCard.css";

export interface GlasshouseWeatherCardProps {
  entity: WeatherEntity;
  history?: WeatherHistory;
  hourly?: HourlyForecast[];
  daily?: DailyForecast[];
  footprint?: GlasshouseFootprint;
  defaultOpen?: boolean;
}

/**
 * The outdoors, as the reference's welcome panel: the sky drawn big and glowing beside the temperature, the
 * condition and today's range, then humidity, wind and air quality in a row. Given two tracks, the next hours'
 * forecast joins it. Read-only.
 */
export function GlasshouseWeatherCard({ entity: e, history, hourly, daily, footprint = "standard", defaultOpen = false }: GlasshouseWeatherCardProps) {
  const unavailable = e.state === "unavailable";
  const night = isNight(e);
  const condition = unavailable ? "Unavailable" : conditionLabel(e.state as Exclude<WeatherEntity["state"], "unavailable">, night);
  const sky = unavailable ? "cloudy" : SKY[e.state as Exclude<WeatherEntity["state"], "unavailable">];
  const now = history?.currentHour ?? new Date().getHours();
  const range = rangeText(todayRange(e.temperature, history, hourly, daily));
  const warnings = unavailable ? [] : weatherWarnings(e);
  const air = e.aqi == null ? undefined : aqiBand(e.aqi);
  const wind = e.windSpeed == null ? undefined : `${Math.round(e.windSpeed)} ${e.windSpeedUnit}${e.windBearing == null ? "" : ` ${compass(e.windBearing)}`}`;
  const next = (hourly ?? []).filter((h) => h.hour > now).slice(0, 5);
  const temperature = e.temperature == null ? "—" : deg0(e.temperature).replace("°", "");
  const face = (
    <div className="glasshouse-weather-face">
      <div className="glasshouse-weather-now">
        <SkyArt sky={sky} night={night} />
        <div className="glasshouse-weather-temp">
          <p className="glasshouse-big">{temperature}<small>{e.temperatureUnit}</small></p>
          <p className="glasshouse-caption">{range ? `Today ${range}` : e.apparentTemperature != null ? `Feels like ${deg0(e.apparentTemperature)}` : condition}</p>
        </div>
        {next.length === 0 && (
          <div className="glasshouse-weather-side">
            <p className="glasshouse-weather-condition">{condition}</p>
            <p className="glasshouse-caption">{e.apparentTemperature != null ? `Feels like ${deg0(e.apparentTemperature)}` : e.name}</p>
          </div>
        )}
        {next.length > 0 && (
          <ol className="glasshouse-weather-hours" aria-label="Next hours">
            {next.map((h) => (
              <li key={h.hour}><span>{clock(h.hour)}</span><SkyArt sky={SKY[h.condition]} night={h.hour % 24 < 6 || h.hour % 24 >= 20} /><strong>{deg0(h.temperature)}</strong></li>
            ))}
          </ol>
        )}
      </div>
      <div className="glasshouse-stats">
        <GlasshouseStat label="Humidity" value={e.humidity == null ? "—" : `${e.humidity}%`} />
        <GlasshouseStat label="Wind" value={wind ?? "—"} tone={warnings.some((w) => /gust/i.test(w)) ? "warm" : undefined} />
        {air ? <GlasshouseStat label="Air quality" value={air.label} tone={airWarns(e) ? "warn" : "good"} /> : <GlasshouseStat label="Feels like" value={e.apparentTemperature == null ? "—" : deg0(e.apparentTemperature)} />}
      </div>
    </div>
  );
  return (
    <GlasshouseCardFrame card="weather" name={e.name} entityId={e.entityId} state={e.state} stateLabel={condition} summary={e.temperature == null ? condition : deg0(e.temperature)} icon={<IconWeather />} footprint={footprint} alert={warnings.length > 0} face={face} defaultOpen={defaultOpen}>
      {!unavailable && (
        <div className="glasshouse-sheet-figure">
          <div className="glasshouse-weather-now"><SkyArt sky={sky} night={night} /><p className="glasshouse-big">{temperature}<small>{e.temperatureUnit}</small></p></div>
        </div>
      )}
      {warnings.length > 0 && <p className="glasshouse-caption glasshouse-weather-warn">{warnings.join(" · ")}</p>}
      {daily && daily.length > 0 && (
        <ol className="glasshouse-weather-days" aria-label="Next days">
          {daily.slice(0, 5).map((d) => <li key={d.day}><span>{d.day}</span><SkyArt sky={SKY[d.condition]} night={false} /><strong>{deg0(d.high)}</strong><em>{deg0(d.low)}</em></li>)}
        </ol>
      )}
      <GlasshouseFacts facts={[
        ["Condition", condition],
        range && ["Today", range],
        e.apparentTemperature != null && ["Feels like", deg0(e.apparentTemperature)],
        e.humidity != null && ["Humidity", `${e.humidity}%`],
        wind && ["Wind", wind],
        e.windGustSpeed != null && ["Gusts", `${Math.round(e.windGustSpeed)} ${e.windSpeedUnit}`],
        e.pressure != null && ["Pressure", `${e.pressure} ${e.pressureUnit}`],
        e.uvIndex != null && ["UV index", `${e.uvIndex}`],
        air && ["Air quality", `${air.label} (${e.aqi})`],
        e.lastUpdated && ["Updated", e.lastUpdated],
        unavailable && e.lastSeen && ["Last seen", e.lastSeen],
      ]} />
    </GlasshouseCardFrame>
  );
}
