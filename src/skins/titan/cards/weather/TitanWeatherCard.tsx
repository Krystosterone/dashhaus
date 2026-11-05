import type { WeatherEntity, WeatherHistory } from "@dashhaus/core/entities/weather/types";
import { aqiBand, conditionLabel, deg0, isNight, uvBand, weatherWarnings } from "@dashhaus/core/entities/weather/readings";
import { normalizeReadings } from "@dashhaus/core/entities/history";
import { compass } from "@dashhaus/core/entities/weather/conditions";
import { fmt1 } from "@dashhaus/core/entities/format";
import { lastSeenFact, unavailableSince, updatedFact } from "@dashhaus/core/entities/facts";
import { TitanCardFrame, TitanDatum, TitanGauge } from "../../shared/ui";
import type { TitanFootprint } from "../../shared/ui";
import "./TitanWeatherCard.css";

export interface TitanWeatherCardProps {
  entity: WeatherEntity;
  history?: WeatherHistory;
  footprint?: TitanFootprint;
  defaultOpen?: boolean;
}

/**
 * Outside, as a reading: the temperature as the big figure, the sky in words, humidity on the ruled gauge, and wind
 * and air as data blocks. A condition worth acting on (poor air, strong gusts, high UV) is the red alert, in words.
 */
export function TitanWeatherCard({ entity: e, history, footprint = "standard", defaultOpen = false }: TitanWeatherCardProps) {
  const unavailable = e.state === "unavailable";
  const night = isNight(e);
  const sky = unavailable ? "" : conditionLabel(e.state as Exclude<WeatherEntity["state"], "unavailable">, night);
  const warnings = weatherWarnings(e);
  const curve = history ? normalizeReadings(history.temperature, 1) : undefined;
  const range = curve && curve.min != null && curve.max != null ? `${deg0(curve.min)}–${deg0(curve.max)}` : undefined;
  const today = history && curve && { samples: curve.samples, currentHour: history.currentHour, summary: unavailable ? unavailableSince(e.lastSeen) : range ? `Today ${range}` : "No readings yet today" };
  const feels = e.apparentTemperature != null ? ` · feels ${deg0(e.apparentTemperature)}` : "";
  const wind = e.windSpeed != null ? `${Math.round(e.windSpeed)}${e.windBearing != null ? ` ${compass(e.windBearing)}` : ""}` : "—";
  return (
    <TitanCardFrame
      card="weather" code="WX" entityId={e.entityId} name={e.name} area="Outside" state={e.state}
      status={`${sky}${feels}`} summary={e.temperature == null ? "—" : fmt1(e.temperature)} unit={e.temperature == null ? undefined : e.temperatureUnit}
      tone={warnings.length ? "alert" : "read"} warning={warnings[0]} today={today || undefined}
      gauge={<TitanGauge label="HUM" name="Humidity" fraction={(e.humidity ?? 0) / 100} text={e.humidity != null ? `${Math.round(e.humidity)}%` : "—"} empty={unavailable || e.humidity == null} />}
      actions={
        <>
          <TitanDatum label={`Wind ${e.windSpeedUnit}`} value={unavailable ? "—" : wind} />
          {e.aqi != null ? <TitanDatum label="Air" value={unavailable ? "—" : `${e.aqi} ${aqiBand(e.aqi).short}`} tone={warnings.length && e.aqi > 100 ? "alert" : "read"} />
            : e.uvIndex != null ? <TitanDatum label="UV" value={unavailable ? "—" : String(Math.round(e.uvIndex))} /> : null}
        </>
      }
      footprint={footprint} defaultOpen={defaultOpen}
      facts={[
        ["Sky", unavailable ? "—" : sky],
        e.apparentTemperature != null && ["Feels like", `${deg0(e.apparentTemperature)}`],
        range && ["Today", range],
        e.dewPoint != null && ["Dew point", `${deg0(e.dewPoint)}`],
        e.windSpeed != null && ["Wind", `${Math.round(e.windSpeed)} ${e.windSpeedUnit}${e.windBearing != null ? ` from ${compass(e.windBearing)}` : ""}${e.windGustSpeed != null ? ` · gusts ${Math.round(e.windGustSpeed)}` : ""}`],
        e.pressure != null && ["Pressure", `${fmt1(e.pressure)} ${e.pressureUnit}`],
        e.uvIndex != null && ["UV", `${Math.round(e.uvIndex)} · ${uvBand(e.uvIndex).label}`],
        e.aqi != null && ["Air", `${e.aqi} · ${aqiBand(e.aqi).label}`],
        warnings.length > 0 && ["Warnings", warnings.join(" · ")],
        !unavailable && ["Updated", updatedFact(e.lastUpdated).replace(/^Updated /, "")],
        unavailable && ["Last seen", lastSeenFact(e.lastSeen).replace(/^Last seen /, "")],
      ]}
    />
  );
}
