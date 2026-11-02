import { useHaWeather } from "@dashhaus/core";

/** The next days, read through weather.get_forecasts once an hour; undefined until the first read settles. */
export function Forecast({ entityId }: { entityId: string }) {
  const { entity, daily } = useHaWeather(entityId, { loadHistory: false });
  if (daily === undefined) return <p>Loading the forecast…</p>;
  return (
    <ol aria-label={`${entity.name} forecast`}>
      {daily.slice(0, 5).map((day) => (
        <li key={day.day}>
          {day.day}: {day.condition}, {day.low}–{day.high}
          {entity.temperatureUnit}
          {day.precipitationProbability != null && `, ${day.precipitationProbability}% rain`}
        </li>
      ))}
    </ol>
  );
}
