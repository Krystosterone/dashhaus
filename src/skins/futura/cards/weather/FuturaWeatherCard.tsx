import type { WeatherEntity, WeatherHistory } from "@dashhaus/core/entities/weather/types";
import { compass } from "@dashhaus/core/entities/weather/conditions";
import { aqiBand, airWarns, conditionLabel, deg0, gustWarns, isNight, uvBand, uvWarns } from "@dashhaus/core/entities/weather/readings";
import { normalizeReadings } from "@dashhaus/core/entities/history";
import { fmt1 } from "@dashhaus/core/entities/format";
import { FuturaCardFrame, FuturaReadout, FuturaStats } from "../../shared/ui";
import type { FuturaFootprint, FuturaStat, FuturaTone } from "../../shared/ui";
import { IconWeather } from "./icons";
import "./FuturaWeatherCard.css";

export interface FuturaWeatherCardProps {
  entity: WeatherEntity;
  history?: WeatherHistory;
  footprint?: FuturaFootprint;
  defaultOpen?: boolean;
}

/**
 * Outside on Futura's console: the sky in the dial (amber while the sun is up and out, cyan otherwise), the
 * temperature as the readout, the arc the humidity, and feels-like and wind as telemetry. A reading: no glow.
 */
export function FuturaWeatherCard({ entity: e, history, footprint = "standard", defaultOpen = false }: FuturaWeatherCardProps) {
  const unavailable = e.state === "unavailable";
  const condition = unavailable ? undefined : (e.state as Exclude<WeatherEntity["state"], "unavailable">);
  const night = isNight(e);
  const tone: FuturaTone = condition === "sunny" && !night ? "amber" : "cyan";
  const unit = e.temperatureUnit;
  const status = condition ? conditionLabel(condition, night) : "Unavailable";
  const summary = <FuturaReadout value={e.temperature != null ? deg0(e.temperature).replace("°", "") : "—"} unit={unit} />;
  const wind = e.windSpeed != null ? `${Math.round(e.windSpeed)} ${e.windSpeedUnit}${e.windBearing != null ? ` ${compass(e.windBearing)}` : ""}` : null;
  const stats: FuturaStat[] = [
    ...(e.apparentTemperature != null ? [{ label: "Feels", value: deg0(e.apparentTemperature) }] : []),
    ...(wind ? [{ label: "Wind", value: wind, alert: gustWarns(e) }] : []),
    ...(e.humidity != null ? [{ label: "Humidity", value: `${Math.round(e.humidity)}%` }] : []),
  ];
  const range = history ? normalizeReadings(history.temperature, 1) : null;
  const meter = history && range ? { samples: range.samples, currentHour: history.currentHour, caption: range.min == null || range.max == null ? "No readings yet" : `Low ${deg0(range.min)} · high ${deg0(range.max)}`, tone } : undefined;
  return (
    <FuturaCardFrame name={e.name} state={e.state} area="Outside" summary={summary} icon={<IconWeather condition={condition} night={night} />} level={e.humidity != null && !unavailable ? e.humidity / 100 : null} tone={tone} status={status} meter={meter} footprint={footprint} stats={stats} defaultOpen={defaultOpen}>
      <FuturaStats facts items={[
        { label: "Temperature", value: e.temperature != null ? `${fmt1(e.temperature)}${unit}` : "—" },
        ...(e.apparentTemperature != null ? [{ label: "Feels like", value: `${fmt1(e.apparentTemperature)}${unit}` }] : []),
        ...(e.dewPoint != null ? [{ label: "Dew point", value: `${fmt1(e.dewPoint)}${unit}` }] : []),
        ...(e.humidity != null ? [{ label: "Humidity", value: `${Math.round(e.humidity)}%` }] : []),
        ...(e.pressure != null ? [{ label: "Pressure", value: `${Math.round(e.pressure)} ${e.pressureUnit}` }] : []),
        ...(wind ? [{ label: "Wind", value: wind }] : []),
        ...(e.windGustSpeed != null ? [{ label: "Gusts", value: `${Math.round(e.windGustSpeed)} ${e.windSpeedUnit}`, alert: gustWarns(e) }] : []),
        ...(e.uvIndex != null ? [{ label: "UV", value: `${Math.round(e.uvIndex)} · ${uvBand(e.uvIndex).label}`, alert: uvWarns(e) }] : []),
        ...(e.aqi != null ? [{ label: "Air", value: `${Math.round(e.aqi)} · ${aqiBand(e.aqi).label}`, alert: airWarns(e) }] : []),
        e.lastSeen ? { label: "Last seen", value: e.lastSeen } : { label: "Updated", value: e.lastUpdated ?? "—" },
        { label: "Entity", value: e.entityId },
      ]} />
    </FuturaCardFrame>
  );
}
