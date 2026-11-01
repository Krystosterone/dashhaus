import { useHaWeather } from "@dashhaus/core";

/** The conditions now, with an air-quality sensor beside them and sun.sun for day and night. */
export function Outside() {
  const { entity } = useHaWeather("weather.home", {
    aqiEntityId: "sensor.home_aqi",
    aqiScale: "US",
    sunEntityId: "sun.sun",
    loadForecasts: false,
  });
  if (entity.state === "unavailable") return <p>No weather right now.</p>;
  return (
    <p>
      {entity.state}, {entity.temperature}
      {entity.temperatureUnit}
      {entity.isDay === false && " tonight"}
      {entity.aqi != null && `, AQI ${entity.aqi}`}
    </p>
  );
}
