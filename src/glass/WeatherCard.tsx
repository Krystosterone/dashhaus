import type { DailyForecast, WeatherEntity } from "../domains/weather/types";
import { CONDITION_LABEL, SKY } from "../domains/weather/conditions";
import { useNow } from "../hooks/useNow";
import { GlassCard, UnavailableLine } from "./ui";
import type { GlassSize } from "./ui";
import "./cards.css";
import { IconDrop, IconWind, SkyIcon } from "./icons";

export interface GlassWeatherCardProps {
  entity: WeatherEntity;
  daily?: DailyForecast[];
  /** Freezes the date for stories. */
  now?: Date;
  size?: GlassSize;
}

const round = (n: number) => String(Math.round(n));

/**
 * Today's weather: the temperature and the sky, the date, humidity and wind, then the next days. It has no on
 * or off, so no dot and no button. Units are the entity's own: Home Assistant decides them.
 */
export function GlassWeatherCard({ entity: e, daily, now: fixed, size = "xl" }: GlassWeatherCardProps) {
  const now = useNow(fixed);
  const unav = e.state === "unavailable";
  const night = e.isDay === false;
  const condition = e.state === "unavailable" ? null : e.state;
  return (
    <GlassCard
      size={size}
      name={e.name}
      subtitle={condition ? CONDITION_LABEL[condition] : "Unavailable"}
      icon={condition ? <SkyIcon sky={SKY[condition]} night={night} /> : <SkyIcon sky="cloudy" />}
    >
      {unav ? (
        <UnavailableLine lastSeen={e.lastSeen} />
      ) : (
        <div className="gl-weather">
          <div className="gl-weather-now">
            <p className="gl-weather-temp">{e.temperature != null ? <>{round(e.temperature)}<span>{e.temperatureUnit}</span></> : "—"}</p>
            <p className="gl-weather-date">
              <span className="gl-weather-day">{now.toLocaleDateString(undefined, { weekday: "long" })}</span>
              <span>{now.toLocaleDateString(undefined, { day: "numeric", month: "long" })}</span>
            </p>
          </div>
          <div className="gl-weather-stats">
            <p className="gl-weather-stat">
              <span className="gl-weather-stat-icon"><IconDrop /></span>
              <span className="gl-weather-stat-value">{e.humidity != null ? `${round(e.humidity)}%` : "—"}</span>
              <span className="gl-weather-stat-label">Humidity</span>
            </p>
            <p className="gl-weather-stat">
              <span className="gl-weather-stat-icon"><IconWind /></span>
              <span className="gl-weather-stat-value">{e.windSpeed != null ? `${round(e.windSpeed)} ${e.windSpeedUnit}` : "—"}</span>
              <span className="gl-weather-stat-label">Wind</span>
            </p>
          </div>
          {daily && daily.length > 0 && (
            <ol className="gl-weather-days" aria-label="Next days">
              {daily.slice(0, 5).map((d, i) => (
                <li key={`${d.day}-${i}`} className="gl-weather-dayf" data-today={i === 0 || undefined}>
                  <span className="gl-weather-dname">{i === 0 ? "Today" : d.day}</span>
                  <span className="gl-weather-dicon" aria-hidden="true"><SkyIcon sky={SKY[d.condition]} /></span>
                  <span className="gl-weather-drange" aria-hidden="true">{round(d.high)}° <span>{round(d.low)}°</span></span>
                  <span className="gl-sr">{CONDITION_LABEL[d.condition]}, high {round(d.high)}°, low {round(d.low)}°</span>
                </li>
              ))}
            </ol>
          )}
        </div>
      )}
    </GlassCard>
  );
}
