import { HaWeatherTile } from "@dashhaus/orb";
import { HaWeatherModule } from "@dashhaus/field";

export function OrbWeather() {
  return <HaWeatherTile entityId="weather.home" aqiEntityId="sensor.home_aqi" aqiScale="US" sunEntityId="sun.sun" />;
}

export function FieldWeather() {
  return <HaWeatherModule entityId="weather.home" sunEntityId="sun.sun" />;
}
